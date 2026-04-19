import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // shared DB — keep sequential
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @fisio-app/backend dev',
      url: 'http://localhost:3000/api/v1/health',
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgres://user:password@localhost:5432/fisio_app_test',
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'test-secret-key-at-least-32-characters-long',
        BETTER_AUTH_URL: 'http://localhost:3000',
        PORT: '3000',
      },
    },
    {
      command: 'pnpm --filter @fisio-app/client-app dev',
      url: 'http://localhost:5173',
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_URL: 'http://localhost:3000',
      },
    },
  ],
});
