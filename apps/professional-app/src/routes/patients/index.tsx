import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Card } from "@fisio-app/ui/Card";
import { Pagination } from "@fisio-app/ui/Pagination";
import { authClient } from "@/lib/auth-client";
import { patientsListQueryOptions } from "@/api/patients-list";
import { PanelHeader } from "../-components/PanelHeader";
import { PanelTabs } from "../-components/PanelTabs";
import { PatientsListHeader } from "./-components/PatientsListHeader";
import { PatientCard } from "./-components/PatientCard";
import { PatientCardSkeleton } from "./-components/PatientCardSkeleton";

const searchSchema = z.object({
  /** 1-based; page 1 is left out of the URL. */
  page: z.number().int().positive().optional().catch(undefined),
  /** coerce keeps `?q=123`, which the router parses as a number. */
  q: z.coerce.string().optional().catch(undefined),
});

/** Page 1 is the default, so it is kept out of the URL. */
const toSearchPage = (page: number) => (page === 1 ? undefined : page);

export const Route = createFileRoute("/patients/")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.session || session.data.user.role !== "professional") {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1, q: search.q }),
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(patientsListQueryOptions(deps));
  },
  component: PatientsPage,
});

function PatientsPage() {
  const { page = 1, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const patients = useQuery(patientsListQueryOptions({ page, q }));
  const totalPages = patients.data ? Math.ceil(patients.data.total / patients.data.per_page) : 0;

  // A new search starts at page 1; replace keeps one history entry per search session.
  const search = (value: string) => {
    void navigate({ search: { q: value || undefined, page: undefined }, replace: true });
  };

  const goToPage = (p: number) => {
    void navigate({ search: (prev) => ({ ...prev, page: toSearchPage(p) }) });
    window.scrollTo({ top: 0 });
  };

  // A stale link or a shrunken list: show the last page that exists.
  if (patients.data && !patients.isPlaceholderData && page > totalPages && totalPages > 0) {
    return (
      <Navigate to="." search={(prev) => ({ ...prev, page: toSearchPage(totalPages) })} replace />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary-50/60 via-background to-green-50/40">
      <PanelHeader />
      <PanelTabs />

      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <PatientsListHeader q={q} total={patients.data?.total} onSearch={search} />

          {patients.isError && (
            <p role="alert" className="flex items-center gap-2 text-sm text-danger">
              <AlertCircle className="size-4" />
              No se pudo cargar el listado de pacientes. Inténtalo de nuevo más tarde.
            </p>
          )}

          {patients.isPending && (
            <div className="flex flex-col gap-4">
              <PatientCardSkeleton />
              <PatientCardSkeleton />
              <PatientCardSkeleton />
            </div>
          )}

          {patients.data?.total === 0 && (
            <Card className="text-center text-text-secondary">
              {q ? `Sin resultados para «${q}»` : "Aún no tienes pacientes"}
            </Card>
          )}

          {patients.data && patients.data.total > 0 && (
            <div
              className={
                patients.isPlaceholderData
                  ? "flex flex-col gap-4 opacity-60 transition-opacity"
                  : "flex flex-col gap-4"
              }
            >
              {patients.data.data.map((patient) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
          )}
        </div>
      </main>
    </div>
  );
}
