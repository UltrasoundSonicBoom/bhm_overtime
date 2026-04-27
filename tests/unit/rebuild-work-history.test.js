// Phase 4-A Task 2-3: SALARY_PARSER 의 segment builder + rebuild 알고리즘
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
});

beforeEach(() => {
  localStorage.clear();
});

// salary-parser.js 의 storageKey 와 동일 패턴: payslip_<uid>_<yyyy>_<mm>(_type)
// uid: bhm_settings.googleSub 또는 'guest'
function seedPayslip(year, month, dept, jobType, payGrade, type) {
  const key = 'payslip_guest_' + year + '_' + String(month).padStart(2, '0') + (type && type !== '급여' ? '_' + type : '');
  localStorage.setItem(key, JSON.stringify({
    metadata: { payPeriod: year + '년 ' + month + '월', payslipType: type || '급여' },
    employeeInfo: { department: dept, jobType, payGrade, hireDate: '2020-03-01', name: '홍길동', employeeNumber: '12345' },
    salaryItems: [{ name: '본봉', amount: 3000000 }],
    summary: { grossPay: 3000000, totalDeduction: 0, netPay: 3000000 },
  }));
}

describe('Phase 4-A Task 2: _buildSegmentsFromPayslips', () => {
  it('시나리오 1: 동일 부서 3개월 → 1 segment', async () => {
    seedPayslip(2026, 2, '간호본부', '간호', 'J3-5');
    seedPayslip(2026, 3, '간호본부', '간호', 'J3-5');
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips();
    expect(segs.length).toBe(1);
    expect(segs[0].dept).toBe('간호본부');
  });

  it('시나리오 2: 4월/3월 dept-A, 2월 dept-B → 2 segments (시간순 B → A)', async () => {
    seedPayslip(2026, 2, '내과', '간호', 'J3-3');
    seedPayslip(2026, 3, '간호본부', '간호', 'J3-4');
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips();
    expect(segs.length).toBe(2);
    expect(segs[0].dept).toBe('내과');
    expect(segs[1].dept).toBe('간호본부');
    // segments[0].to = 2026-02 의 다음 segment.from(2026-03-01) 의 전월 말일 = 2026-02-28
    expect(segs[0].to).toBe('2026-02-28');
    expect(segs[1].to).toBe('');
  });

  it('시나리오 3: profile.hireDate < 첫 명세서 → segments[0].from = hireDate', async () => {
    seedPayslip(2024, 1, '간호본부', '간호', 'J3-1');
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips({ hireDate: '2020-03-01' });
    expect(segs[0].from).toBe('2020-03-01');
  });

  it('시나리오 7: payGrade J2-3 → J3-1 동일 부서 → 1 segment', async () => {
    seedPayslip(2026, 2, '간호본부', '간호', 'J2-3');
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-1');
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips();
    expect(segs.length).toBe(1);
  });

  it('normalizeDept: 간호본부 ↔ 간호부 동일 segment', async () => {
    seedPayslip(2026, 2, '간호부', '간호', 'J3-5');
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips();
    expect(segs.length).toBe(1);
  });

  it('미래 명세서 (현재 자정 이후) 제외', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    seedPayslip(future.getFullYear(), 12, '미래부서', '간호', 'J3-5');
    seedPayslip(2026, 2, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips();
    expect(segs.length).toBe(1);
    expect(segs[0].dept).toBe('간호본부');
  });

  it('type 화이트리스트: 보너스/세금 제외', async () => {
    seedPayslip(2026, 2, '간호본부', '간호', 'J3-5');                  // 급여
    seedPayslip(2026, 3, '보너스부서', '간호', 'J3-5', '보너스');       // 제외
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');                  // 급여
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips();
    expect(segs.length).toBe(1);
    expect(segs[0].dept).toBe('간호본부');
  });
});

describe('Phase 4-A Task 3: rebuildWorkHistoryFromPayslips 보호 정책', () => {
  it('시나리오 4: user record 1개 + 명세서 변경 → mode=banner', async () => {
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const result = window.SALARY_PARSER.rebuildWorkHistoryFromPayslips({
      profile: { hireDate: '2020-03-01' },
      existing: [{
        id: 'u1', workplace: 'X', dept: 'A', from: '2020-03-01', to: '',
        source: 'user', rotations: [], role: '', desc: '', updatedAt: 'now'
      }],
      hospital: '서울대학교병원',
    });
    expect(result.mode).toBe('banner');
    expect(result.existing.length).toBe(1);
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it('시나리오 5: 모든 source=auto → mode=replace + records 모두 source="auto"', async () => {
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const result = window.SALARY_PARSER.rebuildWorkHistoryFromPayslips({
      profile: { hireDate: '2020-03-01' },
      existing: [{
        id: 'a1', workplace: 'X', dept: 'A', from: '2020-03-01', to: '',
        source: 'auto', rotations: [], role: '', desc: '', updatedAt: 'now'
      }],
      hospital: '서울대학교병원',
    });
    expect(result.mode).toBe('replace');
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.records.every(r => r.source === 'auto')).toBe(true);
  });

  it('빈 existing → mode=replace', async () => {
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const result = window.SALARY_PARSER.rebuildWorkHistoryFromPayslips({
      profile: { hireDate: '2020-03-01' },
      existing: [],
      hospital: '서울대학교병원',
    });
    expect(result.mode).toBe('replace');
    expect(result.records[0].dept).toBe('간호본부');
    expect(result.records[0].source).toBe('auto');
  });
});

describe('Phase 4-A Task 4: 폴백 명세서 0개', () => {
  it('시나리오 6: 명세서 0개 → mode=empty', async () => {
    await import('../../salary-parser.js');
    const result = window.SALARY_PARSER.rebuildWorkHistoryFromPayslips({
      profile: { hireDate: '2020-03-01', department: '간호본부', jobType: '간호' },
      existing: [],
    });
    expect(result.mode).toBe('empty');
  });
});
