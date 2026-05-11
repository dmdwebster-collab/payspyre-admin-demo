"use server";

import { revalidatePath } from "next/cache";
import { repository } from "@/lib/data/repository";
import { createUWNote } from "@/lib/uw-notes";

const DEMO_AUTHOR = {
  author_id: "user-uw-demo",
  author_name: "Demo Underwriter",
};

function newNoteId(): string {
  return `note-${Date.now().toString(36)}`;
}

/**
 * Server Action — append a UW note to an application. Pure helper does
 * the validation; we generate the id + persist + revalidate the Notes
 * tab + the Originations Workflow tab (which renders alongside notes
 * in the regulatory export).
 */
export async function addUWNoteAction(
  applicationId: string,
  formData: FormData,
): Promise<void> {
  const tag = formData.get("tag");
  const body = formData.get("body");

  const note = createUWNote({
    raw: { application_id: applicationId, tag, body },
    id: newNoteId(),
    author: DEMO_AUTHOR,
  });
  await repository.addUWNote(note);

  revalidatePath(`/underwriting/${applicationId}/notes`);
  revalidatePath(`/originations/${applicationId}/workflow`);
}
