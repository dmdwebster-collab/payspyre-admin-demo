# Screenshots — 2026-05-11

Captured against the dev server at `localhost:3000` after the PR #4.x cutover-ladder build (sessions Sat–Sun May 10–11, 2026). Viewport: 1440px wide. Headless Edge.

For David's read-through before the live preview deployment goes up.

| # | View | What it shows |
|---|---|---|
| `01-settings-products.png` | `/settings/products` | **PR #3.1 bracket model in real UI.** Dental Patient Financing product with 3 amount brackets (small / mid / large), each with its own term bands + rate band (min · default · max APR). |
| `02-uw-decision.png` | `/underwriting/APP-2026-00022/decision` | **Underwriting Decision tab.** Offer summary, verification freshness badges, Decision Engine recommendation (PR #4.8), state-machine action forms wired to Server Actions (approve / reject / request_* / etc.). |
| `03-collections-nsf-queue.png` | `/collections` | **Collections worklist.** "Process PTPs now" Server Action button, Promise-to-pay watch panel (PR #4.4.4), NSF queue with DPD bucketing (0-29 / 30-59 / 60-89 / 90+), per-event link into detail. |
| `04-nsf-detail-resolve.png` | `/collections/nsf/nsf-sample-001` | **NSF event detail page.** Event card + bounced payment card + Resolve form with Resolution selector + PTP capture sub-form (required only when resolution = PROMISE_TO_PAY). Server Action wired. |
| `05-cutover-checklist.png` | `/cutover` | **Integration cutover runbook.** Per-provider checklist (Zum Rails, Flinks, SignNow, SendGrid, Equifax, Walnut, MessageBird) with 22 items + READY/NOT READY badge. Each row has status select + notes + Save Server Action. |
| `06-migration-reconciliation.png` | `/reports/migration` | **TurnKey migration reconciliation viewer (live).** Live `runMigration()` against the sample export. Per-entity counts + money totals (source vs imported, delta, within/exceeds tolerance) + issues list. |
| `07-migration-diff.png` | `/reports/migration/diff` | **Run-vs-run diff dashboard** — empty state (only 1 seed run in the fixture; will populate once dual-run kicks off). |
| `08-servicing-schedule.png` | `/servicing/PS-SAMPLE-001/schedule` | **Servicing Schedule tab.** Loan Header + sticky tab nav (Schedule / Payments / NSF / Activity). Schedule reads PR #4.1 PaymentSchedule + entries with status badges per period. |
| `09-migration-runs-history.png` | `/reports/migration/runs` | **Migration run history.** Persisted MigrationRun rows with operator + source + strategy + OK/REVIEW badge + principal delta + error count. "Run migration now" Server Action button at top. |

## Known cosmetic issues (not blockers)

- The sidebar tags every workplace as "PR #3 · scaffolded" even on workplaces that are fully implemented (Servicing, Collections, Underwriting, Reports, Archive, Settings). Stale labels from the PR #3 scaffolding pass — will be a cleanup PR.

## Replicate locally

```bash
git clone https://github.com/dmdwebster-collab/payspyre-admin-demo.git
cd payspyre-admin-demo
npm ci && npm run dev
```

Then visit each URL above.
