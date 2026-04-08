import { Calendar, Stethoscope } from "lucide-react";
import { cn } from "@/lib/cn";

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
      <div className={cn("flex items-center", isSmall ? "gap-1.5" : "gap-2")}>
        <Stethoscope className={cn("text-primary-600", isSmall ? "size-5" : "size-7")} />
        <span
          className={cn(
            "font-bold tracking-tight text-text",
            isSmall ? "text-lg" : "text-2xl",
          )}
        >
          Fisio Fácil
        </span>
      </div>
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
