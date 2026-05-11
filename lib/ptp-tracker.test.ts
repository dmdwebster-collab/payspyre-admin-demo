import { describe, expect, it } from "vitest";
import { processPTPs, ptpsDueSoon } from "./ptp-tracker";
import type { NSFEvent } from "./types/nsf-event";
import type { Payment } from "./types/payment";

function makeEvent(over: Partial<NSFEvent> = {}): NSFEvent {
  return {
    id: "nsf-1",
    loan_id: "PS-SAMPLE-001",
    payment_id: "pay-orig-1",
    occurred_at: "2026-04-01T00:00:00.000Z",
    reason_code: "NSF",
    reason_description: null,
    nsf_fee_charged: 45,
    bank_fee_recovered: null,
    retry_attempted: false,
    retry_payment_id: null,
    retry_at: null,
    resolved_at: "2026-04-05T00:00:00.000Z",
    resolution: "PROMISE_TO_PAY",
    ptp_amount: 250,
    ptp_due_date: "2026-05-15",
    ptp_method: "PAD",
    ptp_status: "OPEN",
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-05T00:00:00.000Z",
    ...over,
  };
}

function makePayment(over: Partial<Payment> = {}): Payment {
  return {
    id: "pay-test-1",
    loan_id: "PS-SAMPLE-001",
    bank_account_id: null,
    scheduled_for: "2026-05-10",
    posted_at: "2026-05-10T15:00:00.000Z",
    amount: 250,
    method: "PAD",
    source: "BORROWER",
    status: "POSTED",
    external_ref: null,
    zum_payment_id: null,
    description: "Borrower follow-through",
    created_at: "2026-05-09T00:00:00.000Z",
    updated_at: "2026-05-10T15:00:00.000Z",
    ...over,
  };
}

const ASOF_BEFORE_DUE = new Date("2026-05-10T00:00:00.000Z");
const ASOF_PAST_DUE = new Date("2026-05-20T00:00:00.000Z");

describe("processPTPs — KEPT decision", () => {
  it("flips OPEN → KEPT when a matching POSTED Borrower payment exists on or before ptp_due_date", () => {
    const r = processPTPs([makeEvent()], [makePayment()], ASOF_BEFORE_DUE);
    expect(r.events[0].ptp_status).toBe("KEPT");
    expect(r.transitions).toHaveLength(1);
    expect(r.transitions[0].reason).toBe("matching_payment_posted");
    expect(r.transitions[0].matching_payment_id).toBe("pay-test-1");
    expect(r.open_count).toBe(0);
  });

  it("matches within tolerance (default $1)", () => {
    const r = processPTPs(
      [makeEvent()],
      [makePayment({ amount: 249.5 })],
      ASOF_BEFORE_DUE,
    );
    expect(r.events[0].ptp_status).toBe("KEPT");
  });

  it("does not match outside tolerance", () => {
    const r = processPTPs(
      [makeEvent()],
      [makePayment({ amount: 200 })],
      ASOF_BEFORE_DUE,
    );
    expect(r.events[0].ptp_status).toBe("OPEN");
    expect(r.transitions).toHaveLength(0);
  });

  it("respects custom tolerance_cad", () => {
    const r = processPTPs(
      [makeEvent()],
      [makePayment({ amount: 245 })],
      ASOF_BEFORE_DUE,
      10,
    );
    expect(r.events[0].ptp_status).toBe("KEPT");
  });

  it("ignores collections-source payments (those are the original NSF retry, not a borrower follow-through)", () => {
    const r = processPTPs(
      [makeEvent()],
      [makePayment({ source: "COLLECTIONS" })],
      ASOF_BEFORE_DUE,
    );
    expect(r.events[0].ptp_status).toBe("OPEN");
  });

  it("ignores non-POSTED payments", () => {
    for (const status of ["SCHEDULED", "RETURNED", "FAILED"] as const) {
      const r = processPTPs(
        [makeEvent()],
        [makePayment({ status })],
        ASOF_BEFORE_DUE,
      );
      expect(r.events[0].ptp_status).toBe("OPEN");
    }
  });

  it("ignores payments posted after ptp_due_date", () => {
    const r = processPTPs(
      [makeEvent()],
      [makePayment({ posted_at: "2026-05-16T10:00:00.000Z" })],
      ASOF_PAST_DUE,
    );
    expect(r.events[0].ptp_status).toBe("BROKEN"); // late payment doesn't redeem
  });
});

describe("processPTPs — BROKEN decision", () => {
  it("flips OPEN → BROKEN when ptp_due_date is past asOf and no matching payment exists", () => {
    const r = processPTPs([makeEvent()], [], ASOF_PAST_DUE);
    expect(r.events[0].ptp_status).toBe("BROKEN");
    expect(r.transitions[0].reason).toBe("ptp_due_date_passed");
  });

  it("leaves OPEN when due_date is still in the future and no matching payment", () => {
    const r = processPTPs([makeEvent()], [], ASOF_BEFORE_DUE);
    expect(r.events[0].ptp_status).toBe("OPEN");
    expect(r.transitions).toHaveLength(0);
    expect(r.open_count).toBe(1);
  });
});

describe("processPTPs — only OPEN events", () => {
  it("does not touch events that are already KEPT / BROKEN / null", () => {
    const events = [
      makeEvent({ id: "1", ptp_status: "KEPT" }),
      makeEvent({ id: "2", ptp_status: "BROKEN" }),
      makeEvent({ id: "3", ptp_status: null, resolution: "WRITTEN_OFF" }),
    ];
    const r = processPTPs(events, [], ASOF_PAST_DUE);
    expect(r.events.map((e) => e.ptp_status)).toEqual(["KEPT", "BROKEN", null]);
    expect(r.transitions).toHaveLength(0);
  });

  it("does not mutate input events", () => {
    const events = [makeEvent()];
    const snap = JSON.stringify(events);
    processPTPs(events, [], ASOF_PAST_DUE);
    expect(JSON.stringify(events)).toBe(snap);
  });
});

describe("ptpsDueSoon", () => {
  it("returns OPEN events whose due date falls within the horizon", () => {
    const events = [
      makeEvent({ id: "soon", ptp_due_date: "2026-05-13" }),
      makeEvent({ id: "later", ptp_due_date: "2026-06-15" }),
      makeEvent({ id: "past", ptp_due_date: "2026-04-15" }),
    ];
    const r = ptpsDueSoon(events, 7, new Date("2026-05-10T00:00:00.000Z"));
    expect(r.map((e) => e.id)).toEqual(["soon"]);
  });

  it("excludes non-OPEN events", () => {
    const events = [
      makeEvent({ id: "kept", ptp_due_date: "2026-05-13", ptp_status: "KEPT" }),
      makeEvent({ id: "open", ptp_due_date: "2026-05-13", ptp_status: "OPEN" }),
    ];
    const r = ptpsDueSoon(events, 7, new Date("2026-05-10T00:00:00.000Z"));
    expect(r.map((e) => e.id)).toEqual(["open"]);
  });

  it("sorts by due date ascending", () => {
    const events = [
      makeEvent({ id: "later", ptp_due_date: "2026-05-15" }),
      makeEvent({ id: "earlier", ptp_due_date: "2026-05-12" }),
    ];
    const r = ptpsDueSoon(events, 7, new Date("2026-05-10T00:00:00.000Z"));
    expect(r.map((e) => e.id)).toEqual(["earlier", "later"]);
  });
});
