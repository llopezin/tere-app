import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import path from 'path';
import { env } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
await client.end();
