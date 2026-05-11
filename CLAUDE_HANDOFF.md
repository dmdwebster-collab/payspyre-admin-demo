# Claude Handoff — PaySpyre Admin Redesign

> **Purpose:** Resume PaySpyre Admin work in Claude Code. Read this file first, then `CLAUDE.md`, then `docs/spec/`. The repo is fully self-contained — every PR is on GitHub and the local working tree.

---

## ⚠️ Critical framing — this is a CUTOVER, not a launch

**PaySpyre is a running 4-year-old Canadian patient-financing lender.** It is operating today on TurnKey (a leased platform). Everything below is already live in production on TurnKey:

- BC + AB lender licensing
- Bank account + Zum Rails EFT
- Flinks contract
- Equifax Canada bureau (assumed live — confirm)
- SignNow e-sign
- SendGrid email
- Real vendors (Elevation Dental was a real onboarding example, not hypothetical)
- Real borrowers, real loans, real payment schedules, real collections cases

**The goal of this codebase is to replace TurnKey** so PaySpyre owns its own platform and stops paying TurnKey rent. The critical path is **feature parity + clean data migration off TurnKey**, NOT a market launch.

This reframing is important because:
- David Wilson's PR #7 review is a refinement, not a gating decision. The schema is already correct enough to migrate against; the bracket details can be tuned post-cutover.
- The biggest unknown is **what TurnKey lets you export** — full DB dump? API? CSV? This gates the migration adapter and is more important than any UI work.
- We need a **dual-run + reconciliation** period before flipping the production cutover.
- Underwriting can keep running in TurnKey for an extra few weeks if needed. **Servicing + Collections cannot** — they're the most-used daily surfaces.

See §7 below for the revised PR ladder reflecting cutover priorities.

---

## 0. Identity & roles

- **You are working for Dr. Michael Webster** — owner of PaySpyre Financial (Canadian dental patient-financing lender, CAD only, BC + AB only).
- **Reviewer is David Wilson** — PaySpyre CEO. Slack user ID `U01UZAYTE4Q`, email `dcw76@msn.com`. He gives architectural direction; quote him verbatim in spec docs whenever he sets direction.
- **Repo:** [`dmdwebster-collab/payspyre-admin-demo`](https://github.com/dmdwebster-collab/payspyre-admin-demo) (public). Default branch `main`. Local clone at `/home/user/workspace/payspyre-admin-demo` if you have a sandbox; otherwise re-clone.
- **Git author:** `Dr. Michael Webster <dmdwebster@users.noreply.github.com>`.

---

## 1. Hard rules (do not violate)

1. **DO NOT touch `.env*`** or commit any secret. The repo runs on mock data only.
2. **DO commit `package-lock.json`** when dependencies change.
3. **DO NOT install new packages** unless Michael approves.
4. **All amounts CAD.** Provinces are **BC + AB only**.
5. **360-day DSI** for all amortization (`DAYS_IN_YEAR=360` in `lib/amortization.ts`). Days per period: Weekly=7, BiWeekly=14, SemiMonthly=15, Monthly=30. Periods per year: 52 / 26 / 24 / 12.
6. **No inline styles.** **Tailwind only.**
7. **Server components by default.** Add `"use client"` only when interactivity demands it.
8. **Mock-data shape must stay Supabase-compatible** — the TypeScript types in `lib/types/` must map 1:1 to `supabase/schema.sql`.
9. **Custom Badge variants:** `active`, `paid`, `muted`, `renewed`, `writeoff`. **Never** use shadcn defaults (`default`, `secondary`, `outline`, `destructive`).
10. **Workflow is Branch + draft PR for review.** Stack PRs on the previous one. Never push directly to `main`.
11. **Slack send is broken in the prior environment** — `slack_send_message` returns success but DMs don't deliver. Use `slack_send_message_draft` instead, then Michael reviews & sends. (Not relevant inside Claude Code unless you also have a Slack tool.)

---

## 2. Integration providers (locked in)

| Capability | Provider |
|---|---|
| Email | SendGrid |
| Payments / EFT | Zum Rails |
| Banking | Flinks Capital |
| **E-sign** | **SignNow** (NOT DocuSign) |
| SMS | MessageBird (inactive — flag only) |
| Bureau | Equifax Canada |
| Insurance | Walnut |
| KYC / KYB | Trulioo + Persona (under evaluation) |

---

## 3. PR ladder (all draft on GitHub)

| PR | Branch | GitHub | Status |
|---|---|---|---|
| PR #1 | `redesign/foundation-pr1` | [#2](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/2) | **Merged to main** — Next.js migration + data model + Status Flow + spec docs |
| PR #1.1 | `redesign/foundation-pr1-1-patch` | [#3](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/3) | Closed (content delivered via PR #4 squash) — status flow dependencies + freshness windows |
| PR #1.2 | `redesign/vendor-onboarding-pr1-2` | [#4](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/4) | **Merged to main** — vendor onboarding (also includes PR #1.1's content) |
| PR #2 | `redesign/originations-pr2` | [#5](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/5) | **Merged to main** — Originations workplace end-to-end |
| (hotfix) | `hotfix/pr5-missing-data-accessors` | [#11](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/11) | **Merged to main** — recovered two PR #5 prep commits dropped during the squash sequence |
| PR #3 | `redesign/section-stubs-pr3` | [#6](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/6) | **Merged to main** — 6 sections scaffolded |
| PR #3.1 | `redesign/credit-product-refactor-pr3-1` | [#7](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/7) | **Merged to main** — credit product refactor: brackets + multi-frequency |
| PR #4.1 | `redesign/servicing-data-model-pr4-1` | [#8](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/8) | **Merged to main** — Servicing data model |
| PR #4.2 | `redesign/turnkey-export-adapter-pr4-2` | [#9](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/9) | **Merged to main** — TurnKey export adapter |
| PR #4.3 | `redesign/servicing-workplace-pr4-3` | [#12](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/12) | **Merged to main** — Servicing workplace shell + Schedule viewer |
| PR #4.4 | `redesign/collections-workplace-pr4-4` | [#13](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/13) | **Merged to main** — Collections NSF queue + DPD bucketing |
| PR #4.4.1 | `redesign/nsf-detail-pr4-4-1` | [#14](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/14) | **Merged to main** — NSF event detail page + Resolve/Retry scaffold |
| PR #4.5 | `redesign/underwriting-and-products-pr4-5` | [#15](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/15) | **Merged to main** — Underwriting workplace shell + Loan Settings product viewer |
| PR #4.6 | `redesign/reports-migration-pr4-6` | [#16](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/16) | **Merged to main** — Reports: TurnKey migration reconciliation viewer |
| PR #4.4.2 | `redesign/nsf-server-actions-pr4-4-2` | [#17](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/17) | **Merged to main** — NSF Server Actions (Resolve + Retry) |
| **PR #4.5.1** | **`redesign/uw-actions-pr4-5-1`** | _open in this PR_ | **In progress** — Underwriting Decision Server Actions |

PRs #1 → #4.4.2 are squashed onto main. PR #4.5.1 is the open draft.

---

## 4. Where you are right now

**Current branch:** `redesign/uw-actions-pr4-5-1`
**Stacked on:** `main`
**Tests:** 175/175 passing (10 vitest files — adds `lib/uw-actions.test.ts`)
**Build:** `npm run build` clean

This PR makes the Underwriting Decision tab's action buttons real.
`dispatchUWAction` validates input + delegates to `executeAction()`;
the Server Action mutates the in-memory mock data and revalidates.
Each transition writes the audit event that the Originations Workflow
tab queries.

---

## 5. PR #3.1 architecture (the latest important context)

David flagged the credit-product schema as a major TurnKey limitation we must eliminate. **Verbatim quote captured in `docs/spec/credit-product-architecture.md`.** Summary of the new model in `lib/types/credit-product.ts`:

```ts
CreditProduct {
  id, code, name, active, provinces[],

  // Multi-frequency: a product permits any subset of cadences.
  permitted_frequencies: PaymentFrequency[],     // Weekly | BiWeekly | SemiMonthly | Monthly

  // Non-overlapping principal ranges. Each owns its own term + rate bands.
  amount_brackets: [
    {
      id,
      min_amount, max_amount,
      permitted_terms: [{ min_term_months, max_term_months }, ...],   // multiple bands per bracket allowed
      rate_band: { min_rate, default_rate, max_rate },
    },
    ...
  ],

  origination_fee_pct,
  requires_credit_bureau, requires_bank_verification,
  credit_report_validity_days, bank_verification_validity_days,
  post_booking_credit_repull_days?, post_booking_bank_repull_days?,
  created_at, updated_at,
}
```

Helpers (also in `lib/types/credit-product.ts`):
- `findApplicableBracket(product, amount)` → `AmountBracket | null`
- `validateOfferTerms(product, amount, term, frequency)` → `{ ok: true, bracket }` or `{ ok: false, reason }`
  - `reason ∈ { invalid_amount | invalid_term | frequency_not_permitted | amount_out_of_range | term_out_of_range }`
  - This is the **single entrypoint** the originations UI, amortizer, and underwriting must use to validate an offer. UI field-level errors map straight off `reason`.
- `isCheckFresh(timestamp, validityDays, asOf?)` → `boolean` — preserved from PR #1.

**SQL mirror** (`supabase/schema.sql`) uses normalized child tables, NOT jsonb:
- `credit_products` (parent — adds `permitted_frequencies text[]` with array-containment check)
- `credit_product_amount_brackets` (one row per principal range, owns its `min_rate / default_rate / max_rate`)
- `credit_product_term_bands` (one or more bands per bracket)
- All cascade `on delete`.

**Tests:** `lib/types/credit-product.test.ts` — 21 cases, including David's two stated examples:
- `$1,000 / 84-mo` → `term_out_of_range`
- `$50,000 / 12-mo` → `term_out_of_range`

---

## 6. Key file map

```
payspyre-admin-demo/
├── CLAUDE.md                                   ← high-level context (read after this file)
├── CLAUDE_HANDOFF.md                           ← this file
├── package.json / package-lock.json
├── next.config.* / tsconfig.json / tailwind.config.*
├── app/
│   ├── layout.tsx                              ← root layout
│   ├── page.tsx                                ← landing
│   ├── originations/                           ← PR #2 — full workplace, 10 tabs
│   │   ├── page.tsx                            ← worklist
│   │   └── [applicationId]/
│   │       ├── layout.tsx                      ← Loan Header + tab nav
│   │       ├── customer-details/
│   │       ├── co-borrower/
│   │       ├── bank-details/
│   │       ├── summary/
│   │       ├── initial-schedule/
│   │       ├── workflow/
│   │       ├── contacts/
│   │       ├── documents/
│   │       ├── bank-statements/
│   │       └── comments/
│   ├── underwriting/page.tsx                   ← PR #3 stub w/ worklist preview
│   ├── servicing/page.tsx                      ← PR #3 stub
│   ├── collections/page.tsx                    ← PR #3 stub
│   ├── reports/page.tsx                        ← PR #3 stub
│   ├── archive/page.tsx                        ← PR #3 stub
│   ├── settings/page.tsx                       ← PR #3 stub (Loan Settings StubBanner reflects PR #3.1 bracket model)
│   ├── vendors/page.tsx                        ← PR #1.2
│   ├── vendor-onboarding/page.tsx              ← PR #1.2
│   └── performance/page.tsx
├── components/
│   ├── layout/sidebar.tsx                      ← scaffolding tags per PR
│   ├── ui/                                     ← shadcn-derived primitives
│   │   ├── badge.tsx                           ← custom variants only (active/paid/muted/renewed/writeoff)
│   │   ├── stub-banner.tsx                     ← PR #4 / #5 placeholders
│   │   └── ...
│   └── section/worklist-preview.tsx            ← shared KPI strip + table
├── lib/
│   ├── types/
│   │   ├── credit-product.ts                   ← ★ PR #3.1 — bracket + multi-frequency model
│   │   ├── credit-product.test.ts              ← ★ PR #3.1 — 21 tests
│   │   ├── enums.ts                            ← PROVINCES, PAYMENT_FREQUENCIES, ORG_TYPES
│   │   └── ...
│   ├── data/repository.ts                      ← mock data: listBorrowers, listApplications, etc.
│   ├── amortization.ts                         ← 360-day DSI generator (PR #2)
│   ├── amortization.test.ts                    ← 25 tests
│   ├── status-flow.ts                          ← 13-status application state machine (PR #1 / #1.1)
│   ├── status-flow.test.ts                     ← 22 tests (dentalProduct fixture migrated to bracket model in PR #3.1)
│   ├── vendor-onboarding-flow.ts               ← 14-status vendor state machine (PR #1.2)
│   ├── vendor-onboarding-flow.test.ts          ← 15 tests
│   └── originations.test.ts                    ← 13 tests
├── supabase/
│   └── schema.sql                              ← ★ PR #3.1 — credit_products + child tables
└── docs/spec/
    ├── admin-dashboard-spec.md                 ← top-level architectural spec
    ├── credit-product-architecture.md          ← ★ PR #3.1 — David's verbatim direction + design rationale
    ├── future-tracks.md                        ← LMS, vendor training, etc. — backlog
    └── ... (other PR-specific specs)
```

---

## 7. What's next — REVISED for cutover (PR #4.x ladder)

**Old framing (wrong):** "Build out the remaining workplaces in any order."
**Correct framing:** "Get to feature parity + clean TurnKey extraction so we can terminate TurnKey."

The sequence below prioritizes (a) what gates the migration, then (b) what borrowers + ops staff touch daily, then (c) lower-urgency surfaces:

| PR | Scope | Why this order |
|---|---|---|
| **PR #4.1** | **Servicing data model** — `loans`, `payment_schedules`, `transactions`, `payments`, `nsf_events`. TS types in `lib/types/`, Zod schemas, mock data in `lib/data/repository.ts`, SQL mirror in `supabase/schema.sql`. | Pure schema. Mirrors whatever shape TurnKey gives us on export. **Unblocks everything downstream.** Not blocked on David. |
| **PR #4.2** | **TurnKey export adapter + migration runner** — `lib/migration/turnkey-import.ts` with one adapter per entity (borrowers, applications, loans, schedules, transactions, documents), reconciliation report generator, idempotent re-runs. Stub the actual TurnKey API calls until we know the export shape. | **New top priority.** Until we know we can extract clean data, every UI PR is theoretical. The adapter is the gating de-risking work. |
| **PR #4.3** | **Servicing workplace** — borrower lookup, schedule viewer, payments ledger, NSF handling, manual adjustments. | Most-used daily surface. Must work day one of cutover. |
| **PR #4.4** | **Collections workplace** — DPD buckets, promise-to-pay tracking, NSF workflow, queue management. | Second-most-used. Direct revenue impact if it lags. |
| **PR #4.5** | **Underwriting workplace + Loan Settings editor** (the bracket UI on top of PR #3.1's schema). | Lower urgency for cutover — Underwriting can keep running in TurnKey for an extra few weeks if needed while we migrate Servicing/Collections first. |
| **PR #4.6** | **Reports + reconciliation dashboards** — exec dashboards, vendor reports, regulatory exports, and (critical) the dual-run reconciliation views comparing PaySpyre platform vs TurnKey during parallel-run period. | Required for the dual-run period. Build last but design the reconciliation schema in PR #4.1. |
| **PR #4.7** | **Integration cutover** — webhook endpoint switch (Zum Rails, Flinks, SignNow), callback URL rotation, API key rotation, IP allowlist updates. | Final pre-flip work. One concrete checklist per provider. |
| **PR #4.8** | **Decision Engine** — scorecard rules + auto-decision thresholds. Attach `decision_strategy_id` to `AmountBracket`. | Deferred until post-cutover. Auto-decisioning is a policy refinement, not a cutover gate; manual review works in the interim. |

**Open homework items (not code-blocked):**

1. **What does TurnKey actually let us export?** Full DB dump? API only? CSV? PDFs of documents? This determines PR #4.2's design. Ask TurnKey, OR reverse-engineer from whatever export endpoint exists.
2. **TurnKey contract end date** — is there a hard cliff or month-to-month?
3. **Active loan / borrower count** to migrate — affects whether we do one big-bang migration or rolling/batched.
4. **MSA template** — Michael said "Ready to have an MSA template?" — plugs into the vendor onboarding doc slots in PR #1.2. Drop it into `docs/spec/vendor/` when shared.
5. **Confirm Equifax is live + key/contract status** for the cutover.
6. **Audit trail / regulatory continuity** — for BC + AB consumer credit, loan history must be reconcilable to the dollar across the migration. Reconciliation views in PR #4.6 are the regulatory artifact.

PR #4 is split into PR #4.1 through #4.8 stacked sequentially for review-ability.

---

## 8. Resume commands (Claude Code)

```bash
# Clone if needed
git clone https://github.com/dmdwebster-collab/payspyre-admin-demo.git
cd payspyre-admin-demo

# Restore working state
git fetch --all
git checkout redesign/credit-product-refactor-pr3-1

# Install + verify
npm ci
npm test         # expect 96/96 passing
npm run build    # expect 22 routes, clean build

# Read context
cat CLAUDE_HANDOFF.md      # this file
cat CLAUDE.md              # PR map + workflow
ls docs/spec/              # all architectural decisions

# Check open PR for David's feedback
gh pr view 7 --comments
```

---

## 9. Things to watch out for in Claude Code

- **Re-read `CLAUDE.md` PR map first** — it's the canonical source of truth for what each PR shipped.
- **Never edit a merged or pushed branch's history.** If David requests changes on PR #7, add commits on top of `redesign/credit-product-refactor-pr3-1`.
- **The `dentalProduct` fixture in `lib/status-flow.test.ts`** is the canonical example of the bracket shape. If you change the schema, update both this fixture and the new test file in the same commit.
- **Mock data lives in `lib/data/repository.ts`** — when adding new entities, mirror them in `supabase/schema.sql` in the same PR.
- **The `ALL CAPS` status enums** (`PRE_ORIGINATION`, `ORIGINATION`, etc.) are duplicated between `lib/status-flow.ts` and the SQL CHECK constraint in `supabase/schema.sql:108-112`. Keep them in sync.
- **Don't introduce new client components without a real reason.** Server components are the default per Michael's standing rule.
- **Never spawn codebase subagents** — prior runs failed with credit exhaustion. Do all repo work in the main loop.

---

## 10. Open questions for David — DESIGN-LOCK STRATEGY

Michael's stated direction: **David is slow and is holding up the cutover.** Don't gate code on his answers. Strategy:

1. **Schema is design-locked as of PR #7** unless David explicitly objects. The bracket model accommodates every reasonable answer to questions below — if David later changes his mind, schema migrations are small (single-digit hours) and tests are already in place.
2. **Do not block PR #4.1 through PR #4.4 on David.** Servicing data model, TurnKey migration adapter, Servicing workplace, and Collections workplace have nothing to do with credit-product configuration. Ship them.
3. **Loan Settings editor (PR #4.5)** is the first PR that surfaces brackets in UI. Build it against the current schema. If David changes his mind by then, adapt; otherwise ship.

Questions still parked in PR #7 (not blocking, just for the record):

1. Does the bracket shape land the way he intended (multiple `permitted_terms[]` per bracket, single `rate_band` per bracket)?
2. Fees at product level (`origination_fee_pct`) vs per-bracket?
3. `decision_strategy_id` at bracket level?
4. Are pricing tier *names* a separate concept, or is `rate_band` sufficient?

**The only things David is genuinely on the critical path for** (Michael needs to extract these from him separately):

- Credit policy v0 — even a one-pager: "auto-decline below X, auto-approve above Y up to $Z, manual review otherwise." This gates PR #4.8 (Decision Engine) only.
- Sign-off on the TurnKey termination timeline + dual-run window.
- Any business-rule preferences for the reconciliation reports (what tolerances, what cadence).
