import { defineConfig, devices } from '@playwright/test';
import { e2eEnv } from './tests/e2e-env';

const clientPort = new URL(e2eEnv.CLIENT_APP_URL).port;

export default defineConfig({
  testDir: './tests',
  // Every test resets the e2e database
  workers: 1,
  use: {
    baseURL: e2eEnv.CLIENT_APP_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @fisio-app/backend dev',
      url: `${e2eEnv.BETTER_AUTH_URL}/api/v1/health`,
      // Always our own server: an existing one could run another checkout's code or point at another DB
      reuseExistingServer: false,
      env: e2eEnv,
    },
    {
      // --strictPort: fail instead of moving to a port the backend does not trust (CORS)
      command: `pnpm --filter @fisio-app/client-app dev --port ${clientPort} --strictPort`,
      url: e2eEnv.CLIENT_APP_URL,
      reuseExistingServer: false,
      env: { VITE_API_URL: e2eEnv.BETTER_AUTH_URL },
    },
  ],
});
