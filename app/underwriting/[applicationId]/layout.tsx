import Link from "next/link";
import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { UnderwritingLoanHeaderTabs } from "@/components/underwriting/loan-header-tabs";
import { formatCAD } from "@/lib/utils";
import {
  STATUS_FULL_LABEL,
  applicationStatusVariant,
  applicationAgeDays,
} from "@/lib/originations";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ applicationId: string }>;
}

/**
 * Underwriting Loan Header layout.
 *
 * Loads an Application record and renders the sticky Loan Header + tab
 * strip, mirroring the Originations layout. The header is intentionally
 * close in shape to /originations/[applicationId]/layout.tsx so operators
 * jumping between workplaces don't have to relearn the surface.
 */
export default async function UnderwritingApplicationLayout({
  children,
  params,
}: LayoutProps) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const { primary, co } = await repository.getBorrowersForApplication(
    application.id,
  );

  const borrowerName = primary
    ? `${primary.first_name} ${primary.last_name}`
    : "—";
  const age = applicationAgeDays(application);

  return (
    <>
      <Topbar
        title={`Underwriting · ${application.application_number}`}
        subtitle="Underwriting workplace · decisioning + verifications"
      />
      <div className="bg-navy-800 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-navy-900 border-b border-line px-6 py-4">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <Link
                href="/underwriting"
                className="text-[11px] text-ink-mute tracking-wider uppercase hover:text-gold-dim"
              >
                ← Back to underwriting queue
              </Link>
              <div className="text-xl font-semibold text-ink mt-1 truncate">
                {borrowerName}
                {co && (
                  <span className="text-ink-mute text-base font-normal">
                    {" "}
                    + {co.first_name} {co.last_name}
                  </span>
                )}
              </div>
              <div className="text-[12px] text-ink-dim mt-1 flex items-center flex-wrap gap-x-3 gap-y-1">
                <span className="font-mono text-gold">
                  {application.application_number}
                </span>
                <span>·</span>
                <span>
                  {application.vendor_name}{" "}
                  <span className="text-ink-mute">
                    ({application.vendor_id})
                  </span>
                </span>
                <span>·</span>
                <span>{application.provider}</span>
                <span>·</span>
                <span>{application.province}</span>
                <span>·</span>
                <span>
                  {application.credit_product_id ?? "—"}
                  {application.payment_frequency
                    ? ` · ${application.payment_frequency}`
                    : ""}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge
                variant={applicationStatusVariant(application.status)}
                className="text-[11px]"
              >
                {STATUS_FULL_LABEL[application.status]}
              </Badge>
              <div className="text-right">
                <div className="font-mono text-[18px] text-ink leading-none">
                  {formatCAD(
                    application.offer_amount ?? application.requested_amount,
                  )}
                </div>
                <div className="text-[10px] text-ink-mute mt-0.5 tracking-wider uppercase">
                  {application.offer_amount ? "Offer" : "Requested"}
                  {application.term_months
                    ? ` · ${application.term_months} mo`
                    : ""}
                </div>
              </div>
              <div className="text-[11px] text-ink-dim">
                Age:{" "}
                <span
                  className={
                    age > 7 ? "text-warn font-mono" : "text-ink font-mono"
                  }
                >
                  {age}d
                </span>
              </div>
            </div>
          </div>
        </div>

        <UnderwritingLoanHeaderTabs applicationId={application.id} />

        <div className="p-6">{children}</div>
      </div>
    </>
  );
}
