import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StubBanner } from "@/components/ui/stub-banner";

/** Verification tab — KYC + cross-reference verification. Real implementation in PR #4.5.2. */
export default async function UnderwritingVerificationTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Application verification</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Stub. PR #4.5.2 implements per-element verification — each
            applicant attribute (name, address, phone, email, employer,
            income, ID document) cross-referenced against the bureau pull
            + bank verification + ID provider with a manual-review flag
            when automated coverage is insufficient.
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Verification matrix not yet implemented. Depends on the bureau +
          bank artifacts landing in PR #4.5.1.
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.5.2"
        description="Per-element verification matrix. Each applicant attribute is checked against multiple sources; the cell shows source(s), check timestamp, and manual-review flag where coverage is insufficient. App Verification = approved when every required element passes."
        fields={[
          "Borrower Name — verified by ID + Bank",
          "Address / Phone / Email — bureau + bank cross-reference",
          "Employer / Income — paystub + bank-deposit pattern",
          "ID document — validity + expiry + photo match (Trulioo / Persona)",
          "Manual review flag with reason + reviewer assignment",
          "Re-run verification Server Action (audit-logged)",
          "Stamps application_verification_completed_at on success",
        ]}
      />
    </div>
  );
}
