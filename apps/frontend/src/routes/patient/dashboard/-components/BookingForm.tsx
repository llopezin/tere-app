import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/Select";
import { client } from "@/lib/client";

interface AppointmentTypeOption extends SelectOption {
  durationMinutes: number;
  price: string;
}

interface ProfessionalOption extends SelectOption {
  subtitle: string;
}

const consultationTypes: AppointmentTypeOption[] = [
  { value: "1", label: "Fisioterapia General", durationMinutes: 60, price: "45.00" },
  { value: "2", label: "Rehabilitación", durationMinutes: 45, price: "50.00" },
  { value: "3", label: "Masaje Terapéutico", durationMinutes: 30, price: "35.00" },
];

const professionals: ProfessionalOption[] = [
  { value: "1", label: "Ana García", subtitle: "Fisioterapeuta" },
  { value: "2", label: "Carlos López", subtitle: "Osteópata" },
];

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

function ProfessionalOptionRow({ option }: { option: ProfessionalOption }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-text">{option.label}</span>
      <span className="text-xs text-text-secondary">{option.subtitle}</span>
    </div>
  );
}

export function BookingForm() {
  const [consultationType, setConsultationType] = useState<string>();
  const [professional, setProfessional] = useState<string>();

  // Change to tanstack query when ready
  useEffect(() => {
    client
  });

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-text">Reservar una Cita</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Selecciona el tipo de consulta, profesional y horario disponible
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Tipo de Consulta"
          placeholder="Selecciona un tipo..."
          options={consultationTypes}
          value={consultationType}
          onValueChange={setConsultationType}
          renderOption={(opt) => <ConsultationOption option={opt} />}
        />
        <Select
          label="Profesional"
          placeholder="Selecciona un profesional..."
          options={professionals}
          value={professional}
          onValueChange={setProfessional}
          renderOption={(opt) => <ProfessionalOptionRow option={opt} />}
        />
      </div>
    </Card>
  );
}
