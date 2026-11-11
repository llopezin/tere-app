import fs from 'fs';
import dotenv from 'dotenv';
import postgres from 'postgres';

// Any constant works, as long as every test run uses the same one.
const TEST_DB_LOCK_ID = 4242;

// globalSetup runs in Vitest's main process, which does not get `test.env` (only workers do).
const { DATABASE_URL } = dotenv.parse(fs.readFileSync(new URL('../../.env.test', import.meta.url)));

/**
 * Every local Vitest run (worktrees, agent sessions, hooks) shares fisio_app_test and TRUNCATEs it
 * before each test, so two runs at once wipe each other's fixtures. Hold a Postgres advisory lock for
 * the whole run so concurrent runs queue instead of colliding. (The e2e suite has its own database.)
 */
export default async function setup() {
  // A session-level advisory lock belongs to one connection, so lock and release must share it.
  // max_lifetime: null, otherwise postgres.js recycles the connection after 30–60 min and the lock is silently lost.
  const lockClient = postgres(DATABASE_URL, { max: 1, max_lifetime: null });

  const [{ acquired }] = await lockClient`SELECT pg_try_advisory_lock(${TEST_DB_LOCK_ID}) AS acquired`;
  if (!acquired) {
    console.log('⏳ Another test run is using the test database, waiting for it to finish (a watch session holds it until closed)…');
    await lockClient`SELECT pg_advisory_lock(${TEST_DB_LOCK_ID})`;
  }

  // Closing the connection releases the lock (Postgres also releases it if the process dies).
  return async () => {
    await lockClient.end();
  };
}
