# TurnKey → PaySpyre migration — PR #4.2

> Status: scaffolded.
> Wraps the cutover from TurnKey (PaySpyre's leased platform for the past
> ~4 years) to the PaySpyre-owned platform. PR #4.6 (reconciliation
> dashboards) reads the report shape produced here.

## 1. Why this PR exists

Per `CLAUDE_HANDOFF.md` §0, **PaySpyre is a 4-year-old running lender on
TurnKey**. The point of the new platform is to replace TurnKey, which means
moving every active loan / borrower / vendor / transaction across without
losing data and without breaking the regulatory audit trail (BC + AB
consumer credit must reconcile to the dollar across the migration).

This PR introduces the **migration runner** — a pure function that takes
a TurnKey export and produces:

1. **Mapped PaySpyre entities** ready for an idempotent DB upsert.
2. **A reconciliation report** comparing source totals against imported
   totals so we can prove the migration was lossless.
3. **A structured error list** for everything that didn't map cleanly.

The runner is intentionally I/O-free. Both ends of the pipe — reading the
TurnKey export and writing to Postgres — are out of scope until §3's
unknowns are answered.

## 2. Surface area

```
lib/migration/
├── types.ts             # TurnKeyExport* shapes, MigrationResult, ReconciliationReport
├── adapters.ts          # Per-entity TK→PaySpyre mappers + ID derivation
├── reconciliation.ts    # buildReconciliationReport()
└── turnkey-import.ts    # runMigration(exportData, opts) — the entrypoint
```

### Public API

```ts
import { runMigration } from "@/lib/migration/turnkey-import";

const result = runMigration(exportData, {
  schedule_strategy: "auto",   // | "use_export" | "regenerate"
  tolerance_cad: 0.01,
  ran_at: "2026-05-15T00:00:00.000Z",
});

result.imported.borrowers     // Borrower[]
result.imported.loans         // Loan[]
result.imported.schedules     // PaymentSchedule[]
result.imported.schedule_entries  // PaymentScheduleEntry[]
result.imported.transactions  // LoanTransaction[]
result.imported.documents     // MigratedDocument[]
result.errors                 // ImportError[] — accumulated, not thrown
result.reconciliation         // ReconciliationReport — money totals + counts + ok flag
```

### Idempotency contract

- `runMigration` is a **pure function**: same input → same output.
- Every PaySpyre id is derived from a TurnKey source id via stable rules
  (see `adapters.ts → ids`). Borrower / schedule / schedule-entry /
  transaction / document ids are **UUIDv5** under namespace
  `6f9619ff-8b86-d011-b42d-00cf4fc964ff`. Loan / application ids use
  human-readable prefixes (`PS-TK-<acct>` / `APP-TK-<id>`) since their
  SQL columns are `text`.
- Errors accumulate; the runner never throws. A re-run with identical
  input produces a bit-identical result (modulo `ran_at` if the caller
  doesn't pin it).
- The eventual DB upsert (PR #4.2.1) uses these ids as PKs with
  `ON CONFLICT DO UPDATE`, completing the idempotency story end-to-end.

### Schedule strategy

| Mode | Behavior | Use when |
|---|---|---|
| `use_export` | Adapt every schedule from the export. Error if a loan has no schedule. | TurnKey schedule export is trusted and complete. |
| `regenerate` | Always re-derive schedules from loan params via `lib/servicing.ts → scheduleFromLoan` (canonical 360-day DSI). | TurnKey schedule export is missing or suspected of drift. |
| `auto` (default) | Use the export when present, regenerate when missing. | Dual-run period — reconciliation can spot divergence between TurnKey and our generator. |

### Reconciliation report

`ReconciliationReport.ok` is true iff:

1. Every entity has zero adapter errors, AND
2. Every money total (`total_principal_advanced`, `total_payments_received`,
   `total_outstanding_principal`) is within `tolerance_cad` of the
   exported total.

The `issues[]` array surfaces a capped (default 20) human-readable list
of problems for the dual-run dashboard and the regulator.

## 3. Open questions (gating real cutover)

> Not blocking PR #4.2 — the scaffolding works against the assumed shape.
> Each item below must be answered before we attempt a production cutover.

1. **Export shape — DB dump, API, CSV, or file batch?** The whole runner
   assumes we receive a `TurnKeyExport` object (in-memory, JSON-shaped).
   The actual transport / parser layer is not in this PR. Ask TurnKey
   directly OR reverse-engineer from whatever export endpoint exists in
   the current portal.
2. **TurnKey field names + value vocabulary.** The `TurnKey*Record`
   interfaces in `types.ts` are educated guesses based on common
   loan-system terminology. Every field marked `TODO(turnkey)` needs a
   real-world example before going live.
3. **Loan status vocabulary.** The `mapLoanStatus` / `mapApplicationStatus`
   tables in `adapters.ts` cover the common cases plus a few aliases.
   Once we have a TurnKey export sample, sweep every distinct value into
   one of the maps or surface as an error.
4. **Document binaries.** `TurnKeyDocumentRecord` carries metadata + a
   `storage_url`. Whether TurnKey hands us URLs we can re-stream into
   Supabase Storage, or whether we need a separate file extract, is
   unknown. The runner currently treats `storage_url` as a passthrough.
5. **Transaction type vocabulary.** `LoanTransaction.transaction_type` is
   a free-form string (per the existing schema). Once TK values are
   known, normalize via a mapper and tighten the column to an enum in a
   follow-up PR.
6. **Active loan / borrower count.** Affects whether we do a single
   big-bang migration or a rolling/batched one. The runner is fine with
   either — each batch is a separate `runMigration` call with the same
   ids namespace, so ids stay stable across batches.
7. **TurnKey contract end date / cutover window.** Drives PR #4.7
   (integration cutover) timing.

## 4. Out of scope

- **Transport / parser** — reading the actual TurnKey export file (CSV /
  API call / DB dump). Lives in a follow-up once §3.1 is answered.
- **DB upsert** — `ON CONFLICT DO UPDATE` SQL for each entity. Lives in
  PR #4.2.1 once we have a Supabase target.
- **Reconciliation dashboards** — the report shape is here; the React
  views land in PR #4.6.
- **Cutover orchestration** — staging vs prod runs, dual-run windows,
  webhook URL rotation. PR #4.7.

## 5. Testing strategy

`lib/migration/turnkey-import.test.ts` covers (29 cases):

- Status-mapper happy + sad paths (case-insensitive, alias resolution,
  unknown values surface as errors).
- Per-adapter happy paths + targeted failures (missing required field,
  unknown FK, unsupported province, malformed email).
- ID derivation: UUIDv5 borrowers (deterministic, version 5, variant
  10xx), prefix-based loan / application / schedule ids.
- End-to-end `runMigration` happy path (no errors, zero deltas, `ok =
  true`).
- Schedule strategies: `use_export` errors on missing, `regenerate`
  ignores export, `auto` uses export when present and regenerates when
  absent.
- **Idempotency** — two runs over the same input produce JSON-identical
  results.
- Error accumulation — bad records flag `failure_rate`, surface in
  `issues[]`, flip `ok = false`.
- Money-delta detection — dropped records produce a measurable principal
  delta that exceeds tolerance.

Suite total after this PR: 148 tests across 7 vitest files.
