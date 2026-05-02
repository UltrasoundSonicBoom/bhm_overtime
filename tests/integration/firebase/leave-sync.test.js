// Phase 8 Task 7 — leave-sync 검증
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
    _queryCollection: (colPath) => {
      const prefix = colPath.endsWith('/') ? colPath : colPath + '/';
      return Object.entries(store)
        .filter(([k]) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'))
        .map(([k, v]) => ({ id: k.slice(prefix.length), _path: k, data: () => v }));
    },
  };
}

const SAMPLE_RECORDS = [
  {
    id: 'lv1', startDate: '2026-04-10', endDate: '2026-04-10',
    type: 'annual', days: 1, hours: 0, notes: '개인 사유', isPaid: true, salaryImpact: -50000,
  },
  {
    id: 'lv2', startDate: '2026-04-15', endDate: '2026-04-17',
    type: 'annual', days: 3, hours: 0, notes: '가족 여행', isPaid: true,
  },
];

describe('leave-sync — 라운드트립', () => {
  it('writeLeaveYear → readLeaveYear 라운드트립', async () => {
    const { writeLeaveYear, readLeaveYear } =
      await import('../../../apps/web/src/firebase/sync/leave-sync.js');
    const db = _createMockDb();
    await writeLeaveYear(db, 'uid1', 2026, SAMPLE_RECORDS);
    const restored = await readLeaveYear(db, 'uid1', 2026);
    expect(restored).toHaveLength(2);
    const notes = restored.map(r => r.notes).sort();
    expect(notes).toContain('개인 사유');
    expect(notes).toContain('가족 여행');
  });

  it('암호화 검증: notes 평문 노출 없음', async () => {
    const { writeLeaveYear } =
      await import('../../../apps/web/src/firebase/sync/leave-sync.js');
    const db = _createMockDb();
    await writeLeaveYear(db, 'uid1', 2026, SAMPLE_RECORDS);
    const raw = JSON.stringify(db._store);
    expect(raw).not.toContain('개인 사유');
    expect(raw).not.toContain('가족 여행');
    const doc = db._store['users/uid1/leave/2026'];
    expect(doc).toBeDefined();
    expect(typeof doc.entries[0].notes).toBe('object');
    expect(doc.entries[0].notes._v).toBe(1);
    expect(typeof doc.entries[0].duration).toBe('object');
    expect(typeof doc.entries[0].salaryImpact).toBe('object');
  });

  it('writeAllLeave → readAllLeave (여러 연도)', async () => {
    const { writeAllLeave, readAllLeave } =
      await import('../../../apps/web/src/firebase/sync/leave-sync.js');
    const db = _createMockDb();
    const allData = {
      '2025': [{ id: 'lv_y', startDate: '2025-12-20', endDate: '2025-12-20', type: 'annual', days: 1, notes: '2025 휴가' }],
      '2026': SAMPLE_RECORDS,
    };
    await writeAllLeave(db, 'uid2', allData);
    const restored = await readAllLeave(db, 'uid2');
    expect(Object.keys(restored)).toHaveLength(2);
    expect(restored['2025'][0].notes).toBe('2025 휴가');
    expect(restored['2026']).toHaveLength(2);
  });

  it('빈 연도 → 빈 배열', async () => {
    const { readLeaveYear } =
      await import('../../../apps/web/src/firebase/sync/leave-sync.js');
    const db = _createMockDb();
    const res = await readLeaveYear(db, 'uid3', 2026);
    expect(res).toEqual([]);
  });
});
