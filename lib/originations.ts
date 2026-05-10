/**
 * Originations workplace helpers — keeps presentation logic that's shared
 * across the worklist and individual Loan Header tabs in one place.
 */

import type { Application } from "./types/application";
import type { ApplicationStatus } from "./types/enums";

/**
 * Funnel order for sorting the worklist and rendering the funnel KPI
 * strip. Terminal statuses sit at the end.
 */
export const FUNNEL_ORDER: ApplicationStatus[] = [
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
];

/**
 * Short labels rendered in the worklist status column. Uppercase /
 * keyboard-friendly so the worklist scans quickly.
 */
export const STATUS_SHORT_LABEL: Record<ApplicationStatus, string> = {
  PRE_ORIGINATION: "PRE-ORIG",
  ORIGINATION: "ORIG",
  CREDIT_REPORT: "CR",
  BANK_VERIFICATION: "BV",
  APPLICATION_VERIFICATION: "AV",
  CREDIT_UNDERWRITING: "UW",
  OFFER_ACCEPTANCE: "OFR",
  AGREEMENT_SIGNATURE: "SIGN",
  APPROVED: "APPR",
  ACTIVE: "ACTIVE",
  REJECTED: "REJ",
  CANCELLED: "CANC",
  CLOSED: "CLSD",
};

export const STATUS_FULL_LABEL: Record<ApplicationStatus, string> = {
  PRE_ORIGINATION: "Pre-origination",
  ORIGINATION: "Origination",
  CREDIT_REPORT: "Credit Report",
  BANK_VERIFICATION: "Bank Verification",
  APPLICATION_VERIFICATION: "Application Verification",
  CREDIT_UNDERWRITING: "Credit Underwriting",
  OFFER_ACCEPTANCE: "Offer Acceptance",
  AGREEMENT_SIGNATURE: "Agreement Signature",
  APPROVED: "Approved",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  CLOSED: "Closed",
};

/**
 * Mapping from ApplicationStatus to the existing Badge variants in
 * components/ui/badge.tsx. Keeps the worklist visually consistent with
 * the Accounts page.
 */
export function applicationStatusVariant(
  status: ApplicationStatus,
):
  | "default"
  | "active"
  | "paid"
  | "renewed"
  | "writeoff"
  | "transfer"
  | "voided"
  | "muted" {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
      return "active";
    case "REJECTED":
      return "writeoff";
    case "CANCELLED":
    case "CLOSED":
      return "voided";
    case "OFFER_ACCEPTANCE":
    case "AGREEMENT_SIGNATURE":
      return "renewed";
    case "CREDIT_UNDERWRITING":
    case "APPLICATION_VERIFICATION":
      return "transfer";
    case "PRE_ORIGINATION":
      return "muted";
    default:
      return "default";
  }
}

/** Whole-day age between application creation and `now`. */
export function applicationAgeDays(app: Application, now: Date = new Date()): number {
  const created = new Date(app.created_at).getTime();
  return Math.max(0, Math.floor((now.getTime() - created) / (1000 * 60 * 60 * 24)));
}

/** Funnel buckets used by the KPI strip on the worklist. */
export interface FunnelBucket {
  status: ApplicationStatus;
  short_label: string;
  full_label: string;
  count: number;
}

export function buildFunnelBuckets(applications: Application[]): FunnelBucket[] {
  return FUNNEL_ORDER.filter(
    // ACTIVE / CLOSED don't live in Originations \u2014 they're in Servicing.
    (s) => s !== "ACTIVE" && s !== "CLOSED",
  ).map((status) => ({
    status,
    short_label: STATUS_SHORT_LABEL[status],
    full_label: STATUS_FULL_LABEL[status],
    count: applications.filter((a) => a.status === status).length,
  }));
}

/** Worklist filters surfaced in the Originations top bar. */
export interface WorklistFilters {
  status?: ApplicationStatus;
  vendor_id?: string;
  province?: "BC" | "AB";
  q?: string; // free-text — matches application_number, borrower id, vendor name
}

/**
 * Apply worklist filters in-memory. Mirrors what the eventual Supabase
 * query will look like (status / vendor / province as indexed columns,\n * q as a wide ILIKE across denormalized columns).\n */
export function filterApplications(
  applications: Application[],
  filters: WorklistFilters,
): Application[] {
  const q = filters.q?.toLowerCase().trim();
  return applications.filter((a) => {
    if (filters.status && a.status !== filters.status) return false;
    if (filters.vendor_id && a.vendor_id !== filters.vendor_id) return false;
    if (filters.province && a.province !== filters.province) return false;
    if (q) {
      const hay = `${a.application_number} ${a.vendor_name} ${a.primary_borrower_id ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Tabs rendered on the Loan Header. Keep order stable so URLs are predictable. */
export const ORIGINATION_TABS = [
  { slug: "summary", label: "Summary" },
  { slug: "customer-details", label: "Customer Details" },
  { slug: "co-borrower", label: "Co-Borrower" },
  { slug: "bank-details", label: "Bank Details" },
  { slug: "initial-schedule", label: "Initial Schedule" },
  { slug: "workflow", label: "Workflow" },
  { slug: "contacts", label: "Contacts" },
  { slug: "documents", label: "Documents" },
  { slug: "bank-statements", label: "Bank Statements" },
  { slug: "comments", label: "Comments" },
] as const;

export type OriginationTabSlug = (typeof ORIGINATION_TABS)[number]["slug"];
