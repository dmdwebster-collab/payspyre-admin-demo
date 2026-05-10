# Legacy: v1 Static Demo

This directory preserves the original PaySpyre Admin v1 — a static HTML/CSS/JS single-page demo — for reference during the migration to the Next.js 14 platform.

**Do not modify these files.** They are kept solely as the source of:

- The dark navy + gold visual identity (see `v1-static-demo/style.css`)
- The real demo loan data (see `v1-static-demo/app.js` — the `LOANS`, `VENDORS`, `KPIS`, and `TRANSACTIONS` constants at the top)
- The PaySpyre logo (`v1-static-demo/payspyre-logo.png`)

The new app at the repository root supersedes this demo. Loan data has been ported into typed mock fixtures under `lib/data/`. The theme palette has been ported to `tailwind.config.ts`.

See `docs/spec/admin-dashboard-spec.md` for the redesign source of truth.
