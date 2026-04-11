import { client } from "@/lib/client";

interface CreateAppointmentInput {
  patientId: string;
  appointmentTypeId: string;
  startAt: string;
  notes?: string;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const res = await client.appointments.$post({ json: input });
  const data = await res.json();
  if (!res.ok) {
    const message =
      "message" in data
        ? (data as { message: string }).message
        : "Error al crear la cita";
    throw new Error(message);
  }
  return data;
}
