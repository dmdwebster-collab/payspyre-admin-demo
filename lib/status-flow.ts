/**
 * PaySpyre Application Status Flow — Pre-Origination → Active state machine.
 *
 * Source: docs/spec/application-status-flow.pdf (v1.00) and David Wilson's
 * Admin Dashboard review.
 *
 * Design notes:
 * - Stages CREDIT_REPORT, BANK_VERIFICATION, and APPLICATION_VERIFICATION can
 *   be performed at multiple points before approval. We model these as
 *   *check stages* — the application can move into and back out of any of
 *   them while in CREDIT_UNDERWRITING.
 *   ⚠ Optimisation we want to surface for David: spec lists these as
 *   sequential stages but the PDF explicitly says they "may be performed at
 *   different steps of the application process (before approval)". Treating
 *   them as parallel checks (any can be re-requested at any underwriting
 *   step) reduces application cycle time and matches what most modern
 *   originations engines do. Final call rests with David — see PR description.
 *
 * - All transitions are append-only: every state change writes an
 *   ApplicationStatusEvent so the Workflow tab in the UI is just a query.
 */

import type { ApplicationStatus } from "./types/enums";
import type { Application, ApplicationStatusEvent } from "./types/application";

export type ApplicationAction =
  | "complete_application"
  | "submit_for_underwriting"
  | "request_credit_authorization"
  | "request_bank_verification"
  | "request_additional_info"
  | "return_for_reprocessing"
  | "approve"
  | "reject"
  | "register_offer_acceptance"
  | "send_agreement"
  | "register_agreement_signed"
  | "activate_loan"
  | "cancel"
  | "close_repaid"
  | "close_renewed"
  | "close_refinanced"
  | "close_transferred"
  | "close_settlement"
  | "close_writeoff";

interface TransitionRule {
  /** Action label as surfaced in UI. */
  label: string;
  /** State the application moves to when the action is executed. */
  to: ApplicationStatus;
  /** Workplace(s) where this action is available. */
  workplaces: Array<"origination" | "underwriting" | "servicing" | "collections">;
}

type TransitionMap = Partial<Record<ApplicationAction, TransitionRule>>;

/**
 * Permitted actions per status, with target state and surfacing workplace.
 * Anything not listed here is rejected by `executeAction`.
 */
export const STATUS_TRANSITIONS: Record<ApplicationStatus, TransitionMap> = {
  PRE_ORIGINATION: {
    complete_application: { label: "Complete application", to: "ORIGINATION", workplaces: ["origination"] },
    cancel: { label: "Cancel application", to: "CANCELLED", workplaces: ["origination"] },
  },
  ORIGINATION: {
    submit_for_underwriting: { label: "Submit for credit underwriting", to: "CREDIT_UNDERWRITING", workplaces: ["origination"] },
    request_credit_authorization: { label: "Request credit authorization", to: "CREDIT_REPORT", workplaces: ["origination", "underwriting"] },
    request_bank_verification: { label: "Request bank verification", to: "BANK_VERIFICATION", workplaces: ["origination", "underwriting"] },
    request_additional_info: { label: "Request additional info", to: "APPLICATION_VERIFICATION", workplaces: ["origination", "underwriting"] },
    cancel: { label: "Cancel application", to: "CANCELLED", workplaces: ["origination"] },
  },
  CREDIT_REPORT: {
    return_for_reprocessing: { label: "Return for reprocessing", to: "CREDIT_UNDERWRITING", workplaces: ["underwriting"] },
    cancel: { label: "Cancel application", to: "CANCELLED", workplaces: ["underwriting"] },
  },
  BANK_VERIFICATION: {
    return_for_reprocessing: { label: "Return for reprocessing", to: "CREDIT_UNDERWRITING", workplaces: ["underwriting"] },
    cancel: { label: "Cancel application", to: "CANCELLED", workplaces: ["underwriting"] },
  },
  APPLICATION_VERIFICATION: {
    return_for_reprocessing: { label: "Return for reprocessing", to: "CREDIT_UNDERWRITING", workplaces: ["underwriting"] },
    cancel: { label: "Cancel application", to: "CANCELLED", workplaces: ["underwriting"] },
  },
  CREDIT_UNDERWRITING: {
    request_credit_authorization: { label: "Request credit report", to: "CREDIT_REPORT", workplaces: ["underwriting"] },
    request_bank_verification: { label: "Request bank verification", to: "BANK_VERIFICATION", workplaces: ["underwriting"] },
    request_additional_info: { label: "Request additional info", to: "APPLICATION_VERIFICATION", workplaces: ["underwriting"] },
    approve: { label: "Approve", to: "OFFER_ACCEPTANCE", workplaces: ["underwriting"] },
    reject: { label: "Reject", to: "REJECTED", workplaces: ["underwriting"] },
    cancel: { label: "Cancel application", to: "CANCELLED", workplaces: ["underwriting"] },
    return_for_reprocessing: { label: "Return for reprocessing", to: "ORIGINATION", workplaces: ["underwriting"] },
  },
  OFFER_ACCEPTANCE: {
    register_offer_acceptance: { label: "Register offer acceptance", to: "AGREEMENT_SIGNATURE", workplaces: ["underwriting"] },
    return_for_reprocessing: { label: "Return for reprocessing", to: "CREDIT_UNDERWRITING", workplaces: ["underwriting"] },
    cancel: { label: "Cancel application", to: "CANCELLED", workplaces: ["underwriting"] },
  },
  AGREEMENT_SIGNATURE: {
    register_agreement_signed: { label: "Mark agreement signed", to: "APPROVED", workplaces: ["underwriting"] },
    cancel: { label: "Cancel application", to: "CANCELLED", workplaces: ["underwriting"] },
  },
  APPROVED: {
    activate_loan: { label: "Activate loan", to: "ACTIVE", workplaces: ["servicing"] },
    reject: { label: "Reject", to: "REJECTED", workplaces: ["underwriting"] },
    cancel: { label: "Cancel application", to: "CANCELLED", workplaces: ["servicing", "underwriting"] },
  },
  ACTIVE: {
    close_repaid: { label: "Close — Repaid", to: "CLOSED", workplaces: ["servicing"] },
    close_renewed: { label: "Close — Renewed", to: "CLOSED", workplaces: ["servicing"] },
    close_refinanced: { label: "Close — Refinanced", to: "CLOSED", workplaces: ["servicing"] },
    close_transferred: { label: "Close — Transferred", to: "CLOSED", workplaces: ["servicing"] },
    close_settlement: { label: "Close — Settlement", to: "CLOSED", workplaces: ["collections", "servicing"] },
    close_writeoff: { label: "Close — Write-off", to: "CLOSED", workplaces: ["collections"] },
  },
  // Terminal states
  REJECTED: {},
  CANCELLED: {},
  CLOSED: {},
};

/** Returns the actions available from the given status. */
export function getAvailableActions(
  status: ApplicationStatus,
  workplace?: "origination" | "underwriting" | "servicing" | "collections",
): Array<{ action: ApplicationAction; label: string; to: ApplicationStatus }> {
  const map = STATUS_TRANSITIONS[status] ?? {};
  return (Object.entries(map) as Array<[ApplicationAction, TransitionRule]>)
    .filter(([, rule]) => !workplace || rule.workplaces.includes(workplace))
    .map(([action, rule]) => ({ action, label: rule.label, to: rule.to }));
}

/** Pure transition check — does NOT mutate. */
export function canTransition(from: ApplicationStatus, action: ApplicationAction): boolean {
  return Boolean(STATUS_TRANSITIONS[from]?.[action]);
}

export class StatusTransitionError extends Error {
  constructor(public from: ApplicationStatus, public action: ApplicationAction) {
    super(`Action "${action}" is not permitted from status "${from}".`);
    this.name = "StatusTransitionError";
  }
}

/**
 * Pure state transition. Returns the next Application + a status event ready
 * to append. No side effects (no DB writes, no API calls, no notifications).
 * Wire side effects in the route handler that calls this.
 */
export function executeAction(
  application: Application,
  action: ApplicationAction,
  payload: { actor_id: string; actor_name: string; comments?: string; occurred_at?: string },
): { application: Application; event: ApplicationStatusEvent } {
  const rule = STATUS_TRANSITIONS[application.status]?.[action];
  if (!rule) {
    throw new StatusTransitionError(application.status, action);
  }
  const occurred_at = payload.occurred_at ?? new Date().toISOString();
  const next: Application = { ...application, status: rule.to };

  // Stamp lifecycle timestamps where appropriate
  if (action === "submit_for_underwriting") next.submitted_at = occurred_at;
  if (action === "approve") next.approved_at = occurred_at;
  if (action === "activate_loan") next.activated_at = occurred_at;
  if (rule.to === "CLOSED" || rule.to === "REJECTED" || rule.to === "CANCELLED") {
    next.closed_at = occurred_at;
  }

  const event: ApplicationStatusEvent = {
    application_id: application.id,
    from_status: application.status,
    to_status: rule.to,
    action,
    actor_id: payload.actor_id,
    actor_name: payload.actor_name,
    comments: payload.comments,
    occurred_at,
  };
  return { application: next, event };
}
