import { describe, expect, it } from "vitest";
import { runMigration } from "./turnkey-import";
import {
  adaptApplication,
  adaptBorrower,
  adaptLoan,
  adaptScheduleFromExport,
  adaptTransaction,
  ids,
  mapApplicationStatus,
  mapLoanStatus,
  mapPaymentFrequency,
} from "./adapters";
import type {
  TurnKeyApplicationRecord,
  TurnKeyBorrowerRecord,
  TurnKeyExport,
  TurnKeyLoanRecord,
  TurnKeyScheduleRecord,
  TurnKeyTransactionRecord,
} from "./types";
import { BorrowerSchema } from "../types/borrower";

// --- Fixture builders --------------------------------------------------

function makeBorrower(over: Partial<TurnKeyBorrowerRecord> = {}): TurnKeyBorrowerRecord {
  return {
    borrower_id: "B-001",
    first_name: "Stella",
    last_name: "Figueroa",
    email: "stella@example.com",
    phone: "604-555-0100",
    province: "BC",
    date_of_birth: "1985-04-12",
    address_line1: "100 Main St",
    city: "Kelowna",
    postal_code: "V1Y1Y1",
    ...over,
  };
}

function makeApp(over: Partial<TurnKeyApplicationRecord> = {}): TurnKeyApplicationRecord {
  return {
    application_id: "A-001",
    borrower_id: "B-001",
    vendor_id: "BC4906",
    vendor_name: "Kelowna Dental Centre",
    province: "BC",
    status: "ACTIVE",
    requested_amount: 5000,
    offer_amount: 5000,
    term_months: 24,
    interest_rate: 5.99,
    payment_frequency: "Monthly",
    created_at: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function makeLoan(over: Partial<TurnKeyLoanRecord> = {}): TurnKeyLoanRecord {
  return {
    account_number: "100200",
    application_id: "A-001",
    borrower_id: "B-001",
    vendor_id: "BC4906",
    vendor_name: "Kelowna Dental Centre",
    provider: "Dr. Michael Webster",
    province: "BC",
    principal_advanced: 5000,
    rate: 5.99,
    term_months: 24,
    payment_frequency: "Monthly",
    first_payment_date: "2026-02-01",
    origination_date: "2026-01-15",
    status: "ACTIVE",
    principal_balance: 5000,
    total_interest_paid: 0,
    total_principal_paid: 0,
    total_payments: 0,
    ...over,
  };
}

function makeSchedule(over: Partial<TurnKeyScheduleRecord> = {}): TurnKeyScheduleRecord {
  const base: TurnKeyScheduleRecord = {
    schedule_id: "S-001",
    account_number: "100200",
    schedule_version: 1,
    generated_at: "2026-01-15T00:00:00.000Z",
    original_principal: 5000,
    annual_rate: 5.99,
    term_months: 24,
    payment_frequency: "Monthly",
    first_payment_date: "2026-02-01",
    number_of_payments: 24,
    regular_payment: 221.62,
    total_interest: 318.85,
    total_paid: 5318.85,
    entries: [
      {
        entry_id: "E-001",
        period: 1,
        due_date: "2026-02-01",
        days_in_period: 30,
        expected_payment: 221.62,
        expected_interest: 24.96,
        expected_principal: 196.66,
        expected_balance_after: 4803.34,
        status: "PENDING",
        paid_amount: 0,
      },
    ],
  };
  return { ...base, ...over };
}

function makeTransaction(
  over: Partial<TurnKeyTransactionRecord> = {},
): TurnKeyTransactionRecord {
  return {
    transaction_id: "T-001",
    account_number: "100200",
    transaction_date: "2026-02-01",
    transaction_type: "PAYMENT",
    payment_amount: 221.62,
    fees_charged: 0,
    fees_paid: 0,
    interest_paid: 24.96,
    principal_paid: 196.66,
    fee_balance: 0,
    interest_balance: 0,
    principal_balance: 4803.34,
    rate: 0.0599,
    ...over,
  };
}

function makeExport(over: Partial<TurnKeyExport> = {}): TurnKeyExport {
  return {
    generated_at: "2026-04-15T00:00:00.000Z",
    source: "turnkey",
    borrowers: [makeBorrower()],
    applications: [makeApp()],
    loans: [makeLoan()],
    payment_schedules: [makeSchedule()],
    transactions: [makeTransaction()],
    documents: [],
    ...over,
  };
}

// --- Status mappers ----------------------------------------------------

describe("status mappers", () => {
  it("maps loan statuses (case-insensitive, multiple aliases)", () => {
    expect(mapLoanStatus("ACTIVE")).toBe("ACTIVE");
    expect(mapLoanStatus("open")).toBe("ACTIVE");
    expect(mapLoanStatus("Current")).toBe("ACTIVE");
    expect(mapLoanStatus("PAID")).toBe("PAID_OFF");
    expect(mapLoanStatus("write-off")).toBeNull(); // hyphen not handled
    expect(mapLoanStatus("WRITTEN_OFF")).toBe("WRITTEN_OFF");
    expect(mapLoanStatus("WRITEOFF")).toBe("WRITTEN_OFF");
    expect(mapLoanStatus("VOID")).toBe("VOIDED");
    expect(mapLoanStatus("UNKNOWN_STATUS")).toBeNull();
  });

  it("maps application statuses", () => {
    expect(mapApplicationStatus("ACTIVE")).toBe("ACTIVE");
    expect(mapApplicationStatus("BOOKED")).toBe("ACTIVE");
    expect(mapApplicationStatus("DECLINED")).toBe("REJECTED");
    expect(mapApplicationStatus("FROZEN")).toBeNull();
  });

  it("maps payment frequencies (separator-tolerant)", () => {
    expect(mapPaymentFrequency("Monthly")).toBe("Monthly");
    expect(mapPaymentFrequency("BI-WEEKLY")).toBe("BiWeekly");
    expect(mapPaymentFrequency("bi_weekly")).toBe("BiWeekly");
    expect(mapPaymentFrequency("FORTNIGHTLY")).toBe("BiWeekly");
    expect(mapPaymentFrequency("SEMI MONTHLY")).toBe("SemiMonthly");
    expect(mapPaymentFrequency("nope")).toBeNull();
  });
});

// --- ID derivation -----------------------------------------------------

describe("ids", () => {
  it("borrower ids are valid UUIDv5 (deterministic, version 5, variant 10xx)", () => {
    const id1 = ids.borrower("B-001");
    const id2 = ids.borrower("B-001");
    expect(id1).toBe(id2);
    BorrowerSchema.shape.id.parse(id1); // .uuid() refinement passes
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(ids.borrower("B-001")).not.toBe(ids.borrower("B-002"));
  });

  it("loan, application, transaction, document, schedule ids are deterministic", () => {
    expect(ids.loan("100200")).toBe("PS-TK-100200");
    expect(ids.loan("100200")).toBe(ids.loan("100200"));
    expect(ids.application("A-001")).toBe("APP-TK-A-001");
    expect(ids.transaction("T-001")).toBe(ids.transaction("T-001"));
    expect(ids.document("D-001")).toBe(ids.document("D-001"));
    expect(ids.schedule("100200", 1)).toBe(ids.schedule("100200", 1));
    expect(ids.schedule("100200", 1)).not.toBe(ids.schedule("100200", 2));
  });

  it("schedule entry ids change with period", () => {
    const e1 = ids.scheduleEntry("100200", 1, 1);
    const e2 = ids.scheduleEntry("100200", 1, 2);
    expect(e1).not.toBe(e2);
    expect(e1).toBe(ids.scheduleEntry("100200", 1, 1));
  });
});

// --- Per-adapter happy + sad paths ------------------------------------

describe("adaptBorrower", () => {
  it("returns ok on a valid record", () => {
    const r = adaptBorrower(makeBorrower());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.id).toBe(ids.borrower("B-001"));
  });

  it("flags unsupported provinces", () => {
    const r = adaptBorrower(makeBorrower({ province: "ON" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.entity).toBe("borrower");
      expect(r.error.field).toBe("province");
    }
  });

  it("flags missing borrower_id", () => {
    const r = adaptBorrower(makeBorrower({ borrower_id: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toMatch(/missing borrower_id/);
  });

  it("flags malformed email via Zod schema", () => {
    const r = adaptBorrower(makeBorrower({ email: "not-an-email" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.field).toContain("email");
  });
});

describe("adaptApplication", () => {
  const borrowerIdMap = new Map([["B-001", ids.borrower("B-001")]]);

  it("returns ok and links the borrower", () => {
    const r = adaptApplication(makeApp(), borrowerIdMap);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.primary_borrower_id).toBe(ids.borrower("B-001"));
  });

  it("flags unknown borrower_id", () => {
    const r = adaptApplication(makeApp({ borrower_id: "GHOST" }), borrowerIdMap);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toMatch(/unknown borrower_id/);
  });

  it("flags unknown application status", () => {
    const r = adaptApplication(makeApp({ status: "FROZEN" }), borrowerIdMap);
    expect(r.ok).toBe(false);
  });
});

describe("adaptLoan", () => {
  it("returns ok on a valid record", () => {
    const r = adaptLoan(makeLoan());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id).toBe("PS-TK-100200");
      expect(r.value.amount_financed).toBe(5000);
      expect(r.value.diny).toBe(360);
    }
  });

  it("flags unrecognized status", () => {
    const r = adaptLoan(makeLoan({ status: "WEIRD" }));
    expect(r.ok).toBe(false);
  });

  it("flags unsupported province", () => {
    const r = adaptLoan(makeLoan({ province: "ON" }));
    expect(r.ok).toBe(false);
  });
});

describe("adaptScheduleFromExport", () => {
  it("rebuilds the schedule with derived ids and the right loan_id", () => {
    const r = adaptScheduleFromExport(makeSchedule());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.schedule.loan_id).toBe(ids.loan("100200"));
      expect(r.value.entries[0].schedule_id).toBe(r.value.schedule.id);
    }
  });

  it("flags an unrecognized payment frequency on the schedule", () => {
    const r = adaptScheduleFromExport(makeSchedule({ payment_frequency: "Quarterly" }));
    expect(r.ok).toBe(false);
  });
});

describe("adaptTransaction", () => {
  const loanIdMap = new Map([["100200", ids.loan("100200")]]);

  it("links the transaction to the resolved loan id", () => {
    const r = adaptTransaction(makeTransaction(), loanIdMap);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.loan_id).toBe(ids.loan("100200"));
  });

  it("flags an unknown account_number", () => {
    const r = adaptTransaction(makeTransaction({ account_number: "GHOST" }), loanIdMap);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.field).toBe("account_number");
  });
});

// --- runMigration end-to-end ------------------------------------------

describe("runMigration — happy path (use_export schedule)", () => {
  const exp = makeExport();
  const result = runMigration(exp, {
    ran_at: "2026-04-15T00:00:00.000Z",
    schedule_strategy: "use_export",
  });

  it("imports every entity with no errors", () => {
    expect(result.errors).toHaveLength(0);
    expect(result.imported.borrowers).toHaveLength(1);
    expect(result.imported.applications).toHaveLength(1);
    expect(result.imported.loans).toHaveLength(1);
    expect(result.imported.schedules).toHaveLength(1);
    expect(result.imported.schedule_entries).toHaveLength(1);
    expect(result.imported.transactions).toHaveLength(1);
  });

  it("reconciliation report.ok = true with zero deltas", () => {
    const r = result.reconciliation;
    expect(r.ok).toBe(true);
    expect(r.money_totals.total_principal_advanced.delta).toBe(0);
    expect(r.money_totals.total_payments_received.delta).toBe(0);
    expect(r.money_totals.total_outstanding_principal.delta).toBe(0);
    expect(r.issues).toHaveLength(0);
    expect(r.per_entity.loan.failed).toBe(0);
    expect(r.per_entity.borrower.imported).toBe(1);
  });
});

describe("runMigration — schedule_strategy", () => {
  it("regenerate ignores the export schedule and re-derives via lib/servicing", () => {
    // Provide an export schedule that's deliberately wrong; with regenerate,
    // the runner must build a fresh schedule from the loan params.
    const exp = makeExport({
      payment_schedules: [
        makeSchedule({ regular_payment: 99999, total_interest: 99999 }),
      ],
    });
    const r = runMigration(exp, {
      ran_at: "2026-04-15T00:00:00.000Z",
      schedule_strategy: "regenerate",
    });
    const sched = r.imported.schedules[0];
    expect(sched.regular_payment).not.toBe(99999);
    // 24 entries from a 24-month Monthly schedule
    expect(r.imported.schedule_entries).toHaveLength(24);
    expect(r.errors).toHaveLength(0);
  });

  it("auto regenerates only when no export schedule is present", () => {
    const exp = makeExport({ payment_schedules: [] });
    const r = runMigration(exp, {
      ran_at: "2026-04-15T00:00:00.000Z",
      schedule_strategy: "auto",
    });
    expect(r.imported.schedules).toHaveLength(1); // regenerated
    expect(r.imported.schedule_entries.length).toBeGreaterThan(0);
  });

  it("use_export errors when a loan has no schedule in the export", () => {
    const exp = makeExport({ payment_schedules: [] });
    const r = runMigration(exp, {
      ran_at: "2026-04-15T00:00:00.000Z",
      schedule_strategy: "use_export",
    });
    expect(r.errors.some((e) => e.entity === "schedule")).toBe(true);
    expect(r.imported.schedules).toHaveLength(0);
    expect(r.reconciliation.ok).toBe(false);
  });
});

describe("runMigration — idempotency", () => {
  it("two runs with identical input produce identical results (modulo stable ran_at)", () => {
    const exp = makeExport();
    const opts = { ran_at: "2026-04-15T00:00:00.000Z" } as const;
    const a = runMigration(exp, opts);
    const b = runMigration(exp, opts);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("runMigration — error accumulation + reconciliation", () => {
  it("flags failure_rate, drops, and surfaces per-entity issues", () => {
    const exp = makeExport({
      borrowers: [
        makeBorrower(),
        makeBorrower({ borrower_id: "B-002", email: "broken-email" }),
      ],
    });
    const r = runMigration(exp, { ran_at: "2026-04-15T00:00:00.000Z" });
    expect(r.errors.length).toBeGreaterThanOrEqual(1);
    expect(r.imported.borrowers).toHaveLength(1);
    expect(r.reconciliation.per_entity.borrower.failed).toBeGreaterThanOrEqual(1);
    expect(r.reconciliation.ok).toBe(false);
    expect(r.reconciliation.issues.length).toBeGreaterThan(0);
  });

  it("flags money delta when imported principal does not equal exported principal", () => {
    // Inject a loan whose principal_advanced differs from what we'll let
    // through (use a status mapping failure to drop one loan, leaving the
    // imported total below the exported total).
    const exp = makeExport({
      loans: [
        makeLoan(),
        makeLoan({
          account_number: "100201",
          status: "ZAP_INVALID",
          principal_advanced: 1000,
        }),
      ],
    });
    const r = runMigration(exp, {
      ran_at: "2026-04-15T00:00:00.000Z",
      tolerance_cad: 0.01,
    });
    expect(r.imported.loans).toHaveLength(1);
    expect(r.reconciliation.money_totals.total_principal_advanced.delta).toBe(-1000);
    expect(r.reconciliation.ok).toBe(false);
    expect(
      r.reconciliation.issues.some((i) => i.includes("total_principal_advanced")),
    ).toBe(true);
  });
});

describe("runMigration — empty export", () => {
  it("handles an empty export without throwing", () => {
    const exp: TurnKeyExport = {
      generated_at: "2026-04-15T00:00:00.000Z",
      source: "turnkey",
      borrowers: [],
      applications: [],
      loans: [],
      transactions: [],
      documents: [],
    };
    const r = runMigration(exp, { ran_at: "2026-04-15T00:00:00.000Z" });
    expect(r.errors).toHaveLength(0);
    expect(r.imported.loans).toHaveLength(0);
    expect(r.reconciliation.ok).toBe(true);
  });
});
