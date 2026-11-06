import { IntegracionesView } from "./IntegracionesView";

// The Google OAuth callback redirects here with ?gcal=connected|error&reason=...
export default async function IntegracionesPage({
  searchParams,
}: PageProps<"/ajustes/integraciones">) {
  const { gcal, reason } = await searchParams;

  return (
    <IntegracionesView
      gcal={gcal === "connected" || gcal === "error" ? gcal : undefined}
      reason={typeof reason === "string" ? reason : undefined}
    />
  );
}
