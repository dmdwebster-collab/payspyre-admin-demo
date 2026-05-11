import { describe, expect, it } from "vitest";
import { createUWNote, sortNewestFirst } from "./uw-notes";
import { UWNoteSchema, type UWNote } from "./types/uw-note";

const NOW = new Date("2026-05-10T12:00:00.000Z");
const author = { author_id: "user-uw-1", author_name: "UW Operator" };

describe("createUWNote", () => {
  it("produces a UWNote that satisfies the schema", () => {
    const note = createUWNote({
      raw: {
        application_id: "APP-2026-001",
        tag: "general",
        body: "Called borrower; updated income confirmed",
      },
      id: "note-test-1",
      author,
      now: NOW,
    });
    UWNoteSchema.parse(note);
    expect(note.id).toBe("note-test-1");
    expect(note.application_id).toBe("APP-2026-001");
    expect(note.tag).toBe("general");
    expect(note.body).toBe("Called borrower; updated income confirmed");
    expect(note.author_id).toBe("user-uw-1");
    expect(note.author_name).toBe("UW Operator");
    expect(note.created_at).toBe("2026-05-10T12:00:00.000Z");
  });

  it("trims whitespace on the body", () => {
    const note = createUWNote({
      raw: {
        application_id: "APP-2026-001",
        tag: "general",
        body: "   leading + trailing   ",
      },
      id: "note-test-2",
      author,
      now: NOW,
    });
    expect(note.body).toBe("leading + trailing");
  });

  it("accepts every tag value", () => {
    for (const tag of [
      "general",
      "decision_rationale",
      "manual_review",
      "borrower_contact",
      "vendor_contact",
    ] as const) {
      const note = createUWNote({
        raw: { application_id: "APP-2026-001", tag, body: "x" },
        id: `note-${tag}`,
        author,
        now: NOW,
      });
      expect(note.tag).toBe(tag);
    }
  });

  it("rejects an empty body", () => {
    expect(() =>
      createUWNote({
        raw: { application_id: "APP-2026-001", tag: "general", body: "" },
        id: "note-bad",
        author,
        now: NOW,
      }),
    ).toThrow();
  });

  it("rejects a body over 5000 chars", () => {
    expect(() =>
      createUWNote({
        raw: {
          application_id: "APP-2026-001",
          tag: "general",
          body: "x".repeat(5001),
        },
        id: "note-too-long",
        author,
        now: NOW,
      }),
    ).toThrow();
  });

  it("rejects an unknown tag", () => {
    expect(() =>
      createUWNote({
        raw: { application_id: "APP-2026-001", tag: "internal_only", body: "x" },
        id: "note-bad-tag",
        author,
        now: NOW,
      }),
    ).toThrow();
  });

  it("rejects empty application_id", () => {
    expect(() =>
      createUWNote({
        raw: { application_id: "", tag: "general", body: "x" },
        id: "note-bad-app",
        author,
        now: NOW,
      }),
    ).toThrow();
  });
});

describe("sortNewestFirst", () => {
  function makeNote(over: Partial<UWNote>): UWNote {
    return {
      id: "n",
      application_id: "APP-1",
      tag: "general",
      body: "x",
      author_id: "u",
      author_name: "U",
      created_at: "2026-01-01T00:00:00.000Z",
      ...over,
    };
  }

  it("returns notes in descending order by created_at", () => {
    const notes = [
      makeNote({ id: "old", created_at: "2026-01-01T00:00:00.000Z" }),
      makeNote({ id: "new", created_at: "2026-05-01T00:00:00.000Z" }),
      makeNote({ id: "mid", created_at: "2026-03-01T00:00:00.000Z" }),
    ];
    const sorted = sortNewestFirst(notes);
    expect(sorted.map((n) => n.id)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate input", () => {
    const notes = [
      makeNote({ id: "a", created_at: "2026-01-01T00:00:00.000Z" }),
      makeNote({ id: "b", created_at: "2026-05-01T00:00:00.000Z" }),
    ];
    const snap = JSON.stringify(notes);
    sortNewestFirst(notes);
    expect(JSON.stringify(notes)).toBe(snap);
  });
});
