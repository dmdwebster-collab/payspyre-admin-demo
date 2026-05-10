import { z } from "zod";
import { PROVINCES, VENDOR_ONBOARDING_STATUSES } from "./enums";

/**
 * Vendor = a clinic / business that originates loans through PaySpyre.
 * Provider = an individual provider (dentist, hygienist) within a Vendor.
 *
 * Spec ref: Loan Header has Vendor Name + Provider/Location Name.
 */
export const VendorSchema = z.object({
  id: z.string(), // e.g. "BC4906"
  name: z.string(),
  province: z.enum(PROVINCES),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"]),

  // Onboarding lifecycle (mirrors VendorOnboardingStatus enum). Set when the
  // vendor is created via the onboarding flow; legacy / imported vendors may
  // leave this null.
  onboarding_status: z.enum(VENDOR_ONBOARDING_STATUSES).nullable().optional(),

  // KYB / KYC freshness (per David's PR #1.2 input — same reuse model as the
  // borrower side). Provider is whichever KYC vendor we wire up (Trulioo /
  // Persona); kyb_reference is the third-party transaction id for audit.
  kyb_provider: z.string().nullable().optional(),
  kyb_reference: z.string().nullable().optional(),
  kyb_completed_at: z.string().datetime().nullable().optional(),
  kyb_validity_days: z.number().int().positive().default(365),

  // Banking verification (Flinks Capital business account).
  banking_verified_at: z.string().datetime().nullable().optional(),
  banking_validity_days: z.number().int().positive().default(90),

  // MSA execution.
  msa_template_version: z.string().nullable().optional(),
  msa_envelope_id: z.string().nullable().optional(), // SignNow envelope id
  msa_signed_at: z.string().datetime().nullable().optional(),

  // Lifecycle timestamps.
  applied_at: z.string().datetime().nullable().optional(),
  live_at: z.string().datetime().nullable().optional(),
  address: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  start_date: z.string().optional(),
  first_invoice_date: z.string().optional().nullable(),
  providers: z.array(z.string()),
  // Commercial terms (vendor-level defaults; can be overridden per loan)
  cost_per_open_account: z.number().nonnegative().default(0),
  interest_share: z.number().min(0).max(1).default(0.5),
  zero_pct_payment_share: z.number().min(0).max(1).default(0),
  fees_share: z.number().min(0).max(1).default(1),
  tax_rate: z.number().min(0).max(1).default(0.05),
  // Portfolio metrics (denormalised — recomputed nightly)
  total_accounts: z.number().int().nonnegative().default(0),
  open_accounts: z.number().int().nonnegative().default(0),
  closed_accounts: z.number().int().nonnegative().default(0),
  total_financed: z.number().nonnegative().default(0),
  total_balance: z.number().nonnegative().default(0),
  total_collected: z.number().nonnegative().default(0),
  total_interest_collected: z.number().nonnegative().default(0),
  total_principal_collected: z.number().nonnegative().default(0),
  total_realized: z.number().default(0),
  total_interest_realized: z.number().default(0),
  total_writeoffs: z.number().nonnegative().default(0),
  delinquent_count: z.number().int().nonnegative().default(0),
  nsf_total: z.number().int().nonnegative().default(0),
  invoices_count: z.number().int().nonnegative().default(0),
  invoiced_total: z.number().nonnegative().default(0),
});
export type Vendor = z.infer<typeof VendorSchema>;
