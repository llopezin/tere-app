import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, Button, Input, BrandLogo } from "@fisio-app/ui";
import { signUp, signIn } from "../lib/auth-client";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: authError } = await signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        role: "professional",
      });

      if (authError) {
        setError(authError.message || "Error al crear la cuenta");
        return;
      }

      // Automatically sign in after signup (Better Auth config has autoSignIn: false in backend)
      await signIn.email({
        email,
        password,
      });

      navigate({ to: "/" });
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
            <h1 className="text-2xl font-bold">Crea tu cuenta profesional</h1>
            <p className="text-text-secondary">Empieza a gestionar tu clínica</p>
          </div>

          <form onSubmit={handleSignup} className="w-full space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre"
                placeholder="Juan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Apellidos"
                placeholder="Pérez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="juan@ejemplo.com"
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
              {loading ? "Creando cuenta..." : "Registrarse"}
            </Button>
          </form>

          <p className="text-sm text-center">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-primary-600 font-medium">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
