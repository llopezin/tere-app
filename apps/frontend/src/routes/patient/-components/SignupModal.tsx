import { type FormEvent, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { User, Mail, Phone, Lock } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { client } from "@/lib/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

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
  const [rgpdAccepted, setRgpdAccepted] = useState(false);
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

    const { error: authError } = await signUp.email({
      name: `${firstName} ${lastName}`.trim(),
      email,
      password,
      role: "patient",
      firstName,
      lastName,
    });

    if (authError) {
      setLoading(false);
      setError(authError.message ?? "Error al crear la cuenta");
      return;
    }

    // Record RGPD consent acceptance — best-effort, don't block signup on failure
    try {
      await client.patient.me["rgpd-consent"].$post({});
    } catch (e) {
      // Non-fatal: user can still log in; consent can be collected later
      console.log(e);
    }

    // Session cookie is set — navigate to patient dashboard
    router.navigate({ to: "/patient/dashboard" });
  }

  const canSubmit = rgpdAccepted && !loading;

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

        <div className="flex flex-col gap-3 pt-1">
          <Checkbox checked={rgpdAccepted} onCheckedChange={setRgpdAccepted}>
            Acepto el {/* Uses <a> because this route is not yet registered in the router */}
            <a
              href="/rgpd"
              className="font-semibold text-primary-600 hover:text-primary-hover underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              consentimiento RGPD
            </a>{" "}
            para el tratamiento de mis datos personales
          </Checkbox>
        </div>

        {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <Button size="lg" type="submit" disabled={!canSubmit}>
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
