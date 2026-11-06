"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandLogo } from "@fisio-app/ui/BrandLogo";
import { Button } from "@fisio-app/ui/Button";
import { Card } from "@fisio-app/ui/Card";
import { useSession, signOut } from "@/lib/auth-client";

export default function IndexPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const isProfessional = session?.user.role === "professional";

  useEffect(() => {
    if (!isPending && !isProfessional) {
      router.push("/login");
    }
  }, [isProfessional, isPending, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (!session || !isProfessional) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="flex flex-col items-center space-y-6 p-8">
          <BrandLogo />
          <div className="text-center w-full">
            <h1 className="text-2xl font-bold text-primary-700 mb-1">Hola, {session.user.name}</h1>
            <p className="text-text-secondary mb-6">Panel de Control Profesional</p>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push("/ajustes/integraciones")}
              >
                Configurar Google Calendar
              </Button>

              <Button variant="secondary" size="md" className="w-full" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
