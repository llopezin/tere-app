"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@fisio-app/ui/BrandLogo";
import { Button } from "@fisio-app/ui/Button";
import { Card } from "@fisio-app/ui/Card";
import { Input } from "@fisio-app/ui/Input";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: authError } = await signIn.email({
        email,
        password,
      });

      if (authError) {
        setError(
          authError.code === "INVALID_EMAIL_OR_PASSWORD"
            ? "Email o contraseña incorrectos"
            : authError.message || "Credenciales inválidas",
        );
        return;
      }

      router.push("/");
    } catch {
      setError("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center space-y-6">
          <BrandLogo />
          <div className="text-center">
            <h1 className="text-2xl font-bold">Bienvenido de nuevo</h1>
            <p className="text-text-secondary">Accede a tu panel profesional</p>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="text-danger text-sm text-center">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>

          <p className="text-sm text-center text-text-secondary">
            Las cuentas de profesional las crea el administrador de la clínica.
          </p>
        </div>
      </Card>
    </div>
  );
}
