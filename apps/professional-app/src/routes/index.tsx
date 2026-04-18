import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@fisio-app/ui";
import { BrandLogo } from "@fisio-app/ui";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="flex flex-col items-center space-y-6 p-8">
          <BrandLogo />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary-700 mb-2">
              Professional App
            </h1>
            <p className="text-text-secondary">
              Coming soon — workspace for professionals
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
