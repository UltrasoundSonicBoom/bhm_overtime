// Phase 8 Task 7 — settings-sync 검증
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

describe('settings-sync — writeSettings / readSettings', () => {
  it('라운드트립: 설정 write → read', async () => {
    const { writeSettings, readSettings } =
      await import('../../../apps/web/src/firebase/sync/settings-sync.js');
    const db = _createMockDb();
    const settings = { theme: 'neo', pinEnabled: false, appLockPin: '1234' };
    await writeSettings(db, 'uid1', settings);
    const restored = await readSettings(db, 'uid1');
    expect(restored.theme).toBe('neo');
    expect(restored.pinEnabled).toBe(false);
    expect(restored.appLockPin).toBe('1234');
  });

  it('암호화 검증: appLockPin 평문 노출 없음', async () => {
    const { writeSettings } =
      await import('../../../apps/web/src/firebase/sync/settings-sync.js');
    const db = _createMockDb();
    await writeSettings(db, 'uid1', { appLockPin: '9876', theme: 'linear' });
    const raw = JSON.stringify(db._store['users/uid1/settings/app']);
    expect(raw).not.toContain('9876');
    const doc = db._store['users/uid1/settings/app'];
    expect(typeof doc.appLockPin).toBe('object');
    expect(doc.appLockPin._v).toBe(1);
    // theme 은 평문
    expect(doc.theme).toBe('linear');
  });

  it('googleSub 같은 auth bridge 필드는 cloud payload 에 쓰지 않는다', async () => {
    const { writeSettings, readSettings } =
      await import('../../../apps/web/src/firebase/sync/settings-sync.js');
    const db = _createMockDb();
    await writeSettings(db, 'uid1', {
      theme: 'neo',
      googleSub: 'uid1',
      googleEmail: 'a@b.c',
      cachedProfile: { name: 'A' },
    });
    const raw = JSON.stringify(db._store['users/uid1/settings/app']);
    expect(raw).not.toContain('uid1');
    expect(raw).not.toContain('a@b.c');
    const restored = await readSettings(db, 'uid1');
    expect(restored.theme).toBe('neo');
    expect(restored.googleSub).toBeUndefined();
  });

  it('doc 없으면 null 반환', async () => {
    const { readSettings } =
      await import('../../../apps/web/src/firebase/sync/settings-sync.js');
    const db = _createMockDb();
    expect(await readSettings(db, 'uid_new')).toBeNull();
  });
});

describe('settings-sync — writeManualHourly', () => {
  it('otManualHourly → profile/payroll doc 에 manualHourly 병합', async () => {
    const { writeManualHourly } =
      await import('../../../apps/web/src/firebase/sync/settings-sync.js');
    const db = _createMockDb();
    await writeManualHourly(db, 'uid1', 17500);
    const doc = db._store['users/uid1/profile/payroll'];
    expect(doc).toBeDefined();
    // manualHourly 는 payroll 의 암호화 필드
    expect(typeof doc.manualHourly).toBe('object');
    expect(doc.manualHourly._v).toBe(1);
  });
});
