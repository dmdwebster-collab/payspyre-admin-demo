import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

interface Props {
  params: Promise<{ applicationId: string }>;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function WorkflowTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();
  const events = await repository.listEventsForApplication(application.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Workflow — full audit log
          <span className="ml-3 text-[11px] font-normal text-ink-mute">
            {events.length} event{events.length === 1 ? "" : "s"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-ink-mute text-[12px]">No events yet.</div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Occurred</TH>
                <TH>Action</TH>
                <TH>From</TH>
                <TH>To</TH>
                <TH>Actor</TH>
                <TH>Comments</TH>
              </TR>
            </THead>
            <TBody>
              {events.map((e, i) => (
                <TR key={e.id ?? `${e.application_id}-${i}`}>
                  <TD className="whitespace-nowrap">{fmtDate(e.occurred_at)}</TD>
                  <TD>{e.action}</TD>
                  <TD className="text-ink-mute">{e.from_status ?? "—"}</TD>
                  <TD className="text-gold-dim">{e.to_status}</TD>
                  <TD className="font-sans text-[13px]">{e.actor_name}</TD>
                  <TD className="font-sans text-[13px] text-ink-dim">
                    {e.comments ?? "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <p className="text-ink-mute text-[11px] mt-3">
          Append-only audit trail. Every status transition (and manual
          comment events) lands here. Sourced from
          ApplicationStatusEvent rows; emitted by lib/status-flow.ts
          executeAction().
        </p>
      </CardContent>
    </Card>
  );
}
