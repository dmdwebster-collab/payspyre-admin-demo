import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StubBanner } from "@/components/ui/stub-banner";

/** Notes tab — underwriter notes + decision rationale. Real implementation in PR #4.5.2. */
export default async function UnderwritingNotesTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Underwriter notes</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Stub. PR #4.5.2 adds an append-only notes log scoped to this
            application — operator + timestamp per entry, markdown-ish
            formatting, exportable as a regulatory artifact alongside the
            Workflow tab.
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Notes log not yet implemented.
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #4.5.2"
        description="Append-only notes log. Underwriter rationale, manual review reasons, decision overrides — surfaces alongside Workflow events for a complete audit trail."
        fields={[
          "New note (markdown-ish textarea + Server Action)",
          "Operator + timestamp per note (immutable)",
          "Tag a note as `decision_rationale` for required overrides",
          "Export notes + workflow events as a single regulatory artifact",
          "Searchable across applications (Reports tab)",
        ]}
      />
    </div>
  );
}
