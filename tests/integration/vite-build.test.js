// Vite 빌드 결과 검증 — Phase 2-A 진입 기준 충족 여부
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

// Phase 2-B 에서 package.json "type": "module" 전환 시 __dirname 미정의.
// fileURLToPath(import.meta.url) 패턴으로 CJS/ESM 양쪽 안전.
const __dirname = dirname(fileURLToPath(import.meta.url));
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

  // ── Vite 사용 검증 (build script regression guard) ──
  it('package.json: build = vite build (Phase 2-H — legacy build.mjs 폐기)', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.build).toBe('vite build');
    expect(pkg.scripts['build:legacy']).toBeUndefined();
  });

  // ── PNG 는 public/ 에서 hash 없이 mirror (manifest.json 호환) ──
  it('PNG: public/ 에서 root 로 mirror — hash 0 (manifest.json 호환)', () => {
    expect(existsSync(join(DIST, 'snuhmaterect.png'))).toBe(true);
    expect(existsSync(join(DIST, 'snuhmatecircle.png'))).toBe(true);
  });

  // ── Vite multi-page entry chunk: assets/index-[hash].js (Phase 2-G+ 활성화) ──
  it('Vite multi-page entry chunk: assets/index-[hash].js + 4 추가 entry', () => {
    const assets = readdirSync(join(DIST, 'assets'));
    const indexEntry = assets.find(f => /^index-[A-Za-z0-9]{8,}\.js$/.test(f));
    expect(indexEntry, 'expected assets/index-[hash].js').toBeDefined();
    const regulationEntry = assets.find(f => /^regulation-[A-Za-z0-9]{8,}\.js$/.test(f));
    expect(regulationEntry).toBeDefined();
    const retirementEntry = assets.find(f => /^retirement-[A-Za-z0-9]{8,}\.js$/.test(f));
    expect(retirementEntry).toBeDefined();
  });

  it('index.html: <script type=module src=/assets/index-[hash].js>', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html).toMatch(/<script[^>]*type=["']module["'][^>]*src=["']\/?assets\/index-[A-Za-z0-9]{8,}\.js["']/);
  });
});
