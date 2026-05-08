import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ applicationId: string }>;
}

interface ContactRow {
  id: string;
  channel: "Phone" | "Email" | "SMS" | "InApp";
  direction: "Inbound" | "Outbound";
  contacted_at: string;
  agent: string;
  outcome: string;
  notes: string;
}

function mockContacts(applicationId: string): ContactRow[] {
  const seed = applicationId.charCodeAt(applicationId.length - 1);
  if (seed % 3 === 0) return [];
  return [
    {
      id: "CT-001",
      channel: "Email",
      direction: "Outbound",
      contacted_at: "2026-05-04T09:30:00Z",
      agent: "ops@payspyre.ca",
      outcome: "Sent",
      notes: "Welcome + document upload link (SendGrid template wlc_v3)",
    },
    {
      id: "CT-002",
      channel: "Phone",
      direction: "Outbound",
      contacted_at: "2026-05-05T14:15:00Z",
      agent: "Sarah K.",
      outcome: "Connected",
      notes:
        "Confirmed offer terms — borrower asking about whether 10% prepayment is allowed (yes, no penalty).",
    },
    {
      id: "CT-003",
      channel: "Email",
      direction: "Inbound",
      contacted_at: "2026-05-06T08:42:00Z",
      agent: "borrower",
      outcome: "Received",
      notes: "Acknowledged receipt of offer + asked about first payment date.",
    },
  ];
}

function channelVariant(c: ContactRow["channel"]) {
  if (c === "Phone") return "active" as const;
  if (c === "Email") return "paid" as const;
  return "muted" as const;
}

export default async function ContactsTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const contacts = mockContacts(application.id);

  if (contacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No contact attempts logged for this application yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">Direction</th>
              <th className="px-4 py-2 font-medium">Agent</th>
              <th className="px-4 py-2 font-medium">Outcome</th>
              <th className="px-4 py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b last:border-b-0 align-top">
                <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(c.contacted_at).toLocaleString("en-CA", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={channelVariant(c.channel)}>{c.channel}</Badge>
                </td>
                <td className="px-4 py-2 text-xs">{c.direction}</td>
                <td className="px-4 py-2 text-xs">{c.agent}</td>
                <td className="px-4 py-2 text-xs">{c.outcome}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground max-w-md">
                  {c.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
