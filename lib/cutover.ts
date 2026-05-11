/**
 * Cutover helpers — pure functions over the CutoverItem checklist
 * driving the /cutover workplace (PR #4.7). Tests cover this file;
 * the Server Action thin layer is exercised through the UI.
 */

import { z } from "zod";
import {
  type CutoverItem,
  type CutoverItemStatus,
  type CutoverProvider,
  CUTOVER_ITEM_STATUSES,
  CUTOVER_PROVIDERS,
} from "./types/cutover";

// --- Apply status -------------------------------------------------------

export const ApplyCutoverStatusInputSchema = z.object({
  status: z.enum(CUTOVER_ITEM_STATUSES),
  notes: z.string().max(1000).optional(),
  completed_by: z.string().min(1).max(120),
});
export type ApplyCutoverStatusInput = z.infer<
  typeof ApplyCutoverStatusInputSchema
>;

/**
 * Apply a status transition to a CutoverItem. Returns the next item.
 *
 * `completed_at` is stamped only when the status moves OFF `PENDING` for
 * the first time (DONE or N/A). A back-transition to PENDING clears
 * `completed_at` + `completed_by`.
 *
 * Pure; throws if `raw` doesn't satisfy the schema.
 */
export function applyCutoverStatus(
  item: CutoverItem,
  raw: unknown,
  now: Date = new Date(),
): CutoverItem {
  const input = ApplyCutoverStatusInputSchema.parse(raw);
  const ts = now.toISOString();
  const movingOffPending = item.status === "PENDING" && input.status !== "PENDING";
  const backToPending = item.status !== "PENDING" && input.status === "PENDING";

  return {
    ...item,
    status: input.status,
    notes: input.notes ?? item.notes,
    completed_by: backToPending ? null : input.completed_by,
    completed_at: backToPending
      ? null
      : movingOffPending
      ? ts
      : item.completed_at,
    updated_at: ts,
  };
}

// --- Grouping + KPIs ----------------------------------------------------

export interface CutoverProviderGroup {
  provider: CutoverProvider;
  items: CutoverItem[];
  total: number;
  done: number;
  na: number;
  pending: number;
}

/** Group items by provider in the canonical order. Empty providers omitted. */
export function groupByProvider(items: CutoverItem[]): CutoverProviderGroup[] {
  const out: CutoverProviderGroup[] = [];
  for (const provider of CUTOVER_PROVIDERS) {
    const group = items.filter((i) => i.provider === provider);
    if (group.length === 0) continue;
    out.push({
      provider,
      items: group,
      total: group.length,
      done: group.filter((i) => i.status === "DONE").length,
      na: group.filter((i) => i.status === "N/A").length,
      pending: group.filter((i) => i.status === "PENDING").length,
    });
  }
  return out;
}

export interface CutoverSummary {
  total: number;
  done: number;
  na: number;
  pending: number;
  /** True only when zero items remain PENDING. */
  ready: boolean;
}

export function summarize(items: CutoverItem[]): CutoverSummary {
  const done = items.filter((i) => i.status === "DONE").length;
  const na = items.filter((i) => i.status === "N/A").length;
  const pending = items.filter((i) => i.status === "PENDING").length;
  return {
    total: items.length,
    done,
    na,
    pending,
    ready: pending === 0,
  };
}

/** Type-guard so callers can narrow without re-importing the union. */
export function isCutoverStatus(s: string): s is CutoverItemStatus {
  return (CUTOVER_ITEM_STATUSES as readonly string[]).includes(s);
}
