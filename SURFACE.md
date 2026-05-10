# PaySpyre Admin — Surface Inventory

The admin console is organized into two top-level navigation groups:
**Portfolio** views (read-mostly summaries) and **Workplaces** (queue-driven
work surfaces tied to the Application / Loan lifecycle).

## Portfolio (live in PR #1)

| Route          | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `/`            | Dashboard — KPIs, recent loans, status & term mix        |
| `/accounts`    | All-loans table (424 loans from legacy data, sortable)   |
| `/vendors`     | Vendor portfolio metrics (11 clinics)                    |
| `/performance` | Monthly origination trend                                |

## Workplaces (7 — stubbed in PR #1)

| Workplace        | Route             | Status   | Tabs                                                                                                                                                  |
| ---------------- | ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Originations** | `/originations`   | PR #2    | Customer Details, Co-Borrower, Bank Details, Summary, Initial Schedule, Workflow, Contacts, Documents, Bank Statements, Comments                      |
| **Underwriting** | `/underwriting`   | PR #3    | _(inherits Originations tabs)_ + Risk Score, Verifications                                                                                            |
| **Servicing**    | `/servicing`      | PR #3    | Extended Loan Header, Summary, Initial Schedule, Renewal, Transactions, Scheduled Transactions, Hardship                                              |
| **Collections**  | `/collections`    | PR #3    | _(inherits Servicing tabs)_ + Action Plan, Promise to Pay                                                                                             |
| **Reports**      | `/reports`        | PR #3    | Originations funnel, Portfolio, Delinquency, Vendor statements, Financial, Compliance                                                                 |
| **Archive**      | `/archive`        | PR #3    | Read-only closed records (Paid / Refinanced / Charged-off / Declined / Withdrawn)                                                                     |
| **Settings**     | `/settings`       | PR #3    | Accounts, Company Settings, Integrations, Loan Settings, Decision Engine, Notifications                                                               |

## Application Status Flow (live in PR #1)

State machine in `lib/status-flow.ts`. 10 stages from David's status-flow PDF.

```
APPLICATION_STARTED
  → APPLICATION_SUBMITTED
    → CREDIT_UNDERWRITING
      ↳ CREDIT_REPORT          (parallel, repeatable)
      ↳ BANK_VERIFICATION      (parallel, repeatable)
      ↳ APPLICATION_VERIFICATION (parallel, repeatable)
    → DECISION
      → APPROVED → FUNDED
      → DECLINED
      → REFERRED → CREDIT_UNDERWRITING (loop)
```

**Design note:** stages 3/4/5 (Credit Report, Bank Verification, Application
Verification) are modeled as **parallel checks reachable from
CREDIT_UNDERWRITING** rather than strict sequential states, because the spec
PDF says they "may be performed at different steps … before approval." Flag
for David's confirmation.

## Data model surface (PR #1)

Defined in `lib/types/*` with Zod schemas. Mirrored in `supabase/schema.sql`.

- `Borrower`, `Application`, `ApplicationStatusEvent`
- `Loan`, `LoanTransaction`
- `Vendor`
- `BankAccount`, `BankVerification`, `BankStatementTransaction`
- `Document`
- `ContactLog`, `ContactPreferences`

## What's deliberately **not** in PR #1

- Auth (Supabase Auth wired in PR #2)
- RLS policies on Supabase tables (drafted as TODO in `supabase/schema.sql`)
- Flinks / Zum Rails / Equifax / DocuSign integrations
- Borrower-facing portal (separate repo)
- Vendor-facing portal (separate repo)
- Marketplace surface (not in spec — flagged for scoping)
