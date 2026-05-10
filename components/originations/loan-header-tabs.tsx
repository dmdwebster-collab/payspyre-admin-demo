"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ORIGINATION_TABS } from "@/lib/originations";

interface Props {
  applicationId: string;
}

/**
 * Loan Header tab strip. Client component because we need the active
 * pathname to highlight the current tab. Everything else in the Loan
 * Header layout stays a server component.
 */
export function LoanHeaderTabs({ applicationId }: Props) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Loan Header tabs"
      className="border-b border-line bg-navy-900 px-6 sticky top-[88px] z-10"
    >
      <ul className="flex gap-1 overflow-x-auto">
        {ORIGINATION_TABS.map((tab) => {
          const href = `/originations/${applicationId}/${tab.slug}`;
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
