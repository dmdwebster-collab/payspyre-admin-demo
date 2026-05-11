/**
 * Underwriting note helpers — pure functions for the Notes tab
 * (PR #4.5.2). Tests cover this file; the Server Action thin layer
 * (`app/underwriting/[applicationId]/notes/actions.ts`) is exercised
 * through the UI.
 */

import { z } from "zod";
import {
  type UWNote,
  type UWNoteTag,
  UW_NOTE_TAGS,
} from "./types/uw-note";

export const CreateUWNoteInputSchema = z.object({
  application_id: z.string().min(1),
  tag: z.enum(UW_NOTE_TAGS),
  body: z.string().min(1, "body is required").max(5000),
});
export type CreateUWNoteInput = z.infer<typeof CreateUWNoteInputSchema>;

export interface CreateUWNoteArgs {
  raw: unknown;
  /** Caller-supplied id for the new note (uuid in production). */
  id: string;
  author: { author_id: string; author_name: string };
  /** Override for deterministic tests. */
  now?: Date;
}

/**
 * Build a new UWNote. Pure; throws on validation failure.
 *
 * Notes are append-only — there is no edit / delete helper, by design.
 * If a correction is needed the underwriter writes a follow-up note
 * referencing the prior one.
 */
export function createUWNote(args: CreateUWNoteArgs): UWNote {
  const input = CreateUWNoteInputSchema.parse(args.raw);
  const now = args.now ?? new Date();
  return {
    id: args.id,
    application_id: input.application_id,
    tag: input.tag as UWNoteTag,
    body: input.body.trim(),
    author_id: args.author.author_id,
    author_name: args.author.author_name,
    created_at: now.toISOString(),
  };
}

/** Newest first (descending by created_at). Pure. */
export function sortNewestFirst(notes: UWNote[]): UWNote[] {
  return [...notes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
