import { z } from "zod";
import { CONTACT_METHODS } from "./enums";

/**
 * Contact log + borrower preferences. Spec ref: Contacts tab.
 */
export const ContactLogSchema = z.object({
  id: z.string().uuid().optional(),
  application_id: z.string().optional(),
  loan_id: z.string().optional(),
  occurred_at: z.string().datetime(),
  user_id: z.string(),
  user_name: z.string(),
  method: z.enum(CONTACT_METHODS),
  subject: z.string(),
  result: z.string().optional(),
  status: z.enum(["Successful", "Failed", "NoAnswer", "LeftMessage"]),
  comments: z.string().optional(),
  body: z.string().optional(), // copy of the communication
  // Promise to Pay extension (Collections workplace)
  is_promise_to_pay: z.boolean().default(false),
  ptp_amount: z.number().nonnegative().optional(),
  ptp_date: z.string().optional(),
  ptp_method: z.enum(CONTACT_METHODS).optional(),
});
export type ContactLog = z.infer<typeof ContactLogSchema>;

export const ContactPreferencesSchema = z.object({
  borrower_id: z.string(),
  preferred_method: z.enum(CONTACT_METHODS).default("Email"),
  ok_to_contact_at_work: z.boolean().default(false),
  sms_opt_out: z.boolean().default(false),
  email_opt_out: z.boolean().default(false),
  call_opt_out: z.boolean().default(false),
  flags: z.array(z.string()).default([]),
});
export type ContactPreferences = z.infer<typeof ContactPreferencesSchema>;
