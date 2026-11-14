import { User } from "lucide-react";
import { cn } from "./lib/cn";

type AvatarSize = "sm" | "md";

interface AvatarProps {
  size?: AvatarSize;
  /** Shown instead of the user icon, e.g. "MG". */
  initials?: string;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; icon: string }> = {
  sm: { container: "size-8", icon: "size-4" },
  md: { container: "size-10", icon: "size-5" },
};

export function Avatar({ size = "md", initials, className }: AvatarProps) {
  const s = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border-2 border-primary-600 bg-primary-50",
        s.container,
        className,
      )}
    >
      {initials ? (
        <span className="text-sm font-semibold text-primary-600">{initials}</span>
      ) : (
        <User className={cn("text-primary-600", s.icon)} />
      )}
    </div>
  );
}
