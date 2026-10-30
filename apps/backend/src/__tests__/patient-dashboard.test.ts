import { describe, test, expect } from 'vitest';
import { createProfessional, createAppointmentType } from './helpers.js';
import { listBookableProfessionals } from '../services/patient-dashboard.service.js';

describe('listBookableProfessionals', () => {
  test('nests active appointment types under each professional, ordered by name', async () => {
    const ana = await createProfessional('Ana Lopez', { occupation: 'Fisioterapeuta' });
    const bruno = await createProfessional('Bruno Diaz');
    await createAppointmentType('Masaje', 30, ana.id);
    await createAppointmentType('Bobath', 60, ana.id);
    await createAppointmentType('Valoración', 45, bruno.id);

    const result = await listBookableProfessionals();

    expect(result.map((p) => p.name)).toEqual(['Ana Lopez', 'Bruno Diaz']);
    expect(result[0].occupation).toBe('Fisioterapeuta');
    expect(result[1].occupation).toBeNull();
    expect(result[0].appointmentTypes.map((t) => t.name)).toEqual(['Bobath', 'Masaje']);
    expect(result[1].appointmentTypes.map((t) => t.name)).toEqual(['Valoración']);
  });

  test('excludes inactive appointment types and returns professionals without types', async () => {
    const ana = await createProfessional('Ana Lopez');
    await createProfessional('Bruno Diaz');
    await createAppointmentType('Antigua', 30, ana.id, { isActive: false });

    const result = await listBookableProfessionals();

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.appointmentTypes.length === 0)).toBe(true);
  });

  test('exposes only the fields the dashboard needs', async () => {
    const ana = await createProfessional('Ana Lopez', { taxId: 'SECRET', phone: '600000000' });
    await createAppointmentType('Masaje', 30, ana.id);

    const [professional] = await listBookableProfessionals();

    expect(Object.keys(professional).sort()).toEqual(['appointmentTypes', 'id', 'name', 'occupation']);
    expect(Object.keys(professional.appointmentTypes[0]).sort()).toEqual(['durationMinutes', 'id', 'name', 'price']);
  });
});
