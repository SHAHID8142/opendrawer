import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4323',
    trace: 'off',
  },
  webServer: {
    command: 'npm run preview -- --port 4323 --host 127.0.0.1',
    url: 'http://127.0.0.1:4323',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
