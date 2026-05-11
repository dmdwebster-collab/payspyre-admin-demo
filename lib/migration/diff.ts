/**
 * Migration run-vs-run diff (PR #4.6.2).
 *
 * Pure helper that compares two MigrationRun rows side-by-side and
 * surfaces the deltas the dual-run reconciliation period needs:
 *
 *   - Per-entity counts: imported delta, failed delta
 *   - Money totals: delta of deltas (did we get closer to source totals?)
 *   - Issues: resolved (in prev not curr), new (in curr not prev),
 *     ongoing (in both)
 *
 * Pure; no I/O. Caller picks the two runs (typically prev = earlier
 * timestamp, curr = later) and renders the result.
 */

import type { MigrationRun } from "../types/migration-run";
import type { EntityKind } from "./types";

const ENTITY_KINDS: EntityKind[] = [
  "borrower",
  "application",
  "loan",
  "schedule",
  "transaction",
  "document",
];

export interface PerEntityDiff {
  entity: EntityKind;
  prev_imported: number;
  curr_imported: number;
  imported_delta: number;
  prev_failed: number;
  curr_failed: number;
  failed_delta: number;
}

export interface MoneyTotalDiff {
  label: string;
  prev_delta: number;
  curr_delta: number;
  /** Improvement: positive = curr is closer to source than prev. */
  improvement: number;
}

export interface IssuesDiff {
  resolved: string[];
  new_: string[];
  ongoing: string[];
}

export interface MigrationRunDiff {
  prev: { id: string; ran_at: string };
  curr: { id: string; ran_at: string };
  per_entity: PerEntityDiff[];
  money_totals: MoneyTotalDiff[];
  issues: IssuesDiff;
  /** True iff curr.ok is true and prev.ok was false. */
  newly_ok: boolean;
  /** True iff curr.ok is false and prev.ok was true. */
  newly_review: boolean;
}

export function diffMigrationRuns(
  prev: MigrationRun,
  curr: MigrationRun,
): MigrationRunDiff {
  const per_entity: PerEntityDiff[] = ENTITY_KINDS.map((entity) => {
    const p = prev.reconciliation.per_entity[entity] ?? {
      exported: 0,
      imported: 0,
      failed: 0,
      failure_rate: 0,
    };
    const c = curr.reconciliation.per_entity[entity] ?? {
      exported: 0,
      imported: 0,
      failed: 0,
      failure_rate: 0,
    };
    return {
      entity,
      prev_imported: p.imported,
      curr_imported: c.imported,
      imported_delta: c.imported - p.imported,
      prev_failed: p.failed,
      curr_failed: c.failed,
      failed_delta: c.failed - p.failed,
    };
  });

  const money_totals: MoneyTotalDiff[] = (
    [
      ["Principal advanced", "total_principal_advanced"],
      ["Payments received", "total_payments_received"],
      ["Outstanding principal", "total_outstanding_principal"],
    ] as const
  ).map(([label, key]) => {
    const prevDelta = prev.reconciliation.money_totals[key].delta;
    const currDelta = curr.reconciliation.money_totals[key].delta;
    // "Improvement" = how much closer to zero curr is than prev.
    // |prev| - |curr| → positive means curr is closer to source.
    const improvement = Math.abs(prevDelta) - Math.abs(currDelta);
    return {
      label,
      prev_delta: prevDelta,
      curr_delta: currDelta,
      improvement,
    };
  });

  const prevSet = new Set(prev.reconciliation.issues);
  const currSet = new Set(curr.reconciliation.issues);
  const issues: IssuesDiff = {
    resolved: [...prevSet].filter((i) => !currSet.has(i)),
    new_: [...currSet].filter((i) => !prevSet.has(i)),
    ongoing: [...prevSet].filter((i) => currSet.has(i)),
  };

  return {
    prev: { id: prev.id, ran_at: prev.ran_at },
    curr: { id: curr.id, ran_at: curr.ran_at },
    per_entity,
    money_totals,
    issues,
    newly_ok: !prev.reconciliation.ok && curr.reconciliation.ok,
    newly_review: prev.reconciliation.ok && !curr.reconciliation.ok,
  };
}
