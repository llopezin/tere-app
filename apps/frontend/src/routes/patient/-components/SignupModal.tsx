import { type FormEvent, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { User, Mail, Phone, Lock } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin: () => void;
}

export function SignupModal({ open, onOpenChange, onSwitchToLogin }: SignupModalProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp.email({
      name: `${firstName} ${lastName}`.trim(),
      email,
      password,
      role: "patient",
      firstName,
      lastName,
    });

    const { error: signInError } = await signIn.email({ email, password });

    if (signUpError || signInError) {
      setError("Error al crear la cuenta");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.navigate({ to: "/patient/dashboard" });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Crear Cuenta - Paciente"
      subtitle="Completa tus datos para empezar a reservar citas"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nombre"
          type="text"
          placeholder="Tu nombre"
          icon={<User className="size-5" />}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <Input
          label="Apellidos"
          type="text"
          placeholder="Tus apellidos"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />

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
          label="Teléfono"
          type="tel"
          placeholder="+34 600 000 000"
          icon={<Phone className="size-5" />}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Input
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          icon={<Lock className="size-5" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <Input
          label="Confirmar Contraseña"
          type="password"
          placeholder="••••••••"
          icon={<Lock className="size-5" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />

        {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <Button size="lg" type="submit" disabled={loading}>
          {loading ? "Creando cuenta…" : "Crear Cuenta"}
        </Button>

        <p className="text-center text-sm text-text-secondary">
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-primary-600 hover:text-primary-hover underline-offset-2 hover:underline"
          >
            Inicia sesión
          </button>
        </p>
      </form>
    </Modal>
  );
}
