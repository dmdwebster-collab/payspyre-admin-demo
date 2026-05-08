import { TabStub } from "@/components/originations/tab-stub";

export default function BankDetailsTab() {
  return (
    <TabStub
      title="Bank Details"
      description="Flinks IBV launcher + manual fallback + BankVerification history per application. Drives the BANK_VERIFICATION → APPLICATION_VERIFICATION transition once results return fresh."
      fields={[
        "Flinks widget mount + login id",
        "Manual fallback: institution / transit / account / type",
        "BankVerification list: requested_at, completed_at, status",
        "Computed metrics: income, min balance, NSF count, balance trend, ATP score",
        "Flinks fraud flags",
        "Mark Complete (advances Status Flow)",
      ]}
    />
  );
}
