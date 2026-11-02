import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env.test before any module reads process.env, so the app under test (db/index.ts, lib/auth.ts)
// uses the test database instead of the developer's .env.
const testEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '.env.test')));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: testEnv,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
