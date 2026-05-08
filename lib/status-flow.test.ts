import { describe, it, expect } from "vitest";
import {
  STATUS_TRANSITIONS,
  canTransition,
  executeAction,
  getAvailableActions,
  StatusTransitionError,
} from "./status-flow";
import type { Application } from "./types/application";

const baseApp: Application = {
  id: "APP-TEST-001",
  application_number: "APP-TEST-001",
  status: "PRE_ORIGINATION",
  vendor_id: "BC4906",
  vendor_name: "Kelowna Dental Centre",
  provider: "Dr. Michael Webster",
  province: "BC",
  requested_amount: 5000,
  created_at: "2026-05-07T12:00:00.000Z",
};

const actor = { actor_id: "user-1", actor_name: "Test Actor" };

describe("status-flow", () => {
  it("allows complete_application from PRE_ORIGINATION", () => {
    expect(canTransition("PRE_ORIGINATION", "complete_application")).toBe(true);
    const { application, event } = executeAction(baseApp, "complete_application", actor);
    expect(application.status).toBe("ORIGINATION");
    expect(event.from_status).toBe("PRE_ORIGINATION");
    expect(event.to_status).toBe("ORIGINATION");
  });

  it("rejects approve from PRE_ORIGINATION", () => {
    expect(canTransition("PRE_ORIGINATION", "approve")).toBe(false);
    expect(() => executeAction(baseApp, "approve", actor)).toThrow(StatusTransitionError);
  });

  it("walks the happy path Pre-Origination → Active", () => {
    let app = baseApp;
    const sequence = [
      { action: "complete_application" as const, expected: "ORIGINATION" as const },
      { action: "submit_for_underwriting" as const, expected: "CREDIT_UNDERWRITING" as const },
      { action: "approve" as const, expected: "OFFER_ACCEPTANCE" as const },
      { action: "register_offer_acceptance" as const, expected: "AGREEMENT_SIGNATURE" as const },
      { action: "register_agreement_signed" as const, expected: "APPROVED" as const },
      { action: "activate_loan" as const, expected: "ACTIVE" as const },
    ];
    for (const step of sequence) {
      const { application } = executeAction(app, step.action, actor);
      expect(application.status).toBe(step.expected);
      app = application;
    }
    expect(app.activated_at).toBeDefined();
  });

  it("supports moving to CREDIT_REPORT and back from CREDIT_UNDERWRITING", () => {
    const underwriting = { ...baseApp, status: "CREDIT_UNDERWRITING" as const };
    const { application } = executeAction(underwriting, "request_credit_authorization", actor);
    expect(application.status).toBe("CREDIT_REPORT");
    const { application: back } = executeAction(application, "return_for_reprocessing", actor);
    expect(back.status).toBe("CREDIT_UNDERWRITING");
  });

  it("supports moving to BANK_VERIFICATION and back from CREDIT_UNDERWRITING", () => {
    const underwriting = { ...baseApp, status: "CREDIT_UNDERWRITING" as const };
    const { application } = executeAction(underwriting, "request_bank_verification", actor);
    expect(application.status).toBe("BANK_VERIFICATION");
    const { application: back } = executeAction(application, "return_for_reprocessing", actor);
    expect(back.status).toBe("CREDIT_UNDERWRITING");
  });

  it("supports moving to APPLICATION_VERIFICATION and back from CREDIT_UNDERWRITING", () => {
    const underwriting = { ...baseApp, status: "CREDIT_UNDERWRITING" as const };
    const { application } = executeAction(underwriting, "request_additional_info", actor);
    expect(application.status).toBe("APPLICATION_VERIFICATION");
    const { application: back } = executeAction(application, "return_for_reprocessing", actor);
    expect(back.status).toBe("CREDIT_UNDERWRITING");
  });

  it("rejects loan from CREDIT_UNDERWRITING and stamps closed_at", () => {
    const underwriting = { ...baseApp, status: "CREDIT_UNDERWRITING" as const };
    const { application } = executeAction(underwriting, "reject", actor);
    expect(application.status).toBe("REJECTED");
    expect(application.closed_at).toBeDefined();
  });

  it("can cancel from any pre-active status", () => {
    const cancellable: Array<typeof baseApp.status> = [
      "PRE_ORIGINATION",
      "ORIGINATION",
      "CREDIT_REPORT",
      "BANK_VERIFICATION",
      "APPLICATION_VERIFICATION",
      "CREDIT_UNDERWRITING",
      "OFFER_ACCEPTANCE",
      "AGREEMENT_SIGNATURE",
      "APPROVED",
    ];
    for (const status of cancellable) {
      expect(canTransition(status, "cancel")).toBe(true);
    }
  });

  it("ACTIVE allows all six closure actions", () => {
    const active = { ...baseApp, status: "ACTIVE" as const };
    const closures = [
      "close_repaid",
      "close_renewed",
      "close_refinanced",
      "close_transferred",
      "close_settlement",
      "close_writeoff",
    ] as const;
    for (const action of closures) {
      const { application } = executeAction(active, action, actor);
      expect(application.status).toBe("CLOSED");
      expect(application.closed_at).toBeDefined();
    }
  });

  it("terminal states have no outgoing transitions", () => {
    const terminals: Array<typeof baseApp.status> = ["REJECTED", "CANCELLED", "CLOSED"];
    for (const t of terminals) {
      expect(Object.keys(STATUS_TRANSITIONS[t])).toHaveLength(0);
    }
  });

  it("getAvailableActions filters by workplace", () => {
    const fromUnderwriting = getAvailableActions("CREDIT_UNDERWRITING", "underwriting");
    const fromOrigination = getAvailableActions("CREDIT_UNDERWRITING", "origination");
    expect(fromUnderwriting.length).toBeGreaterThan(0);
    expect(fromOrigination.length).toBe(0); // CREDIT_UNDERWRITING is owned by underwriting
  });
});
