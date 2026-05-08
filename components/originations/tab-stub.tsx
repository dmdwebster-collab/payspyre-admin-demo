import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  title: string;
  description: string;
  fields?: string[];
}

/**
 * Compact in-tab stub for Originations tabs that haven't been built out
 * yet. Looks similar to the workplace-level StubBanner but sized for a
 * single tab.
 */
export function TabStub({ title, description, fields }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title}
          <span className="ml-3 text-[10px] tracking-wider text-gold-dim font-semibold border border-gold-dim/40 rounded px-1.5 py-px uppercase">
            PR #2 — coming
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-ink-dim text-[12px]">{description}</p>
        {fields && fields.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-semibold tracking-wider text-ink-mute uppercase mb-2">
              Planned fields
            </div>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-ink-dim">
              {fields.map((f) => (
                <li
                  key={f}
                  className="before:content-['—'] before:mr-2 before:text-ink-mute"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
