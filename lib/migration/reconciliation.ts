/**
 * Reconciliation report — compares the TurnKey export against what the
 * runner managed to import. Money totals are the safest cross-check
 * because they survive any field-name renaming that hasn't been confirmed
 * yet; per-entity counts catch missing-mapper / dropped-record bugs.
 *
 * The dual-run period (PR #4.6) drives a richer dashboard on top of this
 * structure — a single ReconciliationReport per migration run gets
 * persisted and rendered as a regulatory artifact.
 */

import type {
  EntityKind,
  ImportError,
  MoneyDelta,
  PerEntityCounts,
  ReconciliationReport,
  TurnKeyExport,
} from "./types";
import type { Loan } from "../types/loan";

const ENTITIES: EntityKind[] = [
  "borrower",
  "application",
  "loan",
  "schedule",
  "transaction",
  "document",
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

function moneyDelta(source: number, imported: number): MoneyDelta {
  return {
    source: round2(source),
    imported: round2(imported),
    delta: round2(imported - source),
  };
}

function counts(exported: number, imported: number, failed: number): PerEntityCounts {
  return {
    exported,
    imported,
    failed,
    failure_rate: exported > 0 ? round2(failed / exported) : 0,
  };
}

export interface ReconcileInput {
  exportData: TurnKeyExport;
  importedLoans: Loan[];
  importedCounts: Record<EntityKind, number>;
  errors: ImportError[];
  generated_at: string;
  tolerance_cad: number;
  issues_cap: number;
}

export function buildReconciliationReport(input: ReconcileInput): ReconciliationReport {
  const exportedCounts: Record<EntityKind, number> = {
    borrower: input.exportData.borrowers.length,
    application: input.exportData.applications.length,
    loan: input.exportData.loans.length,
    schedule: input.exportData.payment_schedules?.length ?? 0,
    transaction: input.exportData.transactions.length,
    document: input.exportData.documents.length,
  };

  const errorsByEntity = ENTITIES.reduce(
    (acc, kind) => {
      acc[kind] = input.errors.filter((e) => e.entity === kind).length;
      return acc;
    },
    {} as Record<EntityKind, number>,
  );

  const per_entity = ENTITIES.reduce(
    (acc, kind) => {
      acc[kind] = counts(
        exportedCounts[kind],
        input.importedCounts[kind] ?? 0,
        errorsByEntity[kind] ?? 0,
      );
      return acc;
    },
    {} as Record<EntityKind, PerEntityCounts>,
  );

  // Money totals — derived from the source export and the imported Loans.
  const sourcePrincipal = sum(input.exportData.loans.map((l) => l.principal_advanced));
  const sourcePayments = sum(input.exportData.loans.map((l) => l.total_payments));
  const sourceOutstanding = sum(input.exportData.loans.map((l) => l.principal_balance));

  const importedPrincipal = sum(input.importedLoans.map((l) => l.amount_financed));
  const importedPayments = sum(input.importedLoans.map((l) => l.total_payments));
  const importedOutstanding = sum(input.importedLoans.map((l) => l.principal_balance));

  const money_totals = {
    total_principal_advanced: moneyDelta(sourcePrincipal, importedPrincipal),
    total_payments_received: moneyDelta(sourcePayments, importedPayments),
    total_outstanding_principal: moneyDelta(sourceOutstanding, importedOutstanding),
  };

  const issues: string[] = [];

  // Per-entity issues
  for (const kind of ENTITIES) {
    const c = per_entity[kind];
    if (c.failed > 0) {
      issues.push(
        `${kind}: ${c.failed}/${c.exported} record(s) failed to import (${(c.failure_rate * 100).toFixed(1)}%)`,
      );
    }
    const dropped = c.exported - c.imported - c.failed;
    if (dropped > 0) {
      issues.push(
        `${kind}: ${dropped} record(s) silently dropped (exported ${c.exported}, imported ${c.imported}, errors ${c.failed})`,
      );
    }
  }

  // Money issues
  for (const [name, delta] of Object.entries(money_totals)) {
    if (Math.abs(delta.delta) > input.tolerance_cad) {
      issues.push(
        `${name}: delta CAD ${delta.delta.toFixed(2)} exceeds tolerance ${input.tolerance_cad.toFixed(2)} (source ${delta.source.toFixed(2)} vs imported ${delta.imported.toFixed(2)})`,
      );
    }
  }

  // First few error reasons (the report carries counts; the runner carries
  // the full error array for downstream debugging)
  const sampleErrors = input.errors.slice(0, Math.max(0, input.issues_cap - issues.length));
  for (const e of sampleErrors) {
    const fieldHint = e.field ? ` [${e.field}]` : "";
    issues.push(`${e.entity}/${e.source_id}: ${e.reason}${fieldHint}`);
  }

  const cappedIssues = issues.slice(0, input.issues_cap);
  const moneyOk = Object.values(money_totals).every(
    (d) => Math.abs(d.delta) <= input.tolerance_cad,
  );
  const countsOk = ENTITIES.every((k) => per_entity[k].failed === 0);

  return {
    generated_at: input.generated_at,
    per_entity,
    money_totals,
    tolerance_cad: input.tolerance_cad,
    ok: moneyOk && countsOk,
    issues: cappedIssues,
  };
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
