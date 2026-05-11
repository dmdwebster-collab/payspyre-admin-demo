"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UNDERWRITING_TABS } from "@/lib/underwriting-tabs";

interface Props {
  applicationId: string;
}

/**
 * Underwriting Loan Header tab strip. Client component for active-tab
 * highlighting; everything else in the layout stays a server component.
 * Mirrors components/servicing/loan-header-tabs.tsx.
 */
export function UnderwritingLoanHeaderTabs({ applicationId }: Props) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Underwriting Loan Header tabs"
      className="border-b border-line bg-navy-900 px-6 sticky top-[88px] z-10"
    >
      <ul className="flex gap-1 overflow-x-auto">
        {UNDERWRITING_TABS.map((tab) => {
          const href = `/underwriting/${applicationId}/${tab.slug}`;
          const active = pathname === href;
          return (
            <li key={tab.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block px-4 py-3 text-[12px] font-semibold tracking-wider uppercase whitespace-nowrap border-b-2 ${
                  active
                    ? "text-gold border-gold"
                    : "text-ink-dim hover:text-ink border-transparent hover:border-ink-mute"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
