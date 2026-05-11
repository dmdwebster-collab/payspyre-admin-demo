import { z } from "zod";

/**
 * MigrationRun — persisted record of one execution of `runMigration()`.
 *
 * Stores the operator + a snapshot of the ReconciliationReport so the
 * historical run can be re-displayed without re-executing the migration.
 * Imported counts are denormalized off the report for table display.
 *
 * Production stores these in a `migration_runs` table; the dual-run
 * dashboards in PR #4.6.x query across these rows. The mock fixture
 * starts empty (or with one seed) and grows via the "Run migration now"
 * Server Action in PR #4.6.1.
 */

export const MigrationRunSchema = z.object({
  id: z.string(),
  ran_at: z.string().datetime(),
  ran_by: z.string(),
  source_export_label: z.string(),
  options: z.object({
    schedule_strategy: z.enum(["use_export", "regenerate", "auto"]),
    tolerance_cad: z.number().nonnegative(),
    issues_cap: z.number().int().positive(),
  }),
  // Snapshot of ReconciliationReport — kept loose since the shape lives
  // in lib/migration/types.ts and we want the migration-run row to
  // tolerate small report-shape changes without a fixture rewrite.
  reconciliation: z.object({
    generated_at: z.string().datetime(),
    ok: z.boolean(),
    tolerance_cad: z.number().nonnegative(),
    per_entity: z.record(
      z.object({
        exported: z.number().int().nonnegative(),
        imported: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
        failure_rate: z.number().nonnegative(),
      }),
    ),
    money_totals: z.object({
      total_principal_advanced: z.object({
        source: z.number(),
        imported: z.number(),
        delta: z.number(),
      }),
      total_payments_received: z.object({
        source: z.number(),
        imported: z.number(),
        delta: z.number(),
      }),
      total_outstanding_principal: z.object({
        source: z.number(),
        imported: z.number(),
        delta: z.number(),
      }),
    }),
    issues: z.array(z.string()),
  }),
  errors_count: z.number().int().nonnegative(),
});
export type MigrationRun = z.infer<typeof MigrationRunSchema>;
