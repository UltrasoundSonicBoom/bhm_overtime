// Phase 8 Task 7 — payslip-sync 검증
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
        .map(([k, v]) => ({ id: k.slice(prefix.length), _path: k, data: () => v }));
    },
  };
}

const SAMPLE_DATA = {
  workStats: [
    { name: '시간외근무시간', value: 10 },
    { name: '야간근무시간', value: 3 },
  ],
  overtimeItems: [
    { name: '시간외수당', amount: 150000 },
    { name: '야간근무수당', amount: 60000 },
  ],
  hourlyRate: 15000,
};

describe('payslip-sync — 라운드트립', () => {
  it('writePayslip → readPayslip 라운드트립', async () => {
    const { writePayslip, readPayslip } =
      await import('../../../apps/web/src/firebase/sync/payslip-sync.js');
    const db = _createMockDb();
    await writePayslip(db, 'uid1', '2026-04', SAMPLE_DATA);
    const restored = await readPayslip(db, 'uid1', '2026-04');
    expect(restored).toBeDefined();
    expect(restored.hourlyRate).toBe(15000);
    expect(restored.workStats).toHaveLength(2);
  });

  it('암호화 검증: parsedFields 평문 노출 없음', async () => {
    const { writePayslip } =
      await import('../../../apps/web/src/firebase/sync/payslip-sync.js');
    const db = _createMockDb();
    await writePayslip(db, 'uid1', '2026-04', SAMPLE_DATA);
    const raw = JSON.stringify(db._store);
    expect(raw).not.toContain('"hourlyRate":15000');
    expect(raw).not.toContain('시간외수당');
    const doc = db._store['users/uid1/payslips/2026-04'];
    expect(doc).toBeDefined();
    expect(typeof doc.parsedFields).toBe('object');
    expect(doc.parsedFields._v).toBe(1);
  });

  it('payMonth 평문 인덱싱 유지', async () => {
    const { writePayslip } =
      await import('../../../apps/web/src/firebase/sync/payslip-sync.js');
    const db = _createMockDb();
    await writePayslip(db, 'uid1', '2026-04', SAMPLE_DATA);
    const doc = db._store['users/uid1/payslips/2026-04'];
    expect(doc.payMonth).toBe('2026-04');
    expect(typeof doc.payMonth).toBe('string');
  });

  it('writeAllPayslips → readAllPayslips (여러 월)', async () => {
    const { writeAllPayslips, readAllPayslips } =
      await import('../../../apps/web/src/firebase/sync/payslip-sync.js');
    const db = _createMockDb();
    const allData = {
      '2026-03': { ...SAMPLE_DATA, hourlyRate: 14000 },
      '2026-04': SAMPLE_DATA,
    };
    await writeAllPayslips(db, 'uid2', allData);
    const restored = await readAllPayslips(db, 'uid2');
    expect(Object.keys(restored)).toHaveLength(2);
    expect(restored['2026-03'].hourlyRate).toBe(14000);
    expect(restored['2026-04'].hourlyRate).toBe(15000);
  });

  it('typed payslip key 는 같은 월 급여 명세서와 다른 doc 으로 보존', async () => {
    const { writePayslip, readPayslip, readAllPayslips } =
      await import('../../../apps/web/src/firebase/sync/payslip-sync.js');
    const db = _createMockDb();
    await writePayslip(db, 'uid1', '2026-04', { summary: { grossPay: 5000000 } });
    await writePayslip(db, 'uid1', '2026-04', { summary: { grossPay: 7000000 } }, undefined, '상여');

    expect(db._store['users/uid1/payslips/2026-04']).toBeDefined();
    expect(db._store['users/uid1/payslips/2026-04__%EC%83%81%EC%97%AC']).toBeDefined();

    const typed = await readPayslip(db, 'uid1', '2026-04', '상여');
    expect(typed.summary.grossPay).toBe(7000000);
    expect(typed.type).toBe('상여');

    const all = await readAllPayslips(db, 'uid1');
    expect(all['2026-04'].summary.grossPay).toBe(5000000);
    expect(all['2026-04__상여'].summary.grossPay).toBe(7000000);
  });

  it('전체 명세서 저장 후 시간외 보충분을 써도 기존 지급/요약 필드를 보존한다', async () => {
    const { writePayslip, readPayslip } =
      await import('../../../apps/web/src/firebase/sync/payslip-sync.js');
    const db = _createMockDb();

    await writePayslip(db, 'uid1', '2026-04', {
      salaryItems: [{ name: '기본급', amount: 3000000 }],
      deductionItems: [{ name: '소득세', amount: 100000 }],
      summary: { grossPay: 3000000, totalDeduction: 100000, netPay: 2900000 },
      metadata: { payslipType: '급여' },
    });

    await writePayslip(db, 'uid1', '2026-04', SAMPLE_DATA);
    const restored = await readPayslip(db, 'uid1', '2026-04');

    expect(restored.salaryItems).toHaveLength(1);
    expect(restored.summary.netPay).toBe(2900000);
    expect(restored.hourlyRate).toBe(15000);
    expect(restored.overtimeItems).toHaveLength(2);
  });

  it('존재하지 않는 월 → null', async () => {
    const { readPayslip } =
      await import('../../../apps/web/src/firebase/sync/payslip-sync.js');
    const db = _createMockDb();
    const res = await readPayslip(db, 'uid3', '2026-01');
    expect(res).toBeNull();
  });

  it('deletePayslip → 원격 월 문서 삭제', async () => {
    const { writePayslip, readPayslip, deletePayslip } =
      await import('../../../apps/web/src/firebase/sync/payslip-sync.js');
    const db = _createMockDb();
    await writePayslip(db, 'uid4', '2026-04', SAMPLE_DATA);
    expect(await readPayslip(db, 'uid4', '2026-04')).toBeTruthy();
    await deletePayslip(db, 'uid4', '2026-04');
    expect(await readPayslip(db, 'uid4', '2026-04')).toBeNull();
  });
});
