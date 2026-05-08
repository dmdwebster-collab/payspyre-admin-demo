import { z } from "zod";

/**
 * Document attached to a loan / application. Spec ref: Documents tab.
 */
export const DocumentSchema = z.object({
  id: z.string().uuid().optional(),
  application_id: z.string().optional(),
  loan_id: z.string().optional(),
  borrower_id: z.string().optional(),
  type: z.enum([
    "LoanAgreement",
    "TermsAndConditions",
    "PrivacyPolicy",
    "DemandLetter",
    "ID-Front",
    "ID-Back",
    "ProfilePhoto",
    "NoticeOfAssessment",
    "Paystub",
    "BankStatement",
    "Other",
  ]),
  filename: z.string(),
  storage_url: z.string(), // Supabase Storage path (encrypted at rest)
  uploaded_by: z.string(),
  uploaded_at: z.string().datetime(),
  size_bytes: z.number().int().nonnegative(),
  mime_type: z.string(),
  signed: z.boolean().default(false),
  signed_at: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Document = z.infer<typeof DocumentSchema>;
