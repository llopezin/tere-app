import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

/** Env of the e2e stack: its own database and ports (see apps/backend/.env.e2e). */
export const e2eEnv = parseEnv(readFileSync('apps/backend/.env.e2e', 'utf8'));
