import { repository } from "@/lib/data/repository";
import { StubBanner } from "@/components/ui/stub-banner";
import { WorklistPreview } from "@/components/section/worklist-preview";

const ARCHIVE_STATUSES = ["REJECTED", "CANCELLED", "CLOSED"] as const;

export default async function ArchivePage() {
  const [apps, borrowers] = await Promise.all([
    repository.listApplications(),
    repository.listBorrowers(),
  ]);
  const archived = apps.filter((a) =>
    (ARCHIVE_STATUSES as readonly string[]).includes(a.status),
  );
  const borrowersById = Object.fromEntries(borrowers.map((b) => [b.id, b]));

  const rejected = archived.filter((a) => a.status === "REJECTED").length;
  const cancelled = archived.filter((a) => a.status === "CANCELLED").length;
  const closed = archived.filter((a) => a.status === "CLOSED").length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <h1 className="text-2xl font-semibold text-ink mt-1">Archive</h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Closed, paid-out, written-off, and declined applications/loans.
          Read-only snapshot of every artifact at the point of closure. Retained
          per PIPEDA + provincial retention schedules.
        </p>
      </header>

      <WorklistPreview
        title="Archived records"
        emptyState="No archived applications yet."
        applications={archived}
        borrowersById={borrowersById}
        kpis={[
          { label: "Rejected", value: rejected },
          { label: "Cancelled", value: cancelled },
          { label: "Closed (paid / written-off)", value: closed },
          { label: "Total archived", value: archived.length },
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Archive record view — read-only access to every artifact (application, borrower data, status history, documents, transaction ledger, communication log) frozen at point of closure. Loan Header displays method of closure with an icon (rejected / cancelled / repaid / written off / refinanced)."
        fields={[
          "Closure method icon + label",
          "Read-only Originations + Servicing tab views",
          "Frozen status history",
          "Frozen document set",
          "Frozen ledger",
          "Full export (CSV + PDF) for compliance",
        ]}
      />
    </div>
  );
}
