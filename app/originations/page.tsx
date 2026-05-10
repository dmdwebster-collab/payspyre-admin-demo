import Link from "next/link";
import { repository } from "@/lib/data/repository";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatCAD } from "@/lib/utils";
import {
  applicationAgeDays,
  applicationStatusVariant,
  buildFunnelBuckets,
  filterApplications,
  STATUS_FULL_LABEL,
  STATUS_SHORT_LABEL,
  FUNNEL_ORDER,
} from "@/lib/originations";
import type { ApplicationStatus } from "@/lib/types/enums";

interface OriginationsPageProps {
  searchParams: Promise<{
    status?: string;
    vendor?: string;
    province?: string;
    q?: string;
  }>;
}

export default async function OriginationsPage({
  searchParams,
}: OriginationsPageProps) {
  const params = await searchParams;
  const [applications, vendors] = await Promise.all([
    repository.listApplications(),
    repository.listVendors(),
  ]);

  // Worklist scope: drop ACTIVE / CLOSED — those live in Servicing.
  const inFlight = applications.filter(
    (a) => a.status !== "ACTIVE" && a.status !== "CLOSED",
  );
  const filtered = filterApplications(inFlight, {
    status: params.status as ApplicationStatus | undefined,
    vendor_id: params.vendor,
    province: params.province as "BC" | "AB" | undefined,
    q: params.q,
  });

  // Sort: oldest first (highest age) so stale apps surface to the top.
  const sorted = [...filtered].sort((a, b) =>
    a.created_at < b.created_at ? -1 : 1,
  );

  const funnel = buildFunnelBuckets(inFlight);
  const activeStatus = params.status as ApplicationStatus | undefined;

  // Helper to build a query-string href that toggles a single param.
  const hrefFor = (overrides: Record<string, string | undefined>) => {
    const next = { ...params, ...overrides };
    const qs = Object.entries(next)
      .filter(([, v]) => v && v.length > 0)
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join("&");
    return qs ? `/originations?${qs}` : "/originations";
  };

  return (
    <>
      <Topbar
        title="Originations"
        subtitle={`${inFlight.length} in-flight applications across ${vendors.length} vendors`}
      />
      <div className="bg-navy-800 flex-1 overflow-y-auto">
        {/* Funnel KPI strip */}
        <div className="border-b border-line bg-navy-900 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href={hrefFor({ status: undefined })}
              className={`px-3 py-1.5 rounded border text-[11px] font-semibold tracking-wider uppercase transition-colors ${
                !activeStatus
                  ? "border-gold text-gold bg-gold/10"
                  : "border-line text-ink-dim hover:text-ink hover:border-ink-mute"
              }`}
            >
              All <span className="ml-1.5 font-mono">{inFlight.length}</span>
            </Link>
            {funnel.map((b) => (
              <Link
                key={b.status}
                href={hrefFor({ status: b.status })}
                className={`px-3 py-1.5 rounded border text-[11px] font-semibold tracking-wider uppercase transition-colors ${
                  activeStatus === b.status
                    ? "border-gold text-gold bg-gold/10"
                    : "border-line text-ink-dim hover:text-ink hover:border-ink-mute"
                }`}
                title={b.full_label}
              >
                {b.short_label}
                <span className="ml-1.5 font-mono">{b.count}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Worklist */}
        <div className="p-6">
          <Card>
            {sorted.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-ink-mute text-[13px]">
                  No applications match the current filters.
                </div>
                <Link
                  href="/originations"
                  className="text-gold-dim text-[12px] mt-2 inline-block hover:text-gold"
                >
                  Clear filters
                </Link>
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>App #</TH>
                    <TH>Borrower</TH>
                    <TH>Vendor</TH>
                    <TH>Prov.</TH>
                    <TH>Product</TH>
                    <TH className="text-right">Requested</TH>
                    <TH className="text-right">Term</TH>
                    <TH className="text-right">Age</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {sorted.map((a) => {
                    const age = applicationAgeDays(a);
                    const stale = age > 7 && FUNNEL_ORDER.indexOf(a.status) < 8;
                    return (
                      <TR key={a.id}>
                        <TD className="text-gold">
                          <Link
                            href={`/originations/${a.id}/summary`}
                            className="hover:underline"
                          >
                            {a.application_number}
                          </Link>
                        </TD>
                        <TD className="font-sans text-[13px]">
                          {a.primary_borrower_id ?? "—"}
                        </TD>
                        <TD>{a.vendor_name}</TD>
                        <TD>{a.province}</TD>
                        <TD>{a.credit_product_id ?? "—"}</TD>
                        <TD className="text-right">
                          {formatCAD(a.requested_amount)}
                        </TD>
                        <TD className="text-right">
                          {a.term_months ? `${a.term_months} mo` : "—"}
                        </TD>
                        <TD
                          className={`text-right ${
                            stale ? "text-warn" : "text-ink-dim"
                          }`}
                        >
                          {age}d
                        </TD>
                        <TD>
                          <Badge variant={applicationStatusVariant(a.status)}>
                            {STATUS_FULL_LABEL[a.status]}
                          </Badge>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </Card>
          <p className="text-ink-mute text-[11px] mt-3">
            Tip: click an application number to open the full Loan Header.
            Stale flag (yellow Age column) marks applications older than 7
            days that have not yet reached Offer Acceptance.{" "}
            <span className="text-gold-dim">
              Filters: status (chip strip above), vendor, province, q. URL
              query parameters are the source of truth.
            </span>
          </p>
        </div>
      </div>
    </>
  );
}

export const dynamic = "force-static";

// Pre-render all funnel-status filter pages at build time so the chip
// strip is instant.
export async function generateStaticParams() {
  return FUNNEL_ORDER.map((status) => ({ status }));
}

// Suppress the originations stub label that lived here before \u2014 the page
// is a real worklist now.
void STATUS_SHORT_LABEL;
