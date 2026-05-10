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

interface DocRow {
  id: string;
  type: string;
  filename: string;
  status: "RECEIVED" | "REVIEWED" | "REQUIRED" | "EXPIRED";
  uploaded_at: string | null;
  uploaded_by: string;
  size_kb: number | null;
}

/**
 * Mock document set — in production these come from the documents service
 * (Supabase storage + a `documents` table). Includes the canonical doc set
 * required at each origination stage: ID, paystubs, void cheque, signed agreement.
 */
function mockDocs(applicationId: string, status: string): DocRow[] {
  const seed = applicationId.charCodeAt(applicationId.length - 1);
  const have = ["RECEIVED" as const, "REVIEWED" as const];
  const need = "REQUIRED" as const;
  const ix = (n: number) => (status >= "OFFER_ACCEPTANCE" ? have[n % 2] : seed % 3 === n ? need : have[n % 2]);

  return [
    {
      id: "DOC-001",
      type: "Government-issued ID",
      filename: "drivers-licence-front.pdf",
      status: ix(0),
      uploaded_at: "2026-05-04T10:12:00Z",
      uploaded_by: "borrower",
      size_kb: 412,
    },
    {
      id: "DOC-002",
      type: "Proof of income (paystub)",
      filename: "paystub-2026-04.pdf",
      status: ix(1),
      uploaded_at: "2026-05-04T10:14:00Z",
      uploaded_by: "borrower",
      size_kb: 188,
    },
    {
      id: "DOC-003",
      type: "Void cheque",
      filename: "void-cheque.pdf",
      status: ix(2),
      uploaded_at: "2026-05-04T10:15:00Z",
      uploaded_by: "borrower",
      size_kb: 96,
    },
    {
      id: "DOC-004",
      type: "Signed loan agreement",
      filename:
        status === "ACTIVE" || status === "APPROVED" || status === "AGREEMENT_SIGNATURE"
          ? "loan-agreement-signed.pdf"
          : "—",
      status:
        status === "ACTIVE" || status === "APPROVED"
          ? "REVIEWED"
          : status === "AGREEMENT_SIGNATURE"
          ? "RECEIVED"
          : "REQUIRED",
      uploaded_at:
        status === "ACTIVE" || status === "APPROVED" ? "2026-05-06T16:30:00Z" : null,
      uploaded_by: "signnow-callback",
      size_kb: 612,
    },
  ];
}

function statusVariant(s: DocRow["status"]) {
  if (s === "REVIEWED") return "active" as const;
  if (s === "RECEIVED") return "paid" as const;
  if (s === "REQUIRED") return "muted" as const;
  return "writeoff" as const;
}

export default async function DocumentsTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const docs = mockDocs(application.id, application.status);
  const required = docs.filter((d) => d.status === "REQUIRED").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Documents</CardTitle>
          {required > 0 ? (
            <Badge variant="renewed">
              {required} outstanding
            </Badge>
          ) : (
            <Badge variant="active">
              All required documents received
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Filename</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Uploaded</th>
                <th className="px-4 py-2 font-medium">By</th>
                <th className="px-4 py-2 font-medium text-right">Size</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium">{d.type}</td>
                  <td className="px-4 py-2 font-mono text-xs">{d.filename}</td>
                  <td className="px-4 py-2">
                    <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {d.uploaded_at
                      ? new Date(d.uploaded_at).toLocaleDateString("en-CA")
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">{d.uploaded_by}</td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {d.size_kb ? `${d.size_kb} KB` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
