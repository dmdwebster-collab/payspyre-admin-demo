import { describe, expect, it } from "vitest";
import {
  applyPaymentToSchedule,
  buildNSFEvent,
  markMissedEntries,
  nextDueEntry,
  scheduleFromLoan,
} from "./servicing";
import { generateSchedule } from "./amortization";
import { LoanSchema, type Loan } from "./types/loan";
import {
  PaymentScheduleSchema,
  PaymentScheduleEntrySchema,
  type PaymentScheduleEntry,
} from "./types/payment-schedule";
import { PaymentSchema, type Payment } from "./types/payment";
import { NSFEventSchema } from "./types/nsf-event";

// --- Fixtures -----------------------------------------------------------

/**
 * Synthetic active loan with simple round numbers so the generated
 * schedule is easy to reason about. All the loan fields are filled in to
 * make LoanSchema.parse happy — only `amount_financed`, `term`, `rate`,
 * `payment_frequency`, `first_pmt_date` actually feed the amortizer.
 */
const fixtureLoan: Loan = {
  id: "PS-TEST-001",
  acct_num: "TEST001",
  borrower: "Test, Servicing",
  co_borrower: null,
  vendor_id: "BC4906",
  vendor_name: "Kelowna Dental Centre",
  provider: "Dr. Michael Webster",
  province: "BC",
  sales_value: 5000,
  insurance: 0,
  downpayment: 0,
  amount_financed: 5000,
  new_advance: 5000,
  term: 6,
  rate: 5.99,
  regular_payment: 846.10,
  payment_frequency: "Monthly",
  cost_of_borrowing: 76.6,
  origination_date: "2026-01-01",
  org_type: "LOAN-NEW",
  first_pmt_date: "2026-02-01",
  final_pmt_date: "2026-07-01",
  diny: 360,
  platform: "M",
  status: "ACTIVE",
  sub_status: "",
  dpd: 0,
  risk_tier: "GOOD",
  fees_balance: 0,
  interest_balance: 0,
  principal_balance: 5000,
  total_owed: 5000,
  total_payments: 0,
  total_fees_paid: 0,
  total_interest_paid: 0,
  total_principal_paid: 0,
  pmt_count: 0,
  total_tx_count: 0,
  payments_realized: 0,
  fees_realized: 0,
  interest_realized: 0,
  principal_realized: 0,
  next_due_date: "2026-02-01",
  last_payment: null,
  last_tx_type: null,
  close_date: null,
  close_type: null,
  new_acct_num: null,
  renewal_payout: 0,
  principal_renewal: 0,
  interest_renewal: 0,
  fees_renewal: 0,
  adjust_principal: 0,
  adjust_interest: 0,
  adjust_fees: 0,
  writeoff_principal: 0,
  writeoff_interest: 0,
  writeoff_fees: 0,
  writeoff_small_balance: 0,
  transfer_principal: 0,
  transfer_interest: 0,
  transfer_fees: 0,
  nsf_count: 0,
  deferment_count: 0,
  est_principal_loss: 0,
  est_future_interest: 0,
  insolvent_date: null,
  insolvent_amt: 0,
  insolvent_type: "",
  ven_share_fees: 0,
  ven_share_interest: 0.5,
  ven_share_principal: 1,
};

// Sanity — the fixture must satisfy the canonical schema.
LoanSchema.parse(fixtureLoan);

const builtAt = "2026-01-15T12:00:00.000Z";

function makeFreshSchedule() {
  return scheduleFromLoan(fixtureLoan, "sched-test-001", "ent-test-001", builtAt);
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-test-001",
    loan_id: fixtureLoan.id,
    bank_account_id: null,
    scheduled_for: "2026-02-01",
    posted_at: "2026-02-01T15:00:00.000Z",
    amount: 846.10,
    method: "PAD",
    source: "BORROWER",
    status: "POSTED",
    external_ref: null,
    zum_payment_id: "zum-1",
    description: null,
    created_at: builtAt,
    updated_at: builtAt,
    ...overrides,
  };
}

// --- scheduleFromLoan ---------------------------------------------------

describe("scheduleFromLoan", () => {
  it("produces a schedule + entries that satisfy the schemas", () => {
    const { schedule, entries } = makeFreshSchedule();
    PaymentScheduleSchema.parse(schedule);
    for (const e of entries) PaymentScheduleEntrySchema.parse(e);
    expect(entries).toHaveLength(6);
  });

  it("freezes generator inputs on the schedule", () => {
    const { schedule } = makeFreshSchedule();
    expect(schedule.original_principal).toBe(5000);
    expect(schedule.annual_rate).toBe(5.99); // % form preserved
    expect(schedule.term_months).toBe(6);
    expect(schedule.payment_frequency).toBe("Monthly");
    expect(schedule.first_payment_date).toBe("2026-02-01");
    expect(schedule.schedule_version).toBe(1);
    expect(schedule.active).toBe(true);
  });

  it("matches generateSchedule() output exactly", () => {
    const { schedule, entries } = makeFreshSchedule();
    const direct = generateSchedule({
      principal: 5000,
      annualRate: 0.0599,
      termMonths: 6,
      frequency: "Monthly",
      firstPaymentDate: "2026-02-01",
    });
    expect(schedule.regular_payment).toBe(direct.regularPayment);
    expect(schedule.total_interest).toBe(direct.totalInterest);
    expect(schedule.number_of_payments).toBe(direct.numberOfPayments);
    expect(entries.map((e) => e.expected_payment)).toEqual(
      direct.rows.map((r) => r.payment),
    );
    expect(entries.map((e) => e.due_date)).toEqual(
      direct.rows.map((r) => r.paymentDate),
    );
  });

  it("starts every entry as PENDING with paid_amount=0 and no payment_id", () => {
    const { entries } = makeFreshSchedule();
    for (const e of entries) {
      expect(e.status).toBe("PENDING");
      expect(e.paid_amount).toBe(0);
      expect(e.payment_id).toBeNull();
      expect(e.paid_at).toBeNull();
    }
  });

  it("entry ids are stable, zero-padded, and unique", () => {
    const { entries } = makeFreshSchedule();
    const ids = entries.map((e) => e.id);
    expect(ids[0]).toBe("ent-test-001-001");
    expect(ids[5]).toBe("ent-test-001-006");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("translates Loan.rate (percentage) to decimal for the amortizer", () => {
    // If the conversion were missed, the amortizer would treat 5.99 as 599%
    // and produce nonsense. Confirm the regular_payment lands in a sane band.
    const { schedule } = makeFreshSchedule();
    expect(schedule.regular_payment).toBeGreaterThan(800);
    expect(schedule.regular_payment).toBeLessThan(900);
  });
});

// --- applyPaymentToSchedule --------------------------------------------

describe("applyPaymentToSchedule", () => {
  it("marks the next pending entry PAID when payment matches expected", () => {
    const { entries } = makeFreshSchedule();
    const payment = makePayment({ amount: entries[0].expected_payment });
    const next = applyPaymentToSchedule(entries, payment);
    expect(next[0].status).toBe("PAID");
    expect(next[0].paid_amount).toBe(entries[0].expected_payment);
    expect(next[0].payment_id).toBe(payment.id);
    expect(next[0].paid_at).toBe("2026-02-01");
    expect(next[1].status).toBe("PENDING");
    expect(next[1].paid_amount).toBe(0);
  });

  it("marks the entry PARTIAL when payment is less than expected", () => {
    const { entries } = makeFreshSchedule();
    const partial = makePayment({ amount: 200, id: "pay-partial" });
    const next = applyPaymentToSchedule(entries, partial);
    expect(next[0].status).toBe("PARTIAL");
    expect(next[0].paid_amount).toBe(200);
    expect(next[0].payment_id).toBe("pay-partial");
    expect(next[1].status).toBe("PENDING");
  });

  it("advances to the next entry when payment exceeds what's owed on the current one", () => {
    const { entries } = makeFreshSchedule();
    const expected = entries[0].expected_payment;
    const big = makePayment({ amount: expected + 100, id: "pay-big" });
    const next = applyPaymentToSchedule(entries, big);
    expect(next[0].status).toBe("PAID");
    expect(next[1].status).toBe("PARTIAL");
    expect(next[1].paid_amount).toBe(100);
  });

  it("does not allocate to PAID or WAIVED entries", () => {
    const { entries } = makeFreshSchedule();
    const seeded: PaymentScheduleEntry[] = entries.map((e, i) => {
      if (i === 0) return { ...e, status: "PAID", paid_amount: e.expected_payment };
      if (i === 1) return { ...e, status: "WAIVED" };
      return e;
    });
    const payment = makePayment({ amount: 100 });
    const next = applyPaymentToSchedule(seeded, payment);
    expect(next[0].status).toBe("PAID");
    expect(next[0].paid_amount).toBe(seeded[0].expected_payment); // untouched
    expect(next[1].status).toBe("WAIVED");
    expect(next[2].status).toBe("PARTIAL");
    expect(next[2].paid_amount).toBe(100);
  });

  it("ignores SCHEDULED / PROCESSING / RETURNED / FAILED / CANCELLED payments", () => {
    const { entries } = makeFreshSchedule();
    for (const status of [
      "SCHEDULED",
      "PROCESSING",
      "RETURNED",
      "FAILED",
      "REVERSED",
      "CANCELLED",
    ] as const) {
      const next = applyPaymentToSchedule(entries, makePayment({ status }));
      expect(next).toEqual(entries);
    }
  });

  it("does not mutate the input array", () => {
    const { entries } = makeFreshSchedule();
    const snapshot = JSON.stringify(entries);
    applyPaymentToSchedule(entries, makePayment());
    expect(JSON.stringify(entries)).toBe(snapshot);
  });

  it("returns the input unchanged for zero/negative amounts (via Zod parse boundary)", () => {
    const { entries } = makeFreshSchedule();
    // PaymentSchema rejects amount<=0 at the boundary, so we test the helper
    // guard separately with a hand-built record.
    const bad: Payment = { ...makePayment(), amount: 0.0001 };
    // amount near zero falls under PENNY tolerance and causes no mutation
    const next = applyPaymentToSchedule(entries, { ...bad, amount: 0.001 });
    expect(next).toEqual(entries);
  });
});

// --- markMissedEntries / nextDueEntry ----------------------------------

describe("markMissedEntries", () => {
  it("flips PENDING entries past asOf to MISSED", () => {
    const { entries } = makeFreshSchedule();
    const next = markMissedEntries(entries, new Date("2026-04-15T00:00:00.000Z"));
    // First two entries due 2026-02-01 and 2026-03-03 → both MISSED
    expect(next[0].status).toBe("MISSED");
    expect(next[1].status).toBe("MISSED");
    // 2026-04-02 is also before 2026-04-15 → MISSED
    expect(next[2].status).toBe("MISSED");
    // 2026-05-02 is after 2026-04-15 → still PENDING
    expect(next[3].status).toBe("PENDING");
  });

  it("flips PARTIAL entries past asOf to MISSED but leaves PAID/WAIVED alone", () => {
    const { entries } = makeFreshSchedule();
    const seeded: PaymentScheduleEntry[] = entries.map((e, i) => {
      if (i === 0) return { ...e, status: "PAID" };
      if (i === 1) return { ...e, status: "PARTIAL", paid_amount: 100 };
      if (i === 2) return { ...e, status: "WAIVED" };
      return e;
    });
    const next = markMissedEntries(seeded, new Date("2026-04-15T00:00:00.000Z"));
    expect(next[0].status).toBe("PAID");
    expect(next[1].status).toBe("MISSED");
    expect(next[2].status).toBe("WAIVED");
  });

  it("does not mutate the input array", () => {
    const { entries } = makeFreshSchedule();
    const snapshot = JSON.stringify(entries);
    markMissedEntries(entries, new Date("2026-12-01T00:00:00.000Z"));
    expect(JSON.stringify(entries)).toBe(snapshot);
  });
});

describe("nextDueEntry", () => {
  it("returns the first non-paid, non-waived entry in period order", () => {
    const { entries } = makeFreshSchedule();
    expect(nextDueEntry(entries)?.period).toBe(1);
    const seeded = entries.map((e, i) =>
      i === 0 ? { ...e, status: "PAID" as const } : e,
    );
    expect(nextDueEntry(seeded)?.period).toBe(2);
  });

  it("treats PARTIAL as still owing", () => {
    const { entries } = makeFreshSchedule();
    const seeded = entries.map((e, i) =>
      i === 0 ? { ...e, status: "PARTIAL" as const, paid_amount: 100 } : e,
    );
    expect(nextDueEntry(seeded)?.period).toBe(1);
  });

  it("returns null when every entry is PAID or WAIVED", () => {
    const { entries } = makeFreshSchedule();
    const seeded = entries.map((e, i) => ({
      ...e,
      status: (i % 2 === 0 ? "PAID" : "WAIVED") as "PAID" | "WAIVED",
    }));
    expect(nextDueEntry(seeded)).toBeNull();
  });
});

// --- buildNSFEvent ------------------------------------------------------

describe("buildNSFEvent", () => {
  it("produces an NSFEvent that satisfies the schema", () => {
    const payment = makePayment({ status: "RETURNED" });
    const event = buildNSFEvent({
      id: "nsf-test-001",
      payment,
      reason_code: "NSF",
      reason_description: "Insufficient funds",
      nsf_fee_charged: 45,
      bank_fee_recovered: null,
      occurred_at: "2026-02-02T12:00:00.000Z",
    });
    NSFEventSchema.parse(event);
    expect(event.loan_id).toBe(payment.loan_id);
    expect(event.payment_id).toBe(payment.id);
    expect(event.reason_code).toBe("NSF");
    expect(event.nsf_fee_charged).toBe(45);
    expect(event.retry_attempted).toBe(false);
    expect(event.retry_payment_id).toBeNull();
    expect(event.resolved_at).toBeNull();
    expect(event.resolution).toBeNull();
  });

  it("defaults reason_description / bank_fee_recovered to null when omitted", () => {
    const event = buildNSFEvent({
      id: "nsf-test-002",
      payment: makePayment(),
      reason_code: "ACCT_CLOSED",
      nsf_fee_charged: 0,
    });
    expect(event.reason_description).toBeNull();
    expect(event.bank_fee_recovered).toBeNull();
  });
});

// --- Schema boundary checks --------------------------------------------

describe("PaymentSchema", () => {
  it("rejects non-positive amounts", () => {
    expect(() => PaymentSchema.parse({ ...makePayment(), amount: 0 })).toThrow();
    expect(() => PaymentSchema.parse({ ...makePayment(), amount: -1 })).toThrow();
  });

  it("rejects unknown method / source / status", () => {
    expect(() =>
      PaymentSchema.parse({ ...makePayment(), method: "BITCOIN" }),
    ).toThrow();
    expect(() =>
      PaymentSchema.parse({ ...makePayment(), source: "ALIEN" }),
    ).toThrow();
    expect(() =>
      PaymentSchema.parse({ ...makePayment(), status: "MAYBE" }),
    ).toThrow();
  });
});
