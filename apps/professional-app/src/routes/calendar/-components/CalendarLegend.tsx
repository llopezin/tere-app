import { Card } from "@fisio-app/ui/Card";
import { cn } from "@fisio-app/ui/lib/cn";
import { APPOINTMENT_STYLES, BLOCKED_STYLE } from "./calendar-styles";

const ITEMS = [...Object.values(APPOINTMENT_STYLES), BLOCKED_STYLE];

export function CalendarLegend() {
  return (
    <Card className="flex flex-wrap gap-x-6 gap-y-2 p-4">
      {ITEMS.map(({ label, swatch }) => (
        <span key={label} className="flex items-center gap-2 text-sm text-text">
          <span className={cn("size-4 rounded border-l-4", swatch)} />
          {label}
        </span>
      ))}
    </Card>
  );
}
