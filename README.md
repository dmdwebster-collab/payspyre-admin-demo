# PaySpyre Admin

Internal admin console for **PaySpyre Financial** — Canadian dental
patient-financing lender (BC + AB, CAD).

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run typecheck
npm run lint
npm run test         # vitest
```

Requires **Node 18.18+**.

## What's in this branch — PR #1 (foundation)

This PR migrates the v1 static demo to a typed Next.js 14 app and lays
down the data model + state machine the rest of the platform builds on.

- ✅ Next.js 14 App Router + Tailwind theme (navy + gold from v1)
- ✅ Full data model in `lib/types/*` (Zod-validated)
- ✅ Application Status Flow state machine in `lib/status-flow.ts`
  (unit-tested) with `executeAction()` emitting audit events
- ✅ CPA EFT code table in `lib/cpa-codes.ts`
- ✅ Mock data repository (`lib/data/repository.ts`) seeded from the
  legacy 424-loan / 11-vendor / 7,761-transaction dataset
- ✅ Live views: Dashboard, Accounts, Vendors, Performance
- ✅ Stubbed routes for the 7 workplaces (with spec field lists)
- ✅ Initial Supabase schema draft (RLS deferred — see
  `supabase/schema.sql` TODO)
- ✅ Spec docs preserved under `docs/spec/`
- ✅ Legacy v1 static demo preserved under `legacy/v1-static-demo/`

## What's coming

### PR #2 — Originations end-to-end

Wire the Originations workplace's 10 tabs to a real Supabase backend
with RLS, plus first-pass integrations:

- Customer Details · Co-Borrower · Bank Details · Summary · Initial
  Schedule · Workflow · Contacts · Documents · Bank Statements · Comments
- Flinks Capital connection (instant bank verification)
- Zum Rails payment-profile auto-creation
- DocuSign envelope creation

### PR #3 — Other workplaces

- Underwriting (Risk Score, Verifications, Decision Engine wiring)
- Servicing (Renewal, Transactions, Hardship)
- Collections (Action Plan, Promise to Pay)
- Reports (originations funnel, portfolio, delinquency, vendor statements)
- Archive (read-only closed records)
- Settings (Accounts, Company, Integrations, Loan Settings, Decision
  Engine, Notifications)

## Source of truth

David Wilson's spec docs live under [`docs/spec/`](./docs/spec/):

- [`admin-dashboard-spec.md`](./docs/spec/admin-dashboard-spec.md) — full
  21-page review
- [`application-status-flow.pdf`](./docs/spec/application-status-flow.pdf)
  — 10-stage state machine

## Engineering rules

See [`CLAUDE.md`](./CLAUDE.md) for the full set of hard rules
(PIPEDA, RLS, Zod, CAD, 360-day DSI, no inline styles, server components
by default, etc.) and [`SURFACE.md`](./SURFACE.md) for the route &
workplace inventory.
