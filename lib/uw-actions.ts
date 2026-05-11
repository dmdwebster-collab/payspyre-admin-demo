/**
 * Underwriting Server Action helpers — pure functions over the existing
 * `executeAction()` state machine in lib/status-flow.ts. Adds Zod input
 * validation + the operator payload normalization that the route's
 * Server Actions need before they touch the repository.
 *
 * Tests cover this file; the Server Action thin layer
 * (app/underwriting/[applicationId]/decision/actions.ts) is exercised
 * through the UI in PR #4.5.1.
 */

import { z } from "zod";
import {
  executeAction,
  type ApplicationAction,
} from "./status-flow";
import type { Application, ApplicationStatusEvent } from "./types/application";
import type { CreditProduct } from "./types/credit-product";

const UW_ACTIONS = [
  "submit_for_underwriting",
  "request_credit_authorization",
  "request_bank_verification",
  "request_additional_info",
  "return_for_reprocessing",
  "approve",
  "reject",
  "register_offer_acceptance",
  "send_agreement",
  "register_agreement_signed",
  "cancel",
] as const satisfies readonly ApplicationAction[];

export type UWAction = (typeof UW_ACTIONS)[number];

export const UWActionInputSchema = z.object({
  action: z.enum(UW_ACTIONS),
  comments: z.string().max(1000).optional(),
});
export type UWActionInput = z.infer<typeof UWActionInputSchema>;

export interface DispatchUWActionArgs {
  application: Application;
  raw: unknown;
  actor: { actor_id: string; actor_name: string };
  product?: CreditProduct;
  /** Optional override for deterministic tests. */
  occurred_at?: string;
}

/**
 * Validate the operator's UW action submission, then delegate to the
 * canonical `executeAction()` state machine. Returns the next
 * Application + the audit event ready to persist.
 *
 * Throws Zod / StatusTransitionError / PreconditionError on bad input
 * or an illegal transition. The Server Action surfaces these as a
 * thrown error to Next's error boundary; PR #4.5.x wires a per-page
 * inline error UI.
 */
export function dispatchUWAction(args: DispatchUWActionArgs): {
  application: Application;
  event: ApplicationStatusEvent;
} {
  const input = UWActionInputSchema.parse(args.raw);
  const occurred_at =
    args.occurred_at ?? new Date().toISOString();
  return executeAction(
    args.application,
    input.action,
    {
      actor_id: args.actor.actor_id,
      actor_name: args.actor.actor_name,
      comments: input.comments,
      occurred_at,
    },
    args.product,
  );
}
