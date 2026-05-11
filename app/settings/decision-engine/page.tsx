import Link from "next/link";
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

/**
 * Loan Settings — Decision Engine viewer (PR #4.8).
 *
 * Read-only display of the active DecisionStrategy. The editor lands
 * in PR #4.8.x once David Wilson commits the credit policy v0.
 */
export default async function LoanSettingsDecisionEnginePage() {
  const strategies = await repository.listDecisionStrategies();
  const active = strategies.find((s) => s.active);

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6">
      <header>
        <Link
          href="/settings"
          className="text-[11px] text-ink-mute tracking-wider uppercase hover:text-gold-dim"
        >
          ← Back to Settings
        </Link>
        <h1 className="text-2xl font-semibold text-ink mt-2">
          Loan Settings · Decision Engine
        </h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Scorecard rules + auto-decision thresholds applied to every
          underwriting evaluation. The launch strategy is a placeholder
          with industry-default thresholds — David Wilson&apos;s credit
          policy v0 lands in PR #4.8.x.
        </p>
      </header>

      {!active ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No active decision strategy.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-6">
            <div>
              <CardTitle>{active.name}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {active.description}
              </p>
            </div>
            <Badge variant={active.active ? "active" : "muted"}>
              {active.active ? "ACTIVE" : "INACTIVE"}
            </Badge>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                  Bureau score · auto-decline below
                </dt>
                <dd className="text-2xl font-semibold">
                  {active.bureau_score_auto_decline_below}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                  Bureau score · auto-approve at or above
                </dt>
                <dd className="text-2xl font-semibold">
                  {active.bureau_score_auto_approve_at_or_above}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                  Auto-approve max amount
                </dt>
                <dd className="text-2xl font-semibold">
                  {formatCAD(active.auto_approve_max_amount_cad)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                  Ability-to-pay score · floor
                </dt>
                <dd className="text-2xl font-semibold">
                  {active.ability_to_pay_score_min}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                  Max NSF in 90 days
                </dt>
                <dd className="text-2xl font-semibold">
                  {active.max_nsf_count_90d}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                  Bankruptcy lookback
                </dt>
                <dd className="text-2xl font-semibold">
                  {active.bankruptcy_lookback_months} months
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Decision tree</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Order of evaluation. First hard fail wins; otherwise the soft
            thresholds decide.
          </p>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>
              NSF count in 90d above limit → <strong>AUTO_DECLINE</strong>
            </li>
            <li>
              Bankruptcy within lookback → <strong>AUTO_DECLINE</strong>
            </li>
            <li>
              Bureau score below decline floor → <strong>AUTO_DECLINE</strong>
            </li>
            <li>
              Amount over auto-approve cap → <strong>MANUAL_REVIEW</strong>
            </li>
            <li>
              Bureau ≥ auto-approve floor AND ability ≥ floor →{" "}
              <strong>AUTO_APPROVE</strong>
            </li>
            <li>
              Otherwise → <strong>MANUAL_REVIEW</strong>
            </li>
          </ol>
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.8"
        description="Editor for tuning thresholds + creating new strategies. Once David commits the credit policy v0, the placeholder strategy gets replaced via this UI. Per-bracket decision_strategy_id binding (per PR #3.1) lands here too — David's stated goal of varying approval strategy by loan size."
        fields={[
          "Threshold editors (numeric inputs with min/max guards)",
          "Strategy versioning (immutable history of edits)",
          "Bind per-bracket strategy via amount_brackets[].decision_strategy_id",
          "Hard-fail rule editor (custom predicates)",
          "Refer-to-human queue routing config",
          "A/B / shadow strategy support for policy changes",
        ]}
      />
    </div>
  );
}
