import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

interface DetailItemProps {
  label: string;
  children: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
}

export function DetailItem({ label, children, icon: Icon, hint }: DetailItemProps) {
  return (
    <div className="flex gap-3">
      {Icon && <Icon className="mt-0.5 size-5 shrink-0 text-text-muted" />}
      <div className="min-w-0">
        <p className="text-sm text-text-secondary">{label}</p>
        <div className="font-semibold text-text break-words">{children}</div>
        {hint && <p className="text-sm text-text-secondary">{hint}</p>}
      </div>
    </div>
  );
}
