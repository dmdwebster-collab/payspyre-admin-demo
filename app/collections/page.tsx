import { repository } from "@/lib/data/repository";
import { StubBanner } from "@/components/ui/stub-banner";
import { WorklistPreview } from "@/components/section/worklist-preview";

/**
 * Collections preview — in production this would join applications against the
 * loan + payment_schedule tables to compute true DPD per the rolling settlement
 * date. For PR #3 we use ACTIVE-status applications as the candidate population
 * and render a deterministic mock DPD-bucket distribution so the queue / KPI
 * shape is real-feeling without needing a live ledger.
 */
function mockDpdBucket(appId: string): "0-29" | "30-59" | "60-89" | "90+" | null {
  const seed = appId.charCodeAt(appId.length - 1);
  if (seed % 4 === 0) return "0-29";
  if (seed % 9 === 0) return "30-59";
  if (seed % 13 === 0) return "60-89";
  if (seed % 17 === 0) return "90+";
  return null;
}

export default async function CollectionsPage() {
  const [apps, borrowers] = await Promise.all([
    repository.listApplications(),
    repository.listBorrowers(),
  ]);
  const active = apps.filter((a) => a.status === "ACTIVE");
  const queue = active.filter((a) => mockDpdBucket(a.id) !== null);
  const borrowersById = Object.fromEntries(borrowers.map((b) => [b.id, b]));

  const buckets = {
    "0-29": queue.filter((a) => mockDpdBucket(a.id) === "0-29").length,
    "30-59": queue.filter((a) => mockDpdBucket(a.id) === "30-59").length,
    "60-89": queue.filter((a) => mockDpdBucket(a.id) === "60-89").length,
    "90+": queue.filter((a) => mockDpdBucket(a.id) === "90+").length,
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <h1 className="text-2xl font-semibold text-ink mt-1">Collections</h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Delinquent loans (DPD &gt; 0). Action plans, promise-to-pay tracking,
          and escalation queues. Inherits Servicing tabs plus the two below.
        </p>
      </header>

      <WorklistPreview
        title="Collections queue"
        emptyState="No delinquent loans — entire book is current."
        applications={queue}
        borrowersById={borrowersById}
        kpis={[
          { label: "DPD 0-29 (current month late)", value: buckets["0-29"] },
          { label: "DPD 30-59 (potential 30)", value: buckets["30-59"], tone: "warn" },
          { label: "DPD 60-89 (potential 60)", value: buckets["60-89"], tone: "warn" },
          { label: "DPD 90+ (potential write-off)", value: buckets["90+"], tone: "warn" },
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Action Plan tab — DPD-bucketed playbook that drives outbound contact cadence and queue assignment. Communicates next steps to system + user."
        fields={[
          "Current bucket + days in bucket",
          "Next action (Call | Email | SMS | Field visit | Legal)",
          "Cadence (e.g. every 3 days) per bucket",
          "Assigned collector",
          "Promise-to-pay scheduling",
          "Escalation triggers (broken PTP, bucket roll)",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Contacts tab — extends the originations Contacts log with a new 'Promise to Pay' contact type that records borrower commitments alongside the standard contact metadata."
        fields={[
          "Standard contact: channel / direction / agent / outcome / notes",
          "Promise to Pay: date of payment + amount + method",
          "PTP status (Open | Kept | Broken)",
          "Auto-broken when scheduled date passes without payment",
        ]}
      />
    </div>
  );
}
