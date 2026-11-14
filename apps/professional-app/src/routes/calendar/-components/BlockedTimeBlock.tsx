import { cn } from "@fisio-app/ui/lib/cn";
import { BLOCKED_STYLE } from "./calendar-styles";

interface BlockedTimeBlockProps {
  position: { top: number; height: number };
}

export function BlockedTimeBlock({ position }: BlockedTimeBlockProps) {
  return (
    <div
      style={{ top: position.top, height: position.height }}
      className={cn(
        "absolute inset-x-0.5 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-xs md:px-2",
        BLOCKED_STYLE.block,
      )}
    >
      <span className="truncate">{BLOCKED_STYLE.label}</span>
    </div>
  );
}
