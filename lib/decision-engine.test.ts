import { describe, expect, it } from "vitest";
import { evaluateDecision } from "./decision-engine";
import type { DecisionStrategy } from "./types/decision-strategy";

const STRATEGY: DecisionStrategy = {
  id: "strat-test",
  name: "Test",
  active: true,
  description: "Test thresholds",
  bureau_score_auto_decline_below: 580,
  bureau_score_auto_approve_at_or_above: 720,
  auto_approve_max_amount_cad: 15000,
  ability_to_pay_score_min: 65,
  max_nsf_count_90d: 1,
  bankruptcy_lookback_months: 84,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("evaluateDecision — hard fails", () => {
  it("AUTO_DECLINE when nsf_count_90d > limit", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 740,
        ability_to_pay_score: 80,
        nsf_count_90d: 3,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("AUTO_DECLINE");
    expect(r.reasons[0]).toMatch(/NSF count \(3\)/);
  });

  it("AUTO_DECLINE on recent bankruptcy", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 740,
        ability_to_pay_score: 80,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: true,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("AUTO_DECLINE");
    expect(r.reasons[0]).toMatch(/Bankruptcy/);
  });

  it("AUTO_DECLINE when bureau below decline floor", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 540,
        ability_to_pay_score: 80,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("AUTO_DECLINE");
    expect(r.reasons[0]).toMatch(/Bureau score \(540\)/);
  });

  it("hard fails fire in priority order — NSF before bankruptcy before bureau", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 540,
        ability_to_pay_score: 80,
        nsf_count_90d: 5,
        had_bankruptcy_within_lookback: true,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("AUTO_DECLINE");
    expect(r.reasons[0]).toMatch(/NSF count/);
  });
});

describe("evaluateDecision — auto-approve cap", () => {
  it("MANUAL_REVIEW when amount exceeds auto-approve cap (even if everything else is strong)", () => {
    const r = evaluateDecision(
      {
        amount_cad: 25000,
        bureau_score: 760,
        ability_to_pay_score: 90,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("MANUAL_REVIEW");
    expect(r.reasons[0]).toMatch(/exceeds auto-approve cap/);
  });
});

describe("evaluateDecision — auto approve", () => {
  it("AUTO_APPROVE when bureau ≥ approve floor AND ability ≥ floor", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 740,
        ability_to_pay_score: 80,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("AUTO_APPROVE");
  });

  it("MANUAL_REVIEW when bureau strong but ability below floor", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 740,
        ability_to_pay_score: 50,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("MANUAL_REVIEW");
  });

  it("MANUAL_REVIEW when ability strong but bureau in middle band (not auto-decline, not auto-approve)", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 650,
        ability_to_pay_score: 80,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("MANUAL_REVIEW");
  });
});

describe("evaluateDecision — boundary values", () => {
  it("bureau exactly at decline floor → not declined (>=)", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 580,
        ability_to_pay_score: 80,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("MANUAL_REVIEW");
  });

  it("bureau exactly at auto-approve floor + ability at floor → AUTO_APPROVE", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 720,
        ability_to_pay_score: 65,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("AUTO_APPROVE");
  });

  it("nsf exactly at limit → not declined", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 740,
        ability_to_pay_score: 80,
        nsf_count_90d: 1, // limit is 1
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("AUTO_APPROVE");
  });

  it("amount exactly at cap → still auto-approve eligible", () => {
    const r = evaluateDecision(
      {
        amount_cad: 15000,
        bureau_score: 740,
        ability_to_pay_score: 80,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("AUTO_APPROVE");
  });
});

describe("evaluateDecision — missing signals", () => {
  it("MANUAL_REVIEW + lists missing signals when bureau is absent", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        ability_to_pay_score: 80,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.recommendation).toBe("MANUAL_REVIEW");
    expect(r.missing_signals).toContain("bureau_score");
  });

  it("lists every missing signal when none are provided", () => {
    const r = evaluateDecision({ amount_cad: 5000 }, STRATEGY);
    expect(r.recommendation).toBe("MANUAL_REVIEW");
    expect(r.missing_signals.sort()).toEqual([
      "ability_to_pay_score",
      "bureau_score",
      "had_bankruptcy_within_lookback",
      "nsf_count_90d",
    ]);
  });
});

describe("evaluateDecision — rule trace", () => {
  it("includes a passed flag + detail per evaluated rule", () => {
    const r = evaluateDecision(
      {
        amount_cad: 5000,
        bureau_score: 740,
        ability_to_pay_score: 80,
        nsf_count_90d: 0,
        had_bankruptcy_within_lookback: false,
      },
      STRATEGY,
    );
    expect(r.rules.length).toBeGreaterThanOrEqual(5);
    for (const rule of r.rules) {
      expect(typeof rule.passed).toBe("boolean");
      expect(typeof rule.rule).toBe("string");
    }
  });
});
