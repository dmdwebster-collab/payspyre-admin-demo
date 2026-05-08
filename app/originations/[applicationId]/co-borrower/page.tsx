import { TabStub } from "@/components/originations/tab-stub";

export default function CoBorrowerTab() {
  return (
    <TabStub
      title="Co-Borrower"
      description="Optional second borrower record. Mirrors Customer Details but with the is_primary=false flag and a foreign-key into Application.co_borrower_id."
      fields={[
        "Same field set as Customer Details",
        "Relationship to primary",
        "Add / remove co-borrower",
        "Toggle is_scoring_opt_in (Track E future)",
      ]}
    />
  );
}
