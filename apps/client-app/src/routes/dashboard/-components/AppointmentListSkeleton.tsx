/** Placeholder with the shape of two `AppointmentCard`s while the list loads. */
export function AppointmentListSkeleton() {
  return (
    <div role="status" aria-label="Cargando citas" className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-start gap-4 rounded-lg border border-border bg-surface p-4"
        >
          <div className="h-[4.5rem] w-16 rounded-lg bg-neutral-100" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="h-4 w-1/2 rounded bg-neutral-100" />
            <div className="h-3 w-1/3 rounded bg-neutral-100" />
            <div className="h-3 w-1/4 rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
