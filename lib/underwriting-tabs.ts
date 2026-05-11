/**
 * Tab order + labels for the Underwriting workplace Loan Header (PR #4.5).
 *
 * Mirrors lib/servicing-tabs.ts. Each entry declares the route slug, the
 * user-facing label, and the PR that brings the real implementation.
 */

export interface UnderwritingTab {
  slug: string;
  label: string;
  pr: "PR #4.5" | "PR #4.5.1" | "PR #4.5.2" | "PR #4.8";
}

export const UNDERWRITING_TABS: UnderwritingTab[] = [
  { slug: "decision", label: "Decision", pr: "PR #4.5" },
  { slug: "bureau", label: "Bureau", pr: "PR #4.5.1" },
  { slug: "bank", label: "Bank", pr: "PR #4.5.1" },
  { slug: "verification", label: "Verification", pr: "PR #4.5.2" },
  { slug: "notes", label: "Notes", pr: "PR #4.5.2" },
];
