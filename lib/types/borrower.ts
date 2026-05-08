import { z } from "zod";
import { PROVINCES } from "./enums";

/**
 * Borrower / Co-Borrower personal record.
 * Spec ref: docs/spec/admin-dashboard-spec.md → Customer Details, Co-Borrower tabs.
 */
export const BorrowerSchema = z.object({
  id: z.string().uuid().optional(),
  application_id: z.string().optional(),
  is_primary: z.boolean().default(true),
  // Personal
  first_name: z.string().min(1),
  middle_name: z.string().optional().nullable(),
  last_name: z.string().min(1),
  preferred_name: z.string().optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date
  sin_last4: z.string().regex(/^\d{4}$/).optional().nullable(),
  marital_status: z.enum(["Single", "Married", "Common-Law", "Divorced", "Widowed", "Other"]).optional(),
  // Contact
  email: z.string().email(),
  phone: z.string(),
  phone_alt: z.string().optional().nullable(),
  // Address
  address_line1: z.string(),
  address_line2: z.string().optional().nullable(),
  city: z.string(),
  province: z.enum(PROVINCES),
  postal_code: z.string(),
  country: z.string().default("CA"),
  residence_type: z.enum(["Own", "Rent", "Live with Parents", "Other"]).optional(),
  monthly_housing_cost: z.number().nonnegative().optional(),
  years_at_address: z.number().nonnegative().optional(),
  // Identification (non-PII surface — full IDs go to encrypted Document records)
  id_type: z.enum(["DriversLicence", "Passport", "ProvincialID", "PR_Card", "Other"]).optional(),
  id_number_last4: z.string().optional().nullable(),
  id_expiry: z.string().optional().nullable(),
  id_province: z.enum(PROVINCES).optional(),
  // Employment + Income
  employer_name: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  employment_type: z.enum(["FullTime", "PartTime", "SelfEmployed", "Contract", "Retired", "Unemployed", "Student", "Disability", "GovernmentBenefits"]).optional(),
  years_employed: z.number().nonnegative().optional(),
  gross_monthly_income: z.number().nonnegative().optional(),
  income_source: z.string().optional().nullable(),
  // Photo
  profile_photo_url: z.string().url().optional().nullable(),
  // Audit
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Borrower = z.infer<typeof BorrowerSchema>;
