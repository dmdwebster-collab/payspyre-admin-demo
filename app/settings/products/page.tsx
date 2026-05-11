import Link from "next/link";
import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StubBanner } from "@/components/ui/stub-banner";
import { formatCAD } from "@/lib/utils";

/**
 * Loan Settings — credit-product viewer (PR #4.5).
 *
 * Read-only view of every active credit product, surfacing the bracket
 * model from PR #3.1 in real UI for the first time. Product cards
 * expand to show every amount bracket, the term bands per bracket, and
 * the rate band per bracket.
 *
 * The editor (create / edit / activate / deactivate) lands in PR #4.5.x.
 * This PR establishes the read shape so the editor only needs to add
 * mutation surface, not re-design the display.
 */
export default async function LoanSettingsProductsPage() {
  const products = await repository.listCreditProducts();

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <Link
          href="/settings"
          className="text-[11px] text-ink-mute tracking-wider uppercase hover:text-gold-dim"
        >
          ← Back to Settings
        </Link>
        <h1 className="text-2xl font-semibold text-ink mt-2">
          Loan Settings · Credit products
        </h1>
        <p className="text-ink-dim text-sm mt-1 max-w-3xl">
          Global standardized catalog. Per David Wilson&apos;s direction
          (PR #3.1), each product is one configurable framework supporting
          multiple payment frequencies + bracketed amount/term/rate bands —
          replacing TurnKey&apos;s pattern of cloning a product per cadence
          or per term ceiling.
        </p>
      </header>

      {products.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No credit products configured.
          </CardContent>
        </Card>
      ) : (
        products.map((product) => (
          <Card key={product.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-6">
              <div>
                <CardTitle>
                  <span className="font-mono text-gold mr-2">{product.code}</span>
                  {product.name}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Provinces: {product.provinces.join(", ")} · Last updated:{" "}
                  {new Date(product.updated_at).toLocaleDateString("en-CA", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={product.active ? "active" : "muted"}>
                  {product.active ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="border-b">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                    Permitted frequencies
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-1">
                    {product.permitted_frequencies.map((f) => (
                      <Badge key={f} variant="muted">
                        {f}
                      </Badge>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                    Origination fee
                  </dt>
                  <dd className="mt-2 text-sm font-mono">
                    {product.origination_fee_pct.toFixed(2)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                    Required checks
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-1">
                    {product.requires_credit_bureau && (
                      <Badge variant="active">Bureau</Badge>
                    )}
                    {product.requires_bank_verification && (
                      <Badge variant="active">Bank</Badge>
                    )}
                    {!product.requires_credit_bureau &&
                      !product.requires_bank_verification && (
                        <span className="text-xs text-muted-foreground">
                          (none required)
                        </span>
                      )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground tracking-wider uppercase">
                    Validity windows
                  </dt>
                  <dd className="mt-2 text-xs space-y-0.5">
                    <div>
                      Bureau:{" "}
                      <span className="font-mono">
                        {product.credit_report_validity_days}d
                      </span>
                    </div>
                    <div>
                      Bank:{" "}
                      <span className="font-mono">
                        {product.bank_verification_validity_days}d
                      </span>
                    </div>
                    {product.post_booking_credit_repull_days != null && (
                      <div>
                        Post-booking bureau re-pull:{" "}
                        <span className="font-mono">
                          {product.post_booking_credit_repull_days}d
                        </span>
                      </div>
                    )}
                    {product.post_booking_bank_repull_days != null && (
                      <div>
                        Post-booking bank re-pull:{" "}
                        <span className="font-mono">
                          {product.post_booking_bank_repull_days}d
                        </span>
                      </div>
                    )}
                  </dd>
                </div>
              </div>
            </CardContent>

            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Bracket</th>
                    <th className="px-4 py-2 font-medium">Principal</th>
                    <th className="px-4 py-2 font-medium">Term bands</th>
                    <th className="px-4 py-2 font-medium">Rate band (APR)</th>
                  </tr>
                </thead>
                <tbody>
                  {product.amount_brackets.map((bracket) => (
                    <tr key={bracket.id} className="border-b last:border-b-0 align-top">
                      <td className="px-4 py-3 font-mono text-xs">{bracket.id}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatCAD(bracket.min_amount)} –{" "}
                        {formatCAD(bracket.max_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-1">
                          {bracket.permitted_terms.map((band, i) => (
                            <li key={i} className="font-mono text-xs">
                              {band.min_term_months}–{band.max_term_months} mo
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <div>
                          min{" "}
                          <span className="text-foreground">
                            {bracket.rate_band.min_rate.toFixed(2)}%
                          </span>
                          {" · default "}
                          <span className="text-foreground font-semibold">
                            {bracket.rate_band.default_rate.toFixed(2)}%
                          </span>
                          {" · max "}
                          <span className="text-foreground">
                            {bracket.rate_band.max_rate.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}

      <StubBanner
        pr="PR #4.5"
        description="Editor (create / edit / activate / deactivate). Re-uses validateOfferTerms() to live-check that brackets stay non-overlapping and that every term band is consistent with its bracket. Per-bracket disclosure / document templates land alongside (deferred from PR #3.1, see docs/spec/credit-product-architecture.md §6)."
        fields={[
          "New product wizard (code / name / provinces / frequencies)",
          "Bracket editor (add / remove / reorder principal ranges)",
          "Per-bracket term-band editor (multiple bands)",
          "Per-bracket rate band (min / default / max APR)",
          "Validity-window controls + post-booking re-pull cadence",
          "Activate / deactivate (Server Action with audit trail)",
          "Per-bracket disclosure template attachments (deferred)",
        ]}
      />
    </div>
  );
}
