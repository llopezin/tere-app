import { useEffect, useState } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/Select";
import { professionalsQueryOptions } from "@/api/professionals";
import { appointmentTypesQueryOptions } from "@/api/appointment-types";
import { WeeklySchedule } from "./WeeklySchedule";
import { BookingConfirmationModal } from "./BookingConfirmationModal";

interface ProfessionalOption extends SelectOption {
  subtitle: string;
}

interface AppointmentTypeOption extends SelectOption {
  durationMinutes: number;
  price: string;
}

function ProfessionalOptionRow({ option }: { option: ProfessionalOption }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-text">{option.label}</span>
      <span className="text-xs text-text-secondary">{option.subtitle}</span>
    </div>
  );
}

function ConsultationOption({ option }: { option: AppointmentTypeOption }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-text">{option.label}</span>
      <span className="flex items-center gap-1 text-xs text-text-secondary">
        <Clock className="size-3" />
        {option.durationMinutes} min · €{option.price}
      </span>
    </div>
  );
}

export function BookingForm() {
  const { data: professionalsData } = useSuspenseQuery(
    professionalsQueryOptions(),
  );

  const professionalOptions: ProfessionalOption[] = professionalsData.data.map(
    (p) => ({
      value: p.id,
      label: [p.firstName, p.lastName].join(" "),
      subtitle: p.businessName ?? "Profesional",
    }),
  );

  // Auto-select first professional on load
  const [professional, setProfessional] = useState<string>(
    () => professionalOptions[0]?.value ?? "",
  );
  const [consultationType, setConsultationType] = useState<string>();
  const [selectedSlot, setSelectedSlot] = useState<{
    startAt: string;
    endAt: string;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Reset consultation type when professional changes
  useEffect(() => {
    setConsultationType(undefined);
    setSelectedSlot(null);
  }, [professional]);

  const selectedProfessional = professionalOptions.find(
    (p) => p.value === professional,
  );

  const { data: appointmentTypesData, isLoading: loadingTypes } = useQuery({
    ...appointmentTypesQueryOptions(professional),
    enabled: !!professional,
  });

  const consultationTypes: AppointmentTypeOption[] = (
    appointmentTypesData?.data ?? []
  ).map((at) => ({
    value: at.id,
    label: at.name,
    durationMinutes: at.durationMinutes,
    price: at.price,
  }));

  const selectedConsultation = consultationTypes.find(
    (c) => c.value === consultationType,
  );

  const handleSlotSelect = (slot: { startAt: string; endAt: string }) => {
    setSelectedSlot(slot);
    setModalOpen(true);
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-text">Reservar una Cita</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Selecciona el profesional, tipo de consulta y horario disponible
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Profesional"
          placeholder="Selecciona un profesional..."
          options={professionalOptions}
          value={professional}
          onValueChange={setProfessional}
          renderOption={(opt) => <ProfessionalOptionRow option={opt} />}
        />
        <Select
          label={
            selectedProfessional
              ? `Consultas de ${selectedProfessional.label}`
              : "Tipo de Consulta"
          }
          placeholder={
            loadingTypes ? "Cargando..." : "Selecciona un tipo..."
          }
          options={consultationTypes}
          value={consultationType}
          onValueChange={setConsultationType}
          renderOption={(opt) => <ConsultationOption option={opt} />}
        />
      </div>

      {professional && consultationType && (
        <div className="mt-6">
          <WeeklySchedule
            professionalId={professional}
            appointmentTypeId={consultationType}
            onSlotSelect={handleSlotSelect}
          />
        </div>
      )}

      <BookingConfirmationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        slot={selectedSlot}
        professionalName={selectedProfessional?.label ?? ""}
        consultationName={selectedConsultation?.label ?? ""}
      />
    </Card>
  );
}
