import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCAD } from "@/lib/utils";
import { markMissedEntries, nextDueEntry } from "@/lib/servicing";
import type { ScheduleEntryStatus } from "@/lib/types/payment-schedule";

interface Props {
  params: Promise<{ loanId: string }>;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function statusVariant(
  s: ScheduleEntryStatus,
): "active" | "paid" | "muted" | "renewed" | "writeoff" {
  // Map schedule entry status onto the custom Badge variants.
  // PENDING → muted (neutral, future-tense)
  // PAID    → paid
  // PARTIAL → renewed (in-flight, partially complete)
  // MISSED  → writeoff (problem state)
  // WAIVED  → muted (operator override, doesn't owe)
  switch (s) {
    case "PAID":
      return "paid";
    case "PARTIAL":
      return "renewed";
    case "MISSED":
      return "writeoff";
    case "WAIVED":
      return "muted";
    default:
      return "muted";
  }
}

export default async function ServicingScheduleTab({ params }: Props) {
  const { loanId } = await params;
  const schedule = await repository.getActiveScheduleForLoan(loanId);
  if (!schedule) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>No active schedule on file</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This loan has no active payment schedule. Schedules are created
            at activation; the TurnKey export adapter (PR #4.2) lands them
            for migrated loans.
          </CardContent>
        </Card>
      </div>
    );
  }

  // markMissedEntries flips PENDING/PARTIAL entries past their due_date to
  // MISSED at render time. Production will run this in a nightly job once
  // the cutover lands; until then, on-demand evaluation is fine for a UI
  // that's read-only against fixtures.
  const rawEntries = await repository.listEntriesForSchedule(schedule.id);
  const entries = markMissedEntries(rawEntries);
  const next = nextDueEntry(entries);

  const totals = entries.reduce(
    (acc, e) => {
      acc.expected += e.expected_payment;
      acc.paid += e.paid_amount;
      return acc;
    },
    { expected: 0, paid: 0 },
  );
  const counts = entries.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<ScheduleEntryStatus, number>,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active schedule · v{schedule.schedule_version}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Frozen at {fmtDate(schedule.first_payment_date)} ·{" "}
              {schedule.payment_frequency} · 360-day Daily Simple Interest.
            </p>
          </div>
          <Badge variant="active">{schedule.number_of_payments} installments</Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Original principal</dt>
              <dd className="text-lg font-semibold">
                {formatCAD(schedule.original_principal)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">APR</dt>
              <dd className="text-lg font-semibold">
                {schedule.annual_rate.toFixed(2)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Regular payment</dt>
              <dd className="text-lg font-semibold">
                {formatCAD(schedule.regular_payment)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total interest</dt>
              <dd className="text-lg font-semibold">
                {formatCAD(schedule.total_interest)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Paid to date</dt>
              <dd className="text-lg font-semibold">{formatCAD(totals.paid)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Next installment
              </dt>
              <dd className="text-lg font-semibold">
                {next ? fmtDate(next.due_date) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">PAID / PARTIAL / MISSED</dt>
              <dd className="text-lg font-semibold">
                {counts.PAID ?? 0} / {counts.PARTIAL ?? 0} /{" "}
                <span
                  className={
                    (counts.MISSED ?? 0) > 0 ? "text-amber-600" : ""
                  }
                >
                  {counts.MISSED ?? 0}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total expected</dt>
              <dd className="text-lg font-semibold">
                {formatCAD(totals.expected)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                  <th className="px-4 py-2 font-medium text-right">Expected</th>
                  <th className="px-4 py-2 font-medium text-right">Interest</th>
                  <th className="px-4 py-2 font-medium text-right">Principal</th>
                  <th className="px-4 py-2 font-medium text-right">Paid</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Posted</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const isNext = next?.id === e.id;
                  return (
                    <tr
                      key={e.id}
                      className={`border-b last:border-b-0 ${
                        isNext ? "bg-muted/20" : ""
                      }`}
                    >
                      <td className="px-4 py-2 font-mono text-xs">{e.period}</td>
                      <td className="px-4 py-2">{fmtDate(e.due_date)}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatCAD(e.expected_payment)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                        {formatCAD(e.expected_interest)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatCAD(e.expected_principal)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {e.paid_amount > 0 ? formatCAD(e.paid_amount) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {e.paid_at ? fmtDate(e.paid_at) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
