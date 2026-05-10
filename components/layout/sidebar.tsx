"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  status?: "live" | "pr1_2" | "pr2" | "pr3";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "▤", status: "live" },
  { label: "Accounts", href: "/accounts", icon: "≡", status: "live" },
  { label: "Vendors", href: "/vendors", icon: "◉", status: "live" },
  { label: "Performance", href: "/performance", icon: "◈", status: "live" },
];

const WORKPLACE_ITEMS: NavItem[] = [
  { label: "Vendor Onboarding", href: "/vendor-onboarding", icon: "◆", status: "pr1_2" },
  { label: "Originations", href: "/originations", icon: "✎", status: "pr2" },
  { label: "Underwriting", href: "/underwriting", icon: "✓", status: "pr3" },
  { label: "Servicing", href: "/servicing", icon: "⟳", status: "pr3" },
  { label: "Collections", href: "/collections", icon: "!", status: "pr3" },
  { label: "Reports", href: "/reports", icon: "▦", status: "pr3" },
  { label: "Archive", href: "/archive", icon: "▣", status: "pr3" },
  { label: "Settings", href: "/settings", icon: "⚙", status: "pr3" },
];

function StatusTag({ status }: { status?: NavItem["status"] }) {
  if (!status || status === "live") return null;
  const label =
    status === "pr1_2" ? "PR #1.2" : status === "pr2" ? "PR #2" : "PR #3";
  return (
    <span className="ml-auto text-[9px] font-semibold tracking-wider text-gold-dim border border-line rounded px-1.5 py-px">
      {label}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="bg-navy-900 border-r border-line flex flex-col py-5 w-60 flex-shrink-0">
      <div className="flex flex-col items-start gap-1.5 px-5 pb-5 mb-3.5 border-b border-line-soft">
        <Image
          src="/payspyre-logo.png"
          alt="PaySpyre"
          width={160}
          height={28}
          className="object-contain"
          priority
        />
        <div className="text-[10px] text-ink-mute uppercase tracking-widest pl-0.5">
          Admin Console
        </div>
      </div>

      <nav className="flex flex-col px-2.5 flex-1 gap-px">
        <div className="text-[9px] font-semibold tracking-widest text-ink-mute uppercase px-3.5 pt-2 pb-1">
          Portfolio
        </div>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded text-[13px] font-medium transition-colors",
                active
                  ? "bg-navy-600 text-gold"
                  : "text-ink-dim hover:bg-navy-700 hover:text-ink",
              )}
            >
              <span className="text-base w-4 text-center opacity-80">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="text-[9px] font-semibold tracking-widest text-ink-mute uppercase px-3.5 pt-4 pb-1">
          Workplaces
        </div>
        {WORKPLACE_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded text-[13px] font-medium transition-colors",
                active
                  ? "bg-navy-600 text-gold"
                  : "text-ink-dim hover:bg-navy-700 hover:text-ink",
              )}
            >
              <span className="text-base w-4 text-center opacity-80">{item.icon}</span>
              <span>{item.label}</span>
              <StatusTag status={item.status} />
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-line-soft text-[11px] text-ink-mute leading-relaxed">
        <div className="tracking-wide">DSI · 360-day year</div>
        <div className="tracking-wide">BC / AB Dental Finance</div>
      </div>
    </aside>
  );
}
