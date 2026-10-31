import { describe, test, expect } from 'vitest';
import { getBookingWindowEnd, assertPatientCanBookAt } from '../lib/booking-window.js';

describe('getBookingWindowEnd', () => {
  test('is the end of day (Madrid) of today + 3 months, in winter (CET, UTC+1)', () => {
    // 31 Oct 2026 12:00 Madrid (CET after DST ends on 25 Oct)
    const now = new Date('2026-10-31T11:00:00Z');
    // 31 Jan 2027 23:59:59.999 Madrid = 22:59:59.999 UTC
    expect(getBookingWindowEnd(now).toISOString()).toBe('2027-01-31T22:59:59.999Z');
  });

  test('handles summer time (CEST, UTC+2) in the target month', () => {
    // 15 Apr 2026 10:00 Madrid
    const now = new Date('2026-04-15T08:00:00Z');
    // 15 Jul 2026 23:59:59.999 Madrid = 21:59:59.999 UTC
    expect(getBookingWindowEnd(now).toISOString()).toBe('2026-07-15T21:59:59.999Z');
  });

  test('clamps the day to the target month length', () => {
    // 30 Nov 2026 Madrid → 28 Feb 2027
    const now = new Date('2026-11-30T10:00:00Z');
    expect(getBookingWindowEnd(now).toISOString()).toBe('2027-02-28T22:59:59.999Z');
  });

  test('uses the Madrid date, not the UTC date, near midnight', () => {
    // 23:30 UTC on 31 Dec 2026 is already 1 Jan 2027 00:30 in Madrid
    const now = new Date('2026-12-31T23:30:00Z');
    expect(getBookingWindowEnd(now).toISOString()).toBe('2027-04-01T21:59:59.999Z');
  });
});

describe('assertPatientCanBookAt', () => {
  const now = new Date('2026-10-31T11:00:00Z');

  test('allows a slot inside the window', () => {
    expect(() => assertPatientCanBookAt(new Date('2026-11-10T09:00:00Z'), now)).not.toThrow();
  });

  test('allows the last slot of the last day', () => {
    expect(() => assertPatientCanBookAt(new Date('2027-01-31T19:00:00Z'), now)).not.toThrow();
  });

  test('rejects a slot on the first day after the window', () => {
    expect(() => assertPatientCanBookAt(new Date('2027-02-01T08:00:00Z'), now)).toThrow(
      'Appointment is outside the booking window',
    );
  });

  test('rejects a slot in the past', () => {
    expect(() => assertPatientCanBookAt(new Date('2026-10-31T10:00:00Z'), now)).toThrow(
      'Cannot book an appointment in the past',
    );
  });
});
