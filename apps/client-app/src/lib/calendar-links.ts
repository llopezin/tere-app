export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startAt: Date;
  endAt: Date;
}

/** Format a Date as YYYYMMDDTHHmmssZ (UTC, no separators). */
function formatUtc(date: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    pad(date.getUTCFullYear(), 4) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

export function buildGoogleUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatUtc(event.startAt)}/${formatUtc(event.endAt)}`,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startAt.toISOString(),
    enddt: event.endAt.toISOString(),
    body: event.description,
    location: event.location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Escape text per RFC 5545: backslash, comma, semicolon, newline. */
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold ICS lines to a maximum of 75 octets per RFC 5545 §3.1.
 * Continuation lines begin with a single SPACE.
 */
function foldLine(line: string): string {
  const MAX = 75;
  const encoder = new TextEncoder();

  if (encoder.encode(line).length <= MAX) return line;

  const parts: string[] = [];
  let current = "";

  for (const char of line) {
    const candidate = current + char;
    if (encoder.encode(candidate).length > (parts.length === 0 ? MAX : MAX - 1)) {
      parts.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current) parts.push(current);

  return parts.join("\r\n ");
}

export function buildIcs(event: CalendarEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fisio App//ES",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(event.id)}`,
    `DTSTART:${formatUtc(event.startAt)}`,
    `DTEND:${formatUtc(event.endAt)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
