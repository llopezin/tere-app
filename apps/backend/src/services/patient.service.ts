import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { patients } from '../db/schema/patients.js';

/** Whether another patient already has this DNI/NIE (`patients.nie` is unique). */
export async function isNieTaken(nie: string, exceptPatientId?: string): Promise<boolean> {
  const conditions = [eq(patients.nie, nie)];
  if (exceptPatientId) conditions.push(ne(patients.id, exceptPatientId));
  const [existing] = await db.select({ id: patients.id }).from(patients).where(and(...conditions)).limit(1);
  return existing !== undefined;
}
