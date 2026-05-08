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
import { generateSchedule } from "@/lib/amortization";

interface Props {
  params: Promise<{ applicationId: string }>;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function InitialScheduleTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const principal = application.offer_amount ?? application.requested_amount;
  const firstPayment = application.first_payment_date ?? "2026-06-01";
  const termMonths = application.term_months ?? 0;
  const interestRate = application.interest_rate ?? 0;

  // Guard: schedule needs a non-zero principal, term, and frequency.
  const canRender = principal > 0 && termMonths > 0 && interestRate >= 0;

  if (!canRender) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Initial Schedule unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cannot generate amortization preview — missing required offer
            terms (principal, term, or rate).
          </CardContent>
        </Card>
      </div>
    );
  }

  const schedule = generateSchedule({
    principal,
    annualRate: interestRate / 100,
    termMonths,
    frequency: application.payment_frequency ?? "Monthly",
    firstPaymentDate: firstPayment,
  });

  const isPreview = !application.offer_amount || !application.first_payment_date;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Amortization preview</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              360-day Daily Simple Interest. Recomputes when offer / term /
              frequency / first payment changes.
            </p>
          </div>
          {isPreview && (
            <Badge variant="renewed">
              Preview — using requested amount / placeholder first payment
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Principal</dt>
              <dd className="text-lg font-semibold">{formatCAD(principal)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Rate</dt>
              <dd className="text-lg font-semibold">
                {interestRate.toFixed(2)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Term</dt>
              <dd className="text-lg font-semibold">{termMonths} mo</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Frequency</dt>
              <dd className="text-lg font-semibold">
                {application.payment_frequency ?? "Monthly"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground"># Payments</dt>
              <dd className="text-lg font-semibold">
                {schedule.numberOfPayments}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Regular payment</dt>
              <dd className="text-lg font-semibold">
                {formatCAD(schedule.regularPayment)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total interest</dt>
              <dd className="text-lg font-semibold">
                {formatCAD(schedule.totalInterest)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total paid</dt>
              <dd className="text-lg font-semibold">
                {formatCAD(schedule.totalPaid)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Schedule table */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Due date</th>
                  <th className="px-4 py-2 font-medium">Days</th>
                  <th className="px-4 py-2 font-medium text-right">Payment</th>
                  <th className="px-4 py-2 font-medium text-right">Interest</th>
                  <th className="px-4 py-2 font-medium text-right">Principal</th>
                  <th className="px-4 py-2 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {schedule.rows.map((row) => (
                  <tr key={row.period} className="border-b last:border-b-0">
                    <td className="px-4 py-2 font-mono text-xs">{row.period}</td>
                    <td className="px-4 py-2">{fmtDate(row.paymentDate)}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {row.daysInPeriod}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatCAD(row.payment)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                      {formatCAD(row.interest)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatCAD(row.principal)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatCAD(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
