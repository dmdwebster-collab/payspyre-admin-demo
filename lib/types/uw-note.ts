import { z } from "zod";

/**
 * UWNote — append-only underwriter note attached to an Application.
 *
 * Mirrors the shape used by the Originations Workflow tab's status
 * events: immutable rows with operator + timestamp. Notes complement
 * the status events with the underwriter's free-form rationale —
 * decision overrides, manual review reasons, "called the borrower",
 * etc. PR #4.6.x exports notes alongside the status events as a
 * single regulatory artifact per application.
 *
 * `tag` is an optional structured marker. The most important value is
 * `decision_rationale` — when an underwriter overrides the system
 * recommendation, the rationale must be captured with that tag for
 * the regulator file.
 */

export const UW_NOTE_TAGS = [
  "general",
  "decision_rationale",
  "manual_review",
  "borrower_contact",
  "vendor_contact",
] as const;
export type UWNoteTag = (typeof UW_NOTE_TAGS)[number];

export const UWNoteSchema = z.object({
  id: z.string(),
  application_id: z.string(),
  tag: z.enum(UW_NOTE_TAGS),
  body: z.string().min(1).max(5000),
  author_id: z.string(),
  author_name: z.string(),
  created_at: z.string().datetime(),
});
export type UWNote = z.infer<typeof UWNoteSchema>;
