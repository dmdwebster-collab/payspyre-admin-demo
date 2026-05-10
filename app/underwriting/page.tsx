import { repository } from "@/lib/data/repository";
import { StubBanner } from "@/components/ui/stub-banner";
import { WorklistPreview } from "@/components/section/worklist-preview";

const UW_STATUSES = [
  "APPLICATION_VERIFICATION",
  "CREDIT_UNDERWRITING",
] as const;

export default async function UnderwritingPage() {
  const [apps, borrowers] = await Promise.all([
    repository.listApplications(),
    repository.listBorrowers(),
  ]);
  const queue = apps.filter((a) =>
    (UW_STATUSES as readonly string[]).includes(a.status),
  );
  const borrowersById = Object.fromEntries(borrowers.map((b) => [b.id, b]));

  const inAV = queue.filter((a) => a.status === "APPLICATION_VERIFICATION").length;
  const inCU = queue.filter((a) => a.status === "CREDIT_UNDERWRITING").length;
  const totalRequested = queue.reduce(
    (s, a) => s + (a.offer_amount ?? a.requested_amount),
    0,
  );

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

      <WorklistPreview
        title="Underwriting queue"
        emptyState="No applications currently in App Verification or Credit Underwriting."
        applications={queue}
        borrowersById={borrowersById}
        kpis={[
          { label: "In App Verification", value: inAV },
          { label: "In Credit Underwriting", value: inCU },
          { label: "Total queue", value: queue.length },
          {
            label: "Total $ in queue",
            value: `$${totalRequested.toLocaleString("en-CA")}`,
          },
        ]}
      />

      {queue.length > 0 && (
        <a
          href={`/underwriting/${queue[0].id}/decision`}
          className="block rounded-lg border border-gold-dim/40 bg-navy-700/40 p-4 text-sm text-ink-dim hover:border-gold-dim hover:bg-navy-700"
        >
          <div className="text-[11px] font-semibold tracking-wider text-gold uppercase mb-1">
            PR #4.5 · Underwriting Loan view (live)
          </div>
          Open the first queue item{" "}
          <span className="font-mono text-gold">
            {queue[0].application_number}
          </span>{" "}
          → Decision / Bureau / Bank / Verification / Notes. Decision tab
          shows offer summary, freshness state per check, and available
          state-machine actions (read-only).
        </a>
      )}

      <StubBanner
        pr="PR #4"
        description="Risk Score tab — composite score from Equifax bureau pull + bank-statement signals + application data. Per-rule pass/fail and Risk Ranking (Excellent | Good | Average | Weak | Poor)."
        fields={[
          "Composite risk score + ranking",
          "System recommendation (Approve | Decline | Refer) + timestamp",
          "Underwriter decision (manual override) + timestamp + reason",
          "Application Check sub-score",
          "Anti-Fraud / Geolocation / Cybersecurity check results",
          "Bank Account Check / sub-score (Flinks-derived)",
          "Credit Bureau Check / score (Equifax)",
          "Underwriting Rules engine results",
          "Re-score action (audit-logged)",
          "Toggle: count credit bureau / bank-account scoring per applicant",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Verifications tab — KYC + financial verification with predetermined sources. Each element listed with the source(s) used to verify and a timestamp; manual-review flagging where automated verification is insufficient."
        fields={[
          "Borrower Name — verified by ID + Bank verification",
          "Address / Phone / Email — cross-reference across sources",
          "Employer / Income — paystub + bank-deposit pattern",
          "ID document — validity + expiry + photo match",
          "Manual review flag with reason",
          "Re-run verification action (audit-logged)",
        ]}
      />
    </div>
  );
}
