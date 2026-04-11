import { useId, useRef, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface RadioOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface RadioGroupProps {
  label: string;
  name: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  className?: string;
}

export function RadioGroup({
  label,
  name,
  value,
  onValueChange,
  options,
  className,
}: RadioGroupProps) {
  const labelId = useId();
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectedIndex = options.findIndex((o) => o.value === value);

  const focusOption = useCallback(
    (index: number) => {
      optionRefs.current[index]?.focus();
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      const len = options.length;
      let next: number | null = null;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        next = (index + 1) % len;
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        next = (index - 1 + len) % len;
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onValueChange(options[index].value);
        return;
      }

      if (next !== null) {
        onValueChange(options[next].value);
        focusOption(next);
      }
    },
    [options, onValueChange, focusOption],
  );

  return (
    <div className={className}>
      <span id={labelId} className="mb-1.5 block text-sm text-text-muted">
        {label}
      </span>

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex flex-wrap gap-3"
      >
        {options.map((option, i) => {
          const isSelected = option.value === value;

          return (
            <div
              key={option.value}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (selectedIndex === -1 && i === 0) ? 0 : -1}
              onClick={() => onValueChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={cn(
                "inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary-600 bg-primary-600/10 text-primary-600"
                  : "border-border bg-surface text-text-secondary hover:border-primary-600/40",
              )}
            >
              {option.icon && (
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {option.icon}
                </span>
              )}
              {option.label}
            </div>
          );
        })}
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

export type { RadioOption, RadioGroupProps };
