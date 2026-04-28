// Phase 8 Task 4 — 암호화 화이트리스트 + path 매칭 검증
import { describe, it, expect } from 'vitest';
import { ENCRYPTED_FIELDS, fieldsForPath, pathFromFullPath }
  from '../../../apps/web/src/firebase/sync/_encrypted-fields.js';

describe('ENCRYPTED_FIELDS — SPEC §18.2 화이트리스트', () => {
  it('필수 path 모두 등록', () => {
    const required = [
      'profile/identity', 'profile/payroll',
      'payslips/*', 'overtime/*', 'leave/*',
      'settings/app', 'settings/reference',
      'work_history/*',
    ];
    for (const p of required) expect(ENCRYPTED_FIELDS[p]).toBeDefined();
  });

  it('profile/identity 의 PII 필드', () => {
    const f = ENCRYPTED_FIELDS['profile/identity'];
    expect(f).toContain('name');
    expect(f).toContain('employeeId');
    expect(f).toContain('department');
  });

  it('profile/payroll 의 급여 필드', () => {
    const f = ENCRYPTED_FIELDS['profile/payroll'];
    expect(f).toContain('hourlyWage');
    expect(f).toContain('annualSalary');
    expect(f).toContain('manualHourly');
  });

  it('payslips/* 는 parsedFields 만 (payMonth 등은 평문 인덱싱)', () => {
    expect(ENCRYPTED_FIELDS['payslips/*']).toEqual(['parsedFields']);
  });

  it('overtime/* 는 entries[].hours/duration/notes (date 평문)', () => {
    const f = ENCRYPTED_FIELDS['overtime/*'];
    expect(f).toContain('entries[].hours');
    expect(f).toContain('entries[].duration');
    expect(f).toContain('entries[].notes');
    expect(f).not.toContain('entries[].date');
    expect(f).not.toContain('entries[].type');
  });
});

describe('fieldsForPath — wildcard 매칭', () => {
  it('정확 일치: profile/identity → 7 필드', () => {
    expect(fieldsForPath('profile/identity')).toEqual(ENCRYPTED_FIELDS['profile/identity']);
  });

  it('wildcard 매칭: overtime/202604 → overtime/* 의 필드', () => {
    expect(fieldsForPath('overtime/202604')).toEqual(ENCRYPTED_FIELDS['overtime/*']);
  });

  it('wildcard 매칭: payslips/abc123 → payslips/* 의 필드', () => {
    expect(fieldsForPath('payslips/abc123')).toEqual(ENCRYPTED_FIELDS['payslips/*']);
  });

  it('wildcard 매칭: leave/2026 → leave/* 의 필드', () => {
    expect(fieldsForPath('leave/2026')).toEqual(ENCRYPTED_FIELDS['leave/*']);
  });

  it('wildcard 미매칭: 알려지지 않은 path → 빈 배열', () => {
    expect(fieldsForPath('unknown/path')).toEqual([]);
  });

  it('wildcard 는 정확히 1 segment 매칭 (overtime/sub/deeper 미매칭)', () => {
    expect(fieldsForPath('overtime/sub/deeper')).toEqual([]);
  });
});

describe('pathFromFullPath', () => {
  it('users/{uid}/<path> 에서 <path> 추출', () => {
    expect(pathFromFullPath('users/abc/profile/identity')).toBe('profile/identity');
    expect(pathFromFullPath('users/u1/payslips/p1')).toBe('payslips/p1');
    expect(pathFromFullPath('users/u1/overtime/202604')).toBe('overtime/202604');
  });

  it('users/ 외 형식 → null', () => {
    expect(pathFromFullPath('admin/x')).toBe(null);
    expect(pathFromFullPath('public/x')).toBe(null);
  });

  it('짧은 path → null', () => {
    expect(pathFromFullPath('users/u1')).toBe(null);
    expect(pathFromFullPath('users')).toBe(null);
  });
});
