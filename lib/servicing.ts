/**
 * Servicing helpers — pure functions over the Servicing data model
 * (`PaymentSchedule`, `PaymentScheduleEntry`, `Payment`, `NSFEvent`).
 *
 * No side effects. No DB writes, no API calls. Wire those in route handlers
 * or the migration runner. These helpers exist so:
 *   - mock-data builders can produce internally-consistent fixtures,
 *   - the TurnKey migration adapter (PR #4.2) can re-derive schedules on
 *     import without divergent logic,
 *   - the Servicing UI (PR #4.3) renders planned vs actual via shared math,
 *   - collections (PR #4.4) flips entries to MISSED through one entrypoint.
 */

import { generateSchedule } from "./amortization";
import type { Loan } from "./types/loan";
import type {
  PaymentSchedule,
  PaymentScheduleEntry,
  ScheduleEntryStatus,
} from "./types/payment-schedule";
import type { Payment } from "./types/payment";
import type { NSFEvent } from "./types/nsf-event";

const round2 = (n: number): number => Math.round(n * 100) / 100;

// Tolerance for "fully paid" — anything within half a cent counts as zero owed.
const PENNY = 0.005;

/** Strip a YYYY-MM-DD prefix off any ISO date or datetime string. */
function toIsoDate(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Build a PaymentSchedule + entries from a Loan, using the canonical
 * 360-day-DSI amortizer.
 *
 * Loan.rate is stored as a percentage (e.g. 5.99 for 5.99% APR). The
 * amortizer expects decimal form, so we divide by 100 once at the boundary
 * and persist the original percentage on the schedule for traceability.
 *
 * `scheduleId` and `entryIdPrefix` are caller-supplied to keep this pure.
 * In production these come from the DB; in fixtures they're hard-coded.
 */
export function scheduleFromLoan(
  loan: Loan,
  scheduleId: string,
  entryIdPrefix: string,
  generated_at: string = new Date().toISOString(),
): { schedule: PaymentSchedule; entries: PaymentScheduleEntry[] } {
  const annualRateDecimal = loan.rate / 100;
  const generated = generateSchedule({
    principal: loan.amount_financed,
    annualRate: annualRateDecimal,
    termMonths: loan.term,
    frequency: loan.payment_frequency,
    firstPaymentDate: loan.first_pmt_date,
  });

  const schedule: PaymentSchedule = {
    id: scheduleId,
    loan_id: loan.id,
    schedule_version: 1,
    active: true,
    generated_at,
    original_principal: loan.amount_financed,
    annual_rate: loan.rate,
    term_months: loan.term,
    payment_frequency: loan.payment_frequency,
    first_payment_date: loan.first_pmt_date,
    number_of_payments: generated.numberOfPayments,
    regular_payment: generated.regularPayment,
    total_interest: generated.totalInterest,
    total_paid: generated.totalPaid,
    created_at: generated_at,
    updated_at: generated_at,
  };

  const entries: PaymentScheduleEntry[] = generated.rows.map((row) => ({
    id: `${entryIdPrefix}-${String(row.period).padStart(3, "0")}`,
    schedule_id: scheduleId,
    period: row.period,
    due_date: row.paymentDate,
    days_in_period: row.daysInPeriod,
    expected_payment: row.payment,
    expected_interest: row.interest,
    expected_principal: row.principal,
    expected_balance_after: row.balance,
    status: "PENDING" as ScheduleEntryStatus,
    paid_amount: 0,
    paid_at: null,
    payment_id: null,
  }));

  return { schedule, entries };
}

/**
 * Apply a posted payment to the next pending/partial entries on a schedule.
 *
 * Allocation walks entries in due-date order, filling each entry up to
 * `expected_payment - paid_amount`, then moving on. A payment that exceeds
 * what's left on the current entry advances to the next entry. This mirrors
 * how Zum Rails callbacks land in the existing TurnKey ledger.
 *
 * Only POSTED payments allocate. SCHEDULED / PROCESSING / RETURNED / FAILED /
 * REVERSED / CANCELLED pass through unchanged — those state transitions are
 * handled elsewhere (the route handler that flips a payment to RETURNED is
 * the same one that calls `buildNSFEvent`).
 *
 * Returns a NEW entries array; the input is not mutated.
 */
export function applyPaymentToSchedule(
  entries: PaymentScheduleEntry[],
  payment: Payment,
): PaymentScheduleEntry[] {
  if (payment.status !== "POSTED") return entries;
  if (payment.amount <= 0) return entries;

  let remaining = payment.amount;
  const sorted = [...entries].sort((a, b) => a.period - b.period);
  const result: PaymentScheduleEntry[] = [];

  for (const entry of sorted) {
    if (remaining <= PENNY) {
      result.push(entry);
      continue;
    }
    if (entry.status === "PAID" || entry.status === "WAIVED") {
      result.push(entry);
      continue;
    }
    const owed = round2(entry.expected_payment - entry.paid_amount);
    if (owed <= PENNY) {
      result.push(entry);
      continue;
    }
    const apply = Math.min(remaining, owed);
    const newPaid = round2(entry.paid_amount + apply);
    remaining = round2(remaining - apply);
    const isFull = Math.abs(newPaid - entry.expected_payment) <= PENNY;
    result.push({
      ...entry,
      paid_amount: newPaid,
      paid_at: payment.posted_at ? toIsoDate(payment.posted_at) : entry.paid_at,
      payment_id: payment.id,
      status: isFull ? "PAID" : "PARTIAL",
    });
  }

  return result;
}

/**
 * Mark entries as MISSED if their due_date is before `asOf` and they remain
 * PENDING or PARTIAL. Entries already PAID, WAIVED, or MISSED pass through.
 *
 * Run this in a nightly job once the cutover lands; until then, callers
 * (e.g. the Servicing worklist preview) can call it on demand.
 */
export function markMissedEntries(
  entries: PaymentScheduleEntry[],
  asOf: Date = new Date(),
): PaymentScheduleEntry[] {
  const asOfIso = toIsoDate(asOf.toISOString());
  return entries.map((e) => {
    if (e.status === "PAID" || e.status === "WAIVED" || e.status === "MISSED") return e;
    if (e.due_date >= asOfIso) return e;
    return { ...e, status: "MISSED" };
  });
}

/**
 * The next entry the borrower owes, or null if every entry is paid/waived.
 * Drives `loan.next_due_date`, the dashboard "next payment" widget, and the
 * Servicing payoff quote.
 *
 * Entries are walked in `period` order — for a sane schedule that's the
 * same as `due_date` order. PARTIAL counts as still owing.
 */
export function nextDueEntry(
  entries: PaymentScheduleEntry[],
): PaymentScheduleEntry | null {
  const sorted = [...entries].sort((a, b) => a.period - b.period);
  for (const e of sorted) {
    if (e.status === "PAID" || e.status === "WAIVED") continue;
    return e;
  }
  return null;
}

export interface BuildNSFEventInput {
  id: string;
  payment: Payment;
  reason_code: string;
  reason_description?: string | null;
  nsf_fee_charged: number;
  bank_fee_recovered?: number | null;
  occurred_at?: string;
}

/**
 * Build an NSFEvent from a returned payment + reason. Pure, no side effects.
 *
 * The caller is responsible for separately flipping `payment.status` to
 * "RETURNED" — keeping these as two operations lets the route handler
 * write both rows in a single transaction without entangling the helpers.
 */
export function buildNSFEvent(input: BuildNSFEventInput): NSFEvent {
  const occurred_at = input.occurred_at ?? new Date().toISOString();
  return {
    id: input.id,
    loan_id: input.payment.loan_id,
    payment_id: input.payment.id,
    occurred_at,
    reason_code: input.reason_code,
    reason_description: input.reason_description ?? null,
    nsf_fee_charged: input.nsf_fee_charged,
    bank_fee_recovered: input.bank_fee_recovered ?? null,
    retry_attempted: false,
    retry_payment_id: null,
    retry_at: null,
    resolved_at: null,
    resolution: null,
    created_at: occurred_at,
    updated_at: occurred_at,
  };
}
