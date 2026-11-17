import { cn } from "@fisio-app/ui/lib/cn";
import type { BlockedTime } from "@/api/blocked-times";
import { BLOCKED_STYLE } from "./calendar-styles";

interface BlockedTimeBlockProps {
  blockedTime: BlockedTime;
  position: { top: number; height: number };
  onSelect: (blockedTime: BlockedTime) => void;
}

export function BlockedTimeBlock({ blockedTime, position, onSelect }: BlockedTimeBlockProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(blockedTime)}
      style={{ top: position.top, height: position.height }}
      className={cn(
        "absolute inset-x-0.5 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left text-xs md:px-2",
        BLOCKED_STYLE.block,
      )}
    >
      <span className="block truncate">{BLOCKED_STYLE.label}</span>
    </button>
  );
}
