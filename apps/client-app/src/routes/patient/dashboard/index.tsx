import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { PatientTopBar } from "./-components/PatientTopBar";
import { DashboardTabs, type DashboardTab } from "./-components/DashboardTabs";
import { BookingForm } from "./-components/BookingForm";
import { AppointmentList } from "./-components/AppointmentList";
import { professionalsQueryOptions } from "@/api/professionals";

export const Route = createFileRoute("/patient/dashboard/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.session) {
      throw redirect({ to: "/patient/welcome" });
    }
  },
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(professionalsQueryOptions()),
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
          {activeTab === "appointments" && <AppointmentList />}
        </div>
      </main>
    </div>
  );
}
