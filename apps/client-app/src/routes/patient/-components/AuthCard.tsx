import { useState } from "react";
import { Card } from "@fisio-app/ui";
import { Button } from "@fisio-app/ui";
import { Divider } from "@fisio-app/ui";
import { LoginModal } from "./LoginModal";
import { SignupModal } from "./SignupModal";

type ActiveModal = "login" | "signup" | null;

export function AuthCard() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  return (
    <>
      <Card className="flex flex-col gap-5">
        <div className="text-center">
          <h2 className="text-lg font-bold text-text">Accede a tu cuenta</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Inicia sesión o crea una cuenta nueva
          </p>
        </div>

        <Button size="lg" onClick={() => setActiveModal("login")}>
          Iniciar Sesión
        </Button>

        <Divider label="o" />

        <Button
          variant="secondary"
          size="lg"
          onClick={() => setActiveModal("signup")}
        >
          Crear Cuenta Nueva
        </Button>

        <div className="text-center">
          <p className="text-sm font-semibold text-text">¿Primera vez aquí?</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Crea tu cuenta en menos de 2 minutos y comienza a gestionar tus
            citas
          </p>
        </div>

        <Divider />

        <p className="text-center text-sm text-text-secondary">
          ¿Eres profesional sanitario?{" "}
          {/* Uses <a> because this route is not yet registered in the router */}
          <a
            href="/professional/login"
            className="font-semibold text-primary-600 underline-offset-2 hover:text-primary-hover hover:underline"
          >
            Accede aquí
          </a>
        </p>
      </Card>

      <LoginModal
        open={activeModal === "login"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSwitchToSignup={() => setActiveModal("signup")}
      />

      <SignupModal
        open={activeModal === "signup"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSwitchToLogin={() => setActiveModal("login")}
      />
    </>
  );
}
