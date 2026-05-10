import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-[13px]", className)} {...props} />
    </div>
  );
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-line-soft last:border-b-0", className)} {...props} />;
}

export function TH({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "text-left px-3 py-2.5 text-[10px] font-semibold tracking-wider text-ink-mute uppercase border-b border-line bg-navy-800",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2.5 font-mono text-[12px] text-ink", className)} {...props} />;
}
