// Phase 8 Task 6 — Key Registry SoT 검증
//
// SPEC §3 인벤토리 100% 매핑 + 7 카테고리 분류 + Firestore path 충돌 0.
// 암호화 화이트리스트 (_encrypted-fields.js) 와 path 일관성 검증.

import { describe, it, expect } from 'vitest';
import {
  KEY_REGISTRY, CATEGORIES,
  allBaseKeys, syncKeys, deviceLocalKeys,
  firestorePathFor, categoryOf, syncKeysByCategory,
} from '../../../apps/web/src/firebase/key-registry.js';

describe('KEY_REGISTRY — SPEC §3 인벤토리', () => {
  it('필수 sync 키 모두 등록', () => {
    const required = [
      // Profile
      'snuhmate_hr_profile',
      // Work history
      'snuhmate_work_history', 'snuhmate_work_history_seeded',
      // Overtime
      'overtimeRecords', 'otManualHourly', 'overtimePayslipData',
      // Leave
      'leaveRecords',
      // Settings
      'snuhmate_settings', 'theme',
      // Reference
      'snuhmate_reg_favorites',
    ];
    for (const k of required) {
      expect(KEY_REGISTRY[k]).toBeDefined();
      expect(KEY_REGISTRY[k].scope).toBe('sync');
    }
  });

  it('필수 device-local 키 등록 (sync 제외 처리)', () => {
    const required = [
      'snuhmate_local_uid', 'snuhmate_anon_id', 'snuhmate_device_id',
      'snuhmate_demo_mode', 'snuhmate_debug_parser',
      'snuhmate_leave_migrated_v1',
    ];
    for (const k of required) {
      expect(KEY_REGISTRY[k]).toBeDefined();
      expect(KEY_REGISTRY[k].scope).toBe('device-local');
      expect(KEY_REGISTRY[k].firestorePath).toBeUndefined();
    }
  });

  it('CATEGORIES 7개 (identity/payroll/overtime/leave/workHistory/settings/reference)', () => {
    expect(CATEGORIES).toHaveLength(7);
    expect(CATEGORIES).toEqual(expect.arrayContaining([
      'identity', 'payroll', 'overtime', 'leave', 'workHistory', 'settings', 'reference',
    ]));
  });
});

describe('helper 함수', () => {
  it('allBaseKeys() — 모든 키 반환', () => {
    const keys = allBaseKeys();
    expect(keys).toContain('snuhmate_hr_profile');
    expect(keys).toContain('snuhmate_local_uid');
    expect(keys.length).toBeGreaterThanOrEqual(15);
  });

  it('syncKeys() — sync 키만', () => {
    const keys = syncKeys();
    expect(keys).toContain('snuhmate_hr_profile');
    expect(keys).not.toContain('snuhmate_local_uid');  // device-local 제외
  });

  it('deviceLocalKeys() — device-local 키만', () => {
    const keys = deviceLocalKeys();
    expect(keys).toContain('snuhmate_local_uid');
    expect(keys).not.toContain('snuhmate_hr_profile');
  });

  it('firestorePathFor — sync 키 path 반환', () => {
    const p = firestorePathFor('snuhmate_hr_profile', 'abc');
    expect(p).toMatch(/users\/abc\/profile\/identity/);
  });

  it('firestorePathFor — device-local 키는 null', () => {
    expect(firestorePathFor('snuhmate_local_uid', 'abc')).toBe(null);
  });

  it('categoryOf — sync 키 카테고리 반환', () => {
    expect(categoryOf('snuhmate_hr_profile')).toBe('identity');
    expect(categoryOf('overtimeRecords')).toBe('overtime');
    expect(categoryOf('leaveRecords')).toBe('leave');
    expect(categoryOf('snuhmate_reg_favorites')).toBe('reference');
  });

  it('syncKeysByCategory — 카테고리별 sync 키', () => {
    const identity = syncKeysByCategory('identity');
    expect(identity).toContain('snuhmate_hr_profile');
    const overtime = syncKeysByCategory('overtime');
    expect(overtime).toContain('overtimeRecords');
  });
});

describe('Firestore path 충돌 검증', () => {
  it('동일 doc path 공유는 doc-merge / split-identity-payroll 패턴만 허용', () => {
    const seen = new Map();
    for (const [k, def] of Object.entries(KEY_REGISTRY)) {
      if (def.scope !== 'sync' || !def.firestorePath) continue;
      const samplePath = def.firestorePath('UID');
      if (seen.has(samplePath)) {
        const otherKey = seen.get(samplePath);
        const otherDef = KEY_REGISTRY[otherKey];
        const sharedDoc = (
          def.shape === 'doc-merge' || otherDef.shape === 'doc-merge' ||
          def.shape === 'split-identity-payroll' || otherDef.shape === 'split-identity-payroll'
        );
        if (!sharedDoc) {
          throw new Error(`Path 충돌: ${k} ↔ ${otherKey} (${samplePath}) — shape 비호환`);
        }
      } else {
        seen.set(samplePath, k);
      }
    }
  });

  it('모든 sync path 가 users/{uid}/ 프리픽스', () => {
    for (const [k, def] of Object.entries(KEY_REGISTRY)) {
      if (def.scope !== 'sync' || !def.firestorePath) continue;
      const path = def.firestorePath('UID');
      expect(path).toMatch(/^users\/UID\//);
    }
  });
});

describe('암호화 화이트리스트 일관성', () => {
  it('profile/identity 와 profile/payroll 별도 path', () => {
    const hrProfile = KEY_REGISTRY.snuhmate_hr_profile;
    expect(hrProfile.shape).toBe('split-identity-payroll');
    expect(hrProfile.firestorePath('UID')).toBe('users/UID/profile/identity');
    expect(hrProfile.payrollPath('UID')).toBe('users/UID/profile/payroll');
  });

  it('payslips, overtime, leave, work_history 는 collection (4-seg path)', () => {
    expect(KEY_REGISTRY.overtimePayslipData.firestorePath('UID')).toMatch(/^users\/UID\/payslips$/);
    expect(KEY_REGISTRY.overtimeRecords.firestorePath('UID')).toMatch(/^users\/UID\/overtime$/);
    expect(KEY_REGISTRY.leaveRecords.firestorePath('UID')).toMatch(/^users\/UID\/leave$/);
    expect(KEY_REGISTRY.snuhmate_work_history.firestorePath('UID')).toMatch(/^users\/UID\/work_history$/);
  });
});
