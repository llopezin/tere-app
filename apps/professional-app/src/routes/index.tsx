import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, Button, BrandLogo } from "@fisio-app/ui";
import { useSession, signOut } from "../lib/auth-client";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/login" });
    }
  }, [session, isPending, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="flex flex-col items-center space-y-6 p-8">
          <BrandLogo />
          <div className="text-center w-full">
            <h1 className="text-2xl font-bold text-primary-700 mb-1">
              Hola, {session.user.name}
            </h1>
            <p className="text-text-secondary mb-6">
              Panel de Control Profesional
            </p>
            
            <div className="space-y-3">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={() => navigate({ to: '/ajustes/integraciones' })}
              >
                Configurar Google Calendar
              </Button>

              <Button 
                variant="secondary" 
                size="md" 
                className="w-full"
                onClick={handleLogout}
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
