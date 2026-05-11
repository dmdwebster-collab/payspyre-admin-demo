import { describe, expect, it } from "vitest";
import { runMigration } from "./turnkey-import";
import { sampleTurnKeyExport } from "./sample-export";
import { toMigrationRun } from "./to-migration-run";
import { MigrationRunSchema } from "../types/migration-run";

describe("toMigrationRun", () => {
  const result = runMigration(sampleTurnKeyExport, {
    schedule_strategy: "auto",
    tolerance_cad: 0.01,
    issues_cap: 20,
    ran_at: "2026-05-10T00:00:00.000Z",
  });

  it("produces a row that satisfies MigrationRunSchema", () => {
    const run = toMigrationRun({
      result,
      options: {
        schedule_strategy: "auto",
        tolerance_cad: 0.01,
        issues_cap: 20,
      },
      ran_by: "Demo Operator",
      source_export_label: "sample-export.ts",
      id: "run-test-001",
    });
    MigrationRunSchema.parse(run);
    expect(run.id).toBe("run-test-001");
    expect(run.ran_at).toBe("2026-05-10T00:00:00.000Z");
    expect(run.ran_by).toBe("Demo Operator");
  });

  it("preserves the reconciliation snapshot fields needed by the history view", () => {
    const run = toMigrationRun({
      result,
      options: {
        schedule_strategy: "auto",
        tolerance_cad: 0.01,
        issues_cap: 20,
      },
      ran_by: "X",
      source_export_label: "sample",
      id: "run-test-002",
    });
    expect(run.reconciliation.ok).toBe(result.reconciliation.ok);
    expect(run.reconciliation.per_entity.loan.imported).toBe(
      result.reconciliation.per_entity.loan.imported,
    );
    expect(run.reconciliation.money_totals.total_principal_advanced.delta).toBe(
      result.reconciliation.money_totals.total_principal_advanced.delta,
    );
    expect(run.errors_count).toBe(result.errors.length);
  });
});
