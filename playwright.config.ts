import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig, devices } from '@playwright/test';

// Same env as the backend vitest suite: test database and NODE_ENV=test, which mounts /api/v1/test/*
const backendEnv = parseEnv(readFileSync('apps/backend/.env.test', 'utf8'));

export default defineConfig({
  testDir: './tests',
  // Every test resets the shared database
  workers: 1,
  use: {
    baseURL: backendEnv.CLIENT_APP_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @fisio-app/backend dev',
      url: `${backendEnv.BETTER_AUTH_URL}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      env: backendEnv,
    },
    {
      command: 'pnpm --filter @fisio-app/client-app dev',
      url: backendEnv.CLIENT_APP_URL,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: backendEnv.BETTER_AUTH_URL },
    },
  ],
});
