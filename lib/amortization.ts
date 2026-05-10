/**
 * Amortization generator — 360-day DSI (Daily Simple Interest).
 *
 * Conventions (locked):
 *   - Year length = 360 days
 *   - Every month = 30 days
 *   - Period day-counts:
 *       Weekly       = 7
 *       BiWeekly     = 14
 *       SemiMonthly  = 15
 *       Monthly      = 30
 *   - Interest per period = principal_balance * (annual_rate / 360) * days_in_period
 *   - Level (blended) payment derived from PV annuity formula on per-period rate.
 *   - All amounts CAD, rounded to cents using banker's rounding only at the row level.
 *   - Final payment is reconciled so principal_balance ends exactly at 0.00.
 *
 * Term semantics:
 *   - `termMonths` is the contract length in months.
 *   - Number of installments = termMonths * (periodsPerYear / 12).
 *
 * This is the canonical generator used by Initial Schedule, Servicing payoff,
 * and Reports. Pure function — no side effects, deterministic given inputs.
 */

import type { PaymentFrequency } from "./types/enums";

export const DAYS_IN_YEAR = 360 as const;

export const DAYS_PER_PERIOD: Record<PaymentFrequency, number> = {
  Weekly: 7,
  BiWeekly: 14,
  SemiMonthly: 15,
  Monthly: 30,
};

export const PERIODS_PER_YEAR: Record<PaymentFrequency, number> = {
  Weekly: 52,
  BiWeekly: 26,
  SemiMonthly: 24,
  Monthly: 12,
};

export interface AmortizationInput {
  /** Original principal financed, CAD. */
  principal: number;
  /** Annual interest rate as a decimal — e.g. 0.0599 for 5.99%. */
  annualRate: number;
  /** Loan term in months. */
  termMonths: number;
  /** Payment frequency. */
  frequency: PaymentFrequency;
  /** ISO date (YYYY-MM-DD) of the first payment. */
  firstPaymentDate: string;
}

export interface AmortizationRow {
  /** 1-based installment number. */
  period: number;
  /** ISO date (YYYY-MM-DD) of this payment. */
  paymentDate: string;
  /** Days since the previous accrual point (or origination → first payment). */
  daysInPeriod: number;
  /** Full payment amount for this period (CAD, 2dp). */
  payment: number;
  /** Interest portion (CAD, 2dp). */
  interest: number;
  /** Principal portion (CAD, 2dp). */
  principal: number;
  /** Remaining principal balance after this payment (CAD, 2dp). */
  balance: number;
}

export interface AmortizationSchedule {
  rows: AmortizationRow[];
  /** Level payment used for all but the final period (CAD, 2dp). */
  regularPayment: number;
  /** Sum of all interest paid over life of loan (CAD, 2dp). */
  totalInterest: number;
  /** Sum of all payments (principal + interest) over life of loan (CAD, 2dp). */
  totalPaid: number;
  /** Number of installments. */
  numberOfPayments: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Add `days` to an ISO date string and return ISO date string.
 * Uses UTC arithmetic so DST never shifts the day.
 */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Compute the level payment for a fully-amortizing loan given per-period rate.
 * Standard PV-annuity formula:  P = pv * r / (1 - (1+r)^-n)
 * Falls back to straight principal/n when r == 0.
 */
export function levelPayment(pv: number, ratePerPeriod: number, n: number): number {
  if (n <= 0) return 0;
  if (ratePerPeriod === 0) return pv / n;
  const factor = Math.pow(1 + ratePerPeriod, -n);
  return (pv * ratePerPeriod) / (1 - factor);
}

/**
 * Generate the full amortization schedule for a loan.
 *
 * Throws on invalid input (negative principal/rate, non-positive term, etc).
 */
export function generateSchedule(input: AmortizationInput): AmortizationSchedule {
  const { principal, annualRate, termMonths, frequency, firstPaymentDate } = input;

  if (principal <= 0) throw new Error("principal must be > 0");
  if (annualRate < 0) throw new Error("annualRate must be >= 0");
  if (termMonths <= 0) throw new Error("termMonths must be > 0");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstPaymentDate)) {
    throw new Error("firstPaymentDate must be ISO YYYY-MM-DD");
  }

  const daysPerPeriod = DAYS_PER_PERIOD[frequency];
  const periodsPerYear = PERIODS_PER_YEAR[frequency];
  const ratePerPeriod = (annualRate * daysPerPeriod) / DAYS_IN_YEAR;
  const n = Math.round(termMonths * (periodsPerYear / 12));

  const rawPayment = levelPayment(principal, ratePerPeriod, n);
  const regularPayment = round2(rawPayment);

  const rows: AmortizationRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  let paymentDate = firstPaymentDate;

  for (let period = 1; period <= n; period++) {
    // Interest accrues on current balance for the period's day count.
    const interest = round2(balance * (annualRate / DAYS_IN_YEAR) * daysPerPeriod);

    let payment: number;
    let principalPortion: number;

    if (period === n) {
      // Final period: pay whatever is left + final interest exactly.
      principalPortion = round2(balance);
      payment = round2(principalPortion + interest);
      balance = 0;
    } else {
      payment = regularPayment;
      principalPortion = round2(payment - interest);
      balance = round2(balance - principalPortion);
    }

    totalInterest = round2(totalInterest + interest);
    totalPaid = round2(totalPaid + payment);

    rows.push({
      period,
      paymentDate,
      daysInPeriod: daysPerPeriod,
      payment,
      interest,
      principal: principalPortion,
      balance,
    });

    if (period < n) {
      paymentDate = addDays(paymentDate, daysPerPeriod);
    }
  }

  return {
    rows,
    regularPayment,
    totalInterest,
    totalPaid,
    numberOfPayments: n,
  };
}

/**
 * Compute payoff quote at an arbitrary date during the life of the loan.
 *
 * Returns the principal balance + accrued interest from the last paid period
 * up to (but not including) the payoff date.
 *
 * @param schedule The schedule produced by `generateSchedule`.
 * @param annualRate Annual rate (decimal) — must match the schedule's input.
 * @param payoffDate ISO date (YYYY-MM-DD) — the day payoff funds settle.
 * @param paidThroughPeriod Number of installments already paid in full (0..n).
 */
export function payoffQuote(
  schedule: AmortizationSchedule,
  annualRate: number,
  payoffDate: string,
  paidThroughPeriod: number,
): { principal: number; accruedInterest: number; total: number; daysAccrued: number } {
  const { rows, numberOfPayments } = schedule;
  if (paidThroughPeriod < 0 || paidThroughPeriod > numberOfPayments) {
    throw new Error("paidThroughPeriod out of range");
  }

  // Balance after `paidThroughPeriod` payments. Period 0 = original principal.
  const principalBalance =
    paidThroughPeriod === 0 ? rows[0].balance + rows[0].principal : rows[paidThroughPeriod - 1].balance;

  const lastDate =
    paidThroughPeriod === 0
      ? // Origination is daysPerPeriod before the first payment date.
        addDays(rows[0].paymentDate, -rows[0].daysInPeriod)
      : rows[paidThroughPeriod - 1].paymentDate;

  const days = daysBetween(lastDate, payoffDate);
  if (days < 0) throw new Error("payoffDate is before paid-through date");

  const accruedInterest = round2(principalBalance * (annualRate / DAYS_IN_YEAR) * days);
  return {
    principal: round2(principalBalance),
    accruedInterest,
    total: round2(principalBalance + accruedInterest),
    daysAccrued: days,
  };
}

/** Inclusive-of-start, exclusive-of-end day count between two ISO dates. */
export function daysBetween(startIso: string, endIso: string): number {
  const [y1, m1, d1] = startIso.split("-").map(Number);
  const [y2, m2, d2] = endIso.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}
