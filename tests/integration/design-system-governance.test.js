import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

let cfg;
beforeAll(() => {
  cfg = readFileSync('apps/web/tailwind.config.js', 'utf-8');
});

describe('Tailwind config — module loadability', () => {
  it('tailwind.config.js loads as a valid ES module with default export', async () => {
    // Resolve absolute path so test works regardless of cwd
    const cfgPath = resolve(process.cwd(), 'apps/web/tailwind.config.js');
    const mod = await import(cfgPath);
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('object');
    expect(Array.isArray(mod.default.content)).toBe(true);
    expect(mod.default.theme).toBeDefined();
    expect(mod.default.theme.extend).toBeDefined();
  });
});

describe('Tailwind config — design system extensions', () => {
  it('theme.extend.spacing 안 --space-* token 참조', () => {
    expect(cfg).toMatch(/spacing:\s*\{[^}]*'1':\s*'var\(--space-1\)'/s);
    expect(cfg).toMatch(/'12':\s*'var\(--space-12\)'/);
  });
  it('theme.extend.fontSize 안 ds-* 키 10개 모두 정의', () => {
    for (const k of ['ds-display', 'ds-h1', 'ds-h2', 'ds-h3', 'ds-h4', 'ds-body-lg', 'ds-body-md', 'ds-body-sm', 'ds-label', 'ds-caption']) {
      expect(cfg).toMatch(new RegExp("'" + k + "':"));
    }
  });
  it('theme.extend.colors.ds 안 status + text + bg 토큰 참조', () => {
    expect(cfg).toMatch(/ds:\s*\{[^}]*'text-primary':\s*'var\(--color-text-primary\)'/s);
    expect(cfg).toMatch(/'status-success':\s*'var\(--color-status-success\)'/);
    expect(cfg).toMatch(/'status-error':\s*'var\(--color-status-error\)'/);
    expect(cfg).toMatch(/'border-focus':\s*'var\(--color-border-focus\)'/);
  });
  it('theme.extend.colors.ds 안 duty 토큰을 Tailwind 유틸로 노출', () => {
    for (const k of ['duty-day', 'duty-day-bg', 'duty-evening', 'duty-evening-bg', 'duty-night', 'duty-night-bg', 'duty-off', 'duty-off-bg', 'duty-leave', 'duty-leave-bg', 'duty-recovery', 'duty-recovery-bg', 'duty-holiday', 'duty-holiday-bg']) {
      expect(cfg).toMatch(new RegExp("'" + k + "':\\s*'var\\(--color-" + k + "\\)'"));
    }
  });
  it('기존 brand-* 키 유지 (호환)', () => {
    expect(cfg).toContain("'bg-primary': 'var(--bg-primary)'");
    expect(cfg).toContain("'accent-indigo': 'var(--accent-indigo)'");
  });
  it('ring tokens (focus-ring 토큰 참조)', () => {
    expect(cfg).toMatch(/ringColor:\s*\{[^}]*'ds-focus':\s*'var\(--focus-ring-color\)'/s);
    expect(cfg).toMatch(/ringWidth:\s*\{[^}]*'ds':\s*'var\(--focus-ring-width\)'/s);
    expect(cfg).toMatch(/ringOffsetWidth:\s*\{[^}]*'ds':\s*'var\(--focus-ring-offset\)'/s);
  });
});

describe('Tailwind JIT — extended utilities present in dist CSS (build smoke)', () => {
  // 이 테스트는 build 후 dist/_astro/*.css 를 읽어서 extended utility 가
  // 실제로 generate 되었는지 확인한다. build 가 없으면 skip.
  it('dist CSS 에 gap-12 / my-4 / mx-4 / grid-cols-3 등 extended class 존재 (Slice 6 JIT 검증)', () => {
    const distDir = 'apps/web/dist/_astro';
    if (!existsSync(distDir)) {
      console.warn('[skip] dist 없음 — pnpm --filter @snuhmate/web build 후 다시 실행하세요.');
      return;
    }
    const files = readdirSync(distDir).filter(f => f.endsWith('.css'));
    if (files.length === 0) {
      console.warn('[skip] dist CSS 없음.');
      return;
    }
    const allCss = files.map(f => readFileSync(join(distDir, f), 'utf-8')).join('\n');
    // Stack/Grid/Divider 의 explicit map 으로 인해 generate 되어야 하는 utility
    const required = [
      // Slice 6 layout
      '.gap-12', '.my-4', '.mx-4', '.grid-cols-3',
      // Slice 7 tokens.astro typography preview (Slice 8 fix)
      '.text-ds-display', '.text-ds-h1', '.text-ds-h2', '.text-ds-h3', '.text-ds-h4',
      '.text-ds-body-lg', '.text-ds-body-md', '.text-ds-body-sm',
      '.text-ds-label', '.text-ds-caption',
      // Slice 7 tokens.astro radius preview (Slice 8 fix)
      '.rounded-brand-sm', '.rounded-brand-md', '.rounded-brand-lg',
      '.rounded-brand-xl', '.rounded-brand-full',
    ];
    for (const cls of required) {
      expect(allCss).toContain(cls);
    }
  });
});

// ── inline style 잔존 검사 ────────────────────────────────────────────────────

describe('inline style 잔존 검사', () => {
  it('OvertimeIsland inline style 잔존 없음 (display:none / CSS custom prop 제외)', () => {
    const src = readFileSync('apps/web/src/components/tabs/OvertimeIsland.astro', 'utf-8');
    // display:none 과 CSS custom prop (--xxx:) 은 허용
    const illegal = (src.match(/style="([^"]*)"/g) || []).filter(s => {
      const body = s.slice(7, -1).trim();
      return !/^display:\s*none/.test(body)
          && !/^--[a-z]/.test(body);
    });
    expect(illegal, '허용 외 inline style: ' + illegal.join('\n')).toHaveLength(0);
  });

  it('LeaveIsland inline style 잔존 없음 (display:none 제외)', () => {
    const src = readFileSync('apps/web/src/components/tabs/LeaveIsland.astro', 'utf-8');
    const illegal = (src.match(/style="([^"]*)"/g) || []).filter(s => {
      const body = s.slice(7, -1).trim();
      return !/^display:\s*(none|block|flex|grid|inline|inline-flex|inline-block)/.test(body)
          && !/^--[a-z]/.test(body);
    });
    expect(illegal, '허용 외 inline style: ' + illegal.join('\n')).toHaveLength(0);
  });

  it('SettingsIsland inline style 잔존 없음 (display:none/block/flex 제외)', () => {
    const src = readFileSync('apps/web/src/components/tabs/SettingsIsland.astro', 'utf-8');
    const illegal = (src.match(/style="([^"]*)"/g) || []).filter(s => {
      const body = s.slice(7, -1).trim();
      return !/^display:\s*(none|block|flex|grid|inline|inline-flex|inline-block)/.test(body)
          && !/^--[a-z]/.test(body);
    });
    expect(illegal, '허용 외 inline style: ' + illegal.join('\n')).toHaveLength(0);
  });

  it('ProfileIsland inline style 잔존 없음 (display:none 제외)', () => {
    const src = readFileSync('apps/web/src/components/tabs/ProfileIsland.astro', 'utf-8');
    const illegal = (src.match(/style="([^"]*)"/g) || []).filter(s => {
      const body = s.slice(7, -1).trim();
      return !/^display:\s*(none|block|flex|grid|inline|inline-flex|inline-block)/.test(body)
          && !/^--[a-z]/.test(body);
    });
    expect(illegal, '허용 외 inline style: ' + illegal.join('\n')).toHaveLength(0);
  });

  it('PayrollIsland inline style 잔존 없음 (display:none 제외)', () => {
    const src = readFileSync('apps/web/src/components/tabs/PayrollIsland.astro', 'utf-8');
    const illegal = (src.match(/style="([^"]*)"/g) || []).filter(s => {
      const body = s.slice(7, -1).trim();
      return !/^display:\s*(none|block|flex|grid|inline|inline-flex|inline-block)/.test(body)
          && !/^--[a-z]/.test(body);
    });
    expect(illegal, '허용 외 inline style: ' + illegal.join('\n')).toHaveLength(0);
  });
});

// ── Slice 8: Governance Lint (HomeIsland reference migration) ─────────────────

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (p.endsWith('.astro')) files.push(p);
  }
  return files;
}

describe('Governance — design system lint (HomeIsland reference)', () => {
  const TARGET_DIRS = [
    'apps/web/src/components/tabs',
  ];
  const SKIP_PREFIX = ['apps/web/src/pages/design-system'];

  function getTargets() {
    const out = [];
    for (const d of TARGET_DIRS) {
      for (const f of walk(d)) {
        if (SKIP_PREFIX.some(s => f.startsWith(s))) continue;
        out.push(f);
      }
    }
    return out;
  }

  it('HomeIsland.astro 의 inline style 안 raw hex 0건', () => {
    const files = getTargets().filter(f => f.includes('HomeIsland.astro'));
    expect(files.length).toBeGreaterThan(0);
    const violations = [];
    const STYLE_RX = /style=["']([^"']*)["']/g;
    const HEX_RX = /#[0-9a-fA-F]{3,8}/;
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      let m;
      while ((m = STYLE_RX.exec(src)) !== null) {
        const styleVal = m[1];
        if (HEX_RX.test(styleVal)) {
          violations.push(f + ': style="' + styleVal + '"');
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('HomeIsland.astro 의 inline style 안 raw px (font-size/padding/margin/gap) 0건', () => {
    const files = getTargets().filter(f => f.includes('HomeIsland.astro'));
    const violations = [];
    const STYLE_RX = /style=["']([^"']*)["']/g;
    const RAW_PX_RX = /(font-size|padding|margin|gap):\s*\d+px/i;
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      let m;
      while ((m = STYLE_RX.exec(src)) !== null) {
        const styleVal = m[1];
        const stripped = styleVal.replace(/var\([^)]*\)/g, '');
        if (RAW_PX_RX.test(stripped)) {
          violations.push(f + ': style="' + styleVal + '"');
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('HomeIsland.astro 의 inline style 안 raw rgba 0건', () => {
    const files = getTargets().filter(f => f.includes('HomeIsland.astro'));
    const violations = [];
    const STYLE_RX = /style=["']([^"']*)["']/g;
    const RGBA_RX = /rgba?\(/i;
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      let m;
      while ((m = STYLE_RX.exec(src)) !== null) {
        const styleVal = m[1];
        if (RGBA_RX.test(styleVal)) {
          violations.push(f + ': style="' + styleVal + '"');
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
