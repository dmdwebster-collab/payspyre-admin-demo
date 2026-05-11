/**
 * Adapter that converts a MigrationResult (from runMigration()) into a
 * persistable MigrationRun row. Pure helper; the Server Action wraps
 * this with id generation, repository.addMigrationRun(), and revalidate.
 */

import type { MigrationResult, RunOptions } from "./types";
import type { MigrationRun } from "../types/migration-run";

export interface ToMigrationRunInput {
  result: MigrationResult;
  options: Required<Pick<RunOptions, "schedule_strategy" | "tolerance_cad" | "issues_cap">>;
  ran_by: string;
  source_export_label: string;
  /** Caller-supplied id for the new run (timestamp-based for the demo). */
  id: string;
}

export function toMigrationRun(input: ToMigrationRunInput): MigrationRun {
  const r = input.result.reconciliation;
  return {
    id: input.id,
    ran_at: input.result.ran_at,
    ran_by: input.ran_by,
    source_export_label: input.source_export_label,
    options: input.options,
    reconciliation: {
      generated_at: r.generated_at,
      ok: r.ok,
      tolerance_cad: r.tolerance_cad,
      per_entity: r.per_entity,
      money_totals: r.money_totals,
      issues: r.issues,
    },
    errors_count: input.result.errors.length,
  };
}
