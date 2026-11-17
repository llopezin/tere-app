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

  // Dates avoid DST changes so the expectation holds in any timezone
  it('keeps monthly occurrences inside their month when the start day does not exist in it', () => {
    expect(toIso(generateRecurrenceDates(new Date('2027-05-31T10:00:00Z'), 'monthly', 3))).toEqual([
      '2027-05-31T10:00:00.000Z',
      '2027-06-30T10:00:00.000Z',
      '2027-07-31T10:00:00.000Z',
    ]);
  });
});
