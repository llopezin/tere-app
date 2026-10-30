import { db } from '../db/index.js';
import { professionals } from '../db/schema/professionals.js';
import { appointmentTypes } from '../db/schema/appointment-types.js';
import { eq } from 'drizzle-orm';

interface BookableAppointmentType {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
}

export async function listBookableProfessionals() {
  const [professionalRows, typeRows] = await Promise.all([
    db
      .select({
        id: professionals.id,
        firstName: professionals.firstName,
        lastName: professionals.lastName,
        occupation: professionals.occupation,
      })
      .from(professionals)
      .orderBy(professionals.firstName, professionals.lastName),
    db
      .select({
        id: appointmentTypes.id,
        professionalId: appointmentTypes.professionalId,
        name: appointmentTypes.name,
        durationMinutes: appointmentTypes.durationMinutes,
        price: appointmentTypes.price,
      })
      .from(appointmentTypes)
      .where(eq(appointmentTypes.isActive, true))
      .orderBy(appointmentTypes.name),
  ]);

  const typesByProfessional = new Map<string, BookableAppointmentType[]>();
  for (const { professionalId, ...type } of typeRows) {
    const types = typesByProfessional.get(professionalId) ?? [];
    types.push(type);
    typesByProfessional.set(professionalId, types);
  }

  return professionalRows.map(({ id, firstName, lastName, occupation }) => ({
    id,
    name: `${firstName} ${lastName}`,
    occupation,
    appointmentTypes: typesByProfessional.get(id) ?? [],
  }));
}
