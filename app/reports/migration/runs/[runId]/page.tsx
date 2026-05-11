import Link from "next/link";
import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCAD } from "@/lib/utils";

interface Props {
  params: Promise<{ runId: string }>;
}

const ENTITY_ORDER = [
  "borrower",
  "application",
  "loan",
  "schedule",
  "transaction",
  "document",
] as const;

const ENTITY_LABEL: Record<(typeof ENTITY_ORDER)[number], string> = {
  borrower: "Borrowers",
  application: "Applications",
  loan: "Loans",
  schedule: "Schedules",
  transaction: "Transactions",
  document: "Documents",
};

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
 * Detail view of a single persisted MigrationRun (PR #4.6.1).
 *
 * Re-renders the stored reconciliation snapshot — the run is immutable
 * once persisted, so this view is identical to what the operator saw
 * at execution time. The dual-run period uses these stable URLs as the
 * regulatory artifact.
 */
export default async function MigrationRunDetailPage({ params }: Props) {
  const { runId } = await params;
  const run = await repository.getMigrationRun(runId);
  if (!run) notFound();

  const r = run.reconciliation;

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
            Migration run{" "}
            <span className="font-mono text-gold text-base">{run.id}</span>
          </h1>
          <Badge variant={r.ok ? "active" : "writeoff"}>
            {r.ok ? "OK" : "REVIEW"}
          </Badge>
        </div>
        <p className="text-ink-dim text-sm mt-2">
          Ran {fmtDateTime(run.ran_at)} by{" "}
          <span className="font-mono">{run.ran_by}</span> against{" "}
          <code className="font-mono">{run.source_export_label}</code> with
          strategy <code className="font-mono">{run.options.schedule_strategy}</code>{" "}
          and tolerance {formatCAD(run.options.tolerance_cad)}.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Per-entity counts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Entity</th>
                <th className="px-4 py-2 font-medium text-right">Exported</th>
                <th className="px-4 py-2 font-medium text-right">Imported</th>
                <th className="px-4 py-2 font-medium text-right">Failed</th>
                <th className="px-4 py-2 font-medium text-right">Failure rate</th>
              </tr>
            </thead>
            <tbody>
              {ENTITY_ORDER.map((kind) => {
                const c = r.per_entity[kind] ?? {
                  exported: 0,
                  imported: 0,
                  failed: 0,
                  failure_rate: 0,
                };
                return (
                  <tr key={kind} className="border-b last:border-b-0">
                    <td className="px-4 py-2">{ENTITY_LABEL[kind]}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {c.exported}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {c.imported}
                    </td>
                    <td
                      className={
                        "px-4 py-2 text-right font-mono " +
                        (c.failed > 0 ? "text-amber-600 font-semibold" : "")
                      }
                    >
                      {c.failed}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {(c.failure_rate * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Money totals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium text-right">Source</th>
                <th className="px-4 py-2 font-medium text-right">Imported</th>
                <th className="px-4 py-2 font-medium text-right">Delta</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Principal advanced", r.money_totals.total_principal_advanced],
                  ["Payments received", r.money_totals.total_payments_received],
                  [
                    "Outstanding principal",
                    r.money_totals.total_outstanding_principal,
                  ],
                ] as const
              ).map(([label, m]) => (
                <tr key={label} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{label}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatCAD(m.source)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatCAD(m.imported)}
                  </td>
                  <td
                    className={
                      "px-4 py-2 text-right font-mono " +
                      (Math.abs(m.delta) > r.tolerance_cad
                        ? "text-amber-600 font-semibold"
                        : "")
                    }
                  >
                    {m.delta >= 0 ? "+" : ""}
                    {formatCAD(m.delta)}
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={
                        Math.abs(m.delta) <= r.tolerance_cad
                          ? "active"
                          : "writeoff"
                      }
                    >
                      {Math.abs(m.delta) <= r.tolerance_cad
                        ? "WITHIN"
                        : "EXCEEDS"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issues ({r.issues.length})</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Total adapter errors at run time:{" "}
            <span className="font-mono">{run.errors_count}</span>.
          </p>
        </CardHeader>
        <CardContent>
          {r.issues.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No issues — the migration reconciled cleanly.
            </div>
          ) : (
            <ul className="space-y-2">
              {r.issues.map((issue, i) => (
                <li
                  key={i}
                  className="rounded-md border border-line bg-background px-3 py-2 text-xs font-mono text-foreground"
                >
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
