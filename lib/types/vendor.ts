import { z } from "zod";
import { PROVINCES } from "./enums";

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
