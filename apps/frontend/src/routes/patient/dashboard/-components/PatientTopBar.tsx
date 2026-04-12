import { ArrowLeft, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Avatar } from "@/components/ui/Avatar";
import { patientProfileQueryOptions } from "@/api/patient-profile";

export function PatientTopBar() {
  const { data: profile } = useQuery(patientProfileQueryOptions());
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : null;
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
      {/* Left — back arrow */}
      <Link
        to="/patient/welcome"
        className="flex items-center justify-center rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-neutral-100 hover:text-text"
        aria-label="Volver"
      >
        <ArrowLeft className="size-5" />
      </Link>

      {/* Center — brand */}
      <BrandLogo size="sm" subtitle="Pacientes" />

      {/* Right — user info + logout */}
      {/* Desktop */}
      <div className="hidden items-center gap-3 md:flex">
        <div className="text-right">
          <p className="text-sm font-semibold text-text">{fullName ?? "—"}</p>
          <p className="text-xs text-text-muted">Paciente</p>
        </div>
        <Avatar size="sm" />
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-text-secondary transition-colors hover:bg-neutral-100 hover:text-text"
        >
          <LogOut className="size-4" />
          Salir
        </button>
      </div>

      {/* Mobile */}
      <div className="flex items-center gap-2 md:hidden">
        <Avatar size="sm" />
        <button
          type="button"
          className="flex items-center justify-center rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-neutral-100 hover:text-text"
          aria-label="Cerrar sesión"
        >
          <LogOut className="size-5" />
        </button>
      </div>
    </header>
  );
}
