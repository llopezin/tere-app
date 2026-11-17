import { type ReactNode } from "react";
import { cn } from "./lib/cn";

interface EmailLinkProps {
  email: string;
  className?: string;
  children?: ReactNode;
}

/** Opens the user's mail app. Shows the address unless `children` is given. */
export function EmailLink({ email, className, children }: EmailLinkProps) {
  return (
    <a href={`mailto:${email}`} className={cn("hover:text-primary-600 hover:underline", className)}>
      {children ?? email}
    </a>
  );
}
