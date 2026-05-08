import { z } from "zod";

/**
 * Loan ledger transaction — one row per posted event against a loan account.
 * Spec ref: Servicing → Transactions tab ("account ledger").
 *
 * Mirrors the legacy v1 dataset (7,761 rows) so historical activity survives
 * the migration. Type is open-ended (string) because the v1 set has many
 * mixed values; introduce an enum later once codes are normalised.
 */
export const LoanTransactionSchema = z.object({
  row_number: z.number().int(),
  transaction_number: z.number().int().optional(),
  vendor_code: z.string(),
  provider: z.string(),
  platform: z.string(),
  pd_code: z.string().optional(),
  override: z.boolean().default(false),
  sequence_in_account: z.number().int(),
  account_number: z.string(),
  rate: z.number(), // decimal form (0.0599 = 5.99%)
  days_in_year: z.literal(360),
  borrower_name: z.string(),
  date: z.string(),
  payment_amount: z.number(),
  fees_charged: z.number(),
  fees_paid: z.number(),
  fee_balance: z.number(),
  accrued_interest: z.number(),
  interest_due: z.number(),
  interest_paid: z.number(),
  interest_balance: z.number(),
  principal_paid: z.number(),
  principal_balance: z.number(),
  total_owed: z.number(),
  transaction_type: z.string(),
  vp_code: z.string().optional(),
  comments: z.string().optional(),
});
export type LoanTransaction = z.infer<typeof LoanTransactionSchema>;
