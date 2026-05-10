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

| Concern               | Provider                |
| --------------------- | ----------------------- |
| Credit bureau         | Equifax Canada          |
| Bank verification     | Flinks Capital          |
| EFT processor         | Zum Rails               |
| ID verification       | **TBD — David to pick** |
| E-signature           | DocuSign                |
| Hosting               | Vercel (frontend)       |
| Database              | Supabase                |

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

- **PR #1 (this PR — foundation):** Next.js scaffolding, design tokens,
  data model, Status Flow state machine, CPA codes, mock data
  repository, dashboard / accounts / vendors / performance views,
  workplace stubs, spec docs, draft Supabase schema.
- **PR #2 (Originations end-to-end):** all 10 Originations tabs wired
  to Supabase (Customer Details, Co-Borrower, Bank Details, Summary,
  Initial Schedule, Workflow, Contacts, Documents, Bank Statements,
  Comments) + RLS policies + Flinks/Zum Rails wire-up.
- **PR #3 (Underwriting / Servicing / Collections / Reports / Archive /
  Settings):** flesh out the remaining six workplaces.

## What lives where

```
app/                # Next.js App Router routes
  page.tsx          # Dashboard
  accounts/         # All loans
  vendors/          # Vendor portfolio
  performance/      # Origination trend
  originations/     # PR #2 stub
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
