import { describe, it, expect } from "vitest";
import {
  filterApplications,
  buildFunnelBuckets,
  applicationAgeDays,
  STATUS_SHORT_LABEL,
  applicationStatusVariant,
  ORIGINATION_TABS,
} from "./originations";
import type { Application } from "./types/application";

function makeApp(overrides: Partial<Application> = {}): Application {
  const base: Application = {
    id: "APP-2026-99999",
    application_number: "APP-2026-99999",
    status: "ORIGINATION",
    vendor_id: "BC4906",
    vendor_name: "Kelowna Dental Centre",
    provider: "Dr. Webster",
    province: "BC",
    primary_borrower_id: "BORR-99999",
    co_borrower_id: null,
    credit_product_id: "CP00",
    requested_amount: 5000,
    offer_amount: null,
    term_months: 24,
    interest_rate: 12.99,
    payment_frequency: "BiWeekly",
    start_date: null,
    first_payment_date: null,
    credit_report_completed_at: null,
    bank_verification_completed_at: null,
    application_verification_completed_at: null,
    created_by: "ops@payspyre.ca",
    created_at: "2026-05-01T12:00:00.000Z",
    submitted_at: null,
    approved_at: null,
    activated_at: null,
    closed_at: null,
  };
  return { ...base, ...overrides } as Application;
}

describe("originations helpers", () => {
  describe("filterApplications", () => {
    const apps = [
      makeApp({ id: "A", status: "ORIGINATION", vendor_id: "BC4906", province: "BC" }),
      makeApp({ id: "B", status: "CREDIT_REPORT", vendor_id: "AB2210", province: "AB" }),
      makeApp({ id: "C", status: "OFFER_ACCEPTANCE", vendor_id: "BC4906", province: "BC", application_number: "APP-2026-00777" }),
      makeApp({ id: "D", status: "REJECTED", vendor_id: "BC1180", province: "BC" }),
    ];

    it("returns everything when no filters are set", () => {
      expect(filterApplications(apps, {})).toHaveLength(4);
    });

    it("filters by status", () => {
      const r = filterApplications(apps, { status: "REJECTED" });
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe("D");
    });

    it("filters by vendor", () => {
      const r = filterApplications(apps, { vendor_id: "BC4906" });
      expect(r.map((a) => a.id)).toEqual(["A", "C"]);
    });

    it("filters by province", () => {
      expect(filterApplications(apps, { province: "AB" })).toHaveLength(1);
    });

    it("free-text q matches application_number", () => {
      const r = filterApplications(apps, { q: "00777" });
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe("C");
    });

    it("composes filters AND-style", () => {
      const r = filterApplications(apps, { vendor_id: "BC4906", status: "ORIGINATION" });
      expect(r.map((a) => a.id)).toEqual(["A"]);
    });
  });

  describe("buildFunnelBuckets", () => {
    it("excludes ACTIVE and CLOSED (not in originations)", () => {
      const buckets = buildFunnelBuckets([]);
      const statuses = buckets.map((b) => b.status);
      expect(statuses).not.toContain("ACTIVE");
      expect(statuses).not.toContain("CLOSED");
      // PRE_ORIGINATION through CANCELLED = 11 buckets
      expect(buckets).toHaveLength(11);
    });

    it("counts apps per bucket", () => {
      const apps = [
        makeApp({ status: "ORIGINATION" }),
        makeApp({ status: "ORIGINATION" }),
        makeApp({ status: "REJECTED" }),
      ];
      const buckets = buildFunnelBuckets(apps);
      expect(buckets.find((b) => b.status === "ORIGINATION")?.count).toBe(2);
      expect(buckets.find((b) => b.status === "REJECTED")?.count).toBe(1);
      expect(buckets.find((b) => b.status === "PRE_ORIGINATION")?.count).toBe(0);
    });
  });

  describe("applicationAgeDays", () => {
    it("returns whole-day age relative to now", () => {
      const app = makeApp({ created_at: "2026-05-01T00:00:00.000Z" });
      const now = new Date("2026-05-08T00:00:00.000Z");
      expect(applicationAgeDays(app, now)).toBe(7);
    });

    it("clamps negative ages to 0", () => {
      const app = makeApp({ created_at: "2026-06-01T00:00:00.000Z" });
      const now = new Date("2026-05-01T00:00:00.000Z");
      expect(applicationAgeDays(app, now)).toBe(0);
    });
  });

  describe("status presentation", () => {
    it("STATUS_SHORT_LABEL covers every status the app can reach", () => {
      for (const s of [
        "PRE_ORIGINATION", "ORIGINATION", "CREDIT_REPORT", "BANK_VERIFICATION",
        "APPLICATION_VERIFICATION", "CREDIT_UNDERWRITING", "OFFER_ACCEPTANCE",
        "AGREEMENT_SIGNATURE", "APPROVED", "ACTIVE", "REJECTED", "CANCELLED", "CLOSED",
      ] as const) {
        expect(STATUS_SHORT_LABEL[s]).toBeDefined();
      }
    });

    it("applicationStatusVariant returns a valid Badge variant for every status", () => {
      const valid = ["default", "active", "paid", "renewed", "writeoff", "transfer", "voided", "muted"];
      for (const s of [
        "PRE_ORIGINATION", "ORIGINATION", "CREDIT_REPORT", "BANK_VERIFICATION",
        "APPLICATION_VERIFICATION", "CREDIT_UNDERWRITING", "OFFER_ACCEPTANCE",
        "AGREEMENT_SIGNATURE", "APPROVED", "ACTIVE", "REJECTED", "CANCELLED", "CLOSED",
      ] as const) {
        expect(valid).toContain(applicationStatusVariant(s));
      }
    });

    it("ORIGINATION_TABS contains all 10 tabs in stable order", () => {
      expect(ORIGINATION_TABS).toHaveLength(10);
      expect(ORIGINATION_TABS[0].slug).toBe("summary");
      expect(ORIGINATION_TABS.map((t) => t.slug)).toContain("bank-statements");
    });
  });
});
