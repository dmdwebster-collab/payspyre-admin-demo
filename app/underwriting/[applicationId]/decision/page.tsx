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
import { isCheckFresh } from "@/lib/types/credit-product";
import { getAvailableActions } from "@/lib/status-flow";
import { runUWActionFromForm } from "./actions";

interface Props {
  params: Promise<{ applicationId: string }>;
}

function fmt(iso: string | null | undefined): string {
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
 * Decision tab — the underwriter-facing summary of the offer + the
 * freshness state of every gating check + available state-machine
 * actions. Read-only in PR #4.5; the action buttons become Server
 * Actions in PR #4.5.1 (alongside the Bureau and Bank tabs that surface
 * the underlying check artifacts).
 */
export default async function UnderwritingDecisionTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  // Default validity — PR #4.5.1 will look up the per-product config
  // (requires_credit_bureau / validity_days / etc.) once a real
  // CreditProduct fixture is wired into Applications. For now, evaluate
  // freshness against a 30-day default to surface the intent.
  const VALIDITY = 30;
  const creditFresh = isCheckFresh(
    application.credit_report_completed_at,
    VALIDITY,
  );
  const bankFresh = isCheckFresh(
    application.bank_verification_completed_at,
    VALIDITY,
  );
  const appVerFresh = isCheckFresh(
    application.application_verification_completed_at,
    VALIDITY,
  );

  const availableActions = getAvailableActions(application.status, "underwriting");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Offer summary</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            What the borrower is asking for, what the underwriter is being
            asked to approve.
          </p>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Requested</dt>
              <dd className="text-lg font-semibold">
                {formatCAD(application.requested_amount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Offer</dt>
              <dd className="text-lg font-semibold">
                {application.offer_amount
                  ? formatCAD(application.offer_amount)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Term</dt>
              <dd className="text-lg font-semibold">
                {application.term_months ? `${application.term_months} mo` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Rate</dt>
              <dd className="text-lg font-semibold">
                {application.interest_rate
                  ? `${application.interest_rate.toFixed(2)}%`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Frequency</dt>
              <dd className="text-lg font-semibold">
                {application.payment_frequency ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">First payment</dt>
              <dd className="text-lg font-semibold">
                {application.first_payment_date ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Credit product</dt>
              <dd className="text-lg font-semibold">
                {application.credit_product_id ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="text-lg font-semibold">{fmt(application.created_at)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification freshness</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Each check has its own &quot;last completed&quot; timestamp. App
            Verification depends on a fresh Credit Report (when required) +
            fresh Bank Verification per the credit product. Default 30-day
            validity until per-product config lands in PR #4.5.1.
          </p>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Credit report</dt>
              <dd className="mt-1 flex items-center gap-2">
                <Badge variant={creditFresh ? "active" : "muted"}>
                  {application.credit_report_completed_at
                    ? creditFresh
                      ? "FRESH"
                      : "STALE"
                    : "NOT RUN"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {fmt(application.credit_report_completed_at)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Bank verification</dt>
              <dd className="mt-1 flex items-center gap-2">
                <Badge variant={bankFresh ? "active" : "muted"}>
                  {application.bank_verification_completed_at
                    ? bankFresh
                      ? "FRESH"
                      : "STALE"
                    : "NOT RUN"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {fmt(application.bank_verification_completed_at)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">App verification</dt>
              <dd className="mt-1 flex items-center gap-2">
                <Badge variant={appVerFresh ? "active" : "muted"}>
                  {application.application_verification_completed_at
                    ? appVerFresh
                      ? "FRESH"
                      : "STALE"
                    : "NOT RUN"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {fmt(application.application_verification_completed_at)}
                </span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available actions</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            State-machine transitions an underwriter can fire from this
            status. Each form posts to{" "}
            <code className="font-mono">runUWActionFromForm</code> which
            calls <code>executeAction()</code> and persists the
            application + status event before redirecting.
          </p>
        </CardHeader>
        <CardContent>
          {availableActions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No underwriting actions available from{" "}
              <span className="font-mono">{application.status}</span>. The
              application is either pre-Underwriting or in a terminal state.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {availableActions.map(({ action, label, to }) => (
                <li
                  key={action}
                  className="rounded-md border border-line bg-background p-3"
                >
                  <form
                    action={runUWActionFromForm.bind(null, application.id)}
                    className="space-y-2"
                  >
                    <input type="hidden" name="action" value={action} />
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-[10px] text-muted-foreground tracking-wider uppercase font-mono">
                      → {to}
                    </div>
                    <textarea
                      name="comments"
                      rows={2}
                      placeholder="Optional comments…"
                      className="block w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Confirm {label}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
