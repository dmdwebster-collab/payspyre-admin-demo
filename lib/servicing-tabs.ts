/**
 * Tab order + labels for the Servicing workplace Loan Header (PR #4.3).
 *
 * Mirrors the pattern in lib/originations.ts → ORIGINATION_TABS so the
 * client-side tab nav stays consistent across workplaces. Each entry
 * declares the route slug + the user-facing label + the PR that brings
 * the real implementation. Stubs render a `StubBanner` that points at
 * the listed PR.
 */

export interface ServicingTab {
  slug: string;
  label: string;
  pr: "PR #4.3" | "PR #4.4" | "PR #4.5" | "PR #4.6";
}

export const SERVICING_TABS: ServicingTab[] = [
  { slug: "schedule", label: "Schedule", pr: "PR #4.3" },
  { slug: "payments", label: "Payments", pr: "PR #4.4" },
  { slug: "nsf", label: "NSF", pr: "PR #4.4" },
  { slug: "activity", label: "Activity", pr: "PR #4.6" },
];
