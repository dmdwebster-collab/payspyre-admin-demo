# CLAUDE.md — PaySpyre Admin Demo
<!-- Read this file before every session. It is your briefing document for this project. -->

## Project Overview

PaySpyre is a dental-focused payments and call intelligence platform. This repository is the **Admin Surface** — the internal operator dashboard for PaySpyre staff and practice administrators. It provides practice onboarding, subscription management, call recording oversight, compliance reporting, and analytics across all connected dental practices.

**Surface:** Admin  
**Audience:** PaySpyre internal team + practice administrators  
**Related surfaces:** consumer-demo (patient), patient-portal-demo (patient portal), vendor-portal-demo (vendor/partner)

See `SURFACE.md` for full surface documentation.

Owner: Dr. Michael Webster  
Status: Active development (demo)  
Repository: public — dmdwebster-collab/payspyre-admin-demo

---

## PaySpyre Architecture (Shared Across All Surfaces)

PaySpyre is a multi-surface SaaS product. All surfaces share:
- Same Supabase backend with per-practice RLS isolation
- Same auth provider (Supabase Auth)
- Same design system (Tailwind + shadcn/ui)
- Same validation library (Zod)
- Same API convention (Next.js API routes under `/app/api/`)

Each surface has its own Next.js app with role-scoped routing and RLS-enforced data access.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui |
| Backend | Next.js API Routes + Supabase Edge Functions |
| Database | Supabase (Postgres with RLS, per-practice isolation) |
| Auth | Supabase Auth (JWT, role-scoped) |
| Payments | Stripe (hosted elements only — never roll your own card capture) |
| Call Recording | Twilio Voice |
| Transcription | OpenAI Whisper or Azure Speech (server-side only) |
| AI Summary | Claude API — claude-sonnet-4-5 |
| Hosting | Digital Ocean App Platform |
| CDN/DNS | Cloudflare |
| CI/CD | GitHub Actions |
| Validation | Zod (all inputs) |

---

## Critical Rules — Payments + PHI / PHIPA / HIPAA

### NEVER:
- Log or store raw card numbers, CVVs, or PANs — tokenisation only via Stripe
- Store call recordings without explicit patient consent captured in the system
- Pass payment data through Claude API (Claude does not process PCI-scoped data)
- Store call recording audio files outside of encrypted Supabase Storage
- Hard-code any payment processor API keys or Twilio credentials
- Bypass Supabase RLS — all queries must be scoped by `practice_id`
- Commit `.env`, `.env.local`, or any real credentials
- Use real patient data in development — synthetic/mock data only until Anthropic Enterprise BAA

### ALWAYS:
- Use Stripe hosted fields/elements for card capture
- Capture and log call recording consent with timestamp before recording starts
- Pass only transcription text (not audio) to Claude API
- Tag all Claude API calls with `session_id` for cost attribution
- Scope every Supabase query by `practice_id`
- Validate all inputs server-side with Zod

---

## Planning Process

**Before writing any code:**
1. Enter plan mode
2. List all files to be changed
3. Check which surface-specific components are affected (admin-scoped only)
4. Any change to payment flow or call recording requires plan mode + security plugin review
5. Write task checklist and wait for approval

**Subagent rule:** Propose breakdown for >3 file changes.

---

## Code Conventions

- Tailwind CSS only — no inline styles
- Server components by default — `'use client'` only when necessary
- shadcn/ui for all form inputs, dialogs, tables
- Zod validation on every input (client + server)
- Admin-specific components in `/components/admin/`
- Shared PaySpyre components in `/components/shared/`

---

## Commands

### Auto-Approve (safe)
```bash
npm run lint
npm run typecheck
npm run test
git status
git diff
ls
cat [file]
supabase gen types typescript --local
curl [read-only public endpoint]
```

### Require Approval
```bash
git commit
git push
supabase db push
npm install [package]
# editing any .env file
# deleting any file
```

---

## Model Selection Guidance

| Task | Model |
|------|-------|
| Architecture planning | claude-opus-4-5 (plan mode) |
| Feature implementation | claude-sonnet-4-5 |
| Code review | claude-sonnet-4-5 |
| High-volume ops | claude-haiku-4-5 |

**Rule:** Opus plan → Sonnet execute → Sonnet review.

---

## Mistake Prevention Log
<!-- Append every Claude error here. Never delete entries. -->
- Payment amounts must always be validated server-side — never trust client-provided amounts
- Consent webhook must fire before recording webhook — order matters
- Claude summaries must NOT include payment amounts or card type
- Always check RLS is enforcing `practice_id` isolation before any payment query
- Admin routes must verify `admin` or `practice_admin` role — never rely on UI-only access control
