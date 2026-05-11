import { describe, expect, it } from "vitest";
import { dispatchUWAction } from "./uw-actions";
import { StatusTransitionError, PreconditionError } from "./status-flow";
import type { Application } from "./types/application";

const baseApp: Application = {
  id: "APP-TEST-100",
  application_number: "APP-TEST-100",
  status: "CREDIT_UNDERWRITING",
  vendor_id: "BC4906",
  vendor_name: "Kelowna Dental Centre",
  provider: "Dr. Michael Webster",
  province: "BC",
  requested_amount: 5000,
  created_at: "2026-05-01T00:00:00.000Z",
};

const actor = { actor_id: "user-uw-1", actor_name: "UW Operator" };

describe("dispatchUWAction", () => {
  it("approves from CREDIT_UNDERWRITING when product is omitted (back-compat)", () => {
    const { application, event } = dispatchUWAction({
      application: baseApp,
      raw: { action: "approve", comments: "Strong file" },
      actor,
      occurred_at: "2026-05-10T12:00:00.000Z",
    });
    expect(application.status).toBe("OFFER_ACCEPTANCE");
    expect(application.approved_at).toBe("2026-05-10T12:00:00.000Z");
    expect(event.action).toBe("approve");
    expect(event.from_status).toBe("CREDIT_UNDERWRITING");
    expect(event.to_status).toBe("OFFER_ACCEPTANCE");
    expect(event.actor_id).toBe("user-uw-1");
    expect(event.comments).toBe("Strong file");
  });

  it("rejects from CREDIT_UNDERWRITING and stamps closed_at", () => {
    const { application, event } = dispatchUWAction({
      application: baseApp,
      raw: { action: "reject", comments: "Insufficient income" },
      actor,
      occurred_at: "2026-05-10T12:00:00.000Z",
    });
    expect(application.status).toBe("REJECTED");
    expect(application.closed_at).toBe("2026-05-10T12:00:00.000Z");
    expect(event.action).toBe("reject");
  });

  it("rejects an action that's not part of the UW allowed set", () => {
    expect(() =>
      dispatchUWAction({
        application: baseApp,
        raw: { action: "complete_application" },
        actor,
      }),
    ).toThrow();
  });

  it("rejects an action that's not legal from the current status", () => {
    const cancelled = { ...baseApp, status: "CANCELLED" as const };
    expect(() =>
      dispatchUWAction({
        application: cancelled,
        raw: { action: "approve" },
        actor,
      }),
    ).toThrow(StatusTransitionError);
  });

  it("rejects an action that fails a precondition (missing freshness when product provided)", () => {
    expect(() =>
      dispatchUWAction({
        application: baseApp,
        raw: { action: "approve" },
        actor,
        product: {
          id: "prod-x",
          code: "X",
          name: "X",
          active: true,
          provinces: ["BC"],
          permitted_frequencies: ["Monthly"],
          amount_brackets: [
            {
              id: "br-x",
              min_amount: 100,
              max_amount: 100000,
              permitted_terms: [{ min_term_months: 6, max_term_months: 60 }],
              rate_band: { min_rate: 5, default_rate: 10, max_rate: 20 },
            },
          ],
          origination_fee_pct: 0,
          requires_credit_bureau: true,
          requires_bank_verification: true,
          credit_report_validity_days: 30,
          bank_verification_validity_days: 30,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      }),
    ).toThrow(PreconditionError);
  });

  it("rejects when comments exceed the max length", () => {
    expect(() =>
      dispatchUWAction({
        application: baseApp,
        raw: { action: "approve", comments: "x".repeat(1001) },
        actor,
      }),
    ).toThrow();
  });

  it("does not mutate the input application", () => {
    const snapshot = JSON.stringify(baseApp);
    dispatchUWAction({
      application: baseApp,
      raw: { action: "approve" },
      actor,
      occurred_at: "2026-05-10T12:00:00.000Z",
    });
    expect(JSON.stringify(baseApp)).toBe(snapshot);
  });
});
