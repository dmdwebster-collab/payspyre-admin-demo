import { z } from "zod";
import { PROVINCES, VENDOR_ONBOARDING_STATUSES } from "./enums";

/**
 * Vendor Application — captures the data on the current paper
 * Vendor-Application form (sections 1.0 General, 2.0 Directors & Officers,
 * 3.0 Business Reps, 4.0 Banking) and drives the vendor onboarding state
 * machine in lib/vendor-onboarding-flow.ts.
 *
 * Source: docs/spec/vendor/vendor-application-form.pdf and
 * docs/spec/vendor/onboarding-redesign.md.
 */

// 1.0 — General Information
export const VendorBusinessInfoSchema = z.object({
  corporate_name: z.string().min(1),
  trade_name: z.string().nullable().optional(),
  province_of_incorporation: z.enum(PROVINCES),
  business_registration_number: z.string().min(1),
  gst_hst_registration_number: z.string().nullable().optional(),
  nature_of_principal_business: z.string().min(1),
  street_address: z.string().min(1),
  city: z.string().min(1),
  province: z.enum(PROVINCES),
  postal_code: z.string().min(1),
  phone_landline: z.string().nullable().optional(),
  phone_cell: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  email: z.string().email(),
  website_url: z.string().url().nullable().optional(),
});
export type VendorBusinessInfo = z.infer<typeof VendorBusinessInfoSchema>;

// 3.0 — Business Representative (auth'd to process applications)
export const VendorRepresentativeSchema = z.object({
  full_name: z.string().min(1),
  position: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
});
export type VendorRepresentative = z.infer<typeof VendorRepresentativeSchema>;

// 4.0 — Banking Information (used for Flinks business-account verification
// and Zum Rails payment-profile creation)
export const VendorBankingInfoSchema = z.object({
  institution_name: z.string().min(1),
  institution_number: z.string().min(1),
  transit_number: z.string().min(1),
  account_number: z.string().min(1), // masked in UI except for users with bank.reveal
  street_address: z.string().min(1),
  city: z.string().min(1),
  province: z.enum(PROVINCES),
  postal_code: z.string().min(1),
  contact_at_institution: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  years_with_institution: z.number().int().nonnegative().nullable().optional(),
  source: z.enum(["MANUAL", "FLINKS"]).default("MANUAL"),
  flinks_request_id: z.string().nullable().optional(),
});
export type VendorBankingInfo = z.infer<typeof VendorBankingInfoSchema>;

// Aggregate Vendor Application
export const VendorApplicationSchema = z.object({
  id: z.string(), // e.g. "VAPP-2026-00042"
  vendor_id: z.string().nullable().optional(), // populated once provisioned
  status: z.enum(VENDOR_ONBOARDING_STATUSES),

  business: VendorBusinessInfoSchema,
  primary_representative: VendorRepresentativeSchema,
  secondary_representative: VendorRepresentativeSchema.nullable().optional(),
  banking: VendorBankingInfoSchema.nullable().optional(),

  // Required-document checklist (matches page 1 of the current form).
  documents: z.object({
    business_license_uploaded: z.boolean().default(false),
    certificate_of_incorporation_uploaded: z.boolean().default(false),
    notice_of_articles_uploaded: z.boolean().default(false),
    signing_authority_resolution_uploaded: z.boolean().default(false), // when signatory is not a director
    photo_id_front_uploaded: z.boolean().default(false),
    photo_id_back_uploaded: z.boolean().default(false),
    pad_or_void_cheque_uploaded: z.boolean().default(false),
  }),

  // Authorized signatory (executes the MSA on behalf of the vendor)
  authorized_signatory_name: z.string().nullable().optional(),
  signed_at: z.string().datetime().nullable().optional(),

  // Audit
  created_at: z.string().datetime(),
  submitted_at: z.string().datetime().nullable().optional(),
  decided_at: z.string().datetime().nullable().optional(),
});
export type VendorApplication = z.infer<typeof VendorApplicationSchema>;

/**
 * Append-only audit log for vendor onboarding state transitions.
 * Same shape as ApplicationStatusEvent on the borrower side.
 */
export const VendorOnboardingEventSchema = z.object({
  id: z.string().uuid().optional(),
  vendor_application_id: z.string(),
  from_status: z.enum(VENDOR_ONBOARDING_STATUSES).nullable(),
  to_status: z.enum(VENDOR_ONBOARDING_STATUSES),
  action: z.string(),
  actor_id: z.string(),
  actor_name: z.string(),
  comments: z.string().optional(),
  occurred_at: z.string().datetime(),
});
export type VendorOnboardingEvent = z.infer<typeof VendorOnboardingEventSchema>;
