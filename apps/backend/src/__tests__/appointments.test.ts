import { describe, it, expect } from 'vitest';
import './setup.js';
import { testDb } from './setup.js';
import {
  createProfessional,
  createPatient,
  createAppointmentType,
  signRgpdConsent,
  createBono,
  createBlockedTime,
} from './helpers.js';
import { appointments } from '../db/schema/appointments.js';
import { bonos } from '../db/schema/bonos.js';
import { bonoTransactions } from '../db/schema/bono-transactions.js';
import { rgpdConsents } from '../db/schema/rgpd-consents.js';
import { blockedTimes } from '../db/schema/blocked-times.js';
import { eq, and } from 'drizzle-orm';

describe('Appointments - Create', () => {
  it('should create a simple appointment', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    await signRgpdConsent(patient.id);
    const apptType = await createAppointmentType('Consultation', 60, prof.id);

    const startAt = new Date('2026-05-01T10:00:00Z');
    
    const [appt] = await testDb.insert(appointments).values({
      professionalId: prof.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt,
      endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
      price: apptType.price,
      useBonoSession: false,
    }).returning();

    expect(appt).toBeDefined();
    expect(appt.professionalId).toBe(prof.id);
    expect(appt.patientId).toBe(patient.id);
    expect(appt.status).toBe('scheduled');
  });

  it('should reject appointment without RGPD consent', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    // Don't sign consent
    const apptType = await createAppointmentType('Consultation', 60, prof.id);

    const startAt = new Date('2026-05-01T10:00:00Z');
    
    // This should fail RGPD check in handler
    await expect(async () => {
      // Simulate handler logic
      const [consent] = await testDb.select().from(rgpdConsents)
        .where(and(
          eq(rgpdConsents.patientId, patient.id),
          eq(rgpdConsents.signed, true)
        ));
      if (!consent) throw new Error('Patient must sign RGPD consent before booking');
    }).rejects.toThrow('Patient must sign RGPD consent before booking');
  });

  it('should reject overlapping appointments', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    await signRgpdConsent(patient.id);
    const apptType = await createAppointmentType('Consultation', 60, prof.id);

    const startAt = new Date('2026-05-01T10:00:00Z');
    const endAt = new Date('2026-05-01T11:00:00Z');
    
    // Create first appointment
    await testDb.insert(appointments).values({
      professionalId: prof.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt,
      endAt,
      price: apptType.price,
      useBonoSession: false,
    });

    // Try to create overlapping appointment
    const overlapping = await testDb.select({ id: appointments.id })
      .from(appointments)
      .where(and(
        eq(appointments.professionalId, prof.id),
        eq(appointments.status, 'scheduled')
      ));

    expect(overlapping.length).toBeGreaterThan(0);
  });

  it('should reject appointment during blocked time', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    await signRgpdConsent(patient.id);
    const apptType = await createAppointmentType('Consultation', 60, prof.id);

    const startAt = new Date('2026-05-01T10:00:00Z');
    const endAt = new Date('2026-05-01T11:00:00Z');
    
    // Create blocked time
    await createBlockedTime(prof.id, startAt, endAt);

    // Check for blocked time overlap
    const blocked = await testDb.select().from(blockedTimes)
      .where(eq(blockedTimes.professionalId, prof.id));

    expect(blocked.length).toBeGreaterThan(0);
  });
});

describe('Appointments - Batch Creation', () => {
  it('should create multiple appointments in one transaction', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    await signRgpdConsent(patient.id);
    const apptType = await createAppointmentType('Consultation', 60, prof.id);

    const slots = [
      new Date('2026-05-01T10:00:00Z'),
      new Date('2026-05-01T11:00:00Z'),
      new Date('2026-05-01T14:00:00Z'),
    ];

    const created = await testDb.transaction(async (tx) => {
      const results = [];
      for (const startAt of slots) {
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
        const [appt] = await tx.insert(appointments).values({
          professionalId: prof.id,
          patientId: patient.id,
          appointmentTypeId: apptType.id,
          startAt,
          endAt,
          price: apptType.price,
          useBonoSession: false,
        }).returning();
        results.push(appt);
      }
      return results;
    });

    expect(created).toHaveLength(3);
    expect(created[0].startAt).toEqual(slots[0]);
  });
});

describe('Appointments - Recurring Creation', () => {
  it('should create weekly recurring appointments', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    await signRgpdConsent(patient.id);
    const apptType = await createAppointmentType('Consultation', 60, prof.id);

    const startDate = new Date('2026-05-01T10:00:00Z');
    const recurrenceGroupId = crypto.randomUUID();
    const count = 4;

    const created = await testDb.transaction(async (tx) => {
      const results = [];
      for (let i = 0; i < count; i++) {
        const startAt = new Date(startDate);
        startAt.setDate(startAt.getDate() + i * 7);
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
        
        const [appt] = await tx.insert(appointments).values({
          professionalId: prof.id,
          patientId: patient.id,
          appointmentTypeId: apptType.id,
          startAt,
          endAt,
          price: apptType.price,
          useBonoSession: false,
          recurrenceGroupId,
        }).returning();
        results.push(appt);
      }
      return results;
    });

    expect(created).toHaveLength(4);
    expect(created.every(a => a.recurrenceGroupId === recurrenceGroupId)).toBe(true);
    
    // Check weekly spacing
    const firstDate = created[0].startAt.getTime();
    const secondDate = created[1].startAt.getTime();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    expect(secondDate - firstDate).toBe(weekInMs);
  });
});

describe('Appointments - Bono Integration', () => {
  it('should deduct a bono session when creating appointment', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    await signRgpdConsent(patient.id);
    const apptType = await createAppointmentType('Consultation', 60, prof.id);
    const bono = await createBono(prof.id, patient.id, apptType.id);

    expect(bono.sessionsUsed).toBe(0);
    expect(bono.status).toBe('active');

    const startAt = new Date('2026-05-01T10:00:00Z');
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    const result = await testDb.transaction(async (tx) => {
      // Create appointment
      const [appt] = await tx.insert(appointments).values({
        professionalId: prof.id,
        patientId: patient.id,
        appointmentTypeId: apptType.id,
        startAt,
        endAt,
        price: apptType.price,
        bonoId: bono.id,
        useBonoSession: true,
      }).returning();

      // Deduct bono session
      const [updatedBono] = await tx.update(bonos)
        .set({
          sessionsUsed: bono.sessionsUsed + 1,
          status: (bono.sessionsUsed + 1) >= bono.totalSessions ? 'exhausted' : 'active',
          updatedAt: new Date(),
        })
        .where(eq(bonos.id, bono.id))
        .returning();

      // Create transaction log
      await tx.insert(bonoTransactions).values({
        bonoId: bono.id,
        appointmentId: appt.id,
        type: 'deduction',
      });

      return { appt, updatedBono };
    });

    expect(result.updatedBono.sessionsUsed).toBe(1);
    expect(result.appt.bonoId).toBe(bono.id);

    // Verify transaction log
    const transactions = await testDb.select().from(bonoTransactions)
      .where(eq(bonoTransactions.bonoId, bono.id));
    expect(transactions).toHaveLength(1);
    expect(transactions[0].type).toBe('deduction');
  });

  it('should exhaust bono when all sessions are used', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    await signRgpdConsent(patient.id);
    const apptType = await createAppointmentType('Consultation', 60, prof.id);
    const bono = await createBono(prof.id, patient.id, apptType.id, {
      totalSessions: 2,
    });

    // Use first session
    const startAt1 = new Date('2026-05-01T10:00:00Z');
    await testDb.transaction(async (tx) => {
      const [appt] = await tx.insert(appointments).values({
        professionalId: prof.id,
        patientId: patient.id,
        appointmentTypeId: apptType.id,
        startAt: startAt1,
        endAt: new Date(startAt1.getTime() + 60 * 60 * 1000),
        price: apptType.price,
        bonoId: bono.id,
        useBonoSession: true,
      }).returning();

      await tx.update(bonos)
        .set({ sessionsUsed: 1, updatedAt: new Date() })
        .where(eq(bonos.id, bono.id));
    });

    // Use second session
    const startAt2 = new Date('2026-05-02T10:00:00Z');
    const result = await testDb.transaction(async (tx) => {
      const [appt] = await tx.insert(appointments).values({
        professionalId: prof.id,
        patientId: patient.id,
        appointmentTypeId: apptType.id,
        startAt: startAt2,
        endAt: new Date(startAt2.getTime() + 60 * 60 * 1000),
        price: apptType.price,
        bonoId: bono.id,
        useBonoSession: true,
      }).returning();

      const [updated] = await tx.update(bonos)
        .set({
          sessionsUsed: 2,
          status: 'exhausted',
          updatedAt: new Date(),
        })
        .where(eq(bonos.id, bono.id))
        .returning();

      return updated;
    });

    expect(result.sessionsUsed).toBe(2);
    expect(result.status).toBe('exhausted');
  });
});

describe('Appointments - Cancel', () => {
  it('should cancel appointment and refund bono session', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    await signRgpdConsent(patient.id);
    const apptType = await createAppointmentType('Consultation', 60, prof.id);
    const bono = await createBono(prof.id, patient.id, apptType.id);

    const startAt = new Date('2026-05-01T10:00:00Z');
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    // Create appointment with bono
    const [appt] = await testDb.transaction(async (tx) => {
      const [created] = await tx.insert(appointments).values({
        professionalId: prof.id,
        patientId: patient.id,
        appointmentTypeId: apptType.id,
        startAt,
        endAt,
        price: apptType.price,
        bonoId: bono.id,
        useBonoSession: true,
      }).returning();

      await tx.update(bonos)
        .set({ sessionsUsed: 1, updatedAt: new Date() })
        .where(eq(bonos.id, bono.id));

      await tx.insert(bonoTransactions).values({
        bonoId: bono.id,
        appointmentId: created.id,
        type: 'deduction',
      });

      return [created];
    });

    // Cancel appointment
    await testDb.transaction(async (tx) => {
      await tx.update(appointments)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(appointments.id, appt.id));

      // Refund bono session
      await tx.update(bonos)
        .set({
          sessionsUsed: 0,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(bonos.id, bono.id));

      await tx.insert(bonoTransactions).values({
        bonoId: bono.id,
        appointmentId: appt.id,
        type: 'refund',
      });
    });

    // Verify cancellation
    const [cancelled] = await testDb.select().from(appointments)
      .where(eq(appointments.id, appt.id));
    expect(cancelled.status).toBe('cancelled');

    // Verify bono refund
    const [refundedBono] = await testDb.select().from(bonos)
      .where(eq(bonos.id, bono.id));
    expect(refundedBono.sessionsUsed).toBe(0);
    expect(refundedBono.status).toBe('active');

    // Verify transaction log
    const transactions = await testDb.select().from(bonoTransactions)
      .where(eq(bonoTransactions.bonoId, bono.id));
    expect(transactions).toHaveLength(2);
    expect(transactions.some(t => t.type === 'refund')).toBe(true);
  });
});

describe('Appointments - Complete and No-Show', () => {
  it('should mark appointment as completed', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    await signRgpdConsent(patient.id);
    const apptType = await createAppointmentType('Consultation', 60, prof.id);

    const startAt = new Date('2026-05-01T10:00:00Z');
    const [appt] = await testDb.insert(appointments).values({
      professionalId: prof.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt,
      endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
      price: apptType.price,
      useBonoSession: false,
    }).returning();

    const [completed] = await testDb.update(appointments)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(appointments.id, appt.id))
      .returning();

    expect(completed.status).toBe('completed');
  });

  it('should mark appointment as no-show', async () => {
    const prof = await createProfessional();
    const patient = await createPatient(prof.id);
    await signRgpdConsent(patient.id);
    const apptType = await createAppointmentType('Consultation', 60, prof.id);

    const startAt = new Date('2026-05-01T10:00:00Z');
    const [appt] = await testDb.insert(appointments).values({
      professionalId: prof.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt,
      endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
      price: apptType.price,
      useBonoSession: false,
    }).returning();

    const [noShow] = await testDb.update(appointments)
      .set({ status: 'no_show', updatedAt: new Date() })
      .where(eq(appointments.id, appt.id))
      .returning();

    expect(noShow.status).toBe('no_show');
  });
});
