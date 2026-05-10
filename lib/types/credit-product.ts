import { z } from "zod";
import { PROVINCES } from "./enums";

/**
 * Credit Product configuration.
 *
 * Per David Wilson (PR #1 review):
 * - "Certain credit products may not require a credit bureau at all" →
 *   credit-bureau requirement is a per-product On/Off toggle.
 * - Credit Report and Bank Verification each have an independent validity
 *   window (default 30 days). If a valid result already exists within the
 *   window, the system reuses the existing data rather than initiating a
 *   new pull.
 * - Expiry applies independently — an expired credit report does not
 *   automatically require a new bank verification and vice versa.
 *
 * Spec ref: David's PR #1 reply, docs/spec/admin-dashboard-spec.md
 * "Loan Settings" / "Decision Engine" sections.
 */
export const CreditProductSchema = z.object({
  id: z.string(),
  code: z.string(), // short code surfaced in UI (e.g. "DENT-12M")
  name: z.string(),
  active: z.boolean().default(true),

  // Provincial scope
  provinces: z.array(z.enum(PROVINCES)).min(1),

  // Term + amount bands
  min_amount: z.number().nonnegative(),
  max_amount: z.number().nonnegative(),
  min_term_months: z.number().int().positive(),
  max_term_months: z.number().int().positive(),

  // Pricing
  base_rate: z.number().nonnegative(),
  origination_fee_pct: z.number().nonnegative().default(0),

  // Verification requirements (David's per-product toggles)
  requires_credit_bureau: z.boolean().default(true),
  requires_bank_verification: z.boolean().default(true),

  // Reuse / freshness windows (days). Apply independently per check.
  credit_report_validity_days: z.number().int().positive().default(30),
  bank_verification_validity_days: z.number().int().positive().default(30),

  // Optional: post-booking re-pull cadence (collections, portfolio review).
  // null/undefined = no automatic re-pull.
  post_booking_credit_repull_days: z.number().int().positive().nullable().optional(),
  post_booking_bank_repull_days: z.number().int().positive().nullable().optional(),

  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type CreditProduct = z.infer<typeof CreditProductSchema>;

/**
 * Helper — given a "last completed at" timestamp and a validity window,
 * is the check still considered fresh as of `asOf`?
 */
export function isCheckFresh(
  lastCompletedAt: string | null | undefined,
  validityDays: number,
  asOf: Date = new Date(),
): boolean {
  if (!lastCompletedAt) return false;
  const completed = new Date(lastCompletedAt).getTime();
  if (Number.isNaN(completed)) return false;
  const ageMs = asOf.getTime() - completed;
  const validityMs = validityDays * 24 * 60 * 60 * 1000;
  return ageMs >= 0 && ageMs <= validityMs;
}
