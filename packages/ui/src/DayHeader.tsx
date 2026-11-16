import { cn } from "./lib/cn";
import { SHORT_MONTHS } from "./lib/week";

interface DayHeaderProps {
  day: Date;
  label: string;
  isToday?: boolean;
  className?: string;
}

export function DayHeader({ day, label, isToday, className }: DayHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-0.5",
        isToday ? "text-primary-700" : "text-text",
        className,
      )}
    >
      <span className={cn("text-xs", !isToday && "text-text-muted")}>{label}</span>
      <span className="text-lg font-bold">{day.getDate()}</span>
      <span className={cn("text-xs", !isToday && "text-text-secondary")}>
        {SHORT_MONTHS[day.getMonth()]}
      </span>
    </div>
  );
}
