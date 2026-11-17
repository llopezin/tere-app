import { Card } from "@fisio-app/ui/Card";

export function PatientCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Card className="flex animate-pulse gap-4">
        <div className="size-14 shrink-0 rounded-full bg-background" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="h-5 w-40 rounded bg-background" />
          <div className="h-4 w-64 max-w-full rounded bg-background" />
          <div className="h-4 w-48 rounded bg-background" />
        </div>
      </Card>
    </div>
  );
}
