import Link from "next/link";
import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StubBanner } from "@/components/ui/stub-banner";
import { formatCAD } from "@/lib/utils";
import {
  DPD_BUCKET_ORDER,
  bucketCounts,
  collectionsQueueFromNSF,
  totalNSFFees,
  type DPDBucket,
} from "@/lib/collections";
import { ptpsDueSoon } from "@/lib/ptp-tracker";
import { processPTPsAction } from "./actions";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const BUCKET_TONE: Record<DPDBucket, "active" | "renewed" | "writeoff"> = {
  "0-29": "active",
  "30-59": "renewed",
  "60-89": "renewed",
  "90+": "writeoff",
};

const BUCKET_LABEL: Record<DPDBucket, string> = {
  "0-29": "DPD 0-29",
  "30-59": "DPD 30-59",
  "60-89": "DPD 60-89",
  "90+": "DPD 90+",
};

/**
 * Collections workplace — NSF-event-driven queue.
 *
 * Replaces the PR #3 mock DPD bucket on applications with a real queue
 * computed from `nsf_events`. Each unresolved event becomes a queue
 * item with its DPD (days since the NSF) and bucket label. The queue
 * sorts oldest-first so 90+ events bubble to the top.
 *
 * PR #4.4 ships the read view. The action workflow (retry / PTP capture
 * / resolution) lands as a follow-up — the StubBanner at the bottom
 * lists what's coming.
 */
export default async function CollectionsPage() {
  const [events, allEvents] = await Promise.all([
    repository.listUnresolvedNSFEvents(),
    repository.listAllNSFEvents(),
  ]);
  const queue = collectionsQueueFromNSF(events);
  const counts = bucketCounts(queue);
  const feesOutstanding = totalNSFFees(queue);
  const dueSoon = ptpsDueSoon(allEvents, 7);
  const openPTPCount = allEvents.filter((e) => e.ptp_status === "OPEN").length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
              Workplace
            </div>
            <h1 className="text-2xl font-semibold text-ink mt-1">Collections</h1>
            <p className="text-ink-dim text-sm mt-1 max-w-3xl">
              Unresolved NSF events across the book. Oldest first; each row
              links to the borrower&apos;s NSF tab in Servicing. Action
              workflow lives on the per-event detail page.
            </p>
          </div>
          <form action={processPTPsAction} className="shrink-0">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              title="Walks every OPEN PTP and flips to KEPT (matching payment posted) or BROKEN (due date passed). Production runs this nightly."
            >
              Process PTPs now
            </button>
          </form>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-6">
          <div>
            <CardTitle>Promise-to-pay watch</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {openPTPCount}{" "}
              {openPTPCount === 1 ? "open PTP" : "open PTPs"} on the book ·{" "}
              {dueSoon.length} due in the next 7 days. Click{" "}
              <em>Process PTPs now</em> to flip overdue OPEN ↦ BROKEN and
              kept-on-time OPEN ↦ KEPT.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {dueSoon.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No PTPs due within 7 days.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Event</th>
                  <th className="px-4 py-2 font-medium">Loan</th>
                  <th className="px-4 py-2 font-medium">PTP due</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {dueSoon.map((e) => (
                  <tr key={e.id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link
                        href={`/collections/nsf/${e.id}`}
                        className="text-foreground hover:underline"
                      >
                        {e.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {e.loan_id}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {e.ptp_due_date}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {e.ptp_amount != null ? formatCAD(e.ptp_amount) : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {e.ptp_method ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NSF queue</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {queue.length}{" "}
            {queue.length === 1 ? "unresolved event" : "unresolved events"} ·
            Fees outstanding: {formatCAD(feesOutstanding)}
          </p>
        </CardHeader>
        <CardContent className="border-b">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {DPD_BUCKET_ORDER.map((bucket) => (
              <div key={bucket}>
                <dt className="text-xs text-muted-foreground">
                  {BUCKET_LABEL[bucket]}
                </dt>
                <dd
                  className={
                    "text-lg font-semibold " +
                    (counts[bucket] > 0 && (bucket === "60-89" || bucket === "90+")
                      ? "text-amber-600"
                      : "")
                  }
                >
                  {counts[bucket]}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>

        <CardContent className="p-0">
          {queue.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No unresolved NSF events — Collections queue is clear.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Event</th>
                  <th className="px-4 py-2 font-medium">Loan</th>
                  <th className="px-4 py-2 font-medium">Occurred</th>
                  <th className="px-4 py-2 font-medium">DPD</th>
                  <th className="px-4 py-2 font-medium">Bucket</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium text-right">NSF fee</th>
                  <th className="px-4 py-2 font-medium">Retry</th>
                </tr>
              </thead>
              <tbody>
                {queue.map(({ event, dpd, bucket }) => (
                  <tr key={event.id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link
                        href={`/collections/nsf/${event.id}`}
                        className="text-foreground hover:underline"
                      >
                        {event.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link
                        href={`/servicing/${event.loan_id}/nsf`}
                        className="text-muted-foreground hover:underline hover:text-foreground"
                      >
                        {event.loan_id}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{fmt(event.occurred_at)}</td>
                    <td className="px-4 py-2 font-mono">{dpd}d</td>
                    <td className="px-4 py-2">
                      <Badge variant={BUCKET_TONE[bucket]}>
                        {BUCKET_LABEL[bucket]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs">{event.reason_code}</span>
                      {event.reason_description && (
                        <div className="text-xs text-muted-foreground">
                          {event.reason_description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatCAD(event.nsf_fee_charged)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {event.retry_attempted ? "attempted" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.4"
        description="Per-event action workflow on top of the read view. Each unresolved NSF gets one-click retry (creates a fresh Payment in SCHEDULED), promise-to-pay capture (amount + date + method), and resolution actions (RECOVERED / WRITTEN_OFF / PROMISE_TO_PAY / IN_COLLECTIONS). Each action writes the audit trail; resolved events drop out of this queue."
        fields={[
          "One-click retry (new Payment row, links via nsf.retry_payment_id)",
          "PTP capture (form: amount + date + method + comments)",
          "PTP status tracking (Open | Kept | Broken — auto-broken when due passes)",
          "Resolution selector with operator + audit trail",
          "Queue assignment to specific collectors",
          "Cadence: outbound contact playbook per bucket",
        ]}
      />

      <StubBanner
        pr="PR #4.6"
        description="Reports / dual-run dashboards layer Collections KPIs alongside the migration reconciliation views: cure rate per bucket, NSF rate per vendor / cohort, recovered vs written-off totals."
        fields={[
          "Cure rate per DPD bucket",
          "NSF rate per vendor (PR #4.6)",
          "Aged delinquency report (regulator-facing)",
          "PTP follow-through rate",
        ]}
      />
    </div>
  );
}
