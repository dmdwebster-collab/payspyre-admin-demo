/**
 * TurnKey → PaySpyre per-entity adapters. Pure functions, no side effects.
 *
 * Each adapter returns `{ ok: true, value }` on success or `{ ok: false,
 * error }` when the source record cannot be mapped. Errors carry the
 * source_id and a human-readable reason so the reconciliation report can
 * surface them without losing context.
 *
 * IDs are derived deterministically from TurnKey source ids so re-running
 * the migration produces the same PaySpyre ids — that's what makes the
 * runner idempotent and the eventual DB upsert safe to replay.
 */

import { createHash } from "node:crypto";
import { LoanSchema, type Loan } from "../types/loan";
import { LoanTransactionSchema, type LoanTransaction } from "../types/transaction";
import { ApplicationSchema, type Application } from "../types/application";
import { BorrowerSchema, type Borrower } from "../types/borrower";
import {
  PaymentScheduleSchema,
  PaymentScheduleEntrySchema,
  type PaymentSchedule,
  type PaymentScheduleEntry,
  type ScheduleEntryStatus,
} from "../types/payment-schedule";
import type { ApplicationStatus, LoanStatus, PaymentFrequency } from "../types/enums";
import type {
  TurnKeyBorrowerRecord,
  TurnKeyApplicationRecord,
  TurnKeyLoanRecord,
  TurnKeyScheduleRecord,
  TurnKeyTransactionRecord,
  TurnKeyDocumentRecord,
  ImportError,
  MigratedDocument,
  EntityKind,
} from "./types";

export type AdapterResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ImportError };

const PROVINCES_OK = ["BC", "AB"] as const;
const FREQUENCIES_OK: PaymentFrequency[] = ["Weekly", "BiWeekly", "SemiMonthly", "Monthly"];

// ---------------------------------------------------------------------------
// ID derivation — deterministic so re-runs are idempotent.
// ---------------------------------------------------------------------------

/**
 * Fixed namespace for PaySpyre TurnKey-migration UUIDs. Different PaySpyre
 * imports MUST use different namespaces to avoid collisions; this one is
 * reserved for "TurnKey full export → PaySpyre" exclusively.
 *
 * Format mirrors RFC 4122 §4.3 (UUIDv5, name-based, SHA-1). The bytes are
 * arbitrary but constant — never edit them or every previously imported
 * borrower id changes.
 */
const TURNKEY_NAMESPACE = "6f9619ff-8b86-d011-b42d-00cf4fc964ff";

/** UUIDv5 — RFC 4122 §4.3. Deterministic given (namespace, name). */
function uuidv5(namespaceUuid: string, name: string): string {
  const ns = Buffer.from(namespaceUuid.replace(/-/g, ""), "hex");
  const buf = Buffer.concat([ns, Buffer.from(name, "utf8")]);
  const hash = createHash("sha1").update(buf).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export const ids = {
  /** UUIDv5 — Borrower SQL PK is uuid, so we generate a stable one from TK id. */
  borrower: (tkId: string) => uuidv5(TURNKEY_NAMESPACE, `borrower:${tkId}`),
  application: (tkId: string) => `APP-TK-${tkId}`,
  loan: (accountNumber: string) => `PS-TK-${accountNumber}`,
  /** PaymentSchedule SQL PK is uuid → UUIDv5. */
  schedule: (accountNumber: string, version: number) =>
    uuidv5(TURNKEY_NAMESPACE, `schedule:${accountNumber}:v${version}`),
  /** PaymentScheduleEntry SQL PK is uuid → UUIDv5. */
  scheduleEntry: (accountNumber: string, version: number, period: number) =>
    uuidv5(
      TURNKEY_NAMESPACE,
      `schedule-entry:${accountNumber}:v${version}:${period}`,
    ),
  transaction: (tkId: string) => uuidv5(TURNKEY_NAMESPACE, `transaction:${tkId}`),
  document: (tkId: string) => uuidv5(TURNKEY_NAMESPACE, `document:${tkId}`),
};

// ---------------------------------------------------------------------------
// Status vocabulary mappers — TurnKey → PaySpyre.
// ---------------------------------------------------------------------------

/**
 * Map a TurnKey loan status to PaySpyre's LoanStatus enum. Returns null if
 * the value is unrecognized — caller surfaces an ImportError so we don't
 * silently coerce loans into the wrong terminal state.
 *
 * TurnKey vocabulary is GUESSED — pre-cutover we'll hand the real export
 * to TurnKey and replace this map with the actual values.
 */
export function mapLoanStatus(tkStatus: string): LoanStatus | null {
  const m: Record<string, LoanStatus> = {
    ACTIVE: "ACTIVE",
    OPEN: "ACTIVE",
    CURRENT: "ACTIVE",
    PAID_OFF: "PAID_OFF",
    PAID: "PAID_OFF",
    CLOSED_PAID: "PAID_OFF",
    RENEWED: "RENEWED",
    REFINANCED: "REFINANCED",
    TRANSFERRED: "TRANSFERRED",
    WRITTEN_OFF: "WRITTEN_OFF",
    WRITEOFF: "WRITTEN_OFF",
    SETTLED: "SETTLED",
    SETTLEMENT: "SETTLED",
    VOID: "VOIDED",
    VOIDED: "VOIDED",
    CANCELLED: "VOIDED",
  };
  return m[tkStatus.toUpperCase()] ?? null;
}

export function mapApplicationStatus(tkStatus: string): ApplicationStatus | null {
  const m: Record<string, ApplicationStatus> = {
    PRE_ORIGINATION: "PRE_ORIGINATION",
    ORIGINATION: "ORIGINATION",
    CREDIT_REPORT: "CREDIT_REPORT",
    BANK_VERIFICATION: "BANK_VERIFICATION",
    APPLICATION_VERIFICATION: "APPLICATION_VERIFICATION",
    CREDIT_UNDERWRITING: "CREDIT_UNDERWRITING",
    UNDERWRITING: "CREDIT_UNDERWRITING",
    OFFER_ACCEPTANCE: "OFFER_ACCEPTANCE",
    AGREEMENT_SIGNATURE: "AGREEMENT_SIGNATURE",
    SIGNATURE: "AGREEMENT_SIGNATURE",
    APPROVED: "APPROVED",
    ACTIVE: "ACTIVE",
    BOOKED: "ACTIVE",
    REJECTED: "REJECTED",
    DECLINED: "REJECTED",
    CANCELLED: "CANCELLED",
    CLOSED: "CLOSED",
  };
  return m[tkStatus.toUpperCase()] ?? null;
}

export function mapPaymentFrequency(raw: string): PaymentFrequency | null {
  const u = raw.replace(/[\s_-]/g, "").toUpperCase();
  if (u === "WEEKLY") return "Weekly";
  if (u === "BIWEEKLY" || u === "FORTNIGHTLY") return "BiWeekly";
  if (u === "SEMIMONTHLY" || u === "TWICEMONTHLY") return "SemiMonthly";
  if (u === "MONTHLY") return "Monthly";
  return null;
}

function err(
  entity: EntityKind,
  source_id: string,
  reason: string,
  field?: string,
): ImportError {
  return field ? { entity, source_id, reason, field } : { entity, source_id, reason };
}

function isValidProvince(p: string): p is "BC" | "AB" {
  return (PROVINCES_OK as readonly string[]).includes(p);
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

export function adaptBorrower(
  rec: TurnKeyBorrowerRecord,
): AdapterResult<Borrower> {
  if (!rec.borrower_id) return { ok: false, error: err("borrower", "(missing)", "missing borrower_id") };
  if (!isValidProvince(rec.province)) {
    return {
      ok: false,
      error: err("borrower", rec.borrower_id, `unsupported province "${rec.province}"`, "province"),
    };
  }
  const candidate: Borrower = {
    id: ids.borrower(rec.borrower_id),
    is_primary: true,
    first_name: rec.first_name,
    last_name: rec.last_name,
    date_of_birth: rec.date_of_birth,
    email: rec.email,
    phone: rec.phone,
    address_line1: rec.address_line1,
    city: rec.city,
    province: rec.province,
    postal_code: rec.postal_code,
    country: "CA",
  };
  const parsed = BorrowerSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      error: err(
        "borrower",
        rec.borrower_id,
        parsed.error.issues[0]?.message ?? "schema mismatch",
        parsed.error.issues[0]?.path.join("."),
      ),
    };
  }
  return { ok: true, value: parsed.data };
}

export function adaptApplication(
  rec: TurnKeyApplicationRecord,
  borrowerIdMap: Map<string, string>,
): AdapterResult<Application> {
  if (!rec.application_id) {
    return { ok: false, error: err("application", "(missing)", "missing application_id") };
  }
  const status = mapApplicationStatus(rec.status);
  if (!status) {
    return {
      ok: false,
      error: err(
        "application",
        rec.application_id,
        `unrecognized application status "${rec.status}"`,
        "status",
      ),
    };
  }
  if (!isValidProvince(rec.province)) {
    return {
      ok: false,
      error: err(
        "application",
        rec.application_id,
        `unsupported province "${rec.province}"`,
        "province",
      ),
    };
  }
  const borrowerId = borrowerIdMap.get(rec.borrower_id) ?? null;
  if (!borrowerId) {
    return {
      ok: false,
      error: err(
        "application",
        rec.application_id,
        `unknown borrower_id "${rec.borrower_id}" (not in export)`,
        "borrower_id",
      ),
    };
  }
  const frequency = rec.payment_frequency
    ? mapPaymentFrequency(rec.payment_frequency)
    : null;
  if (rec.payment_frequency && !frequency) {
    return {
      ok: false,
      error: err(
        "application",
        rec.application_id,
        `unrecognized payment_frequency "${rec.payment_frequency}"`,
        "payment_frequency",
      ),
    };
  }
  const candidate: Application = {
    id: ids.application(rec.application_id),
    application_number: ids.application(rec.application_id),
    status,
    vendor_id: rec.vendor_id,
    vendor_name: rec.vendor_name,
    provider: rec.vendor_name, // TK doesn't track provider separately — fall back to vendor name
    province: rec.province,
    primary_borrower_id: borrowerId,
    requested_amount: rec.requested_amount,
    offer_amount: rec.offer_amount ?? undefined,
    term_months: rec.term_months ?? undefined,
    interest_rate: rec.interest_rate ?? undefined,
    payment_frequency: frequency ?? undefined,
    created_at: rec.created_at,
  };
  const parsed = ApplicationSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      error: err(
        "application",
        rec.application_id,
        parsed.error.issues[0]?.message ?? "schema mismatch",
        parsed.error.issues[0]?.path.join("."),
      ),
    };
  }
  return { ok: true, value: parsed.data };
}

export function adaptLoan(rec: TurnKeyLoanRecord): AdapterResult<Loan> {
  if (!rec.account_number) {
    return { ok: false, error: err("loan", "(missing)", "missing account_number") };
  }
  const status = mapLoanStatus(rec.status);
  if (!status) {
    return {
      ok: false,
      error: err("loan", rec.account_number, `unrecognized loan status "${rec.status}"`, "status"),
    };
  }
  if (!isValidProvince(rec.province)) {
    return {
      ok: false,
      error: err(
        "loan",
        rec.account_number,
        `unsupported province "${rec.province}"`,
        "province",
      ),
    };
  }
  const frequency = mapPaymentFrequency(rec.payment_frequency);
  if (!frequency) {
    return {
      ok: false,
      error: err(
        "loan",
        rec.account_number,
        `unrecognized payment_frequency "${rec.payment_frequency}"`,
        "payment_frequency",
      ),
    };
  }

  // Compute final_pmt_date as first_pmt + term*30 days (360-day DSI Monthly
  // approximation; will be re-derived precisely from the schedule downstream).
  const finalPmtDate = addDaysIso(rec.first_payment_date, rec.term_months * 30);

  const candidate: Loan = {
    id: ids.loan(rec.account_number),
    acct_num: rec.account_number,
    borrower: "(see borrowers table)",
    co_borrower: null,
    vendor_id: rec.vendor_id,
    vendor_name: rec.vendor_name,
    provider: rec.provider,
    province: rec.province,
    sales_value: rec.principal_advanced,
    insurance: 0,
    downpayment: 0,
    amount_financed: rec.principal_advanced,
    new_advance: rec.principal_advanced,
    term: rec.term_months,
    rate: rec.rate,
    regular_payment: 0, // re-derived from the schedule by callers
    payment_frequency: frequency,
    cost_of_borrowing: 0,
    origination_date: rec.origination_date,
    org_type: "LOAN-NEW",
    first_pmt_date: rec.first_payment_date,
    final_pmt_date: finalPmtDate,
    diny: 360,
    platform: "M",
    status,
    sub_status: "",
    dpd: 0,
    risk_tier: "AVERAGE",
    fees_balance: 0,
    interest_balance: 0,
    principal_balance: rec.principal_balance,
    total_owed: rec.principal_balance,
    total_payments: rec.total_payments,
    total_fees_paid: 0,
    total_interest_paid: rec.total_interest_paid,
    total_principal_paid: rec.total_principal_paid,
    pmt_count: 0,
    total_tx_count: 0,
    payments_realized: 0,
    fees_realized: 0,
    interest_realized: 0,
    principal_realized: 0,
    next_due_date: null,
    last_payment: null,
    last_tx_type: null,
    close_date: null,
    close_type: null,
    new_acct_num: null,
    renewal_payout: 0,
    principal_renewal: 0,
    interest_renewal: 0,
    fees_renewal: 0,
    adjust_principal: 0,
    adjust_interest: 0,
    adjust_fees: 0,
    writeoff_principal: 0,
    writeoff_interest: 0,
    writeoff_fees: 0,
    writeoff_small_balance: 0,
    transfer_principal: 0,
    transfer_interest: 0,
    transfer_fees: 0,
    nsf_count: 0,
    deferment_count: 0,
    est_principal_loss: 0,
    est_future_interest: 0,
    insolvent_date: null,
    insolvent_amt: 0,
    insolvent_type: "",
    ven_share_fees: 0,
    ven_share_interest: 0.5,
    ven_share_principal: 1,
  };

  const parsed = LoanSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      error: err("loan", rec.account_number, parsed.error.issues[0]?.message ?? "schema mismatch"),
    };
  }
  return { ok: true, value: parsed.data };
}

export function adaptScheduleFromExport(
  rec: TurnKeyScheduleRecord,
): AdapterResult<{ schedule: PaymentSchedule; entries: PaymentScheduleEntry[] }> {
  const frequency = mapPaymentFrequency(rec.payment_frequency);
  if (!frequency) {
    return {
      ok: false,
      error: err(
        "schedule",
        rec.schedule_id,
        `unrecognized payment_frequency "${rec.payment_frequency}"`,
        "payment_frequency",
      ),
    };
  }
  const scheduleId = ids.schedule(rec.account_number, rec.schedule_version);
  const schedule: PaymentSchedule = {
    id: scheduleId,
    loan_id: ids.loan(rec.account_number),
    schedule_version: rec.schedule_version,
    active: true,
    generated_at: rec.generated_at,
    original_principal: rec.original_principal,
    annual_rate: rec.annual_rate,
    term_months: rec.term_months,
    payment_frequency: frequency,
    first_payment_date: rec.first_payment_date,
    number_of_payments: rec.number_of_payments,
    regular_payment: rec.regular_payment,
    total_interest: rec.total_interest,
    total_paid: rec.total_paid,
    created_at: rec.generated_at,
    updated_at: rec.generated_at,
  };
  const parsedSchedule = PaymentScheduleSchema.safeParse(schedule);
  if (!parsedSchedule.success) {
    return {
      ok: false,
      error: err(
        "schedule",
        rec.schedule_id,
        parsedSchedule.error.issues[0]?.message ?? "schedule schema mismatch",
      ),
    };
  }

  const entries: PaymentScheduleEntry[] = [];
  for (const e of rec.entries) {
    const entry: PaymentScheduleEntry = {
      id: ids.scheduleEntry(rec.account_number, rec.schedule_version, e.period),
      schedule_id: scheduleId,
      period: e.period,
      due_date: e.due_date,
      days_in_period: e.days_in_period,
      expected_payment: e.expected_payment,
      expected_interest: e.expected_interest,
      expected_principal: e.expected_principal,
      expected_balance_after: e.expected_balance_after,
      status: mapEntryStatus(e.status),
      paid_amount: e.paid_amount,
      paid_at: e.paid_at ?? null,
      payment_id: null,
    };
    const parsed = PaymentScheduleEntrySchema.safeParse(entry);
    if (!parsed.success) {
      return {
        ok: false,
        error: err(
          "schedule",
          rec.schedule_id,
          `entry period ${e.period}: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`,
          `entries[${e.period}]`,
        ),
      };
    }
    entries.push(parsed.data);
  }

  return { ok: true, value: { schedule: parsedSchedule.data, entries } };
}

export function adaptTransaction(
  rec: TurnKeyTransactionRecord,
  loanIdMap: Map<string, string>,
): AdapterResult<{ loan_id: string; tx: LoanTransaction }> {
  if (!rec.transaction_id) {
    return {
      ok: false,
      error: err("transaction", "(missing)", "missing transaction_id"),
    };
  }
  const loanId = loanIdMap.get(rec.account_number);
  if (!loanId) {
    return {
      ok: false,
      error: err(
        "transaction",
        rec.transaction_id,
        `unknown account_number "${rec.account_number}" (not in export)`,
        "account_number",
      ),
    };
  }
  const candidate: LoanTransaction = {
    row_number: 0,
    transaction_number: undefined,
    vendor_code: "",
    provider: "",
    platform: "M",
    pd_code: undefined,
    override: false,
    sequence_in_account: 0,
    account_number: rec.account_number,
    rate: rec.rate,
    days_in_year: 360,
    borrower_name: "(see borrowers table)",
    date: rec.transaction_date,
    payment_amount: rec.payment_amount,
    fees_charged: rec.fees_charged,
    fees_paid: rec.fees_paid,
    fee_balance: rec.fee_balance,
    accrued_interest: 0,
    interest_due: 0,
    interest_paid: rec.interest_paid,
    interest_balance: rec.interest_balance,
    principal_paid: rec.principal_paid,
    principal_balance: rec.principal_balance,
    total_owed: rec.principal_balance + rec.interest_balance + rec.fee_balance,
    transaction_type: rec.transaction_type,
    vp_code: undefined,
    comments: undefined,
  };
  const parsed = LoanTransactionSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      error: err(
        "transaction",
        rec.transaction_id,
        parsed.error.issues[0]?.message ?? "schema mismatch",
      ),
    };
  }
  return { ok: true, value: { loan_id: loanId, tx: parsed.data } };
}

export function adaptDocument(
  rec: TurnKeyDocumentRecord,
  loanIdMap: Map<string, string>,
  applicationIdMap: Map<string, string>,
  borrowerIdMap: Map<string, string>,
): AdapterResult<MigratedDocument> {
  if (!rec.document_id) {
    return { ok: false, error: err("document", "(missing)", "missing document_id") };
  }
  const value: MigratedDocument = {
    id: ids.document(rec.document_id),
    application_id: rec.application_id ? applicationIdMap.get(rec.application_id) ?? null : null,
    loan_id: rec.account_number ? loanIdMap.get(rec.account_number) ?? null : null,
    borrower_id: rec.borrower_id ? borrowerIdMap.get(rec.borrower_id) ?? null : null,
    type: rec.type,
    filename: rec.filename,
    storage_url: rec.storage_url,
    uploaded_at: rec.uploaded_at,
    size_bytes: rec.size_bytes,
    mime_type: rec.mime_type,
  };
  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapEntryStatus(raw: string): ScheduleEntryStatus {
  const u = raw.toUpperCase();
  if (u === "PAID" || u === "CLEARED") return "PAID";
  if (u === "PARTIAL" || u === "SHORT") return "PARTIAL";
  if (u === "MISSED" || u === "OVERDUE") return "MISSED";
  if (u === "WAIVED" || u === "DEFERRED") return "WAIVED";
  return "PENDING";
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
