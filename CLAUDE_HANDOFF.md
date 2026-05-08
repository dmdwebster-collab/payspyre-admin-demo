# Claude Handoff — PaySpyre Admin Redesign

> **Purpose:** Resume PaySpyre Admin work in Claude Code. Read this file first, then `CLAUDE.md`, then `docs/spec/`. The repo is fully self-contained — every PR is on GitHub and the local working tree.

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
| PR #1 | `redesign/foundation-pr1` | [#2](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/2) | Complete — Next.js migration + data model + Status Flow + spec docs |
| PR #1.1 | `redesign/foundation-pr1-1-patch` | [#3](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/3) | Complete — status flow dependencies + freshness windows + integration corrections |
| PR #1.2 | `redesign/vendor-onboarding-pr1-2` | [#4](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/4) | Complete — vendor onboarding scaffolding + standardized credit products (no per-vendor customization) |
| PR #2 | `redesign/originations-pr2` | [#5](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/5) | Complete — Originations workplace end-to-end (worklist + Loan Header + all 10 tabs) |
| PR #3 | `redesign/section-stubs-pr3` | [#6](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/6) | Complete — 6 sections scaffolded (Underwriting / Servicing / Collections / Reports / Archive / Settings) with worklist previews + StubBanner placeholders |
| **PR #3.1** | **`redesign/credit-product-refactor-pr3-1`** | **[#7](https://github.com/dmdwebster-collab/payspyre-admin-demo/pull/7)** | **Open as draft, awaiting David's review** — credit product refactor: brackets + multi-frequency |

Each PR is stacked: `--base` of the next branch is the previous branch.

---

## 4. Where you are right now

**Current branch:** `redesign/credit-product-refactor-pr3-1`
**Last commit:** `b7c4c59 PR #3.1: Update PR map with credit-product refactor entry`
**Tests:** 96/96 passing (5 vitest files)
**Build:** `npm run build` clean, all 22 routes render

**PR #3.1 is in David's court for review.** Do not start PR #4 until he confirms the bracket shape — see `docs/spec/credit-product-architecture.md` for his verbatim direction. The Slack draft asking him to review is saved in Michael's "Drafts & Sent" (DM channel `D01UA4MUPAN`); Michael needs to manually send it.

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

## 7. What's next (PR #4 plan, pending David's PR #3.1 sign-off)

Each section in PR #3 has a `StubBanner` listing the fields its real UI must render. PR #4 is the workplace build-out:

1. **Underwriting workplace** — pull tab, decisions, scorecard runs.
2. **Servicing workplace** — needs new data model (`loans`, `payment_schedules`, `transactions`) before tab UIs can be built. Block on this if not yet defined.
3. **Collections workplace** — bucketed by DPD, NSF handling, promise-to-pay tracking.
4. **Reports workplace** — exec dashboards, vendor reports, regulatory exports.
5. **Archive workplace** — closed-loan view, immutable.
6. **Settings — Loan Settings editor** — the actual product editor on top of the PR #3.1 bracket schema. **Per-bracket disclosure / document templates** are part of this scope (deferred from PR #3.1 — see `docs/spec/credit-product-architecture.md` §6).
7. **Settings — Decision Engine** — scorecard rules + auto-decision thresholds. Once defined, attach `decision_strategy_id` to `AmountBracket` (called out as a goal by David).

PR #4 should be split into multiple stacked PRs (PR #4.1, #4.2, …) by section to keep diffs reviewable.

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

## 10. Open questions for David (pending in PR #7)

1. Does the bracket shape land the way he intended (multiple `permitted_terms[]` per bracket, single `rate_band` per bracket)?
2. Confirm fees stay at the product level (`origination_fee_pct`) rather than per-bracket?
3. Confirm `decision_strategy_id` should attach at the bracket level (his stated goal of "approval strategy" varying with loan size)?
4. Does he want pricing tier names surfaced as a separate concept, or is the `rate_band` (min / default / max APR) sufficient?

Don't proceed to PR #4 (Loan Settings editor) until these are answered — the editor's UX depends on them.
