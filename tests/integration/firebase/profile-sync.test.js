// Phase 8 Task 6 — profile-sync (identity/payroll 분리 + 암호화) 검증
//
// 검증:
//   1. _splitFields: 필드를 identity / payroll 로 분리
//   2. _mergeFields: 두 doc 을 합쳐서 원본 shape 복원
//   3. writeProfile(uid, profile): 두 doc 작성 + 민감 필드 암호화
//   4. readProfile(uid): 두 doc 읽기 + 복호화 + merge
//   5. 라운드트립 (write → read → 동일)
//   6. 암호화 검증: Firestore mock 의 raw 데이터에 평문 PII 없음
//   7. 빈 profile → null 반환

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// jsdom + webcrypto wire (crypto 모듈 사용을 위해)
beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  if (!dom.window.crypto || !dom.window.crypto.subtle) {
    const nodeCrypto = await import('node:crypto');
    Object.defineProperty(global.window, 'crypto', {
      value: nodeCrypto.webcrypto,
      configurable: true,
    });
  }
});

// Firestore mock — in-memory store
function _createMockDb() {
  const store = {};
  return {
    _store: store,
    _writeDoc: (path, data, merge) => {
      if (merge) store[path] = { ...(store[path] || {}), ...data };
      else store[path] = data;
    },
    _readDoc: (path) => store[path] || null,
  };
}

describe('profile-sync — _splitFields / _mergeFields', () => {
  it('_splitFields: 필드를 identity / payroll 로 분리', async () => {
    const { _splitFields } = await import('../../../apps/web/src/firebase/sync/profile-sync.js');
    const profile = {
      name: '김간호', employeeId: 'E001', department: '내과', position: '대리',
      hireDate: '2020-01-01', jobLevel: 5,
      hourlyWage: 15000, annualSalary: 50000000, manualHourly: 16000,
      allowancePolicy: 'A', paymentDay: 25, baseHours: 209,
    };
    const { identity, payroll } = _splitFields(profile);
    expect(identity.name).toBe('김간호');
    expect(identity.employeeId).toBe('E001');
    expect(identity.hireDate).toBe('2020-01-01');
    expect(identity.hourlyWage).toBeUndefined();
    expect(payroll.hourlyWage).toBe(15000);
    expect(payroll.annualSalary).toBe(50000000);
    expect(payroll.manualHourly).toBe(16000);
    expect(payroll.name).toBeUndefined();
  });

  it('알려지지 않은 필드는 identity 에 보존', async () => {
    const { _splitFields } = await import('../../../apps/web/src/firebase/sync/profile-sync.js');
    const profile = { name: '박', customField: 'X' };
    const { identity, payroll } = _splitFields(profile);
    expect(identity.customField).toBe('X');
    expect(payroll.customField).toBeUndefined();
  });

  it('_mergeFields: identity + payroll → 원본 shape', async () => {
    const { _splitFields, _mergeFields } = await import('../../../apps/web/src/firebase/sync/profile-sync.js');
    const original = {
      name: '박', employeeId: 'E2', hourlyWage: 17000, manualHourly: 18000,
    };
    const { identity, payroll } = _splitFields(original);
    const merged = _mergeFields(identity, payroll);
    expect(merged).toEqual(original);
  });
});

describe('profile-sync — write/read 라운드트립 (암호화 포함)', () => {
  it('writeProfile → readProfile 라운드트립', async () => {
    const { writeProfile, readProfile } = await import('../../../apps/web/src/firebase/sync/profile-sync.js');
    const db = _createMockDb();
    const uid = 'user1';
    const original = {
      name: '김간호', employeeId: 'E001', department: '내과',
      hourlyWage: 15000, annualSalary: 50000000,
    };
    await writeProfile(db, uid, original);
    const restored = await readProfile(db, uid);
    expect(restored).toEqual(expect.objectContaining(original));
  });

  it('Firestore raw store 에 평문 PII 없음 (암호화 검증)', async () => {
    const { writeProfile } = await import('../../../apps/web/src/firebase/sync/profile-sync.js');
    const db = _createMockDb();
    await writeProfile(db, 'user1', {
      name: '김간호',
      employeeId: 'E001',
      department: '내과',
      hourlyWage: 15000,
    });
    const identityDoc = db._readDoc('users/user1/profile/identity');
    const payrollDoc = db._readDoc('users/user1/profile/payroll');
    // 암호화된 필드는 { _v: 1, iv, c } 형태 — 평문 string 아님
    expect(typeof identityDoc.name).toBe('object');
    expect(identityDoc.name._v).toBe(1);
    expect(typeof identityDoc.employeeId).toBe('object');
    expect(identityDoc.employeeId._v).toBe(1);
    expect(typeof payrollDoc.hourlyWage).toBe('object');
    expect(payrollDoc.hourlyWage._v).toBe(1);
    // raw JSON 안에 평문 '김간호' 안 보임
    const allRaw = JSON.stringify(db._store);
    expect(allRaw).not.toContain('김간호');
    expect(allRaw).not.toContain('E001');
  });

  it('lastEditAt 필드 평문 (인덱싱용)', async () => {
    const { writeProfile } = await import('../../../apps/web/src/firebase/sync/profile-sync.js');
    const db = _createMockDb();
    await writeProfile(db, 'user1', { name: 'X' });
    const doc = db._readDoc('users/user1/profile/identity');
    expect(doc.lastEditAt).toBeDefined();
    expect(typeof doc.lastEditAt).toBe('number');
  });

  it('readProfile 빈 doc → null', async () => {
    const { readProfile } = await import('../../../apps/web/src/firebase/sync/profile-sync.js');
    const db = _createMockDb();
    const r = await readProfile(db, 'user1');
    expect(r).toBe(null);
  });
});

describe('profile-sync — 다른 uid 격리', () => {
  it('user1 키로 암호화한 데이터를 user2 가 읽기 시도 → throw 또는 잘못된 결과', async () => {
    const { writeProfile, readProfile } = await import('../../../apps/web/src/firebase/sync/profile-sync.js');
    const db = _createMockDb();
    await writeProfile(db, 'user1', { name: '김간호' });
    // user1 의 doc 을 user2 path 로 복사 후 user2 키로 readProfile
    db._store['users/user2/profile/identity'] = db._store['users/user1/profile/identity'];
    db._store['users/user2/profile/payroll'] = db._store['users/user1/profile/payroll'];
    // user2 키로 복호화 시도 → reject
    await expect(readProfile(db, 'user2')).rejects.toBeDefined();
  });
});
