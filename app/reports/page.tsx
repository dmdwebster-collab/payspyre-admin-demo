import { repository } from "@/lib/data/repository";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StubBanner } from "@/components/ui/stub-banner";
import { buildFunnelBuckets } from "@/lib/originations";

export default async function ReportsPage() {
  const apps = await repository.listApplications();
  const buckets = buildFunnelBuckets(apps);

  const totalApps = apps.length;
  const submitted = apps.filter((a) =>
    [
      "ORIGINATION",
      "CREDIT_REPORT",
      "BANK_VERIFICATION",
      "APPLICATION_VERIFICATION",
      "CREDIT_UNDERWRITING",
      "OFFER_ACCEPTANCE",
      "AGREEMENT_SIGNATURE",
      "APPROVED",
      "ACTIVE",
    ].includes(a.status),
  ).length;
  const funded = apps.filter((a) => a.status === "ACTIVE").length;
  const rejected = apps.filter((a) => a.status === "REJECTED").length;

  const totalDisbursed = apps
    .filter((a) => a.status === "ACTIVE")
    .reduce((s, a) => s + (a.offer_amount ?? a.requested_amount), 0);

  const submitToFundConv =
    submitted > 0 ? ((funded / submitted) * 100).toFixed(1) : "—";
  const submitToRejectConv =
    submitted > 0 ? ((rejected / submitted) * 100).toFixed(1) : "—";

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

      <Card>
        <CardHeader>
          <CardTitle>Originations funnel — live preview</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Total applications</dt>
              <dd className="text-2xl font-semibold">{totalApps}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Funded (ACTIVE)</dt>
              <dd className="text-2xl font-semibold text-emerald-700">
                {funded}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Rejected</dt>
              <dd className="text-2xl font-semibold">{rejected}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">$ Disbursed</dt>
              <dd className="text-2xl font-semibold">
                ${totalDisbursed.toLocaleString("en-CA")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Submit → Fund</dt>
              <dd className="text-lg font-semibold">{submitToFundConv}%</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Submit → Reject</dt>
              <dd className="text-lg font-semibold">{submitToRejectConv}%</dd>
            </div>
          </dl>
        </CardContent>
        <CardContent className="border-t pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Funnel by status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {buckets.map((b) => (
              <div
                key={b.status}
                className="flex items-center justify-between rounded border px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground">{b.short_label}</span>
                <span className="font-mono font-semibold">{b.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <a
        href="/reports/migration"
        className="block rounded-lg border border-gold-dim/40 bg-navy-700/40 p-4 text-sm text-ink-dim hover:border-gold-dim hover:bg-navy-700"
      >
        <div className="text-[11px] font-semibold tracking-wider text-gold uppercase mb-1">
          PR #4.6 · TurnKey migration reconciliation (live)
        </div>
        Live re-run of the PR #4.2 migration runner against a sample
        TurnKey export. Per-entity counts, money totals (source vs
        imported), and the structured issues list — the regulator-facing
        artifact for the cutover.
      </a>

      <StubBanner
        pr="PR #4"
        description="Business Performance Summary — geographical heat map of active loan locations + portfolio overview (size, disbursed, repaid, profit, profit/portfolio)."
        fields={[
          "Heat map (BC + AB by FSA / city)",
          "Portfolio size / Disbursement amount / Repaid amount",
          "Profit / Profit per portfolio dollar",
          "Risk: $ paid on time / # paid on time / $ Late / # Late / At Risk / Losses",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Collections Report — DPD-bucketed arrears summary."
        fields={[
          "Arrears $ + #",
          "Write-offs $ + #",
          "DPD 1-29 (Current month late)",
          "DPD 30-59 (Potential 30)",
          "DPD 60-89 (Potential 60)",
          "DPD 90+ (Potential write-off)",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Portfolio Details — slice the book multiple ways."
        fields={[
          "Portfolio # / $ over time",
          "Active loans vs portfolio",
          "Repayment per interval (total / principal / interest / fees)",
          "By Vendor / Provider / Risk ranking / Loan amount band",
          "Repaid vs Disbursed",
          "Approved vs Rejected",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Operational — Business Status snapshot."
        fields={[
          "New: Loans / Approved / Rejected / Disbursed",
          "New: Returning Clients / Approved / Rejected / Disbursed",
          "Active: Performing — # / $ / Paid / Earned / Avg Interest",
          "Active: Non-performing — # / Past Due / Outstanding Int+Fees / Outstanding Principal / Avg DPD",
          "Closed: Paid in full on time / with delays / Written off (each with sub-stats)",
          "Origination efficiency",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Risks — risk and loss reporting / graphs / delinquency performance + losses report (top write-off reasons # and $)."
        fields={[
          "Delinquency curve over time",
          "Vintage analysis (cohort by funded month)",
          "Top write-off reasons by # and $",
          "Time series report (configurable metric + timeframe)",
        ]}
      />
    </div>
  );
}
