import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";

async function fetchPatientAppointments() {
  const res = await client.patient.me.appointments.$get({
    query: { per_page: 100 },
  });

  if (!res.ok) throw new Error("Failed to fetch appointments");
  return await res.json();
}

export function patientAppointmentsQueryOptions() {
  return queryOptions({
    queryKey: ["patient-appointments"],
    queryFn: fetchPatientAppointments,
  });
}
