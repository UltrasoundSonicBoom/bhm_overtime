// PNG / favicon / manifest icon / notice.md 등 정적 자산이
// dist/ 빌드 후에도 HTML 참조 경로에서 200 응답 가능한 위치에 있는지 검증.
//
// Phase 2-A public/ 이전 후 실제 회귀 자주 발생한 영역.
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const DIST = join(ROOT, 'dist');

describe('Asset integrity (Phase 2 검증)', () => {
  beforeAll(() => {
    const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('build failed');
  }, 120_000);

  // ── PNG 5개 모두 dist/ root 에 존재 ──
  const PNGS = ['snuhmaterect.png', 'snuhmatecircle.png', 'logo.png', 'overtime.png', 'vacation.png'];
  it.each(PNGS)('%s 가 dist/ root 에 mirror 됨', (png) => {
    expect(existsSync(join(DIST, png))).toBe(true);
  });

  // ── 9 HTML 안 모든 png 참조가 dist/ 에 실제 존재 ──
  it('HTML 안 모든 PNG 참조 → dist/ 실존', () => {
    const HTMLS = readdirSync(DIST).filter(f => f.endsWith('.html'));
    const broken = [];
    for (const html of HTMLS) {
      const content = readFileSync(join(DIST, html), 'utf8');
      // src/href 의 .png 추출 (절대/상대 경로 모두; query string 제거)
      const refs = content.match(/(?:src|href)=["'][^"']*\.png[^"']*["']/g) || [];
      for (const ref of refs) {
        const m = ref.match(/["']([^"']+)["']/);
        if (!m) continue;
        let path = m[1].split('?')[0]; // strip query string
        // /assets/...-[hash].png 는 Vite 자동 처리 — 무시
        if (path.includes('/assets/')) continue;
        // ./X.png or X.png → dist/X.png
        const file = path.replace(/^\.?\//, '');
        const target = join(DIST, file);
        if (!existsSync(target)) broken.push(`${html}: ${ref} → ${file} (NOT FOUND)`);
      }
    }
    expect(broken, 'broken PNG links').toEqual([]);
  });

  // ── manifest.json 의 icons[].src 가 모두 dist/ 에 실존 ──
  it('manifest.json icons → dist/ 실존', () => {
    const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'));
    const broken = [];
    for (const icon of manifest.icons || []) {
      const path = icon.src.replace(/^\.?\//, '').split('?')[0];
      const target = join(DIST, path);
      if (!existsSync(target)) broken.push(`${icon.src} (NOT FOUND)`);
    }
    expect(broken, 'broken manifest icon links').toEqual([]);
  });

  // ── notice.md (app.js fetch '/notice.md') ──
  it('notice.md 가 dist/ 에 있다 (app.js runtime fetch)', () => {
    expect(existsSync(join(DIST, 'notice.md'))).toBe(true);
  });

  // ── CHANGELOG.md (app.js fetch '/CHANGELOG.md') ──
  it('CHANGELOG.md 가 dist/ 에 있다 (app.js fetch — production 회귀 방지)', () => {
    expect(existsSync(join(DIST, 'CHANGELOG.md'))).toBe(true);
  });

  // ── /data/ JSON 파일들 (regulation.js, holidays.js, calc-registry.test.js fetch) ──
  it('data/ 핵심 JSON / MD / PDF dist/data/ 존재', () => {
    expect(existsSync(join(DIST, 'data', 'calc-registry.json'))).toBe(true);
    expect(existsSync(join(DIST, 'data', 'union_regulation_2026.json'))).toBe(true);
    expect(existsSync(join(DIST, 'data', 'full_union_regulation_2026.md'))).toBe(true);
    expect(existsSync(join(DIST, 'data', '2026_handbook.pdf'))).toBe(true);
  });

  // ── tabs/*.html (tab-loader.js fetch) ──
  it('tabs/*.html 모두 dist/tabs/ 존재', () => {
    const TABS = ['tab-home.html', 'tab-leave.html', 'tab-overtime.html',
                  'tab-payroll.html', 'tab-profile.html', 'tab-reference.html',
                  'tab-settings.html', 'tab-feedback.html'];
    const broken = TABS.filter(t => !existsSync(join(DIST, 'tabs', t)));
    expect(broken).toEqual([]);
  });

  // ── sw.js root 보존 (Service Worker scope) ──
  it('sw.js dist/ root 에 있고 hash 처리 안 됨 (scope: /)', () => {
    expect(existsSync(join(DIST, 'sw.js'))).toBe(true);
    const swInAssets = readdirSync(join(DIST, 'assets')).find(f => /^sw-[a-f0-9]+\.js$/.test(f));
    expect(swInAssets).toBeUndefined();
  });
});
