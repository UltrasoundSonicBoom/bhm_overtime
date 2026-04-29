// Playwright 설정 — SNUH Mate e2e 스모크
// Phase 6 이후 Astro 라우팅 (/, /app, /regulation 등) 을 사용하므로
// Astro dev 서버를 webServer 로 기동. 정적 python 서버는 Astro 라우트를 모름.
import { defineConfig } from '@playwright/test';

const PORT = 4321;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ],
  webServer: {
    command: 'npm run -w @snuhmate/web dev',
    url: `http://localhost:${PORT}/app`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
