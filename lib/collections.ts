/**
 * Collections helpers — pure functions over the PR #4.1 servicing data
 * model that produce the Collections workplace's worklist.
 *
 * Strategy: the queue is driven by **unresolved NSF events**. Each event
 * carries an `occurred_at` from which we derive a DPD (days since the
 * NSF) and a bucket. Production will fold in MISSED schedule entries +
 * delinquency calculated against the active payment schedule, but for
 * PR #4.4 the NSF-driven view is the minimum useful queue — it directly
 * matches how Collections operators currently triage in TurnKey.
 *
 * No I/O. No mutation. Deterministic given inputs.
 */

import type { NSFEvent } from "./types/nsf-event";

export type DPDBucket = "0-29" | "30-59" | "60-89" | "90+";

export const DPD_BUCKET_ORDER: DPDBucket[] = ["0-29", "30-59", "60-89", "90+"];

/** Days between two dates, rounded to the nearest whole day. Inclusive-start. */
export function daysSince(iso: string, asOf: Date = new Date()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  const diff = asOf.getTime() - t;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** Map a numeric DPD to its bucket label. 0-29 / 30-59 / 60-89 / 90+. */
export function dpdBucket(dpd: number): DPDBucket {
  if (dpd >= 90) return "90+";
  if (dpd >= 60) return "60-89";
  if (dpd >= 30) return "30-59";
  return "0-29";
}

export interface CollectionsQueueItem {
  event: NSFEvent;
  dpd: number;
  bucket: DPDBucket;
}

/**
 * Build the Collections queue from a list of NSF events.
 *
 * Filtering: only **unresolved** events appear (resolved_at === null).
 * Resolved events live in Archive / Reports, not the active queue.
 *
 * Sorting: by DPD descending so the oldest issues surface first — that's
 * the triage order operators expect, and matches "90+ bucket worked
 * before 0-29" in the existing collections playbook.
 */
export function collectionsQueueFromNSF(
  events: NSFEvent[],
  asOf: Date = new Date(),
): CollectionsQueueItem[] {
  const unresolved = events.filter((e) => e.resolved_at === null);
  const items: CollectionsQueueItem[] = unresolved.map((event) => {
    const dpd = daysSince(event.occurred_at, asOf);
    return { event, dpd, bucket: dpdBucket(dpd) };
  });
  items.sort((a, b) => b.dpd - a.dpd);
  return items;
}

/** Count items per bucket, returning a record with every bucket present (0s included). */
export function bucketCounts(
  items: CollectionsQueueItem[],
): Record<DPDBucket, number> {
  const out: Record<DPDBucket, number> = { "0-29": 0, "30-59": 0, "60-89": 0, "90+": 0 };
  for (const item of items) out[item.bucket]++;
  return out;
}

/** Sum the NSF fees across a queue — useful for the worklist KPI strip. */
export function totalNSFFees(items: CollectionsQueueItem[]): number {
  return items.reduce((s, i) => s + i.event.nsf_fee_charged, 0);
}
