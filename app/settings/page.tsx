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
        description="Integrations — credentials and toggles for every external service. Existing relationships from the TurnKey deployment carry over (David, PR #1 review)."
        fields={[
          "Equifax Canada (credit bureau)",
          "Flinks Capital (instant bank verification)",
          "Zum Rails (EFT / payment processing)",
          "SignNow (e-signature)",
          "SendGrid (transactional email)",
          "MessageBird (SMS — not actively used yet)",
          "Walnut (creditor / credit insurance)",
          "KYC / KYB / ID Verification — TBD (Trulioo + Persona under evaluation)",
          "Webhook secrets / signing keys",
          "Future: Equifax PPSA Connect (lien registration)",
          "Future: Equifax Credit Monitoring API (customer-facing)",
          "Future: Zum Rails Card Issuance (secured cards)",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Loan Settings — product catalog and default terms per province. Each credit product carries its own verification requirements and reuse windows."
        fields={[
          "Credit products (per CreditProduct in lib/types/credit-product.ts)",
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
