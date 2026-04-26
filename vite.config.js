// Vite 빌드 설정 — Phase 2-H 후 final
//
// 모든 .js 가 ESM 으로 변환되고 5 entry HTML 이 단일 type=module 로 통합됨.
// 따라서 Phase 2-A~G 의 임시 legacy-iife-scripts plugin 은 제거됨.
//
// 동작:
//   1) 9 HTML 을 multi-page input 으로 등록 → Vite 가 type=module entry 그래프 처리
//   2) public/ — sw.js / manifest / data / tabs / 서브앱 (해시 없이 dist/ 복사)
//   3) hash 컨벤션: assets/[name]-[hash].js (Vite 기본)

import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: '.',
  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        index:           resolve(__dirname, 'index.html'),
        onboarding:      resolve(__dirname, 'onboarding.html'),
        dashboard:       resolve(__dirname, 'dashboard.html'),
        tutorial:        resolve(__dirname, 'tutorial.html'),
        terms:           resolve(__dirname, 'terms.html'),
        privacy:         resolve(__dirname, 'privacy.html'),
        schedule_suite:  resolve(__dirname, 'schedule_suite.html'),
        regulation:      resolve(__dirname, 'regulation.html'),
        retirement:      resolve(__dirname, 'retirement.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
