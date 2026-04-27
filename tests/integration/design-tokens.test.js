// Phase 5-followup 회귀 가드 — design tokens split
// neo 토큰 = default :root, 다크 토큰 = data-theme="dark" → style.dark.css
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';

let cssMain;
let cssDark;

beforeAll(() => {
  cssMain = readFileSync('style.css', 'utf-8');
  cssDark = existsSync('style.dark.css') ? readFileSync('style.dark.css', 'utf-8') : '';
});

describe('Design Tokens Split (Phase 5-followup)', () => {
  it('style.css :root 가 neo 토큰을 default 로 가짐', () => {
    const rootMatch = cssMain.match(/^:root\s*\{([\s\S]*?)^\}/m);
    expect(rootMatch).toBeTruthy();
    const rootBody = rootMatch[1];
    // neo 토큰 marker
    expect(rootBody).toContain('#6C5CE7');  // neo accent-indigo
    expect(rootBody).toContain('#FFFDF5');  // neo bg-primary
  });

  it('style.dark.css 존재 + data-theme="dark" 토큰 정의', () => {
    expect(cssDark.length).toBeGreaterThan(0);
    expect(cssDark).toContain('html[data-theme="dark"]');
    expect(cssDark).toContain('#6366f1');   // dark accent-indigo
    expect(cssDark).toContain('#09090b');   // dark bg-primary
  });

  it('style.css 의 html[data-theme="neo"] 토큰 재정의 block 제거', () => {
    // neo 토큰 block 패턴: html[data-theme="neo"] { --accent-indigo: #6C5CE7; ... }
    const neoTokenBlock = cssMain.match(/html\[data-theme="neo"\]\s*\{[^}]*--accent-indigo[^}]*\}/m);
    expect(neoTokenBlock).toBeNull();
    // neo 컴포넌트 selector (.nav-tab 등) 는 유지 — 변수 재정의 X 인지만 검증
  });

  it('style.css 의 다크 :root 토큰 존재 X (neo 가 default)', () => {
    const rootMatch = cssMain.match(/^:root\s*\{([\s\S]*?)^\}/m);
    const rootBody = rootMatch ? rootMatch[1] : '';
    // 다크 marker 가 :root 에 없어야 함
    expect(rootBody).not.toContain('#6366f1');   // dark indigo X
    expect(rootBody).not.toContain('#09090b');   // dark bg X
  });
});
