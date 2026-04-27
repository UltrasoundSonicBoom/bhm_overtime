// Phase 5 회귀 가드: cross-module 명시 ESM import 가 깨지지 않음 + PROFILE_FIELDS 외부 노출 검증
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  global.CustomEvent = dom.window.CustomEvent;
  global.Event = dom.window.Event;
});

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

function seedFormFields(ids) {
  for (const id of ids) {
    const input = document.createElement('input');
    input.id = id;
    document.body.appendChild(input);
  }
}

describe('Phase 5: cross-module ESM imports', () => {
  it('Layer 0 (data / regulation-constants / shared-utils) → no throw', async () => {
    await expect(import('../../data.js')).resolves.toBeTruthy();
    await expect(import('../../regulation-constants.js')).resolves.toBeTruthy();
    await expect(import('../../shared-utils.js')).resolves.toBeTruthy();
  });

  it('Layer 1 (calculators / holidays / retirement-engine) → no throw', async () => {
    await expect(import('../../calculators.js')).resolves.toBeTruthy();
    await expect(import('../../holidays.js')).resolves.toBeTruthy();
    await expect(import('../../retirement-engine.js')).resolves.toBeTruthy();
  });

  it('Layer 2 (profile / overtime / leave / payroll) → no throw', async () => {
    await expect(import('../../profile.js')).resolves.toBeTruthy();
    await expect(import('../../overtime.js')).resolves.toBeTruthy();
    await expect(import('../../leave.js')).resolves.toBeTruthy();
    await expect(import('../../payroll.js')).resolves.toBeTruthy();
  });

  it('Layer 3 (appLock) → no throw', async () => {
    await expect(import('../../appLock.js')).resolves.toBeTruthy();
  });

  it('Layer 4 UI 모듈 → no throw', async () => {
    await expect(import('../../profile-tab.js')).resolves.toBeTruthy();
    await expect(import('../../work-history.js')).resolves.toBeTruthy();
    await expect(import('../../salary-parser.js')).resolves.toBeTruthy();
    await expect(import('../../payslip-tab.js')).resolves.toBeTruthy();
    await expect(import('../../payroll-views.js')).resolves.toBeTruthy();
    await expect(import('../../pay-estimation.js')).resolves.toBeTruthy();
    await expect(import('../../leave-tab.js')).resolves.toBeTruthy();
    await expect(import('../../settings-ui.js')).resolves.toBeTruthy();
    await expect(import('../../resume.js')).resolves.toBeTruthy();
    await expect(import('../../job-templates.js')).resolves.toBeTruthy();
  });

  it('PROFILE_FIELDS 가 profile.js 에서 named export 으로 노출 (Phase 5 D3)', async () => {
    const mod = await import('../../profile.js');
    expect(mod.PROFILE_FIELDS).toBeDefined();
    expect(typeof mod.PROFILE_FIELDS).toBe('object');
    expect(mod.PROFILE_FIELDS.name).toBe('pfName');
  });

  it('PROFILE.applyToForm + named import 으로 form 채워짐 (사용자 보고 회귀 자동 해결 검증)', async () => {
    seedFormFields([
      'pfName', 'pfEmployeeNumber', 'pfDepartment', 'pfHireDate', 'pfJobType',
    ]);
    const profileMod = await import('../../profile.js');
    profileMod.PROFILE.save({
      name: '홍길동', employeeNumber: '12345', department: '간호본부',
      hireDate: '2020-03-01', jobType: '간호',
    });
    expect(() => {
      const saved = profileMod.PROFILE.load();
      profileMod.PROFILE.applyToForm(saved, profileMod.PROFILE_FIELDS);
    }).not.toThrow();
    expect(document.getElementById('pfName').value).toBe('홍길동');
    expect(document.getElementById('pfDepartment').value).toBe('간호본부');
    expect(document.getElementById('pfHireDate').value).toBe('2020-03-01');
    expect(document.getElementById('pfJobType').value).toBe('간호');
  });

  it('work-history.js named export — _loadWorkHistory / _saveWorkHistory / renderWorkHistory', async () => {
    const mod = await import('../../work-history.js');
    expect(typeof mod._loadWorkHistory).toBe('function');
    expect(typeof mod._saveWorkHistory).toBe('function');
    expect(typeof mod.renderWorkHistory).toBe('function');
  });

  it('salary-parser.js named export — SALARY_PARSER (rebuildWorkHistoryFromPayslips 등)', async () => {
    const mod = await import('../../salary-parser.js');
    expect(mod.SALARY_PARSER).toBeDefined();
    expect(typeof mod.SALARY_PARSER.rebuildWorkHistoryFromPayslips).toBe('function');
  });
});
