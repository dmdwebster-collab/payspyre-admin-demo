import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCAD, formatPercent } from "@/lib/utils";
import {
  applicationStatusVariant,
  STATUS_FULL_LABEL,
} from "@/lib/originations";
import {
  getAvailableActions,
  checkActionPreconditions,
} from "@/lib/status-flow";

interface Props {
  params: Promise<{ applicationId: string }>;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SummaryTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const { primary, co } = await repository.getBorrowersForApplication(
    application.id,
  );
  const events = await repository.listEventsForApplication(application.id);

  const actions = getAvailableActions(application.status, "origination");

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left column — application detail */}
      <div className="col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Application detail</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-[12px]">
              <Field label="Application #" value={application.application_number} mono />
              <Field
                label="Status"
                valueNode={
                  <Badge variant={applicationStatusVariant(application.status)}>
                    {STATUS_FULL_LABEL[application.status]}
                  </Badge>
                }
              />
              <Field label="Province" value={application.province} />

              <Field label="Vendor" value={application.vendor_name} />
              <Field label="Vendor ID" value={application.vendor_id} mono />
              <Field label="Provider" value={application.provider} />

              <Field label="Credit product" value={application.credit_product_id ?? "—"} mono />
              <Field
                label="Requested"
                value={formatCAD(application.requested_amount)}
                mono
              />
              <Field
                label="Offer"
                value={
                  application.offer_amount != null
                    ? formatCAD(application.offer_amount)
                    : "—"
                }
                mono
              />

              <Field
                label="Term"
                value={application.term_months ? `${application.term_months} months` : "—"}
              />
              <Field
                label="Rate"
                value={
                  application.interest_rate != null
                    ? formatPercent(application.interest_rate)
                    : "—"
                }
              />
              <Field label="Frequency" value={application.payment_frequency ?? "—"} />

              <Field label="Start date" value={application.start_date ?? "—"} />
              <Field label="First payment" value={application.first_payment_date ?? "—"} />
              <Field
                label="Created"
                value={fmtDate(application.created_at)}
              />

              <Field label="Submitted" value={fmtDate(application.submitted_at)} />
              <Field label="Approved" value={fmtDate(application.approved_at)} />
              <Field label="Closed" value={fmtDate(application.closed_at)} />
            </dl>
          </CardContent>
        </Card>

        {/* Borrower roll-up */}
        <Card>
          <CardHeader>
            <CardTitle>
              Borrowers
              <span className="ml-3 text-[11px] font-normal text-ink-mute">
                Edit on Customer Details / Co-Borrower tabs
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 text-[12px]">
              <BorrowerCard
                title="Primary"
                borrower={primary}
              />
              <BorrowerCard title="Co-Borrower" borrower={co} />
            </div>
          </CardContent>
        </Card>

        {/* Verification freshness recap (David's PR #1.1 direction) */}
        <Card>
          <CardHeader>
            <CardTitle>Verification freshness</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-[12px]">
              <Field
                label="Credit Report"
                value={fmtDate(application.credit_report_completed_at)}
              />
              <Field
                label="Bank Verification"
                value={fmtDate(application.bank_verification_completed_at)}
              />
              <Field
                label="Application Verification"
                value={fmtDate(application.application_verification_completed_at)}
              />
            </dl>
            <p className="text-ink-mute text-[11px] mt-3">
              Validity windows are configured per credit product
              (default 30 days). Application Verification depends on
              Credit Report + Bank Verification per David&apos;s PR #1
              feedback. Per-product rules: PR #1.1.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right column — Status Flow action panel + recent activity */}
      <div className="col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Available actions</CardTitle>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <div className="text-ink-mute text-[12px]">
                No origination-workplace actions available from{" "}
                <code className="font-mono">{application.status}</code>.
                Action may be available from another workplace
                (Underwriting / Servicing) once integrated.
              </div>
            ) : (
              <ul className="space-y-2">
                {actions.map((a) => {
                  // Precondition check (no product loaded yet, so freshness
                  // checks no-op \u2014 they'll engage once PR #2 product
                  // wire-up lands).
                  const reason = checkActionPreconditions(application, a.action);
                  return (
                    <li key={a.action}>
                      <button
                        type="button"
                        disabled={!!reason}
                        title={reason ?? undefined}
                        className="w-full text-left px-3 py-2 rounded border border-line bg-navy-700 text-ink hover:bg-navy-600 hover:border-gold-dim text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="font-semibold">{a.label}</div>
                        <div className="text-[10px] text-ink-mute mt-0.5 tracking-wider uppercase font-mono">
                          → {a.to}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-ink-mute text-[10px] mt-3">
              Actions render preview only in PR #2 stub. Wire-up to
              executeAction() + audit-log persistence ships with the
              Workflow tab in this PR.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-ink-mute text-[12px]">No events.</div>
            ) : (
              <ol className="space-y-2 text-[11px]">
                {events.slice(0, 8).map((e, i) => (
                  <li
                    key={e.id ?? `${e.application_id}-${i}`}
                    className="border-l-2 border-line pl-3"
                  >
                    <div className="text-ink">
                      {e.from_status ? (
                        <>
                          <code className="font-mono text-ink-mute">
                            {e.from_status}
                          </code>{" "}
                          →{" "}
                        </>
                      ) : null}
                      <code className="font-mono text-gold-dim">
                        {e.to_status}
                      </code>
                    </div>
                    <div className="text-ink-mute">
                      {fmtDate(e.occurred_at)} · {e.actor_name}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-ink-mute text-[10px] mt-3">
              Full Workflow audit log: see Workflow tab.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  valueNode,
  mono,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-wider text-ink-mute uppercase">
        {label}
      </dt>
      <dd
        className={`text-ink mt-0.5 ${mono ? "font-mono" : ""}`}
      >
        {valueNode ?? value ?? "—"}
      </dd>
    </div>
  );
}

function BorrowerCard({
  title,
  borrower,
}: {
  title: string;
  borrower: Awaited<ReturnType<typeof repository.getBorrower>>;
}) {
  if (!borrower) {
    return (
      <div>
        <div className="text-[10px] font-semibold tracking-wider text-ink-mute uppercase">
          {title}
        </div>
        <div className="text-ink-mute mt-1">— none —</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider text-ink-mute uppercase">
        {title}
      </div>
      <div className="text-ink mt-1 font-semibold">
        {borrower.first_name} {borrower.last_name}
      </div>
      <div className="text-ink-dim mt-0.5">{borrower.email}</div>
      <div className="text-ink-dim">{borrower.phone}</div>
      <div className="text-ink-mute mt-1">
        {borrower.address_line1}, {borrower.city} {borrower.province}{" "}
        {borrower.postal_code}
      </div>
      <div className="text-ink-mute mt-1">
        {borrower.employer_name ?? "—"} ·{" "}
        {borrower.employment_type ?? "—"}
      </div>
      {borrower.gross_monthly_income != null && (
        <div className="text-ink-mute">
          Income: {formatCAD(borrower.gross_monthly_income)} / mo
        </div>
      )}
    </div>
  );
}
