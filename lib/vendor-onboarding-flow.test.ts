import { describe, it, expect } from "vitest";
import {
  VENDOR_ONBOARDING_TRANSITIONS,
  canVendorTransition,
  executeVendorAction,
  getAvailableVendorActions,
  checkVendorActionPreconditions,
  VendorTransitionError,
  VendorPreconditionError,
} from "./vendor-onboarding-flow";
import type { VendorApplication } from "./types/vendor-application";

/**
 * Build a complete-on-paper VendorApplication so we can exercise
 * structural transitions without tripping precondition checks unless
 * the test deliberately mutates a field.
 */
function makeApp(overrides: Partial<VendorApplication> = {}): VendorApplication {
  const base: VendorApplication = {
    id: "VAPP-2026-00042",
    vendor_id: null,
    status: "INTEREST_REGISTERED",
    business: {
      corporate_name: "Smile Bright Dental Inc.",
      trade_name: "Smile Bright Dental",
      province_of_incorporation: "BC",
      business_registration_number: "BC1234567",
      gst_hst_registration_number: "123456789RT0001",
      nature_of_principal_business: "General dentistry",
      street_address: "123 Main St",
      city: "Kelowna",
      province: "BC",
      postal_code: "V1Y 1A1",
      phone_landline: null,
      phone_cell: "250-555-0100",
      fax: null,
      email: "ops@smilebright.example",
      website_url: "https://smilebright.example",
    },
    primary_representative: {
      full_name: "Dr. Jane Smith",
      position: "Owner",
      phone: "250-555-0101",
      email: "jane@smilebright.example",
    },
    secondary_representative: null,
    banking: {
      institution_name: "RBC",
      institution_number: "003",
      transit_number: "00123",
      account_number: "1234567",
      street_address: "200 Bernard Ave",
      city: "Kelowna",
      province: "BC",
      postal_code: "V1Y 6N2",
      contact_at_institution: null,
      contact_phone: null,
      years_with_institution: 5,
      source: "FLINKS",
      flinks_request_id: "flx_abc123",
    },
    documents: {
      business_license_uploaded: true,
      certificate_of_incorporation_uploaded: true,
      notice_of_articles_uploaded: true,
      signing_authority_resolution_uploaded: false,
      photo_id_front_uploaded: true,
      photo_id_back_uploaded: true,
      pad_or_void_cheque_uploaded: true,
    },
    authorized_signatory_name: "Dr. Jane Smith",
    signed_at: null,
    created_at: "2026-05-01T12:00:00.000Z",
    submitted_at: null,
    decided_at: null,
  };
  return { ...base, ...overrides };
}

const actor = { actor_id: "user-1", actor_name: "Test Actor" };

describe("vendor-onboarding-flow", () => {
  describe("structural transitions", () => {
    it("allows submit_application from INTEREST_REGISTERED", () => {
      expect(canVendorTransition("INTEREST_REGISTERED", "submit_application")).toBe(true);
      const { application, event } = executeVendorAction(makeApp(), "submit_application", actor);
      expect(application.status).toBe("APPLICATION_SUBMITTED");
      expect(application.submitted_at).toBeDefined();
      expect(event.from_status).toBe("INTEREST_REGISTERED");
      expect(event.to_status).toBe("APPLICATION_SUBMITTED");
      expect(event.action).toBe("submit_application");
    });

    it("rejects start_kyb from INTEREST_REGISTERED", () => {
      expect(canVendorTransition("INTEREST_REGISTERED", "start_kyb")).toBe(false);
      expect(() =>
        executeVendorAction(makeApp(), "start_kyb", actor),
      ).toThrow(VendorTransitionError);
    });

    it("walks the happy path INTEREST_REGISTERED → LIVE", () => {
      let app = makeApp();
      const sequence = [
        { action: "submit_application" as const, expected: "APPLICATION_SUBMITTED" as const },
        { action: "start_kyb" as const, expected: "KYB_IN_PROGRESS" as const },
        { action: "kyb_pass" as const, expected: "BANKING_VERIFICATION" as const },
        { action: "banking_verified" as const, expected: "MSA_SENT" as const },
        { action: "register_msa_signed" as const, expected: "MSA_SIGNED" as const },
        { action: "start_provisioning" as const, expected: "PROVISIONING" as const },
        { action: "provisioning_complete" as const, expected: "TRAINING" as const },
        { action: "complete_training" as const, expected: "LIVE" as const },
      ];
      for (const step of sequence) {
        // signed_at must be set before register_msa_signed precondition passes
        if (step.action === "register_msa_signed") {
          app = { ...app, signed_at: "2026-05-04T15:00:00.000Z" };
        }
        const { application } = executeVendorAction(app, step.action, actor);
        expect(application.status).toBe(step.expected);
        app = application;
      }
    });

    it("routes through KYB_REVIEW when manual review is required", () => {
      let app = makeApp({ status: "KYB_IN_PROGRESS" });
      const review = executeVendorAction(app, "kyb_review_required", actor);
      expect(review.application.status).toBe("KYB_REVIEW");
      const approve = executeVendorAction(review.application, "kyb_review_approve", actor);
      expect(approve.application.status).toBe("BANKING_VERIFICATION");
    });

    it("kyb_fail and kyb_review_decline both terminate at DECLINED with decided_at", () => {
      const failed = executeVendorAction(
        makeApp({ status: "KYB_IN_PROGRESS" }),
        "kyb_fail",
        actor,
      );
      expect(failed.application.status).toBe("DECLINED");
      expect(failed.application.decided_at).toBeDefined();

      const declined = executeVendorAction(
        makeApp({ status: "KYB_REVIEW" }),
        "kyb_review_decline",
        actor,
      );
      expect(declined.application.status).toBe("DECLINED");
      expect(declined.application.decided_at).toBeDefined();
    });

    it("withdraw is available at most pre-LIVE statuses", () => {
      const statuses: Array<VendorApplication["status"]> = [
        "INTEREST_REGISTERED",
        "APPLICATION_SUBMITTED",
        "KYB_IN_PROGRESS",
        "KYB_REVIEW",
        "BANKING_VERIFICATION",
        "MSA_SENT",
        "MSA_SIGNED",
      ];
      for (const status of statuses) {
        expect(canVendorTransition(status, "withdraw")).toBe(true);
      }
    });

    it("LIVE allows suspend and offboard; SUSPENDED allows reinstate", () => {
      const suspended = executeVendorAction(makeApp({ status: "LIVE" }), "suspend", actor);
      expect(suspended.application.status).toBe("SUSPENDED");

      const reinstated = executeVendorAction(suspended.application, "reinstate", actor);
      expect(reinstated.application.status).toBe("LIVE");

      const offboarded = executeVendorAction(makeApp({ status: "LIVE" }), "offboard", actor);
      expect(offboarded.application.status).toBe("OFFBOARDED");
      expect(offboarded.application.decided_at).toBeDefined();
    });

    it("terminal states (DECLINED, WITHDRAWN, OFFBOARDED) have no available actions", () => {
      expect(getAvailableVendorActions("DECLINED")).toHaveLength(0);
      expect(getAvailableVendorActions("WITHDRAWN")).toHaveLength(0);
      expect(getAvailableVendorActions("OFFBOARDED")).toHaveLength(0);
    });

    it("PROVISIONING blocks withdraw — once provisioned the vendor must go LIVE or be suspended/offboarded later", () => {
      expect(canVendorTransition("PROVISIONING", "withdraw")).toBe(false);
    });
  });

  describe("preconditions", () => {
    it("blocks submit_application when required documents are missing", () => {
      const app = makeApp({
        documents: {
          business_license_uploaded: false,
          certificate_of_incorporation_uploaded: true,
          notice_of_articles_uploaded: true,
          signing_authority_resolution_uploaded: false,
          photo_id_front_uploaded: true,
          photo_id_back_uploaded: false,
          pad_or_void_cheque_uploaded: false,
        },
      });
      const reason = checkVendorActionPreconditions(app, "submit_application");
      expect(reason).toMatch(/business license/);
      expect(reason).toMatch(/photo ID/);
      expect(reason).toMatch(/PAD form or void cheque/);
      expect(() =>
        executeVendorAction(app, "submit_application", actor),
      ).toThrow(VendorPreconditionError);
    });

    it("permits submit_application when all required documents are present", () => {
      const reason = checkVendorActionPreconditions(makeApp(), "submit_application");
      expect(reason).toBeNull();
    });

    it("blocks banking_verified when no banking record is attached", () => {
      const app = makeApp({ status: "BANKING_VERIFICATION", banking: null });
      const reason = checkVendorActionPreconditions(app, "banking_verified");
      expect(reason).toMatch(/banking section/i);
      expect(() =>
        executeVendorAction(app, "banking_verified", actor),
      ).toThrow(VendorPreconditionError);
    });

    it("blocks register_msa_signed when signed_at is not set", () => {
      const app = makeApp({ status: "MSA_SENT", signed_at: null });
      const reason = checkVendorActionPreconditions(app, "register_msa_signed");
      expect(reason).toMatch(/signed_at/);
      expect(() =>
        executeVendorAction(app, "register_msa_signed", actor),
      ).toThrow(VendorPreconditionError);
    });

    it("permits register_msa_signed when signed_at is set", () => {
      const app = makeApp({
        status: "MSA_SENT",
        signed_at: "2026-05-04T15:00:00.000Z",
      });
      const { application } = executeVendorAction(app, "register_msa_signed", actor);
      expect(application.status).toBe("MSA_SIGNED");
    });
  });

  describe("transition map sanity", () => {
    it("every transition target is a known status", () => {
      const known = new Set(Object.keys(VENDOR_ONBOARDING_TRANSITIONS));
      for (const map of Object.values(VENDOR_ONBOARDING_TRANSITIONS)) {
        for (const rule of Object.values(map)) {
          if (rule) expect(known.has(rule.to)).toBe(true);
        }
      }
    });
  });
});
