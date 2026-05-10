import { StubBanner } from "@/components/ui/stub-banner";

export default function UnderwritingPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <h1 className="text-2xl font-semibold text-ink mt-1">Underwriting</h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Applications submitted for credit decisioning. Inherits all
          Originations tabs plus Risk Score and Verifications. Driven by the
          Decision Engine scorecard configured under Settings.
        </p>
      </header>

      <StubBanner
        pr="PR #3"
        description="Risk Score tab — composite score from Equifax bureau pull + bank-statement signals + application data, plus per-rule pass/fail."
        fields={[
          "Composite risk score",
          "Risk tier (A | B | C | D)",
          "Bank score / sub-signals",
          "Bureau score (Equifax)",
          "Application score",
          "Decision Engine rule results (pass/fail per rule)",
          "Recommended decision (Approve | Decline | Refer)",
          "Override (with reason + user)",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Verifications tab — Credit Report, Bank Verification, and Application Verification checks. Modeled as parallel/repeatable checks (not strict sequential states)."
        fields={[
          "Credit Bureau pull (Equifax) — status, pulled-at, score",
          "Bank Verification (Flinks) — institution, accounts, last sync",
          "Application Verification — ID match, address match, employment confirmation",
          "Re-run check button (audit-logged)",
          "Underwriting Rules engine results",
        ]}
      />
    </div>
  );
}
