import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { acquireTestDbLock } from '../apps/backend/src/__tests__/test-db-lock';

// Same lock as the backend vitest suite: both wipe fisio_app_test.
export default function globalSetup() {
  const { DATABASE_URL } = parseEnv(readFileSync('apps/backend/.env.test', 'utf8'));
  return acquireTestDbLock(DATABASE_URL);
}
