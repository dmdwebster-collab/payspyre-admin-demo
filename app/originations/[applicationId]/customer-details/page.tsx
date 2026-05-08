import { TabStub } from "@/components/originations/tab-stub";

export default function CustomerDetailsTab() {
  return (
    <TabStub
      title="Customer Details"
      description="Primary borrower form. Reads / writes the Borrower row plus Application metadata fields (vendor, product, requested amount, term, frequency)."
      fields={[
        "Personal: name, DOB, marital status",
        "Contact: email, phone, alt phone",
        "Address: line1/2, city, province, postal, country",
        "Residence: type, monthly housing cost, years",
        "ID: type, last4, expiry, province",
        "Employment: employer, occupation, type, years, income",
        "Application: vendor, product, requested amount, term, rate, frequency",
      ]}
    />
  );
}
