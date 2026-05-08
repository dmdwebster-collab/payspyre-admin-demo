# Vendor Onboarding — Redesign Plan

> Source: David Wilson, May 8 2026.
> Reference docs in this folder:
> - `onboarding-process-current.pdf` — today's 11-step manual ~2-week process
> - `vendor-application-form.pdf` — current paper application
> - `master-services-agreement-sample.pdf` — current MSA template

## Direction from David

> "Vendor onboarding should be largely automated and near-instant from the
> vendor perspective… we will ultimately require a dedicated onboarding flow
> separate from the borrower/application process."
>
> "Several current steps could either be simplified or eliminated entirely
> if we move away from heavily customized credit products and instead
> standardize product offerings/platform configurations."
>
> "The current onboarding process is clunky, highly manual, and largely
> reflects the limitations of the current platform rather than an
> intentionally designed operational workflow."

## Standardize credit products

David has already largely stopped offering customized product structures —
"most clinics do not have enough lending or risk understanding for
meaningful customization anyway."

**Implication for the data model:**

- `CreditProduct` is a **global catalog** managed under `Settings → Loan
  Settings`. Not vendor-scoped.
- A vendor onboards onto the *standard catalog*. We can later add a
  vendor-product allow-list if a clinic should only see a subset, but the
  default is "every active product available to every vendor."
- Drop the "3 Customized Credit Products" sales-pitch language from any
  onboarding artifact. Replace with "access to the standard PaySpyre
  product catalog."
- Drop the **Discovery Call → Program Design → Program Review** steps from
  the current 11-step flow. They exist only because each vendor used to
  get a custom program.

## Target onboarding flow (what we're building toward)

| # | Stage                          | Today                   | Target                                                                  |
| - | ------------------------------ | ----------------------- | ----------------------------------------------------------------------- |
| 1 | **Sign-up / interest**         | Sales-led discovery     | Self-serve web form (basic business info)                               |
| 2 | **KYB + ID verification**      | Manual doc collection   | Trulioo or Persona KYB (instant business verification + director KYC)   |
| 3 | **Banking / PAD setup**        | Void cheque / PAD form  | Flinks Capital business-account verification + Zum Rails payment profile |
| 4 | **MSA + Schedules signed**     | Email PDF, manual sign  | SignNow envelope, e-signed in flow                                      |
| 5 | **Account provisioning**       | Manual setup, ~2 weeks  | Auto-provisioning on KYB pass + MSA executed (target: same day)         |
| 6 | **Training (self-serve)**      | 3 live calls + sandbox  | Async training library + on-demand sandbox + optional live booking      |
| 7 | **Go-live**                    | Manual switch, week 3   | Automatic on training-completion + first-application threshold met      |

The **Vendor Onboarding state machine** in `lib/vendor-onboarding-flow.ts`
mirrors this target flow. Stages 2 / 3 / 4 are the equivalent of borrower
"Pre-Underwriting" — automatable third-party checks with the same
freshness / reuse principles as the borrower side.

## State machine

States (in order of normal progression):

| Status                     | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| `INTEREST_REGISTERED`      | Web sign-up form submitted; awaiting completion                      |
| `APPLICATION_SUBMITTED`    | Vendor has submitted full application; KYB queued                    |
| `KYB_IN_PROGRESS`          | KYB / ID verification in flight (Trulioo / Persona)                  |
| `KYB_REVIEW`               | KYB returned a "review" result; needs human                          |
| `BANKING_VERIFICATION`     | Flinks business-account verification in flight                       |
| `MSA_SENT`                 | SignNow envelope dispatched to authorized signatory                  |
| `MSA_SIGNED`               | MSA + schedules executed; ready to provision                         |
| `PROVISIONING`             | Vendor records, user accounts, payment profile being created         |
| `TRAINING`                 | Account active in sandbox; vendor working through training modules   |
| `LIVE`                     | Live-server access granted; vendor can originate real applications   |
| `DECLINED`                 | KYB / underwriting / risk decline (terminal)                         |
| `WITHDRAWN`                | Vendor withdrew before completion (terminal)                         |
| `SUSPENDED`                | Live but suspended for compliance / performance reasons              |
| `OFFBOARDED`               | No longer active (terminal)                                          |

**Dependencies:**

- `MSA_SENT` requires KYB pass + Banking verified (cannot send legal docs
  to an unverified entity).
- `PROVISIONING` requires `MSA_SIGNED`.
- `LIVE` requires `TRAINING` complete (or admin override).
- `KYB_REVIEW` is reachable from `KYB_IN_PROGRESS` only — humans can
  approve to `BANKING_VERIFICATION` or decline to `DECLINED`.

**Freshness / reuse:**

- KYB results have a validity window (default 365 days for KYB pass;
  re-run on suspect change events, MSA renewal, or risk review).
- Banking verification results have a validity window (default 90 days)
  with the same reuse semantics as the borrower-side check.

## Data model surface

- `Vendor` (existing) — extended with `onboarding_status`, `kyb_*` fields,
  `msa_*` fields, `live_at`.
- `VendorApplication` (new) — captures sections 1–4 of the current paper
  application: General Info, Directors & Officers, Business
  Representatives, Banking. Drives the state machine.
- `VendorOnboardingEvent` (new) — append-only audit log, same shape as
  `ApplicationStatusEvent` on the borrower side.
- `VendorDirector` (new) — personal info for KYB / KYC of directors and
  officers; required for Trulioo / Persona business-verification call.
- `VendorBankingInfo` (new) — Flinks-verified business-account details.

All Zod-validated, all mirrored in `supabase/schema.sql`.

## What's in PR #1.2

This PR is **scaffolding only**:

- Data model (`lib/types/vendor-application.ts`,
  `lib/types/vendor-director.ts`, fields added to `Vendor`)
- State machine (`lib/vendor-onboarding-flow.ts`) + unit tests
- Supabase schema additions
- Stub `/vendor-onboarding` route in admin (under Settings, since it's
  primarily an admin-side queue at first)
- Reference PDFs preserved in `docs/spec/vendor/`
- Drop "Customized" framing from existing Settings → Loan Settings stub

What's **not** here:

- Public vendor-facing onboarding website (separate repo /
  `payspyre-vendor-portal-demo` — out of scope for this admin repo).
- Trulioo / Persona / Flinks / SignNow wire-up (deferred to a later PR
  once David picks a KYC provider).
- Vendor training platform — see "Future tracks" in `CLAUDE.md`.

## Open questions for David

1. **Standard product catalog content.** With customization off the table,
   what's the launch catalog? (Best guess: 6-, 12-, 18-, 24-, 36-month
   amortizing dental loans across BC + AB; rate bands per risk tier.)
2. **Vendor risk underwriting.** Is there a vendor-side scorecard at all,
   or do we approve on KYB + banking pass alone? What's the decline trigger?
3. **MSA versioning.** When the MSA template changes, do existing vendors
   need to re-sign? Track that with a per-vendor `msa_template_version` and
   a renewal flow.
4. **Suspended / off-boarded vendors.** What happens to live applications
   in flight for a suspended vendor — pause originations, allow
   completion of in-flight, no new submissions?
