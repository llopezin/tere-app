/**
 * Every role a user can have. This is the single place to add a new role.
 *
 * After adding one here, TypeScript points at the places that must handle it
 * (e.g. `createProfileByRole` in `lib/auth.ts`, the profile created on sign-up).
 */
export const ROLES = {
  patient: 'patient',
  professional: 'professional',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: readonly Role[] = Object.values(ROLES);

/** Role given to every public sign-up. */
export const DEFAULT_ROLE: Role = ROLES.patient;

export function isRole(value: unknown): value is Role {
  return ALL_ROLES.includes(value as Role);
}
