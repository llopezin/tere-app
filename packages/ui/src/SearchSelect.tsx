import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { cn } from "./lib/cn";

export interface SearchSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Short text on the right of the option, e.g. why it is disabled. */
  hint?: string;
}

interface SearchSelectProps {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  options: SearchSelectOption[];
  value: string | undefined;
  /** Label of the selected option; kept even when a new search no longer contains it. */
  selectedLabel: string | undefined;
  onValueChange: (option: SearchSelectOption) => void;
  searchValue: string;
  onSearchChange: (search: string) => void;
  isLoading?: boolean;
  emptyMessage: string;
  className?: string;
}

/** Select with a search box in its dropdown. The caller filters the options (e.g. on the server). */
export function SearchSelect({
  label,
  placeholder,
  searchPlaceholder,
  options,
  value,
  selectedLabel,
  onValueChange,
  searchValue,
  onSearchChange,
  isLoading = false,
  emptyMessage,
  className,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <span id={`${id}-label`} className="mb-1.5 block text-sm font-medium text-text">
        {label}
      </span>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-border bg-input-bg px-3 py-2.5 text-sm transition-colors",
          "hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1",
          open && "border-primary-600 ring-1 ring-primary-600",
          value ? "text-text" : "text-text-muted",
        )}
      >
        <span id={`${id}-value`} className="truncate">
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDown
          className={cn("ml-2 size-4 shrink-0 text-text-secondary transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              autoFocus
              type="search"
              aria-label={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-2.5 pl-9 pr-9 text-sm text-text placeholder:text-text-muted focus:outline-none"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-text-muted" />
            )}
          </div>

          <ul role="listbox" aria-labelledby={`${id}-label`} className="max-h-60 overflow-y-auto py-1">
            {options.length === 0 && !isLoading && (
              <li className="px-3 py-2.5 text-sm text-text-muted">{emptyMessage}</li>
            )}
            {options.map((option) => (
              <li key={option.value} role="option" aria-selected={value === option.value}>
                <button
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    onValueChange(option);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm",
                    "text-text hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:outline-none",
                    "disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent",
                    value === option.value && "bg-primary-50 font-medium",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {option.hint && <span className="shrink-0 text-xs text-text-muted">{option.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
