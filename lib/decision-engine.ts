/**
 * Decision Engine v0 (PR #4.8).
 *
 * Pure helper that evaluates a tentative loan offer against a
 * DecisionStrategy and returns a recommendation
 * (AUTO_APPROVE / AUTO_DECLINE / MANUAL_REVIEW) with the rule trace
 * underneath.
 *
 * Signals (`bureau_score`, `ability_to_pay_score`, `nsf_count_90d`,
 * `had_bankruptcy_within_lookback`) are passed in from the caller —
 * production wires them off the bureau pull (PR #4.5.1) + the bank
 * verification (PR #4.5.1) + the loan history. For the demo, the
 * Decision tab plugs in mock signals so the recommendation surfaces.
 *
 * Decision order (first hard fail wins, else evaluate the soft
 * thresholds):
 *   1. NSF count > strategy.max_nsf_count_90d → AUTO_DECLINE
 *   2. Bankruptcy within lookback → AUTO_DECLINE
 *   3. Bureau score < auto_decline_below → AUTO_DECLINE
 *   4. Amount > auto_approve_max_amount → MANUAL_REVIEW
 *   5. Bureau score >= auto_approve_at_or_above
 *      AND ability_to_pay >= floor → AUTO_APPROVE
 *   6. Else → MANUAL_REVIEW
 *
 * No I/O. Deterministic.
 */

import type {
  DecisionRecommendation,
  DecisionStrategy,
} from "./types/decision-strategy";

export interface DecisionSignals {
  amount_cad: number;
  bureau_score?: number;
  ability_to_pay_score?: number;
  nsf_count_90d?: number;
  had_bankruptcy_within_lookback?: boolean;
}

export interface DecisionRule {
  rule: string;
  passed: boolean;
  detail?: string;
}

export interface DecisionResult {
  recommendation: DecisionRecommendation;
  reasons: string[];
  rules: DecisionRule[];
  /** True if any of the input signals were missing. Surface in UI. */
  missing_signals: string[];
}

export function evaluateDecision(
  signals: DecisionSignals,
  strategy: DecisionStrategy,
): DecisionResult {
  const missing_signals: string[] = [];
  if (signals.bureau_score == null) missing_signals.push("bureau_score");
  if (signals.ability_to_pay_score == null)
    missing_signals.push("ability_to_pay_score");
  if (signals.nsf_count_90d == null) missing_signals.push("nsf_count_90d");
  if (signals.had_bankruptcy_within_lookback == null)
    missing_signals.push("had_bankruptcy_within_lookback");

  const rules: DecisionRule[] = [];
  const reasons: string[] = [];

  // 1. NSF count hard fail
  if (signals.nsf_count_90d != null) {
    const passed = signals.nsf_count_90d <= strategy.max_nsf_count_90d;
    rules.push({
      rule: "nsf_count_90d_within_limit",
      passed,
      detail: `${signals.nsf_count_90d} NSF in 90d (limit ${strategy.max_nsf_count_90d})`,
    });
    if (!passed) {
      reasons.push(
        `NSF count (${signals.nsf_count_90d}) exceeds 90-day limit (${strategy.max_nsf_count_90d})`,
      );
      return finalize("AUTO_DECLINE", reasons, rules, missing_signals);
    }
  }

  // 2. Bankruptcy hard fail
  if (signals.had_bankruptcy_within_lookback != null) {
    const passed = !signals.had_bankruptcy_within_lookback;
    rules.push({
      rule: "no_recent_bankruptcy",
      passed,
      detail: passed
        ? "no bankruptcy within lookback"
        : `bankruptcy within ${strategy.bankruptcy_lookback_months}mo lookback`,
    });
    if (!passed) {
      reasons.push(
        `Bankruptcy within ${strategy.bankruptcy_lookback_months}-month lookback`,
      );
      return finalize("AUTO_DECLINE", reasons, rules, missing_signals);
    }
  }

  // 3. Bureau score hard fail
  if (signals.bureau_score != null) {
    const passed =
      signals.bureau_score >= strategy.bureau_score_auto_decline_below;
    rules.push({
      rule: "bureau_score_above_decline_floor",
      passed,
      detail: `bureau ${signals.bureau_score} vs floor ${strategy.bureau_score_auto_decline_below}`,
    });
    if (!passed) {
      reasons.push(
        `Bureau score (${signals.bureau_score}) below decline floor (${strategy.bureau_score_auto_decline_below})`,
      );
      return finalize("AUTO_DECLINE", reasons, rules, missing_signals);
    }
  }

  // 4. Amount over auto-approve cap → MANUAL_REVIEW
  const amountWithinAutoCap =
    signals.amount_cad <= strategy.auto_approve_max_amount_cad;
  rules.push({
    rule: "amount_within_auto_approve_cap",
    passed: amountWithinAutoCap,
    detail: `amount $${signals.amount_cad} vs cap $${strategy.auto_approve_max_amount_cad}`,
  });
  if (!amountWithinAutoCap) {
    reasons.push(
      `Amount ($${signals.amount_cad.toLocaleString("en-CA")}) exceeds auto-approve cap ($${strategy.auto_approve_max_amount_cad.toLocaleString("en-CA")})`,
    );
    return finalize("MANUAL_REVIEW", reasons, rules, missing_signals);
  }

  // 5. AUTO_APPROVE candidate — bureau strong AND ability to pay strong
  const bureauStrong =
    signals.bureau_score != null &&
    signals.bureau_score >= strategy.bureau_score_auto_approve_at_or_above;
  const abilityStrong =
    signals.ability_to_pay_score != null &&
    signals.ability_to_pay_score >= strategy.ability_to_pay_score_min;
  rules.push({
    rule: "bureau_score_above_auto_approve_floor",
    passed: bureauStrong,
    detail:
      signals.bureau_score != null
        ? `bureau ${signals.bureau_score} vs floor ${strategy.bureau_score_auto_approve_at_or_above}`
        : "bureau score not available",
  });
  rules.push({
    rule: "ability_to_pay_above_floor",
    passed: abilityStrong,
    detail:
      signals.ability_to_pay_score != null
        ? `ability ${signals.ability_to_pay_score} vs floor ${strategy.ability_to_pay_score_min}`
        : "ability score not available",
  });

  if (bureauStrong && abilityStrong) {
    reasons.push(
      `Bureau ${signals.bureau_score} ≥ ${strategy.bureau_score_auto_approve_at_or_above} and ability-to-pay ${signals.ability_to_pay_score} ≥ ${strategy.ability_to_pay_score_min}`,
    );
    return finalize("AUTO_APPROVE", reasons, rules, missing_signals);
  }

  // 6. Default → MANUAL_REVIEW
  reasons.push("Strategy thresholds not met for auto-approve; manual review");
  return finalize("MANUAL_REVIEW", reasons, rules, missing_signals);
}

function finalize(
  recommendation: DecisionRecommendation,
  reasons: string[],
  rules: DecisionRule[],
  missing_signals: string[],
): DecisionResult {
  return { recommendation, reasons, rules, missing_signals };
}
