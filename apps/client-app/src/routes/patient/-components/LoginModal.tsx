import { type FormEvent, useState } from "react";
import { Mail, Lock } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { signIn } from "@/lib/auth-client";
import { Modal } from "@fisio-app/ui";
import { Input } from "@fisio-app/ui";
import { Button } from "@fisio-app/ui";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSignup: () => void;
}

export function LoginModal({ open, onOpenChange, onSwitchToSignup }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await signIn.email({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message ?? "Error al iniciar sesión");
      return;
    }

    router.navigate({ to: "/patient/dashboard" });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Iniciar Sesión - Paciente"
      subtitle="Accede a tu cuenta para gestionar tus citas"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Correo Electrónico"
          type="email"
          placeholder="tu@email.com"
          icon={<Mail className="size-5" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          icon={<Lock className="size-5" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* Uses <a> because this route is not yet registered in the router */}
        <a
          href="/forgot-password"
          className="text-sm font-semibold text-primary-600 hover:text-primary-hover underline-offset-2 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </a>

        {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <Button size="lg" type="submit" disabled={loading}>
          {loading ? "Iniciando sesión…" : "Iniciar Sesión"}
        </Button>

        <p className="text-center text-sm text-text-secondary">
          ¿No tienes cuenta?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-semibold text-primary-600 hover:text-primary-hover underline-offset-2 hover:underline"
          >
            Regístrate aquí
          </button>
        </p>
      </form>
    </Modal>
  );
}
