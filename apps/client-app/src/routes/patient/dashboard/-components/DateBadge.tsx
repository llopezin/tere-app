interface DateBadgeProps {
  date: Date;
}

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DateBadge({ date }: DateBadgeProps) {
  return (
    <div className="flex min-w-[4rem] flex-col items-center rounded-lg bg-primary-50 px-3 py-2">
      <span className="text-2xl font-bold leading-tight text-primary-600">
        {date.getDate()}
      </span>
      <span className="text-xs font-medium uppercase text-primary-600">
        {MONTHS[date.getMonth()]}
      </span>
      <span className="mt-0.5 text-xs text-primary-500">
        {formatTime(date)}
      </span>
    </div>
  );
}
