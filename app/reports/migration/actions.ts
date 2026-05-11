"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { repository } from "@/lib/data/repository";
import { runMigration } from "@/lib/migration/turnkey-import";
import { sampleTurnKeyExport } from "@/lib/migration/sample-export";
import { toMigrationRun } from "@/lib/migration/to-migration-run";

const DEMO_OPERATOR = "Demo Operator";
const DEMO_OPTIONS = {
  schedule_strategy: "auto" as const,
  tolerance_cad: 0.01,
  issues_cap: 20,
};

function newRunId(): string {
  return `run-${Date.now().toString(36)}`;
}

/**
 * Server Action — execute runMigration() against the sample export and
 * persist the result as a MigrationRun row, then redirect to the new
 * run's detail page.
 *
 * Production replaces the sample-export call with a real export ingest
 * (file upload / API pull) and the in-memory mutator with a Supabase
 * upsert. The Server Action shape stays the same.
 */
export async function runMigrationNowAction(): Promise<void> {
  const id = newRunId();
  const result = runMigration(sampleTurnKeyExport, {
    ...DEMO_OPTIONS,
    ran_at: new Date().toISOString(),
  });
  const run = toMigrationRun({
    result,
    options: DEMO_OPTIONS,
    ran_by: DEMO_OPERATOR,
    source_export_label: "sample-export.ts",
    id,
  });
  await repository.addMigrationRun(run);

  revalidatePath("/reports/migration");
  revalidatePath("/reports/migration/runs");
  redirect(`/reports/migration/runs/${id}`);
}
