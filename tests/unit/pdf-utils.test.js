// tests/unit/pdf-utils.test.js — sha256 + base64 유틸 테스트
// (PDF/canvas 렌더는 jsdom 미지원 → 통합 테스트로 분리)
import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.btoa = dom.window.btoa;
  if (!dom.window.crypto?.subtle) {
    const nodeCrypto = await import('node:crypto');
    Object.defineProperty(global, 'crypto', { value: nodeCrypto.webcrypto, configurable: true });
    Object.defineProperty(global.window, 'crypto', { value: nodeCrypto.webcrypto, configurable: true });
  }
});

describe('sha256Hex', () => {
  it('동일 입력 → 동일 해시', async () => {
    const { sha256Hex } = await import('../../apps/web/src/client/schedule-parser/pdf-utils.js');
    const buf = new TextEncoder().encode('hello world').buffer;
    const h1 = await sha256Hex(buf);
    const h2 = await sha256Hex(buf);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('다른 입력 → 다른 해시', async () => {
    const { sha256Hex } = await import('../../apps/web/src/client/schedule-parser/pdf-utils.js');
    const a = new TextEncoder().encode('foo').buffer;
    const b = new TextEncoder().encode('bar').buffer;
    expect(await sha256Hex(a)).not.toBe(await sha256Hex(b));
  });

  it('"hello world" SHA-256 정확값 (vector test)', async () => {
    const { sha256Hex } = await import('../../apps/web/src/client/schedule-parser/pdf-utils.js');
    const buf = new TextEncoder().encode('hello world').buffer;
    const h = await sha256Hex(buf);
    expect(h).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });
});
