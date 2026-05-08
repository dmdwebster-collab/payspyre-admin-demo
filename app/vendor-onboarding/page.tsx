import { StubBanner } from "@/components/ui/stub-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorOnboardingPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <h1 className="text-2xl font-semibold text-ink mt-1">
          Vendor Onboarding
        </h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Bring a new clinic onto the PaySpyre platform. Replaces the current
          11-step ~2-week manual process with a largely automated digital flow:
          Application → KYB (Trulioo or Persona) → Banking (Flinks Capital) →
          MSA (SignNow) → Provisioning → Training → Live. Source:{" "}
          <code className="font-mono text-[11px]">
            docs/spec/vendor/onboarding-redesign.md
          </code>
          .
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Onboarding state flow (lib/vendor-onboarding-flow.ts)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-ink-dim font-mono">
            {[
              "INTEREST_REGISTERED",
              "APPLICATION_SUBMITTED",
              "KYB_IN_PROGRESS",
              "KYB_REVIEW (manual escalation)",
              "BANKING_VERIFICATION",
              "MSA_SENT",
              "MSA_SIGNED",
              "PROVISIONING",
              "TRAINING",
              "LIVE",
              "DECLINED / WITHDRAWN (terminal)",
              "SUSPENDED / OFFBOARDED (post-LIVE)",
            ].map((s) => (
              <li
                key={s}
                className="before:content-['—'] before:mr-2 before:text-ink-mute"
              >
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #1.2"
        description="Interest queue — vendors that signaled interest (web-form, sales, embed) but have not started a formal application. Sales can convert to APPLICATION_SUBMITTED."
        fields={[
          "Vendor name / corporate name",
          "Province (BC / AB)",
          "Source (web form, sales, embed widget, referral)",
          "First touch / last touch",
          "Owner (PaySpyre rep)",
          "Convert to application",
        ]}
      />

      <StubBanner
        pr="PR #1.2"
        description="Vendor Application form — digital replacement for the paper Vendor-Application form. Captures business info, directors/officers (with KYC fields), business reps, banking, and document uploads."
        fields={[
          "1.0 Business info (corporate name, BRN, GST/HST, NAICS)",
          "2.0 Directors & officers (full profile + KYC fields)",
          "3.0 Authorized representatives",
          "4.0 Banking (manual or via Flinks business-account flow)",
          "Document checklist (license, articles, ID, PAD/void cheque)",
          "Save draft / submit",
        ]}
      />

      <StubBanner
        pr="PR #1.2"
        description="KYB queue — applications awaiting business verification. Auto-dispatches to Trulioo or Persona; outcome routes to BANKING_VERIFICATION (pass), KYB_REVIEW (manual review), or DECLINED (fail)."
        fields={[
          "Vendor application #",
          "Submitted at",
          "KYB provider (Trulioo / Persona)",
          "KYB reference / transaction id",
          "Result (Pending / Pass / Review / Fail)",
          "Sanctions / PEP flags",
          "Beneficial-owner KYC summary",
        ]}
      />

      <StubBanner
        pr="PR #1.2"
        description="KYB Review — manual underwriting queue for applications that auto-routed to KYB_REVIEW. Reviewer can approve or decline with comments; both decisions emit a vendor_onboarding_event."
        fields={[
          "Reviewer assignment",
          "KYB provider raw response (read-only)",
          "Beneficial-owner KYC details",
          "Document attachments",
          "Approve → BANKING_VERIFICATION",
          "Decline → DECLINED (with reason)",
        ]}
      />

      <StubBanner
        pr="PR #1.2"
        description="Banking Verification — Flinks Capital business-account flow. Confirms the operating bank account that will receive vendor payouts via Zum Rails."
        fields={[
          "Flinks business-account widget",
          "Manual fallback (institution / transit / account #)",
          "Verified balance snapshot",
          "Years with institution",
          "banking_verified_at timestamp",
          "Validity window: 90 days (vendor.banking_validity_days)",
        ]}
      />

      <StubBanner
        pr="PR #1.2"
        description="MSA Dispatch — sends the master services agreement via SignNow once banking is verified. Tracks envelope status and registers signed_at on countersignature."
        fields={[
          "MSA template version",
          "Authorized signatory name",
          "SignNow envelope id",
          "Sent / viewed / signed status",
          "Countersigned by PaySpyre",
          "msa_signed_at timestamp",
        ]}
      />

      <StubBanner
        pr="PR #1.2"
        description="Provisioning — once the MSA is countersigned the system creates the vendor record, Zum Rails payment profile, vendor portal accounts, and embed widget keys."
        fields={[
          "Create Vendor row (status: PENDING → ACTIVE)",
          "Create Zum Rails payment profile",
          "Create vendor portal admin user (vendor_admin)",
          "Generate embed widget keys / promo codes",
          "Notify vendor success team",
        ]}
      />

      <StubBanner
        pr="PR #1.2"
        description="Training — vendor staff complete the onboarding video series and short verification activities before the vendor goes LIVE. Training platform itself (LMS) is parked as a future track — see docs/spec/future-tracks.md."
        fields={[
          "Training assignment per portal user",
          "Watch progress (15-video vendor series)",
          "Activity completions (e.g. submit a test application)",
          "Sign-off by PaySpyre vendor success",
          "Mark training complete → LIVE",
        ]}
      />

      <StubBanner
        pr="PR #1.2"
        description="Live vendors — directory of LIVE vendors with onboarding metadata, freshness flags (KYB / banking / MSA), and post-LIVE actions (suspend, reinstate, offboard)."
        fields={[
          "Vendor name + onboarding_status",
          "Live since (live_at)",
          "KYB freshness (validity_days)",
          "Banking freshness",
          "MSA version + signed_at",
          "Suspend / Reinstate / Offboard",
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Open questions for PR #2 build</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-y-1 text-[12px] text-ink-dim list-disc pl-5">
            <li>
              Standard credit-product catalog — which products ship at launch
              (term length, rate band, fees) and which are gated to specific
              risk tiers? Drop vendor-level customization (David PR #1.2).
            </li>
            <li>
              Vendor risk underwriting — do we underwrite the vendor itself
              (volume cap, concentration limit) at onboarding?
            </li>
            <li>
              MSA versioning + re-signature — when the MSA template changes,
              do existing vendors re-sign? On what cadence?
            </li>
            <li>
              Suspended vendor behavior — block new applications, allow servicing?
              Auto-offboard after N days suspended?
            </li>
            <li>
              KYC provider selection — Trulioo vs Persona pilot before
              committing one as the production provider.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
