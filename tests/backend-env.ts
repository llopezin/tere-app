import { e2eEnv } from './e2e-env';

// The backend modules imported by seed.ts read process.env when they load, so this module must be imported first
Object.assign(process.env, e2eEnv);
