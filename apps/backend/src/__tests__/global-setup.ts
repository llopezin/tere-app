import fs from 'fs';
import dotenv from 'dotenv';
import { acquireTestDbLock } from './test-db-lock.js';

// globalSetup runs in Vitest's main process, which does not get `test.env` (only workers do).
const { DATABASE_URL } = dotenv.parse(fs.readFileSync(new URL('../../.env.test', import.meta.url)));

export default function setup() {
  return acquireTestDbLock(DATABASE_URL);
}
