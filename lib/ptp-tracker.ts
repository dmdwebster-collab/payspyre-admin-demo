/**
 * PTP follow-through tracker (PR #4.4.4).
 *
 * Pure function that walks open PTPs and decides whether to flip each
 * to KEPT or BROKEN given the current Payment book + asOf date.
 *
 * Decision rules (in order of evaluation per event):
 *   1. If a Payment from source=BORROWER posted on or before
 *      `ptp_due_date` with `amount` within `tolerance_cad` of
 *      `ptp_amount` → KEPT.
 *   2. Else if `ptp_due_date` < `asOf` (date-only comparison) → BROKEN.
 *   3. Else still OPEN, no transition.
 *
 * Production wires this into a nightly job; the demo runs it on demand
 * via the `processPTPsAction` Server Action.
 *
 * No I/O. Pure given inputs. The caller persists the returned events
 * via `repository.updateNSFEvent` and shows the audit summary.
 */

import type { NSFEvent, PTPStatus } from "./types/nsf-event";
import type { Payment } from "./types/payment";

export interface PTPTransition {
  event_id: string;
  loan_id: string;
  prev_status: PTPStatus;
  next_status: PTPStatus;
  reason:
    | "matching_payment_posted"
    | "ptp_due_date_passed";
  matching_payment_id?: string;
}

export interface ProcessPTPsResult {
  events: NSFEvent[];
  transitions: PTPTransition[];
  open_count: number; // remaining OPEN after processing
}

const DEFAULT_TOLERANCE_CAD = 1.0;

function toIsoDate(s: string): string {
  return s.slice(0, 10);
}

/**
 * Find the first Payment that satisfies the PTP terms for an event:
 *   - Same loan_id
 *   - source = BORROWER (collections-source payments are the retry, not
 *     the kept PTP)
 *   - status = POSTED
 *   - posted_at date ≤ ptp_due_date
 *   - amount within tolerance of ptp_amount
 */
function findKeptPayment(
  event: NSFEvent,
  payments: Payment[],
  tolerance: number,
): Payment | undefined {
  if (event.ptp_amount == null || !event.ptp_due_date) return undefined;
  return payments.find(
    (p) =>
      p.loan_id === event.loan_id &&
      p.source === "BORROWER" &&
      p.status === "POSTED" &&
      p.posted_at != null &&
      toIsoDate(p.posted_at) <= event.ptp_due_date! &&
      Math.abs(p.amount - event.ptp_amount!) <= tolerance,
  );
}

/**
 * Walk every NSFEvent with `ptp_status === "OPEN"` and decide whether
 * to transition to KEPT, BROKEN, or stay OPEN. Pure.
 */
export function processPTPs(
  events: NSFEvent[],
  payments: Payment[],
  asOf: Date = new Date(),
  tolerance_cad: number = DEFAULT_TOLERANCE_CAD,
): ProcessPTPsResult {
  const asOfIso = toIsoDate(asOf.toISOString());
  const ts = asOf.toISOString();
  const transitions: PTPTransition[] = [];

  const next: NSFEvent[] = events.map((event) => {
    if (event.ptp_status !== "OPEN") return event;

    const kept = findKeptPayment(event, payments, tolerance_cad);
    if (kept) {
      transitions.push({
        event_id: event.id,
        loan_id: event.loan_id,
        prev_status: "OPEN",
        next_status: "KEPT",
        reason: "matching_payment_posted",
        matching_payment_id: kept.id,
      });
      return { ...event, ptp_status: "KEPT", updated_at: ts };
    }

    if (event.ptp_due_date && event.ptp_due_date < asOfIso) {
      transitions.push({
        event_id: event.id,
        loan_id: event.loan_id,
        prev_status: "OPEN",
        next_status: "BROKEN",
        reason: "ptp_due_date_passed",
      });
      return { ...event, ptp_status: "BROKEN", updated_at: ts };
    }

    return event;
  });

  const open_count = next.filter((e) => e.ptp_status === "OPEN").length;
  return { events: next, transitions, open_count };
}

/**
 * Helper for the Collections worklist: filter NSF events to those whose
 * PTP is OPEN and due within `withinDays` of asOf. Sorted by due date.
 */
export function ptpsDueSoon(
  events: NSFEvent[],
  withinDays: number,
  asOf: Date = new Date(),
): NSFEvent[] {
  const asOfIso = toIsoDate(asOf.toISOString());
  const horizon = new Date(asOf);
  horizon.setUTCDate(horizon.getUTCDate() + withinDays);
  const horizonIso = toIsoDate(horizon.toISOString());

  return events
    .filter(
      (e) =>
        e.ptp_status === "OPEN" &&
        e.ptp_due_date != null &&
        e.ptp_due_date >= asOfIso &&
        e.ptp_due_date <= horizonIso,
    )
    .sort((a, b) =>
      (a.ptp_due_date ?? "") < (b.ptp_due_date ?? "") ? -1 : 1,
    );
}
