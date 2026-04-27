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

  // ── Phase 3-F: root .js 의 window.X 호환층 KEEP allowlist 외 0 ──
  it('root .js 의 window.X 호환층 KEEP only — Phase 3-F 완료 기준', () => {
    // KEEP: 외부 모듈 / inline HTML script 가 참조하는 진짜 필요한 노출
    const KEEP = new Set([
      // ESM 모듈 ↔ legacy IIFE 호환 (다른 모듈이 window.X 참조)
      'AppLock', 'CALC', 'DATA', 'DATA_STATIC', 'HOLIDAYS',
      'LEAVE', 'PAYROLL', 'OVERTIME', 'PROFILE', 'RetirementEngine', 'escapeHtml',
      // app.js entry safeCall 동적 dispatch 대상
      'switchTab', 'switchHomePeriod', 'initHomeTab', 'changelogPage',
      'initPayrollTab', '_propagatePayslipToWorkHistory',
      // app.js 의 entry handler 참조
      'closeMigrationModal', 'downloadBackupAndStay', 'switchToProfileTab',
      // tab-loader 동적 dispatch
      'loadTab', 'prefetchTabs',
      // utils-lazy 동적 호출
      'loadPDFJS', 'loadXLSX',
      // inline-ui-helpers
      'updateHourlyWarning', 'dismissHwBanner',
      // shared-utils 헬퍼 (다른 entry 가 import 하지만 window 호환층 보존)
      'delegateActions', 'delegateInput', 'registerActions', 'registerInputActions',
      // function expression 형태 (Phase 4 정리 candidate — 일단 KEEP)
      'renderPayHistory', 'renderPayPayslip', 'syncCloudData',
    ]);
    const rootJs = readdirSync(ROOT).filter(f => f.endsWith('.js') && !f.startsWith('vite') && f !== 'vitest.config.js');
    const offenders = [];
    for (const f of rootJs) {
      const content = readFileSync(join(ROOT, f), 'utf8');
      const matches = content.match(/^\s*window\.([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*[a-zA-Z_]/gm) || [];
      for (const m of matches) {
        const fnMatch = m.match(/window\.([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (fnMatch && !KEEP.has(fnMatch[1])) {
          offenders.push(f + ': ' + fnMatch[1]);
        }
      }
    }
    expect(offenders, 'KEEP allowlist 외 window.X 호환층').toEqual([]);
  });
});
