import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchSelect, type SearchSelectOption } from "@fisio-app/ui/SearchSelect";
import { patientOptionsQueryOptions } from "@/api/patient-options";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";

const SEARCH_DEBOUNCE_MS = 300;

export interface PickedPatient {
  id: string;
  name: string;
}

interface PatientPickerProps {
  value: PickedPatient | undefined;
  onChange: (patient: PickedPatient) => void;
}

export function PatientPicker({ value, onChange }: PatientPickerProps) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const updateSearch = useDebouncedCallback(
    (text: string) => setSearch(text.trim() || undefined),
    SEARCH_DEBOUNCE_MS,
  );
  const patients = useQuery(patientOptionsQueryOptions(search));

  const options: SearchSelectOption[] = (patients.data?.data ?? []).map((p) => ({
    value: p.id,
    label: `${p.firstName} ${p.lastName}`,
    // The backend refuses to book a patient without signed RGPD
    disabled: !p.rgpdSigned,
    hint: p.rgpdSigned ? undefined : "RGPD pendiente",
  }));

  return (
    <SearchSelect
      label="Paciente *"
      placeholder="Selecciona un paciente"
      searchPlaceholder="Buscar por nombre…"
      options={options}
      value={value?.id}
      selectedLabel={value?.name}
      onValueChange={(option) => onChange({ id: option.value, name: option.label })}
      searchValue={input}
      onSearchChange={(text) => {
        setInput(text);
        updateSearch(text);
      }}
      isLoading={patients.isFetching}
      emptyMessage={
        patients.isError
          ? "No se pudieron cargar los pacientes."
          : search
            ? "Sin resultados"
            : "No hay pacientes"
      }
    />
  );
}
