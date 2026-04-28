// Phase 8 Task 7 — favorites-sync 검증
import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  if (!dom.window.crypto?.subtle) {
    const nodeCrypto = await import('node:crypto');
    Object.defineProperty(global.window, 'crypto', { value: nodeCrypto.webcrypto, configurable: true });
  }
});

function _createMockDb() {
  const store = {};
  return {
    _store: store,
    _writeDoc: (path, data, merge) => {
      store[path] = merge ? { ...(store[path] || {}), ...data } : data;
    },
    _readDoc: (path) => store[path] || null,
  };
}

describe('favorites-sync — 라운드트립', () => {
  it('writeFavorites → readFavorites 라운드트립', async () => {
    const { writeFavorites, readFavorites } =
      await import('../../../apps/web/src/firebase/sync/favorites-sync.js');
    const db = _createMockDb();
    const favorites = ['reg_001', 'reg_045', 'reg_123'];
    await writeFavorites(db, 'uid1', favorites);
    const restored = await readFavorites(db, 'uid1');
    expect(restored).toEqual(favorites);
  });

  it('빈 배열 write → 빈 배열 read', async () => {
    const { writeFavorites, readFavorites } =
      await import('../../../apps/web/src/firebase/sync/favorites-sync.js');
    const db = _createMockDb();
    await writeFavorites(db, 'uid1', []);
    const restored = await readFavorites(db, 'uid1');
    expect(restored).toEqual([]);
  });

  it('doc 없으면 빈 배열 반환', async () => {
    const { readFavorites } =
      await import('../../../apps/web/src/firebase/sync/favorites-sync.js');
    const db = _createMockDb();
    const res = await readFavorites(db, 'uid_empty');
    expect(res).toEqual([]);
  });

  it('favorites 는 평문 (ID 배열이라 식별성 없음)', async () => {
    const { writeFavorites } =
      await import('../../../apps/web/src/firebase/sync/favorites-sync.js');
    const db = _createMockDb();
    await writeFavorites(db, 'uid1', ['reg_001', 'reg_045']);
    const doc = db._store['users/uid1/settings/reference'];
    expect(Array.isArray(doc.favorites)).toBe(true);
    expect(doc.favorites[0]).toBe('reg_001');
  });
});
