import { StubBanner } from "@/components/ui/stub-banner";

export default function ServicingPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <h1 className="text-2xl font-semibold text-ink mt-1">Servicing</h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Funded and active loans. Day-to-day account management — balances,
          schedules, payments, hardships, and renewals. 360-day DSI interest
          method. CAD only.
        </p>
      </header>

      <StubBanner
        pr="PR #3"
        description="Extended Loan Header — adds servicing-specific fields on top of the originations header."
        fields={[
          "Outstanding balance",
          "Days past due (DPD)",
          "Next payment date / amount",
          "Last payment date / amount",
          "Maturity date",
          "Loan status (Current | Delinquent | Default | Closed)",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Summary tab — high-level account snapshot for servicing reps."
        fields={[
          "Principal / interest / fees outstanding",
          "Total paid to date",
          "Origination fee, NSF fees",
          "Promise-to-pay status",
          "Hardship flag",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Initial Schedule tab — original amortization at funding (read-only post-origination)."
        fields={[
          "Installment # / date / amount",
          "Principal / interest / fees split",
          "Cumulative paid",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Renewal tab — amortization recalculated whenever the live schedule changes (skip-a-pay, re-age, restructure)."
        fields={[
          "Effective-from date",
          "Reason (Skip | Re-age | Restructure | Hardship)",
          "Old vs new schedule diff",
          "User who actioned",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Transactions tab — every movement on the loan account (Zum Rails EFT, NSF, manual adj, fee, refund)."
        fields={[
          "Date / time",
          "Type (Payment | NSF | Fee | Refund | Adjustment)",
          "Amount (debit / credit)",
          "Method (EFT | Card | Manual)",
          "Zum Rails transaction ID",
          "Status (Pending | Settled | Failed | Returned)",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Scheduled Transactions tab — upcoming EFT pulls queued with Zum Rails."
        fields={[
          "Scheduled date",
          "Amount",
          "Bank account (default payment source)",
          "Status (Queued | Submitted | Cancelled)",
          "Cancel / reschedule action",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Hardship tab — record approved hardship plans and track adherence."
        fields={[
          "Plan type (Skip-a-pay | Reduced payment | Forbearance)",
          "Effective from / to",
          "Approved by",
          "Adherence (On-track | Broken)",
          "Notes",
        ]}
      />
    </div>
  );
}
