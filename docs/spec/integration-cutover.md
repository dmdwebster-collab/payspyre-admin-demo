# Integration cutover — PR #4.7

> Status: scaffolded.
> The reg-facing checklist that gates the production flip from TurnKey
> to the PaySpyre-owned platform.

## Why this exists

Per `CLAUDE_HANDOFF.md` §0, PaySpyre runs today on TurnKey. Each
integration provider (Zum Rails / Flinks / SignNow / SendGrid / Equifax)
holds **TurnKey's credentials and webhook URLs**. Cutover requires
swapping every one of those without losing a single inbound event.

The checklist at `/cutover` is the operations playbook. Engineering
defines the items + the underlying webhook endpoints; ops works
through the rows and ticks them off as each switch lands.

## Per-provider items (seed set in `lib/data/fixtures/cutover_items.json`)

### Zum Rails (EFT / payments)
- Rotate API key
- Rotate webhook signing secret
- Switch PAD return / NSF webhook → PaySpyre
- Switch payment status webhook → PaySpyre
- Add PaySpyre platform IPs to allowlist
- Re-verify PAD-007 form template

### Flinks Capital (banking)
- Rotate API key
- Switch verification-complete webhook → PaySpyre
- Update post-login redirect URL
- Confirm Flinks Capital subscription tier (Capital required for income / balance signals)

### SignNow (e-signature)
- Rotate API key
- Switch signature-complete webhook → PaySpyre
- Re-verify document template ids

### SendGrid (email)
- Rotate API key
- Switch event webhook → PaySpyre (bounce / unsubscribe / spam-report)
- Migrate template IDs to PaySpyre namespace
- Update SPF / DKIM records to authorize the PaySpyre-owned sender

### Equifax Canada (bureau)
- Rotate API credentials (PaySpyre-owned member number + secret)
- Switch hard-pull callback URL → PaySpyre
- Re-verify member / account number on every credit pull receipt + adverse-action notice

### Walnut (creditor insurance)
- Rotate API key (only when insurance enrollment goes live; safe to leave PENDING until then)

### MessageBird (SMS — inactive)
- Rotate API key (currently `N/A` — re-open when SMS is wired up)

## State machine

```
PENDING ──set DONE──► DONE   (stamps completed_at, completed_by)
   │
   └──set N/A──► N/A         (also stamps completed_at; preserves on re-flip)

DONE / N/A ──set PENDING──► PENDING  (clears completed_at + completed_by)
DONE ──set N/A──► N/A      (preserves the original completed_at)
```

## Server Action contract

`app/cutover/actions.ts → setCutoverItemStatusAction(itemId, formData)`

- Reads `status` + optional `notes` from `formData`.
- Delegates to `lib/cutover.ts → applyCutoverStatus()` (Zod-validated, pure).
- Mutates the in-memory fixture via `repository.updateCutoverItem()`.
- `revalidatePath("/cutover")`.

Production swaps the in-memory mutator for a Supabase upsert. Operator
identity comes from the authenticated user; for the demo it's
hard-coded to "Demo Operator".

## "Ready" banner

`/cutover` shows a green **READY** badge only when every item has a
non-PENDING status. Until then, **NOT READY** with the pending count.
PR #4.7.x adds a hard gate so the integration cutover can't be
triggered until READY.

## Out of scope (intentionally)

- **Real webhook endpoints.** This PR ships the checklist UI; the
  `/api/webhooks/...` route handlers ship per provider in PR #4.7.x.
- **Audit trail rows.** Each status flip should produce an immutable
  audit row eventually; the in-memory mutator just overwrites for now.
- **Per-item attachments / proof.** Operators currently leave a free-form
  note. PR #4.7.x adds a docs / link upload per item.
- **Hard cutover trigger.** The "Flip to PaySpyre" button (with READY
  gate, two-operator confirmation, scheduled execution window) is the
  final cutover action — that's its own PR (#4.7.99) once the rest of
  the ladder lands.
