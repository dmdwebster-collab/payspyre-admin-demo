import { describe, expect, it } from "vitest";
import {
  bucketCounts,
  collectionsQueueFromNSF,
  daysSince,
  dpdBucket,
  totalNSFFees,
} from "./collections";
import type { NSFEvent } from "./types/nsf-event";

function makeEvent(over: Partial<NSFEvent> = {}): NSFEvent {
  return {
    id: "nsf-1",
    loan_id: "PS-SAMPLE-001",
    payment_id: "pay-1",
    occurred_at: "2026-04-04T08:30:00.000Z",
    reason_code: "NSF",
    reason_description: null,
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

const ASOF = new Date("2026-05-10T00:00:00.000Z");

describe("daysSince", () => {
  it("computes whole days between two timestamps", () => {
    expect(daysSince("2026-04-04T00:00:00.000Z", ASOF)).toBe(36);
  });

  it("never returns negative (clamps future dates to 0)", () => {
    expect(daysSince("2026-06-01T00:00:00.000Z", ASOF)).toBe(0);
  });

  it("returns 0 for unparseable input rather than throwing", () => {
    expect(daysSince("not-a-date", ASOF)).toBe(0);
  });
});

describe("dpdBucket", () => {
  it("maps DPD onto the four buckets", () => {
    expect(dpdBucket(0)).toBe("0-29");
    expect(dpdBucket(29)).toBe("0-29");
    expect(dpdBucket(30)).toBe("30-59");
    expect(dpdBucket(59)).toBe("30-59");
    expect(dpdBucket(60)).toBe("60-89");
    expect(dpdBucket(89)).toBe("60-89");
    expect(dpdBucket(90)).toBe("90+");
    expect(dpdBucket(365)).toBe("90+");
  });
});

describe("collectionsQueueFromNSF", () => {
  it("includes only unresolved events", () => {
    const events = [
      makeEvent({ id: "open-1" }),
      makeEvent({
        id: "closed-1",
        resolved_at: "2026-04-10T00:00:00.000Z",
        resolution: "RECOVERED",
      }),
    ];
    const queue = collectionsQueueFromNSF(events, ASOF);
    expect(queue.map((i) => i.event.id)).toEqual(["open-1"]);
  });

  it("computes DPD and bucket for each item", () => {
    const queue = collectionsQueueFromNSF([makeEvent()], ASOF);
    // makeEvent default occurred_at is 2026-04-04T08:30:00Z; ASOF is
    // 2026-05-10T00:00:00Z → 35.65d → floor → 35.
    expect(queue[0].dpd).toBe(35);
    expect(queue[0].bucket).toBe("30-59");
  });

  it("sorts by DPD descending (oldest first)", () => {
    const events = [
      makeEvent({ id: "young", occurred_at: "2026-05-01T00:00:00.000Z" }), // 9d → 0-29
      makeEvent({ id: "old", occurred_at: "2026-01-15T00:00:00.000Z" }), // ~115d → 90+
      makeEvent({ id: "mid", occurred_at: "2026-03-15T00:00:00.000Z" }), // ~56d → 30-59
    ];
    const queue = collectionsQueueFromNSF(events, ASOF);
    expect(queue.map((i) => i.event.id)).toEqual(["old", "mid", "young"]);
  });
});

describe("bucketCounts", () => {
  it("returns zero counts for every bucket when queue is empty", () => {
    expect(bucketCounts([])).toEqual({
      "0-29": 0,
      "30-59": 0,
      "60-89": 0,
      "90+": 0,
    });
  });

  it("tallies items by bucket", () => {
    const events = [
      makeEvent({ id: "a", occurred_at: "2026-05-08T00:00:00.000Z" }), // 2d → 0-29
      makeEvent({ id: "b", occurred_at: "2026-04-04T00:00:00.000Z" }), // 36d → 30-59
      makeEvent({ id: "c", occurred_at: "2026-02-15T00:00:00.000Z" }), // 84d → 60-89
      makeEvent({ id: "d", occurred_at: "2025-12-01T00:00:00.000Z" }), // 160d → 90+
      makeEvent({ id: "e", occurred_at: "2026-04-15T00:00:00.000Z" }), // 25d → 0-29
    ];
    const counts = bucketCounts(collectionsQueueFromNSF(events, ASOF));
    expect(counts).toEqual({ "0-29": 2, "30-59": 1, "60-89": 1, "90+": 1 });
  });
});

describe("totalNSFFees", () => {
  it("sums fees across the queue", () => {
    const events = [
      makeEvent({ id: "a", nsf_fee_charged: 45 }),
      makeEvent({ id: "b", nsf_fee_charged: 60 }),
    ];
    const queue = collectionsQueueFromNSF(events, ASOF);
    expect(totalNSFFees(queue)).toBe(105);
  });
});
