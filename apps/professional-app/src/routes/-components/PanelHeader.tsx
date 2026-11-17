import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@fisio-app/ui/Avatar";
import { initialsOf } from "@fisio-app/ui/lib/initials";
import { professionalProfileQueryOptions } from "@/api/professional-profile";

export function PanelHeader() {
  const { data: profile } = useQuery(professionalProfileQueryOptions());

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 md:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Volver al inicio</span>
        </Link>

        <h1 className="text-lg font-medium text-text md:text-2xl">Panel Profesional</h1>

        {profile && (
          <div className="flex items-center justify-end gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-text">
                {profile.firstName} {profile.lastName}
              </p>
              {profile.businessName && (
                <p className="text-xs text-text-secondary">{profile.businessName}</p>
              )}
            </div>
            <Avatar initials={initialsOf(profile.firstName, profile.lastName)} />
          </div>
        )}
      </div>
    </header>
  );
}
