/**
 * Canadian Payments Association (CPA) EFT codes.
 * Source: https://payments.ca/ — codes & descriptions.
 *
 * Used by the Bank Statements transaction categoriser. Spec ref:
 * docs/spec/admin-dashboard-spec.md → Bank Statements tab.
 *
 * Note from the spec: "not every business / sender uses the codes correctly
 * which makes it impossible to rely on them as the sole way to categorize
 * transactions." Treat this table as one input among several (CPA → AI →
 * manual override). Category is best-effort.
 */

export type CpaPaymentType = "Credit" | "Debit" | "Both";

export interface CpaCode {
  code: string;
  paymentType: CpaPaymentType;
  description: string;
  /** Coarse category surfaced in the UI. */
  category: "Income" | "Expense-NonDiscretionary" | "Expense-Discretionary" | "Government" | "Investment" | "Insurance" | "Loan" | "Mortgage" | "Tax" | "Rent" | "Utility" | "Bill" | "Misc" | "Donation";
  /** Government-restricted codes can only appear from government senders. */
  restricted?: boolean;
}

export const CPA_CODES: readonly CpaCode[] = [
  // 200–207 Payroll
  { code: "200", paymentType: "Both", description: "Payroll Deposit", category: "Income" },
  { code: "201", paymentType: "Both", description: "Special Payroll", category: "Income" },
  { code: "202", paymentType: "Both", description: "Vacation Payroll", category: "Income" },
  { code: "203", paymentType: "Both", description: "Overtime Payroll", category: "Income" },
  { code: "204", paymentType: "Both", description: "Advance Payroll", category: "Income" },
  { code: "205", paymentType: "Both", description: "Commission Payroll", category: "Income" },
  { code: "206", paymentType: "Both", description: "Bonus Payroll", category: "Income" },
  { code: "207", paymentType: "Both", description: "Adjustment Payroll", category: "Income" },
  // 230–233 Pension
  { code: "230", paymentType: "Both", description: "Pension", category: "Income" },
  { code: "231", paymentType: "Both", description: "Federal Pension", category: "Income" },
  { code: "232", paymentType: "Both", description: "Provincial Pension", category: "Income" },
  { code: "233", paymentType: "Both", description: "Private Pension", category: "Income" },
  { code: "240", paymentType: "Both", description: "Annuity", category: "Income" },
  // 250–252 Dividends
  { code: "250", paymentType: "Both", description: "Dividend", category: "Income" },
  { code: "251", paymentType: "Both", description: "Common Dividend", category: "Income" },
  { code: "252", paymentType: "Both", description: "Preferred Dividend", category: "Income" },
  // 260–274 Investment
  { code: "260", paymentType: "Both", description: "Investment", category: "Investment" },
  { code: "261", paymentType: "Both", description: "Mutual Funds", category: "Investment" },
  { code: "265", paymentType: "Both", description: "Spousal RSP Contribution", category: "Investment" },
  { code: "266", paymentType: "Both", description: "RESP Contribution", category: "Investment" },
  { code: "271", paymentType: "Both", description: "RSP Contribution", category: "Investment" },
  { code: "272", paymentType: "Both", description: "Retirement Income Fund", category: "Investment" },
  { code: "273", paymentType: "Both", description: "TFSA", category: "Investment" },
  { code: "274", paymentType: "Both", description: "RDSP Contribution", category: "Investment" },
  // 280–281
  { code: "280", paymentType: "Both", description: "Interest", category: "Income" },
  { code: "281", paymentType: "Both", description: "Lottery Prize Payment", category: "Income" },
  // 300–323 Federal Government (restricted)
  { code: "300", paymentType: "Both", description: "Federal Government", category: "Government", restricted: true },
  { code: "301", paymentType: "Both", description: "Agriculture Stabilization Payments", category: "Government", restricted: true },
  { code: "302", paymentType: "Both", description: "Canadian Dairy Commission", category: "Government", restricted: true },
  { code: "303", paymentType: "Both", description: "HRDC – Training", category: "Government", restricted: true },
  { code: "308", paymentType: "Both", description: "Child Tax Credit", category: "Government", restricted: true },
  { code: "309", paymentType: "Both", description: "Goods and Services Tax", category: "Government", restricted: true },
  { code: "310", paymentType: "Both", description: "Canada Pension Plan", category: "Government", restricted: true },
  { code: "311", paymentType: "Both", description: "Old Age Security", category: "Government", restricted: true },
  { code: "312", paymentType: "Both", description: "War Veterans' Allowances", category: "Government", restricted: true },
  { code: "313", paymentType: "Both", description: "Canadian Pension Commission", category: "Government", restricted: true },
  { code: "314", paymentType: "Both", description: "Family Allowances", category: "Government", restricted: true },
  { code: "315", paymentType: "Both", description: "Public Service Superannuation", category: "Government", restricted: true },
  { code: "316", paymentType: "Both", description: "Canadian Forces Superannuation", category: "Government", restricted: true },
  { code: "317", paymentType: "Both", description: "Tax Refunds", category: "Government", restricted: true },
  { code: "318", paymentType: "Both", description: "Employment Insurance", category: "Government", restricted: true },
  { code: "319", paymentType: "Debit", description: "Dbt CCRA Government of Canada", category: "Government", restricted: true },
  { code: "320", paymentType: "Both", description: "Government Student Loans", category: "Government", restricted: true },
  { code: "321", paymentType: "Both", description: "CSB Interest", category: "Government", restricted: true },
  { code: "322", paymentType: "Both", description: "External Affairs", category: "Government", restricted: true },
  { code: "323", paymentType: "Both", description: "Canada Savings Plan", category: "Government", restricted: true },
  // 330–336 Insurance
  { code: "330", paymentType: "Both", description: "Insurance", category: "Insurance" },
  { code: "331", paymentType: "Both", description: "Life Insurance", category: "Insurance" },
  { code: "332", paymentType: "Both", description: "Auto Insurance", category: "Insurance" },
  { code: "333", paymentType: "Both", description: "Property Insurance", category: "Insurance" },
  { code: "334", paymentType: "Both", description: "Casualty Insurance", category: "Insurance" },
  { code: "335", paymentType: "Both", description: "Mortgage Insurance", category: "Insurance" },
  { code: "336", paymentType: "Both", description: "Health/Dental Claim Insurance", category: "Insurance" },
  // 350–356 Loans
  { code: "350", paymentType: "Both", description: "Loans", category: "Loan" },
  { code: "351", paymentType: "Both", description: "Personal Loans", category: "Loan" },
  { code: "352", paymentType: "Both", description: "Dealer Plan Loans", category: "Loan" },
  { code: "353", paymentType: "Both", description: "Farm Improvement Loans", category: "Loan" },
  { code: "354", paymentType: "Both", description: "Home Improvement Loans", category: "Loan" },
  { code: "355", paymentType: "Both", description: "Term Loans", category: "Loan" },
  { code: "356", paymentType: "Both", description: "Insurance Loans", category: "Loan" },
  // 370–373 Mortgage
  { code: "370", paymentType: "Both", description: "Mortgage", category: "Mortgage" },
  { code: "371", paymentType: "Both", description: "Residential Mortgage", category: "Mortgage" },
  { code: "372", paymentType: "Both", description: "Commercial Mortgage", category: "Mortgage" },
  { code: "373", paymentType: "Both", description: "Farm Mortgage", category: "Mortgage" },
  // 380–386 Taxes
  { code: "380", paymentType: "Both", description: "Taxes", category: "Tax" },
  { code: "381", paymentType: "Both", description: "Income Taxes", category: "Tax" },
  { code: "382", paymentType: "Both", description: "Sales Taxes", category: "Tax" },
  { code: "383", paymentType: "Both", description: "Corporate Taxes", category: "Tax" },
  { code: "384", paymentType: "Both", description: "School Taxes", category: "Tax" },
  { code: "385", paymentType: "Both", description: "Property Taxes", category: "Tax" },
  { code: "386", paymentType: "Both", description: "Water Taxes", category: "Tax" },
  // 400–405 Rent/Lease
  { code: "400", paymentType: "Both", description: "Rent/Leases", category: "Rent" },
  { code: "401", paymentType: "Both", description: "Residential Rent/Leases", category: "Rent" },
  { code: "402", paymentType: "Both", description: "Commercial Rent/Leases", category: "Rent" },
  { code: "403", paymentType: "Both", description: "Equipment Rent/Leases", category: "Rent" },
  { code: "404", paymentType: "Both", description: "Automobile Rent/Leases", category: "Rent" },
  { code: "405", paymentType: "Both", description: "Appliance Rent/Leases", category: "Rent" },
  // 420–439 Cash Mgmt / Bills
  { code: "420", paymentType: "Both", description: "Cash Management", category: "Misc" },
  { code: "430", paymentType: "Both", description: "Bill Payment", category: "Bill" },
  { code: "431", paymentType: "Both", description: "Telephone Bill Payment", category: "Bill" },
  { code: "432", paymentType: "Both", description: "Gasoline Bill Payment", category: "Bill" },
  { code: "433", paymentType: "Both", description: "Hydro Bill Payment", category: "Utility" },
  { code: "434", paymentType: "Both", description: "Cable Bill Payment", category: "Bill" },
  { code: "435", paymentType: "Both", description: "Fuel Bill Payment", category: "Bill" },
  { code: "436", paymentType: "Both", description: "Utility Bill Payment", category: "Utility" },
  { code: "437", paymentType: "Both", description: "Internet Access Payment", category: "Utility" },
  { code: "438", paymentType: "Both", description: "Water Bill Payment", category: "Utility" },
  { code: "439", paymentType: "Both", description: "Auto Payment", category: "Bill" },
  // 450–480
  { code: "450", paymentType: "Both", description: "Misc. Payments", category: "Misc" },
  { code: "451", paymentType: "Both", description: "Customer Cheques", category: "Misc" },
  { code: "452", paymentType: "Both", description: "Expense Payment", category: "Misc" },
  { code: "460", paymentType: "Both", description: "Accounts Payable", category: "Misc" },
  { code: "470", paymentType: "Both", description: "Fees/Dues", category: "Misc" },
  { code: "480", paymentType: "Both", description: "Donations", category: "Donation" },
  // 600–609 Provincial Government (restricted)
  { code: "600", paymentType: "Both", description: "Provincial Government", category: "Government", restricted: true },
  { code: "601", paymentType: "Both", description: "Family Support Plan", category: "Government", restricted: true },
  { code: "602", paymentType: "Both", description: "Housing Allowance", category: "Government", restricted: true },
  { code: "603", paymentType: "Both", description: "Income Security Benefits", category: "Government", restricted: true },
  { code: "604", paymentType: "Both", description: "Provincial Family Benefits", category: "Government", restricted: true },
  { code: "605", paymentType: "Both", description: "Combined Fed-Prov/Terr Payment", category: "Government", restricted: true },
  { code: "606", paymentType: "Both", description: "Workers' Compensation Board", category: "Government", restricted: true },
  { code: "607", paymentType: "Both", description: "Employment Assistance Allowance", category: "Government", restricted: true },
  { code: "608", paymentType: "Both", description: "Automobile Insurance Plan", category: "Government", restricted: true },
  { code: "609", paymentType: "Both", description: "Provincial Health Care Premium", category: "Government", restricted: true },
];

export const CPA_CODE_MAP: Record<string, CpaCode> = Object.fromEntries(
  CPA_CODES.map((c) => [c.code, c]),
);

export function getCpaCode(code: string): CpaCode | undefined {
  return CPA_CODE_MAP[code];
}
