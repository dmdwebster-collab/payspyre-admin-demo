/**
 * NSF action helpers — pure functions that compute the next state of an
 * NSFEvent or build a retry Payment. The Server Actions in
 * `app/collections/nsf/[eventId]/actions.ts` wrap these with DB mutation
 * + revalidatePath. Tests cover this file; the Server Action thin layer
 * is exercised through the UI in PR #4.4.x.
 */

import { z } from "zod";
import type { NSFEvent, NSFResolution } from "./types/nsf-event";
import type { Payment, PaymentMethod } from "./types/payment";

// --- Resolve --------------------------------------------------------------

export const ResolveInputSchema = z.object({
  resolution: z.enum([
    "RECOVERED",
    "WRITTEN_OFF",
    "PROMISE_TO_PAY",
    "IN_COLLECTIONS",
  ]),
  /** ISO YYYY-MM-DD. Defaults to today (UTC) when omitted. */
  resolved_on: z.string().optional(),
  comments: z.string().max(1000).optional(),
});
export type ResolveInput = z.infer<typeof ResolveInputSchema>;

/**
 * Apply a resolution to an NSFEvent. Returns the next event + a parsed
 * input for audit. Throws if the event is already resolved (idempotency
 * guard — the caller should re-fetch in that case).
 */
export function applyResolution(
  event: NSFEvent,
  rawInput: unknown,
  now: Date = new Date(),
): { next: NSFEvent; input: ResolveInput } {
  if (event.resolved_at) {
    throw new Error("NSF event is already resolved");
  }
  const input = ResolveInputSchema.parse(rawInput);
  const resolved_at = now.toISOString();
  const next: NSFEvent = {
    ...event,
    resolution: input.resolution as NSFResolution,
    resolved_at,
    updated_at: resolved_at,
  };
  return { next, input };
}

// --- Retry ----------------------------------------------------------------

export const RetryInputSchema = z.object({
  amount: z.number().positive(),
  /** ISO YYYY-MM-DD when the retry should debit. */
  scheduled_for: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(["EFT", "PAD", "WIRE", "CHEQUE", "CASH", "INTERNAL_TRANSFER"]),
  bank_account_id: z.string().nullable().optional(),
});
export type RetryInput = z.infer<typeof RetryInputSchema>;

export interface BuildRetryInput {
  event: NSFEvent;
  raw: unknown;
  /** Caller-supplied id for the new Payment row (UUID in production). */
  payment_id: string;
  now?: Date;
}

/**
 * Build a fresh retry Payment + the updated NSFEvent that points at it.
 * Pure; the Server Action persists both atomically.
 *
 * Throws if the event already has a retry attempted (a second retry is
 * a separate workflow; we don't reuse the same NSFEvent for cascading
 * retries).
 */
export function buildRetry(input: BuildRetryInput): {
  retry: Payment;
  next: NSFEvent;
  parsed: RetryInput;
} {
  if (input.event.retry_attempted) {
    throw new Error(
      "NSF event already has a retry attempted — open a new event for cascading retries",
    );
  }
  const parsed = RetryInputSchema.parse(input.raw);
  const now = input.now ?? new Date();
  const ts = now.toISOString();

  const retry: Payment = {
    id: input.payment_id,
    loan_id: input.event.loan_id,
    bank_account_id: parsed.bank_account_id ?? null,
    scheduled_for: parsed.scheduled_for,
    posted_at: null,
    amount: parsed.amount,
    method: parsed.method as PaymentMethod,
    source: "COLLECTIONS",
    status: "SCHEDULED",
    external_ref: null,
    zum_payment_id: null,
    description: `Retry of NSF ${input.event.id}`,
    created_at: ts,
    updated_at: ts,
  };

  const next: NSFEvent = {
    ...input.event,
    retry_attempted: true,
    retry_payment_id: input.payment_id,
    retry_at: parsed.scheduled_for,
    updated_at: ts,
  };

  return { retry, next, parsed };
}
