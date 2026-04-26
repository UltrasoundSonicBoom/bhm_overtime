// Vitest 설정 — 단위 테스트만 (e2e는 Playwright가 담당)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    exclude: ['tests/e2e/**', 'node_modules/**']
  }
});
