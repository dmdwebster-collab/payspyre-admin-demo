import Link from "next/link";
import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { ServicingLoanHeaderTabs } from "@/components/servicing/loan-header-tabs";
import { formatCAD } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ loanId: string }>;
}

/**
 * Servicing Loan Header layout.
 *
 * Loads either a real Loan record (legacy v1 portfolio) OR an active
 * PaymentSchedule (PR #4.1 fixtures use synthetic loan_id PS-SAMPLE-001
 * with no matching Loan row). If neither exists the route 404s.
 *
 * The header surfaces what we can prove from whichever side has data —
 * full loan summary when the Loan exists, schedule-driven summary when
 * only the schedule exists. PR #4.5 will tighten this once real loans
 * land via the TurnKey adapter (PR #4.2).
 */
export default async function ServicingLoanLayout({
  children,
  params,
}: LayoutProps) {
  const { loanId } = await params;
  const [loan, schedule] = await Promise.all([
    repository.getLoan(loanId),
    repository.getActiveScheduleForLoan(loanId),
  ]);
  if (!loan && !schedule) notFound();

  // Header values — prefer the loan record, fall back to schedule.
  const displayId = loan?.id ?? schedule?.loan_id ?? loanId;
  const acctNum = loan?.acct_num ?? loanId;
  const borrower = loan?.borrower ?? "—";
  const vendorName = loan?.vendor_name ?? "—";
  const vendorId = loan?.vendor_id ?? "—";
  const province = loan?.province ?? "—";
  const provider = loan?.provider ?? "—";
  const principal = loan?.amount_financed ?? schedule?.original_principal ?? 0;
  const term = loan?.term ?? schedule?.term_months ?? 0;
  const rate = loan?.rate ?? schedule?.annual_rate ?? 0;
  const frequency = loan?.payment_frequency ?? schedule?.payment_frequency ?? "—";
  const status = loan?.status ?? "(no loan record)";
  const dpd = loan?.dpd ?? 0;

  return (
    <>
      <Topbar
        title={`Servicing · ${acctNum}`}
        subtitle="Servicing workplace · loan account view"
      />
      <div className="bg-navy-800 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-navy-900 border-b border-line px-6 py-4">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <Link
                href="/servicing"
                className="text-[11px] text-ink-mute tracking-wider uppercase hover:text-gold-dim"
              >
                ← Back to servicing book
              </Link>
              <div className="text-xl font-semibold text-ink mt-1 truncate">
                {borrower}
              </div>
              <div className="text-[12px] text-ink-dim mt-1 flex items-center flex-wrap gap-x-3 gap-y-1">
                <span className="font-mono text-gold">{displayId}</span>
                <span>·</span>
                <span>
                  {vendorName}{" "}
                  {vendorId !== "—" && (
                    <span className="text-ink-mute">({vendorId})</span>
                  )}
                </span>
                <span>·</span>
                <span>{provider}</span>
                <span>·</span>
                <span>{province}</span>
                <span>·</span>
                <span>
                  {frequency}
                  {term > 0 ? ` · ${term} mo` : ""}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge
                variant={
                  status === "ACTIVE"
                    ? "active"
                    : status === "PAID_OFF"
                    ? "paid"
                    : status === "WRITTEN_OFF" || status === "SETTLED"
                    ? "writeoff"
                    : status === "RENEWED" || status === "REFINANCED"
                    ? "renewed"
                    : "muted"
                }
                className="text-[11px]"
              >
                {status}
              </Badge>
              <div className="text-right">
                <div className="font-mono text-[18px] text-ink leading-none">
                  {formatCAD(principal)}
                </div>
                <div className="text-[10px] text-ink-mute mt-0.5 tracking-wider uppercase">
                  Financed · {rate.toFixed(2)}% APR
                </div>
              </div>
              {dpd > 0 && (
                <div className="text-[11px] text-warn font-mono">
                  DPD: {dpd}d
                </div>
              )}
            </div>
          </div>
        </div>

        <ServicingLoanHeaderTabs loanId={loanId} />

        <div className="p-6">{children}</div>
      </div>
    </>
  );
}
