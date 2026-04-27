// CSP — Phase 3-G: script-src 'self' (+ legacy 'unsafe-inline' 잠시 유지)
// + object-src 'none' + frame-ancestors 'none' (clickjacking 차단)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

describe('CSP — Phase 3-G', () => {
  let cspValue;

  it('vercel.json: HTML 에 Content-Security-Policy 헤더 정의', () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
    const htmlHeader = (cfg.headers || []).find(h => /\\\.html$/.test(h.source));
    expect(htmlHeader, 'HTML CSP header 항목').toBeDefined();
    const cspKey = (htmlHeader.headers || []).find(kv => kv.key.toLowerCase() === 'content-security-policy');
    expect(cspKey, 'Content-Security-Policy 헤더').toBeDefined();
    cspValue = cspKey.value;
  });

  it('script-src: \'self\' + 3rd party whitelist (cdnjs / GA)', () => {
    expect(cspValue).toMatch(/script-src[^;]*'self'/);
    expect(cspValue).toMatch(/script-src[^;]*https:\/\/cdnjs\.cloudflare\.com/);
    expect(cspValue).toMatch(/script-src[^;]*https:\/\/www\.googletagmanager\.com/);
  });

  it('clickjacking 방어: frame-ancestors \'self\' (same-origin iframe 허용 — 규정 탭 SPA)', () => {
    // Phase 5-followup: 'none' → 'self' (same-origin iframe 임베드 허용, cross-origin clickjacking 여전히 차단)
    expect(cspValue).toMatch(/frame-ancestors 'self'/);
  });

  it('object-src \'none\' (Flash/PDF embed 차단)', () => {
    expect(cspValue).toMatch(/object-src 'none'/);
  });
});
