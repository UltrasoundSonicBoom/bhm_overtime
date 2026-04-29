// schedule-sync 통합 테스트 (라운드트립 + 암호화 + 게스트 noop)
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

const SAMPLE_MONTH = {
  mine: { 1: 'D', 2: 'E', 3: 'N', 4: 'O', 5: 'AL' },
  team: {
    '김지원': { 1: 'E', 2: 'N', 3: 'D' },
    '박서연': { 1: 'N', 2: 'D' },
  },
  lastEditAt: 1745000000000,
  sourceFile: 'icu-2026-04.pdf',
};

describe('schedule-sync — 라운드트립', () => {
  it('writeScheduleMonth → readScheduleMonth 라운드트립', async () => {
    const { writeScheduleMonth, readScheduleMonth } =
      await import('../../../apps/web/src/firebase/sync/schedule-sync.js');
    const db = _createMockDb();
    await writeScheduleMonth(db, 'uid1', '2026-04', SAMPLE_MONTH);
    const restored = await readScheduleMonth(db, 'uid1', '2026-04');
    expect(restored).not.toBeNull();
    expect(restored.mine[1]).toBe('D');
    expect(restored.mine[3]).toBe('N');
    expect(restored.mine[5]).toBe('AL');
    expect(restored.team['김지원'][1]).toBe('E');
    expect(restored.team['박서연'][2]).toBe('D');
    expect(restored.sourceFile).toBe('icu-2026-04.pdf');
  });

  it('암호화 검증: duty 코드가 평문으로 노출되지 않음', async () => {
    const { writeScheduleMonth } =
      await import('../../../apps/web/src/firebase/sync/schedule-sync.js');
    const db = _createMockDb();
    const monthWithMemo = { ...SAMPLE_MONTH, memos: { 1: '특별 근무' } };
    await writeScheduleMonth(db, 'uid1', '2026-04', monthWithMemo);
    const doc = db._store['users/uid1/schedule/2026-04'];
    expect(doc).toBeDefined();

    // entries[].duty는 암호화 객체
    expect(typeof doc.entries[0].duty).toBe('object');
    expect(doc.entries[0].duty._v).toBe(1);

    // entries[].memo도 암호화
    expect(typeof doc.entries[0].memo).toBe('object');

    // 평문 'D', 'N', '특별 근무' 등이 직렬화 결과에 없어야 함 (entries 영역)
    const entriesJson = JSON.stringify(doc.entries);
    expect(entriesJson).not.toContain('"D"');
    expect(entriesJson).not.toContain('"N"');
    expect(entriesJson).not.toContain('특별 근무');

    // entries[].date는 평문 유지
    expect(doc.entries[0].date).toBe('2026-04-01');
  });

  it('팀원 이름은 평문 유지 (인덱스/쿼리용)', async () => {
    const { writeScheduleMonth } =
      await import('../../../apps/web/src/firebase/sync/schedule-sync.js');
    const db = _createMockDb();
    await writeScheduleMonth(db, 'uid1', '2026-04', SAMPLE_MONTH);
    const doc = db._store['users/uid1/schedule/2026-04'];
    expect(doc.team).toHaveProperty('김지원');
    expect(doc.team).toHaveProperty('박서연');
  });

  it('writeAllSchedule → readAllSchedule (여러 월)', async () => {
    const { writeAllSchedule, readAllSchedule } =
      await import('../../../apps/web/src/firebase/sync/schedule-sync.js');
    const db = _createMockDb();
    const allData = {
      '2026-03': { mine: { 5: 'D', 6: 'N' }, team: {} },
      '2026-04': SAMPLE_MONTH,
    };
    await writeAllSchedule(db, 'uid2', allData);
    const restored = await readAllSchedule(db, 'uid2');
    expect(Object.keys(restored)).toHaveLength(2);
    expect(restored['2026-03'].mine[5]).toBe('D');
    expect(restored['2026-04'].mine[3]).toBe('N');
  });

  it('빈 월 → null 반환', async () => {
    const { readScheduleMonth } =
      await import('../../../apps/web/src/firebase/sync/schedule-sync.js');
    const db = _createMockDb();
    const res = await readScheduleMonth(db, 'uid3', '2026-01');
    expect(res).toBeNull();
  });

  it('게스트 (uid=null) → noop', async () => {
    const { writeScheduleMonth, readScheduleMonth } =
      await import('../../../apps/web/src/firebase/sync/schedule-sync.js');
    const db = _createMockDb();
    await writeScheduleMonth(db, null, '2026-04', SAMPLE_MONTH);
    expect(Object.keys(db._store)).toHaveLength(0);
    const res = await readScheduleMonth(db, null, '2026-04');
    expect(res).toBeNull();
  });
});
