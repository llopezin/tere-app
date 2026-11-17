import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { patients } from '../db/schema/patients.js';
import { AppError } from '../middleware/error-handler.js';

/** Columns no two patients can share, with the name the duplicate message uses. */
const UNIQUE_FIELDS = [['nie', 'DNI/NIE'], ['email', 'email'], ['phone', 'teléfono']] as const;
type UniqueField = (typeof UNIQUE_FIELDS)[number][0];

/** Whether another patient already has this value in a unique column. */
export async function isPatientFieldTaken(field: UniqueField, value: string, exceptPatientId?: string): Promise<boolean> {
  const conditions = [eq(patients[field], value)];
  if (exceptPatientId) conditions.push(ne(patients.id, exceptPatientId));
  const [existing] = await db.select({ id: patients.id }).from(patients).where(and(...conditions)).limit(1);
  return existing !== undefined;
}

/** Throws 409 naming the first unique value (DNI/NIE, email, phone) in `data` another patient already has. */
export async function assertUniquePatientData(data: Partial<Record<UniqueField, string | null>>, exceptPatientId?: string) {
  for (const [field, label] of UNIQUE_FIELDS) {
    const value = data[field];
    if (value && await isPatientFieldTaken(field, value, exceptPatientId)) {
      throw new AppError(409, `Ya existe un paciente con este ${label}`);
    }
  }
}
