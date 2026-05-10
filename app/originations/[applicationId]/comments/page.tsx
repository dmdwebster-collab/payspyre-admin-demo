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

interface Comment {
  id: string;
  author: string;
  role: "Ops" | "UW" | "Vendor" | "System";
  posted_at: string;
  visibility: "Internal" | "Vendor-visible";
  body: string;
}

function mockComments(applicationId: string): Comment[] {
  const seed = applicationId.charCodeAt(applicationId.length - 1);
  const list: Comment[] = [
    {
      id: "CM1",
      author: "ops@payspyre.ca",
      role: "Ops",
      posted_at: "2026-05-04T09:35:00Z",
      visibility: "Internal",
      body: "Application submitted via vendor portal. Initial review queued.",
    },
    {
      id: "CM2",
      author: "Sarah K.",
      role: "Ops",
      posted_at: "2026-05-05T14:22:00Z",
      visibility: "Internal",
      body: "Verified borrower employment via call to HR. ✓",
    },
  ];
  if (seed % 2 === 0) {
    list.push({
      id: "CM3",
      author: "underwriter@payspyre.ca",
      role: "UW",
      posted_at: "2026-05-06T11:10:00Z",
      visibility: "Internal",
      body: "Bureau pulled — score 712, no recent delinquencies. Recommend approval at requested term.",
    });
  }
  if (seed % 3 === 0) {
    list.push({
      id: "CM4",
      author: "BC1180 — Elevation Dental",
      role: "Vendor",
      posted_at: "2026-05-06T15:45:00Z",
      visibility: "Vendor-visible",
      body: "Patient confirmed treatment plan, ready to proceed once offer issued.",
    });
  }
  return list;
}

function roleVariant(r: Comment["role"]) {
  if (r === "UW") return "active" as const;
  if (r === "Vendor") return "paid" as const;
  if (r === "System") return "muted" as const;
  return "muted" as const;
}

export default async function CommentsTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const comments = mockComments(application.id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Comments</CardTitle>
        <Badge variant="muted">{comments.length} entries</Badge>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="border-l-2 border-border pl-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{c.author}</span>
                <Badge variant={roleVariant(c.role)}>{c.role}</Badge>
                {c.visibility === "Vendor-visible" && (
                  <Badge variant="muted" className="text-xs">
                    Vendor-visible
                  </Badge>
                )}
                <span className="text-muted-foreground ml-auto">
                  {new Date(c.posted_at).toLocaleString("en-CA", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm">{c.body}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
