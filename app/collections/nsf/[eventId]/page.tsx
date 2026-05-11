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
import { daysSince, dpdBucket } from "@/lib/collections";
import {
  resolveNSFEventAction,
  retryNSFPaymentAction,
} from "./actions";

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
            Wired to Next 14 Server Actions (PR #4.4.2). Mock-data
            mutators in `lib/data/repository.ts` persist within the
            server process; production swaps for a Supabase upsert with
            no Server Action change.
          </p>
        </CardHeader>
        <CardContent>
          {event.resolved_at ? (
            <div className="rounded-md border border-line bg-muted/30 px-4 py-3 text-sm">
              Already resolved as{" "}
              <span className="font-mono font-semibold">
                {event.resolution}
              </span>{" "}
              on{" "}
              <span className="font-mono">{fmt(event.resolved_at)}</span>.
            </div>
          ) : (
            <form
              action={resolveNSFEventAction.bind(null, event.id)}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
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
                  name="resolution"
                  required
                  defaultValue=""
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  htmlFor="resolved_on"
                  className="text-xs text-muted-foreground tracking-wider uppercase"
                >
                  Resolution date (optional)
                </label>
                <input
                  id="resolved_on"
                  name="resolved_on"
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
                  name="comments"
                  rows={3}
                  placeholder="Operator notes…"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* PR #4.4.3 — PTP capture sub-form. Always rendered; the
                  Server Action's Zod schema only requires these when
                  resolution=PROMISE_TO_PAY. Server-only — no client
                  conditional show. */}
              <div className="sm:col-span-2 rounded-md border border-line bg-muted/20 p-4 space-y-3">
                <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
                  Promise-to-pay capture
                </div>
                <p className="text-xs text-muted-foreground">
                  Required only when resolution = <code className="font-mono">PROMISE_TO_PAY</code>.
                  Ignored on other resolutions. Borrower commits to a specific
                  amount + date + method; the PTP auto-flips to{" "}
                  <code className="font-mono">BROKEN</code> if the date passes
                  without payment, or <code className="font-mono">KEPT</code>{" "}
                  on a matching posted Payment.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="ptp_amount"
                      className="text-xs text-muted-foreground tracking-wider uppercase"
                    >
                      PTP amount (CAD)
                    </label>
                    <input
                      id="ptp_amount"
                      name="ptp_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="250.00"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ptp_due_date"
                      className="text-xs text-muted-foreground tracking-wider uppercase"
                    >
                      PTP due date
                    </label>
                    <input
                      id="ptp_due_date"
                      name="ptp_due_date"
                      type="date"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ptp_method"
                      className="text-xs text-muted-foreground tracking-wider uppercase"
                    >
                      PTP method
                    </label>
                    <select
                      id="ptp_method"
                      name="ptp_method"
                      defaultValue=""
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="PAD">PAD</option>
                      <option value="EFT">EFT</option>
                      <option value="WIRE">WIRE</option>
                      <option value="CHEQUE">CHEQUE</option>
                      <option value="CASH">CASH</option>
                      <option value="INTERNAL_TRANSFER">INTERNAL_TRANSFER</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Mark resolved
                </button>
              </div>
            </form>
          )}

          {event.resolved_at && event.resolution === "PROMISE_TO_PAY" && (
            <div className="mt-4 rounded-md border border-line bg-muted/20 p-4 space-y-2">
              <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
                Promise-to-pay
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Amount</dt>
                  <dd className="font-mono">
                    {event.ptp_amount != null
                      ? formatCAD(event.ptp_amount)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Due</dt>
                  <dd className="font-mono">{event.ptp_due_date ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Method</dt>
                  <dd className="font-mono">{event.ptp_method ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd>
                    <Badge
                      variant={
                        event.ptp_status === "KEPT"
                          ? "paid"
                          : event.ptp_status === "BROKEN"
                          ? "writeoff"
                          : "active"
                      }
                    >
                      {event.ptp_status ?? "OPEN"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retry payment</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Schedules a fresh Payment in <code>SCHEDULED</code> status,
            tagged source <code>COLLECTIONS</code>, and links it back via{" "}
            <code>nsf.retry_payment_id</code>. Drives the Servicing
            Payments tab.
          </p>
        </CardHeader>
        <CardContent>
          {event.retry_attempted ? (
            <div className="rounded-md border border-line bg-muted/30 px-4 py-3 text-sm">
              Retry already attempted on{" "}
              <span className="font-mono">{fmt(event.retry_at)}</span> via
              payment{" "}
              <span className="font-mono">{event.retry_payment_id}</span>.
            </div>
          ) : (
            <form
              action={retryNSFPaymentAction.bind(null, event.id)}
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              <div>
                <label
                  htmlFor="amount"
                  className="text-xs text-muted-foreground tracking-wider uppercase"
                >
                  Amount (CAD)
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={payment?.amount ?? ""}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="scheduled_for"
                  className="text-xs text-muted-foreground tracking-wider uppercase"
                >
                  Scheduled for
                </label>
                <input
                  id="scheduled_for"
                  name="scheduled_for"
                  type="date"
                  required
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="method"
                  className="text-xs text-muted-foreground tracking-wider uppercase"
                >
                  Method
                </label>
                <select
                  id="method"
                  name="method"
                  required
                  defaultValue="PAD"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PAD">PAD</option>
                  <option value="EFT">EFT</option>
                  <option value="WIRE">WIRE</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="CASH">CASH</option>
                  <option value="INTERNAL_TRANSFER">INTERNAL_TRANSFER</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Schedule retry
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
