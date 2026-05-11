import { z } from "zod";

/**
 * NSFEvent — a returned-payment record with reason, fees, and retry state.
 *
 * Surfaces in:
 *   - Collections workplace (PR #4.4): NSF queue, retry workflow
 *   - Loan ledger (Servicing): NSF events show inline with transactions
 *   - Reports (PR #4.6): NSF rates per vendor, per cohort, per product
 *
 * Reason codes mirror Zum Rails / CPA-005 return reason codes (e.g. "NSF",
 * "ACCT_CLOSED", "PAYMENT_STOPPED"). Stored as plain strings so we can
 * absorb whatever vocabulary TurnKey hands us in the export — normalized
 * later in PR #4.4 once the values are known.
 */

export const NSF_RESOLUTIONS = [
  "RECOVERED", // Borrower covered the bounced amount + NSF fee
  "WRITTEN_OFF", // Decided not to pursue further
  "PROMISE_TO_PAY", // PTP captured, awaiting borrower follow-through
  "IN_COLLECTIONS", // Moved into the collections workflow
] as const;
export type NSFResolution = (typeof NSF_RESOLUTIONS)[number];

/**
 * PTP status — only meaningful when resolution = PROMISE_TO_PAY.
 * Auto-flipped to BROKEN by a nightly job once `ptp_due_date` passes
 * without payment, or to KEPT when a Payment matching the PTP terms
 * posts. Manual override allowed.
 */
export const PTP_STATUSES = ["OPEN", "KEPT", "BROKEN"] as const;
export type PTPStatus = (typeof PTP_STATUSES)[number];

export const PTP_METHODS = [
  "EFT",
  "PAD",
  "WIRE",
  "CHEQUE",
  "CASH",
  "INTERNAL_TRANSFER",
] as const;
export type PTPMethod = (typeof PTP_METHODS)[number];

export const NSFEventSchema = z.object({
  id: z.string(),
  loan_id: z.string(), // → loans(id)
  payment_id: z.string(), // → payments(id) — the bounced payment
  occurred_at: z.string().datetime(),
  reason_code: z.string(), // bank/Zum return reason code
  reason_description: z.string().nullable(),
  nsf_fee_charged: z.number().nonnegative(), // PaySpyre fee → borrower
  bank_fee_recovered: z.number().nonnegative().nullable(), // optional pass-through
  retry_attempted: z.boolean(),
  retry_payment_id: z.string().nullable(), // → payments(id) on retry
  retry_at: z.string().nullable(), // ISO YYYY-MM-DD
  resolved_at: z.string().datetime().nullable(),
  resolution: z.enum(NSF_RESOLUTIONS).nullable(),
  // PR #4.4.3 — Promise-to-pay capture. Only populated when resolution =
  // PROMISE_TO_PAY; otherwise nullable / undefined.
  ptp_amount: z.number().positive().nullable().optional(),
  ptp_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ptp_method: z.enum(PTP_METHODS).nullable().optional(),
  ptp_status: z.enum(PTP_STATUSES).nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type NSFEvent = z.infer<typeof NSFEventSchema>;
