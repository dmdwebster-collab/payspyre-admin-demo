import { z } from "zod";

/**
 * Bank-related types: connected accounts (Flinks or manual), instant bank
 * verification reports, and the per-transaction line items that come out of
 * a Flinks pull. Spec ref: Originations → Bank Details + Bank Statements tabs.
 */

export const BankAccountSchema = z.object({
  id: z.string().uuid().optional(),
  application_id: z.string(),
  borrower_id: z.string().optional(),
  source: z.enum(["Flinks", "Manual"]),
  is_default: z.boolean().default(false),
  bank_name: z.string(),
  account_holder_name: z.string(),
  account_number_last4: z.string().regex(/^\d{4}$/),
  transit_number: z.string().regex(/^\d{5}$/),
  institution_number: z.string().regex(/^\d{3}$/),
  account_type: z.enum(["Chequing", "Savings", "Other"]),
  zum_payment_profile_id: z.string().optional().nullable(),
  created_at: z.string().datetime().optional(),
  removed_at: z.string().datetime().nullable().optional(),
});
export type BankAccount = z.infer<typeof BankAccountSchema>;

export const BankVerificationSchema = z.object({
  id: z.string().uuid().optional(),
  application_id: z.string(),
  borrower_id: z.string().optional(),
  requested_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
  status: z.enum(["Requested", "Completed", "Expired", "Cancelled", "Failed"]),
  depth_days: z.union([z.literal(90), z.literal(365)]),
  flinks_login_id: z.string().optional().nullable(),
  // Computed metrics from spec
  income_source: z.string().nullable().optional(),
  income_amount_monthly: z.number().nullable().optional(),
  min_balance_in_period: z.number().nullable().optional(),
  avg_monthly_free_cash_flow: z.number().nullable().optional(),
  days_with_negative_balance: z.number().int().nullable().optional(),
  balance_trend: z.enum(["Up", "Flat", "Down"]).nullable().optional(),
  nsf_count: z.number().int().nullable().optional(),
  stop_payment_count: z.number().int().nullable().optional(),
  micro_lender_names: z.array(z.string()).optional(),
  avg_monthly_expenditure: z.number().nullable().optional(),
  ability_to_pay_score: z.number().min(0).max(100).nullable().optional(),
  fraud_flags: z.array(z.string()).optional(),
});
export type BankVerification = z.infer<typeof BankVerificationSchema>;

export const BankTxCategorySchema = z.enum([
  "Income",
  "Expense-Discretionary",
  "Expense-NonDiscretionary",
  "Transfer",
  "DebtPayment",
  "Fee",
  "Other",
]);
export type BankTxCategory = z.infer<typeof BankTxCategorySchema>;

export const BankStatementTransactionSchema = z.object({
  id: z.string().uuid().optional(),
  verification_id: z.string(),
  date: z.string(),
  posted_at: z.string().datetime().optional(),
  balance: z.number(),
  debit: z.number(),
  credit: z.number(),
  description: z.string(),
  cpa_code: z.string().nullable().optional(),
  category: BankTxCategorySchema,
  category_source: z.enum(["CPA", "AI", "Manual"]).default("CPA"),
});
export type BankStatementTransaction = z.infer<typeof BankStatementTransactionSchema>;
