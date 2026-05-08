import { TabStub } from "@/components/originations/tab-stub";

export default function DocumentsTab() {
  return (
    <TabStub
      title="Documents"
      description="All Document rows attached to the application: ID front/back, paystubs, NoA, bank statements, signed loan agreement, T&C, demand letters. Includes SignNow envelope status for signature artifacts."
      fields={[
        "Upload (drag/drop multi-file)",
        "Type tag (LoanAgreement / ID-Front / Paystub / etc.)",
        "Storage URL (Supabase Storage, encrypted at rest)",
        "Signed flag + signed_at",
        "SignNow envelope id + status (sent / viewed / signed)",
        "Per-director ID upload (PR #1.2 carry-over)",
      ]}
    />
  );
}
