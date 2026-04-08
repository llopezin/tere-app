import { type InputHTMLAttributes, type ReactNode, forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, type, className, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const innerId = useId();
    const inputId = id || innerId;

    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className={cn("relative h-13 w-full", className)}>
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 text-text-muted">
            {icon}
          </span>
        )}

        <input
          id={inputId}
          ref={ref}
          type={inputType}
          placeholder=" "
          className={cn(
            "peer h-full w-full rounded-lg border border-border bg-input-bg pb-1 pt-5 text-sm text-text transition-all focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 not-focus:placeholder-transparent",
            icon ? "pl-10 pr-3" : "px-3",
            isPassword && "pr-10",
          )}
          {...props}
        />

        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-text-muted transition-all duration-200",
            "peer-focus:top-4 peer-focus:text-xs peer-focus:text-primary-600",
            "peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-xs",
            icon ? "left-10" : "left-3",
          )}
        >
          {label}
        </label>

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary"
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
          </button>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
