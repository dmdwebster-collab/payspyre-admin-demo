import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StubBanner } from "@/components/ui/stub-banner";

/**
 * Activity tab — full audit log + ledger view. Stub in PR #4.3; the real
 * implementation queries application_status_events + loan_transactions +
 * NSF events and renders a unified timeline. Land in PR #4.6 alongside
 * the reconciliation dashboards.
 */
export default async function ServicingActivityTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Unified audit trail across status transitions, ledger postings,
            payments, NSF events, and operator actions on this loan.
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Activity feed not yet implemented. The data model is in place
          (application_status_events, loan_transactions, payments,
          nsf_events) — the unified timeline view lands in PR #4.6 as part
          of the reconciliation dashboards.
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.6"
        description="Unified timeline merging status transitions, ledger postings, payment lifecycle events, NSF outcomes, manual adjustments, and operator actions. Filterable by event type. Exportable as a regulatory artifact."
        fields={[
          "Timeline view (newest first, with filters)",
          "Event type filter (status / payment / NSF / adjustment / manual)",
          "Operator + IP + comments columns",
          "CSV export with PIPEDA-safe field masking",
          "Drill-down to source entity (transaction / payment / event)",
        ]}
      />
    </div>
  );
}
