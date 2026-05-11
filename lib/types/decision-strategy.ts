import { z } from "zod";

/**
 * DecisionStrategy — configurable scorecard rules + auto-decision
 * thresholds (PR #4.8).
 *
 * Per the cutover handoff §10, David Wilson owns the credit policy v0.
 * This PR ships the framework + a placeholder strategy with reasonable
 * industry defaults so engineering doesn't block on policy. PR #4.8.x
 * lets David edit the thresholds via a Settings UI once he commits.
 *
 * The shape is intentionally small. The PR #3.1 design called for
 * `decision_strategy_id` on each `AmountBracket`; that wiring lands in
 * a follow-up — for now strategies are global per-product (single
 * strategy applies to every bracket of every product).
 */

export const DECISION_RECOMMENDATIONS = [
  "AUTO_APPROVE",
  "AUTO_DECLINE",
  "MANUAL_REVIEW",
] as const;
export type DecisionRecommendation = (typeof DECISION_RECOMMENDATIONS)[number];

export const DecisionStrategySchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  description: z.string(),
  /** Bureau score below this → AUTO_DECLINE. */
  bureau_score_auto_decline_below: z.number().int().positive(),
  /** Bureau score at or above this → AUTO_APPROVE candidate. */
  bureau_score_auto_approve_at_or_above: z.number().int().positive(),
  /** Maximum loan amount eligible for AUTO_APPROVE. Above → MANUAL_REVIEW. */
  auto_approve_max_amount_cad: z.number().nonnegative(),
  /** Flinks-derived ability-to-pay score floor for AUTO_APPROVE. */
  ability_to_pay_score_min: z.number().int().nonnegative(),
  /** NSF count in the past 90 days above this → AUTO_DECLINE. */
  max_nsf_count_90d: z.number().int().nonnegative(),
  /** Bankruptcy in the past N months → AUTO_DECLINE. */
  bankruptcy_lookback_months: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type DecisionStrategy = z.infer<typeof DecisionStrategySchema>;
