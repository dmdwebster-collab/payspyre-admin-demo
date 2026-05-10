import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "active" | "paid" | "renewed" | "writeoff" | "transfer" | "voided" | "muted";

const VARIANT_CLASSES: Record<Variant, string> = {
  default: "bg-navy-600 text-ink-dim border-line",
  active: "bg-ok/10 text-ok border-ok-dark",
  paid: "bg-info/10 text-info border-info-dark",
  renewed: "bg-warn/10 text-warn border-warn-dark",
  writeoff: "bg-danger/10 text-danger border-danger-dark",
  transfer: "bg-accent/10 text-accent border-accent-dark",
  voided: "bg-navy-600 text-ink-mute border-line",
  muted: "bg-navy-700 text-ink-mute border-line",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide uppercase",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
