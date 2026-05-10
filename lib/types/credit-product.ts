import { z } from "zod";
import { PROVINCES, PAYMENT_FREQUENCIES, type PaymentFrequency } from "./enums";

/**
 * Credit Product configuration.
 *
 * --- Architectural direction (David Wilson, PR #3.1) ---
 *
 * TurnKey forces one frequency, one rate range, and one term band per product,
 * which means we end up cloning a product 4× just to support Weekly /
 * Bi-Weekly / Semi-Monthly / Monthly, and again whenever the term ceiling
 * needs to vary by loan size. The new platform must support **one
 * intelligently configurable product framework** with:
 *   - configurable amount brackets,
 *   - configurable term brackets per amount bracket,
 *   - configurable pricing/rate brackets,
 *   - multiple permitted payment frequencies within the same product,
 *   - configurable underwriting requirements,
 *   - dynamic disclosures / documents / calculations driven by selections.
 *
 * Concretely, a product owns:
 *   1. Identity (code, name, provinces, active flag).
 *   2. `permitted_frequencies[]` — every payment cadence allowed under this
 *      product. The amortizer / disclosures key off the chosen frequency.
 *   3. `amount_brackets[]` — non-overlapping principal ranges. Each bracket
 *      carries:
 *         - one or more `permitted_terms[]` bands (e.g. "12–36 mo" + "37–60 mo"),
 *         - a single `rate_band` (min/default/max APR for that bracket).
 *      This lets the same product cap small loans at short terms while still
 *      offering long terms on larger principal — without duplicating products.
 *   4. Verification toggles + per-check freshness windows, unchanged from
 *      David's PR #1 direction. Bureau and bank checks are independent;
 *      stale on one does not invalidate the other.
 *
 * Spec ref: docs/spec/credit-product-architecture.md (David's verbatim
 * direction + design rationale).
 */

// --- Sub-schemas --------------------------------------------------------

export const TermBandSchema = z
  .object({
    min_term_months: z.number().int().positive(),
    max_term_months: z.number().int().positive(),
  })
  .refine((b) => b.max_term_months >= b.min_term_months, {
    message: "max_term_months must be >= min_term_months",
  });
export type TermBand = z.infer<typeof TermBandSchema>;

export const RateBandSchema = z
  .object({
    min_rate: z.number().nonnegative(),
    default_rate: z.number().nonnegative(),
    max_rate: z.number().nonnegative(),
  })
  .refine((r) => r.min_rate <= r.default_rate && r.default_rate <= r.max_rate, {
    message: "rate band must satisfy min_rate <= default_rate <= max_rate",
  });
export type RateBand = z.infer<typeof RateBandSchema>;

export const AmountBracketSchema = z
  .object({
    id: z.string(), // stable id for joins / audit
    min_amount: z.number().nonnegative(),
    max_amount: z.number().nonnegative(),
    permitted_terms: z.array(TermBandSchema).min(1),
    rate_band: RateBandSchema,
  })
  .refine((b) => b.max_amount >= b.min_amount, {
    message: "max_amount must be >= min_amount",
  });
export type AmountBracket = z.infer<typeof AmountBracketSchema>;

// --- Product schema -----------------------------------------------------

export const CreditProductSchema = z.object({
  id: z.string(),
  code: z.string(), // short code surfaced in UI (e.g. "DENT")
  name: z.string(),
  active: z.boolean().default(true),

  // Provincial scope
  provinces: z.array(z.enum(PROVINCES)).min(1),

  // Multi-frequency support — a product can permit any subset of cadences.
  // Amortizer + disclosures branch on the offer's chosen frequency.
  permitted_frequencies: z
    .array(z.enum(PAYMENT_FREQUENCIES))
    .min(1),

  // Amount brackets carry their own term + rate bands.
  amount_brackets: z.array(AmountBracketSchema).min(1),

  // Pricing — fees apply globally to the product, not per bracket.
  origination_fee_pct: z.number().nonnegative().default(0),

  // Verification requirements (David's per-product toggles, PR #1)
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

// --- Helpers ------------------------------------------------------------

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

/**
 * Find the amount bracket that contains a given principal, or null when no
 * bracket matches. Brackets are expected to be non-overlapping, but if they
 * overlap we return the first match in declaration order so config authors
 * have predictable resolution.
 */
export function findApplicableBracket(
  product: CreditProduct,
  amount: number,
): AmountBracket | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  for (const bracket of product.amount_brackets) {
    if (amount >= bracket.min_amount && amount <= bracket.max_amount) {
      return bracket;
    }
  }
  return null;
}

export type ValidateOfferTermsResult =
  | { ok: true; bracket: AmountBracket }
  | { ok: false; reason: OfferRejectReason };

export type OfferRejectReason =
  | "amount_out_of_range"
  | "term_out_of_range"
  | "frequency_not_permitted"
  | "invalid_amount"
  | "invalid_term";

/**
 * Validate a tentative offer against a product's bracket structure.
 * Returns the matching bracket on success, or a structured reason on failure
 * so callers can surface field-level errors in the UI.
 */
export function validateOfferTerms(
  product: CreditProduct,
  amount: number,
  term_months: number,
  frequency: PaymentFrequency,
): ValidateOfferTermsResult {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }
  if (!Number.isInteger(term_months) || term_months <= 0) {
    return { ok: false, reason: "invalid_term" };
  }
  if (!product.permitted_frequencies.includes(frequency)) {
    return { ok: false, reason: "frequency_not_permitted" };
  }
  const bracket = findApplicableBracket(product, amount);
  if (!bracket) {
    return { ok: false, reason: "amount_out_of_range" };
  }
  const termFits = bracket.permitted_terms.some(
    (band) =>
      term_months >= band.min_term_months && term_months <= band.max_term_months,
  );
  if (!termFits) {
    return { ok: false, reason: "term_out_of_range" };
  }
  return { ok: true, bracket };
}
