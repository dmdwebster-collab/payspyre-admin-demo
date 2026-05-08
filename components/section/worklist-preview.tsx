import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { applicationStatusVariant, STATUS_SHORT_LABEL } from "@/lib/originations";
import type { Application } from "@/lib/types/application";
import type { Borrower } from "@/lib/types/borrower";
import { formatCAD } from "@/lib/utils";

interface Props {
  title: string;
  emptyState: string;
  applications: Application[];
  /** Optional borrower lookup so the preview can render real names. */
  borrowersById?: Record<string, Borrower>;
  /** Max rows to show in the preview. Defaults to 8. */
  limit?: number;
  /** Optional KPI tiles rendered above the table. */
  kpis?: Array<{ label: string; value: string | number; tone?: "default" | "warn" | "ok" }>;
}

/**
 * Compact worklist preview reused across Underwriting / Servicing / Collections /
 * Archive landing pages. Shows up to N applications matching the section's
 * status filter, with quick links into the full Originations Loan Header.
 */
export function WorklistPreview({
  title,
  emptyState,
  applications,
  borrowersById,
  limit = 8,
  kpis,
}: Props) {
  const rows = applications.slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {applications.length} matching {applications.length === 1 ? "record" : "records"}
            {applications.length > limit && ` · showing first ${limit}`}
          </p>
        </div>
      </CardHeader>

      {kpis && kpis.length > 0 && (
        <CardContent className="border-b">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label}>
                <dt className="text-xs text-muted-foreground">{k.label}</dt>
                <dd
                  className={
                    "text-lg font-semibold " +
                    (k.tone === "warn"
                      ? "text-amber-600"
                      : k.tone === "ok"
                      ? "text-emerald-700"
                      : "")
                  }
                >
                  {k.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      )}

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{emptyState}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">App #</th>
                <th className="px-4 py-2 font-medium">Borrower</th>
                <th className="px-4 py-2 font-medium">Vendor</th>
                <th className="px-4 py-2 font-medium">Province</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link
                      href={`/originations/${a.id}/summary`}
                      className="text-foreground hover:underline"
                    >
                      {a.application_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {a.primary_borrower_id
                      ? borrowersById?.[a.primary_borrower_id]
                        ? `${borrowersById[a.primary_borrower_id].first_name} ${borrowersById[a.primary_borrower_id].last_name}`
                        : a.primary_borrower_id
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">{a.vendor_name}</td>
                  <td className="px-4 py-2 text-xs">{a.province}</td>
                  <td className="px-4 py-2">
                    <Badge variant={applicationStatusVariant(a.status)}>
                      {STATUS_SHORT_LABEL[a.status] ?? a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {formatCAD(a.offer_amount ?? a.requested_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
