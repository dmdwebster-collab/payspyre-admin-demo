import { z } from "zod";

/**
 * VendorDirector — director / officer of a vendor entity. Required for
 * KYB / KYC checks (Trulioo and Persona both require beneficial-owner
 * personal info to run the business-verification call).
 *
 * Source: section 2.0 of docs/spec/vendor/vendor-application-form.pdf,
 * extended with the personal info Trulioo / Persona need to run KYC.
 *
 * PII handling: this table holds personal information of identified
 * individuals \u2014 PIPEDA + provincial privacy law applies. RLS policies
 * (PR #2) must restrict access to admin + KYB-reviewer roles only.
 */
export const VendorDirectorSchema = z.object({
  id: z.string().uuid().optional(),
  vendor_application_id: z.string(),
  vendor_id: z.string().nullable().optional(), // populated post-provisioning

  // From the current paper form (section 2.0)
  full_legal_name: z.string().min(1),
  position_title: z.string().min(1),

  // Additional fields needed for KYC pull (not on current paper form;
  // collected during the new digital flow).
  date_of_birth: z.string().nullable().optional(), // ISO date
  street_address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),

  // Beneficial-ownership tracking (FINTRAC requirement for MSBs;
  // captured even if PaySpyre is not currently registered as one).
  is_beneficial_owner: z.boolean().default(false),
  ownership_percent: z.number().min(0).max(100).nullable().optional(),
  is_authorized_signatory: z.boolean().default(false),

  // KYC outcome from the chosen provider (Trulioo / Persona).
  kyc_provider: z.string().nullable().optional(),
  kyc_reference: z.string().nullable().optional(),
  kyc_result: z
    .enum(["PASS", "REVIEW", "FAIL", "PENDING"])
    .nullable()
    .optional(),
  kyc_completed_at: z.string().datetime().nullable().optional(),

  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type VendorDirector = z.infer<typeof VendorDirectorSchema>;
