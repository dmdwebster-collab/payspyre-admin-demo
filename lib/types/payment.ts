import { z } from "zod";

/**
 * Payment — a discrete inbound funds event against a loan account.
 *
 * Distinct from `LoanTransaction` (the ledger row) because a single Payment
 * can post to multiple ledger lines (fees → interest → principal waterfall),
 * and because Payments live through their own SCHEDULED → PROCESSING → POSTED
 * lifecycle before any ledger postings exist.
 *
 * The cutover from TurnKey relies on this entity matching what Zum Rails
 * returns on PAD/EFT callbacks, so the field set deliberately mirrors the
 * Zum Rails payment object: external_ref + zum_payment_id are kept nullable
 * so manual / cheque / cash payments still fit the schema.
 */

export const PAYMENT_METHODS = [
  "EFT", // Zum Rails ACH/EFT debit
  "PAD", // Pre-Authorized Debit (Canadian PAD-007 form)
  "WIRE",
  "CHEQUE",
  "CASH",
  "CARD",
  "INTERNAL_TRANSFER", // Adjustments / re-allocations between PaySpyre accounts
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_SOURCES = [
  "BORROWER", // Default — debit from borrower's bank account
  "COLLECTIONS", // Recovery payment via collections workflow
  "INSURANCE", // Walnut creditor insurance payout
  "VENDOR", // Vendor-side adjustment (rare — chargeback, refund)
  "INTERNAL", // PaySpyre adjustment / write-off offset
] as const;
export type PaymentSource = (typeof PAYMENT_SOURCES)[number];

export const PAYMENT_STATUSES = [
  "SCHEDULED", // Created but not yet sent to processor
  "PROCESSING", // Submitted to Zum / bank, awaiting confirmation
  "POSTED", // Funds settled — ledger entries written
  "RETURNED", // Bank returned the funds (NSF, stop, account closed)
  "FAILED", // Never made it to the bank (bad account, hold, validation)
  "REVERSED", // Posted then reversed by an adjustment
  "CANCELLED", // Operator cancelled before processing
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PaymentSchema = z.object({
  id: z.string(), // uuid
  loan_id: z.string(), // → loans(id)
  bank_account_id: z.string().nullable().optional(),
  scheduled_for: z.string().nullable(), // ISO YYYY-MM-DD — when the debit is expected
  posted_at: z.string().datetime().nullable(), // when funds settled (POSTED → set)
  amount: z.number().positive(), // CAD, gross debit
  method: z.enum(PAYMENT_METHODS),
  source: z.enum(PAYMENT_SOURCES),
  status: z.enum(PAYMENT_STATUSES),
  external_ref: z.string().nullable().optional(),
  zum_payment_id: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Payment = z.infer<typeof PaymentSchema>;
