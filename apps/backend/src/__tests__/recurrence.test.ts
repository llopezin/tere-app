import { describe, it, expect } from 'vitest';
import { generateRecurrenceDates } from '../services/appointment.service.js';

describe('generateRecurrenceDates', () => {
  const start = new Date('2026-05-01T10:00:00Z');
  const toIso = (dates: Date[]) => dates.map((d) => d.toISOString());

  it('generates daily occurrences', () => {
    expect(toIso(generateRecurrenceDates(start, 'daily', 3))).toEqual([
      '2026-05-01T10:00:00.000Z',
      '2026-05-02T10:00:00.000Z',
      '2026-05-03T10:00:00.000Z',
    ]);
  });

  it('generates weekly occurrences', () => {
    expect(toIso(generateRecurrenceDates(start, 'weekly', 3))).toEqual([
      '2026-05-01T10:00:00.000Z',
      '2026-05-08T10:00:00.000Z',
      '2026-05-15T10:00:00.000Z',
    ]);
  });

  it('generates biweekly occurrences', () => {
    expect(toIso(generateRecurrenceDates(start, 'biweekly', 3))).toEqual([
      '2026-05-01T10:00:00.000Z',
      '2026-05-15T10:00:00.000Z',
      '2026-05-29T10:00:00.000Z',
    ]);
  });

  it('generates monthly occurrences', () => {
    expect(toIso(generateRecurrenceDates(start, 'monthly', 3))).toEqual([
      '2026-05-01T10:00:00.000Z',
      '2026-06-01T10:00:00.000Z',
      '2026-07-01T10:00:00.000Z',
    ]);
  });

  it('does not mutate the start date', () => {
    generateRecurrenceDates(start, 'weekly', 3);
    expect(start.toISOString()).toBe('2026-05-01T10:00:00.000Z');
  });
});
