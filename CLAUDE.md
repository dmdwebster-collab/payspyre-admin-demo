# PaySpyre Admin — Engineering Notes

## Product

**PaySpyre Financial** is a Canadian dental patient-financing lender. This
repo is the **internal admin console** used by underwriting, servicing,
collections, and vendor-relations teams to originate and manage loans.

- **Owner:** Dr. Michael Webster
- **CEO:** David Wilson
- **Markets:** British Columbia, Alberta (CAD only)
- **Customers:** dental clinics ("vendors") that offer PaySpyre financing to
  their patients ("borrowers") at point of treatment
- **Borrower-facing channel:** lives in `payspyre-patient-portal-demo`
- **Vendor-facing channel:** lives in `payspyre-vendor-portal-demo`

## Stack

- **Framework:** Next.js 14 (App Router) + React 18
- **Language:** TypeScript (strict)
- **Styling:** Tailwind 3.4 (design tokens in `tailwind.config.ts`)
- **UI:** shadcn-style primitives in `components/ui/*` over Radix
- **Validation:** Zod 3
- **Data (PR #1):** typed mock repository in `lib/data/repository.ts`
  reading JSON fixtures
- **Data (PR #2+):** Supabase (Postgres + RLS + Auth) — schema draft in
  `supabase/schema.sql`
- **Tests:** Vitest

## Integrations (target — not all wired in PR #1)

Provider relationships confirmed by David Wilson during PR #1 review.
Carryovers from the existing TurnKey deployment are marked **(existing)**.

| Concern               | Provider                                            |
| --------------------- | --------------------------------------------------- |
| Credit bureau         | Equifax Canada                                      |
| Bank verification     | Flinks Capital **(existing)**                       |
| EFT / payments        | Zum Rails **(existing)**                            |
| E-signature           | SignNow **(existing)** (in-house build long-term?)  |
| Email                 | SendGrid **(existing)**                             |
| SMS                   | MessageBird **(existing, not actively used)**       |
| Credit insurance      | [Walnut](https://solutions.gowalnut.com/creditor-insurance) |
| KYC / KYB / ID        | **TBD** — Trulioo + Persona under evaluation       |
| Hosting               | Vercel (frontend)                                   |
| Database              | Supabase                                            |

### Future / expansion (architect for, don't build yet)

| Concern                          | Provider                                              |
| -------------------------------- | ----------------------------------------------------- |
| Lien registration (PPSA)         | [Equifax PPSA Connect](https://www.equifax.ca/business/product/ppsa-connect/) |
| Customer credit monitoring       | [Equifax Credit Monitoring API](https://www.equifax.com/business/product/credit-report-monitoring/) |
| Secured card issuance            | [Zum Rails Card Issuance](https://www.zumrails.com/card-issuance) (long-term) |

## Hard rules

1. **No secrets in repo.** Never commit `.env*` files. Use Vercel /
   Supabase environment variables in production.
2. **PIPEDA + provincial privacy law.** All borrower PII access must be
   audit-logged; bank-account numbers masked except for users with the
   explicit `bank.reveal` permission.
3. **RLS on every Supabase table** (deferred to PR #2 — schema currently
   has tables without policies; flagged in `supabase/schema.sql`).
4. **All input validated with Zod** at the route boundary. Types in
   `lib/types/*` are the single source of truth — DDL in
   `supabase/schema.sql` mirrors them.
5. **Currency: CAD.** Always render via `formatCAD()` from `lib/utils.ts`.
6. **Day-count: 360-day DSI.** Hard-coded across the amortization /
   schedule logic (introduced in PR #2 servicing work).
7. **Status transitions go through the state machine.** Never write a raw
   status update — use `executeAction()` in `lib/status-flow.ts` so the
   audit event is emitted.
8. **No inline `style` props.** Tailwind utility classes only.
9. **Server components by default.** Mark `'use client'` only when the
   component needs hooks / browser APIs (currently only `Sidebar`).
10. **Mock-data layer must keep shape compatible with the future Supabase
    client** — accessors in `lib/data/repository.ts` return the same
    types the Supabase client will return.

## Conventions

- `lib/types/index.ts` is the barrel; import types from `@/lib/types`
- Currency / percent / int formatting → `lib/utils.ts`
- Status flow → `lib/status-flow.ts` (pure, fully unit-tested)
- CPA EFT codes → `lib/cpa-codes.ts`
- File path alias: `@/* → ./*`
- The legacy v1 static demo lives under `legacy/v1-static-demo/` — kept
  for reference only; excluded from `tsconfig` and `eslint`

## PR roadmap

- **PR #1 (foundation):** Next.js scaffolding, design tokens, data model,
  Status Flow state machine, CPA codes, mock data repository, dashboard /
  accounts / vendors / performance views, workplace stubs, spec docs,
  draft Supabase schema.
- **PR #1.1 (David's patch):** status-flow dependencies (stage 5 depends
  on 3+4), per-product `requires_credit_bureau` toggle, per-check
  freshness fields on `Application`, integration provider corrections.
- **PR #1.2 (vendor onboarding scaffolding):** dedicated Vendor
  Onboarding workplace, vendor onboarding state machine, vendor
  application + directors + onboarding-events schema, standardized
  global credit-product catalog (no per-vendor customization).
- **PR #2 (Originations end-to-end):** all 10 Originations tabs wired to
  Supabase (Customer Details, Co-Borrower, Bank Details, Summary, Initial
  Schedule, Workflow, Contacts, Documents, Bank Statements, Comments) +
  RLS policies + Flinks/Zum Rails wire-up.
- **PR #3 (section scaffolding):** the remaining six workplaces
  (Underwriting / Servicing / Collections / Reports / Archive / Settings)
  get real worklist previews wired to fixtures — queue + KPIs + sample
  rows linking back to the Originations Loan Header. Each future tab is
  documented with a `StubBanner` listing spec fields. Sidebar tags these
  as `PR #3 · scaffolded`.
- **PR #3.1 (credit-product refactor):** eliminate TurnKey's
  one-frequency / one-rate-band / one-term-band-per-product limitation.
  `CreditProduct` now carries `permitted_frequencies[]` plus
  `amount_brackets[]`, where each bracket owns its own `permitted_terms[]`
  and `rate_band`. Helpers `findApplicableBracket` and `validateOfferTerms`
  are the single entrypoint for offer validation. SQL mirror uses
  normalized child tables (`credit_product_amount_brackets`,
  `credit_product_term_bands`). Direction documented verbatim from David
  Wilson in `docs/spec/credit-product-architecture.md`.
- **PR #4.1 (Servicing data model):** persisted servicing entities to
  unblock the cutover from TurnKey. Adds `PaymentSchedule` +
  `PaymentScheduleEntry` (frozen amortization snapshots, multiple
  versions per loan), `Payment` (Zum Rails-compatible inbound funds
  lifecycle), and `NSFEvent` (returned-payment record with reason +
  retry state). Helpers in `lib/servicing.ts` build schedules from
  loans, allocate posted payments to entries, mark missed entries, and
  construct NSF events. SQL mirror in `supabase/schema.sql`. Design doc
  in `docs/spec/servicing-data-model.md`.
- **PR #4.2 (TurnKey export adapter):** pure migration runner over an
  in-memory `TurnKeyExport`. Per-entity adapters (borrower, application,
  loan, schedule, transaction, document) with deterministic UUIDv5 ids
  for idempotent re-runs. Three schedule strategies (`use_export` /
  `regenerate` / `auto`) so the dual-run period can spot divergence.
  Reconciliation report compares source vs imported on per-entity counts
  and money totals. Transport/parser + DB upsert + cutover dashboards
  intentionally out of scope (see `docs/spec/turnkey-migration.md` §3
  for the open questions that gate them).
- **PR #4.3 (Servicing workplace shell + Schedule viewer):** new route
  `/servicing/[loanId]/{schedule,payments,nsf,activity}` with a sticky
  Loan Header + tab nav. Schedule tab fully implemented against the
  PR #4.1 data model (PaymentSchedule + entries + `markMissedEntries` +
  `nextDueEntry`). Payments and NSF tabs render real lists from the
  fixtures with operator-action StubBanners pointing at PR #4.4.
  Activity tab is a stub pointing at PR #4.6. The `/servicing` worklist
  exposes a demo link into `PS-SAMPLE-001` since the legacy v1 loans
  have no schedules yet.
- **PR #4.4 (Collections workplace — NSF queue):** rewrites
  `/collections` from PR #3's mock-DPD-on-applications stub to a real
  NSF-event-driven queue. Pure helpers in `lib/collections.ts`
  (`daysSince`, `dpdBucket`, `collectionsQueueFromNSF`, `bucketCounts`,
  `totalNSFFees`) drive bucket KPIs (0-29 / 30-59 / 60-89 / 90+) and a
  sorted worklist (oldest first). Each row links to the Servicing NSF
  tab. Action workflow (retry / PTP capture / resolution) follows in a
  PR #4.4.x stub.
- **PR #4.4.1 (NSF event detail page):** drills into a single
  unresolved NSF event from the Collections worklist. Shows the full
  event + the bounced payment in one view. Includes a disabled-form
  scaffold for the Resolve / Retry workflow that PR #4.4.2 wires into
  Server Actions. Repository gains `getNSFEvent` + `getPayment` accessors.
- **PR #4.5 (Underwriting workplace shell + Loan Settings viewer):**
  new `/underwriting/[applicationId]/{decision,bureau,bank,verification,notes}`
  route family with sticky Loan Header + 5 tabs. Decision tab is fully
  implemented (offer summary, freshness state per check via `isCheckFresh`,
  available state-machine actions via `getAvailableActions`); the other
  4 tabs are PR #4.5.1 / #4.5.2 stubs. Adds `/settings/products` — a
  read-only viewer of the global credit-product catalog (single Dental
  product fixture) showing the bracket model from PR #3.1 (multi-frequency,
  amount brackets, per-bracket term + rate bands). Editor lands in
  PR #4.5.x.
- **PR #4.6 (Reports — migration reconciliation viewer):** new route
  `/reports/migration` runs the PR #4.2 `runMigration()` against a sample
  TurnKey export (`lib/migration/sample-export.ts`) and renders the
  result. Per-entity counts (exported / imported / failed / failure rate),
  money totals (source vs imported, delta, WITHIN / EXCEEDS tolerance),
  capped issues list. The reg-facing reconciliation artifact for the
  cutover. Persistence (`migration_runs` table + diff view) follows in
  PR #4.6.x.
- **PR #4.7+ (workplace build-out):** Integration
  cutover, Decision Engine. Each fills in remaining `StubBanner`
  placeholders.
>>>>>>> 11a78eb (PR #4.5: Underwriting workplace shell + Loan Settings product viewer)

### Future tracks (not in PR #1–#3)

A standing backlog of items captured from Michael's source docs lives
in `docs/spec/future-tracks.md`. Notably:

- **Vendor Training Platform / LMS** (Cardone-style) — wishlist for a
  long time. The vendor onboarding state machine reserves a `TRAINING`
  state so the LMS can plug in later without a model migration.
- **Hardship / Decision Engine v2 / Compliance / Vendor Wallet /
  Reporting upgrades** — see `future-tracks.md` for the full catalog,
  tagged Track A–J for traceability.

## What lives where

```
app/                # Next.js App Router routes
  page.tsx          # Dashboard
  accounts/         # All loans
  vendors/          # Vendor portfolio
  performance/      # Origination trend
  originations/
    page.tsx          # Worklist — funnel KPI strip + filterable table
    [applicationId]/  # Loan Header (10 tabs)
      layout.tsx      # Sticky borrower / vendor / status header + tab nav
      page.tsx        # Index → redirects to summary
      summary/        # Application detail + Status Flow action panel
      customer-details/  # PR #2 in-progress stub
      co-borrower/    # PR #2 in-progress stub
      bank-details/   # PR #2 in-progress stub
      initial-schedule/  # PR #2 in-progress stub
      workflow/       # Append-only audit log (built)
      contacts/       # PR #2 in-progress stub
      documents/      # PR #2 in-progress stub
      bank-statements/  # PR #2 in-progress stub
      comments/       # PR #2 in-progress stub
  vendor-onboarding/ # PR #1.2 stub
  underwriting/     # PR #3 stub
  servicing/        # PR #3 stub
  collections/      # PR #3 stub
  reports/          # PR #3 stub
  archive/          # PR #3 stub
  settings/         # PR #3 stub
components/
  layout/           # Sidebar + topbar
  ui/               # shadcn-style primitives
lib/
  types/            # Zod schemas + TS types
  data/             # Repository + JSON fixtures
  status-flow.ts    # Application state machine
  cpa-codes.ts      # CPA EFT category map
  utils.ts          # cn, formatCAD, etc.
supabase/
  schema.sql        # DDL (RLS TODO)
docs/spec/          # David's spec docs (source of truth)
legacy/             # v1 static demo (read-only reference)
```
