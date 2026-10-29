import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, Button, Input, BrandLogo } from "@fisio-app/ui";
import { signIn } from "../lib/auth-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await signIn.email({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || "Credenciales inválidas");
        return;
      }

      navigate({ to: "/" });
    } catch (err) {
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-danger text-sm text-center">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>

          <p className="text-sm text-center">
            ¿No tienes cuenta?{" "}
            <Link to="/signup" className="text-primary-600 font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
