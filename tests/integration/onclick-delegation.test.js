// 빌드 결과의 inline onclick 인벤토리 — Phase 3 진행에 따라 0 으로 수렴.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const DIST = join(ROOT, 'dist');

describe('onclick delegation — Phase 3', () => {
  beforeAll(() => {
    const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('build failed');
  }, 120_000);

  // ── 정적 HTML 9 화면에 inline onclick 0 ──
  it('정적 HTML inline onclick 0 — Phase 3-A 완료 기준', () => {
    const HTMLS = readdirSync(DIST).filter(f => f.endsWith('.html'));
    const offenders = [];
    for (const html of HTMLS) {
      const content = readFileSync(join(DIST, html), 'utf8');
      const matches = content.match(/onclick="[^"]+"/g) || [];
      if (matches.length > 0) {
        offenders.push(html + ': ' + matches.length + ' (' + matches.slice(0, 2).join(' | ') + ')');
      }
    }
    expect(offenders, 'HTML inline onclick 잔존').toEqual([]);
  });

  // ── Phase 3-E 완료 기준: dist/assets/*.js 안 onclick=" 문자열 0 ──
  it('dist/assets/*.js 안 onclick=" 문자열 0 — Phase 3-E 완료 기준', () => {
    const assets = readdirSync(join(DIST, 'assets')).filter(f => f.endsWith('.js'));
    const offenders = [];
    for (const f of assets) {
      const content = readFileSync(join(DIST, 'assets', f), 'utf8');
      // 'onclick="' 문자열 인스턴스 (innerHTML markup) — 주석/코드 일부 false-positive 가능
      const matches = content.match(/onclick="[^"]+"/g) || [];
      if (matches.length > 0) offenders.push(f + ': ' + matches.length);
    }
    expect(offenders).toEqual([]);
  });

  // ── Phase 3-F 후 enable: root .js 의 window.X 호환층 KEEP allowlist 만 ──
  it.skip('[Phase 3-F 후 enable] root .js 의 window.X 호환층 KEEP only', () => {
    const rootJs = readdirSync(ROOT).filter(f => f.endsWith('.js') && !f.startsWith('vite'));
    const offenders = [];
    for (const f of rootJs) {
      const content = readFileSync(join(ROOT, f), 'utf8');
      const matches = content.match(/^\s*window\.[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[a-zA-Z_]/gm) || [];
      if (matches.length > 0) offenders.push(f + ': ' + matches.length);
    }
    expect(offenders).toEqual([]);
  });
});
