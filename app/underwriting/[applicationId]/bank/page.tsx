import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StubBanner } from "@/components/ui/stub-banner";

/** Bank tab — Flinks bank verification viewer. Real implementation in PR #4.5.1. */
export default async function UnderwritingBankTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Flinks bank verification</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Stub. PR #4.5.1 wires Flinks login flow + parses the bank
            statement signals (income source / amount, min balance, free
            cash flow, NSF count, fraud flags) into a structured display.
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Bank verification viewer not yet implemented. Run-Flinks action
          lands in PR #4.5.1; the freshness state for any verification on
          this application is already surfaced on the Decision tab.
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.5.1"
        description="Flinks bank verification viewer + run-Flinks Server Action. Initiates a Flinks login flow and stamps `bank_verification_completed_at` on the application; surfaces the structured BankVerification record from the schema."
        fields={[
          "Flinks login id + completed_at",
          "Income source + monthly amount",
          "Min balance in period (90 / 365 days)",
          "Avg monthly free cash flow + balance trend",
          "NSF count / stop-payment count / micro-lender flags",
          "Ability-to-pay score + fraud flags",
          "Run-Flinks Server Action (audit-logged, freshness-aware)",
        ]}
      />
    </div>
  );
}
