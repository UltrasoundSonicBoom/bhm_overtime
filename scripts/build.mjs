#!/usr/bin/env node
// 자체 빌드 (Vite 대안) — 정적 자산에 content-hash 자동 부여
//
// 우리 47개 .js 는 IIFE/window 전역 의존 → ESM 마이그레이션 없이는 Vite 가
// 처리 못 함. 핵심 가치 (auto-hash → immutable cache 안전) 만 직접 구현.
//
// 동작:
//   1) HTML 안 <script src=> / <link href=> 매칭
//   2) 각 정적 파일 sha256 hash 8자리 부여 → assets/[name]-[hash].[ext]
//   3) HTML 의 src/href 를 hash 경로로 치환
//   4) data/, tabs/, 기타 디렉토리는 그대로 복사 (lazy load 경로 보존)
//
// 실행: npm run build → dist/ 출력
//
// 의존성 0 (Node 표준 fs/path/crypto 만)

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');
const ASSETS = join(DIST, 'assets');

// ── 1. dist 정리 ──
if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
mkdirSync(ASSETS, { recursive: true });

// ── 2. hash 부여 대상 (HTML 안 정적 참조만 — JS/CSS/woff) ──
// 이미지(.png/.svg 등) 와 .md/.json 등은 JS 코드 안에서 동적으로 fetch 되므로
// hash 붙이면 깨짐. root 에 그대로 복사.
const HASHABLE = /\.(js|mjs|css|woff2?|ttf|eot|otf)$/i;
const PLAIN_COPY = /\.(png|jpg|jpeg|gif|webp|svg|ico|md|txt|xml|json)$/i;
const hashMap = {};

const rootFiles = readdirSync(ROOT).filter(f => statSync(join(ROOT, f)).isFile());
for (const f of rootFiles) {
  if (HASHABLE.test(f)) {
    const content = readFileSync(join(ROOT, f));
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
    const ext = extname(f);
    const name = basename(f, ext);
    const hashedName = `${name}-${hash}${ext}`;
    writeFileSync(join(ASSETS, hashedName), content);
    hashMap[f] = `assets/${hashedName}`;
  } else if (PLAIN_COPY.test(f)) {
    // 이미지 / md / json 등 — root 에 그대로 복사 (JS 동적 ref 보존)
    copyFileSync(join(ROOT, f), join(DIST, f));
  }
}

console.log(`[build] hashed ${Object.keys(hashMap).length} files → dist/assets/`);
console.log(`[build] copied root static (images/md/json) as-is`);

// ── 3. HTML 처리 (src/href 치환) ──
const HTMLS = ['index.html', 'regulation.html', 'retirement.html'];
for (const html of HTMLS) {
  if (!existsSync(join(ROOT, html))) continue;
  let src = readFileSync(join(ROOT, html), 'utf8');
  for (const [orig, hashed] of Object.entries(hashMap)) {
    // src="X" / href="X" / src='X' / href='X' (절대/상대 경로 모두 매칭)
    const pattern = new RegExp(`(src|href)=(["'])\\.?\\/?${orig.replace(/\./g, '\\.')}(["'])`, 'g');
    src = src.replace(pattern, `$1=$2/${hashed}$3`);
  }
  writeFileSync(join(DIST, html), src);
}
console.log(`[build] processed ${HTMLS.length} HTML files`);

// ── 4. 디렉토리 통째 복사 (data/, tabs/, archive/ 등 — hash 미적용) ──
const COPY_DIRS = ['data', 'tabs', 'icons'];
function copyDir(srcDir, destDir) {
  if (!existsSync(srcDir)) return;
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const sp = join(srcDir, entry.name);
    const dp = join(destDir, entry.name);
    if (entry.isDirectory()) copyDir(sp, dp);
    else copyFileSync(sp, dp);
  }
}
for (const d of COPY_DIRS) copyDir(join(ROOT, d), join(DIST, d));
console.log(`[build] copied dirs: ${COPY_DIRS.join(', ')}`);

// ── 5. 기타 root 정적 파일 (hash 미적용) ──
const PLAIN_FILES = ['manifest.json', 'robots.txt', 'sitemap.xml', '.well-known'];
for (const f of PLAIN_FILES) {
  const sp = join(ROOT, f);
  if (existsSync(sp) && statSync(sp).isFile()) {
    copyFileSync(sp, join(DIST, f));
  }
}

console.log('[build] ✅ done. dist/ ready.');
