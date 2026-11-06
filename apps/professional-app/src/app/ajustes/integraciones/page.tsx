import { IntegracionesView } from "./IntegracionesView";

interface IntegracionesPageProps {
  searchParams: Promise<{ gcal?: string | string[]; reason?: string | string[] }>;
}

// The Google OAuth callback redirects here with ?gcal=connected|error&reason=...
export default async function IntegracionesPage({ searchParams }: IntegracionesPageProps) {
  const { gcal, reason } = await searchParams;

  return (
    <IntegracionesView
      gcal={gcal === "connected" || gcal === "error" ? gcal : undefined}
      reason={typeof reason === "string" ? reason : undefined}
    />
  );
}
