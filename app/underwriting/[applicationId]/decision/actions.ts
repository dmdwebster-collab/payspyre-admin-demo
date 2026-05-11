"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { repository } from "@/lib/data/repository";
import { dispatchUWAction } from "@/lib/uw-actions";

/**
 * Underwriting Decision Server Action (PR #4.5.1).
 *
 * Reads the action + comments from the form, delegates to the pure
 * helper, then mutates the in-memory mock data via the repository
 * mutators added in this PR (`updateApplication`, `addApplicationStatusEvent`).
 *
 * Operator identity is hard-coded for the demo. PR #4.5.x replaces this
 * with the authenticated user once Auth wiring lands.
 */

const DEMO_OPERATOR = {
  actor_id: "user-uw-demo",
  actor_name: "Demo Underwriter",
};

export async function runUWActionFromForm(
  applicationId: string,
  formData: FormData,
): Promise<void> {
  const application = await repository.getApplication(applicationId);
  if (!application) throw new Error(`Application ${applicationId} not found`);

  const action = formData.get("action");
  const comments = formData.get("comments") || undefined;

  const { application: next, event } = dispatchUWAction({
    application,
    raw: { action, comments },
    actor: DEMO_OPERATOR,
    // product omitted intentionally — PR #4.5.x will load it via
    // application.credit_product_id once the lookup wires through.
  });

  await repository.updateApplication(application.id, next);
  await repository.addApplicationStatusEvent(event);

  revalidatePath("/underwriting");
  revalidatePath(`/underwriting/${applicationId}/decision`);
  revalidatePath(`/originations/${applicationId}/workflow`);

  // After approve/reject the application leaves the underwriting queue,
  // so redirect back to the queue. For request_* actions (which keep the
  // app in the workplace), redirect back to the decision tab.
  const stillUW = next.status === "CREDIT_UNDERWRITING";
  redirect(stillUW ? `/underwriting/${applicationId}/decision` : "/underwriting");
}
