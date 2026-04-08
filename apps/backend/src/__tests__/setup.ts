import { beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema/index.js';
import { sql } from 'drizzle-orm';

// Test database connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/fisio_app_test';
const client = postgres(DATABASE_URL);
export const testDb = drizzle(client, { schema });

beforeAll(async () => {
  // Clean up tables before running tests
  await cleanupDatabase();
});

afterAll(async () => {
  await client.end();
});

beforeEach(async () => {
  // Clean up before each test
  await cleanupDatabase();
});

async function cleanupDatabase() {
  // Delete in reverse order of foreign key dependencies
  await testDb.execute(sql`TRUNCATE TABLE bono_transactions CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE appointments CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE invoices CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE payments CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE bonos CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE blocked_times CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE working_schedules CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE appointment_types CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE rgpd_consents CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE patient_billing_data CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE patients CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE professionals CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE account CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE session CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE verification CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE "user" CASCADE`);
}
