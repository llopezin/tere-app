import { type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "./cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className, id, rows = 2, ...props }, ref) => {
    const innerId = useId();
    const textareaId = id || innerId;
    return (
      <div className={cn("relative w-full", className)}>
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          placeholder=" "
          className={cn(
            "peer min-h-[3rem] w-full resize-none rounded-lg border border-border bg-input-bg px-3 pb-2 pt-5 text-sm text-text transition-all focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 not-focus:placeholder-transparent",
          )}
          {...props}
        />
        <label
          htmlFor={textareaId}
          className={cn(
            "pointer-events-none absolute left-3 top-3 text-sm text-text-muted transition-all duration-200",
            "peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-primary-600",
            "peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs",
          )}
        >
          {label}
        </label>
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
