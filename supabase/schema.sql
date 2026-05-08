-- PaySpyre Admin — initial Supabase schema (PR #1 draft)
-- ----------------------------------------------------------------------------
-- This file is the canonical schema. RLS policies are deliberately NOT enabled
-- yet — they ship in a follow-up PR alongside the Auth wiring.
--
-- Conventions:
--   * Every domain table carries vendor_id (FK → vendors.id) so RLS can scope
--     per-vendor in production.
--   * Currency: CAD. Day-count: 360-day year (DSI). Provinces: BC, AB to start.
--   * Timestamps are TIMESTAMPTZ. Dates without a time use DATE.
--   * Money is stored as NUMERIC(14,2) for ledger-grade precision; *_balance
--     and *_realized columns can go negative for adjustments.
-- ----------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Vendors / clinics
create table if not exists vendors (
  id text primary key,
  name text not null,
  province text not null check (province in ('BC','AB')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','PENDING','SUSPENDED')),
  address text,
  email text,
  phone text,
  start_date date,
  first_invoice_date date,
  providers text[] not null default '{}',
  cost_per_open_account numeric(10,2) not null default 0,
  interest_share numeric(5,4) not null default 0.5,
  zero_pct_payment_share numeric(5,4) not null default 0,
  fees_share numeric(5,4) not null default 1,
  tax_rate numeric(5,4) not null default 0.05,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Borrowers (and co-borrowers)
create table if not exists borrowers (
  id uuid primary key default gen_random_uuid(),
  vendor_id text references vendors(id),
  is_primary boolean not null default true,
  first_name text not null,
  middle_name text,
  last_name text not null,
  preferred_name text,
  date_of_birth date not null,
  sin_last4 text,
  marital_status text,
  email text not null,
  phone text not null,
  phone_alt text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  province text not null check (province in ('BC','AB')),
  postal_code text not null,
  country text not null default 'CA',
  residence_type text,
  monthly_housing_cost numeric(10,2),
  years_at_address numeric(4,1),
  id_type text,
  id_number_last4 text,
  id_expiry date,
  id_province text,
  employer_name text,
  occupation text,
  employment_type text,
  years_employed numeric(4,1),
  gross_monthly_income numeric(10,2),
  income_source text,
  profile_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Applications drive the Status Flow state machine (lib/status-flow.ts)
-- Credit products: per-product config including verification toggles + reuse windows.
-- Per David's PR #1 reply: "Certain credit products may not require a credit
-- bureau at all" → requires_credit_bureau On/Off. Validity windows apply
-- independently and default to 30 days; if a fresh result already exists,
-- the system reuses it rather than initiating a new pull.
create table if not exists credit_products (
  id text primary key,
  code text not null unique,
  name text not null,
  active boolean not null default true,
  provinces text[] not null,
  min_amount numeric(12,2) not null check (min_amount >= 0),
  max_amount numeric(12,2) not null check (max_amount >= 0),
  min_term_months integer not null check (min_term_months > 0),
  max_term_months integer not null check (max_term_months > 0),
  base_rate numeric(6,3) not null check (base_rate >= 0),
  origination_fee_pct numeric(6,3) not null default 0 check (origination_fee_pct >= 0),
  requires_credit_bureau boolean not null default true,
  requires_bank_verification boolean not null default true,
  credit_report_validity_days integer not null default 30 check (credit_report_validity_days > 0),
  bank_verification_validity_days integer not null default 30 check (bank_verification_validity_days > 0),
  post_booking_credit_repull_days integer check (post_booking_credit_repull_days is null or post_booking_credit_repull_days > 0),
  post_booking_bank_repull_days integer check (post_booking_bank_repull_days is null or post_booking_bank_repull_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists applications (
  id text primary key, -- e.g. APP-2026-00042
  application_number text not null unique,
  status text not null check (status in (
    'PRE_ORIGINATION','ORIGINATION','CREDIT_REPORT','BANK_VERIFICATION',
    'APPLICATION_VERIFICATION','CREDIT_UNDERWRITING','OFFER_ACCEPTANCE',
    'AGREEMENT_SIGNATURE','APPROVED','ACTIVE','REJECTED','CANCELLED','CLOSED'
  )),
  vendor_id text not null references vendors(id),
  vendor_name text not null,
  provider text not null,
  province text not null check (province in ('BC','AB')),
  primary_borrower_id uuid references borrowers(id),
  co_borrower_id uuid references borrowers(id),
  credit_product_id text references credit_products(id),
  requested_amount numeric(12,2) not null check (requested_amount >= 0),
  offer_amount numeric(12,2),
  term_months integer,
  interest_rate numeric(6,3),
  payment_frequency text check (payment_frequency in ('Weekly','BiWeekly','SemiMonthly','Monthly')),
  start_date date,
  first_payment_date date,
  -- Verification freshness (per David's PR #1 reply). Each check has its own
  -- "last completed at" timestamp; freshness is evaluated per credit product.
  credit_report_completed_at timestamptz,
  bank_verification_completed_at timestamptz,
  application_verification_completed_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  closed_at timestamptz
);

create index if not exists applications_status_idx on applications(status);
create index if not exists applications_vendor_idx on applications(vendor_id);

-- Append-only audit trail for every status change (Workflow tab is a query)
create table if not exists application_status_events (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  action text not null,
  actor_id text not null,
  actor_name text not null,
  comments text,
  occurred_at timestamptz not null default now()
);
create index if not exists application_status_events_app_idx
  on application_status_events(application_id, occurred_at);

-- Loans — preserves every column from the legacy v1 dataset
create table if not exists loans (
  id text primary key, -- e.g. PS-100103
  application_id text references applications(id),
  acct_num text not null unique,
  borrower text not null,
  co_borrower text,
  vendor_id text not null references vendors(id),
  vendor_name text not null,
  provider text not null,
  province text not null check (province in ('BC','AB')),
  -- Origination amounts
  sales_value numeric(12,2) not null,
  insurance numeric(12,2) not null default 0,
  downpayment numeric(12,2) not null default 0,
  amount_financed numeric(12,2) not null,
  new_advance numeric(12,2) not null,
  -- Terms
  term integer not null check (term > 0),
  rate numeric(6,3) not null,
  regular_payment numeric(10,2) not null,
  payment_frequency text not null check (payment_frequency in ('Weekly','BiWeekly','SemiMonthly','Monthly')),
  cost_of_borrowing numeric(12,2) not null default 0,
  origination_date date not null,
  org_type text not null check (org_type in ('LOAN-NEW','RENEWAL','REFINANCE','TRANSFER-IN')),
  first_pmt_date date not null,
  final_pmt_date date not null,
  diny smallint not null default 360 check (diny = 360),
  platform text not null default 'M',
  -- Status
  status text not null check (status in ('ACTIVE','PAID_OFF','RENEWED','REFINANCED','TRANSFERRED','WRITTEN_OFF','SETTLED','VOIDED')),
  sub_status text,
  dpd integer not null default 0,
  risk_tier text not null check (risk_tier in ('EXCELLENT','GOOD','AVERAGE','WEAK','POOR')),
  -- Balances
  fees_balance numeric(12,2) not null default 0,
  interest_balance numeric(12,2) not null default 0,
  principal_balance numeric(12,2) not null default 0,
  total_owed numeric(12,2) not null default 0,
  -- Lifetime totals
  total_payments numeric(12,2) not null default 0,
  total_fees_paid numeric(12,2) not null default 0,
  total_interest_paid numeric(12,2) not null default 0,
  total_principal_paid numeric(12,2) not null default 0,
  pmt_count integer not null default 0,
  total_tx_count integer not null default 0,
  -- Realized to PaySpyre
  payments_realized numeric(12,2) not null default 0,
  fees_realized numeric(12,2) not null default 0,
  interest_realized numeric(12,2) not null default 0,
  principal_realized numeric(12,2) not null default 0,
  -- Schedule pointers
  next_due_date date,
  last_payment date,
  last_tx_type text,
  -- Closure
  close_date date,
  close_type text,
  new_acct_num text,
  renewal_payout numeric(12,2) not null default 0,
  principal_renewal numeric(12,2) not null default 0,
  interest_renewal numeric(12,2) not null default 0,
  fees_renewal numeric(12,2) not null default 0,
  -- Adjustments / write-offs / transfers
  adjust_principal numeric(12,2) not null default 0,
  adjust_interest numeric(12,2) not null default 0,
  adjust_fees numeric(12,2) not null default 0,
  writeoff_principal numeric(12,2) not null default 0,
  writeoff_interest numeric(12,2) not null default 0,
  writeoff_fees numeric(12,2) not null default 0,
  writeoff_small_balance numeric(12,2) not null default 0,
  transfer_principal numeric(12,2) not null default 0,
  transfer_interest numeric(12,2) not null default 0,
  transfer_fees numeric(12,2) not null default 0,
  -- Risk / performance
  nsf_count integer not null default 0,
  deferment_count integer not null default 0,
  est_principal_loss numeric(12,2) not null default 0,
  est_future_interest numeric(12,2) not null default 0,
  insolvent_date date,
  insolvent_amt numeric(12,2) not null default 0,
  insolvent_type text,
  -- Vendor share splits (per-loan overrides)
  ven_share_fees numeric(5,4) not null default 1,
  ven_share_interest numeric(5,4) not null default 0.5,
  ven_share_principal numeric(5,4) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists loans_status_idx on loans(status);
create index if not exists loans_vendor_idx on loans(vendor_id);
create index if not exists loans_dpd_idx on loans(dpd) where dpd > 0;

-- Loan ledger (Servicing → Transactions tab is a query)
create table if not exists loan_transactions (
  id uuid primary key default gen_random_uuid(),
  loan_id text not null references loans(id) on delete cascade,
  row_number integer,
  transaction_number integer,
  vendor_code text not null,
  provider text not null,
  platform text not null default 'M',
  pd_code text,
  override boolean not null default false,
  sequence_in_account integer not null default 0,
  account_number text not null,
  rate numeric(6,4) not null,
  days_in_year smallint not null default 360 check (days_in_year = 360),
  borrower_name text not null,
  date date not null,
  payment_amount numeric(12,2) not null default 0,
  fees_charged numeric(12,2) not null default 0,
  fees_paid numeric(12,2) not null default 0,
  fee_balance numeric(12,2) not null default 0,
  accrued_interest numeric(12,2) not null default 0,
  interest_due numeric(12,2) not null default 0,
  interest_paid numeric(12,2) not null default 0,
  interest_balance numeric(12,2) not null default 0,
  principal_paid numeric(12,2) not null default 0,
  principal_balance numeric(12,2) not null default 0,
  total_owed numeric(12,2) not null default 0,
  transaction_type text not null,
  vp_code text,
  comments text,
  created_at timestamptz not null default now()
);
create index if not exists loan_transactions_loan_idx on loan_transactions(loan_id, date);

-- Bank accounts (Flinks or manual; only last4 + transit/institution stored
-- in plain — full account numbers must be tokenised by Zum Rails)
create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  application_id text references applications(id),
  borrower_id uuid references borrowers(id),
  source text not null check (source in ('Flinks','Manual')),
  is_default boolean not null default false,
  bank_name text not null,
  account_holder_name text not null,
  account_number_last4 text not null check (account_number_last4 ~ '^\d{4}$'),
  transit_number text not null check (transit_number ~ '^\d{5}$'),
  institution_number text not null check (institution_number ~ '^\d{3}$'),
  account_type text not null check (account_type in ('Chequing','Savings','Other')),
  zum_payment_profile_id text,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

-- Bank verification reports + their derived metrics
create table if not exists bank_verifications (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references applications(id) on delete cascade,
  borrower_id uuid references borrowers(id),
  requested_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('Requested','Completed','Expired','Cancelled','Failed')),
  depth_days integer not null check (depth_days in (90, 365)),
  flinks_login_id text,
  income_source text,
  income_amount_monthly numeric(12,2),
  min_balance_in_period numeric(12,2),
  avg_monthly_free_cash_flow numeric(12,2),
  days_with_negative_balance integer,
  balance_trend text check (balance_trend in ('Up','Flat','Down')),
  nsf_count integer,
  stop_payment_count integer,
  micro_lender_names text[] not null default '{}',
  avg_monthly_expenditure numeric(12,2),
  ability_to_pay_score smallint check (ability_to_pay_score between 0 and 100),
  fraud_flags text[] not null default '{}'
);

-- Documents (loan agreements, IDs, NoAs, etc.) — actual files in Supabase Storage
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  application_id text references applications(id),
  loan_id text references loans(id),
  borrower_id uuid references borrowers(id),
  type text not null,
  filename text not null,
  storage_url text not null,
  uploaded_by text not null,
  uploaded_at timestamptz not null default now(),
  size_bytes bigint not null,
  mime_type text not null,
  signed boolean not null default false,
  signed_at timestamptz,
  metadata jsonb
);

-- Contact log
create table if not exists contact_logs (
  id uuid primary key default gen_random_uuid(),
  application_id text references applications(id),
  loan_id text references loans(id),
  occurred_at timestamptz not null default now(),
  user_id text not null,
  user_name text not null,
  method text not null check (method in ('Phone','Email','SMS','Dashboard','Mail')),
  subject text not null,
  result text,
  status text not null check (status in ('Successful','Failed','NoAnswer','LeftMessage')),
  comments text,
  body text,
  is_promise_to_pay boolean not null default false,
  ptp_amount numeric(12,2),
  ptp_date date,
  ptp_method text
);
create index if not exists contact_logs_loan_idx on contact_logs(loan_id, occurred_at);

-- Borrower contact preferences
create table if not exists contact_preferences (
  borrower_id uuid primary key references borrowers(id) on delete cascade,
  preferred_method text not null default 'Email' check (preferred_method in ('Phone','Email','SMS','Dashboard','Mail')),
  ok_to_contact_at_work boolean not null default false,
  sms_opt_out boolean not null default false,
  email_opt_out boolean not null default false,
  call_opt_out boolean not null default false,
  flags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TODO (PR #2/#3):
--   * Enable RLS on every table; add policies scoped to vendor_id via JWT claim
--   * Auth wiring: Supabase Auth users → users table → role mapping
--   * scheduled_transactions table
--   * credit_products + scorecards tables (Settings → Decision Engine)
--   * province_settings table for compliant per-province operation
-- ----------------------------------------------------------------------------
