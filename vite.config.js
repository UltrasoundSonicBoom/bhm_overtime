// Vite 빌드 설정 — Phase 2-A
//
// 목표:
//   1) 9개 HTML 엔트리 (multi-page mode)
//   2) hash 컨벤션: assets/[name]-[hash].js (레거시 build.mjs 와 호환)
//   3) public/ 디렉토리: sw.js / manifest / data / tabs / 서브앱 (해시 없이 그대로 복사)
//   4) ES Module 마이그레이션은 Phase 2-B에서 — 지금은 IIFE 그대로 통과
//
// 레거시 build.mjs 는 build:legacy 스크립트로 백업 보존.
//
// IIFE 임시 plugin (legacyScripts):
//   Vite 는 HTML 안 non-module <script src=> 를 warn 하고 무시 → dist 에 .js 0개.
//   Phase 2-B 에서 모든 .js 가 ESM 으로 변환되면 Vite 가 자동 처리하므로 이
//   plugin 은 Phase 2-H 정리 시점에 제거.

import { defineConfig } from 'vite';
import { resolve, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import {
  readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync,
} from 'fs';
import { createHash } from 'crypto';

// Phase 2-B 에서 package.json "type": "module" 로 전환 → __dirname 미정의.
// fileURLToPath(import.meta.url) 패턴은 CJS/ESM 양쪽 모두에서 안전.
const __dirname = dirname(fileURLToPath(import.meta.url));

// 루트 .js (IIFE) 를 hash 처리해 dist/assets/ 로 복사 + HTML <script src> rewrite.
// Phase 2-B 의 ESM 변환 후엔 Vite 가 직접 처리 → 이 plugin 제거 가능.
function legacyIifeScripts() {
  const ROOT = __dirname;
  const HASHABLE = /\.(js|mjs|css|woff2?|ttf|eot|otf)$/i;
  const HASH_EXCLUDE = new Set(['sw.js']);  // sw.js 는 public/ 에서 root 복사 (scope 보존)
  return {
    name: 'legacy-iife-scripts',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const distDir = resolve(ROOT, 'dist');
      const assetsDir = resolve(distDir, 'assets');
      mkdirSync(assetsDir, { recursive: true });

      // 1. 루트 hashable 파일 수집 → hash 부여 → dist/assets/ 작성
      const hashMap = {};
      for (const f of readdirSync(ROOT)) {
        if (!HASHABLE.test(f) || HASH_EXCLUDE.has(f)) continue;
        const sp = resolve(ROOT, f);
        if (!statSync(sp).isFile()) continue;
        const content = readFileSync(sp);
        const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
        const ext = extname(f);
        const base = basename(f, ext);
        const hashed = `${base}-${hash}${ext}`;
        writeFileSync(resolve(assetsDir, hashed), content);
        hashMap[f] = `assets/${hashed}`;
      }

      // 2. dist/*.html 안 src/href rewrite (Vite 가 처리 못 한 IIFE 경로)
      for (const html of readdirSync(distDir)) {
        if (!html.endsWith('.html')) continue;
        const hp = resolve(distDir, html);
        if (!statSync(hp).isFile()) continue;
        let src = readFileSync(hp, 'utf8');
        for (const [orig, hashed] of Object.entries(hashMap)) {
          // src="X" / href="X" / src='X' / href='X' (절대/상대 경로 모두)
          const escaped = orig.replace(/\./g, '\\.');
          const re = new RegExp(`(src|href)=(["'])\\.?\\/?${escaped}(["'])`, 'g');
          src = src.replace(re, `$1=$2/${hashed}$3`);
        }
        writeFileSync(hp, src);
      }

      const count = Object.keys(hashMap).length;
      console.log(`[legacy-iife-scripts] ${count} 파일 hash → dist/assets/ + HTML rewrite`);
    },
  };
}

export default defineConfig({
  // root 는 프로젝트 루트 (HTML 들이 root 에 있음)
  root: '.',

  // public/ 디렉토리 — 해시 없이 dist/ 로 그대로 복사됨
  // sw.js (scope 보존), manifest.json, data/*.json, tabs/*.html, 서브앱 등
  publicDir: 'public',

  plugins: [legacyIifeScripts()],

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
