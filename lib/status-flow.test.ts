import { describe, it, expect } from "vitest";
import {
  STATUS_TRANSITIONS,
  canTransition,
  executeAction,
  getAvailableActions,
  StatusTransitionError,
  PreconditionError,
  checkActionPreconditions,
} from "./status-flow";
import type { Application } from "./types/application";
import type { CreditProduct } from "./types/credit-product";
import { isCheckFresh } from "./types/credit-product";

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

// --- Verification freshness / preconditions (David's PR #1 corrections) ---

const dentalProduct: CreditProduct = {
  id: "prod-1",
  code: "DENT",
  name: "Dental",
  active: true,
  provinces: ["BC", "AB"],
  permitted_frequencies: ["Monthly", "SemiMonthly", "BiWeekly", "Weekly"],
  amount_brackets: [
    {
      id: "prod-1-br-small",
      min_amount: 500,
      max_amount: 4999.99,
      permitted_terms: [{ min_term_months: 6, max_term_months: 36 }],
      rate_band: { min_rate: 9.99, default_rate: 12.99, max_rate: 19.99 },
    },
    {
      id: "prod-1-br-large",
      min_amount: 5000,
      max_amount: 25000,
      permitted_terms: [{ min_term_months: 12, max_term_months: 60 }],
      rate_band: { min_rate: 8.99, default_rate: 11.99, max_rate: 17.99 },
    },
  ],
  origination_fee_pct: 0,
  requires_credit_bureau: true,
  requires_bank_verification: true,
  credit_report_validity_days: 30,
  bank_verification_validity_days: 30,
  created_at: "2026-05-07T12:00:00.000Z",
  updated_at: "2026-05-07T12:00:00.000Z",
};

const noBureauProduct: CreditProduct = {
  ...dentalProduct,
  id: "prod-2",
  code: "NOBUR",
  requires_credit_bureau: false,
};

describe("isCheckFresh", () => {
  const asOf = new Date("2026-06-01T00:00:00.000Z");
  it("returns false when no timestamp is set", () => {
    expect(isCheckFresh(null, 30, asOf)).toBe(false);
    expect(isCheckFresh(undefined, 30, asOf)).toBe(false);
  });
  it("returns true within the validity window", () => {
    expect(isCheckFresh("2026-05-15T00:00:00.000Z", 30, asOf)).toBe(true);
  });
  it("returns false past the validity window", () => {
    expect(isCheckFresh("2026-04-15T00:00:00.000Z", 30, asOf)).toBe(false);
  });
});

describe("checkActionPreconditions", () => {
  const asOf = new Date("2026-06-01T00:00:00.000Z");
  const fresh = "2026-05-20T00:00:00.000Z"; // 12 days old → fresh
  const stale = "2026-04-15T00:00:00.000Z"; // 47 days old → stale

  it("blocks Application Verification when Credit Report is missing", () => {
    const app: Application = {
      ...baseApp,
      status: "CREDIT_UNDERWRITING",
      bank_verification_completed_at: fresh,
    };
    const reason = checkActionPreconditions(app, "request_additional_info", dentalProduct, asOf);
    expect(reason).toMatch(/Credit Report/);
  });

  it("blocks Application Verification when Bank Verification is stale", () => {
    const app: Application = {
      ...baseApp,
      status: "CREDIT_UNDERWRITING",
      credit_report_completed_at: fresh,
      bank_verification_completed_at: stale,
    };
    const reason = checkActionPreconditions(app, "request_additional_info", dentalProduct, asOf);
    expect(reason).toMatch(/Bank Verification/);
  });

  it("allows Application Verification when both upstream checks are fresh", () => {
    const app: Application = {
      ...baseApp,
      status: "CREDIT_UNDERWRITING",
      credit_report_completed_at: fresh,
      bank_verification_completed_at: fresh,
    };
    const reason = checkActionPreconditions(app, "request_additional_info", dentalProduct, asOf);
    expect(reason).toBeNull();
  });

  it("skips Credit Report requirement for products with bureau toggled off", () => {
    const app: Application = {
      ...baseApp,
      status: "CREDIT_UNDERWRITING",
      bank_verification_completed_at: fresh,
    };
    const reason = checkActionPreconditions(app, "request_additional_info", noBureauProduct, asOf);
    expect(reason).toBeNull();
  });

  it("blocks approve when Application Verification is missing", () => {
    const app: Application = {
      ...baseApp,
      status: "CREDIT_UNDERWRITING",
      credit_report_completed_at: fresh,
      bank_verification_completed_at: fresh,
    };
    const reason = checkActionPreconditions(app, "approve", dentalProduct, asOf);
    expect(reason).toMatch(/Application Verification/);
  });

  it("allows approve when all three checks are fresh", () => {
    const app: Application = {
      ...baseApp,
      status: "CREDIT_UNDERWRITING",
      credit_report_completed_at: fresh,
      bank_verification_completed_at: fresh,
      application_verification_completed_at: fresh,
    };
    const reason = checkActionPreconditions(app, "approve", dentalProduct, asOf);
    expect(reason).toBeNull();
  });

  it("executeAction throws PreconditionError when product is provided and checks fail", () => {
    const app: Application = {
      ...baseApp,
      status: "CREDIT_UNDERWRITING",
    };
    expect(() => executeAction(app, "approve", actor, dentalProduct)).toThrow(PreconditionError);
  });

  it("executeAction skips precondition checks when product is omitted (back-compat)", () => {
    const app: Application = { ...baseApp, status: "CREDIT_UNDERWRITING" };
    expect(() => executeAction(app, "approve", actor)).not.toThrow();
  });
});
