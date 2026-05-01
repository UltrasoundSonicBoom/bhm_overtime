// Phase 8 Task 7 — 인벤토리 커버리지 게이트
//
// 1. KEY_REGISTRY 의 모든 sync 키에 Firestore path 정의
// 2. 모든 sync 키의 Firestore path 에 대응하는 ENCRYPTED_FIELDS 항목 존재
// 3. CATEGORIES 배열이 key-registry 에서 사용된 모든 category 를 포함

import { describe, it, expect } from 'vitest';
import { KEY_REGISTRY, CATEGORIES, syncKeys } from '../../../apps/web/src/firebase/key-registry.js';
import { HANDLER_BASES, SPECIAL_KEY_PATTERNS } from '../../../apps/web/src/firebase/auto-sync.js';
import { HYDRATED_BASES, CLEARED_EXACT_BASES } from '../../../apps/web/src/firebase/hydrate.js';
import { ENCRYPTED_FIELDS, fieldsForPath } from '../../../apps/web/src/firebase/sync/_encrypted-fields.js';

function pathHasEncryptedFieldsMapping(collPath) {
  if (Object.prototype.hasOwnProperty.call(ENCRYPTED_FIELDS, collPath)) return true;
  return Object.keys(ENCRYPTED_FIELDS).some((pattern) => {
    if (!pattern.endsWith('/*')) return false;
    const prefix = pattern.slice(0, -2);
    if (!collPath.startsWith(prefix + '/')) return false;
    return !collPath.slice(prefix.length + 1).includes('/');
  });
}

function sampleCollectionPath(def, uid) {
  const fullPath = def.firestorePath(uid);
  const parts = fullPath.split('/');
  const collPath = parts.slice(2).join('/');

  if (def.shape === 'collection-by-yyyymm') return collPath + '/2026-04';
  if (def.shape === 'collection-by-yyyy') return collPath + '/2026';
  if (def.shape === 'collection-by-id') return collPath + '/sample-id';
  return collPath;
}

describe('key-registry 인벤토리 커버리지', () => {
  it('모든 sync 키에 firestorePath 정의', () => {
    const keys = syncKeys();
    for (const k of keys) {
      const def = KEY_REGISTRY[k];
      expect(def.firestorePath, `${k}: firestorePath 누락`).toBeDefined();
      expect(typeof def.firestorePath).toBe('function');
    }
  });

  it('모든 sync 키의 Firestore path → ENCRYPTED_FIELDS 매핑', () => {
    const keys = syncKeys();
    const uid = 'uid_test';
    for (const k of keys) {
      const def = KEY_REGISTRY[k];
      const collPath = sampleCollectionPath(def, uid);
      const fields = fieldsForPath(collPath);
      expect(fields, `${k}: path ${collPath} 에 ENCRYPTED_FIELDS 항목 없음`).toBeDefined();
      expect(pathHasEncryptedFieldsMapping(collPath), `${k}: path ${collPath} 에 ENCRYPTED_FIELDS 항목 없음`).toBe(true);
    }
  });

  it('KEY_REGISTRY 의 모든 category 가 CATEGORIES 에 포함', () => {
    for (const [k, def] of Object.entries(KEY_REGISTRY)) {
      if (def.scope === 'device-local' || !def.category) continue;
      expect(CATEGORIES, `${k}: category "${def.category}" 가 CATEGORIES 에 없음`)
        .toContain(def.category);
    }
  });

  it('sync 키 최소 7개 (phase 7 완료 기준)', () => {
    expect(syncKeys().length).toBeGreaterThanOrEqual(7);
  });

  it('모든 sync 키가 auto-sync 또는 명시적 special pattern 으로 실행 가능', () => {
    const executable = new Set([...HANDLER_BASES, ...SPECIAL_KEY_PATTERNS]);
    for (const key of syncKeys()) {
      expect(executable.has(key), `${key}: auto-sync 실행 경로 없음`).toBe(true);
    }
  });

  it('주요 user-scoped sync 키가 hydrate/clear 경로에 포함', () => {
    const required = [
      'snuhmate_hr_profile',
      'overtimeRecords',
      'otManualHourly',
      'overtimePayslipData',
      'leaveRecords',
      'snuhmate_work_history',
      'snuhmate_work_history_seeded',
      'snuhmate_reg_favorites',
      'snuhmate_schedule_records',
    ];

    for (const key of required) {
      expect(HYDRATED_BASES, `${key}: hydrate 누락`).toContain(key);
      expect(CLEARED_EXACT_BASES, `${key}: logout clear 누락`).toContain(key);
    }
  });
});
