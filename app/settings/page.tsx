import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StubBanner } from "@/components/ui/stub-banner";

const INTEGRATIONS = [
  { name: "Equifax Canada", role: "Credit bureau", status: "Active" },
  { name: "Flinks Capital", role: "Bank verification", status: "Active" },
  { name: "Zum Rails", role: "EFT / payments", status: "Active" },
  { name: "SignNow", role: "E-signature", status: "Active" },
  { name: "SendGrid", role: "Transactional email", status: "Active" },
  { name: "MessageBird", role: "SMS", status: "Inactive" },
  { name: "Walnut", role: "Credit insurance", status: "Active" },
  { name: "Trulioo / Persona", role: "KYC / KYB / ID", status: "Under evaluation" },
];

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <h1 className="text-2xl font-semibold text-ink mt-1">Settings</h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Platform configuration: users, company, integrations, loan defaults,
          decision engine, and notifications.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Integrations — current connections</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Service</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {INTEGRATIONS.map((i) => (
                <tr key={i.name} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium">{i.name}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {i.role}
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={
                        i.status === "Active"
                          ? "active"
                          : i.status === "Inactive"
                          ? "muted"
                          : "renewed"
                      }
                    >
                      {i.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4"
        description="Accounts — user management with role-based access (Admin, Underwriter, Servicer, Collector, Vendor, Read-only)."
        fields={[
          "Invite user (email)",
          "Role assignment",
          "MFA enforcement",
          "Last sign-in",
          "Disable / delete",
          "Permission matrix per workplace",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Company Settings — legal entity, branding, and provincial scope. Province settings carry hardcoded compliance guardrails (APR limit, NSF charge, retention period) sourced from each province's consumer-protection acts."
        fields={[
          "Brand: company name / legal name / DBA / address / city / province / country / phone / website / email",
          "Lending type / Foundation date / Logo / Favicon",
          "Province scope (BC, AB) + per-province APR cap, NSF charge, retention",
          "FINTRAC MSB # (if applicable)",
          "Cost-of-credit disclosure templates",
          "Statement templates",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Integrations config — credentials, webhook secrets, and toggle switches. The table above is read-only; this stub will gate behind elevated permission for actual key management."
        fields={[
          "API keys + webhook secrets per service",
          "Connection-test action (audit-logged)",
          "Future: Equifax PPSA Connect (lien registration)",
          "Future: Equifax Credit Monitoring API (customer-facing)",
          "Future: Zum Rails Card Issuance (secured cards)",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Loan Settings — global standardized credit-product catalog (not customized per vendor). Each product carries its own verification requirements and reuse windows. Per David's PR #1.2 input, vendor-level product customization is dropped — every vendor presents the same standardized offerings."
        fields={[
          "Credit products (per CreditProduct in lib/types/credit-product.ts) — global, not per-vendor",
          "Min / max amount",
          "Min / max term (months)",
          "Rate bands per risk tier",
          "Origination fee schedule",
          "NSF fee",
          "Late fee",
          "DSI day-count (360 default)",
          "Requires credit bureau (On / Off per product)",
          "Requires bank verification (On / Off per product)",
          "Credit Report validity window (days, default 30)",
          "Bank Verification validity window (days, default 30)",
          "Post-booking re-pull cadence (collections / portfolio review)",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Decision Engine — scorecard rules and auto-decision thresholds. Default scorecard required at launch."
        fields={[
          "Bureau-score cutoffs per tier",
          "Bank-statement signal rules",
          "Application-data rules (employment, income, residence)",
          "Hard-fail rules (bankruptcy, fraud flag)",
          "Auto-approve / auto-decline thresholds",
          "Refer-to-human queue routing",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Notifications — internal + borrower-facing message templates and triggers."
        fields={[
          "Status-change triggers",
          "Email templates (SendGrid)",
          "SMS templates (MessageBird)",
          "Internal Slack / webhook routing",
          "Borrower opt-in / opt-out",
        ]}
      />
    </div>
  );
}
