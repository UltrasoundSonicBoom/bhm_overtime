// tests/unit/parse-cache.test.js — 클라이언트 캐시 단위 테스트.
// 백엔드 호출은 mocked.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let dom;
beforeEach(async () => {
  dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.localStorage.clear();
  if (!dom.window.crypto?.subtle) {
    const nodeCrypto = await import('node:crypto');
    Object.defineProperty(global, 'crypto', { value: nodeCrypto.webcrypto, configurable: true });
    Object.defineProperty(global.window, 'crypto', { value: nodeCrypto.webcrypto, configurable: true });
  }
  // Mock fetch — 백엔드 헬스체크 항상 실패 (로컬 캐시만 검증)
  global.fetch = vi.fn(() => Promise.reject(new Error('no backend')));
});

describe('Daily vision limit', () => {
  it('초기 카운트 0', async () => {
    const { getDailyVisionCount, isDailyVisionLimitReached } =
      await import('../../apps/web/src/client/schedule-parser/parse-cache.js');
    expect(getDailyVisionCount()).toBe(0);
    expect(isDailyVisionLimitReached()).toBe(false);
  });

  it('3회 호출 후 한도 도달', async () => {
    const { incrementDailyVisionCount, isDailyVisionLimitReached } =
      await import('../../apps/web/src/client/schedule-parser/parse-cache.js');
    expect(incrementDailyVisionCount()).toBe(1);
    expect(incrementDailyVisionCount()).toBe(2);
    expect(incrementDailyVisionCount()).toBe(3);
    expect(isDailyVisionLimitReached()).toBe(true);
  });
});

describe('Local cache (localStorage)', () => {
  it('put → get 라운드트립', async () => {
    const { putCache, getCache } =
      await import('../../apps/web/src/client/schedule-parser/parse-cache.js');
    const grid = {
      month: '2026-04', dept: 'ICU',
      rows: [{ name: '김민지', days: { '1': 'D' } }],
      confidence: 0.95, notes: '', parser_version: 'test', source: 'excel',
    };
    await putCache('a'.repeat(64), grid, 'icu202604');
    const got = await getCache({ sha256: 'a'.repeat(64) });
    expect(got).not.toBeNull();
    expect(got.dept).toBe('ICU');
    expect(got.rows[0].name).toBe('김민지');
  });

  it('miss → null', async () => {
    const { getCache } = await import('../../apps/web/src/client/schedule-parser/parse-cache.js');
    const got = await getCache({ sha256: 'b'.repeat(64) });
    expect(got).toBeNull();
  });
});

describe('buildCacheKey', () => {
  it('파일에서 sha256 + 정규화된 제목 생성', async () => {
    const { buildCacheKey } =
      await import('../../apps/web/src/client/schedule-parser/parse-cache.js');
    // File API 폴리필 (jsdom)
    const FileImpl = dom.window.File;
    const file = new FileImpl(['hello'], '2026-04 ICU 근무표.pdf', { type: 'application/pdf' });
    const result = await buildCacheKey(file);
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.fileName).toBe('2026-04 ICU 근무표.pdf');
    expect(result.normalizedTitle).toBe('202604icu근무표');
  });
});
