/**
 * TurnKey export → PaySpyre migration runner.
 *
 * `runMigration(exportData, opts)` is the **single entrypoint**. It is a
 * pure function: same input → same output, no side effects, no I/O. The
 * caller is responsible for reading the TurnKey export (CSV / API / DB
 * dump — not yet known) and for writing the imported entities to
 * Postgres. Both ends of that pipe are intentionally out of scope for
 * PR #4.2 — see `docs/spec/turnkey-migration.md` §3 for the open
 * questions that gate them.
 *
 * Idempotency:
 *   - Every PaySpyre id is derived deterministically from a TurnKey
 *     source id (see `adapters.ts → ids`).
 *   - Errors are accumulated in `result.errors`, never thrown. A re-run
 *     produces the same MigrationResult bit-for-bit (modulo the
 *     `ran_at` timestamp, which can be pinned via `opts.ran_at`).
 *   - The eventual DB upsert (PR #4.2 follow-up) uses these ids as PKs
 *     with `ON CONFLICT DO UPDATE`, so the whole pipeline is
 *     replayable end-to-end.
 *
 * Schedule strategy:
 *   - "use_export" — use TurnKey-supplied schedules (errors if absent).
 *   - "regenerate" — re-derive every schedule from the loan params
 *     using `lib/servicing.ts → scheduleFromLoan` (canonical 360-day
 *     DSI). Useful when TurnKey's schedule export is incomplete or
 *     suspected of drift.
 *   - "auto" (default) — use the export when present, else regenerate.
 *     This is what the dual-run period uses so reconciliation can spot
 *     divergence.
 */

import type {
  TurnKeyExport,
  MigrationResult,
  RunOptions,
  ImportError,
  EntityKind,
  MigratedDocument,
} from "./types";
import {
  adaptApplication,
  adaptBorrower,
  adaptDocument,
  adaptLoan,
  adaptScheduleFromExport,
  adaptTransaction,
  ids,
} from "./adapters";
import { buildReconciliationReport } from "./reconciliation";
import { scheduleFromLoan } from "../servicing";
import type { Borrower } from "../types/borrower";
import type { Application } from "../types/application";
import type { Loan } from "../types/loan";
import type { LoanTransaction } from "../types/transaction";
import type {
  PaymentSchedule,
  PaymentScheduleEntry,
} from "../types/payment-schedule";

const DEFAULTS = {
  tolerance_cad: 0.01,
  schedule_strategy: "auto" as const,
  issues_cap: 20,
};

export function runMigration(
  exportData: TurnKeyExport,
  opts: RunOptions = {},
): MigrationResult {
  const tolerance_cad = opts.tolerance_cad ?? DEFAULTS.tolerance_cad;
  const schedule_strategy = opts.schedule_strategy ?? DEFAULTS.schedule_strategy;
  const issues_cap = opts.issues_cap ?? DEFAULTS.issues_cap;
  const ran_at = opts.ran_at ?? new Date().toISOString();

  const errors: ImportError[] = [];

  // --- Borrowers -------------------------------------------------------
  const borrowers: Borrower[] = [];
  const borrowerIdMap = new Map<string, string>(); // tk source id → PS id
  for (const rec of exportData.borrowers) {
    const r = adaptBorrower(rec);
    if (r.ok) {
      borrowers.push(r.value);
      // BorrowerSchema declares id as optional (DB can generate); the
      // adapter always sets a deterministic UUIDv5, so the assertion is safe.
      borrowerIdMap.set(rec.borrower_id, r.value.id!);
    } else {
      errors.push(r.error);
    }
  }

  // --- Applications ----------------------------------------------------
  const applications: Application[] = [];
  const applicationIdMap = new Map<string, string>();
  for (const rec of exportData.applications) {
    const r = adaptApplication(rec, borrowerIdMap);
    if (r.ok) {
      applications.push(r.value);
      applicationIdMap.set(rec.application_id, r.value.id);
    } else {
      errors.push(r.error);
    }
  }

  // --- Loans -----------------------------------------------------------
  const loans: Loan[] = [];
  const loanIdMap = new Map<string, string>(); // account_number → PS loan id
  for (const rec of exportData.loans) {
    const r = adaptLoan(rec);
    if (r.ok) {
      loans.push(r.value);
      loanIdMap.set(rec.account_number, r.value.id);
    } else {
      errors.push(r.error);
    }
  }

  // --- Schedules -------------------------------------------------------
  const schedules: PaymentSchedule[] = [];
  const schedule_entries: PaymentScheduleEntry[] = [];
  const exportedSchedules = exportData.payment_schedules ?? [];
  const exportedScheduleByAccount = new Map(
    exportedSchedules.map((s) => [s.account_number, s] as const),
  );
  const importedAccountNumbers = new Set(loans.map((l) => l.acct_num));

  // Pick which loans need a regenerated schedule
  const needsRegeneration = new Set<string>();
  if (schedule_strategy === "regenerate") {
    for (const acct of importedAccountNumbers) needsRegeneration.add(acct);
  } else if (schedule_strategy === "auto") {
    for (const acct of importedAccountNumbers) {
      if (!exportedScheduleByAccount.has(acct)) needsRegeneration.add(acct);
    }
  } else {
    // use_export — error for every loan missing a schedule in the export
    for (const acct of importedAccountNumbers) {
      if (!exportedScheduleByAccount.has(acct)) {
        errors.push({
          entity: "schedule",
          source_id: acct,
          reason: "schedule_strategy=use_export but no schedule in export for this loan",
          field: "account_number",
        });
      }
    }
  }

  // Adapt the export-supplied schedules (auto + use_export paths)
  if (schedule_strategy !== "regenerate") {
    for (const rec of exportedSchedules) {
      if (!importedAccountNumbers.has(rec.account_number)) {
        errors.push({
          entity: "schedule",
          source_id: rec.schedule_id,
          reason: `schedule references unknown account_number "${rec.account_number}"`,
          field: "account_number",
        });
        continue;
      }
      const r = adaptScheduleFromExport(rec);
      if (r.ok) {
        schedules.push(r.value.schedule);
        schedule_entries.push(...r.value.entries);
      } else {
        errors.push(r.error);
      }
    }
  }

  // Regenerate via lib/servicing for any loan that needs it.
  // scheduleFromLoan generates entry ids by appending `-${padded_period}` to
  // the supplied prefix, so we hand it the per-(loan, version) seed and let
  // it format. The resulting entries' ids will NOT be UUIDs (lib/servicing
  // is shape-agnostic) — that's intentional: the SQL PK accepts text and
  // regenerated schedules are PaySpyre-internal artifacts, not TK-reconciled
  // records.
  for (const loan of loans) {
    if (!needsRegeneration.has(loan.acct_num)) continue;
    try {
      const built = scheduleFromLoan(
        loan,
        ids.schedule(loan.acct_num, 1),
        `regen-${loan.acct_num}-v1`,
        ran_at,
      );
      schedules.push(built.schedule);
      schedule_entries.push(...built.entries);
    } catch (e) {
      errors.push({
        entity: "schedule",
        source_id: loan.acct_num,
        reason: `regenerate failed: ${(e as Error).message}`,
      });
    }
  }

  // --- Transactions ---------------------------------------------------
  const transactions: LoanTransaction[] = [];
  for (const rec of exportData.transactions) {
    const r = adaptTransaction(rec, loanIdMap);
    if (r.ok) {
      transactions.push(r.value.tx);
    } else {
      errors.push(r.error);
    }
  }

  // --- Documents ------------------------------------------------------
  const documents: MigratedDocument[] = [];
  for (const rec of exportData.documents) {
    const r = adaptDocument(rec, loanIdMap, applicationIdMap, borrowerIdMap);
    if (r.ok) {
      documents.push(r.value);
    } else {
      errors.push(r.error);
    }
  }

  // --- Reconciliation -------------------------------------------------
  const importedCounts: Record<EntityKind, number> = {
    borrower: borrowers.length,
    application: applications.length,
    loan: loans.length,
    schedule: schedules.length,
    transaction: transactions.length,
    document: documents.length,
  };

  const reconciliation = buildReconciliationReport({
    exportData,
    importedLoans: loans,
    importedCounts,
    errors,
    generated_at: ran_at,
    tolerance_cad,
    issues_cap,
  });

  return {
    ran_at,
    imported: {
      borrowers,
      applications,
      loans,
      schedules,
      schedule_entries,
      transactions,
      documents,
    },
    errors,
    reconciliation,
  };
}

// Re-export the public surface for convenient imports.
export type {
  TurnKeyExport,
  TurnKeyBorrowerRecord,
  TurnKeyApplicationRecord,
  TurnKeyLoanRecord,
  TurnKeyScheduleRecord,
  TurnKeyScheduleEntryRecord,
  TurnKeyTransactionRecord,
  TurnKeyDocumentRecord,
  MigrationResult,
  ReconciliationReport,
  ImportError,
  RunOptions,
} from "./types";

