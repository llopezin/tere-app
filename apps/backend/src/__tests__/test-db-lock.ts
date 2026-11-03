import postgres from 'postgres';

// Any constant works, as long as every test run uses the same one.
const TEST_DB_LOCK_ID = 4242;

/**
 * Every local run (vitest and Playwright, from any worktree, agent session or hook) shares
 * fisio_app_test and wipes it between tests, so two runs at once destroy each other's fixtures.
 * Holding a Postgres advisory lock for the whole run makes concurrent runs queue instead
 * (two e2e runs never get that far: the second one fails on the busy server ports).
 * Returns the function that releases it.
 */
export async function acquireTestDbLock(databaseUrl: string): Promise<() => Promise<void>> {
  // A session-level advisory lock belongs to one connection, so lock and release must share it.
  // max_lifetime: null, otherwise postgres.js recycles the connection after 30–60 min and the lock is silently lost.
  const lockClient = postgres(databaseUrl, { max: 1, max_lifetime: null });

  const [{ acquired }] = await lockClient`SELECT pg_try_advisory_lock(${TEST_DB_LOCK_ID}) AS acquired`;
  if (!acquired) {
    console.log('⏳ Another test run is using the test database, waiting for it to finish (a watch or UI session holds it until closed)…');
    await lockClient`SELECT pg_advisory_lock(${TEST_DB_LOCK_ID})`;
  }

  // Closing the connection releases the lock (Postgres also releases it if the process dies).
  return () => lockClient.end();
}
