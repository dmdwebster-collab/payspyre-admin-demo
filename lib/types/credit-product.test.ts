import { describe, it, expect } from "vitest";
import {
  CreditProductSchema,
  findApplicableBracket,
  isCheckFresh,
  validateOfferTerms,
  type CreditProduct,
} from "./credit-product";

// --- Fixtures -----------------------------------------------------------

const multiBracketProduct: CreditProduct = {
  id: "prod-multi",
  code: "DENT",
  name: "Dental",
  active: true,
  provinces: ["BC", "AB"],
  permitted_frequencies: ["Monthly", "SemiMonthly", "BiWeekly", "Weekly"],
  amount_brackets: [
    {
      id: "br-small",
      min_amount: 500,
      max_amount: 4999.99,
      permitted_terms: [{ min_term_months: 6, max_term_months: 36 }],
      rate_band: { min_rate: 9.99, default_rate: 12.99, max_rate: 19.99 },
    },
    {
      id: "br-mid",
      min_amount: 5000,
      max_amount: 14999.99,
      permitted_terms: [
        { min_term_months: 12, max_term_months: 48 },
        { min_term_months: 49, max_term_months: 60 },
      ],
      rate_band: { min_rate: 8.99, default_rate: 11.99, max_rate: 17.99 },
    },
    {
      id: "br-large",
      min_amount: 15000,
      max_amount: 50000,
      permitted_terms: [{ min_term_months: 24, max_term_months: 84 }],
      rate_band: { min_rate: 7.99, default_rate: 10.49, max_rate: 15.99 },
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

const monthlyOnlyProduct: CreditProduct = {
  ...multiBracketProduct,
  id: "prod-monthly-only",
  code: "DENT-M",
  permitted_frequencies: ["Monthly"],
};

// --- Schema validation --------------------------------------------------

describe("CreditProductSchema", () => {
  it("accepts a valid multi-bracket product", () => {
    const parsed = CreditProductSchema.parse(multiBracketProduct);
    expect(parsed.amount_brackets).toHaveLength(3);
    expect(parsed.permitted_frequencies).toContain("Weekly");
  });

  it("rejects a product with zero permitted frequencies", () => {
    const bad = { ...multiBracketProduct, permitted_frequencies: [] };
    expect(() => CreditProductSchema.parse(bad)).toThrow();
  });

  it("rejects a bracket where max_amount < min_amount", () => {
    const bad: CreditProduct = {
      ...multiBracketProduct,
      amount_brackets: [
        {
          id: "br-bad",
          min_amount: 5000,
          max_amount: 1000,
          permitted_terms: [{ min_term_months: 6, max_term_months: 36 }],
          rate_band: { min_rate: 1, default_rate: 2, max_rate: 3 },
        },
      ],
    };
    expect(() => CreditProductSchema.parse(bad)).toThrow();
  });

  it("rejects a rate band where default_rate is outside [min, max]", () => {
    const bad: CreditProduct = {
      ...multiBracketProduct,
      amount_brackets: [
        {
          id: "br-bad-rate",
          min_amount: 500,
          max_amount: 1000,
          permitted_terms: [{ min_term_months: 6, max_term_months: 36 }],
          rate_band: { min_rate: 10, default_rate: 5, max_rate: 15 },
        },
      ],
    };
    expect(() => CreditProductSchema.parse(bad)).toThrow();
  });

  it("rejects a term band where max_term_months < min_term_months", () => {
    const bad: CreditProduct = {
      ...multiBracketProduct,
      amount_brackets: [
        {
          id: "br-bad-term",
          min_amount: 500,
          max_amount: 1000,
          permitted_terms: [{ min_term_months: 24, max_term_months: 12 }],
          rate_band: { min_rate: 1, default_rate: 2, max_rate: 3 },
        },
      ],
    };
    expect(() => CreditProductSchema.parse(bad)).toThrow();
  });
});

// --- Bracket lookup -----------------------------------------------------

describe("findApplicableBracket", () => {
  it("returns the small bracket for $1,200", () => {
    const br = findApplicableBracket(multiBracketProduct, 1200);
    expect(br?.id).toBe("br-small");
  });

  it("returns the mid bracket on the boundary at $5,000", () => {
    const br = findApplicableBracket(multiBracketProduct, 5000);
    expect(br?.id).toBe("br-mid");
  });

  it("returns the large bracket for $20,000", () => {
    const br = findApplicableBracket(multiBracketProduct, 20000);
    expect(br?.id).toBe("br-large");
  });

  it("returns null for amounts below the smallest bracket", () => {
    expect(findApplicableBracket(multiBracketProduct, 100)).toBeNull();
  });

  it("returns null for amounts above the largest bracket", () => {
    expect(findApplicableBracket(multiBracketProduct, 75000)).toBeNull();
  });

  it("returns null for invalid amounts", () => {
    expect(findApplicableBracket(multiBracketProduct, NaN)).toBeNull();
    expect(findApplicableBracket(multiBracketProduct, -500)).toBeNull();
  });
});

// --- Offer validation ---------------------------------------------------

describe("validateOfferTerms", () => {
  it("accepts a $3,000 / 24-mo / Monthly offer in the small bracket", () => {
    const r = validateOfferTerms(multiBracketProduct, 3000, 24, "Monthly");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bracket.id).toBe("br-small");
  });

  it("accepts a $10,000 / 60-mo / BiWeekly offer in the mid bracket (second term band)", () => {
    const r = validateOfferTerms(multiBracketProduct, 10000, 60, "BiWeekly");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bracket.id).toBe("br-mid");
  });

  it("rejects an $84-mo term on a $1,000 loan (term out of small bracket)", () => {
    const r = validateOfferTerms(multiBracketProduct, 1000, 84, "Monthly");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("term_out_of_range");
  });

  it("rejects a $50,000 loan capped at 12 months when the large bracket starts at 24mo", () => {
    const r = validateOfferTerms(multiBracketProduct, 50000, 12, "Monthly");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("term_out_of_range");
  });

  it("rejects a frequency not in permitted_frequencies", () => {
    const r = validateOfferTerms(monthlyOnlyProduct, 3000, 24, "Weekly");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("frequency_not_permitted");
  });

  it("rejects an amount outside every bracket", () => {
    const r = validateOfferTerms(multiBracketProduct, 100, 12, "Monthly");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("amount_out_of_range");
  });

  it("rejects invalid amount and invalid term inputs", () => {
    const a = validateOfferTerms(multiBracketProduct, 0, 24, "Monthly");
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.reason).toBe("invalid_amount");

    const b = validateOfferTerms(multiBracketProduct, 3000, 0, "Monthly");
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.reason).toBe("invalid_term");
  });
});

// --- isCheckFresh preservation -----------------------------------------

describe("isCheckFresh (preserved from PR #1)", () => {
  const asOf = new Date("2026-06-01T00:00:00.000Z");

  it("treats null/undefined as not fresh", () => {
    expect(isCheckFresh(null, 30, asOf)).toBe(false);
    expect(isCheckFresh(undefined, 30, asOf)).toBe(false);
  });

  it("treats a 12-day-old check as fresh under a 30-day window", () => {
    expect(isCheckFresh("2026-05-20T00:00:00.000Z", 30, asOf)).toBe(true);
  });

  it("treats a 47-day-old check as stale under a 30-day window", () => {
    expect(isCheckFresh("2026-04-15T00:00:00.000Z", 30, asOf)).toBe(false);
  });
});
