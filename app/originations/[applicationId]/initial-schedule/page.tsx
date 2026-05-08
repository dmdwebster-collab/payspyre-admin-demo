import { TabStub } from "@/components/originations/tab-stub";

export default function InitialScheduleTab() {
  return (
    <TabStub
      title="Initial Schedule"
      description="Read-only amortization preview generated from credit_product + offer_amount + term + frequency + first_payment_date. Day-count: 360-day year (DSI). Recomputes when offer / term / first payment changes."
      fields={[
        "Schedule rows: payment #, due date, principal, interest, balance",
        "Totals: cost of borrowing, total interest, regular payment",
        "Frequency-aware date roll (BiWeekly / Weekly / SemiMonthly / Monthly)",
        "Print / export",
      ]}
    />
  );
}
