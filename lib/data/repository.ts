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
import type { Loan } from "../types/loan";
import type { Vendor } from "../types/vendor";

// Cast JSON imports to typed arrays. The fixtures are derived from the
// legacy v1 dataset and conform to the schemas in lib/types/.
const LOANS = loansJson as unknown as Loan[];
const VENDORS = vendorsJson as unknown as Vendor[];

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
};
