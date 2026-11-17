import { useState } from "react";
import { CalendarPlus, Lock } from "lucide-react";
import { Modal } from "@fisio-app/ui/Modal";
import { SegmentedTabs } from "@fisio-app/ui/SegmentedTabs";
import { AppointmentForm } from "./AppointmentForm";
import { BlockTimeForm } from "./BlockTimeForm";

export type CalendarEntryKind = "appointment" | "block";

export interface CalendarDraft {
  startAt: Date;
  kind: CalendarEntryKind;
}

interface AddToCalendarModalProps {
  draft: CalendarDraft | null;
  onClose: () => void;
}

export function AddToCalendarModal({ draft, onClose }: AddToCalendarModalProps) {
  return (
    <Modal
      open={draft !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Añadir al calendario"
      subtitle="Crea una cita o bloquea un horario"
      // No inner scroll: it would clip the patient and type dropdowns
      className="max-w-lg"
    >
      {/* A new draft starts a fresh form */}
      {draft && (
        <DraftForms
          key={`${draft.startAt.getTime()}-${draft.kind}`}
          draft={draft}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function DraftForms({ draft, onClose }: { draft: CalendarDraft; onClose: () => void }) {
  const [kind, setKind] = useState(draft.kind);

  return (
    <div className="flex flex-col gap-5">
      <SegmentedTabs
        label="Qué añadir"
        value={kind}
        onValueChange={setKind}
        tabs={[
          { value: "appointment", label: "Cita", icon: <CalendarPlus className="size-4" /> },
          { value: "block", label: "Bloquear horario", icon: <Lock className="size-4" /> },
        ]}
      />
      {kind === "appointment" ? (
        <AppointmentForm startAt={draft.startAt} onDone={onClose} />
      ) : (
        <BlockTimeForm startAt={draft.startAt} onDone={onClose} />
      )}
    </div>
  );
}
