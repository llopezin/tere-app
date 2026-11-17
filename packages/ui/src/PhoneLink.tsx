import { type ReactNode } from "react";
import { cn } from "./lib/cn";

interface PhoneLinkProps {
  phone: string;
  className?: string;
  children?: ReactNode;
}

/** Calls the number on devices that can. `tel:` takes only digits and a leading +, so the formatting is dropped. */
export function PhoneLink({ phone, className, children }: PhoneLinkProps) {
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
      className={cn("hover:text-primary-600 hover:underline", className)}
    >
      {children ?? phone}
    </a>
  );
}
