import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { groupByProvider, summarize } from "@/lib/cutover";
import type { CutoverItem, CutoverItemStatus } from "@/lib/types/cutover";
import { setCutoverItemStatusAction } from "./actions";

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusVariant(
  s: CutoverItemStatus,
): "active" | "paid" | "muted" {
  if (s === "DONE") return "paid";
  if (s === "N/A") return "muted";
  return "active"; // PENDING — needs attention
}

const PROVIDER_LABEL: Record<string, string> = {
  ZumRails: "Zum Rails (EFT / payments)",
  Flinks: "Flinks Capital (banking)",
  SignNow: "SignNow (e-signature)",
  SendGrid: "SendGrid (email)",
  Equifax: "Equifax Canada (bureau)",
  Walnut: "Walnut (insurance)",
  MessageBird: "MessageBird (SMS — inactive)",
};

/**
 * Integration cutover workplace (PR #4.7).
 *
 * Per-provider checklist of webhook switches, key rotations, callback
 * URL updates, and contract verifications operations needs to complete
 * before flipping production from TurnKey to PaySpyre. The checklist is
 * the source-of-truth for "what's left before we can flip" — every row
 * is the responsibility of someone in ops, not engineering.
 *
 * The "Cutover ready" banner at the top flips green only when zero items
 * remain PENDING.
 */
export default async function CutoverPage() {
  const items = await repository.listCutoverItems();
  const groups = groupByProvider(items);
  const summary = summarize(items);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <div className="mt-1 flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">
            Integration cutover
          </h1>
          <Badge variant={summary.ready ? "paid" : "active"}>
            {summary.ready ? "READY" : "NOT READY"}
          </Badge>
          <span className="text-sm text-ink-dim">
            {summary.done} / {summary.total} done
            {summary.na > 0 ? ` (${summary.na} N/A)` : ""} ·{" "}
            {summary.pending} pending
          </span>
        </div>
        <p className="text-ink-dim text-sm mt-2 max-w-3xl">
          Per-provider checklist of webhook switches, key rotations, callback
          URL updates, and contract verifications. Every item must reach{" "}
          <code className="font-mono">DONE</code> or{" "}
          <code className="font-mono">N/A</code> before the production
          cutover from TurnKey to PaySpyre. Spec:{" "}
          <code className="font-mono">docs/spec/integration-cutover.md</code>.
        </p>
      </header>

      {groups.map((g) => (
        <Card key={g.provider}>
          <CardHeader className="flex flex-row items-start justify-between gap-6">
            <div>
              <CardTitle>{PROVIDER_LABEL[g.provider] ?? g.provider}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {g.done} done · {g.pending} pending
                {g.na > 0 ? ` · ${g.na} N/A` : ""}
              </p>
            </div>
            <Badge variant={g.pending === 0 ? "paid" : "active"}>
              {g.pending === 0 ? "READY" : `${g.pending} PENDING`}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Last update</th>
                  <th className="px-4 py-2 font-medium">Set status</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((item: CutoverItem) => (
                  <tr key={item.id} className="border-b last:border-b-0 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.description}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[11px] text-muted-foreground mt-1 italic">
                          Note: {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(item.status)}>
                        {item.status}
                      </Badge>
                      {item.completed_by && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          by {item.completed_by}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{fmtDateTime(item.updated_at)}</div>
                      {item.completed_at && (
                        <div className="mt-0.5">
                          completed {fmtDateTime(item.completed_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <form
                        action={setCutoverItemStatusAction.bind(null, item.id)}
                        className="flex items-center gap-2"
                      >
                        <select
                          name="status"
                          defaultValue={item.status}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="DONE">DONE</option>
                          <option value="N/A">N/A</option>
                        </select>
                        <input
                          name="notes"
                          type="text"
                          placeholder="notes…"
                          defaultValue={item.notes ?? ""}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs w-32"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
