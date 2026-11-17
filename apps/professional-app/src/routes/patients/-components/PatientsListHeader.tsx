import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@fisio-app/ui/Badge";
import { Card } from "@fisio-app/ui/Card";
import { Input } from "@fisio-app/ui/Input";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";

interface PatientsListHeaderProps {
  /** Active search, from the URL. */
  q: string | undefined;
  /** Patients matching the search; undefined until the first page loads. */
  total: number | undefined;
  /** Receives the trimmed search text. */
  onSearch: (q: string) => void;
}

function countLabel(total: number, searching: boolean) {
  if (searching) return total === 1 ? "1 resultado" : `${total} resultados`;
  return total === 1 ? "1 paciente" : `${total} pacientes`;
}

export function PatientsListHeader({ q, total, onSearch }: PatientsListHeaderProps) {
  const [input, setInput] = useState(q ?? "");
  const [prevQ, setPrevQ] = useState(q);
  const debouncedSearch = useDebouncedCallback(onSearch, 300);

  // Back/forward changes q without typing: show it, without remounting the focused input.
  // Our own navigation sends the trimmed text, so it must not drop a trailing space being typed.
  if (q !== prevQ) {
    setPrevQ(q);
    if ((q ?? "") !== input.trim()) setInput(q ?? "");
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Listado de Pacientes</h2>
          <p className="text-text-secondary">Gestiona la información de tus pacientes</p>
        </div>
        {total !== undefined && (
          <Badge variant="info" className="shrink-0">
            {countLabel(total, q !== undefined)}
          </Badge>
        )}
      </div>

      <Input
        type="search"
        label="Buscar pacientes"
        hideLabel
        placeholder="Buscar por nombre o email..."
        icon={<Search className="size-4" />}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          debouncedSearch(e.target.value.trim());
        }}
      />
    </Card>
  );
}
