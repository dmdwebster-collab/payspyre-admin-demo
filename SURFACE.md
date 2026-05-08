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

## Workplaces (8 — stubbed across PR #1, #1.2, #2, #3)

| Workplace             | Route                | Status  | Tabs / sections                                                                                                                                       |
| --------------------- | -------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Onboarding** | `/vendor-onboarding` | PR #1.2 | Interest queue, Application form, KYB queue, KYB Review, Banking Verification, MSA Dispatch, Provisioning, Training, Live vendors                     |
| **Originations**      | `/originations`      | PR #2   | Customer Details, Co-Borrower, Bank Details, Summary, Initial Schedule, Workflow, Contacts, Documents, Bank Statements, Comments                      |
| **Underwriting** | `/underwriting`   | PR #3    | _(inherits Originations tabs)_ + Risk Score, Verifications                                                                                            |
| **Servicing**    | `/servicing`      | PR #3    | Extended Loan Header, Summary, Initial Schedule, Renewal, Transactions, Scheduled Transactions, Hardship                                              |
| **Collections**  | `/collections`    | PR #3    | _(inherits Servicing tabs)_ + Action Plan, Promise to Pay                                                                                             |
| **Reports**      | `/reports`        | PR #3    | Originations funnel, Portfolio, Delinquency, Vendor statements, Financial, Compliance                                                                 |
| **Archive**      | `/archive`        | PR #3    | Read-only closed records (Paid / Refinanced / Charged-off / Declined / Withdrawn)                                                                     |
| **Settings**     | `/settings`       | PR #3    | Accounts, Company Settings, Integrations, Loan Settings, Decision Engine, Notifications                                                               |

## Application Status Flow (live in PR #1, refined in PR #1.1)

State machine in `lib/status-flow.ts`. 10 stages from David's status-flow PDF.

```
PRE_ORIGINATION
  → ORIGINATION
    → CREDIT_UNDERWRITING
      ↳ CREDIT_REPORT       (independent of bank verification, reusable within window)
      ↳ BANK_VERIFICATION   (independent of credit report,    reusable within window)
      ↳ APPLICATION_VERIFICATION (depends on fresh Credit Report + Bank Verification)
      → OFFER_ACCEPTANCE → AGREEMENT_SIGNATURE → APPROVED → ACTIVE
      → REJECTED
      → (return) → ORIGINATION
  → CANCELLED   (from any pre-active state)
  → CLOSED      (from ACTIVE: repaid / renewed / refinanced / transferred / settlement / write-off)
```

**Stage dependencies (per David's PR #1 reply):**

- Stages 3 (Credit Report) and 4 (Bank Verification) are **independent** of
  each other — either order, or concurrent.
- Stage 5 (Application Verification) **depends on data from** stages 3 + 4,
  so it can only begin once both have valid (unexpired) results.
- For products with `requires_credit_bureau = false`, stage 3 is skipped
  and stage 5 only requires fresh Bank Verification.

**Reuse / freshness model:**

- Each check carries its own `*_completed_at` timestamp on `Application`.
- Validity windows are configured per `CreditProduct`
  (`credit_report_validity_days`, `bank_verification_validity_days` —
  default 30 days each, applied independently).
- If a check is still fresh, the system reuses the existing data rather
  than initiating a new pull.
- `executeAction(app, "approve", actor, product)` enforces these
  preconditions (raises `PreconditionError` if any required check is
  missing or stale).
- The same freshness helpers (`isCheckFresh`, `checkActionPreconditions`)
  are reused for **post-booking re-pulls** (collections, re-verification,
  portfolio monitoring).

**Per-product toggles on `CreditProduct`:**

- `requires_credit_bureau` (On / Off)
- `requires_bank_verification` (On / Off)
- `credit_report_validity_days`
- `bank_verification_validity_days`
- `post_booking_credit_repull_days` (optional)
- `post_booking_bank_repull_days` (optional)

## Data model surface (PR #1)

Defined in `lib/types/*` with Zod schemas. Mirrored in `supabase/schema.sql`.

- `Borrower`, `Application`, `ApplicationStatusEvent`
- `Loan`, `LoanTransaction`
- `Vendor` (extended in PR #1.2 with onboarding lifecycle + KYB / banking /
  MSA freshness)
- `VendorApplication`, `VendorDirector`, `VendorOnboardingEvent` (PR #1.2)
- `BankAccount`, `BankVerification`, `BankStatementTransaction`
- `Document`
- `ContactLog`, `ContactPreferences`
- `CreditProduct` (PR #1.1 — global standardized catalog, not vendor-scoped)

## Vendor Onboarding flow (PR #1.2)

State machine in `lib/vendor-onboarding-flow.ts`. Replaces the current
11-step ~2-week manual onboarding with a digital flow:

```
INTEREST_REGISTERED
  → APPLICATION_SUBMITTED
    → KYB_IN_PROGRESS
      ↳ KYB_REVIEW (manual escalation)
      → BANKING_VERIFICATION
        → MSA_SENT → MSA_SIGNED → PROVISIONING → TRAINING → LIVE
  → DECLINED / WITHDRAWN  (terminal)
  → SUSPENDED ↔ LIVE       (post-LIVE non-terminal)
  → OFFBOARDED            (terminal, from LIVE / SUSPENDED)
```

**Integration providers (per onboarding step):**

- KYB / KYC: Trulioo or Persona (TBD — pilot before commit)
- Banking verification: Flinks Capital business-account flow
- MSA e-signature: SignNow
- Vendor payouts post-LIVE: Zum Rails payment profile (created in
  PROVISIONING)

## What's deliberately **not** in PR #1

- Auth (Supabase Auth wired in PR #2)
- RLS policies on Supabase tables (drafted as TODO in `supabase/schema.sql`)
- Flinks / Zum Rails / Equifax / DocuSign integrations
- Borrower-facing portal (separate repo)
- Vendor-facing portal (separate repo)
- Marketplace surface (not in spec — flagged for scoping)
