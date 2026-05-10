import { StubBanner } from "@/components/ui/stub-banner";

export default function ArchivePage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <h1 className="text-2xl font-semibold text-ink mt-1">Archive</h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Closed, paid-out, written-off, and declined applications/loans. Read-only
          snapshot of every artifact at the point of closure. Retained per
          PIPEDA + provincial retention schedules.
        </p>
      </header>

      <StubBanner
        pr="PR #3"
        description="Archive list + record view — read-only access to historical data with full export."
        fields={[
          "Close type (Paid | Refinanced | Charged-off | Declined | Withdrawn)",
          "Close date",
          "Final balance",
          "All originations + servicing tabs (read-only)",
          "Document vault (immutable)",
          "Status-flow audit trail",
          "Restore-to-active (admin role only, audit-logged)",
        ]}
      />
    </div>
  );
}
