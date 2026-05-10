# Servicing data model — PR #4.1

> Status: scaffolded.
> Surfaces (PR #4.3 Servicing, PR #4.4 Collections, PR #4.6 Reports) and the
> TurnKey migration adapter (PR #4.2) are stacked on top of this model.

## Why this PR exists

The cutover from TurnKey requires PaySpyre to own:

1. The amortization plan for every active loan (so billing, payoff quotes,
   collections triggers, and dual-run reconciliation all read from the
   same source of truth).
2. The funds-flow lifecycle of every payment (so Zum Rails callbacks can
   land cleanly without re-deriving status from a ledger).
3. NSF events with reason codes and retry state (so collections has a
   queue to work, and reports can compute return rates per cohort).

The legacy `Loan` and `LoanTransaction` types from PR #1/#2 cover the loan
master record and the per-posting ledger, but they don't model the
**plan**, the **payment lifecycle**, or **return events** as first-class
entities. PR #4.1 closes those gaps.

## Entities

```
Loan ──┬──► PaymentSchedule (1..n versions, exactly one active)
       │      └──► PaymentScheduleEntry (1..n)
       │
       └──► Payment (n)
              ├── posts to ──► LoanTransaction (existing, PR #2 ledger)
              └── if RETURNED ──► NSFEvent
                                   └── retry ──► Payment (n+1)
```

Foreign keys (SQL):

| From | To | On delete |
|---|---|---|
| `payment_schedules.loan_id` | `loans.id` | cascade |
| `payment_schedule_entries.schedule_id` | `payment_schedules.id` | cascade |
| `payments.loan_id` | `loans.id` | cascade |
| `payments.bank_account_id` | `bank_accounts.id` | (set null implicitly) |
| `nsf_events.loan_id` | `loans.id` | cascade |
| `nsf_events.payment_id` | `payments.id` | cascade |
| `nsf_events.retry_payment_id` | `payments.id` | (no cascade — retry survives original delete) |

`payment_schedule_entries.payment_id` is intentionally **not** a hard FK —
deleting a payment must not cascade through to the schedule history.
Reconciliation re-attaches via `payment_id` lookup at read time.

## State machines

### `PaymentScheduleEntry.status`

```
PENDING ──pay in full──► PAID
   │                       (terminal — re-allocation via reset)
   ├──pay partial──► PARTIAL ──pay remainder──► PAID
   │                              │
   │                              └──past due──► MISSED
   └──past due──► MISSED ──recovery──► PAID / PARTIAL
                            │
                            └──operator action──► WAIVED

WAIVED is a manual operator override (deferment, hardship). Once an entry
is WAIVED it stays out of the next-due calculation and reports.
```

### `Payment.status`

```
SCHEDULED ──submit──► PROCESSING ──┬──► POSTED  (settled — allocates to schedule)
                                    ├──► RETURNED (bounce — opens NSFEvent)
                                    └──► FAILED  (rejected pre-bank, no NSF)

POSTED ──reverse──► REVERSED  (post-hoc adjustment)
SCHEDULED / PROCESSING ──cancel──► CANCELLED  (operator)
```

A Payment that flips RETURNED is paired with exactly one NSFEvent. The
retry attempt is a **new** Payment row with its own id, linked back via
`nsf_events.retry_payment_id`. We never reuse a Payment id for a retry.

### `NSFEvent.resolution`

```
null ──borrower paid──► RECOVERED
   ├──gave up──► WRITTEN_OFF
   ├──PTP captured──► PROMISE_TO_PAY ──follow through──► RECOVERED
   │                                  └──no follow through──► WRITTEN_OFF / IN_COLLECTIONS
   └──escalated──► IN_COLLECTIONS ──worked──► RECOVERED / WRITTEN_OFF
```

`resolved_at` is set when the resolution is non-null.

## Allocation rule (POSTED → schedule)

`lib/servicing.ts → applyPaymentToSchedule(entries, payment)`:

> Walk entries in `period` order. For each non-PAID, non-WAIVED entry,
> apply up to `expected_payment - paid_amount`. A payment that exceeds
> what's left on the current entry advances to the next entry.

This mirrors how Zum Rails callbacks settle in the existing TurnKey
ledger. The waterfall (fees → interest → principal) inside a single
entry is owned by `LoanTransaction` row generation, which lives in the
posting handler (PR #4.3) — not here. `applyPaymentToSchedule` only
moves the entry-level totals.

`applyPaymentToSchedule` is a no-op for non-POSTED payments. Status
transitions on the Payment (RETURNED, REVERSED, etc.) are handled in
the route handler that owns the Zum Rails callback, not in this helper.

## Schedule reproducibility

A `PaymentSchedule` row stores the frozen generator inputs
(`original_principal`, `annual_rate`, `term_months`, `payment_frequency`,
`first_payment_date`) and the frozen outputs
(`number_of_payments`, `regular_payment`, `total_interest`, `total_paid`).

This lets us re-derive any historical schedule on demand, confirm against
the current `lib/amortization.ts` output, and prove out reconciliation
during the dual-run period (PR #4.6) without depending on whatever the
loan master record currently says.

When a loan is renewed, refinanced, or hardship-reset, we **insert a new
schedule row** with `schedule_version = previous + 1` and flip the prior
row to `active = false`. We never edit a frozen schedule in place.

## Out of scope for PR #4.1

- **Posting handler** — the route that turns a POSTED Payment into
  `LoanTransaction` rows (waterfall: fees → interest → principal). Lives
  in PR #4.3.
- **Servicing UI** — payment ledger, schedule viewer, payoff quote view,
  manual adjustment workflow. PR #4.3.
- **Collections workflow** — NSF queue, retry orchestration, PTP
  tracking, DPD bucketing. PR #4.4.
- **Reconciliation views** — dual-run comparison vs TurnKey export. The
  schema is here, the dashboards are PR #4.6.
- **RLS policies** — every new table in this PR is unprotected. RLS lands
  alongside Auth wiring (still TBD).
