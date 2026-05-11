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
import { diffMigrationRuns } from "@/lib/migration/diff";

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>;
}

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
 * Migration run-vs-run diff (PR #4.6.2).
 *
 * URL params `?from=<runId>&to=<runId>` pick the two runs to compare.
 * Defaults: from = second-newest run, to = newest run. The diff
 * surfaces per-entity import deltas, money-total improvement, and
 * issues classified as resolved / new / ongoing.
 *
 * Used during the dual-run period to verify each migration iteration
 * is converging on a clean reconciliation.
 */
export default async function MigrationRunDiffPage({ searchParams }: Props) {
  const { from, to } = await searchParams;
  const runs = await repository.listMigrationRuns(); // newest first
  if (runs.length < 2) {
    return (
      <div className="p-6 max-w-[1100px] mx-auto space-y-6">
        <header>
          <Link
            href="/reports/migration/runs"
            className="text-[11px] text-ink-mute tracking-wider uppercase hover:text-gold-dim"
          >
            ← Back to run history
          </Link>
          <h1 className="text-2xl font-semibold text-ink mt-2">
            Migration run · diff
          </h1>
        </header>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Need at least two migration runs to compare. Trigger a few via{" "}
            <em>Run migration now</em> on{" "}
            <Link
              href="/reports/migration"
              className="text-foreground hover:underline"
            >
              /reports/migration
            </Link>
            .
          </CardContent>
        </Card>
      </div>
    );
  }

  const currRun =
    (to ? runs.find((r) => r.id === to) : undefined) ?? runs[0];
  const prevRun =
    (from ? runs.find((r) => r.id === from) : undefined) ??
    runs.find((r) => r.id !== currRun.id) ??
    runs[1];
  const diff = diffMigrationRuns(prevRun, currRun);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <Link
          href="/reports/migration/runs"
          className="text-[11px] text-ink-mute tracking-wider uppercase hover:text-gold-dim"
        >
          ← Back to run history
        </Link>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">
            Migration run · diff
          </h1>
          {diff.newly_ok && <Badge variant="paid">NEWLY OK</Badge>}
          {diff.newly_review && <Badge variant="writeoff">NEWLY REVIEW</Badge>}
        </div>
        <p className="text-ink-dim text-sm mt-2">
          Comparing{" "}
          <span className="font-mono text-gold">{prevRun.id}</span> (
          {fmtDateTime(prevRun.ran_at)}) → {" "}
          <span className="font-mono text-gold">{currRun.id}</span> (
          {fmtDateTime(currRun.ran_at)}).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Per-entity changes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Entity</th>
                <th className="px-4 py-2 font-medium text-right">Prev imp</th>
                <th className="px-4 py-2 font-medium text-right">Curr imp</th>
                <th className="px-4 py-2 font-medium text-right">Δ imp</th>
                <th className="px-4 py-2 font-medium text-right">Prev failed</th>
                <th className="px-4 py-2 font-medium text-right">Curr failed</th>
                <th className="px-4 py-2 font-medium text-right">Δ failed</th>
              </tr>
            </thead>
            <tbody>
              {diff.per_entity.map((d) => (
                <tr key={d.entity} className="border-b last:border-b-0">
                  <td className="px-4 py-2 capitalize">{d.entity}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {d.prev_imported}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {d.curr_imported}
                  </td>
                  <td
                    className={
                      "px-4 py-2 text-right font-mono " +
                      (d.imported_delta > 0
                        ? "text-emerald-700 font-semibold"
                        : d.imported_delta < 0
                        ? "text-amber-700 font-semibold"
                        : "")
                    }
                  >
                    {d.imported_delta > 0 ? "+" : ""}
                    {d.imported_delta}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                    {d.prev_failed}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                    {d.curr_failed}
                  </td>
                  <td
                    className={
                      "px-4 py-2 text-right font-mono " +
                      (d.failed_delta < 0
                        ? "text-emerald-700 font-semibold"
                        : d.failed_delta > 0
                        ? "text-amber-700 font-semibold"
                        : "")
                    }
                  >
                    {d.failed_delta > 0 ? "+" : ""}
                    {d.failed_delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Money totals — convergence</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            <em>Improvement</em> is{" "}
            <code className="font-mono">|prev_delta| - |curr_delta|</code> —
            positive means the migration is converging on the source totals.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium text-right">Prev Δ</th>
                <th className="px-4 py-2 font-medium text-right">Curr Δ</th>
                <th className="px-4 py-2 font-medium text-right">Improvement</th>
              </tr>
            </thead>
            <tbody>
              {diff.money_totals.map((m) => (
                <tr key={m.label} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{m.label}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                    {formatCAD(m.prev_delta)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatCAD(m.curr_delta)}
                  </td>
                  <td
                    className={
                      "px-4 py-2 text-right font-mono " +
                      (m.improvement > 0
                        ? "text-emerald-700 font-semibold"
                        : m.improvement < 0
                        ? "text-amber-700 font-semibold"
                        : "")
                    }
                  >
                    {m.improvement > 0 ? "+" : ""}
                    {formatCAD(m.improvement)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-emerald-700">
              Resolved ({diff.issues.resolved.length})
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Issues in prev that are gone in curr.
            </p>
          </CardHeader>
          <CardContent>
            {diff.issues.resolved.length === 0 ? (
              <div className="text-sm text-muted-foreground">—</div>
            ) : (
              <ul className="space-y-1 text-xs font-mono">
                {diff.issues.resolved.map((i, k) => (
                  <li key={k}>{i}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-700">
              New ({diff.issues.new_.length})
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Issues in curr not in prev.
            </p>
          </CardHeader>
          <CardContent>
            {diff.issues.new_.length === 0 ? (
              <div className="text-sm text-muted-foreground">—</div>
            ) : (
              <ul className="space-y-1 text-xs font-mono">
                {diff.issues.new_.map((i, k) => (
                  <li key={k}>{i}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ongoing ({diff.issues.ongoing.length})</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Issues present in both. Need engineering attention.
            </p>
          </CardHeader>
          <CardContent>
            {diff.issues.ongoing.length === 0 ? (
              <div className="text-sm text-muted-foreground">—</div>
            ) : (
              <ul className="space-y-1 text-xs font-mono">
                {diff.issues.ongoing.map((i, k) => (
                  <li key={k}>{i}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
