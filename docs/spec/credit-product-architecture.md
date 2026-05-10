# Credit Product Architecture (PR #3.1)

**Status:** Approved direction from David Wilson, in implementation
**Owner:** Dr. Michael Webster (PaySpyre Financial)
**Schema source of truth:** `lib/types/credit-product.ts`
**SQL mirror:** `supabase/schema.sql` (`credit_products`, `credit_product_amount_brackets`, `credit_product_term_bands`)
**Helpers:** `findApplicableBracket`, `validateOfferTerms` in `lib/types/credit-product.ts`
**Tests:** `lib/types/credit-product.test.ts` (21 cases)

---

## 1. Design direction (verbatim — David Wilson)

> One area we have not really touched on yet is credit product creation and
> management. I noticed the AI appears to have pulled promo-code concepts
> from the vendor setup process, however the underlying issue here is
> actually much broader and is one of the major architectural limitations we
> need to eliminate in the new platform.
>
> **Current TurnKey Limitations**
>
> **1. Single Payment Frequency Per Credit Product** — TurnKey only allows a
> single payment frequency per credit product. To support Monthly /
> Semi-Monthly / Bi-Weekly / Weekly we are forced to create four separate
> versions of effectively the same product. The platform should instead
> allow **multiple permitted payment frequencies to exist within a single
> credit product configuration**, with the system dynamically handling:
> payment calculations, amortization schedules, disclosure calculations,
> document generation, repayment schedule language.
>
> **2. Single Rate/Term Structure Per Credit Product** — Forces creating
> nearly identical products to control max term by loan size, pricing/risk
> brackets, rate ranges, approval strategy. Example: don't want $84-month on
> $1,000 loan; don't want $50,000 loan capped at 12 months. TurnKey's
> min/max/default rate settings only apply within one isolated product
> config.
>
> **Direction for New Platform** — support: configurable amount brackets,
> configurable term brackets, configurable pricing/rate brackets, multiple
> payment frequencies within the same product, configurable underwriting
> requirements, dynamic disclosures/documents/calculations based on
> selections. **One intelligently configurable product framework instead of
> dozens of duplicated pseudo-products.** Important for scalability,
> reporting consistency, workflow efficiency, vendor usability,
> underwriting consistency, long-term maintainability.

---

## 2. Mapping to the schema

| David's requirement | Where it lives |
| --- | --- |
| Multiple permitted payment frequencies per product | `CreditProduct.permitted_frequencies: PaymentFrequency[]` (parent table) |
| Configurable amount brackets | `CreditProduct.amount_brackets[]` → `credit_product_amount_brackets` table |
| Configurable term brackets *per amount bracket* | `AmountBracket.permitted_terms[]` → `credit_product_term_bands` table |
| Configurable pricing/rate brackets *per amount bracket* | `AmountBracket.rate_band` (`min_rate` / `default_rate` / `max_rate`) |
| Configurable underwriting requirements | `requires_credit_bureau`, `requires_bank_verification`, `credit_report_validity_days`, `bank_verification_validity_days`, `post_booking_*_repull_days` (preserved from PR #1) |
| Dynamic disclosures / docs / calculations | Resolved at offer time via `validateOfferTerms(product, amount, term, frequency)` returning the matching bracket; downstream amortizer + document generator branch on the resolved bracket and the offer's chosen frequency |

---

## 3. Why brackets-on-the-bracket (not flat fields)

A flat `min_term / max_term` on the product would only let us enforce one
ceiling. David's stated examples — *"don't want $84-month on $1,000 loan;
don't want $50,000 loan capped at 12 months"* — require **term ceilings
that vary with principal**. Anchoring `permitted_terms[]` and `rate_band`
inside each amount bracket lets one product serve every loan size that
PaySpyre underwrites without cloning the product per band.

The same product can therefore be configured as:

| Bracket | Amount range | Term band(s) | Rate band |
| --- | --- | --- | --- |
| Small | $500 – $4,999.99 | 6 – 36 mo | 9.99 / 12.99 / 19.99 |
| Mid | $5,000 – $14,999.99 | 12 – 48 mo, 49 – 60 mo | 8.99 / 11.99 / 17.99 |
| Large | $15,000 – $50,000 | 24 – 84 mo | 7.99 / 10.49 / 15.99 |

…and any of `Weekly / BiWeekly / SemiMonthly / Monthly` is selectable
per offer because they all live on the parent `permitted_frequencies[]`.

---

## 4. Validation contract

`validateOfferTerms(product, amount, term_months, frequency)` is the
single entrypoint that originations, underwriting, and the amortizer use
to confirm an offer is legal. It returns either:

```ts
{ ok: true, bracket: AmountBracket }
```

or one of the structured rejection reasons:

| Reason | Meaning |
| --- | --- |
| `invalid_amount` | Amount is non-positive / non-finite |
| `invalid_term` | Term is non-positive / non-integer |
| `frequency_not_permitted` | Offer frequency not in `permitted_frequencies[]` |
| `amount_out_of_range` | No bracket contains the principal |
| `term_out_of_range` | Term doesn't fit any band in the matched bracket |

Field-level UI errors should map directly off `reason`.

---

## 5. SQL normalization

We chose three normalized tables (`credit_products`,
`credit_product_amount_brackets`, `credit_product_term_bands`) over a
jsonb blob on the parent because:

1. We need to query *across* brackets — e.g. "which products accept a
   $4,200 / 36-mo offer in BC". `WHERE`s on indexed `numeric` columns
   beat jsonb path predicates.
2. Foreign-key cascades give us free cleanup when a product is retired.
3. Reporting consistency (one of David's stated goals) is easier when
   bracket rows are first-class — analytics teams can `GROUP BY
   bracket_id` without unpacking jsonb.

Mock data in `lib/data/repository.ts` is allowed to keep brackets inline
on the TypeScript object (Zod-validated), which still maps 1:1 to the
SQL tables when we move to Supabase-backed reads.

---

## 6. Out of scope for PR #3.1

- Settings UI for editing products (lands in PR #4 — Loan Settings).
- Per-bracket disclosure templates (the data model supports it; the
  template registry will be wired in alongside Loan Settings).
- Approval-strategy bracketing (David called it out as a goal; we will
  attach a `decision_strategy_id` to `AmountBracket` once the Decision
  Engine spec is finalized in PR #4).
