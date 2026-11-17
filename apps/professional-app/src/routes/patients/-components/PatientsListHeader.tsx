import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@fisio-app/ui/Badge";
import { Card } from "@fisio-app/ui/Card";
import { Input } from "@fisio-app/ui/Input";
import { plural } from "@/lib/plural";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";

interface PatientsListHeaderProps {
  /** Active search, from the URL. */
  q: string | undefined;
  /** Patients matching the search; undefined until the first page loads. */
  total: number | undefined;
  /** Receives the trimmed search text, undefined when it is blank. */
  onSearch: (q: string | undefined) => void;
}

function countLabel(total: number, searching: boolean) {
  return searching
    ? plural(total, "resultado", "resultados")
    : plural(total, "paciente", "pacientes");
}

export function PatientsListHeader({ q, total, onSearch }: PatientsListHeaderProps) {
  const [input, setInput] = useState(q ?? "");
  const [prevQ, setPrevQ] = useState(q);
  // The last search this field sent, so its own navigation is not mistaken for back/forward.
  const [sentQ, setSentQ] = useState(q);
  const debouncedSearch = useDebouncedCallback((value: string) => {
    // Same normalisation as the route's `q`, so sentQ compares equal to the q it produces
    const next = value.trim() || undefined;
    setSentQ(next);
    onSearch(next);
  }, 300);

  // Back/forward changes q without typing: show it, without remounting the focused input.
  // Comparing with sentQ, not the live input, keeps keys typed while the navigation resolves.
  if (q !== prevQ) {
    setPrevQ(q);
    if (q !== sentQ) {
      // A search still waiting to be sent would undo this navigation
      debouncedSearch.cancel();
      setSentQ(q);
      setInput(q ?? "");
    }
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
        maxLength={100}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          debouncedSearch(e.target.value);
        }}
      />
    </Card>
  );
}
