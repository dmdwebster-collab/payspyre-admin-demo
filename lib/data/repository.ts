/**
 * Repository — typed async data accessors backed by JSON fixtures during PR #1.
 * Same shape we'll use for the eventual Supabase client so swapping the
 * implementation doesn't ripple through call sites.
 *
 * Every method returns a Promise so the migration to a real DB is a no-op
 * at the call site.
 */

import loansJson from "./fixtures/loans.json";
import vendorsJson from "./fixtures/vendors.json";
import kpisJson from "./fixtures/kpis.json";
import applicationsJson from "./fixtures/applications.json";
import borrowersJson from "./fixtures/borrowers.json";
import applicationStatusEventsJson from "./fixtures/application_status_events.json";
import type { Loan } from "../types/loan";
import type { Vendor } from "../types/vendor";
import type { Application, ApplicationStatusEvent } from "../types/application";
import type { Borrower } from "../types/borrower";

// Cast JSON imports to typed arrays. The fixtures are derived from the
// legacy v1 dataset and conform to the schemas in lib/types/.
const LOANS = loansJson as unknown as Loan[];
const VENDORS = vendorsJson as unknown as Vendor[];
const APPLICATIONS = applicationsJson as unknown as Application[];
const BORROWERS = borrowersJson as unknown as Borrower[];
const APPLICATION_STATUS_EVENTS =
  applicationStatusEventsJson as unknown as ApplicationStatusEvent[];

export interface PortfolioKpis {
  summary: Record<string, number>;
  delinquency: Record<string, number>;
  losses: Record<string, number>;
  insolvency: Record<string, number>;
  distributions: {
    rate: Record<string, number>;
    term: Record<string, number>;
    org_type: Record<string, number>;
    status: Record<string, number>;
  };
  monthly_originations: Record<string, { count: number; amount: number }>;
  monthly_payments: Record<string, { count: number; amount: number }>;
  vendor_count: number;
  total_transactions: number;
}

const KPIS = kpisJson as unknown as PortfolioKpis;

export const repository = {
  async listLoans(): Promise<Loan[]> {
    return LOANS;
  },
  async getLoan(id: string): Promise<Loan | undefined> {
    return LOANS.find((l) => l.id === id || l.acct_num === id);
  },
  async listLoansByStatus(status: Loan["status"]): Promise<Loan[]> {
    return LOANS.filter((l) => l.status === status);
  },
  async listLoansByVendor(vendor_id: string): Promise<Loan[]> {
    return LOANS.filter((l) => l.vendor_id === vendor_id);
  },
  async listVendors(): Promise<Vendor[]> {
    return VENDORS;
  },
  async getVendor(id: string): Promise<Vendor | undefined> {
    return VENDORS.find((v) => v.id === id);
  },
  async getKpis(): Promise<PortfolioKpis> {
    return KPIS;
  },

  // -- Applications (Originations workplace, PR #2) ----------------------

  async listApplications(): Promise<Application[]> {
    return APPLICATIONS;
  },
  async getApplication(id: string): Promise<Application | undefined> {
    return APPLICATIONS.find((a) => a.id === id || a.application_number === id);
  },
  async listApplicationsByStatus(
    status: Application["status"],
  ): Promise<Application[]> {
    return APPLICATIONS.filter((a) => a.status === status);
  },
  async listApplicationsByVendor(vendor_id: string): Promise<Application[]> {
    return APPLICATIONS.filter((a) => a.vendor_id === vendor_id);
  },

  // -- Borrowers --------------------------------------------------------

  async getBorrower(id: string): Promise<Borrower | undefined> {
    return BORROWERS.find((b) => b.id === id);
  },
  async listBorrowers(): Promise<Borrower[]> {
    return BORROWERS;
  },
  async getBorrowersForApplication(
    application_id: string,
  ): Promise<{ primary?: Borrower; co?: Borrower }> {
    const app = APPLICATIONS.find((a) => a.id === application_id);
    if (!app) return {};
    return {
      primary: app.primary_borrower_id
        ? BORROWERS.find((b) => b.id === app.primary_borrower_id)
        : undefined,
      co: app.co_borrower_id
        ? BORROWERS.find((b) => b.id === app.co_borrower_id) ?? undefined
        : undefined,
    };
  },

  // -- Status events (Workflow tab) -------------------------------------

  async listEventsForApplication(
    application_id: string,
  ): Promise<ApplicationStatusEvent[]> {
    return APPLICATION_STATUS_EVENTS.filter(
      (e) => e.application_id === application_id,
    ).sort((a, b) =>
      a.occurred_at < b.occurred_at ? 1 : -1,
    );
  },
};
