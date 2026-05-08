import { StubBanner } from "@/components/ui/stub-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OriginationsPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <h1 className="text-2xl font-semibold text-ink mt-1">Originations</h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Pending applications that have not yet been submitted for credit
          underwriting. Create, edit, and progress new loan applications through
          the Status Flow state machine.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Loan Header (static across all tabs)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-3 gap-x-6 gap-y-1 text-[12px] text-ink-dim font-mono">
            {[
              "Profile photo (face shot)",
              "Borrower name",
              "Application #",
              "Province (BC | AB)",
              "Vendor name",
              "Provider / location",
              "Credit product",
              "Requested amount",
              "Offer amount",
              "Loan term",
              "Interest rate",
              "Start date (contract)",
            ].map((f) => (
              <li
                key={f}
                className="before:content-['—'] before:mr-2 before:text-ink-mute"
              >
                {f}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <StubBanner
        pr="PR #2"
        description="Customer Details tab — reflects information supplied during the credit application. Edit button unlocks fields in a pop-up."
        fields={[
          "Personal information",
          "Residence / address (with map)",
          "Identification (ID type, number, expiry)",
          "Employment & income",
          "Edit pop-up form (Zod-validated)",
        ]}
      />

      <StubBanner
        pr="PR #2"
        description="Co-Borrower tab — add / remove / view co-borrower (same fields as Customer Details)."
        fields={[
          "Add co-borrower button",
          "Remove co-borrower",
          "Same field set as primary borrower",
        ]}
      />

      <StubBanner
        pr="PR #2"
        description="Bank Details tab — Flinks-verified accounts + manual entry. Selectable default payment source. Auto-creates Zum Rails payment profile on add."
        fields={[
          "Bank name",
          "Account number (masked ****)",
          "Transit number",
          "Institution number",
          "Account holder name",
          "Account type",
          "Source (Flinks | Manual)",
          "Set as default payment source",
          "Add manual account",
          "Delete account",
          "Permission-gated full reveal",
          "Auto Zum Rails payment-profile creation",
        ]}
      />

      <StubBanner
        pr="PR #2"
        description="Summary tab — applicant + co-applicant contact + loan header recap + previous applications/loans for the borrower."
        fields={[
          "Name, email, phone, province (both)",
          "Loan header recap",
          "Previous loans table",
          "App/Loan #, amount, term, installment, frequency",
          "Open date, close date, max DPD, balance, status",
        ]}
      />

      <StubBanner
        pr="PR #2"
        description="Initial Schedule tab — full amortization with Adjust Terms pop-up that lets you re-quote the deal."
        fields={[
          "Installment # / date / amount",
          "Principal paid / interest paid / fees paid",
          "Adjust Terms: province, product, amount, term, rate",
          "Adjust Terms: payment frequency, vendor, provider",
          "Adjust Terms: start date, first payment date",
        ]}
      />

      <StubBanner
        pr="PR #2"
        description="Workflow tab — audit trail of every status transition (sourced from application_status_events)."
        fields={[
          "Date / time",
          "Previous status",
          "New status",
          "Comments",
          "User",
        ]}
      />

      <StubBanner
        pr="PR #2"
        description="Contacts tab — log every customer interaction (call, email, SMS, in-person) with outcome."
        fields={[
          "Date / time",
          "Method (Call | Email | SMS | In-person)",
          "Direction (Inbound | Outbound)",
          "Outcome",
          "Notes",
          "User",
        ]}
      />

      <StubBanner
        pr="PR #2"
        description="Documents tab — upload, version, and e-sign borrower-facing docs (loan agreement, IDs, NoA, payslips, etc.)."
        fields={[
          "Document type",
          "File name / version",
          "Uploaded by / date",
          "SignNow envelope status",
          "Download / preview",
        ]}
      />

      <StubBanner
        pr="PR #2"
        description="Bank Statements tab — Flinks-pulled transactions categorized via the CPA EFT code table (lib/cpa-codes.ts)."
        fields={[
          "Date & time",
          "Balance",
          "Debit / credit",
          "Description",
          "CPA category (Income | Expense | Transfer | Loan | Government | Other)",
          "Restricted-code flag (200–299 gov)",
        ]}
      />

      <StubBanner
        pr="PR #2"
        description="Comments tab — internal-only thread visible to admin/underwriting/servicing users."
        fields={[
          "Author",
          "Timestamp",
          "Body (markdown)",
          "@mentions",
        ]}
      />
    </div>
  );
}
