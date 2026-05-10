import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StubBanner } from "@/components/ui/stub-banner";

/** Bureau tab — Equifax credit report viewer. Real implementation in PR #4.5.1. */
export default async function UnderwritingBureauTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Equifax credit bureau report</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Stub. PR #4.5.1 wires Equifax Canada bureau pulls + parses the
            response into a structured display (score, tradelines, inquiries,
            collections, public records, derogatory items).
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Bureau viewer not yet implemented. Run-bureau action lands in
          PR #4.5.1; the freshness state for any pull on this application is
          already surfaced on the Decision tab.
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.5.1"
        description="Equifax bureau report viewer + run-bureau Server Action. Triggers a fresh pull (gated by per-product `requires_credit_bureau` toggle) and stamps `credit_report_completed_at` on the application."
        fields={[
          "Composite score + risk tier mapping",
          "Tradelines: type / opened / balance / status",
          "Inquiries (last 24 months) by lender",
          "Collections + public records + derogatory items",
          "Run-bureau Server Action (audit-logged, freshness-aware)",
          "Per-product toggle: requires_credit_bureau",
        ]}
      />
    </div>
  );
}
