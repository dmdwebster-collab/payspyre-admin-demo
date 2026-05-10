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
import { StubBanner } from "@/components/ui/stub-banner";
import { formatCAD } from "@/lib/utils";
import { daysSince, dpdBucket } from "@/lib/collections";

interface Props {
  params: Promise<{ eventId: string }>;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * NSF event detail page — focused view for working a single returned-payment
 * record. Reached from the Collections worklist; surfaces full event +
 * related payment context + a resolution-action scaffold for PR #4.4.x.
 *
 * The action panel is read-only in this PR (no Server Action wired). The
 * scaffold is here so the workflow shape lands ahead of the persistence
 * layer — when PR #4.4.x adds the Server Action, only the form attribute
 * changes, no layout rework.
 */
export default async function NSFEventDetailPage({ params }: Props) {
  const { eventId } = await params;
  const event = await repository.getNSFEvent(eventId);
  if (!event) notFound();

  const payment = await repository.getPayment(event.payment_id);
  const dpd = daysSince(event.occurred_at);
  const bucket = dpdBucket(dpd);

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6">
      <header>
        <Link
          href="/collections"
          className="text-[11px] text-ink-mute tracking-wider uppercase hover:text-gold-dim"
        >
          ← Back to Collections queue
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">
            NSF event{" "}
            <span className="font-mono text-gold text-base">{event.id}</span>
          </h1>
          <Badge
            variant={
              bucket === "90+"
                ? "writeoff"
                : bucket === "60-89" || bucket === "30-59"
                ? "renewed"
                : "active"
            }
          >
            DPD {dpd} · {bucket}
          </Badge>
          {event.resolved_at ? (
            <Badge variant="paid">{event.resolution ?? "RESOLVED"}</Badge>
          ) : (
            <Badge variant="muted">Open</Badge>
          )}
        </div>
        <p className="text-ink-dim text-sm mt-2">
          Loan{" "}
          <Link
            href={`/servicing/${event.loan_id}/nsf`}
            className="font-mono text-gold hover:underline"
          >
            {event.loan_id}
          </Link>
          {" · "}
          {event.reason_code}
          {event.reason_description ? ` · ${event.reason_description}` : ""}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Event</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Occurred</dt>
              <dd className="text-sm font-mono">{fmtDateTime(event.occurred_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Reason code</dt>
              <dd className="text-sm font-mono">{event.reason_code}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">NSF fee charged</dt>
              <dd className="text-sm font-mono">
                {formatCAD(event.nsf_fee_charged)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Bank fee recovered</dt>
              <dd className="text-sm font-mono">
                {event.bank_fee_recovered === null
                  ? "—"
                  : formatCAD(event.bank_fee_recovered)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Retry attempted</dt>
              <dd className="text-sm font-mono">
                {event.retry_attempted ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Retry payment</dt>
              <dd className="text-sm font-mono">
                {event.retry_payment_id ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Retry date</dt>
              <dd className="text-sm font-mono">{fmt(event.retry_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Resolved</dt>
              <dd className="text-sm font-mono">{fmt(event.resolved_at)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bounced payment</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            The payment that triggered this NSF event.
          </p>
        </CardHeader>
        <CardContent>
          {!payment ? (
            <div className="text-sm text-muted-foreground">
              Referenced payment{" "}
              <span className="font-mono">{event.payment_id}</span> not found.
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Payment id</dt>
                <dd className="text-sm font-mono">{payment.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="writeoff">{payment.status}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Method / source</dt>
                <dd className="text-sm">
                  {payment.method} · {payment.source}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Amount</dt>
                <dd className="text-sm font-mono">{formatCAD(payment.amount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Scheduled</dt>
                <dd className="text-sm font-mono">{fmt(payment.scheduled_for)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Posted</dt>
                <dd className="text-sm font-mono">{fmt(payment.posted_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">External ref</dt>
                <dd className="text-sm font-mono">
                  {payment.external_ref ?? payment.zum_payment_id ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Description</dt>
                <dd className="text-sm">{payment.description ?? "—"}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resolve</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Action panel scaffold. PR #4.4.2 wires these into Server Actions
            that write `nsf_events.resolution` + `resolved_at` and
            (optionally) create a fresh retry Payment.
          </p>
        </CardHeader>
        <CardContent>
          <fieldset
            disabled
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 opacity-60"
          >
            <div>
              <label
                htmlFor="resolution"
                className="text-xs text-muted-foreground tracking-wider uppercase"
              >
                Resolution
              </label>
              <select
                id="resolution"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Choose a resolution…
                </option>
                <option value="RECOVERED">RECOVERED</option>
                <option value="PROMISE_TO_PAY">PROMISE_TO_PAY</option>
                <option value="IN_COLLECTIONS">IN_COLLECTIONS</option>
                <option value="WRITTEN_OFF">WRITTEN_OFF</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="resolved-at"
                className="text-xs text-muted-foreground tracking-wider uppercase"
              >
                Resolution date
              </label>
              <input
                id="resolved-at"
                type="date"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="comments"
                className="text-xs text-muted-foreground tracking-wider uppercase"
              >
                Comments
              </label>
              <textarea
                id="comments"
                rows={3}
                placeholder="Operator notes…"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Mark resolved
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Retry payment
              </button>
              <span className="text-xs text-muted-foreground">
                (disabled — Server Actions land in PR #4.4.2)
              </span>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.4"
        description="Wire the resolution form to a Next 14 Server Action that writes nsf_events.resolution + resolved_at, and the retry button to one that creates a fresh Payment in SCHEDULED + back-references it via nsf.retry_payment_id. Also: PTP capture sub-form (amount + date + method)."
        fields={[
          "Server Action: setResolution(eventId, { resolution, comments })",
          "Server Action: scheduleRetry(eventId, { amount, scheduled_for, method })",
          "PTP capture form (only when resolution=PROMISE_TO_PAY)",
          "Audit trail row per action (operator + IP + timestamp)",
          "Optimistic UI update + redirect back to /collections",
        ]}
      />
    </div>
  );
}
