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
import paymentSchedulesJson from "./fixtures/payment_schedules.json";
import paymentScheduleEntriesJson from "./fixtures/payment_schedule_entries.json";
import paymentsJson from "./fixtures/payments.json";
import nsfEventsJson from "./fixtures/nsf_events.json";
import creditProductsJson from "./fixtures/credit_products.json";
import migrationRunsJson from "./fixtures/migration_runs.json";
import cutoverItemsJson from "./fixtures/cutover_items.json";
import uwNotesJson from "./fixtures/uw_notes.json";
import type { Loan } from "../types/loan";
import type { Vendor } from "../types/vendor";
import type { Application, ApplicationStatusEvent } from "../types/application";
import type { Borrower } from "../types/borrower";
import type {
  PaymentSchedule,
  PaymentScheduleEntry,
} from "../types/payment-schedule";
import type { Payment } from "../types/payment";
import type { NSFEvent } from "../types/nsf-event";
import type { CreditProduct } from "../types/credit-product";
import type { MigrationRun } from "../types/migration-run";
import type { CutoverItem } from "../types/cutover";
import type { UWNote } from "../types/uw-note";

// Cast JSON imports to typed arrays. The fixtures are derived from the
// legacy v1 dataset and conform to the schemas in lib/types/.
const LOANS = loansJson as unknown as Loan[];
const VENDORS = vendorsJson as unknown as Vendor[];
const APPLICATIONS = applicationsJson as unknown as Application[];
const BORROWERS = borrowersJson as unknown as Borrower[];
const APPLICATION_STATUS_EVENTS =
  applicationStatusEventsJson as unknown as ApplicationStatusEvent[];

// PR #4.1 — Servicing data model. Fixtures use a synthetic loan_id
// (PS-SAMPLE-001) so the demonstrated schedule / payment / NSF flow is
// internally consistent without conflicting with the legacy v1 loan
// portfolio (every v1 loan is in a terminal state). Real schedules will
// land via the TurnKey export adapter (PR #4.2).
const PAYMENT_SCHEDULES = paymentSchedulesJson as unknown as PaymentSchedule[];
const PAYMENT_SCHEDULE_ENTRIES =
  paymentScheduleEntriesJson as unknown as PaymentScheduleEntry[];
const PAYMENTS = paymentsJson as unknown as Payment[];
const NSF_EVENTS = nsfEventsJson as unknown as NSFEvent[];

// PR #4.5 — Credit products fixture. Single launch product (Dental Patient
// Financing) configured with the bracket model from PR #3.1.
const CREDIT_PRODUCTS = creditProductsJson as unknown as CreditProduct[];

// PR #4.6.1 — Migration runs. Persisted history of runMigration() calls,
// extended in-memory by the "Run migration now" Server Action.
const MIGRATION_RUNS = migrationRunsJson as unknown as MigrationRun[];

// PR #4.7 — Integration cutover checklist. Predefined items per provider;
// operators tick them off via Server Actions on /cutover.
const CUTOVER_ITEMS = cutoverItemsJson as unknown as CutoverItem[];

// PR #4.5.2 — Underwriting notes. Append-only log per application,
// extended in-memory by addUWNote.
const UW_NOTES = uwNotesJson as unknown as UWNote[];

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

  // -- Servicing data model (PR #4.1) -----------------------------------

  async listPaymentSchedules(): Promise<PaymentSchedule[]> {
    return PAYMENT_SCHEDULES;
  },
  async getActiveScheduleForLoan(
    loan_id: string,
  ): Promise<PaymentSchedule | undefined> {
    return PAYMENT_SCHEDULES.find((s) => s.loan_id === loan_id && s.active);
  },
  async listEntriesForSchedule(
    schedule_id: string,
  ): Promise<PaymentScheduleEntry[]> {
    return PAYMENT_SCHEDULE_ENTRIES.filter(
      (e) => e.schedule_id === schedule_id,
    ).sort((a, b) => a.period - b.period);
  },
  async listPaymentsForLoan(loan_id: string): Promise<Payment[]> {
    return PAYMENTS.filter((p) => p.loan_id === loan_id).sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1,
    );
  },
  async listNSFEventsForLoan(loan_id: string): Promise<NSFEvent[]> {
    return NSF_EVENTS.filter((n) => n.loan_id === loan_id).sort((a, b) =>
      a.occurred_at < b.occurred_at ? 1 : -1,
    );
  },
  async listUnresolvedNSFEvents(): Promise<NSFEvent[]> {
    return NSF_EVENTS.filter((n) => n.resolved_at === null).sort((a, b) =>
      a.occurred_at < b.occurred_at ? 1 : -1,
    );
  },
  async getNSFEvent(id: string): Promise<NSFEvent | undefined> {
    return NSF_EVENTS.find((n) => n.id === id);
  },
  async getPayment(id: string): Promise<Payment | undefined> {
    return PAYMENTS.find((p) => p.id === id);
  },

  // -- Mock-data mutators (PR #4.4.2) -----------------------------------
  // Mutate the in-memory arrays so Server Actions feel real in the demo.
  // Production replaces these with a Supabase upsert. Persistence across
  // reloads is intentional within the Node process lifetime; a server
  // restart resets to the JSON fixtures.

  async updateNSFEvent(
    id: string,
    patch: Partial<NSFEvent>,
  ): Promise<NSFEvent | undefined> {
    const idx = NSF_EVENTS.findIndex((n) => n.id === id);
    if (idx < 0) return undefined;
    NSF_EVENTS[idx] = { ...NSF_EVENTS[idx], ...patch };
    return NSF_EVENTS[idx];
  },
  async addPayment(payment: Payment): Promise<Payment> {
    PAYMENTS.push(payment);
    return payment;
  },

  // -- Application + status event mutators (PR #4.5.1) ------------------

  async updateApplication(
    id: string,
    patch: Partial<Application>,
  ): Promise<Application | undefined> {
    const idx = APPLICATIONS.findIndex((a) => a.id === id);
    if (idx < 0) return undefined;
    APPLICATIONS[idx] = { ...APPLICATIONS[idx], ...patch };
    return APPLICATIONS[idx];
  },
  async addApplicationStatusEvent(
    event: ApplicationStatusEvent,
  ): Promise<ApplicationStatusEvent> {
    APPLICATION_STATUS_EVENTS.push(event);
    return event;
  },

  // -- Credit products (Loan Settings, PR #4.5) --------------------------

  async listCreditProducts(): Promise<CreditProduct[]> {
    return CREDIT_PRODUCTS;
  },
  async getCreditProduct(id: string): Promise<CreditProduct | undefined> {
    return CREDIT_PRODUCTS.find((p) => p.id === id || p.code === id);
  },

  // -- Migration runs (PR #4.6.1) ----------------------------------------

  async listMigrationRuns(): Promise<MigrationRun[]> {
    // Newest first.
    return [...MIGRATION_RUNS].sort((a, b) =>
      a.ran_at < b.ran_at ? 1 : -1,
    );
  },
  async getMigrationRun(id: string): Promise<MigrationRun | undefined> {
    return MIGRATION_RUNS.find((r) => r.id === id);
  },
  async addMigrationRun(run: MigrationRun): Promise<MigrationRun> {
    MIGRATION_RUNS.push(run);
    return run;
  },

  // -- Cutover checklist (PR #4.7) ---------------------------------------

  async listCutoverItems(): Promise<CutoverItem[]> {
    return CUTOVER_ITEMS;
  },
  async getCutoverItem(id: string): Promise<CutoverItem | undefined> {
    return CUTOVER_ITEMS.find((c) => c.id === id);
  },
  async updateCutoverItem(
    id: string,
    patch: Partial<CutoverItem>,
  ): Promise<CutoverItem | undefined> {
    const idx = CUTOVER_ITEMS.findIndex((c) => c.id === id);
    if (idx < 0) return undefined;
    CUTOVER_ITEMS[idx] = { ...CUTOVER_ITEMS[idx], ...patch };
    return CUTOVER_ITEMS[idx];
  },

  // -- Underwriting notes (PR #4.5.2) ------------------------------------

  async listUWNotesForApplication(application_id: string): Promise<UWNote[]> {
    return UW_NOTES.filter((n) => n.application_id === application_id);
  },
  async addUWNote(note: UWNote): Promise<UWNote> {
    UW_NOTES.push(note);
    return note;
  },
};
