/**
 * Vendor Onboarding state machine.
 *
 * Source: docs/spec/vendor/onboarding-redesign.md (David's PR #1.2 input).
 *
 * Replaces the current 11-step manual ~2-week onboarding process with a
 * dedicated automated flow:
 *
 *   INTEREST_REGISTERED \u2192 APPLICATION_SUBMITTED \u2192 KYB_IN_PROGRESS
 *                                                  \u2935
 *                                                   KYB_REVIEW (escalation)
 *                                                  \u2936
 *                                                  BANKING_VERIFICATION
 *                                                  \u2192 MSA_SENT \u2192 MSA_SIGNED
 *                                                  \u2192 PROVISIONING \u2192 TRAINING \u2192 LIVE
 *
 * Plus terminal states DECLINED, WITHDRAWN, OFFBOARDED, and the
 * post-LIVE non-terminal SUSPENDED.
 *
 * Why this is separate from the borrower-side Application Status Flow:
 * vendors are entities (not individuals) and onboard once; the workflow
 * cadence is days-to-weeks, not minutes-to-hours. Same audit-event
 * pattern, separate concerns.
 *
 * Design rules borrowed from lib/status-flow.ts:
 *   - Append-only audit via VendorOnboardingEvent
 *   - Pure transitions (no side effects)
 *   - Optional precondition checks layered on top of structural transitions
 */

import type { VendorOnboardingStatus } from "./types/enums";
import type {
  VendorApplication,
  VendorOnboardingEvent,
} from "./types/vendor-application";

export type VendorOnboardingAction =
  | "submit_application"
  | "start_kyb"
  | "kyb_pass"
  | "kyb_review_required"
  | "kyb_review_approve"
  | "kyb_review_decline"
  | "kyb_fail"
  | "verify_banking"
  | "banking_verified"
  | "send_msa"
  | "register_msa_signed"
  | "start_provisioning"
  | "provisioning_complete"
  | "complete_training"
  | "go_live"
  | "decline"
  | "withdraw"
  | "suspend"
  | "reinstate"
  | "offboard";

interface TransitionRule {
  label: string;
  to: VendorOnboardingStatus;
}

type TransitionMap = Partial<Record<VendorOnboardingAction, TransitionRule>>;

/**
 * Permitted actions per status.
 *
 * "pre_msa" and "post_kyb" preconditions are enforced separately by
 * checkVendorActionPreconditions \u2014 this map is structural only.
 */
export const VENDOR_ONBOARDING_TRANSITIONS: Record<VendorOnboardingStatus, TransitionMap> = {
  INTEREST_REGISTERED: {
    submit_application: { label: "Submit application", to: "APPLICATION_SUBMITTED" },
    withdraw: { label: "Withdraw", to: "WITHDRAWN" },
  },
  APPLICATION_SUBMITTED: {
    start_kyb: { label: "Start KYB / KYC", to: "KYB_IN_PROGRESS" },
    decline: { label: "Decline", to: "DECLINED" },
    withdraw: { label: "Withdraw", to: "WITHDRAWN" },
  },
  KYB_IN_PROGRESS: {
    kyb_pass: { label: "KYB passed", to: "BANKING_VERIFICATION" },
    kyb_review_required: { label: "KYB needs review", to: "KYB_REVIEW" },
    kyb_fail: { label: "KYB failed", to: "DECLINED" },
    withdraw: { label: "Withdraw", to: "WITHDRAWN" },
  },
  KYB_REVIEW: {
    kyb_review_approve: { label: "Manually approve KYB", to: "BANKING_VERIFICATION" },
    kyb_review_decline: { label: "Decline (KYB review)", to: "DECLINED" },
    withdraw: { label: "Withdraw", to: "WITHDRAWN" },
  },
  BANKING_VERIFICATION: {
    banking_verified: { label: "Banking verified", to: "MSA_SENT" },
    decline: { label: "Decline", to: "DECLINED" },
    withdraw: { label: "Withdraw", to: "WITHDRAWN" },
  },
  MSA_SENT: {
    register_msa_signed: { label: "Mark MSA signed", to: "MSA_SIGNED" },
    decline: { label: "Decline", to: "DECLINED" },
    withdraw: { label: "Withdraw", to: "WITHDRAWN" },
  },
  MSA_SIGNED: {
    start_provisioning: { label: "Start provisioning", to: "PROVISIONING" },
    withdraw: { label: "Withdraw", to: "WITHDRAWN" },
  },
  PROVISIONING: {
    provisioning_complete: { label: "Provisioning complete", to: "TRAINING" },
  },
  TRAINING: {
    complete_training: { label: "Training complete", to: "LIVE" },
    suspend: { label: "Suspend", to: "SUSPENDED" },
  },
  LIVE: {
    suspend: { label: "Suspend vendor", to: "SUSPENDED" },
    offboard: { label: "Offboard vendor", to: "OFFBOARDED" },
  },
  SUSPENDED: {
    reinstate: { label: "Reinstate", to: "LIVE" },
    offboard: { label: "Offboard vendor", to: "OFFBOARDED" },
  },
  // Terminal states
  DECLINED: {},
  WITHDRAWN: {},
  OFFBOARDED: {},
};

export function getAvailableVendorActions(
  status: VendorOnboardingStatus,
): Array<{ action: VendorOnboardingAction; label: string; to: VendorOnboardingStatus }> {
  const map = VENDOR_ONBOARDING_TRANSITIONS[status] ?? {};
  return (Object.entries(map) as Array<[VendorOnboardingAction, TransitionRule]>).map(
    ([action, rule]) => ({ action, label: rule.label, to: rule.to }),
  );
}

export function canVendorTransition(
  from: VendorOnboardingStatus,
  action: VendorOnboardingAction,
): boolean {
  return Boolean(VENDOR_ONBOARDING_TRANSITIONS[from]?.[action]);
}

export class VendorTransitionError extends Error {
  constructor(public from: VendorOnboardingStatus, public action: VendorOnboardingAction) {
    super(`Vendor onboarding action "${action}" is not permitted from status "${from}".`);
    this.name = "VendorTransitionError";
  }
}

export class VendorPreconditionError extends Error {
  constructor(public action: VendorOnboardingAction, public reason: string) {
    super(`Vendor onboarding action "${action}" blocked: ${reason}`);
    this.name = "VendorPreconditionError";
  }
}

/**
 * Precondition checks layered on top of structural transitions.
 *
 *   - submit_application requires the vendor application to have a banking
 *     section (so KYB can dispatch and a Flinks call can run downstream).
 *   - send_msa equivalent: action is `banking_verified` (which transitions
 *     to MSA_SENT) \u2014 requires a non-null banking record. Enforced here.
 *   - register_msa_signed requires `signed_at` set on the application.
 *
 * Returns null if the action passes; otherwise a human-readable reason.
 */
export function checkVendorActionPreconditions(
  application: VendorApplication,
  action: VendorOnboardingAction,
): string | null {
  if (action === "submit_application") {
    const docs = application.documents;
    const missing: string[] = [];
    if (!docs.business_license_uploaded) missing.push("business license");
    if (!docs.certificate_of_incorporation_uploaded) missing.push("certificate of incorporation");
    if (!docs.notice_of_articles_uploaded) missing.push("notice of articles");
    if (!docs.photo_id_front_uploaded || !docs.photo_id_back_uploaded) missing.push("photo ID (both sides)");
    if (!docs.pad_or_void_cheque_uploaded) missing.push("PAD form or void cheque");
    if (missing.length) return `Missing required documents: ${missing.join(", ")}.`;
  }

  if (action === "banking_verified" && !application.banking) {
    return "Banking section must be filled before verification can complete.";
  }

  if (action === "register_msa_signed" && !application.signed_at) {
    return "MSA signed_at timestamp is missing on the application.";
  }

  return null;
}

/**
 * Pure state transition for vendor onboarding. No side effects.
 */
export function executeVendorAction(
  application: VendorApplication,
  action: VendorOnboardingAction,
  payload: { actor_id: string; actor_name: string; comments?: string; occurred_at?: string },
): { application: VendorApplication; event: VendorOnboardingEvent } {
  const rule = VENDOR_ONBOARDING_TRANSITIONS[application.status]?.[action];
  if (!rule) {
    throw new VendorTransitionError(application.status, action);
  }

  const reason = checkVendorActionPreconditions(application, action);
  if (reason) {
    throw new VendorPreconditionError(action, reason);
  }

  const occurred_at = payload.occurred_at ?? new Date().toISOString();
  const next: VendorApplication = { ...application, status: rule.to };

  if (action === "submit_application") next.submitted_at = occurred_at;
  if (rule.to === "DECLINED" || rule.to === "WITHDRAWN" || rule.to === "OFFBOARDED") {
    next.decided_at = occurred_at;
  }

  const event: VendorOnboardingEvent = {
    vendor_application_id: application.id,
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
