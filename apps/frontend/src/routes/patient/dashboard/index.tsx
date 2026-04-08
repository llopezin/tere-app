import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PatientTopBar } from "./-components/PatientTopBar";
import { DashboardTabs, type DashboardTab } from "./-components/DashboardTabs";
import { BookingForm } from "./-components/BookingForm";

export const Route = createFileRoute("/patient/dashboard/")({
  component: PatientDashboard,
});

function PatientDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("book");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PatientTopBar />
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-3xl">
          {activeTab === "book" && <BookingForm />}
          {activeTab === "appointments" && (
            <div className="rounded-lg border border-border bg-surface p-8 text-center text-text-secondary">
              Mis Citas — próximamente
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
