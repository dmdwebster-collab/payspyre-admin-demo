import { TabStub } from "@/components/originations/tab-stub";

export default function CommentsTab() {
  return (
    <TabStub
      title="Comments"
      description="Free-form internal notes on the application. Append-only with @-mentions. Distinct from the Workflow audit log: comments are operator commentary, Workflow events are state transitions."
      fields={[
        "Comment list: author, occurred_at, body",
        "Compose with @-mentions (resolves to staff users)",
        "Pin / unpin top comment",
        "Filter by author / date range",
      ]}
    />
  );
}
