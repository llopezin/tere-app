import { z } from 'zod';

// --- Professional ---
export const updateProfessionalSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  addressStreet: z.string().optional(),
  addressPostal: z.string().optional(),
  addressCity: z.string().optional(),
  addressProvince: z.string().optional(),
  addressCountry: z.string().optional(),
});

// --- Patient ---
export const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nie: z.string().optional(),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  dateOfBirth: z.string().optional(),
  addressStreet: z.string().optional(),
  addressPostal: z.string().optional(),
  addressCity: z.string().optional(),
  addressProvince: z.string().optional(),
  addressCountry: z.string().optional(),
  contactMethod: z.enum(['email', 'sms', 'whatsapp']).optional(),
  clinicalNotes: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

// --- Patient Billing Data ---
export const upsertBillingDataSchema = z.object({
  billingName: z.string().min(1),
  addressStreet: z.string().optional(),
  addressPostal: z.string().optional(),
  addressCity: z.string().optional(),
  addressProvince: z.string().optional(),
  addressCountry: z.string().optional(),
});

// --- RGPD Consent ---
export const submitConsentSchema = z.object({
  signatureData: z.string().min(1),
  signed: z.literal(true),
});

// --- Appointment Types ---
export const createAppointmentTypeSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  price: z.number().nonnegative(),
});

export const updateAppointmentTypeSchema = createAppointmentTypeSchema.partial();

// --- Working Schedules ---
const scheduleSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const bulkScheduleSchema = z.object({
  slots: z.array(scheduleSlotSchema),
});

// --- Blocked Times ---
export const createBlockedTimeSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

// --- Appointments ---
export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  appointmentTypeId: z.string().uuid(),
  startAt: z.string().datetime(),
  notes: z.string().optional(),
  bonoId: z.string().uuid().nullable().optional(),
  useBonoSession: z.boolean().optional().default(true),
});

export const batchAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  appointmentTypeId: z.string().uuid(),
  slots: z.array(z.object({ startAt: z.string().datetime() })).min(1),
  bonoId: z.string().uuid().nullable().optional(),
  useBonoSession: z.boolean().optional().default(true),
});

export const recurringAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  appointmentTypeId: z.string().uuid(),
  startAt: z.string().datetime(),
  recurrenceRule: z.object({
    frequency: z.enum(['weekly']),
    interval: z.number().int().positive().default(1),
    count: z.number().int().positive(),
  }),
  bonoId: z.string().uuid().nullable().optional(),
  useBonoSession: z.boolean().optional().default(true),
});

export const updateAppointmentSchema = z.object({
  appointmentTypeId: z.string().uuid().optional(),
  startAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  price: z.number().nonnegative().optional(),
});

// --- Bonos ---
export const createBonoSchema = z.object({
  patientId: z.string().uuid(),
  appointmentTypeId: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  totalSessions: z.number().int().positive(),
});

export const deductBonoSchema = z.object({});

// --- Payments ---
export const createPaymentSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().nullable().optional(),
  bonoId: z.string().uuid().nullable().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['card', 'bizum', 'cash']),
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// --- Invoices ---
export const createInvoiceSchema = z.object({
  appointmentId: z.string().uuid(),
  paymentId: z.string().uuid().nullable().optional(),
});

// --- Pagination ---
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Date range filter ---
export const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
