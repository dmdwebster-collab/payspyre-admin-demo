import { z } from "zod";
import { APPLICATION_STATUSES, PROVINCES, PAYMENT_FREQUENCIES } from "./enums";

/**
 * Loan application. Drives the Status Flow state machine.
 * Spec ref: docs/spec/application-status-flow.pdf + admin-dashboard-spec.md.
 */
export const ApplicationSchema = z.object({
  id: z.string(), // e.g. "APP-2026-00042"
  application_number: z.string(),
  status: z.enum(APPLICATION_STATUSES),
  vendor_id: z.string(),
  vendor_name: z.string(),
  provider: z.string(),
  province: z.enum(PROVINCES),

  // Borrowers (FK to Borrower records)
  primary_borrower_id: z.string().optional(),
  co_borrower_id: z.string().nullable().optional(),

  // Loan request
  credit_product_id: z.string().optional(),
  requested_amount: z.number().nonnegative(),
  offer_amount: z.number().nonnegative().nullable().optional(),
  term_months: z.number().int().positive().optional(),
  interest_rate: z.number().nonnegative().optional(),
  payment_frequency: z.enum(PAYMENT_FREQUENCIES).optional(),
  start_date: z.string().nullable().optional(),
  first_payment_date: z.string().nullable().optional(),

  // Audit
  created_by: z.string().optional(),
  created_at: z.string().datetime(),
  submitted_at: z.string().datetime().nullable().optional(),
  approved_at: z.string().datetime().nullable().optional(),
  activated_at: z.string().datetime().nullable().optional(),
  closed_at: z.string().datetime().nullable().optional(),
});
export type Application = z.infer<typeof ApplicationSchema>;

/**
 * Append-only record of every status transition. Spec ref: Workflow tab.
 */
export const ApplicationStatusEventSchema = z.object({
  id: z.string().uuid().optional(),
  application_id: z.string(),
  from_status: z.enum(APPLICATION_STATUSES).nullable(),
  to_status: z.enum(APPLICATION_STATUSES),
  action: z.string(), // string for forward-compat; validated against status-flow.ts
  actor_id: z.string(),
  actor_name: z.string(),
  comments: z.string().optional(),
  occurred_at: z.string().datetime(),
});
export type ApplicationStatusEvent = z.infer<typeof ApplicationStatusEventSchema>;
