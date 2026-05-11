"use server";

import { revalidatePath } from "next/cache";
import { repository } from "@/lib/data/repository";
import { applyCutoverStatus } from "@/lib/cutover";

const DEMO_OPERATOR = "Demo Operator";

/**
 * Server Action — flip a single CutoverItem's status. Operator identity
 * is hard-coded; replace with the authenticated user once Auth wires.
 */
export async function setCutoverItemStatusAction(
  itemId: string,
  formData: FormData,
): Promise<void> {
  const item = await repository.getCutoverItem(itemId);
  if (!item) throw new Error(`Cutover item ${itemId} not found`);

  const status = formData.get("status");
  const notes = formData.get("notes") || undefined;

  const next = applyCutoverStatus(item, {
    status,
    notes,
    completed_by: DEMO_OPERATOR,
  });
  await repository.updateCutoverItem(item.id, next);

  revalidatePath("/cutover");
}
