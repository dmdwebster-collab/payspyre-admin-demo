# CONTRACT.template.md — PaySpyre
<!--
  INSTRUCTION: Copy this file to CONTRACT.md (not .template.md) at the start of each Claude Code session.
  Fill in all sections before asking Claude to write any code.
  Delete or archive CONTRACT.md after the session ends.
  
  Why: 52 controlled benchmarks showed CONTRACT.md reduces Claude API costs 54% and
  improves output quality from 5/10 to 9/10 vs. prompt-only sessions.
  Source: https://www.reddit.com/r/ClaudeAI/comments/1ss7f38/
-->

---

# Task

## Goal
<!-- One sentence. What does this task accomplish? -->
_Example: Add a Zod-validated Stripe payment confirmation webhook handler that updates the payment status in Supabase._

## Done-When
<!-- Acceptance criteria as a bulleted checklist. Be specific and testable. -->
- [ ] 
- [ ] 
- [ ] 
- [ ] All new code passes `npm run lint` and `npm run typecheck`
- [ ] Unit tests added for any new utility functions
- [ ] No PHI appears in any log output
- [ ] No raw card data or payment secrets in logs

## Constraints
<!-- What must NOT be changed. What must be preserved. -->
- Do not modify Supabase RLS policies unless explicitly listed in Files In Scope
- Do not change the auth flow or JWT handling
- Do not introduce new npm packages without listing them here:
  - Allowed new packages (if any): _none unless specified_
- Do not modify any file not listed in Files In Scope
- Do not touch other PaySpyre surfaces (this repo only)

## Files In Scope
<!-- List every file that may be read OR written. Be explicit. -->
- 

## Files Out Of Scope
<!-- List files that must not be touched even if they seem related. -->
- `.env`, `.env.local`, `.env.example`
- `/supabase/migrations/` (unless migration is explicitly part of this task)
- Files in other surface repos
- Any file not listed in Files In Scope above

## Expected Output Format
<!-- What should Claude produce? -->
- [ ] Modified files with full file content
- [ ] Explanation of changes
- [ ] SQL migration (if schema changes required)
- [ ] Updated TypeScript types

## TypeScript Interfaces / DB Columns In Scope
<!-- Paste exact interfaces, Supabase table column names, and import paths. -->
```typescript
// Example — replace with actual:
// Table: payments
// Columns: id UUID, patient_id UUID, practice_id UUID, amount_cents INT, 
//          stripe_payment_intent_id TEXT, status TEXT, created_at TIMESTAMPTZ
// Import path: @/lib/supabase
```

## Rollback Plan
<!-- How to undo this change if it breaks production. -->
- Git revert: `git revert [commit-sha]`
- Supabase migration rollback (dev): `supabase db reset`
- Reverse migration SQL:
  ```sql
  -- Paste reverse migration SQL here if schema is changing
  ```
- Stripe webhook: disable the webhook endpoint in Stripe dashboard if payment flow is affected
