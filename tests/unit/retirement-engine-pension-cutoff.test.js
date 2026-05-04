// 단협 제52조(4) — 사학연금 2016.03.01+ 분리 퇴직금
// Plan dazzling-booping-kettle Task A3
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DATA } from '../../packages/data/src/index.js';

describe('RetirementEngine.applyPensionCutoff', () => {
  let RetirementEngine;
  const originalWindow = globalThis.window;

  beforeAll(async () => {
    globalThis.window = { DATA };
    ({ RetirementEngine } = await import('../../packages/calculators/src/retirement-engine.js'));
  });

  afterAll(() => {
    globalThis.window = originalWindow;
  });

  it('가입일 미입력 시 effectiveEndDate = retireDate (보호 미적용)', () => {
    const r = RetirementEngine.applyPensionCutoff('2030-12-31', null);
    expect(r.effectiveEndDate).toBe('2030-12-31');
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('no_enrollment');
  });

  it('가입일 < retireDate → effectiveEndDate = 가입일 - 1d', () => {
    const r = RetirementEngine.applyPensionCutoff('2030-12-31', '2018-01-01');
    expect(r.effectiveEndDate).toBe('2017-12-31');
    expect(r.applied).toBe(true);
    expect(r.reason).toBe('pension_cutoff_2016');
  });

  it('가입일 > retireDate (입력 오류) → 컷오프 없이 retireDate 유지', () => {
    const r = RetirementEngine.applyPensionCutoff('2017-06-30', '2018-01-01');
    expect(r.effectiveEndDate).toBe('2017-06-30');
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('enrollment_after_retire');
  });
});

describe('RetirementEngine.calcSev — 사학연금 컷오프 통합', () => {
  let RetirementEngine;
  const originalWindow = globalThis.window;

  beforeAll(async () => {
    globalThis.window = { DATA };
    ({ RetirementEngine } = await import('../../packages/calculators/src/retirement-engine.js'));
  });

  afterAll(() => {
    globalThis.window = originalWindow;
  });

  it('사학연금 가입자(2018-01-01)의 단협 퇴직금은 2017-12-31 까지 근속으로 산정', () => {
    const wage = 5000000;
    const hire = '2010-01-01';
    const retire = '2030-12-31';
    const enroll = '2018-01-01';

    const noCutoff = RetirementEngine.calcSev(wage, hire, retire);
    const withCutoff = RetirementEngine.calcSev(wage, hire, retire, { pensionEnrollDate: enroll });

    expect(withCutoff.pensionCutoff.applied).toBe(true);
    expect(withCutoff.pensionCutoff.effectiveEndDate).toBe('2017-12-31');
    // 컷오프된 근속(2010~2017 = 약 8년) < 미컷오프(2010~2030 = 약 21년) → 퇴직금 작아야 함
    expect(withCutoff.기본퇴직금).toBeLessThan(noCutoff.기본퇴직금);
  });

  it('미가입자(opts 미전달)는 기존 결과와 동일 (회귀)', () => {
    const wage = 5000000;
    const hire = '2010-01-01';
    const retire = '2030-12-31';
    const before = RetirementEngine.calcSev(wage, hire, retire);
    const after = RetirementEngine.calcSev(wage, hire, retire, {});
    expect(after.기본퇴직금).toBe(before.기본퇴직금);
    expect(after.퇴직수당).toBe(before.퇴직수당);
    expect(after.pensionCutoff.applied).toBe(false);
  });

  it('가입일이 retireDate 이후이면 컷오프 미적용 (회귀)', () => {
    const r = RetirementEngine.calcSev(5000000, '2010-01-01', '2017-06-30', {
      pensionEnrollDate: '2018-01-01',
    });
    expect(r.pensionCutoff.applied).toBe(false);
    expect(r.pensionCutoff.reason).toBe('enrollment_after_retire');
  });
});
