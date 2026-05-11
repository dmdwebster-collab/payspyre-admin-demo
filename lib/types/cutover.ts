import { z } from "zod";

/**
 * CutoverItem — one row in the per-provider cutover checklist.
 *
 * The cutover from TurnKey requires rotating credentials, switching
 * webhook URLs, and re-verifying contracts with each integration
 * provider. This entity is the source-of-truth for "what's left before
 * we can flip" — operations works through the list, ticking items as
 * they complete the underlying portal/CLI work.
 *
 * Predefined items are seeded from `cutover_items.json` (PR #4.7).
 * Production replaces the JSON fixture with a Supabase table; the
 * Server Action interface stays the same.
 */

export const CUTOVER_PROVIDERS = [
  "ZumRails",
  "Flinks",
  "SignNow",
  "SendGrid",
  "Equifax",
  "Walnut",
  "MessageBird",
] as const;
export type CutoverProvider = (typeof CUTOVER_PROVIDERS)[number];

export const CUTOVER_ITEM_STATUSES = ["PENDING", "DONE", "N/A"] as const;
export type CutoverItemStatus = (typeof CUTOVER_ITEM_STATUSES)[number];

export const CutoverItemSchema = z.object({
  id: z.string(),
  provider: z.enum(CUTOVER_PROVIDERS),
  key: z.string(), // Stable per-item key (e.g. "rotate_api_key")
  label: z.string(),
  description: z.string().nullable(),
  status: z.enum(CUTOVER_ITEM_STATUSES),
  /** Operator who last updated the status. Null until first transition. */
  completed_by: z.string().nullable(),
  /** When the status last moved off PENDING. */
  completed_at: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type CutoverItem = z.infer<typeof CutoverItemSchema>;
