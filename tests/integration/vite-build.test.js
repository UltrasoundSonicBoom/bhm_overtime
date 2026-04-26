// Vite 빌드 결과 검증 — Phase 2-A 진입 기준 충족 여부
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const ROOT = join(__dirname, '../..');
const DIST = join(ROOT, 'dist');

describe('Vite build (Phase 2-A)', () => {
  beforeAll(() => {
    const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('vite build failed');
  }, 120_000);

  it('dist/ 가 생성됐다', () => {
    expect(existsSync(DIST)).toBe(true);
  });

  const HTMLS = [
    'index.html', 'onboarding.html', 'dashboard.html', 'tutorial.html',
    'terms.html', 'privacy.html', 'schedule_suite.html',
    'regulation.html', 'retirement.html'
  ];
  it.each(HTMLS)('%s 가 dist 에 있다', (html) => {
    expect(existsSync(join(DIST, html))).toBe(true);
  });

  it('sw.js 는 hash 없이 root 에 있다 (scope 보존)', () => {
    expect(existsSync(join(DIST, 'sw.js'))).toBe(true);
    expect(readdirSync(DIST).find(f => /^sw-[a-f0-9]+\.js$/.test(f))).toBeUndefined();
  });

  it('data/*.json 은 hash 없이 보존 (JS fetch)', () => {
    expect(existsSync(join(DIST, 'data'))).toBe(true);
  });

  it('manifest.json 은 root 에 있다 (PWA)', () => {
    expect(existsSync(join(DIST, 'manifest.json'))).toBe(true);
  });

  it('index.html 안 style 는 hash 처리됐다', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    // 레거시: sha256 hex [a-f0-9]{8} / Vite: base62 [A-Za-z0-9]{8} → 양쪽 허용
    expect(html).toMatch(/(src|href)=["']\/?assets\/[a-zA-Z0-9_.-]+-[A-Za-z0-9]{8,}\.(js|css)["']/);
  });

  // ── Vite multi-page transform 검증 (레거시와 구별) ──
  //
  // 레거시 build.mjs 는 PNG/이미지를 root 에 그대로 복사 (PLAIN_COPY 분기).
  // Vite 는 HTML 안 <img src="snuhmaterect.png"> 같은 참조를 만나면 자동으로
  // assets/snuhmaterect-[hash].png 로 hash + rewrite. 따라서 dist/assets/ 안
  // 에 hash 처리된 PNG 가 존재하는 것은 Vite 처리의 명확한 마커.
  //
  // 또한 Vite 는 9개 HTML 을 multi-page input 으로 받았으므로 9개 모두
  // dist/ 에 존재해야 함 (기존 검증과 중복이지만 Vite 입력 누락 검출 용도).
  it('Vite asset pipeline 동작 — 이미지 hash 처리', () => {
    const assets = readdirSync(join(DIST, 'assets'));
    // 레거시는 PNG 를 root 에 복사 (assets/ 에 없음). Vite 는 HTML 참조 PNG 를 hash.
    const hashedPng = assets.find(f => /\.png$/i.test(f) && /-[A-Za-z0-9]{6,}\.png$/.test(f));
    expect(hashedPng, 'expected dist/assets/*-[hash].png (Vite asset pipeline)').toBeDefined();
  });

  it('index.html: 이미지 src 는 Vite-rewrite 된 /assets/ 경로', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    // 레거시 dist/index.html: <img src="./snuhmatecircle.png"> (root 복사 그대로)
    // Vite dist/index.html:    <img src="/assets/snuhmatecircle-[hash].png"> (rewrite)
    expect(html).toMatch(/(src|href)=["']\/?assets\/snuhmate?\w*-[A-Za-z0-9]{6,}\.png["']/);
  });

  // ── Phase 2-B 진입 신호 (현재는 미통과 — IIFE 의존) ──
  //
  // 모든 .js 가 ESM 으로 변환되면 Vite multi-page input 의 entry chunk
  // (assets/index-[hash].js) 가 생성되어 이 테스트가 PASS. Phase 2-B 완료
  // 시점의 회귀 가드.
  it.skip('[Phase 2-B 후 enable] Vite multi-page entry chunk: assets/index-[hash].js', () => {
    const assets = readdirSync(join(DIST, 'assets'));
    const indexEntry = assets.find(f => /^index-[A-Za-z0-9]{8,}\.js$/.test(f));
    expect(indexEntry, 'expected assets/index-[hash].js (Vite entry chunk)').toBeDefined();
  });
});
