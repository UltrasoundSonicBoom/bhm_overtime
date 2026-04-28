// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Phase 6: Astro app — apps/web
// 9 entry HTML 의 점진적 마이그레이션 대상
// Phase 7-1: Tailwind v3 integration. applyBaseStyles=false 로 기존 globals.css reset 보호.
export default defineConfig({
  site: 'https://snuhmate.com',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    // packages/* 별칭 동기화 (Phase 6 Task 2 후 활성화)
  },
});
