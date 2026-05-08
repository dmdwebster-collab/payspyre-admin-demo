import { TabStub } from "@/components/originations/tab-stub";

export default function ContactsTab() {
  return (
    <TabStub
      title="Contacts"
      description="ContactLog list (calls, SMS, email) plus ContactPreferences editor. Drives Originations follow-up and feeds the Collections workplace post-funding."
      fields={[
        "Contact log: occurred_at, method, subject, status, comments",
        "Filters: method, status, date range, actor",
        "Compose new contact (call / SMS / email)",
        "Preferences: preferred_method, work-phone OK, opt-outs, flags",
        "Promise-to-Pay capture (used in Collections, surfaced here)",
      ]}
    />
  );
}
