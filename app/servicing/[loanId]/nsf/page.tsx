import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StubBanner } from "@/components/ui/stub-banner";
import { formatCAD } from "@/lib/utils";

interface Props {
  params: Promise<{ loanId: string }>;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * NSF tab — read-only history of returned-payment events with reason +
 * resolution. The retry orchestration + collections workflow attached to
 * each unresolved NSF lands in PR #4.4.
 */
export default async function ServicingNSFTab({ params }: Props) {
  const { loanId } = await params;
  const events = await repository.listNSFEventsForLoan(loanId);
  const unresolved = events.filter((e) => e.resolved_at === null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>NSF events</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Returned-payment records for this loan. Unresolved events feed
              the Collections queue.
            </p>
          </div>
          {unresolved.length > 0 && (
            <Badge variant="writeoff">{unresolved.length} unresolved</Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No NSF events on file for this loan.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Occurred</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium text-right">NSF fee</th>
                  <th className="px-4 py-2 font-medium">Retry</th>
                  <th className="px-4 py-2 font-medium">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2">{fmt(e.occurred_at)}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs">{e.reason_code}</span>
                      {e.reason_description && (
                        <div className="text-xs text-muted-foreground">
                          {e.reason_description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatCAD(e.nsf_fee_charged)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {e.retry_attempted
                        ? `attempted ${fmt(e.retry_at)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {e.resolution ? (
                        <Badge
                          variant={
                            e.resolution === "RECOVERED"
                              ? "paid"
                              : e.resolution === "WRITTEN_OFF"
                              ? "writeoff"
                              : "renewed"
                          }
                        >
                          {e.resolution}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          (open)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.4"
        description="NSF queue + retry orchestration. Each unresolved event surfaces a one-click retry (creates a fresh Payment), promise-to-pay capture, and resolution workflow (RECOVERED / WRITTEN_OFF / PROMISE_TO_PAY / IN_COLLECTIONS)."
        fields={[
          "One-click retry (rescheduled PAD with new Payment id)",
          "Promise-to-pay capture (amount + date + method)",
          "Resolution workflow with operator + audit trail",
          "Bucketed by DPD for collections queue prioritization",
          "NSF rate per cohort / vendor in Reports (PR #4.6)",
        ]}
      />
    </div>
  );
}
