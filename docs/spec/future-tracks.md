# Future Tracks — Parked Items

This file catalogs work that is **not in the current PR roadmap (PR #1 →
PR #3)** but is captured here so nothing gets lost. Sources:

- `2026-05-05-Admin-Dashboard.docx` — David / Michael's admin redesign spec
  (drove PRs #1 / #1.1 / #1.2)
- `PaySpyre-Development-Standalone.docx` — TurnKey-era standalone-platform
  wishlist (Michael's authored backlog, May 2026)
- `PaySpyre-Development-Reporting.docx` — accounting / portfolio reporting
  pain points
- `PaySpyre-Development-Website.docx` — payspyre.com marketing-site fixes
  and the Resources / training-platform direction
- `PaySpyre-Development-Video-Series.docx` — planned 25-video onboarding
  / training library
- `vendor-setup-example-elevation-dental.docx` — internal setup checklist
  used today for BC1180 (Elevation Dental). Operational ground-truth
  callouts written up in `docs/spec/vendor/setup-example-notes.md`.

Some of this language reflects pain points on the **current TurnKey
platform**, not the system being rebuilt here. Treat as context and design
intent, not literal specifications.

---

## Track A — Vendor Training Platform (LMS)

**Direction (David, May 8 2026):** wishlist for a long time. Cardone-style
LMS with the 15-video vendor series + post-video activities (e.g. "post a
test payment"), gating progression to **LIVE** in the vendor onboarding
flow.

**Scope of the eventual build:**

- Course / module / lesson model
- Per-user enrollment + progress tracking
- Quiz / activity engine with auto-grade hooks back into our admin tasks
- Certificate / sign-off issued back to the vendor onboarding flow
- 15-video vendor series + 10-video customer series (see Video Series doc)

**Why parked:** the standardized onboarding flow (PR #1.2) already
collapses the bulk of the manual touch points; training can ship as a
v2.0 enhancement once the foundation is stable. The vendor-onboarding
**TRAINING** state is preserved in the state machine so the LMS can plug
in later without a model migration.

---

## Track B — Hardship Programs

From the Standalone wishlist:

- **Deferment** — request, doc signing, notification, processing
- **AOT temp / perm** — request, doc signing, notification, processing
- **Settlements** — non-cash write-down workflow

Will live under **Servicing** workplace once PR #3 is in. Needs:

- New `LoanModification` type + status flow (request → review → execute)
- Doc-signing dispatch via SignNow
- Settlement payment category (already in `LOAN_STATUSES`: `SETTLED`)

---

## Track C — Decision Engine v2

From the Standalone wishlist + Admin Dashboard spec:

- Multiple scorecards (select / create different scorecards)
- Different application processes (Short / Full / Auto)
- Manual rescore button
- Direct credit-approval authority by loan amount + employment status
- Score based on **verified** data (post-verification rescore)

Today's PR #3 settings stub mentions "Default scorecard required at
launch." This track is the v2 expansion.

---

## Track D — Borrower Self-Service Enhancements

From the Standalone wishlist (Borrower Portal section):

- 2FA on borrower portal
- Restrict ID changes (request-update flow with verification)
- Remove "Add bank account" → replace with "Request bank-account change"
  flow conflicting with IBV
- Borrower-initiated account statement / payout-letter generation
- Borrower-initiated credit-bureau auth + credit-monitoring (Equifax
  white-label)
- Card program integration (MC / Visa / Zum)
- Credit insurance integration (Walnut)

These belong in the **patient portal repo** (`payspyre-patient-portal-demo`)
but several drive admin-side requirements (notifications, change-log
tracking, expiry monitoring).

---

## Track E — Application + Loan Modeling

From the Standalone wishlist:

- Dynamic rates by loan-amount bracket
- APR caps (criminal-code compliance)
- Grace-period products (0% with payments for N periods)
- Same-as-cash products
- Revolving accounts (purchase confirmation + term changes)
- Multiple payment frequencies within a single product
- Semi-monthly date configurability (15th / last / manual)
- Co-borrower full profile + scoring opt-in/opt-out
- Co-borrower dashboard (loan data only, no PII of primary)

Maps onto an extended `CreditProduct` schema. PR #3's "Loan Settings"
stub already lists rate bands and validity windows — this is the
v2 product expansion.

---

## Track F — Reporting + Performance

From the Reporting + Standalone docs (active pain points on TurnKey):

- Individual account-level monetization tracking + invoicing
- Vendor monthly statement automation
- Delinquency tracking: CML, Pot30, Pot60, Pot90, 90+
- Payout calculator including future-scheduled fees (current bug: only
  next-due fees are pulled in)
- Scheduled payments forecast over a window (current bug: only next-due
  payments)
- Scheduled report generation + email-out + outbox / review section
- Report grouping by `<$500 / $500-$1000 / $1000+` is useless — 95% of
  loans are $1000+. Replace with PaySpyre-relevant brackets.
- Vendor drilldown (all / multi / single) with vendor-scoped restriction
  for vendor users (read-only, locked to their vendor_id)
- Excel-replacement: portfolio data has hit Excel limits. The standalone
  platform replaces this.

PR #3 "Reports" stub is intentionally thin. Each item above is a card
to schedule into a follow-up PR.

---

## Track G — Compliance / Regulatory

From the Standalone wishlist:

- AML rules engine + suspicious-transaction notifications
- KYC/AML expiry tracking (per-document expiry dates + report)
- ID expiry notifications + ID-management section per account
- Equifax PPSA Connect (lien registration) — already noted in CLAUDE.md
  as a future integration
- FINTRAC MSB registration — flagged in `app/settings/page.tsx` under
  Company Settings ("FINTRAC MSB # (if applicable)")
- Application-merge-fields rendered into the Loan Agreement (attestation /
  written authorization to verify employment, income, etc.) — relevant for
  fraud-defense and authorization-of-information

Will likely span Servicing + Settings + the loan-agreement template
engine.

---

## Track H — Vendor Wallet + Funds Management

From the Standalone wishlist:

- Vendor sees and withdraws collected funds from their dashboard
- Backend logic to compute "funds due to vendor" (today done in Excel
  reporting)
- Zum Rails integration for vendor-side payouts

Lives partly in the **vendor portal** repo and partly in the admin's
Reports / Servicing surfaces. Depends on the cost-of-credit / share
formula work in PR #3.

---

## Track I — Marketing Site (`payspyre.com`)

From the Website doc:

- Careers hero image color treatment fix
- Forms not routing to expected mailbox (Takt redirect issue)
- Blog landing/index page (currently a wall of text)
- 8 drafted unposted blog articles to review/publish
- Resources page (customer): 10 how-to videos
- Resources page (vendor, gated): 15 how-to videos + downloadable job aids
- "Hidden" vendors that work with the application flow but aren't shown
  publicly
- Co-Pay calculator + Finance calculator (potential standalone embed
  linked to PaySpyre via API)
- About Us redesign (less mom-and-pop, more corporate)
- Tagline consistency ("Dream Big, Climb High" / "A better way to finance"
  / "Finance your way" — pick one)
- Top nav: drop About Us, add Blogs / Resources

Lives in the **marketing site repo**, not this admin console — but the
Resources section is the natural home for the training material that
gates vendor go-live (Track A).

---

## Track J — System / Platform

From the Standalone wishlist:

- Automated verification (ID, phone, email, address, employment, income)
  with an admin verification workplace, expiry tracking, and notifications
- Verification workplace and recordings: who completed, when, source,
  applied dates, expiry
- Application merge-fields → Loan Agreement attestation section
- Re-verification of standard application details on Refinance / Renew
- Three-year residence-history capture (stability factor)
- Manual rescore button after verification (resolves "score based on
  unverified data" pain point)
- Easier renew/refinance directly from open account, with deadline-driven
  auto-process / auto-reject
- Automate Equifax CB reporting

Spans Originations / Underwriting / Servicing — multiple PRs.

---

## How this relates to the current PR roadmap

- **PR #1 (foundation, done):** scaffolding + status flow + portfolio
  views.
- **PR #1.1 (David patches, done):** status-flow dependencies + per-product
  freshness windows + integration corrections.
- **PR #1.2 (this PR, in progress):** vendor onboarding scaffolding +
  standardized product framing.
- **PR #2 (next):** Originations workplace end-to-end (10 tabs).
- **PR #3 (after):** Underwriting / Servicing / Collections / Reports /
  Archive / Settings.

Tracks A–J above do not belong in PRs #1 → #3. They are the post-MVP
backlog. When prioritizing, tag follow-up tickets with the track letter
above so we keep traceability back to Michael's source documents.
