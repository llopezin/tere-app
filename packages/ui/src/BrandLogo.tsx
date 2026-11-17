import { Calendar } from "lucide-react";
import logo from "./assets/logo-quintana.png";
import { cn } from "./lib/cn";

type BrandLogoSize = "default" | "sm";

interface BrandLogoProps {
  subtitle?: string;
  iconOnly?: boolean;
  size?: BrandLogoSize;
  className?: string;
}

export function BrandLogo({ subtitle, iconOnly, size = "default", className }: BrandLogoProps) {
  if (iconOnly) {
    return (
      <div
        className={cn(
          "mx-auto flex size-14 items-center justify-center rounded-full bg-primary-50",
          className,
        )}
      >
        <Calendar className="size-8 text-primary-600" />
      </div>
    );
  }

  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "flex",
        isSmall ? "flex-col items-center gap-0" : "flex-col items-center gap-1",
        className,
      )}
    >
      <img
        src={logo}
        alt="Quintana Fisioterapia"
        className={cn("w-auto", isSmall ? "h-8" : "h-16")}
      />
      {subtitle && (
        <span
          className={cn(
            isSmall ? "text-xs text-text-muted" : "text-sm text-text-secondary",
          )}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
