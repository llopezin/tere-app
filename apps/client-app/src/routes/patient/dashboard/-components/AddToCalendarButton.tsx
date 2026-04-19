import { useState, useRef, useEffect } from "react";
import { CalendarPlus, Chrome, Mail, Apple, Download } from "lucide-react";
import { Button } from "@fisio-app/ui";
import { buildGoogleUrl, buildOutlookUrl, buildIcs } from "@/lib/calendar-links";
import type { CalendarEvent } from "@/lib/calendar-links";

interface AddToCalendarButtonProps {
  event: CalendarEvent;
}

export function AddToCalendarButton({ event }: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function downloadIcs() {
    const blob = new Blob([buildIcs(event)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cita.ics";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  const options = [
    {
      label: "Google Calendar",
      icon: <Chrome className="size-4" />,
      onClick: () => {
        window.open(buildGoogleUrl(event), "_blank");
        setOpen(false);
      },
    },
    {
      label: "Outlook",
      icon: <Mail className="size-4" />,
      onClick: () => {
        window.open(buildOutlookUrl(event), "_blank");
        setOpen(false);
      },
    },
    {
      label: "Apple Calendar",
      icon: <Apple className="size-4" />,
      onClick: downloadIcs,
    },
    {
      label: "Descargar .ics",
      icon: <Download className="size-4" />,
      onClick: downloadIcs,
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        className="gap-1.5 px-3 py-1.5 text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarPlus className="size-3.5" />
        Añadir al calendario
      </Button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-1 min-w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={opt.onClick}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-background"
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
