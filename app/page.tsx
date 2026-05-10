import { repository } from "@/lib/data/repository";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardLabel, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatCAD, formatInt, formatPercent } from "@/lib/utils";
import type { Loan } from "@/lib/types/loan";

function loanStatusVariant(status: Loan["status"]) {
  switch (status) {
    case "ACTIVE":
      return "active" as const;
    case "PAID_OFF":
      return "paid" as const;
    case "RENEWED":
    case "REFINANCED":
      return "renewed" as const;
    case "WRITTEN_OFF":
      return "writeoff" as const;
    case "TRANSFERRED":
      return "transfer" as const;
    case "VOIDED":
      return "voided" as const;
    default:
      return "muted" as const;
  }
}

export default async function DashboardPage() {
  const [loans, kpis] = await Promise.all([repository.listLoans(), repository.getKpis()]);
  const summary = kpis.summary;

  // Recent loans = sort by origination_date desc, take 12
  const recent = [...loans]
    .sort((a, b) => (a.origination_date < b.origination_date ? 1 : -1))
    .slice(0, 12);

  const activeCount = loans.filter((l) => l.status === "ACTIVE").length;
  const avgDpd =
    loans
      .filter((l) => l.status === "ACTIVE")
      .reduce((s, l) => s + l.dpd, 0) / Math.max(1, activeCount);

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Portfolio snapshot · sourced from v1 demo data — schema migrated, real backend wiring lands in PR #2"
      />
      <div className="bg-navy-800 flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
          <Card className="border-l-[3px] border-l-gold pl-4">
            <CardLabel>Portfolio Size</CardLabel>
            <CardValue className="text-gold">
              {formatCAD(summary.total_outstanding_balance ?? 0, { compact: true })}
            </CardValue>
            <div className="text-[11px] text-ink-dim mt-1.5 font-mono">
              {formatInt(summary.open_accounts ?? 0)} open accounts
            </div>
          </Card>
          <Card className="border-l-[3px] border-l-ok pl-4">
            <CardLabel>Total Financed</CardLabel>
            <CardValue>
              {formatCAD(summary.total_financed ?? 0, { compact: true })}
            </CardValue>
            <div className="text-[11px] text-ink-dim mt-1.5 font-mono">
              {formatInt(summary.total_accounts ?? 0)} loans lifetime
            </div>
          </Card>
          <Card className="border-l-[3px] border-l-info pl-4">
            <CardLabel>Total Collected</CardLabel>
            <CardValue>
              {formatCAD(summary.total_collected ?? 0, { compact: true })}
            </CardValue>
            <div className="text-[11px] text-ink-dim mt-1.5 font-mono">
              Interest:{" "}
              {formatCAD(summary.total_interest_collected ?? 0, { compact: true })}
            </div>
          </Card>
          <Card className="border-l-[3px] border-l-warn pl-4">
            <CardLabel>Avg DPD (Active)</CardLabel>
            <CardValue>{avgDpd.toFixed(1)}</CardValue>
            <div className="text-[11px] text-ink-dim mt-1.5 font-mono">
              {formatInt(activeCount)} active loans
            </div>
          </Card>
        </div>

        <Card className="mb-4">
          <CardHeader>
            Recent Loans
            <span className="text-ink-mute font-medium normal-case tracking-normal text-[11px]">
              Top 12 by origination date
            </span>
          </CardHeader>
          <Table>
            <THead>
              <TR>
                <TH>Account</TH>
                <TH>Borrower</TH>
                <TH>Vendor</TH>
                <TH>Province</TH>
                <TH className="text-right">Financed</TH>
                <TH className="text-right">Term</TH>
                <TH className="text-right">Rate</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {recent.map((l) => (
                <TR key={l.id}>
                  <TD className="text-gold">{l.acct_num}</TD>
                  <TD className="font-sans text-[13px]">{l.borrower}</TD>
                  <TD>{l.vendor_name}</TD>
                  <TD>{l.province}</TD>
                  <TD className="text-right">{formatCAD(l.amount_financed)}</TD>
                  <TD className="text-right">{l.term} mo</TD>
                  <TD className="text-right">{formatPercent(l.rate)}</TD>
                  <TD>
                    <Badge variant={loanStatusVariant(l.status)}>
                      {l.status.replace("_", " ")}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>Portfolio By Status</CardHeader>
            <div className="space-y-2">
              {Object.entries(kpis.distributions.status)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3 text-[12px]">
                    <div className="min-w-[120px] text-ink-dim">{status.replace("_", " ")}</div>
                    <div className="flex-1 h-4 bg-navy-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold-dim to-gold"
                        style={{
                          width: `${(count / Math.max(...Object.values(kpis.distributions.status))) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="font-mono text-[11px] min-w-[60px] text-right text-ink">
                      {formatInt(count)}
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          <Card>
            <CardHeader>Portfolio By Term</CardHeader>
            <div className="space-y-2">
              {[
                "1-6 mo",
                "7-12 mo",
                "13-24 mo",
                "25-36 mo",
                "37-48 mo",
                "49+ mo",
              ]
                .filter((k) => kpis.distributions.term[k] != null)
                .map((bucket) => {
                  const v = kpis.distributions.term[bucket] ?? 0;
                  const max = Math.max(...Object.values(kpis.distributions.term));
                  return (
                    <div key={bucket} className="flex items-center gap-3 text-[12px]">
                      <div className="min-w-[120px] text-ink-dim">{bucket}</div>
                      <div className="flex-1 h-4 bg-navy-800 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-gold-dim to-gold"
                          style={{ width: `${(v / max) * 100}%` }}
                        />
                      </div>
                      <div className="font-mono text-[11px] min-w-[60px] text-right text-ink">
                        {formatInt(v)} accts
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
