import { repository } from "@/lib/data/repository";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatCAD, formatPercent } from "@/lib/utils";
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

export default async function AccountsPage() {
  const loans = await repository.listLoans();
  const sorted = [...loans].sort((a, b) =>
    a.origination_date < b.origination_date ? 1 : -1,
  );

  return (
    <>
      <Topbar
        title="Accounts"
        subtitle={`All ${loans.length} loans across vendors · click an account in PR #2 for full detail`}
      />
      <div className="bg-navy-800 flex-1 overflow-y-auto p-6">
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Account</TH>
                <TH>Borrower</TH>
                <TH>Vendor</TH>
                <TH>Province</TH>
                <TH className="text-right">Financed</TH>
                <TH className="text-right">Outstanding</TH>
                <TH className="text-right">Term</TH>
                <TH className="text-right">Rate</TH>
                <TH className="text-right">DPD</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {sorted.map((l) => (
                <TR key={l.id}>
                  <TD className="text-gold">{l.acct_num}</TD>
                  <TD className="font-sans text-[13px]">{l.borrower}</TD>
                  <TD>{l.vendor_name}</TD>
                  <TD>{l.province}</TD>
                  <TD className="text-right">{formatCAD(l.amount_financed)}</TD>
                  <TD className="text-right">{formatCAD(l.principal_balance)}</TD>
                  <TD className="text-right">{l.term} mo</TD>
                  <TD className="text-right">{formatPercent(l.rate)}</TD>
                  <TD className="text-right">{l.dpd}</TD>
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
      </div>
    </>
  );
}
