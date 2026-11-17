import { Card } from "@fisio-app/ui";
import { BrandLogo } from "@fisio-app/ui";
import { FeatureItem } from "./FeatureItem";

const FEATURES = [
  "Reserva en minutos",
  "Gestiona tus citas",
  "Usa tus bonos",
  "Descarga facturas",
] as const;

export function HeroCard() {
  return (
    <Card className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
      <BrandLogo iconOnly className="md:mx-0" />

      <div>
        <h1 className="text-2xl font-bold text-text">Bienvenido</h1>
        <p className="mt-1 text-text-secondary">Gestiona tus citas de forma fácil y rápida</p>
      </div>

      <div className="flex w-full flex-col gap-4 text-left">
        {FEATURES.map((feature, i) => (
          <div
            key={feature}
            className="animate-slide-up"
            style={{ animationDelay: `${i * 50 + 200}ms` }}
          >
            <FeatureItem title={feature} />
          </div>
        ))}
      </div>
    </Card>
  );
}
