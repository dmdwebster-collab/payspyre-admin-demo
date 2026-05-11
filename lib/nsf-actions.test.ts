import { describe, expect, it } from "vitest";
import { applyResolution, buildRetry } from "./nsf-actions";
import type { NSFEvent } from "./types/nsf-event";
import { NSFEventSchema } from "./types/nsf-event";
import { PaymentSchema } from "./types/payment";

function makeEvent(over: Partial<NSFEvent> = {}): NSFEvent {
  return {
    id: "nsf-1",
    loan_id: "PS-SAMPLE-001",
    payment_id: "pay-1",
    occurred_at: "2026-04-04T08:30:00.000Z",
    reason_code: "NSF",
    reason_description: "Insufficient funds",
    nsf_fee_charged: 45,
    bank_fee_recovered: null,
    retry_attempted: false,
    retry_payment_id: null,
    retry_at: null,
    resolved_at: null,
    resolution: null,
    created_at: "2026-04-04T08:30:00.000Z",
    updated_at: "2026-04-04T08:30:00.000Z",
    ...over,
  };
}

const NOW = new Date("2026-05-10T12:00:00.000Z");

// --- applyResolution ------------------------------------------------------

describe("applyResolution", () => {
  it("returns a next event satisfying NSFEventSchema with the resolution stamped", () => {
    const { next, input } = applyResolution(
      makeEvent(),
      { resolution: "RECOVERED", comments: "Borrower paid by EFT" },
      NOW,
    );
    NSFEventSchema.parse(next);
    expect(next.resolution).toBe("RECOVERED");
    expect(next.resolved_at).toBe("2026-05-10T12:00:00.000Z");
    expect(next.updated_at).toBe("2026-05-10T12:00:00.000Z");
    expect(input.comments).toBe("Borrower paid by EFT");
  });

  it("accepts each of the four resolution values", () => {
    // Non-PTP resolutions only need `resolution`; PROMISE_TO_PAY needs PTP
    // fields too (covered separately in the PR #4.4.3 PTP cases below).
    for (const r of ["RECOVERED", "WRITTEN_OFF", "IN_COLLECTIONS"] as const) {
      const { next } = applyResolution(makeEvent(), { resolution: r }, NOW);
      expect(next.resolution).toBe(r);
    }
  });

  it("rejects an unknown resolution value", () => {
    expect(() =>
      applyResolution(makeEvent(), { resolution: "MAYBE" }, NOW),
    ).toThrow();
  });

  it("rejects a missing resolution", () => {
    expect(() => applyResolution(makeEvent(), {}, NOW)).toThrow();
  });

  it("rejects re-resolving an already-resolved event", () => {
    const resolved = makeEvent({
      resolved_at: "2026-04-10T00:00:00.000Z",
      resolution: "RECOVERED",
    });
    expect(() =>
      applyResolution(resolved, { resolution: "WRITTEN_OFF" }, NOW),
    ).toThrow(/already resolved/);
  });

  it("does not mutate the input event", () => {
    const event = makeEvent();
    const snapshot = JSON.stringify(event);
    applyResolution(event, { resolution: "RECOVERED" }, NOW);
    expect(JSON.stringify(event)).toBe(snapshot);
  });

  // --- PR #4.4.3: PTP capture ---

  it("rejects PROMISE_TO_PAY without PTP fields", () => {
    expect(() =>
      applyResolution(makeEvent(), { resolution: "PROMISE_TO_PAY" }, NOW),
    ).toThrow();
  });

  it("rejects PROMISE_TO_PAY with partial PTP fields", () => {
    expect(() =>
      applyResolution(
        makeEvent(),
        {
          resolution: "PROMISE_TO_PAY",
          ptp_amount: 250,
          // missing ptp_due_date + ptp_method
        },
        NOW,
      ),
    ).toThrow();
  });

  it("accepts PROMISE_TO_PAY with full PTP fields, stamping ptp_status=OPEN", () => {
    const { next } = applyResolution(
      makeEvent(),
      {
        resolution: "PROMISE_TO_PAY",
        ptp_amount: 250,
        ptp_due_date: "2026-05-20",
        ptp_method: "PAD",
        comments: "Borrower called",
      },
      NOW,
    );
    expect(next.resolution).toBe("PROMISE_TO_PAY");
    expect(next.ptp_amount).toBe(250);
    expect(next.ptp_due_date).toBe("2026-05-20");
    expect(next.ptp_method).toBe("PAD");
    expect(next.ptp_status).toBe("OPEN");
  });

  it("rejects malformed ptp_due_date format", () => {
    expect(() =>
      applyResolution(
        makeEvent(),
        {
          resolution: "PROMISE_TO_PAY",
          ptp_amount: 250,
          ptp_due_date: "May 20",
          ptp_method: "PAD",
        },
        NOW,
      ),
    ).toThrow(/YYYY-MM-DD/);
  });

  it("rejects negative or zero ptp_amount", () => {
    expect(() =>
      applyResolution(
        makeEvent(),
        {
          resolution: "PROMISE_TO_PAY",
          ptp_amount: 0,
          ptp_due_date: "2026-05-20",
          ptp_method: "PAD",
        },
        NOW,
      ),
    ).toThrow();
  });

  it("clears stale PTP fields when resolution changes to non-PTP", () => {
    // The schema's idempotency guard rejects re-resolving, so simulate
    // by hand-building an event that already has PTP fields set.
    const stale = makeEvent({
      ptp_amount: 250,
      ptp_due_date: "2026-04-30",
      ptp_method: "PAD",
      ptp_status: "OPEN",
    });
    const { next } = applyResolution(stale, { resolution: "WRITTEN_OFF" }, NOW);
    expect(next.resolution).toBe("WRITTEN_OFF");
    expect(next.ptp_amount).toBeNull();
    expect(next.ptp_due_date).toBeNull();
    expect(next.ptp_method).toBeNull();
    expect(next.ptp_status).toBeNull();
  });

  it("ignores PTP fields when resolution is not PROMISE_TO_PAY", () => {
    // PTP fields supplied but resolution is RECOVERED — schema should
    // accept it (since the conditional only requires PTP for PROMISE_TO_PAY)
    // and applyResolution drops them.
    const { next } = applyResolution(
      makeEvent(),
      {
        resolution: "RECOVERED",
        ptp_amount: 250,
        ptp_due_date: "2026-05-20",
        ptp_method: "PAD",
      },
      NOW,
    );
    expect(next.resolution).toBe("RECOVERED");
    expect(next.ptp_amount).toBeNull();
    expect(next.ptp_due_date).toBeNull();
    expect(next.ptp_method).toBeNull();
    expect(next.ptp_status).toBeNull();
  });
});

// --- buildRetry -----------------------------------------------------------

describe("buildRetry", () => {
  it("constructs a Payment in SCHEDULED status linked to the loan + flips retry_attempted on the event", () => {
    const event = makeEvent();
    const { retry, next } = buildRetry({
      event,
      raw: {
        amount: 250,
        scheduled_for: "2026-05-15",
        method: "PAD",
      },
      payment_id: "pay-retry-1",
      now: NOW,
    });
    PaymentSchema.parse(retry);
    NSFEventSchema.parse(next);

    expect(retry.id).toBe("pay-retry-1");
    expect(retry.loan_id).toBe(event.loan_id);
    expect(retry.amount).toBe(250);
    expect(retry.method).toBe("PAD");
    expect(retry.source).toBe("COLLECTIONS");
    expect(retry.status).toBe("SCHEDULED");
    expect(retry.scheduled_for).toBe("2026-05-15");
    expect(retry.description).toMatch(/Retry of NSF nsf-1/);

    expect(next.retry_attempted).toBe(true);
    expect(next.retry_payment_id).toBe("pay-retry-1");
    expect(next.retry_at).toBe("2026-05-15");
  });

  it("rejects retry on an already-retried event", () => {
    const retried = makeEvent({
      retry_attempted: true,
      retry_payment_id: "pay-retry-existing",
      retry_at: "2026-05-01",
    });
    expect(() =>
      buildRetry({
        event: retried,
        raw: { amount: 250, scheduled_for: "2026-05-15", method: "PAD" },
        payment_id: "pay-retry-2",
        now: NOW,
      }),
    ).toThrow(/already has a retry/);
  });

  it("rejects malformed inputs (negative amount, bad date, unknown method)", () => {
    const event = makeEvent();
    expect(() =>
      buildRetry({
        event,
        raw: { amount: -100, scheduled_for: "2026-05-15", method: "PAD" },
        payment_id: "pay-r",
        now: NOW,
      }),
    ).toThrow();
    expect(() =>
      buildRetry({
        event,
        raw: { amount: 250, scheduled_for: "May 15", method: "PAD" },
        payment_id: "pay-r",
        now: NOW,
      }),
    ).toThrow();
    expect(() =>
      buildRetry({
        event,
        raw: { amount: 250, scheduled_for: "2026-05-15", method: "BITCOIN" },
        payment_id: "pay-r",
        now: NOW,
      }),
    ).toThrow();
  });

  it("does not mutate the input event", () => {
    const event = makeEvent();
    const snapshot = JSON.stringify(event);
    buildRetry({
      event,
      raw: { amount: 250, scheduled_for: "2026-05-15", method: "PAD" },
      payment_id: "pay-r",
      now: NOW,
    });
    expect(JSON.stringify(event)).toBe(snapshot);
  });
});
