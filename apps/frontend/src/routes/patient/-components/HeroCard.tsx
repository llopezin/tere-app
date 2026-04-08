import { Card } from "@/components/ui/Card";
import { InfoBanner } from "@/components/ui/InfoBanner";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { FeatureItem } from "@/routes/patient/-components/FeatureItem";

const FEATURES = [
  {
    title: "Reserva en minutos",
    description: "Elige tu profesional y horario disponible",
  },
  {
    title: "Historial completo",
    description: "Accede a todas tus citas y documentos",
  },
  {
    title: "Gestión de bonos",
    description: "Usa tus bonos de sesiones fácilmente",
  },
  {
    title: "Descarga facturas",
    description: "Toda tu documentación disponible",
  },
] as const;

export function HeroCard() {
  return (
    <Card className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
      <BrandLogo iconOnly className="md:mx-0" />

      <div>
        <h1 className="text-2xl font-bold text-text">Bienvenido</h1>
        <p className="mt-1 text-text-secondary">
          Gestiona tus citas médicas de forma fácil y rápida
        </p>
      </div>

      <div className="flex w-full flex-col gap-4 text-left">
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            className="animate-slide-up"
            style={{ animationDelay: `${i * 50 + 200}ms` }}
          >
            <FeatureItem
              title={feature.title}
              description={feature.description}
            />
          </div>
        ))}
      </div>

      <InfoBanner className="w-full text-left">
        <span className="font-semibold text-primary-700">Importante:</span>{" "}
        Cumplimos con el RGPD. Tus datos están protegidos y solo se usan para tu
        atención médica.
      </InfoBanner>
    </Card>
  );
}
