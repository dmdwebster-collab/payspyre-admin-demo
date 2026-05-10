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

/**
 * Mock Flinks Capital response — in production this is sourced from the
 * banking-verification provider. Key fields: institution, account, balances,
 * NSF count over trailing 90 days, average daily balance, monthly inflow.
 */
function mockFlinks(applicationId: string) {
  const seed = applicationId.charCodeAt(applicationId.length - 1);
  const verified = seed % 5 !== 0; // 80% verified
  return {
    verified,
    completed_at: verified ? "2026-05-06T14:23:00Z" : null,
    institution: "RBC Royal Bank",
    transit: "00010",
    institution_number: "003",
    account_last_four: String(1000 + (seed * 137) % 8999).slice(-4),
    account_type: "Chequing",
    account_holder: "Primary borrower (matches application)",
    current_balance: 2400 + (seed * 53) % 4000,
    average_balance_90d: 1800 + (seed * 41) % 2500,
    average_monthly_inflow: 6200 + (seed * 79) % 3800,
    nsf_count_90d: seed % 4,
    overdraft_count_90d: seed % 3,
    days_observed: 92,
  };
}

export default async function BankDetailsTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const flinks = mockFlinks(application.id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bank verification</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Source: Flinks Capital — banking aggregation provider
            </p>
          </div>
          {flinks.verified ? (
            <Badge variant="default" className="bg-emerald-600">
              Verified · {new Date(flinks.completed_at!).toLocaleDateString("en-CA")}
            </Badge>
          ) : (
            <Badge variant="muted">Not yet verified</Badge>
          )}
        </CardHeader>
      </Card>

      {flinks.verified && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Institution</dt>
                  <dd className="text-sm font-medium">{flinks.institution}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Type</dt>
                  <dd className="text-sm font-medium">{flinks.account_type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Transit / Inst</dt>
                  <dd className="text-sm font-medium font-mono">
                    {flinks.transit} / {flinks.institution_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Account</dt>
                  <dd className="text-sm font-medium font-mono">
                    ••••{flinks.account_last_four}
                  </dd>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <dt className="text-xs text-muted-foreground">Account holder</dt>
                  <dd className="text-sm font-medium">
                    {flinks.account_holder}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cash-flow signals (last {flinks.days_observed} days)</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Current balance</dt>
                  <dd className="text-lg font-semibold">
                    {formatCAD(flinks.current_balance)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Avg balance</dt>
                  <dd className="text-lg font-semibold">
                    {formatCAD(flinks.average_balance_90d)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Avg monthly inflow</dt>
                  <dd className="text-lg font-semibold">
                    {formatCAD(flinks.average_monthly_inflow)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">NSF (90d)</dt>
                  <dd
                    className={
                      "text-lg font-semibold " +
                      (flinks.nsf_count_90d >= 2 ? "text-amber-600" : "")
                    }
                  >
                    {flinks.nsf_count_90d}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Overdrafts (90d)</dt>
                  <dd
                    className={
                      "text-lg font-semibold " +
                      (flinks.overdraft_count_90d >= 2 ? "text-amber-600" : "")
                    }
                  >
                    {flinks.overdraft_count_90d}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
