import { TabStub } from "@/components/originations/tab-stub";

export default function BankStatementsTab() {
  return (
    <TabStub
      title="Bank Statements"
      description="Per-transaction view from the latest Flinks pull. Categorized lines (income, recurring, NSF, micro-lender), filterable by date range and category. Source for the metrics on Bank Details."
      fields={[
        "Transaction list: date, description, category, amount, balance",
        "Filters: date range, category, amount range",
        "Category aggregations (income, fees, NSF, micro-lender)",
        "Re-pull from Flinks (with depth=90 / 365)",
        "Export CSV",
      ]}
    />
  );
}
