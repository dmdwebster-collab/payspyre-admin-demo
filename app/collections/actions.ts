"use server";

import { revalidatePath } from "next/cache";
import { repository } from "@/lib/data/repository";
import { processPTPs } from "@/lib/ptp-tracker";

/**
 * Process PTPs Server Action (PR #4.4.4).
 *
 * Walks every NSFEvent with `ptp_status="OPEN"`, runs the
 * `processPTPs` decision (flip to KEPT on a matching posted Borrower
 * payment, BROKEN if past due, else stay OPEN), and persists the
 * transitions via `repository.updateNSFEvent`.
 *
 * Production runs this in a nightly cron; the demo exposes a button
 * on /collections so operators can trigger it on demand.
 */
export async function processPTPsAction(): Promise<void> {
  const [events, payments] = await Promise.all([
    repository.listAllNSFEvents(),
    repository.listAllPayments(),
  ]);
  const result = processPTPs(events, payments);

  // Persist only the events that transitioned (each transition matches an
  // event id 1:1 from the result.events array).
  for (const t of result.transitions) {
    const next = result.events.find((e) => e.id === t.event_id);
    if (next) await repository.updateNSFEvent(t.event_id, next);
  }

  revalidatePath("/collections");
  // Also revalidate any per-loan NSF tabs that touched events
  for (const t of result.transitions) {
    revalidatePath(`/servicing/${t.loan_id}/nsf`);
    revalidatePath(`/collections/nsf/${t.event_id}`);
  }
}
