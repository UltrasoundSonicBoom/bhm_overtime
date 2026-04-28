// Phase 8 Task 7 — overtime-sync 검증
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
    id: 'ot1', date: '2026-04-15', type: 'overtime',
    startTime: '18:00', endTime: '21:00',
    totalHours: 3, memo: '야근 메모', estimatedPay: 45000,
    breakdown: { extended: 3, night: 0, holiday: 0, holidayNight: 0 },
    isWeekend: false, isHoliday: false, hourlyRate: 15000,
  },
];

describe('overtime-sync — 라운드트립', () => {
  it('writeOvertimeMonth → readOvertimeMonth 라운드트립', async () => {
    const { writeOvertimeMonth, readOvertimeMonth } =
      await import('../../../apps/web/src/firebase/sync/overtime-sync.js');
    const db = _createMockDb();
    await writeOvertimeMonth(db, 'uid1', '2026-04', SAMPLE_RECORDS);
    const restored = await readOvertimeMonth(db, 'uid1', '2026-04');
    expect(restored).toHaveLength(1);
    expect(restored[0].id).toBe('ot1');
    expect(restored[0].totalHours).toBe(3);
    expect(restored[0].memo).toBe('야근 메모');
  });

  it('암호화 검증: memo/hours 평문 노출 없음', async () => {
    const { writeOvertimeMonth } =
      await import('../../../apps/web/src/firebase/sync/overtime-sync.js');
    const db = _createMockDb();
    await writeOvertimeMonth(db, 'uid1', '2026-04', SAMPLE_RECORDS);
    const raw = JSON.stringify(db._store);
    expect(raw).not.toContain('야근 메모');
    const doc = db._store['users/uid1/overtime/2026-04'];
    expect(doc).toBeDefined();
    // entries[0].notes 는 암호화 객체
    expect(typeof doc.entries[0].notes).toBe('object');
    expect(doc.entries[0].notes._v).toBe(1);
    // entries[0].hours 도 암호화
    expect(typeof doc.entries[0].hours).toBe('object');
  });

  it('writeAllOvertime → readAllOvertime (여러 월)', async () => {
    const { writeAllOvertime, readAllOvertime } =
      await import('../../../apps/web/src/firebase/sync/overtime-sync.js');
    const db = _createMockDb();
    const allData = {
      '2026-03': [{ id: 'ot_m', date: '2026-03-10', type: 'overtime', totalHours: 2, memo: 'm3' }],
      '2026-04': SAMPLE_RECORDS,
    };
    await writeAllOvertime(db, 'uid2', allData);
    const restored = await readAllOvertime(db, 'uid2');
    expect(Object.keys(restored)).toHaveLength(2);
    expect(restored['2026-03'][0].memo).toBe('m3');
    expect(restored['2026-04'][0].totalHours).toBe(3);
  });

  it('빈 월 → 빈 배열', async () => {
    const { readOvertimeMonth } =
      await import('../../../apps/web/src/firebase/sync/overtime-sync.js');
    const db = _createMockDb();
    const res = await readOvertimeMonth(db, 'uid3', '2026-01');
    expect(res).toEqual([]);
  });
});
