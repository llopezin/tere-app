import { SquareCheck } from "lucide-react";
import { Button } from "@fisio-app/ui/Button";
import { Card } from "@fisio-app/ui/Card";
import { WeekNavigator } from "@fisio-app/ui/WeekNavigator";
import { addDays, formatWeekRange } from "@fisio-app/ui/lib/week";

interface CalendarToolbarProps {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
}

export function CalendarToolbar({ weekStart, onWeekChange }: CalendarToolbarProps) {
  return (
    <Card className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-xl font-semibold text-text">Calendario Semanal</h2>
        {/* Multi-select arrives with appointment creation. */}
        <Button variant="outline" disabled className="gap-2">
          <SquareCheck className="size-4" />
          Selección Múltiple
        </Button>
      </div>

      <div className="flex flex-col items-start gap-3">
        <Button variant="outline" onClick={() => onWeekChange(new Date())}>
          Hoy
        </Button>
        <WeekNavigator
          className="w-full md:w-80"
          label={formatWeekRange(weekStart, addDays(weekStart, 6))}
          onPrevious={() => onWeekChange(addDays(weekStart, -7))}
          onNext={() => onWeekChange(addDays(weekStart, 7))}
        />
      </div>
    </Card>
  );
}
