import { describe, expect, it } from "vitest";
import {
  DAYS_IN_YEAR,
  DAYS_PER_PERIOD,
  PERIODS_PER_YEAR,
  daysBetween,
  generateSchedule,
  levelPayment,
  payoffQuote,
} from "./amortization";

describe("amortization — constants", () => {
  it("locks the day count at 360", () => {
    expect(DAYS_IN_YEAR).toBe(360);
  });

  it("uses fixed period day-counts", () => {
    expect(DAYS_PER_PERIOD.Weekly).toBe(7);
    expect(DAYS_PER_PERIOD.BiWeekly).toBe(14);
    expect(DAYS_PER_PERIOD.SemiMonthly).toBe(15);
    expect(DAYS_PER_PERIOD.Monthly).toBe(30);
  });

  it("declares periods-per-year per frequency", () => {
    expect(PERIODS_PER_YEAR.Weekly).toBe(52);
    expect(PERIODS_PER_YEAR.BiWeekly).toBe(26);
    expect(PERIODS_PER_YEAR.SemiMonthly).toBe(24);
    expect(PERIODS_PER_YEAR.Monthly).toBe(12);
  });
});

describe("amortization — levelPayment", () => {
  it("falls back to straight principal/n at zero rate", () => {
    expect(levelPayment(1200, 0, 12)).toBeCloseTo(100, 6);
  });

  it("matches PV-annuity for 5.99% annual / 12 monthly periods", () => {
    // r = 0.0599 * 30/360 = 0.00499166...
    const r = (0.0599 * 30) / 360;
    const p = levelPayment(10000, r, 12);
    // Expected ~$860.62 for 12-month $10k @ 5.99% APR
    expect(p).toBeGreaterThan(860);
    expect(p).toBeLessThan(861);
  });
});

describe("amortization — daysBetween", () => {
  it("returns 30 between same date one month apart", () => {
    expect(daysBetween("2025-01-15", "2025-02-14")).toBe(30);
  });

  it("returns 0 for same date", () => {
    expect(daysBetween("2025-06-01", "2025-06-01")).toBe(0);
  });

  it("returns 7 for one week", () => {
    expect(daysBetween("2025-03-03", "2025-03-10")).toBe(7);
  });
});

describe("amortization — generateSchedule (Monthly)", () => {
  const schedule = generateSchedule({
    principal: 10000,
    annualRate: 0.0599,
    termMonths: 12,
    frequency: "Monthly",
    firstPaymentDate: "2025-02-01",
  });

  it("produces 12 installments", () => {
    expect(schedule.numberOfPayments).toBe(12);
    expect(schedule.rows).toHaveLength(12);
  });

  it("ends with balance exactly 0.00", () => {
    expect(schedule.rows[11].balance).toBe(0);
  });

  it("each row's daysInPeriod is 30 for Monthly", () => {
    for (const r of schedule.rows) expect(r.daysInPeriod).toBe(30);
  });

  it("payment dates step by 30 days", () => {
    expect(schedule.rows[0].paymentDate).toBe("2025-02-01");
    expect(schedule.rows[1].paymentDate).toBe("2025-03-03");
    expect(schedule.rows[2].paymentDate).toBe("2025-04-02");
  });

  it("first interest accrual matches DSI on full balance", () => {
    // 10000 * 0.0599 / 360 * 30 = 49.9166... → round(49.92)
    expect(schedule.rows[0].interest).toBeCloseTo(49.92, 2);
  });

  it("regular payment ~ 860.62", () => {
    expect(schedule.regularPayment).toBeGreaterThan(860);
    expect(schedule.regularPayment).toBeLessThan(861);
  });

  it("totalPaid ≈ regularPayment * n (within final-period reconciliation)", () => {
    const naive = schedule.regularPayment * 12;
    expect(Math.abs(schedule.totalPaid - naive)).toBeLessThan(1.0);
  });
});

describe("amortization — generateSchedule (Weekly / BiWeekly / SemiMonthly)", () => {
  it("Weekly 12-month loan produces 52 installments", () => {
    const s = generateSchedule({
      principal: 5000,
      annualRate: 0.0999,
      termMonths: 12,
      frequency: "Weekly",
      firstPaymentDate: "2025-01-08",
    });
    expect(s.numberOfPayments).toBe(52);
    expect(s.rows[51].balance).toBe(0);
    expect(s.rows[0].daysInPeriod).toBe(7);
    // Date stepping: +7 days
    expect(s.rows[1].paymentDate).toBe("2025-01-15");
  });

  it("BiWeekly 24-month loan produces 52 installments", () => {
    const s = generateSchedule({
      principal: 8000,
      annualRate: 0.0799,
      termMonths: 24,
      frequency: "BiWeekly",
      firstPaymentDate: "2025-01-15",
    });
    expect(s.numberOfPayments).toBe(52);
    expect(s.rows[51].balance).toBe(0);
    expect(s.rows[0].daysInPeriod).toBe(14);
    expect(s.rows[1].paymentDate).toBe("2025-01-29");
  });

  it("SemiMonthly 6-month loan produces 12 installments", () => {
    const s = generateSchedule({
      principal: 3000,
      annualRate: 0.1199,
      termMonths: 6,
      frequency: "SemiMonthly",
      firstPaymentDate: "2025-01-15",
    });
    expect(s.numberOfPayments).toBe(12);
    expect(s.rows[11].balance).toBe(0);
    expect(s.rows[0].daysInPeriod).toBe(15);
    expect(s.rows[1].paymentDate).toBe("2025-01-30");
  });
});

describe("amortization — invalid input", () => {
  it("rejects non-positive principal", () => {
    expect(() =>
      generateSchedule({
        principal: 0,
        annualRate: 0.05,
        termMonths: 12,
        frequency: "Monthly",
        firstPaymentDate: "2025-02-01",
      }),
    ).toThrow(/principal/);
  });

  it("rejects negative rate", () => {
    expect(() =>
      generateSchedule({
        principal: 1000,
        annualRate: -0.01,
        termMonths: 12,
        frequency: "Monthly",
        firstPaymentDate: "2025-02-01",
      }),
    ).toThrow(/annualRate/);
  });

  it("rejects malformed first payment date", () => {
    expect(() =>
      generateSchedule({
        principal: 1000,
        annualRate: 0.05,
        termMonths: 12,
        frequency: "Monthly",
        firstPaymentDate: "Feb 1, 2025",
      }),
    ).toThrow(/firstPaymentDate/);
  });
});

describe("amortization — payoffQuote", () => {
  const schedule = generateSchedule({
    principal: 10000,
    annualRate: 0.0599,
    termMonths: 12,
    frequency: "Monthly",
    firstPaymentDate: "2025-02-01",
  });

  it("at origination, payoff equals original principal (0 days accrued)", () => {
    const q = payoffQuote(schedule, 0.0599, "2025-01-02", 0);
    expect(q.principal).toBe(10000);
    expect(q.daysAccrued).toBe(0);
    expect(q.accruedInterest).toBe(0);
    expect(q.total).toBe(10000);
  });

  it("accrues interest over partial period after first payment", () => {
    // After period 1 (2025-02-01), payoff on 2025-02-16 = 15 days into period 2.
    const q = payoffQuote(schedule, 0.0599, "2025-02-16", 1);
    expect(q.daysAccrued).toBe(15);
    expect(q.principal).toBeCloseTo(schedule.rows[0].balance, 2);
    // 15 days at half a period rate
    const expectedInt = q.principal * (0.0599 / 360) * 15;
    expect(q.accruedInterest).toBeCloseTo(Math.round(expectedInt * 100) / 100, 2);
  });

  it("rejects payoff date before paid-through date", () => {
    expect(() => payoffQuote(schedule, 0.0599, "2025-01-15", 1)).toThrow(/before/);
  });

  it("rejects out-of-range paidThroughPeriod", () => {
    expect(() => payoffQuote(schedule, 0.0599, "2026-01-01", 99)).toThrow(/out of range/);
  });
});
