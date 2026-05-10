import { z } from "zod";
import { PAYMENT_FREQUENCIES } from "./enums";

/**
 * PaymentSchedule — the persisted amortization plan for a loan.
 *
 * Why persist a snapshot rather than always re-deriving from the Loan?
 *   1. A schedule is reproducible if challenged (regulator, borrower, audit).
 *      We freeze the inputs (`original_principal`, `annual_rate`, etc.) so
 *      future code changes can't retroactively shift a borrower's expected
 *      payments.
 *   2. A loan can have multiple schedule versions — renewals, refinances,
 *      hardship resets — and each version needs its own entries. The active
 *      version is identified by `active = true`.
 *   3. Servicing renders planned vs actual; collections checks for missed
 *      entries; reports compare expected payment volume against received.
 *
 * Generator: lib/amortization.ts → `generateSchedule()` (360-day DSI).
 * Helper:    lib/servicing.ts → `scheduleFromLoan()`.
 */

export const SCHEDULE_ENTRY_STATUSES = [
  "PENDING", // Future or current entry — not yet paid
  "PAID", // Fully paid (paid_amount ≈ expected_payment)
  "PARTIAL", // Some funds applied, less than expected
  "MISSED", // Past due, no full payment received
  "WAIVED", // Operator waived this entry (deferment, hardship)
] as const;
export type ScheduleEntryStatus = (typeof SCHEDULE_ENTRY_STATUSES)[number];

export const PaymentScheduleEntrySchema = z.object({
  id: z.string(),
  schedule_id: z.string(), // → payment_schedules(id)
  period: z.number().int().positive(), // 1-based installment number
  due_date: z.string(), // ISO YYYY-MM-DD
  days_in_period: z.number().int().positive(),
  expected_payment: z.number().nonnegative(),
  expected_interest: z.number().nonnegative(),
  expected_principal: z.number().nonnegative(),
  expected_balance_after: z.number().nonnegative(),
  status: z.enum(SCHEDULE_ENTRY_STATUSES),
  paid_amount: z.number().nonnegative(),
  paid_at: z.string().nullable(), // ISO YYYY-MM-DD — last allocation
  payment_id: z.string().nullable(), // → payments(id) — most recent allocator
});
export type PaymentScheduleEntry = z.infer<typeof PaymentScheduleEntrySchema>;

export const PaymentScheduleSchema = z.object({
  id: z.string(),
  loan_id: z.string(), // → loans(id)
  schedule_version: z.number().int().positive(), // 1-based; bumped on each reset
  active: z.boolean(),
  generated_at: z.string().datetime(),

  // Frozen generator inputs
  original_principal: z.number().positive(),
  annual_rate: z.number().nonnegative(), // % form (5.99 = 5.99% APR)
  term_months: z.number().int().positive(),
  payment_frequency: z.enum(PAYMENT_FREQUENCIES),
  first_payment_date: z.string(), // ISO YYYY-MM-DD

  // Frozen generator outputs
  number_of_payments: z.number().int().positive(),
  regular_payment: z.number().nonnegative(),
  total_interest: z.number().nonnegative(),
  total_paid: z.number().nonnegative(),

  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type PaymentSchedule = z.infer<typeof PaymentScheduleSchema>;
