export const SHORT_MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Monday-first labels. */
export const DAY_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"] as const;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Local midnight of the Monday of the week containing `date`. */
export function getWeekStart(date: Date): Date {
  const day = date.getDay();
  // getDay(): 0=Sun, 1=Mon … 6=Sat → shift so Monday=0
  return addDays(date, day === 0 ? -6 : 1 - day);
}

/** Local date as YYYY-MM-DD. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses YYYY-MM-DD as local midnight. */
export function fromISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

/** "23 de mar - 29 de mar 2026" */
export function formatWeekRange(start: Date, end: Date): string {
  return `${start.getDate()} de ${SHORT_MONTHS[start.getMonth()]} - ${end.getDate()} de ${SHORT_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}
