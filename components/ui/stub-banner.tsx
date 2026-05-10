import { cn } from "@/lib/utils";

interface StubBannerProps {
  pr: "PR #1.2" | "PR #2" | "PR #3" | "PR #4" | "PR #5";
  description: string;
  fields?: string[];
  className?: string;
}

export function StubBanner({ pr, description, fields, className }: StubBannerProps) {
  return (
    <div
      className={cn(
        "bg-navy-700 border border-dashed border-gold-dim rounded-lg p-6",
        className,
      )}
    >
      <div className="text-[11px] font-semibold tracking-wider text-gold uppercase mb-2">
        Coming in {pr}
      </div>
      <p className="text-ink-dim text-sm mb-4">{description}</p>
      {fields && fields.length > 0 && (
        <>
          <div className="text-[10px] font-semibold tracking-wider text-ink-mute uppercase mb-2">
            Spec fields
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-ink-dim font-mono">
            {fields.map((f) => (
              <li key={f} className="before:content-['—'] before:mr-2 before:text-ink-mute">
                {f}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
