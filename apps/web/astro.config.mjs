// @ts-check
import { defineConfig } from 'astro/config';

// Phase 6: Astro app — apps/web
// 9 entry HTML 의 점진적 마이그레이션 대상
export default defineConfig({
  site: 'https://snuhmate.com',
  output: 'static',
  build: {
    format: 'directory',
  },
  vite: {
    // packages/* 별칭 동기화 (Phase 6 Task 2 후 활성화)
  },
});
