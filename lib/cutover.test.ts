import { describe, expect, it } from "vitest";
import {
  applyCutoverStatus,
  groupByProvider,
  isCutoverStatus,
  summarize,
} from "./cutover";
import type { CutoverItem } from "./types/cutover";
import { CutoverItemSchema } from "./types/cutover";

function makeItem(over: Partial<CutoverItem> = {}): CutoverItem {
  return {
    id: "cut-test-1",
    provider: "ZumRails",
    key: "rotate_api_key",
    label: "Rotate Zum API key",
    description: null,
    status: "PENDING",
    completed_by: null,
    completed_at: null,
    notes: null,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    ...over,
  };
}

const NOW = new Date("2026-05-10T12:00:00.000Z");

describe("applyCutoverStatus", () => {
  it("stamps completed_at + completed_by when moving from PENDING to DONE", () => {
    const next = applyCutoverStatus(
      makeItem(),
      { status: "DONE", completed_by: "Op X" },
      NOW,
    );
    CutoverItemSchema.parse(next);
    expect(next.status).toBe("DONE");
    expect(next.completed_at).toBe("2026-05-10T12:00:00.000Z");
    expect(next.completed_by).toBe("Op X");
    expect(next.updated_at).toBe("2026-05-10T12:00:00.000Z");
  });

  it("stamps completed_at when moving from PENDING to N/A", () => {
    const next = applyCutoverStatus(
      makeItem(),
      { status: "N/A", completed_by: "Op X", notes: "Not in scope" },
      NOW,
    );
    expect(next.status).toBe("N/A");
    expect(next.completed_at).toBe("2026-05-10T12:00:00.000Z");
    expect(next.notes).toBe("Not in scope");
  });

  it("preserves completed_at when moving DONE → N/A (operator change of mind)", () => {
    const done = makeItem({
      status: "DONE",
      completed_at: "2026-05-08T00:00:00.000Z",
      completed_by: "Original Op",
    });
    const next = applyCutoverStatus(
      done,
      { status: "N/A", completed_by: "New Op" },
      NOW,
    );
    expect(next.status).toBe("N/A");
    expect(next.completed_at).toBe("2026-05-08T00:00:00.000Z");
    expect(next.completed_by).toBe("New Op");
  });

  it("clears completed_at + completed_by on back-transition to PENDING", () => {
    const done = makeItem({
      status: "DONE",
      completed_at: "2026-05-08T00:00:00.000Z",
      completed_by: "Op X",
    });
    const next = applyCutoverStatus(
      done,
      { status: "PENDING", completed_by: "Op Y" },
      NOW,
    );
    expect(next.status).toBe("PENDING");
    expect(next.completed_at).toBeNull();
    expect(next.completed_by).toBeNull();
  });

  it("rejects an unknown status", () => {
    expect(() =>
      applyCutoverStatus(
        makeItem(),
        { status: "BLOCKED", completed_by: "Op X" },
        NOW,
      ),
    ).toThrow();
  });

  it("rejects missing operator", () => {
    expect(() =>
      applyCutoverStatus(makeItem(), { status: "DONE" }, NOW),
    ).toThrow();
  });

  it("rejects empty operator string", () => {
    expect(() =>
      applyCutoverStatus(
        makeItem(),
        { status: "DONE", completed_by: "" },
        NOW,
      ),
    ).toThrow();
  });

  it("does not mutate the input item", () => {
    const item = makeItem();
    const snap = JSON.stringify(item);
    applyCutoverStatus(item, { status: "DONE", completed_by: "Op X" }, NOW);
    expect(JSON.stringify(item)).toBe(snap);
  });
});

describe("groupByProvider", () => {
  it("groups items in canonical provider order, omitting empty providers", () => {
    const items = [
      makeItem({ id: "1", provider: "Flinks" }),
      makeItem({ id: "2", provider: "ZumRails" }),
      makeItem({ id: "3", provider: "ZumRails" }),
    ];
    const groups = groupByProvider(items);
    expect(groups.map((g) => g.provider)).toEqual(["ZumRails", "Flinks"]);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
  });

  it("counts per-status totals per group", () => {
    const items = [
      makeItem({ id: "1", provider: "ZumRails", status: "DONE" }),
      makeItem({ id: "2", provider: "ZumRails", status: "DONE" }),
      makeItem({ id: "3", provider: "ZumRails", status: "PENDING" }),
      makeItem({ id: "4", provider: "ZumRails", status: "N/A" }),
    ];
    const [g] = groupByProvider(items);
    expect(g.total).toBe(4);
    expect(g.done).toBe(2);
    expect(g.pending).toBe(1);
    expect(g.na).toBe(1);
  });
});

describe("summarize", () => {
  it("returns ready=true only when zero items are PENDING", () => {
    expect(summarize([]).ready).toBe(true); // vacuously
    expect(
      summarize([makeItem({ status: "DONE" }), makeItem({ status: "N/A" })])
        .ready,
    ).toBe(true);
    expect(summarize([makeItem({ status: "PENDING" })]).ready).toBe(false);
  });
});

describe("isCutoverStatus", () => {
  it("recognizes the three valid statuses", () => {
    expect(isCutoverStatus("PENDING")).toBe(true);
    expect(isCutoverStatus("DONE")).toBe(true);
    expect(isCutoverStatus("N/A")).toBe(true);
    expect(isCutoverStatus("BLOCKED")).toBe(false);
  });
});
