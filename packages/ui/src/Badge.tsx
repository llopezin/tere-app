type BadgeVariant = "info" | "success" | "neutral" | "danger";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  info: "bg-info/10 text-info",
  success: "bg-status-confirmed-bg text-status-confirmed-text",
  neutral: "bg-status-cancelled-bg text-status-cancelled-text",
  danger: "bg-status-noshow-bg text-status-noshow-text",
};

export function Badge({ variant, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
