import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  googleCalendarStatusQueryOptions,
  useConnectGoogleCalendar,
  useDisconnectGoogleCalendar,
} from "@/api/google-calendar";
import { Button } from "@fisio-app/ui";

interface IntegracionesSearch {
  gcal?: "connected" | "error";
  reason?: string;
}

export const Route = createFileRoute("/ajustes/integraciones")({
  // The Google OAuth callback redirects here with ?gcal=connected|error&reason=...
  validateSearch: (search: Record<string, unknown>): IntegracionesSearch => ({
    gcal: search.gcal === "connected" || search.gcal === "error" ? search.gcal : undefined,
    reason: typeof search.reason === "string" ? search.reason : undefined,
  }),
  component: IntegracionesPage,
});

function IntegracionesPage() {
  const { gcal, reason } = Route.useSearch();
  const { data: status, isLoading } = useQuery(googleCalendarStatusQueryOptions());
  const connectMutation = useConnectGoogleCalendar();
  const disconnectMutation = useDisconnectGoogleCalendar();

  if (isLoading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Integraciones</h1>

      {gcal === "connected" && (
        <p role="status" className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Google Calendar conectado correctamente.
        </p>
      )}
      {gcal === "error" && (
        <p role="alert" className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">
          No se pudo conectar Google Calendar{reason ? ` (${reason})` : ""}.
        </p>
      )}

      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Google Calendar</h2>
            <p className="text-sm text-gray-500">
              Sincroniza tus citas con tu calendario de Google.
            </p>
          </div>

          {status?.connected ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-green-600 font-medium">Conectado: {status.email}</span>
              <Button
                variant="secondary"
                size="md"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? "Desconectando..." : "Desconectar"}
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? "Redirigiendo..." : "Conectar Google Calendar"}
            </Button>
          )}
        </div>

        {status?.lastSyncedAt && (
          <div className="mt-4 pt-4 border-t text-xs text-gray-400">
            Última sincronización: {new Date(status.lastSyncedAt).toLocaleString()}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-blue-50 text-blue-700 rounded-md text-sm">
        <strong>Nota:</strong> Esta es una versión simplificada para pruebas de integración.
      </div>
    </div>
  );
}
