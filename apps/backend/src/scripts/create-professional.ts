/**
 * Creates a professional account (public sign-up only creates patients).
 *
 * Usage:
 *   pnpm --filter @fisio-app/backend create-professional -- \
 *     --email ana@clinica.es --password 'secret123' --first-name Ana --last-name García
 */
import { parseArgs } from 'node:util';
import { createProfessionalAccount } from '../services/professional-account.service.js';

const { values } = parseArgs({
  // `pnpm create-professional -- --email ...` forwards the `--` separator literally
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    'first-name': { type: 'string' },
    'last-name': { type: 'string' },
  },
});

const { email, password } = values;
const firstName = values['first-name'];
const lastName = values['last-name'];

if (!email || !password || !firstName || !lastName) {
  console.error('Usage: create-professional --email <email> --password <password> --first-name <name> --last-name <name>');
  process.exit(1);
}

try {
  const { professional } = await createProfessionalAccount({ email, password, firstName, lastName });
  console.log(`✅ Professional created: ${professional.firstName} ${professional.lastName} <${professional.email}> (${professional.id})`);
  process.exit(0);
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
