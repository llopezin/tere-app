import { type ReactNode } from "react";
import { cn } from "./cn";

type InfoBannerVariant = "info" | "warning";

interface InfoBannerProps {
  children: ReactNode;
  variant?: InfoBannerVariant;
  className?: string;
}

const variantStyles: Record<InfoBannerVariant, string> = {
  info: "bg-notice-bg border-notice-border",
  warning: "bg-status-pending-bg border-warning/40",
};

export function InfoBanner({
  children,
  variant = "info",
  className,
}: InfoBannerProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 text-sm text-text-secondary",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
