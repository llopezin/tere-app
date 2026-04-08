import { createLazyFileRoute } from "@tanstack/react-router";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { HeroCard } from "@/routes/patient/-components/HeroCard";
import { AuthCard } from "@/routes/patient/-components/AuthCard";

export const Route = createLazyFileRoute("/patient/welcome")({
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <div className="flex min-h-svh flex-col items-center bg-gradient-to-b from-primary-50 via-background to-background px-4 py-12 md:py-16">
      <div className="animate-fade-in mb-10">
        <BrandLogo subtitle="Portal del Paciente" />
      </div>

      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <HeroCard />
        </div>
        <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <AuthCard />
        </div>
      </div>
    </div>
  );
}
