import { SHORT_MONTHS, formatTime } from "@fisio-app/ui/lib/week";

interface DateBadgeProps {
  date: Date;
}

export function DateBadge({ date }: DateBadgeProps) {
  return (
    <div className="flex min-w-[4rem] flex-col items-center rounded-lg bg-primary-50 px-3 py-2">
      <span className="text-2xl font-bold leading-tight text-primary-600">{date.getDate()}</span>
      <span className="text-xs font-medium uppercase text-primary-600">
        {SHORT_MONTHS[date.getMonth()]}
      </span>
      <span className="mt-0.5 text-xs text-primary-500">{formatTime(date)}</span>
    </div>
  );
}
