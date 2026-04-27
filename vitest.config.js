// Vitest 설정 — 단위 + 통합 테스트 (e2e는 Playwright가 담당)
//
// include: 패턴은 광역 (test:unit / test:integration 분리는 package.json scripts 에서)
//   - tests/unit/**          순수 단위 (빠름)
//   - tests/integration/**   빌드 의존 통합 (느림 — Vite 빌드 1회 ~150ms)
//
// fileParallelism: false — integration 테스트가 dist/ 공유 자원 (npm run build) 을
// 동시 spawnSync 하면 emptyOutDir + race 로 hash 충돌. 직렬화로 해결.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    fileParallelism: false,
  }
});
