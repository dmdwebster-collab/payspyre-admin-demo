/**
 * PaySpyre Application Status Flow — Pre-Origination → Active state machine.
 *
 * Source: docs/spec/application-status-flow.pdf (v1.00) and David Wilson's
 * Admin Dashboard review.
 *
 * Design notes (post PR #1 review with David):
 *
 * Stage dependency:
 *   - Stage 3 (Credit Report) and Stage 4 (Bank Verification) are independent
 *     of each other and may run in either order or concurrently.
 *   - Stage 5 (Application Verification) depends on data obtained from the
 *     Credit Report and Bank Verification, so it can only begin once both
 *     have valid (unexpired) results — or once Bank Verification has a valid
 *     result, when the credit product has `requires_credit_bureau = false`.
 *
 * Reuse / freshness:
 *   - Each check carries its own "last completed at" timestamp on the
 *     Application (`credit_report_completed_at`, `bank_verification_completed_at`,
 *     `application_verification_completed_at`).
 *   - Validity windows are configured per credit product
 *     (`credit_report_validity_days`, `bank_verification_validity_days` —
 *     default 30 days). If a check is still fresh, the system reuses the
 *     existing data rather than initiating a new pull.
 *   - Expiry is independent per check.
 *
 * Per-product toggles:
 *   - `requires_credit_bureau` and `requires_bank_verification` on
 *     `CreditProduct` allow either stage to be skipped entirely for products
 *     that don't need it.
 *
 * Post-booking re-pulls:
 *   - The same freshness rules apply post-booking for collections
 *     activities, re-verification, and portfolio monitoring. The state
 *     machine itself doesn't drive those flows; the freshness helpers below
 *     are reusable from the servicing/collections code paths.
 *
 * Audit:
 *   - All transitions are append-only: every state change writes an
 *     ApplicationStatusEvent so the Workflow tab in the UI is just a query.
 */

import type { ApplicationStatus } from "./types/enums";
import type { Application, ApplicationStatusEvent } from "./types/application";
import type { CreditProduct } from "./types/credit-product";
import { isCheckFresh } from "./types/credit-product";

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
 *
 * Note: presence in this map only proves the transition is *structurally*
 * valid. Some actions have additional pre-conditions (e.g. Application
 * Verification requires fresh Credit Report + Bank Verification) that are
 * enforced separately by `checkActionPreconditions`.
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
    request_additional_info: { label: "Run application verification", to: "APPLICATION_VERIFICATION", workplaces: ["underwriting"] },
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

/** Pure transition check — does NOT mutate. Structural check only. */
export function canTransition(from: ApplicationStatus, action: ApplicationAction): boolean {
  return Boolean(STATUS_TRANSITIONS[from]?.[action]);
}

export class StatusTransitionError extends Error {
  constructor(public from: ApplicationStatus, public action: ApplicationAction) {
    super(`Action "${action}" is not permitted from status "${from}".`);
    this.name = "StatusTransitionError";
  }
}

export class PreconditionError extends Error {
  constructor(public action: ApplicationAction, public reason: string) {
    super(`Action "${action}" blocked: ${reason}`);
    this.name = "PreconditionError";
  }
}

/**
 * Verification-stage precondition check.
 *
 * - `request_additional_info` (start Application Verification) requires
 *   a fresh Bank Verification, AND a fresh Credit Report when the credit
 *   product requires the bureau.
 * - `approve` requires a fresh Application Verification, plus the same
 *   freshness on the upstream checks (since App Verification is built on
 *   them).
 *
 * Returns `null` if the action passes; otherwise a human-readable reason
 * string explaining what's missing.
 *
 * If `product` is omitted, the freshness checks are skipped (caller hasn't
 * loaded product config yet — used in unit tests / draft flows).
 */
export function checkActionPreconditions(
  application: Application,
  action: ApplicationAction,
  product?: CreditProduct,
  asOf: Date = new Date(),
): string | null {
  if (!product) return null;

  const creditFresh =
    !product.requires_credit_bureau ||
    isCheckFresh(application.credit_report_completed_at, product.credit_report_validity_days, asOf);
  const bankFresh =
    !product.requires_bank_verification ||
    isCheckFresh(application.bank_verification_completed_at, product.bank_verification_validity_days, asOf);

  if (action === "request_additional_info") {
    const missing: string[] = [];
    if (product.requires_credit_bureau && !creditFresh) missing.push("Credit Report");
    if (product.requires_bank_verification && !bankFresh) missing.push("Bank Verification");
    if (missing.length) {
      return `Application Verification requires fresh ${missing.join(" + ")} result(s) first.`;
    }
  }

  if (action === "approve") {
    const missing: string[] = [];
    if (product.requires_credit_bureau && !creditFresh) missing.push("Credit Report");
    if (product.requires_bank_verification && !bankFresh) missing.push("Bank Verification");
    // Application Verification freshness: validity window mirrors the
    // Bank Verification window by default (no separate field on
    // CreditProduct yet — revisit in PR #2 if David wants it tunable).
    const appVerFresh = isCheckFresh(
      application.application_verification_completed_at,
      product.bank_verification_validity_days,
      asOf,
    );
    if (!appVerFresh) missing.push("Application Verification");
    if (missing.length) {
      return `Approval requires fresh ${missing.join(" + ")} result(s).`;
    }
  }

  return null;
}

/**
 * Pure state transition. Returns the next Application + a status event ready
 * to append. No side effects (no DB writes, no API calls, no notifications).
 * Wire side effects in the route handler that calls this.
 *
 * If `product` is provided, freshness preconditions on
 * `request_additional_info` and `approve` are enforced; pass it whenever
 * you have it loaded.
 */
export function executeAction(
  application: Application,
  action: ApplicationAction,
  payload: { actor_id: string; actor_name: string; comments?: string; occurred_at?: string },
  product?: CreditProduct,
): { application: Application; event: ApplicationStatusEvent } {
  const rule = STATUS_TRANSITIONS[application.status]?.[action];
  if (!rule) {
    throw new StatusTransitionError(application.status, action);
  }

  const preconditionError = checkActionPreconditions(application, action, product);
  if (preconditionError) {
    throw new PreconditionError(action, preconditionError);
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
