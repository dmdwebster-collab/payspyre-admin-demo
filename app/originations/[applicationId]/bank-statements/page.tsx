import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCAD } from "@/lib/utils";

interface Props {
  params: Promise<{ applicationId: string }>;
}

interface Tx {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: "Income" | "Housing" | "Transport" | "Subscriptions" | "Discretionary" | "Transfer" | "NSF";
}

/**
 * Mock 90-day transaction sample. Sourced from Flinks in production.
 * Categories drive the cash-flow underwriting signals.
 */
function mockTx(applicationId: string): Tx[] {
  const seed = applicationId.charCodeAt(applicationId.length - 1);
  const base: Tx[] = [
    { id: "T1", date: "2026-05-06", description: "PAYROLL DEPOSIT", amount: 3120.45, category: "Income" },
    { id: "T2", date: "2026-05-05", description: "TRANSFER FROM SAVINGS", amount: 500.00, category: "Transfer" },
    { id: "T3", date: "2026-05-04", description: "SHELL OIL", amount: -85.20, category: "Transport" },
    { id: "T4", date: "2026-05-03", description: "SAFEWAY KELOWNA", amount: -142.18, category: "Discretionary" },
    { id: "T5", date: "2026-05-02", description: "RENT — KIRSCHNER MTG", amount: -1850.00, category: "Housing" },
    { id: "T6", date: "2026-05-01", description: "NETFLIX SUBSCRIPTION", amount: -16.99, category: "Subscriptions" },
    { id: "T7", date: "2026-04-30", description: "TELUS MOBILITY", amount: -78.40, category: "Subscriptions" },
    { id: "T8", date: "2026-04-29", description: "STARBUCKS", amount: -7.85, category: "Discretionary" },
    { id: "T9", date: "2026-04-22", description: "PAYROLL DEPOSIT", amount: 3120.45, category: "Income" },
    { id: "T10", date: "2026-04-15", description: "PAYROLL DEPOSIT", amount: 3120.45, category: "Income" },
  ];
  if (seed % 4 === 0) {
    base.splice(3, 0, {
      id: "TN",
      date: "2026-05-04",
      description: "NSF CHARGE — RBC",
      amount: -45.0,
      category: "NSF",
    });
  }
  return base;
}

function categoryClass(c: Tx["category"]) {
  if (c === "Income") return "text-emerald-700";
  if (c === "NSF") return "text-rose-700";
  return "text-foreground";
}

export default async function BankStatementsTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const tx = mockTx(application.id);
  const inflow = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const outflow = tx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const nsfCount = tx.filter((t) => t.category === "NSF").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>90-day cash-flow summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Inflow (sample)</dt>
              <dd className="text-lg font-semibold text-emerald-700">
                {formatCAD(inflow)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Outflow (sample)</dt>
              <dd className="text-lg font-semibold">{formatCAD(outflow)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Net (sample)</dt>
              <dd className="text-lg font-semibold">
                {formatCAD(inflow + outflow)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">NSF events</dt>
              <dd
                className={
                  "text-lg font-semibold " + (nsfCount > 0 ? "text-rose-700" : "")
                }
              >
                {nsfCount}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          <Badge variant="muted">Sample · last 10 of 90 days</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {tx.map((t) => (
                <tr key={t.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {t.date}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">{t.description}</td>
                  <td className="px-4 py-2 text-xs">
                    <Badge variant="muted">{t.category}</Badge>
                  </td>
                  <td
                    className={
                      "px-4 py-2 text-right font-mono text-sm " +
                      categoryClass(t.category)
                    }
                  >
                    {formatCAD(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
