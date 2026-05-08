import { z } from "zod";
import {
  PROVINCES,
  LOAN_STATUSES,
  RISK_TIERS,
  PAYMENT_FREQUENCIES,
  ORG_TYPES,
  CLOSE_TYPES,
} from "./enums";

/**
 * Loan record. Mirrors the legacy v1 dataset 1:1 so the existing 424-loan
 * portfolio survives the migration intact. Extend cautiously — add columns,
 * never repurpose existing fields.
 *
 * Day-count: 360-day year (DSI). All amounts are CAD.
 */
export const LoanSchema = z.object({
  id: z.string(), // e.g. "PS-100103"
  acct_num: z.string(),
  borrower: z.string(), // "Last, First" display string from v1
  co_borrower: z.string().nullable(),
  vendor_id: z.string(),
  vendor_name: z.string(),
  provider: z.string(),
  province: z.enum(PROVINCES),

  // Origination amounts
  sales_value: z.number(),
  insurance: z.number(),
  downpayment: z.number(),
  amount_financed: z.number(),
  new_advance: z.number(),

  // Terms
  term: z.number().int().positive(), // months
  rate: z.number(), // annual interest rate, % (e.g. 5.99)
  regular_payment: z.number(),
  payment_frequency: z.enum(PAYMENT_FREQUENCIES),
  cost_of_borrowing: z.number(),

  // Dates
  origination_date: z.string(),
  org_type: z.enum(ORG_TYPES),
  first_pmt_date: z.string(),
  final_pmt_date: z.string(),
  diny: z.literal(360), // days in year — locked at 360 for DSI
  platform: z.string(),

  // Status
  status: z.enum(LOAN_STATUSES),
  sub_status: z.string(),
  dpd: z.number().int(), // current days past due
  risk_tier: z.enum(RISK_TIERS),

  // Balances
  fees_balance: z.number(),
  interest_balance: z.number(),
  principal_balance: z.number(),
  total_owed: z.number(),

  // Lifetime totals (paid)
  total_payments: z.number(),
  total_fees_paid: z.number(),
  total_interest_paid: z.number(),
  total_principal_paid: z.number(),
  pmt_count: z.number().int().nonnegative(),
  total_tx_count: z.number().int().nonnegative(),

  // Realized to PaySpyre (after vendor share)
  payments_realized: z.number(),
  fees_realized: z.number(),
  interest_realized: z.number(),
  principal_realized: z.number(),

  // Schedule pointers
  next_due_date: z.string().nullable(),
  last_payment: z.string().nullable(),
  last_tx_type: z.string().nullable(),

  // Closure
  close_date: z.string().nullable(),
  close_type: z.union([z.enum(CLOSE_TYPES), z.literal("")]).nullable(),
  new_acct_num: z.string().nullable(),
  renewal_payout: z.number(),
  principal_renewal: z.number(),
  interest_renewal: z.number(),
  fees_renewal: z.number(),

  // Adjustments / write-offs / transfers
  adjust_principal: z.number(),
  adjust_interest: z.number(),
  adjust_fees: z.number(),
  writeoff_principal: z.number(),
  writeoff_interest: z.number(),
  writeoff_fees: z.number(),
  writeoff_small_balance: z.number(),
  transfer_principal: z.number(),
  transfer_interest: z.number(),
  transfer_fees: z.number(),

  // Risk / performance
  nsf_count: z.number().int().nonnegative(),
  deferment_count: z.number().int().nonnegative(),
  est_principal_loss: z.number(),
  est_future_interest: z.number(),
  insolvent_date: z.string().nullable(),
  insolvent_amt: z.number(),
  insolvent_type: z.string(),

  // Vendor share splits (per-loan overrides)
  ven_share_fees: z.number(),
  ven_share_interest: z.number(),
  ven_share_principal: z.number(),
});
export type Loan = z.infer<typeof LoanSchema>;
