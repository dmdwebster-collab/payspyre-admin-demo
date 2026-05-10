import { repository } from "@/lib/data/repository";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader } from "@/components/ui/card";
import { StubBanner } from "@/components/ui/stub-banner";
import { formatCAD, formatInt } from "@/lib/utils";

export default async function PerformancePage() {
  const kpis = await repository.getKpis();
  const monthly = kpis.monthly_originations;
  const months = Object.keys(monthly).sort();

  return (
    <>
      <Topbar
        title="Performance"
        subtitle="Originations & payments — full reports workplace lands in PR #3"
      />
      <div className="bg-navy-800 flex-1 overflow-y-auto p-6 space-y-4">
        <Card>
          <CardHeader>Monthly Originations</CardHeader>
          <div className="space-y-1.5">
            {months.slice(-12).map((m) => {
              const v = monthly[m];
              const max = Math.max(...months.map((mm) => monthly[mm]?.amount ?? 0));
              return (
                <div key={m} className="flex items-center gap-3 text-[12px]">
                  <div className="min-w-[80px] text-ink-dim font-mono">{m}</div>
                  <div className="flex-1 h-4 bg-navy-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold-dim to-gold"
                      style={{ width: `${((v?.amount ?? 0) / max) * 100}%` }}
                    />
                  </div>
                  <div className="font-mono text-[11px] min-w-[100px] text-right text-ink">
                    {formatCAD(v?.amount ?? 0, { compact: true })} · {formatInt(v?.count ?? 0)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <StubBanner
          pr="PR #3"
          description="Full Reports Workplace per spec — geographic heat map, business performance summary, risk reports, collection reports, losses, time series, portfolio details, operational reports, origination efficiency."
          fields={[
            "Portfolio size / disbursement / repaid / profit",
            "$ paid on time vs late",
            "Arrears $ & #",
            "Current Month Late (DPD 1–29)",
            "Potential 30 / 60 / 90+ buckets",
            "Top write-off reasons",
            "Active vs Closed vs New status",
            "Vendor / Provider breakdowns",
            "Risk ranking distribution",
            "Time series (definable timeframe)",
          ]}
        />
      </div>
    </>
  );
}
