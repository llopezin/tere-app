import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/client";
import { Button } from "@fisio-app/ui";

export const Route = createFileRoute("/ajustes/integraciones")({
  component: IntegracionesPage,
});

function IntegracionesPage() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["gcal-status"],
    queryFn: async () => {
      // Correct RPC path: /api/v1/integrations/google-calendar/status
      const res = await client.integrations["google-calendar"].status.$get();
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      // Correct RPC path: /api/v1/integrations/google-calendar/connect (POST)
      const res = await client.integrations['google-calendar'].connect.$post();
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Connect failed:', errorData);
        throw new Error('Failed to connect');
      }
      
      const { authUrl } = await res.json();
      
      if (!authUrl) {
        console.error('authUrl is missing from response data');
        throw new Error('authUrl is missing');
      }
      
      window.location.href = authUrl;
    },
  });


  const disconnectMutation = useMutation({
    mutationFn: async () => {
      // Correct RPC path: /api/v1/integrations/google-calendar/disconnect (POST)
      const res = await client.integrations["google-calendar"].disconnect.$post();
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gcal-status"] });
    },
  });

  if (isLoading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Integraciones</h1>

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
