import { LockOpen } from "lucide-react";
import { Modal } from "@fisio-app/ui/Modal";
import { Button } from "@fisio-app/ui/Button";
import { formatDayMonth, formatTime, isSameDay } from "@fisio-app/ui/lib/week";
import { useDeleteBlockedTime, type BlockedTime } from "@/api/blocked-times";

function formatRange(startAt: Date, endAt: Date) {
  if (isSameDay(startAt, endAt)) {
    return `${formatDayMonth(startAt)}, ${formatTime(startAt)} – ${formatTime(endAt)}`;
  }
  return `${formatDayMonth(startAt)} ${formatTime(startAt)} – ${formatDayMonth(endAt)} ${formatTime(endAt)}`;
}

interface BlockedTimeModalProps {
  blockedTime: BlockedTime | null;
  onClose: () => void;
}

export function BlockedTimeModal({ blockedTime, onClose }: BlockedTimeModalProps) {
  return (
    <Modal
      open={blockedTime !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Horario bloqueado"
      subtitle={
        blockedTime && formatRange(new Date(blockedTime.startAt), new Date(blockedTime.endAt))
      }
    >
      {blockedTime && <UnblockActions key={blockedTime.id} id={blockedTime.id} onClose={onClose} />}
    </Modal>
  );
}

function UnblockActions({ id, onClose }: { id: string; onClose: () => void }) {
  const unblock = useDeleteBlockedTime();

  return (
    <div className="flex flex-col gap-4">
      {unblock.isError && (
        <p role="alert" className="text-sm text-danger">
          No se pudo desbloquear el horario. Inténtalo de nuevo.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button
          variant="danger"
          disabled={unblock.isPending}
          onClick={() => unblock.mutate(id, { onSuccess: onClose })}
          className="gap-2"
        >
          <LockOpen className="size-4" />
          Desbloquear
        </Button>
      </div>
    </div>
  );
}
