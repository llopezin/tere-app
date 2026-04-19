import type { calendar_v3 } from 'googleapis';

export interface AppointmentEventInput {
  appointmentId: string;
  startAt: Date;
  endAt: Date;
  notes: string | null;
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string | null;
  patientEmail: string | null;
  appointmentTypeName: string;
  locationAddress: string | null;
}

export function appointmentToGoogleEvent(
  input: AppointmentEventInput,
): calendar_v3.Schema$Event {
  const patientName = `${input.patientFirstName} ${input.patientLastName}`.trim();

  const descriptionLines = [
    `Paciente: ${patientName}`,
    input.patientPhone ? `Teléfono: ${input.patientPhone}` : null,
    input.patientEmail ? `Email: ${input.patientEmail}` : null,
    input.notes ? '' : null,
    input.notes ? `Notas: ${input.notes}` : null,
  ].filter((line): line is string => line !== null);

  return {
    summary: `${input.appointmentTypeName} — ${patientName}`,
    description: descriptionLines.join('\n'),
    location: input.locationAddress ?? undefined,
    start: { dateTime: input.startAt.toISOString() },
    end: { dateTime: input.endAt.toISOString() },
    extendedProperties: {
      private: {
        fisioAppointmentId: input.appointmentId,
      },
    },
  };
}
