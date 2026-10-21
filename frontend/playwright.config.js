import { defineConfig } from '@playwright/test';
// Requires: MongoDB running, backend (npm run dev in backend), AI service optional, frontend dev server.
export default defineConfig({
  testDir: './e2e', timeout: 60000, workers: 1, retries: 0,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } }, testIgnore: /mobile\.spec\.js/ },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } }, testMatch: /mobile\.spec\.js/ },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
});
