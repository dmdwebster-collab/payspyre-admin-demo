import Link from "next/link";
import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCAD } from "@/lib/utils";
import { runMigrationNowAction } from "../actions";

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Migration run history (PR #4.6.1).
 *
 * Lists every persisted MigrationRun (newest first), with a "Run
 * migration now" Server Action button that creates a new run. Each row
 * links to the detail page that re-renders the full ReconciliationReport
 * snapshot stored on the row.
 *
 * Persistence is in-memory across the Node process lifetime. Production
 * reads from / writes to Supabase via the same accessors.
 */
export default async function MigrationRunsHistoryPage() {
  const runs = await repository.listMigrationRuns();

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <Link
          href="/reports/migration"
          className="text-[11px] text-ink-mute tracking-wider uppercase hover:text-gold-dim"
        >
          ← Back to migration viewer
        </Link>
        <div className="mt-2 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-ink">
              Migration run history
            </h1>
            <p className="text-ink-dim text-sm mt-1 max-w-3xl">
              Persisted history of every <code>runMigration()</code>{" "}
              execution against the TurnKey export. Each row stores the
              full reconciliation snapshot so historical runs can be
              re-displayed without re-execution.
            </p>
          </div>
          <form action={runMigrationNowAction}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Run migration now
            </button>
          </form>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Runs ({runs.length})</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Newest first. Click a row to view the full reconciliation
            report for that run.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No migration runs yet. Click <em>Run migration now</em> to
              create the first one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Run id</th>
                  <th className="px-4 py-2 font-medium">Ran at</th>
                  <th className="px-4 py-2 font-medium">Operator</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Strategy</th>
                  <th className="px-4 py-2 font-medium">OK</th>
                  <th className="px-4 py-2 font-medium text-right">Loans imp</th>
                  <th className="px-4 py-2 font-medium text-right">
                    Principal Δ
                  </th>
                  <th className="px-4 py-2 font-medium text-right">Errors</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link
                        href={`/reports/migration/runs/${run.id}`}
                        className="text-foreground hover:underline"
                      >
                        {run.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {fmtDateTime(run.ran_at)}
                    </td>
                    <td className="px-4 py-2 text-xs">{run.ran_by}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {run.source_export_label}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">
                      {run.options.schedule_strategy}
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        variant={run.reconciliation.ok ? "active" : "writeoff"}
                      >
                        {run.reconciliation.ok ? "OK" : "REVIEW"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {run.reconciliation.per_entity.loan?.imported ?? 0}
                    </td>
                    <td
                      className={
                        "px-4 py-2 text-right font-mono text-xs " +
                        (Math.abs(
                          run.reconciliation.money_totals
                            .total_principal_advanced.delta,
                        ) > run.reconciliation.tolerance_cad
                          ? "text-amber-600 font-semibold"
                          : "")
                      }
                    >
                      {formatCAD(
                        run.reconciliation.money_totals
                          .total_principal_advanced.delta,
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {run.errors_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
