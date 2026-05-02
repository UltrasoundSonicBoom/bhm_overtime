// Phase 8 Task 7 — work-history-sync 검증
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
    _deleteDoc: (path) => { delete store[path]; },
    _queryCollection: (colPath) => {
      const prefix = colPath.endsWith('/') ? colPath : colPath + '/';
      return Object.entries(store)
        .filter(([k]) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'))
        .map(([k, v]) => ({
          id: k.slice(prefix.length),
          _path: k,
          data: () => v,
        }));
    },
  };
}

describe('work-history-sync — writeAllWorkHistory / readAllWorkHistory', () => {
  it('라운드트립: 여러 항목 write → read', async () => {
    const { writeAllWorkHistory, readAllWorkHistory } =
      await import('../../../apps/web/src/firebase/sync/work-history-sync.js');
    const db = _createMockDb();
    const entries = [
      { id: 'wh1', workplace: '서울대병원', dept: '핵의학과', role: '방사선사', desc: '영상 촬영', from: '2020-01', to: '' },
      { id: 'wh2', workplace: '서울대병원', dept: '중환자실', role: '간호사', desc: '집중치료', from: '2022-03', to: '2023-06' },
    ];
    await writeAllWorkHistory(db, 'uid1', entries);
    const restored = await readAllWorkHistory(db, 'uid1');
    expect(restored).toHaveLength(2);
    const depts = restored.map(e => e.dept).sort();
    expect(depts).toContain('핵의학과');
    expect(depts).toContain('중환자실');
  });

  it('암호화 검증: raw store 에 평문 PII 없음', async () => {
    const { writeAllWorkHistory } =
      await import('../../../apps/web/src/firebase/sync/work-history-sync.js');
    const db = _createMockDb();
    await writeAllWorkHistory(db, 'uid1', [
      { id: 'wh3', dept: '응급의학과', role: '전공의', desc: '응급처치' },
    ]);
    const raw = JSON.stringify(db._store);
    expect(raw).not.toContain('응급의학과');
    expect(raw).not.toContain('전공의');
    expect(raw).not.toContain('응급처치');
    // dept 필드는 암호화 객체여야 함
    const docPath = Object.keys(db._store).find(k => k.includes('/wh3'));
    expect(typeof db._store[docPath].dept).toBe('object');
    expect(db._store[docPath].dept._v).toBe(1);
  });

  it('deleteWorkHistoryEntry: 해당 doc 만 삭제', async () => {
    const { writeAllWorkHistory, readAllWorkHistory, deleteWorkHistoryEntry } =
      await import('../../../apps/web/src/firebase/sync/work-history-sync.js');
    const db = _createMockDb();
    await writeAllWorkHistory(db, 'uid2', [
      { id: 'wh4', dept: '내과', from: '2021-01' },
      { id: 'wh5', dept: '외과', from: '2023-01' },
    ]);
    await deleteWorkHistoryEntry(db, 'uid2', 'wh4');
    const after = await readAllWorkHistory(db, 'uid2');
    expect(after).toHaveLength(1);
    expect(after[0].dept).toBe('외과');
  });

  it('빈 배열 write → read 빈 배열', async () => {
    const { writeAllWorkHistory, readAllWorkHistory } =
      await import('../../../apps/web/src/firebase/sync/work-history-sync.js');
    const db = _createMockDb();
    await writeAllWorkHistory(db, 'uid3', []);
    const res = await readAllWorkHistory(db, 'uid3');
    expect(res).toHaveLength(0);
  });

  it('writeAllWorkHistory는 사라진 항목을 원격에서도 삭제한다', async () => {
    const { writeAllWorkHistory, readAllWorkHistory } =
      await import('../../../apps/web/src/firebase/sync/work-history-sync.js');
    const db = _createMockDb();
    await writeAllWorkHistory(db, 'uid4', [
      { id: 'wh10', dept: '내과', from: '2021-01' },
      { id: 'wh11', dept: '외과', from: '2023-01' },
    ]);
    await writeAllWorkHistory(db, 'uid4', [
      { id: 'wh11', dept: '외과', from: '2023-01' },
    ]);
    const after = await readAllWorkHistory(db, 'uid4');
    expect(after).toHaveLength(1);
    expect(after[0].dept).toBe('외과');
  });
});
