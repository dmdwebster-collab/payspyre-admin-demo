import { repository } from "@/lib/data/repository";
import { StubBanner } from "@/components/ui/stub-banner";
import { WorklistPreview } from "@/components/section/worklist-preview";

const SERVICING_STATUSES = ["APPROVED", "ACTIVE"] as const;

export default async function ServicingPage() {
  const [apps, borrowers] = await Promise.all([
    repository.listApplications(),
    repository.listBorrowers(),
  ]);
  const book = apps.filter((a) =>
    (SERVICING_STATUSES as readonly string[]).includes(a.status),
  );
  const borrowersById = Object.fromEntries(borrowers.map((b) => [b.id, b]));

  const totalOutstanding = book.reduce(
    (s, a) => s + (a.offer_amount ?? a.requested_amount),
    0,
  );
  const activeCount = book.filter((a) => a.status === "ACTIVE").length;
  const approvedCount = book.filter((a) => a.status === "APPROVED").length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] font-semibold tracking-wider text-gold-dim uppercase">
          Workplace
        </div>
        <h1 className="text-2xl font-semibold text-ink mt-1">Servicing</h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Funded and active loans. Day-to-day account management — balances,
          schedules, payments, hardships, and renewals. 360-day DSI interest
          method. CAD only.
        </p>
      </header>

      <WorklistPreview
        title="Servicing book"
        emptyState="No active or approved loans yet."
        applications={book}
        borrowersById={borrowersById}
        kpis={[
          { label: "Active", value: activeCount, tone: "ok" },
          { label: "Approved (awaiting activation)", value: approvedCount },
          { label: "Total accounts", value: book.length },
          {
            label: "Total disbursed (sample)",
            value: `$${totalOutstanding.toLocaleString("en-CA")}`,
          },
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Extended Loan Header — adds servicing-specific fields on top of the originations header. Profile photo, preferred contact, outstanding principal, interest due, fees due, next installment, past due, total amount due, current DPD, account-due-as-of date, amount-to-move, add-on fee balance."
        fields={[
          "Borrower face shot + preferred contact",
          "Loan #, Province, Vendor, Provider/location",
          "Credit product, Loan amount, Start date",
          "Installment payment / frequency / next scheduled",
          "Outstanding principal / Interest due / Fees due",
          "Past due amount / Total amount due / DPD",
          "Account due-as-of date / Amount to move / Add-on fee balance",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Summary tab — expanded with loan performance: total repayment to date, principal/interest/fees paid, installments owed/paid/due, max DPD, # late, # NSF, # deferments, # adjustments. Plus 'Other Loans' roll-up across the borrower."
        fields={[
          "Loan ID / Application date / Amount / Term / Rate / Contract date",
          "Interest start date / APR / System decision / Risk ranking",
          "Total repayment / Principal paid / Interest paid / Fees paid",
          "Installments owed / paid / due",
          "Max DPD / # Late / # NSF / # Deferments / # Adjustments",
          "Other active loans count / outstanding balance / max DPD",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Initial Schedule tab — change frequency / due date with auto-generated legal docs (new amortization schedule routed to borrower for review/sign). Lists every payment with status (Scheduled | Paid | Outstanding | Deferred)."
        fields={[
          "Change frequency / Change due date actions",
          "Auto-generate legal addendum + amortization",
          "Borrower e-sign workflow (SignNow)",
          "Payment status per row",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Renewal tab — renew the current loan into a new one. Triggers a full new originations cycle (application + UW + contract) and includes payout for the current account in the calculations. Auto-closes prior account when the new account activates."
        fields={[
          "New loan amount / term / frequency",
          "Embedded payoff calculation for current loan",
          "Auto-spawn new APP with parent_loan_id linkage",
          "Auto-close prior loan on new activation",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Transactions tab — account ledger. Every processed transaction (Disbursement, Automatic charge, NSF, Refund, Adjustment) and how it was applied. Removable (not deletable) with audit trail. Statement export."
        fields={[
          "Date / Reference # / Transaction type / Amount / Method",
          "Operator (User) / Comments / Error",
          "Drilldown: Creation date, Effective date, Repayment method, Service, Mode, Principal, Interest, Fees",
          "Remove transaction (audit-logged, never deletes)",
          "Statement download (CSV + PDF)",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Scheduled Transactions tab — upcoming EFT pulls + custom-transaction creation + suspension list."
        fields={[
          "Custom transaction list: # / Status / Effective date / Amount / User / Comments",
          "Suspensions list: # / Status / Start date / End date / User / Comments",
          "Edit / Delete (locked once executed)",
        ]}
      />

      <StubBanner
        pr="PR #4"
        description="Hardship tab — Deferments, Adjustment of Terms, Refinance Balance Only. Documentation routed to borrower for review/sign. Records prior measures. Requires elevated user permission."
        fields={[
          "Plan type (Deferment | Adjustment | Refinance Balance)",
          "Qualification criteria + supporting docs",
          "Borrower e-sign workflow",
          "Effective from / to + adherence (On-track | Broken)",
          "Approver + audit trail",
          "Permission gate",
        ]}
      />
    </div>
  );
}
