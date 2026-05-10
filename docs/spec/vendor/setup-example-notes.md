# Vendor Setup — Operational Notes from Real Example

Source: `vendor-setup-example-elevation-dental.docx` — internal checklist
used today by PaySpyre to set up a new vendor. Provided by Michael
Webster, May 8 2026, as ground truth for what the **current** onboarding
process actually captures, beyond the paper Vendor-Application form.

These notes call out things the redesigned digital flow (PR #1.2 →
PR #2 build) needs to handle that are NOT obvious from
`vendor-application-form.pdf` or `onboarding-redesign.md` alone.

---

## 1. Vendor ID format — `{Province}{4-digit}`

Confirmed convention. Elevation Dental = **`BC1180`**. Existing seed data
already uses `BC4906`. Stable across the rebuild.

- Format: `^[A-Z]{2}\d{4}$`
- Province prefix: BC, AB
- 4-digit sequence — enough for ~10k vendors per province; revisit when
  PaySpyre passes 5k vendors

## 2. Promo codes are vendor-scoped, products are not

This is the critical nuance behind David's "standardize credit products"
direction.

- **Credit products** are the global standardized catalog (per PR #1.2).
- **Promo codes** identify *which clinic originated the loan* and which
  product/frequency the patient was offered. They remain vendor-scoped.

### Naming convention (from Elevation Dental setup)

```
{VENDOR_ID}-{FREQ}{SLOT}
```

- `VENDOR_ID` — e.g. `BC1180`
- `FREQ` — single letter
  - `B` = Bi-Weekly
  - `M` = Monthly
  - `S` = Semi-Monthly
  - `W` = Weekly
- `SLOT` — `00`–`13` (14 slots per frequency)

So each vendor has **14 slots × 4 frequencies = 56 promo codes** at
provisioning time. Slots map to specific credit products in the global
catalog (`CP00` through `CP13` from the example).

Examples from Elevation Dental:

```
BC1180-B00   Elevation Dental - Bi-Weekly CP00
BC1180-M07   Elevation Dental - Monthly CP07
BC1180-S13   Elevation Dental - Semi-Monthly CP13
BC1180-W04   Elevation Dental - Weekly CP04
```

### Implications for the data model (PR #2)

- New `vendor_promo_codes` table:
  - `code` (pk, e.g. `BC1180-B00`)
  - `vendor_id`
  - `payment_frequency` (`Weekly | BiWeekly | SemiMonthly | Monthly`)
  - `credit_product_id` (FK to global catalog)
  - `description`
  - `active` (boolean)
  - Test/Live environment marker (see §4)
- Auto-generate the 56-row block on `PROVISIONING` for every new
  vendor; re-run when a new credit product is added to the catalog.
- Promo codes feed the borrower-facing application embed and the
  application URL parameter that ties a new application back to its
  originating vendor + product slot.

## 3. Multiple providers, shared front-desk contact

Elevation Dental has three providers (Dr. Otway, Dr. Balint, Dr.
Khadembashi) all sharing one contact (Lowella Lee, receptionist). The
current paper form captures this via repeating rows.

- Provider ↔ Contact is many-to-one: many providers can share a
  primary contact (and a contact phone/email).
- The current `Vendor.providers` is just `string[]` of names. The
  digital flow needs a richer `providers` array per vendor with at
  minimum: provider full name, primary contact name, contact phone,
  contact email.
- Track for PR #2 — already implied by Originations Loan Header
  ("Provider / location") but not yet modeled.

## 4. Test vs Live environment promotion

The internal checklist tracks **every** item with separate `Test` and
`Live` columns:

- Documents uploaded (Test, Live)
- MSA created/signed (Test, Live)
- User accounts (Test PW, Live PW)
- Training sessions
- Promo codes provisioned (Test, Live)

This means the operational model is:

1. Onboard the vendor end-to-end into UAT
2. Run a test loan transaction with internal staff or a willing pilot
3. Promote the vendor + users + promo codes to Live

### Implications

- `Vendor` and `vendor_onboarding_events` both need an `environment`
  marker (`UAT | LIVE`) so the same vendor application can produce
  events in two environments without conflicts.
- The state machine itself is environment-agnostic — both UAT and Live
  walk the same INTEREST_REGISTERED → LIVE path; but the workplace
  filters by environment so PaySpyre staff can run a UAT smoke test and
  then re-walk to Live.
- Defer to PR #2 — for PR #1.2 we just note the requirement. The
  vendor onboarding state machine has no environment coupling so the
  marker can be added without breaking changes.

## 5. MSA has three internal substates inside MSA_SENT → MSA_SIGNED

The example records "Master Services Created / Signed and Counter
Signed" as a single line item, but operationally those are three
distinct events:

1. **Created** — PaySpyre legal generates the MSA from
   `msa_template_version`
2. **Signed** — vendor authorized signatory executes via SignNow
3. **Counter-signed** — PaySpyre executes on its side

Today the state machine collapses (1) → (3) into the MSA_SENT →
MSA_SIGNED transition. Two options for PR #2:

- **Option A (preferred):** keep the two states; record the three
  sub-events in `vendor_onboarding_events` with action codes
  `msa_created`, `msa_vendor_signed`, `msa_countersigned`. The
  `register_msa_signed` action becomes a synthesis of the third event.
- **Option B:** introduce two intermediate states `MSA_VENDOR_SIGNED`
  and `MSA_COUNTERSIGNED`. Higher overhead, less flexible.

We will go with Option A unless David asks for explicit states.

## 6. Two training sessions, not one

Elevation Dental has two scheduled training sessions, not one
("Training Session #1 / #2"). Today's model has a single TRAINING
state. The fix:

- Treat TRAINING as a state that can be entered and exited multiple
  times via internal `training_session_held` events recorded in
  `vendor_onboarding_events` with timestamps and attendance.
- The `complete_training → LIVE` transition gates on N completed
  sessions (configurable; default 2 from this example).
- This dovetails cleanly with the eventual LMS in
  `docs/spec/future-tracks.md` Track A.

## 7. Provisioning includes per-vendor document templating

The checklist has two items inside provisioning that are NOT covered
by SignNow + Zum Rails:

- **Loan Agreement Created & Uploaded** — vendor-branded loan
  agreement (vendor logo / trade name on the borrower-facing PDF
  template). Even with standardized products, the document presented
  to the borrower references the originating clinic.
- **Adjust Finance Calculator as required** — vendor-branded finance
  calculator widget for the clinic's website (referenced in the
  Website doc as the embed widget / co-pay calculator).

These are template-rendering tasks, not provider-integration tasks.
Implementation route in PR #2:

- A `vendor_documents` table for vendor-branded artifact uploads /
  versions.
- A simple template engine (Handlebars-style merge fields) over a
  master loan-agreement template, with vendor logo / trade name as
  merge inputs.
- Not in scope for PR #1.2.

## 8. Required documents — confirmed and additive

The checklist confirms the document set we already model in
`VendorApplication.documents`:

- Vendor Application
- Business License
- Certificate of Incorporation
- Notice of Articles
- Government issued valid Photo ID for Owner / Director
- Pre-Authorized Debit Form or Void Cheque

Two refinements:

- "Photo ID for Owner / Director" — currently we model `photo_id_front
  _uploaded` + `photo_id_back_uploaded` for a single individual.
  Realistically we need one document per `VendorDirector` row when the
  director is a beneficial owner. Track for PR #2.
- The Vendor Application document is itself an output of the digital
  flow — once the form is submitted electronically we generate a
  rendered PDF for the file.

---

## Summary — what this changes for PR #1.2 vs PR #2

**No change in PR #1.2** to the state machine, types, or schema —
PR #1.2 stays focused on scaffolding. This document is captured as a
spec note so the operational ground truth is preserved.

**Captured in PR #2 backlog:**

- `vendor_promo_codes` table + auto-provisioning of 56 codes per vendor
- `Vendor.environment` marker (`UAT | LIVE`) + workplace filter
- MSA three-sub-event audit trail (Option A above)
- Multi-session TRAINING with `training_session_held` events
- Vendor-branded loan agreement + finance calculator templating
- Per-director photo ID upload (one document per beneficial-owner row)

These items belong in `docs/spec/future-tracks.md` Track J (System /
Platform) but are pulled forward into PR #2 because they are needed to
actually onboard a real vendor end-to-end, not deferred.
