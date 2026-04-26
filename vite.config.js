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
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 루트 .js (IIFE / ESM 혼재) 를 dist/assets/ 로 hash 처리 + HTML rewrite.
//
// 점진적 마이그레이션 전략 (Phase 2-B ~ 2-G):
//   - ESM 모듈 (Layer 0+1+2+...) — esbuild bundle (format: iife) → classic-script-호환
//     (HTML script 태그가 type=module 으로 바뀌기 전까지 IIFE wrapper 필수)
//   - IIFE 모듈 (Layer 3~5 미변환) — 그대로 hash 복사
//
// Phase 2-G (Layer 5 entry) 시점:
//   HTML script 가 type=module 단일 entry 로 통합되면 이 plugin 제거 + Vite 자동 처리.
//
// ESM 판정: 명시 allowlist (ESM_MODULES). 주석/문자열의 'import' 키워드 false-positive 회피.
//
// Phase 2-B+C Layer 0+1: data, regulation-constants, shared-utils, calculators,
//                          holidays, retirement-engine
// Phase 2-D Layer 2: profile, overtime, leave, payroll
// Phase 2-E 진입 시: appLock 추가
// Phase 2-F 진입 시: shared-layout / tab-loader / *-tab.js / ... 추가
// Phase 2-G 진입 시: app / regulation / retirement entry — 이 시점에 plugin 폐기
const ESM_MODULES = new Set([
  // Layer 0+1
  'data.js', 'regulation-constants.js', 'shared-utils.js',
  'calculators.js', 'holidays.js', 'retirement-engine.js',
  // Layer 2 (Phase 2-D)
  'profile.js', 'overtime.js', 'leave.js', 'payroll.js',
]);

function legacyIifeScripts() {
  const ROOT = __dirname;
  const HASHABLE = /\.(js|mjs|css|woff2?|ttf|eot|otf)$/i;
  const JS_EXT = /\.(js|mjs)$/i;
  const HASH_EXCLUDE = new Set(['sw.js']);  // sw.js 는 public/ 에서 root 복사 (scope 보존)

  return {
    name: 'legacy-iife-scripts',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      const distDir = resolve(ROOT, 'dist');
      const assetsDir = resolve(distDir, 'assets');
      mkdirSync(assetsDir, { recursive: true });

      // 1. 루트 hashable 파일 수집 → 필요 시 IIFE bundle → hash 부여 → dist/assets/
      const hashMap = {};
      let esmBundled = 0, iifeCopied = 0;
      const rootJsFiles = new Set(readdirSync(ROOT).filter(f => JS_EXT.test(f)));

      for (const f of readdirSync(ROOT)) {
        if (!HASHABLE.test(f) || HASH_EXCLUDE.has(f)) continue;
        const sp = resolve(ROOT, f);
        if (!statSync(sp).isFile()) continue;

        let content;
        if (JS_EXT.test(f) && ESM_MODULES.has(f)) {
          // ESM 모듈 — esbuild 로 IIFE bundle (cross-import 인라인)
          // external: 다른 root .js 들도 자체 entry 로 빌드되므로 external 처리해
          //   각 파일이 독립 IIFE 가 되도록. 단, classic script 환경에선 import
          //   런타임 resolver 가 없으므로 — 이건 부적합.
          // 대신 bundle: true 로 모든 의존을 인라인. 같은 모듈이 여러 번 빌드되어도
          // window.X 호환층은 idempotent (`window.X = X`) 라 안전.
          const result = await esbuild.build({
            entryPoints: [sp],
            bundle: true,
            format: 'iife',
            platform: 'browser',
            target: 'es2020',
            write: false,
            minify: false,
            logLevel: 'silent',
            absWorkingDir: ROOT,
          });
          content = Buffer.from(result.outputFiles[0].contents);
          esmBundled++;
        } else {
          content = readFileSync(sp);
          if (JS_EXT.test(f)) iifeCopied++;
        }

        const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
        const ext = extname(f);
        const base = basename(f, ext);
        const hashed = `${base}-${hash}${ext}`;
        writeFileSync(resolve(assetsDir, hashed), content);
        hashMap[f] = `assets/${hashed}`;
      }

      // 2. dist/*.html 안 src/href rewrite
      for (const html of readdirSync(distDir)) {
        if (!html.endsWith('.html')) continue;
        const hp = resolve(distDir, html);
        if (!statSync(hp).isFile()) continue;
        let src = readFileSync(hp, 'utf8');
        for (const [orig, hashed] of Object.entries(hashMap)) {
          const escaped = orig.replace(/\./g, '\\.');
          const re = new RegExp(`(src|href)=(["'])\\.?\\/?${escaped}(["'])`, 'g');
          src = src.replace(re, `$1=$2/${hashed}$3`);
        }
        writeFileSync(hp, src);
      }

      console.log(`[legacy-iife-scripts] ESM IIFE-bundled: ${esmBundled}, IIFE copied: ${iifeCopied}, total hashed: ${Object.keys(hashMap).length}`);
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
