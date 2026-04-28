// Phase 8 Task 7 — 인벤토리 커버리지 게이트
//
// 1. KEY_REGISTRY 의 모든 sync 키에 Firestore path 정의
// 2. 모든 sync 키의 Firestore path 에 대응하는 ENCRYPTED_FIELDS 항목 존재
// 3. CATEGORIES 배열이 key-registry 에서 사용된 모든 category 를 포함

import { describe, it, expect } from 'vitest';
import { KEY_REGISTRY, CATEGORIES, syncKeys } from '../../../apps/web/src/firebase/key-registry.js';
import { ENCRYPTED_FIELDS, fieldsForPath } from '../../../apps/web/src/firebase/sync/_encrypted-fields.js';

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
      const fullPath = def.firestorePath(uid);
      // users/{uid}/<path> 에서 <path> 추출
      const parts = fullPath.split('/');
      const collPath = parts.slice(2).join('/'); // 'users/uid/' 제거
      // fieldsForPath 는 빈 배열을 포함해 정의된 경우만 OK
      // (settings/reference 같은 경우 [] 반환이어도 정상)
      const fields = fieldsForPath(collPath);
      expect(fields, `${k}: path ${collPath} 에 ENCRYPTED_FIELDS 항목 없음`).toBeDefined();
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
});
