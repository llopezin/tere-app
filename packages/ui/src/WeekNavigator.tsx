import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./lib/cn";

interface WeekNavigatorProps {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  className?: string;
}

const arrowStyles =
  "flex size-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";

export function WeekNavigator({
  label,
  onPrevious,
  onNext,
  previousDisabled,
  className,
}: WeekNavigatorProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <button
        type="button"
        aria-label="Semana anterior"
        disabled={previousDisabled}
        onClick={onPrevious}
        className={arrowStyles}
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="text-sm font-medium text-text">{label}</span>
      <button type="button" aria-label="Semana siguiente" onClick={onNext} className={arrowStyles}>
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
