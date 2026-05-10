/**
 * Shared enums for the PaySpyre Admin platform.
 *
 * These are stringly-typed unions (not TS `enum`) so they serialize cleanly
 * to and from JSON / Postgres / Zod. Add string literal types only — never
 * change a value once it's persisted; add a new one and migrate.
 */

export const APPLICATION_STATUSES = [
  "PRE_ORIGINATION",
  "ORIGINATION",
  "CREDIT_REPORT",
  "BANK_VERIFICATION",
  "APPLICATION_VERIFICATION",
  "CREDIT_UNDERWRITING",
  "OFFER_ACCEPTANCE",
  "AGREEMENT_SIGNATURE",
  "APPROVED",
  "ACTIVE",
  "REJECTED",
  "CANCELLED",
  "CLOSED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const LOAN_STATUSES = [
  "ACTIVE",
  "PAID_OFF",
  "RENEWED",
  "REFINANCED",
  "TRANSFERRED",
  "WRITTEN_OFF",
  "SETTLED",
  "VOIDED",
] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const RISK_TIERS = ["EXCELLENT", "GOOD", "AVERAGE", "WEAK", "POOR"] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export const PROVINCES = ["BC", "AB"] as const;
export type Province = (typeof PROVINCES)[number];

export const PAYMENT_FREQUENCIES = [
  "Weekly",
  "BiWeekly",
  "SemiMonthly",
  "Monthly",
] as const;
export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];

export const ORG_TYPES = [
  "LOAN-NEW",
  "RENEWAL",
  "REFINANCE",
  "TRANSFER-IN",
] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const CLOSE_TYPES = [
  "PdOUT-AUTOPAY",
  "PdOUT-MANUAL",
  "RENEWED",
  "REFINANCED",
  "TRANSFERRED",
  "SETTLEMENT",
  "WRITE-OFF",
  "VOIDED",
] as const;
export type CloseType = (typeof CLOSE_TYPES)[number];

export const CONTACT_METHODS = ["Phone", "Email", "SMS", "Dashboard", "Mail"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const USER_ROLES = [
  "admin", // PaySpyre staff — cross-vendor access
  "underwriter",
  "servicing",
  "collections",
  "vendor_admin", // Vendor-scoped admin (e.g. clinic owner)
  "vendor_user", // Vendor staff with limited access
] as const;
export type UserRole = (typeof USER_ROLES)[number];
