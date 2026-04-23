# SURFACE.md — PaySpyre Admin Surface

## Surface Identity

| Field | Value |
|-------|-------|
| Surface name | Admin |
| Repository | dmdwebster-collab/payspyre-admin-demo |
| Visibility | Public (demo) |
| Primary audience | PaySpyre internal team, practice administrators |
| Authentication role | `admin`, `practice_admin` |
| URL pattern | `admin.payspyre.com` (prod) / `localhost:3001` (dev) |

---

## What This Surface Does

The Admin surface is the operational control centre for PaySpyre. It gives PaySpyre staff and practice administrators full visibility and control over:

- **Practice onboarding** — add new dental practices, configure their PaySpyre settings, assign Stripe merchant accounts
- **Subscription management** — view, modify, and cancel practice subscriptions; billing history
- **Call recording oversight** — view consent logs, recording retention schedules, audit trail
- **Compliance reporting** — PHIPA/PIPEDA consent audit reports, data retention compliance status
- **Cross-practice analytics** — aggregate payment volumes, call recording usage, feature adoption
- **Integration health** — monitor Twilio, Stripe, n8n, and Supabase Edge Function status
- **User management** — manage practice staff access levels and roles

---

## How It Relates to Other Surfaces

```
PaySpyre Platform
├── Admin (this surface)         — Operators + practice admins
├── Consumer                     — Patients making payments
├── Patient Portal               — Patients reviewing history/treatment
└── Vendor Portal                — Partners, vendors, integrators
```

All surfaces share:
- Supabase backend (same database, per-surface RLS policies)
- Supabase Auth (role-scoped JWTs)
- Tailwind + shadcn/ui design system
- Zod validation library
- GitHub Actions CI/CD

---

## Admin-Specific Data Access

The admin surface has broader read access than other surfaces, but it is still scoped:
- PaySpyre staff (role: `admin`) can read all practices
- Practice administrators (role: `practice_admin`) can only read their own `practice_id`
- Neither role has direct access to individual patient PHI — only aggregate reports
- All RLS policies enforce role-based scope — UI-only guards are not sufficient

---

## Key Files in This Surface

```
/app                        — Next.js App Router
  /app/(admin)/             — Admin-authenticated routes
  /app/api/admin/           — Admin API routes
/components/admin/          — Admin-specific UI components
/components/shared/         — Shared PaySpyre components (cross-surface)
```

---

## Environment Variables Required

```bash
# See .env.example for full list
NEXT_PUBLIC_SUPABASE_URL=REPLACE_ME
NEXT_PUBLIC_SUPABASE_ANON_KEY=REPLACE_ME
SUPABASE_SERVICE_ROLE_KEY=REPLACE_ME    # server-side only
STRIPE_SECRET_KEY=REPLACE_ME           # server-side only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=REPLACE_ME
TWILIO_ACCOUNT_SID=REPLACE_ME          # server-side only
TWILIO_AUTH_TOKEN=REPLACE_ME           # server-side only
```

*Never commit real values. Set in Digital Ocean App Platform environment dashboard.*
