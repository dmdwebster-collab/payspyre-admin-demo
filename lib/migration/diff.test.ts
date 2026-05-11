import { describe, expect, it } from "vitest";
import { diffMigrationRuns } from "./diff";
import type { MigrationRun } from "../types/migration-run";

function makeRun(over: Partial<MigrationRun> & { overrides?: { perEntity?: any; moneyDeltas?: any; issues?: string[]; ok?: boolean } } = {}): MigrationRun {
  const overrides = over.overrides ?? {};
  return {
    id: "run-base",
    ran_at: "2026-05-08T00:00:00.000Z",
    ran_by: "Op",
    source_export_label: "sample",
    options: {
      schedule_strategy: "auto",
      tolerance_cad: 0.01,
      issues_cap: 20,
    },
    reconciliation: {
      generated_at: "2026-05-08T00:00:00.000Z",
      ok: overrides.ok ?? true,
      tolerance_cad: 0.01,
      per_entity: overrides.perEntity ?? {
        borrower: { exported: 3, imported: 3, failed: 0, failure_rate: 0 },
        application: { exported: 2, imported: 2, failed: 0, failure_rate: 0 },
        loan: { exported: 3, imported: 3, failed: 0, failure_rate: 0 },
        schedule: { exported: 1, imported: 1, failed: 0, failure_rate: 0 },
        transaction: { exported: 4, imported: 4, failed: 0, failure_rate: 0 },
        document: { exported: 2, imported: 2, failed: 0, failure_rate: 0 },
      },
      money_totals: {
        total_principal_advanced: { source: 17800, imported: 17800, delta: overrides.moneyDeltas?.principal ?? 0 },
        total_payments_received: { source: 1750, imported: 1750, delta: overrides.moneyDeltas?.payments ?? 0 },
        total_outstanding_principal: { source: 16200, imported: 16200, delta: overrides.moneyDeltas?.outstanding ?? 0 },
      },
      issues: overrides.issues ?? [],
    },
    errors_count: 0,
    ...over,
  };
}

describe("diffMigrationRuns — per-entity", () => {
  it("computes imported_delta and failed_delta per entity", () => {
    const prev = makeRun({
      id: "prev",
      overrides: {
        perEntity: {
          borrower: { exported: 3, imported: 2, failed: 1, failure_rate: 0.33 },
          application: { exported: 2, imported: 2, failed: 0, failure_rate: 0 },
          loan: { exported: 3, imported: 2, failed: 1, failure_rate: 0.33 },
          schedule: { exported: 1, imported: 1, failed: 0, failure_rate: 0 },
          transaction: { exported: 4, imported: 4, failed: 0, failure_rate: 0 },
          document: { exported: 2, imported: 2, failed: 0, failure_rate: 0 },
        },
      },
    });
    const curr = makeRun({ id: "curr" }); // all clean
    const d = diffMigrationRuns(prev, curr);
    const borrower = d.per_entity.find((e) => e.entity === "borrower")!;
    expect(borrower.imported_delta).toBe(1);
    expect(borrower.failed_delta).toBe(-1);
    const loan = d.per_entity.find((e) => e.entity === "loan")!;
    expect(loan.imported_delta).toBe(1);
    expect(loan.failed_delta).toBe(-1);
  });
});

describe("diffMigrationRuns — money totals improvement", () => {
  it("positive improvement when curr is closer to zero than prev", () => {
    const prev = makeRun({ id: "prev", overrides: { moneyDeltas: { principal: -800 } } });
    const curr = makeRun({ id: "curr", overrides: { moneyDeltas: { principal: -200 } } });
    const d = diffMigrationRuns(prev, curr);
    const principal = d.money_totals.find((m) => m.label === "Principal advanced")!;
    expect(principal.prev_delta).toBe(-800);
    expect(principal.curr_delta).toBe(-200);
    expect(principal.improvement).toBe(600); // |prev| - |curr| = 800 - 200
  });

  it("negative improvement when curr drifted further from source", () => {
    const prev = makeRun({ id: "prev", overrides: { moneyDeltas: { principal: -100 } } });
    const curr = makeRun({ id: "curr", overrides: { moneyDeltas: { principal: -500 } } });
    const d = diffMigrationRuns(prev, curr);
    expect(d.money_totals[0].improvement).toBe(-400);
  });

  it("zero improvement when deltas are unchanged", () => {
    const prev = makeRun({ id: "prev", overrides: { moneyDeltas: { principal: -100 } } });
    const curr = makeRun({ id: "curr", overrides: { moneyDeltas: { principal: -100 } } });
    const d = diffMigrationRuns(prev, curr);
    expect(d.money_totals[0].improvement).toBe(0);
  });
});

describe("diffMigrationRuns — issues", () => {
  it("classifies issues as resolved / new / ongoing", () => {
    const prev = makeRun({
      id: "prev",
      overrides: {
        issues: ["A", "B", "C"],
      },
    });
    const curr = makeRun({
      id: "curr",
      overrides: {
        issues: ["B", "C", "D"],
      },
    });
    const d = diffMigrationRuns(prev, curr);
    expect(d.issues.resolved).toEqual(["A"]);
    expect(d.issues.new_).toEqual(["D"]);
    expect(d.issues.ongoing.sort()).toEqual(["B", "C"]);
  });
});

describe("diffMigrationRuns — ok flips", () => {
  it("newly_ok = true when prev was REVIEW and curr is OK", () => {
    const prev = makeRun({ id: "prev", overrides: { ok: false } });
    const curr = makeRun({ id: "curr", overrides: { ok: true } });
    const d = diffMigrationRuns(prev, curr);
    expect(d.newly_ok).toBe(true);
    expect(d.newly_review).toBe(false);
  });

  it("newly_review = true when prev was OK and curr is REVIEW", () => {
    const prev = makeRun({ id: "prev", overrides: { ok: true } });
    const curr = makeRun({ id: "curr", overrides: { ok: false } });
    const d = diffMigrationRuns(prev, curr);
    expect(d.newly_review).toBe(true);
    expect(d.newly_ok).toBe(false);
  });

  it("both false when status unchanged", () => {
    const prev = makeRun({ id: "prev", overrides: { ok: true } });
    const curr = makeRun({ id: "curr", overrides: { ok: true } });
    const d = diffMigrationRuns(prev, curr);
    expect(d.newly_ok).toBe(false);
    expect(d.newly_review).toBe(false);
  });
});
