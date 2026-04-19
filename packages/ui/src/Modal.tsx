import { type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./cn";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-modal animate-scale-in focus:outline-none",
            className,
          )}
        >
          <div className="mb-5 pr-8">
            <Dialog.Title className="text-lg font-bold text-text">
              {title}
            </Dialog.Title>
            {subtitle && (
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                {subtitle}
              </Dialog.Description>
            )}
          </div>

          {children}

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-background hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
