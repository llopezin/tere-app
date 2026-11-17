import { Link } from "@tanstack/react-router";
import { Calendar, Euro, LayoutGrid, Settings, Users, type LucideIcon } from "lucide-react";

const tabStyles =
  "flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium";

/** Sections that do not exist yet are shown disabled. */
function DisabledTab({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span aria-disabled="true" className={`${tabStyles} cursor-not-allowed text-text-muted`}>
      <Icon className="size-4" />
      {label}
    </span>
  );
}

export function PanelTabs() {
  return (
    <nav className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 md:px-8">
        <DisabledTab icon={LayoutGrid} label="Dashboard" />
        <Link
          to="/calendar"
          className={`${tabStyles} text-text-secondary hover:text-text`}
          activeProps={{ className: "border-primary-600! text-primary-600!" }}
        >
          <Calendar className="size-4" />
          Calendario
        </Link>
        <Link
          to="/patients"
          className={`${tabStyles} text-text-secondary hover:text-text`}
          activeProps={{ className: "border-primary-600! text-primary-600!" }}
        >
          <Users className="size-4" />
          Pacientes
        </Link>
        <DisabledTab icon={Euro} label="Facturación" />
        <Link
          to="/ajustes/integraciones"
          className={`${tabStyles} text-text-secondary hover:text-text`}
          activeProps={{ className: "border-primary-600! text-primary-600!" }}
        >
          <Settings className="size-4" />
          Configuración
        </Link>
      </div>
    </nav>
  );
}
