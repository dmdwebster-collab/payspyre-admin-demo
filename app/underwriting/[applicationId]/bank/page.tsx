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
 * Bank tab — mock Flinks Capital viewer (PR #4.5.3).
 *
 * Renders a structured Flinks-shaped bank verification derived
 * deterministically from the application id. The "Run Flinks" Server
 * Action + real integration land in PR #4.5.x.
 */
export default async function UnderwritingBankTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  // Mock data — deterministic per application id.
  const seed = application.id
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const incomeMonthly = 4500 + (seed % 5500); // $4,500 - $9,999
  const minBalance = (seed % 7) * 250; // $0 - $1,500
  const avgFreeCashFlow = 800 + (seed % 1500); // $800 - $2,299
  const nsfCount = (seed % 11) === 0 ? 1 : 0;
  const stopPaymentCount = 0;
  const microLenderCount = (seed % 5) === 0 ? 2 : 0;
  const abilityToPayScore = Math.min(
    95,
    50 +
      Math.floor((avgFreeCashFlow / 50) * 1) -
      nsfCount * 10 -
      microLenderCount * 5,
  );
  const balanceTrend: "Up" | "Flat" | "Down" =
    seed % 3 === 0 ? "Down" : seed % 3 === 1 ? "Flat" : "Up";
  const verifiedAt = application.bank_verification_completed_at;
  const fresh = isCheckFresh(verifiedAt, 30);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-6">
          <div>
            <CardTitle>Flinks bank verification</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Mock pull for the demo. PR #4.5.x wires the real Flinks login
              flow + run-Flinks Server Action.
            </p>
          </div>
          <Badge variant={fresh ? "active" : "muted"}>
            {verifiedAt
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
                Ability-to-pay score
              </dt>
              <dd className="text-3xl font-semibold">{abilityToPayScore}</dd>
              <dd className="text-xs text-muted-foreground mt-1">
                {abilityToPayScore >= 80
                  ? "Strong"
                  : abilityToPayScore >= 65
                  ? "Adequate"
                  : "Marginal"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Income (monthly)
              </dt>
              <dd className="text-2xl font-semibold">
                {formatCAD(incomeMonthly)}
              </dd>
              <dd className="text-xs text-muted-foreground mt-1">
                Source: Payroll
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Avg free cash flow
              </dt>
              <dd className="text-2xl font-semibold">
                {formatCAD(avgFreeCashFlow)}
              </dd>
              <dd className="text-xs text-muted-foreground mt-1">
                Per month
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Min balance (90d)
              </dt>
              <dd
                className={
                  "text-2xl font-semibold " +
                  (minBalance === 0 ? "text-amber-600" : "")
                }
              >
                {formatCAD(minBalance)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Balance trend
              </dt>
              <dd className="text-2xl font-semibold">
                <Badge
                  variant={
                    balanceTrend === "Up"
                      ? "active"
                      : balanceTrend === "Flat"
                      ? "muted"
                      : "writeoff"
                  }
                >
                  {balanceTrend}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                NSF count (90d)
              </dt>
              <dd
                className={
                  "text-2xl font-semibold " +
                  (nsfCount > 0 ? "text-amber-600" : "")
                }
              >
                {nsfCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Stop payments (90d)
              </dt>
              <dd className="text-2xl font-semibold">{stopPaymentCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                Micro-lender flags
              </dt>
              <dd
                className={
                  "text-2xl font-semibold " +
                  (microLenderCount > 0 ? "text-amber-600" : "")
                }
              >
                {microLenderCount}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.5.1"
        description="Server Action runFlinksForApplication that initiates the Flinks login flow, polls for completion, and parses the result into the structured shape this page already renders. Stamps `bank_verification_completed_at` + `ability_to_pay_score` on the Application; the Decision Engine (PR #4.8) then has real signals to evaluate."
        fields={[
          "Server Action: runFlinksForApplication(applicationId)",
          "Flinks login flow (borrower-initiated, returns to Originations)",
          "Income source + monthly amount detection",
          "Free cash flow + balance trend computation (90d / 365d depth)",
          "NSF + stop-payment + micro-lender pattern detection",
          "Stamp bank_verification_completed_at + ability_to_pay_score",
          "Per-product toggle: requires_bank_verification",
        ]}
      />
    </div>
  );
}
