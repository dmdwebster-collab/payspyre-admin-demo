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
import type { PaymentStatus } from "@/lib/types/payment";

interface Props {
  params: Promise<{ loanId: string }>;
}

function statusVariant(
  s: PaymentStatus,
): "active" | "paid" | "muted" | "renewed" | "writeoff" {
  switch (s) {
    case "POSTED":
      return "paid";
    case "SCHEDULED":
    case "PROCESSING":
      return "active";
    case "RETURNED":
    case "FAILED":
      return "writeoff";
    case "REVERSED":
      return "renewed";
    case "CANCELLED":
      return "muted";
    default:
      return "muted";
  }
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
 * Payments tab — read-only payment history (PR #4.3 scope: list view).
 * The full Collections-style retry / manual-post / reversal workflow lands
 * in PR #4.4.
 */
export default async function ServicingPaymentsTab({ params }: Props) {
  const { loanId } = await params;
  const payments = await repository.listPaymentsForLoan(loanId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            All inbound funds events for this loan, newest first. Includes
            scheduled, posted, returned, and reversed payments.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No payments on file for this loan.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Scheduled</th>
                  <th className="px-4 py-2 font-medium">Posted</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Method</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2">{fmt(p.scheduled_for)}</td>
                    <td className="px-4 py-2">{fmt(p.posted_at)}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatCAD(p.amount)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {p.method}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {p.source}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={statusVariant(p.status)}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {p.description ?? "—"}
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
        description="Manual payment posting, retry orchestration after a RETURNED/FAILED, and operator reversal. Surfaces alongside the Collections workplace queue."
        fields={[
          "Manual post (cash / cheque / wire)",
          "Retry NSF (reschedules new Payment with PAD)",
          "Reverse posted payment (audit-logged)",
          "Allocation override (waterfall: fees → interest → principal)",
          "Operator + comments + audit trail",
        ]}
      />
    </div>
  );
}
