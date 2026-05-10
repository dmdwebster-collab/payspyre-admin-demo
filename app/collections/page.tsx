import { StubBanner } from "@/components/ui/stub-banner";

export default function CollectionsPage() {
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

      <StubBanner
        pr="PR #3"
        description="Action Plan tab — DPD-bucketed playbook that drives outbound contact cadence and queue assignment."
        fields={[
          "Current DPD bucket (1–7 | 8–30 | 31–60 | 61–90 | 90+)",
          "Assigned collector",
          "Next action / due date",
          "Strategy (Soft | Standard | Final | Legal)",
          "Outbound contact cadence rules",
          "Last contact date / outcome",
        ]}
      />

      <StubBanner
        pr="PR #3"
        description="Promise to Pay tab — capture commitments and auto-flag broken promises."
        fields={[
          "Promised date",
          "Promised amount",
          "Method (EFT | Card | E-transfer)",
          "Status (Open | Kept | Broken | Cancelled)",
          "Captured by",
          "Linked transaction (on settlement)",
        ]}
      />
    </div>
  );
}
