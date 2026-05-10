import { StubBanner } from "@/components/ui/stub-banner";

export default function ReportsPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <h1 className="text-2xl font-semibold text-ink mt-1">Reports</h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Operational, financial, and compliance reporting. All exports CSV +
          PDF. Province / vendor / date filters on every report.
        </p>
      </header>

      <StubBanner
        pr="PR #3"
        description="Originations report — funnel from application created → funded, with conversion at every stage."
        fields={[
          "Apps created / submitted / approved / funded",
          "Conversion % per stage",
          "Avg cycle time per stage",
          "By vendor / province / product",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Portfolio report — book composition snapshot."
        fields={[
          "Outstanding principal",
          "By risk tier / product / province / vendor",
          "Weighted-avg rate / term / DPD",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Delinquency / Collections report — DPD aging and bucket-roll rates."
        fields={[
          "DPD buckets ($ + count)",
          "Roll rates (current → 30 → 60 → 90)",
          "Promise-to-pay kept / broken %",
          "Charge-off forecast",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Vendor statements — per-vendor monthly statement (originations, holdbacks, fees, payouts)."
        fields={[
          "Originations volume + fee",
          "Holdback balance",
          "Payout reconciliation",
          "PDF + CSV export per vendor / month",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Financial / accounting reports — for general ledger and audit."
        fields={[
          "Trial balance",
          "Cash flow",
          "Interest income accrual",
          "Loan-loss provision",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Compliance reports — PIPEDA, FINTRAC, and provincial lender filings."
        fields={[
          "Access / consent log",
          "Large-transaction report (LTR)",
          "Suspicious-transaction report (STR) draft",
          "Cost-of-credit disclosure audit",
        ]}
      />
    </div>
  );
}
