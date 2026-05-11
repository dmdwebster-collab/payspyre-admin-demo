import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sortNewestFirst } from "@/lib/uw-notes";
import { UW_NOTE_TAGS, type UWNoteTag } from "@/lib/types/uw-note";
import { addUWNoteAction } from "./actions";

interface Props {
  params: Promise<{ applicationId: string }>;
}

const TAG_LABEL: Record<UWNoteTag, string> = {
  general: "General",
  decision_rationale: "Decision rationale",
  manual_review: "Manual review",
  borrower_contact: "Borrower contact",
  vendor_contact: "Vendor contact",
};

const TAG_VARIANT: Record<
  UWNoteTag,
  "active" | "paid" | "muted" | "renewed" | "writeoff"
> = {
  general: "muted",
  decision_rationale: "renewed",
  manual_review: "writeoff",
  borrower_contact: "active",
  vendor_contact: "active",
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Underwriter notes tab (PR #4.5.2). Append-only log per application.
 *
 * The note add form is bound to addUWNoteAction Server Action; submission
 * persists via repository.addUWNote and revalidates this page + the
 * Originations Workflow tab (which exports the combined audit trail
 * alongside the status events in PR #4.6.x).
 */
export default async function UnderwritingNotesTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const notes = sortNewestFirst(
    await repository.listUWNotesForApplication(application.id),
  );
  const decisionRationaleCount = notes.filter(
    (n) => n.tag === "decision_rationale",
  ).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a note</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Append-only — there&apos;s no edit / delete. If you need a
            correction, write a follow-up note that references the prior
            one. Tag <code className="font-mono">decision_rationale</code>{" "}
            when you override the system recommendation; that tag is
            included in the regulatory export.
          </p>
        </CardHeader>
        <CardContent>
          <form
            action={addUWNoteAction.bind(null, application.id)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div>
              <label
                htmlFor="tag"
                className="text-xs text-muted-foreground tracking-wider uppercase"
              >
                Tag
              </label>
              <select
                id="tag"
                name="tag"
                required
                defaultValue="general"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {UW_NOTE_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {TAG_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="body"
                className="text-xs text-muted-foreground tracking-wider uppercase"
              >
                Note body
              </label>
              <textarea
                id="body"
                name="body"
                rows={3}
                required
                placeholder="What you observed, decided, or did…"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Append note
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notes ({notes.length})</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Newest first.
              {decisionRationaleCount > 0
                ? ` ${decisionRationaleCount} decision-rationale note${
                    decisionRationaleCount === 1 ? "" : "s"
                  } on file.`
                : ""}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No notes yet. Add the first above.
            </div>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-md border border-line bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={TAG_VARIANT[note.tag]}>
                      {TAG_LABEL[note.tag]}
                    </Badge>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {fmtDateTime(note.created_at)} · {note.author_name}
                    </div>
                  </div>
                  <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                    {note.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
