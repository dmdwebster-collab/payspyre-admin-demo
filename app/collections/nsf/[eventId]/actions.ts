"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { repository } from "@/lib/data/repository";
import { applyResolution, buildRetry } from "@/lib/nsf-actions";

/**
 * Server Actions for the NSF detail page (PR #4.4.2).
 *
 * Delegate the state-transition math to lib/nsf-actions.ts (pure, fully
 * tested), then mutate the in-memory mock data via repository.ts mutators
 * and revalidate both the Collections queue and the detail page.
 *
 * In production the mutators become Supabase upserts — the Server Action
 * shape stays the same.
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function newPaymentId(): string {
  // Demo uses a timestamp-based id so re-running locally still gets unique
  // values without pulling in a uuid library. Production swaps for
  // `gen_random_uuid()` via Supabase.
  return `pay-retry-${Date.now().toString(36)}`;
}

/**
 * Form Server Actions return `Promise<void>` per Next 14's form action
 * contract. Success path redirects (which throws); failure path throws
 * an Error that Next surfaces to the global error boundary. PR #4.4.x
 * adds a per-page error UI; for now, an unhandled error means the form
 * submission failed and the operator sees the framework error page.
 */

export async function resolveNSFEventAction(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const event = await repository.getNSFEvent(eventId);
  if (!event) throw new Error(`NSF event ${eventId} not found`);

  const resolution = formData.get("resolution");
  const resolved_on = formData.get("resolved_on") || undefined;
  const comments = formData.get("comments") || undefined;
  const ptpAmountRaw = formData.get("ptp_amount");
  const ptp_amount =
    typeof ptpAmountRaw === "string" && ptpAmountRaw.length > 0
      ? Number(ptpAmountRaw)
      : undefined;
  const ptp_due_date = formData.get("ptp_due_date") || undefined;
  const ptp_method = formData.get("ptp_method") || undefined;

  const { next } = applyResolution(event, {
    resolution,
    resolved_on,
    comments,
    ptp_amount,
    ptp_due_date,
    ptp_method,
  });
  await repository.updateNSFEvent(event.id, next);

  revalidatePath("/collections");
  revalidatePath(`/collections/nsf/${eventId}`);
  redirect("/collections");
}

export async function retryNSFPaymentAction(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const event = await repository.getNSFEvent(eventId);
  if (!event) throw new Error(`NSF event ${eventId} not found`);

  const amountRaw = formData.get("amount");
  const amount = typeof amountRaw === "string" ? Number(amountRaw) : NaN;
  const scheduled_for = formData.get("scheduled_for") || todayIso();
  const method = formData.get("method") || "PAD";

  const { retry, next } = buildRetry({
    event,
    raw: { amount, scheduled_for, method },
    payment_id: newPaymentId(),
  });
  await repository.addPayment(retry);
  await repository.updateNSFEvent(event.id, next);

  revalidatePath("/collections");
  revalidatePath(`/collections/nsf/${eventId}`);
  revalidatePath(`/servicing/${event.loan_id}/payments`);
  revalidatePath(`/servicing/${event.loan_id}/nsf`);
  redirect(`/collections/nsf/${eventId}`);
}
