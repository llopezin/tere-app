import { type ReactNode } from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "./cn";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  children,
  className,
}: CheckboxProps) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 cursor-pointer text-sm text-text-secondary",
        className,
      )}
    >
      <RadixCheckbox.Root
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val === true)}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2",
          checked
            ? "border-primary-600 bg-primary-600"
            : "border-border-strong bg-surface",
        )}
      >
        <RadixCheckbox.Indicator>
          <Check className="size-3.5 text-text-inverted" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <span>{children}</span>
    </label>
  );
}
