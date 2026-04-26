// Vite 빌드 설정 — Phase 2-A
//
// 목표:
//   1) 9개 HTML 엔트리 (multi-page mode)
//   2) hash 컨벤션: [name]-[hash].js (레거시 build.mjs 와 호환)
//   3) public/ 디렉토리: sw.js / manifest / data / tabs / icons / 서브앱 (해시 없이 그대로 복사)
//   4) ES Module 마이그레이션은 Phase 2-B에서 — 지금은 IIFE 그대로 통과
//
// 레거시 build.mjs 는 build:legacy 스크립트로 백업 보존.

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // root 는 프로젝트 루트 (HTML 들이 root 에 있음)
  root: '.',

  // public/ 디렉토리 — 해시 없이 dist/ 로 그대로 복사됨
  // sw.js (scope 보존), manifest.json, data/*.json, tabs/*.html, icons/, 서브앱 등
  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      // 9개 HTML 엔트리 (multi-page) — 키가 entry chunk 이름이 됨
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
        // 레거시 컨벤션 유지: assets/[name]-[hash].js
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
