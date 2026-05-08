import { repository } from "@/lib/data/repository";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatCAD, formatInt } from "@/lib/utils";

export default async function VendorsPage() {
  const vendors = await repository.listVendors();

  return (
    <>
      <Topbar
        title="Vendors"
        subtitle={`${vendors.length} active vendor relationships · clinic-level performance`}
      />
      <div className="bg-navy-800 flex-1 overflow-y-auto p-6">
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Vendor ID</TH>
                <TH>Name</TH>
                <TH>Province</TH>
                <TH>Status</TH>
                <TH className="text-right">Open</TH>
                <TH className="text-right">Closed</TH>
                <TH className="text-right">Total Financed</TH>
                <TH className="text-right">Outstanding</TH>
                <TH className="text-right">Collected</TH>
                <TH className="text-right">NSFs</TH>
              </TR>
            </THead>
            <TBody>
              {vendors.map((v) => (
                <TR key={v.id}>
                  <TD className="text-gold">{v.id}</TD>
                  <TD className="font-sans text-[13px]">{v.name}</TD>
                  <TD>{v.province}</TD>
                  <TD>
                    <Badge variant={v.status === "ACTIVE" ? "active" : "muted"}>
                      {v.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">{formatInt(v.open_accounts)}</TD>
                  <TD className="text-right">{formatInt(v.closed_accounts)}</TD>
                  <TD className="text-right">
                    {formatCAD(v.total_financed, { compact: true })}
                  </TD>
                  <TD className="text-right">
                    {formatCAD(v.total_balance, { compact: true })}
                  </TD>
                  <TD className="text-right">
                    {formatCAD(v.total_collected, { compact: true })}
                  </TD>
                  <TD className="text-right">{formatInt(v.nsf_total)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </div>
    </>
  );
}
