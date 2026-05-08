import { StubBanner } from "@/components/ui/stub-banner";

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

      <StubBanner
        pr="PR #3"
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
        pr="PR #3"
        description="Company Settings — legal entity, branding, and provincial scope."
        fields={[
          "Legal name / DBA",
          "FINTRAC MSB # (if applicable)",
          "Logo / brand colors",
          "Province settings (BC, AB)",
          "Cost-of-credit disclosure templates",
          "Statement templates",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Integrations — credentials and toggles for every external service."
        fields={[
          "Equifax (credit bureau)",
          "Flinks Capital (bank verification)",
          "Zum Rails (EFT processor)",
          "ID verification provider — TBD",
          "DocuSign (e-signature)",
          "Email (transactional)",
          "SMS (transactional)",
          "Webhook secrets",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Loan Settings — product catalog and default terms per province."
        fields={[
          "Credit products",
          "Min / max amount",
          "Min / max term (months)",
          "Rate bands per risk tier",
          "Origination fee schedule",
          "NSF fee",
          "Late fee",
          "DSI day-count (360 default)",
        ]}
      />

      <StubBanner
        pr="PR #3"
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
        pr="PR #3"
        description="Notifications — internal + borrower-facing message templates and triggers."
        fields={[
          "Status-change triggers",
          "Email templates",
          "SMS templates",
          "Internal Slack / webhook routing",
          "Borrower opt-in / opt-out",
        ]}
      />
    </div>
  );
}
