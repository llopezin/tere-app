import { type ReactNode } from "react";
import { cn } from "./lib/cn";

export interface SegmentedTab<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Accessible name of the tab list. */
  label: string;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onValueChange,
  label,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-1 rounded-lg bg-background p-1", className)}>
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
              selected ? "bg-surface text-primary-600 shadow-sm" : "text-text-secondary hover:text-text",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
