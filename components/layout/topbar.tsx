interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="bg-navy-800 border-b border-line px-6 py-3.5 flex items-center justify-between">
      <div>
        <div className="text-[15px] font-semibold tracking-wide">{title}</div>
        {subtitle && <div className="text-[11px] text-ink-mute mt-0.5">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full uppercase text-ok border border-ok-dark bg-ok/10">
          Live Portfolio
        </span>
        <span className="text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full uppercase text-ink-dim border border-line bg-navy-600">
          CAD
        </span>
      </div>
    </header>
  );
}
