import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StubBanner } from "@/components/ui/stub-banner";
import { formatCAD } from "@/lib/utils";
import { runMigration } from "@/lib/migration/turnkey-import";
import { sampleTurnKeyExport } from "@/lib/migration/sample-export";
import type { EntityKind } from "@/lib/migration/types";
import { runMigrationNowAction } from "./actions";

const ENTITY_LABEL: Record<EntityKind, string> = {
  borrower: "Borrowers",
  application: "Applications",
  loan: "Loans",
  schedule: "Schedules",
  transaction: "Transactions",
  document: "Documents",
};

const ENTITY_ORDER: EntityKind[] = [
  "borrower",
  "application",
  "loan",
  "schedule",
  "transaction",
  "document",
];

function moneyDeltaTone(delta: number, tolerance: number) {
  if (Math.abs(delta) <= tolerance) return "active" as const;
  return "writeoff" as const;
}

/**
 * Migration reconciliation viewer (PR #4.6).
 *
 * Runs the TurnKey migration runner against a sample export and renders
 * the resulting MigrationResult + ReconciliationReport. Demonstrates
 * end-to-end the cutover deliverable from PR #4.2 — operators can see
 * the per-entity import counts, money totals (source vs imported), and
 * the structured error list.
 *
 * In production this page reads from a stored ReconciliationReport row
 * (one per migration run), not by re-running the migration on each page
 * load. For the demo, re-running on each request keeps the bytes small
 * and the wiring honest.
 */
export default async function MigrationReportPage() {
  const result = runMigration(sampleTurnKeyExport, {
    schedule_strategy: "auto",
    tolerance_cad: 0.01,
    ran_at: "2026-05-10T00:00:00.000Z",
  });
  const { reconciliation: r, errors, imported } = result;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <Link
          href="/reports"
          className="text-[11px] text-ink-mute tracking-wider uppercase hover:text-gold-dim"
        >
          ← Back to Reports
        </Link>
        <div className="mt-2 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink">
                TurnKey migration · reconciliation
              </h1>
              <Badge variant={r.ok ? "active" : "writeoff"}>
                {r.ok ? "OK" : "REVIEW"}
              </Badge>
            </div>
            <p className="text-ink-dim text-sm mt-2 max-w-3xl">
              Live re-run of{" "}
              <code className="font-mono text-gold">runMigration()</code> (PR
              #4.2) against the sample export at{" "}
              <code className="font-mono">lib/migration/sample-export.ts</code>.
              Tolerance: {formatCAD(r.tolerance_cad)} per money total.
              Strategy: auto (use export schedule when present, else
              regenerate).
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/reports/migration/runs"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              View run history
            </Link>
            <form action={runMigrationNowAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Run migration now
              </button>
            </form>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Per-entity counts</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Exported / imported / failed per entity kind. Failure rate
            highlights any adapter that&apos;s silently dropping records.
          </p>
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
                const c = r.per_entity[kind];
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
          <p className="mt-1 text-xs text-muted-foreground">
            Source totals from the TurnKey export vs imported totals from
            the runner. Any delta exceeding the tolerance flips this report
            to <code>REVIEW</code> and is the regulator-facing artifact for
            BC + AB consumer-credit reconciliation.
          </p>
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
                    <Badge variant={moneyDeltaTone(m.delta, r.tolerance_cad)}>
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
            Capped at {r.issues.length === 0 ? "(none)" : "first 20"}.
            Per-entity rollups + money-delta callouts + per-record adapter
            errors. The full unbounded error list is on the
            <code className="font-mono mx-1">result.errors</code> array (
            {errors.length} entries).
          </p>
        </CardHeader>
        <CardContent>
          {r.issues.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No issues — the migration reconciles cleanly.
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

      <Card>
        <CardHeader>
          <CardTitle>Imported records</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Sample of what landed in the PaySpyre side. In production this
            drills into per-entity worklists scoped to the migration run.
          </p>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {ENTITY_ORDER.map((kind) => {
              const count = r.per_entity[kind].imported;
              return (
                <div key={kind}>
                  <dt className="text-xs text-muted-foreground">
                    {ENTITY_LABEL[kind]}
                  </dt>
                  <dd className="text-2xl font-semibold">{count}</dd>
                </div>
              );
            })}
            <div>
              <dt className="text-xs text-muted-foreground">Schedule entries</dt>
              <dd className="text-2xl font-semibold">
                {imported.schedule_entries.length}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.6"
        description="Persist each migration run as a row in `migration_runs` (id, ran_at, ran_by, options, summary stats) so the dual-run period accumulates an audit-able history. Add per-entity drill-downs (click a count to see the imported records for that run), an export-CSV action for the regulator artifact, and a diff view between the two most recent runs."
        fields={[
          "Persist `migration_runs` row per execution",
          "Per-entity drill-down to the imported records",
          "CSV export of the reconciliation report (regulator artifact)",
          "Diff view: latest run vs previous (cure rate per entity)",
          "Operator-triggered re-run with edited RunOptions",
        ]}
      />
    </div>
  );
}
