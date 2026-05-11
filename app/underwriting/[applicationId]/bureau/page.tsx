import { notFound } from "next/navigation";
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
import { isCheckFresh } from "@/lib/types/credit-product";

interface Props {
  params: Promise<{ applicationId: string }>;
}

/**
 * Bureau tab — mock Equifax viewer (PR #4.5.3).
 *
 * Renders a structured Equifax-shaped pull derived deterministically
 * from the application id (so demos look stable). The "Run bureau"
 * Server Action + real Equifax integration land in PR #4.5.x once
 * credentials + sandbox endpoint are wired.
 */
export default async function UnderwritingBureauTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  // Mock data — deterministic per application id so the demo stays stable.
  const seed = application.id
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const score = 600 + (seed % 200); // 600-799
  const ageMonths = 24 + (seed % 120); // 24-143 mo
  const tradelines = [
    {
      type: "Credit Card",
      lender: "RBC Royal Bank",
      opened: "2018-03-12",
      balance: 1250,
      limit: 5000,
      status: "Open · current",
    },
    {
      type: "Auto Loan",
      lender: "Scotiabank",
      opened: "2022-08-01",
      balance: 14200,
      limit: 26000,
      status: "Open · current",
    },
    {
      type: "Line of Credit",
      lender: "TD Canada Trust",
      opened: "2020-11-04",
      balance: 0,
      limit: 10000,
      status: "Open · zero balance",
    },
  ];
  const inquiries24mo = (seed % 4) + 1;
  const collections = (seed % 7) === 0 ? 1 : 0;
  const publicRecords = 0;
  const bureauPulledAt = application.credit_report_completed_at;
  const fresh = isCheckFresh(bureauPulledAt, 30);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-6">
          <div>
            <CardTitle>Equifax Canada bureau report</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Mock pull for the demo. PR #4.5.x wires the real Equifax
              integration + run-bureau Server Action.
            </p>
          </div>
          <Badge variant={fresh ? "active" : "muted"}>
            {bureauPulledAt
              ? fresh
                ? "FRESH (mock)"
                : "STALE (mock)"
              : "NOT RUN (mock)"}
          </Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Composite score
              </dt>
              <dd className="text-3xl font-semibold">{score}</dd>
              <dd className="text-xs text-muted-foreground mt-1">
                {score >= 720
                  ? "Strong"
                  : score >= 660
                  ? "Average"
                  : score >= 580
                  ? "Weak"
                  : "Poor"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Credit age
              </dt>
              <dd className="text-2xl font-semibold">
                {Math.floor(ageMonths / 12)}y {ageMonths % 12}mo
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Inquiries (24 mo)
              </dt>
              <dd className="text-2xl font-semibold">{inquiries24mo}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Collections
              </dt>
              <dd
                className={
                  "text-2xl font-semibold " +
                  (collections > 0 ? "text-amber-600" : "")
                }
              >
                {collections}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Public records
              </dt>
              <dd className="text-2xl font-semibold">{publicRecords}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Pulled at
              </dt>
              <dd className="text-sm font-mono">
                {bureauPulledAt
                  ? new Date(bureauPulledAt).toLocaleString("en-CA")
                  : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tradelines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Lender</th>
                <th className="px-4 py-2 font-medium">Opened</th>
                <th className="px-4 py-2 font-medium text-right">Balance</th>
                <th className="px-4 py-2 font-medium text-right">Limit</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tradelines.map((t, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{t.type}</td>
                  <td className="px-4 py-2">{t.lender}</td>
                  <td className="px-4 py-2 font-mono text-xs">{t.opened}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatCAD(t.balance)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                    {formatCAD(t.limit)}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {t.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.5.1"
        description="Server Action runBureauForApplication that calls Equifax + parses the response into the structured shape this page already renders. Operator-triggered with audit-logged pull receipt; per-product `requires_credit_bureau` toggle gates the action. Stamps `credit_report_completed_at` on the Application."
        fields={[
          "Server Action: runBureauForApplication(applicationId)",
          "Equifax Canada hard-pull integration (PaySpyre member number)",
          "Parse response → tradelines / inquiries / collections / public records",
          "Stamp credit_report_completed_at + bureau_score on the Application",
          "Per-product toggle: requires_credit_bureau",
          "Adverse-action notice template hook",
        ]}
      />
    </div>
  );
}
