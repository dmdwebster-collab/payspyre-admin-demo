/**
 * TurnKey migration — type definitions.
 *
 * The `TurnKeyExport*Record` interfaces approximate what we expect TurnKey
 * to hand us. Field names + types are educated guesses based on common
 * loan-system terminology; they MUST be reconciled against an actual
 * TurnKey export file before this code goes live. See
 * `docs/spec/turnkey-migration.md` §3 for the open questions.
 *
 * The `MigrationResult` and `ReconciliationReport` types are stable —
 * downstream consumers (PR #4.6 reports, dual-run dashboards) read these
 * shapes and should not need to change as the TurnKey shapes get nailed
 * down.
 */

import type { Borrower } from "../types/borrower";
import type { Application } from "../types/application";
import type { Loan } from "../types/loan";
import type { LoanTransaction } from "../types/transaction";
import type {
  PaymentSchedule,
  PaymentScheduleEntry,
} from "../types/payment-schedule";

// --- TurnKey export shapes (PROVISIONAL — TODO: confirm) ----------------

export interface TurnKeyBorrowerRecord {
  borrower_id: string; // TK primary key
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  province: string; // expected: "BC" | "AB"
  date_of_birth: string; // ISO YYYY-MM-DD
  address_line1: string;
  city: string;
  postal_code: string;
  // TODO(turnkey): confirm middle_name / preferred_name / SIN handling.
}

export interface TurnKeyApplicationRecord {
  application_id: string; // TK primary key
  borrower_id: string; // → TurnKeyBorrowerRecord.borrower_id
  vendor_id: string;
  vendor_name: string;
  province: string;
  status: string; // TK vocabulary; mapped to PaySpyre ApplicationStatus
  requested_amount: number;
  offer_amount?: number | null;
  term_months?: number | null;
  interest_rate?: number | null; // % form
  payment_frequency?: string | null;
  created_at: string; // ISO datetime
  // TODO(turnkey): confirm credit_report / bank_verification timestamp fields.
}

export interface TurnKeyLoanRecord {
  account_number: string; // TK loan id
  application_id?: string | null;
  borrower_id: string;
  vendor_id: string;
  vendor_name: string;
  provider: string;
  province: string;
  principal_advanced: number;
  rate: number; // % form (5.99)
  term_months: number;
  payment_frequency: string;
  first_payment_date: string;
  origination_date: string;
  status: string; // TK vocabulary; mapped to PaySpyre LoanStatus
  // Lifetime totals — used in reconciliation
  principal_balance: number;
  total_interest_paid: number;
  total_principal_paid: number;
  total_payments: number;
  // TODO(turnkey): confirm sub_status / dpd / risk_tier / sales_value / insurance / downpayment.
}

export interface TurnKeyScheduleRecord {
  schedule_id: string;
  account_number: string;
  schedule_version: number;
  generated_at: string;
  original_principal: number;
  annual_rate: number; // % form
  term_months: number;
  payment_frequency: string;
  first_payment_date: string;
  number_of_payments: number;
  regular_payment: number;
  total_interest: number;
  total_paid: number;
  entries: TurnKeyScheduleEntryRecord[];
}

export interface TurnKeyScheduleEntryRecord {
  entry_id: string;
  period: number;
  due_date: string;
  days_in_period: number;
  expected_payment: number;
  expected_interest: number;
  expected_principal: number;
  expected_balance_after: number;
  status: string; // TK vocabulary
  paid_amount: number;
  paid_at?: string | null;
}

export interface TurnKeyTransactionRecord {
  transaction_id: string;
  account_number: string;
  transaction_date: string;
  transaction_type: string;
  payment_amount: number;
  fees_charged: number;
  fees_paid: number;
  interest_paid: number;
  principal_paid: number;
  fee_balance: number;
  interest_balance: number;
  principal_balance: number;
  rate: number; // decimal form (0.0599)
  // TODO(turnkey): confirm vp_code / pd_code / override / sequence_in_account.
}

export interface TurnKeyDocumentRecord {
  document_id: string;
  account_number?: string | null;
  application_id?: string | null;
  borrower_id?: string | null;
  type: string;
  filename: string;
  uploaded_at: string;
  size_bytes: number;
  mime_type: string;
  storage_url: string;
}

export interface TurnKeyExport {
  generated_at: string;
  source: "turnkey";
  borrowers: TurnKeyBorrowerRecord[];
  applications: TurnKeyApplicationRecord[];
  loans: TurnKeyLoanRecord[];
  payment_schedules?: TurnKeyScheduleRecord[];
  transactions: TurnKeyTransactionRecord[];
  documents: TurnKeyDocumentRecord[];
}

// --- Migration result + reconciliation ---------------------------------

export type EntityKind =
  | "borrower"
  | "application"
  | "loan"
  | "schedule"
  | "transaction"
  | "document";

export interface ImportError {
  entity: EntityKind;
  source_id: string;
  reason: string;
  field?: string;
}

export interface MigratedDocument {
  id: string;
  application_id: string | null;
  loan_id: string | null;
  borrower_id: string | null;
  type: string;
  filename: string;
  storage_url: string;
  uploaded_at: string;
  size_bytes: number;
  mime_type: string;
}

export interface PerEntityCounts {
  exported: number;
  imported: number;
  failed: number;
  failure_rate: number;
}

export interface MoneyDelta {
  source: number;
  imported: number;
  delta: number;
}

export interface ReconciliationReport {
  generated_at: string;
  per_entity: Record<EntityKind, PerEntityCounts>;
  money_totals: {
    total_principal_advanced: MoneyDelta;
    total_payments_received: MoneyDelta;
    total_outstanding_principal: MoneyDelta;
  };
  tolerance_cad: number;
  ok: boolean;
  issues: string[]; // first ~20 human-readable problems
}

export interface MigrationResult {
  ran_at: string;
  imported: {
    borrowers: Borrower[];
    applications: Application[];
    loans: Loan[];
    schedules: PaymentSchedule[];
    schedule_entries: PaymentScheduleEntry[];
    transactions: LoanTransaction[];
    documents: MigratedDocument[];
  };
  errors: ImportError[];
  reconciliation: ReconciliationReport;
}

export interface RunOptions {
  /** Per-loan tolerance (CAD) when comparing money totals. Default $0.01. */
  tolerance_cad?: number;
  /**
   * Schedule strategy:
   * - "use_export": use payment_schedules from the export (error if absent).
   * - "regenerate": always re-derive from loan params via lib/servicing.ts.
   * - "auto" (default): use export when present, else regenerate.
   */
  schedule_strategy?: "use_export" | "regenerate" | "auto";
  /** Optional override of the run timestamp — used for deterministic tests. */
  ran_at?: string;
  /** Maximum number of issues to surface in the report. Default 20. */
  issues_cap?: number;
}
