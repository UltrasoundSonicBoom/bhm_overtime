// llm-consent-dialog 단위 테스트 — DOM 미의존 함수만 (consent state 관리)
//
// _showDialog / ensureConsent 는 DOM 조작이라 e2e Playwright 에서 검증.
// 여기서는 getConsent / isOptedIn / getOrCreateAnonId / resetConsent 의 localStorage 로직만.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage mock (node 환경)
const _store = {};
const localStorageMock = {
  getItem: (k) => (k in _store ? _store[k] : null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { for (const k of Object.keys(_store)) delete _store[k]; },
};

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal('localStorage', localStorageMock);
});

const importFresh = async () => {
  // vitest 는 import 캐시를 사용하지만 module-level 코드는 없으므로 안전
  const mod = await import('../../apps/web/src/client/llm-consent-dialog.js');
  return mod;
};

describe('getConsent', () => {
  it('미응답 → null', async () => {
    const { getConsent } = await importFresh();
    expect(getConsent()).toBeNull();
  });

  it('opted-in 저장 → "opted-in" 반환', async () => {
    const { getConsent } = await importFresh();
    localStorage.setItem('snuhmate_llm_consent_v1', 'opted-in');
    expect(getConsent()).toBe('opted-in');
  });

  it('opted-out 저장 → "opted-out" 반환', async () => {
    const { getConsent } = await importFresh();
    localStorage.setItem('snuhmate_llm_consent_v1', 'opted-out');
    expect(getConsent()).toBe('opted-out');
  });

  it('알 수 없는 값 → null (validation)', async () => {
    const { getConsent } = await importFresh();
    localStorage.setItem('snuhmate_llm_consent_v1', 'some-other-value');
    expect(getConsent()).toBeNull();
  });
});

describe('isOptedIn', () => {
  it('opted-in 일 때만 true', async () => {
    const { isOptedIn } = await importFresh();
    expect(isOptedIn()).toBe(false);
    localStorage.setItem('snuhmate_llm_consent_v1', 'opted-in');
    expect(isOptedIn()).toBe(true);
    localStorage.setItem('snuhmate_llm_consent_v1', 'opted-out');
    expect(isOptedIn()).toBe(false);
  });
});

describe('getOrCreateAnonId', () => {
  it('옵트아웃 → null', async () => {
    const { getOrCreateAnonId } = await importFresh();
    localStorage.setItem('snuhmate_llm_consent_v1', 'opted-out');
    expect(getOrCreateAnonId()).toBeNull();
  });

  it('미응답 → null', async () => {
    const { getOrCreateAnonId } = await importFresh();
    expect(getOrCreateAnonId()).toBeNull();
  });

  it('옵트인 → ID 생성 + 재호출 시 동일 ID', async () => {
    const { getOrCreateAnonId } = await importFresh();
    localStorage.setItem('snuhmate_llm_consent_v1', 'opted-in');
    const id1 = getOrCreateAnonId();
    expect(id1).toBeTruthy();
    expect(id1.length).toBeGreaterThan(8);
    const id2 = getOrCreateAnonId();
    expect(id2).toBe(id1);
  });

  it('생성된 anonId 는 localStorage 에 저장됨', async () => {
    const { getOrCreateAnonId } = await importFresh();
    localStorage.setItem('snuhmate_llm_consent_v1', 'opted-in');
    const id = getOrCreateAnonId();
    expect(localStorage.getItem('snuhmate_anon_id')).toBe(id);
  });
});

describe('resetConsent', () => {
  it('consent + anonId 모두 정리', async () => {
    const { resetConsent, getConsent } = await importFresh();
    localStorage.setItem('snuhmate_llm_consent_v1', 'opted-in');
    localStorage.setItem('snuhmate_anon_id', 'test-id-123');
    resetConsent();
    expect(getConsent()).toBeNull();
    expect(localStorage.getItem('snuhmate_anon_id')).toBeNull();
  });
});

describe('opted-out 시 anonId 자동 정리', () => {
  it('이전에 발급된 anonId 가 있어도 옵트아웃 후 null', async () => {
    const { getOrCreateAnonId } = await importFresh();
    // 옵트인 상태에서 ID 발급
    localStorage.setItem('snuhmate_llm_consent_v1', 'opted-in');
    const id = getOrCreateAnonId();
    expect(id).toBeTruthy();

    // 옵트아웃 시뮬레이션 (실제로는 _setConsent가 자동 정리)
    // 여기서는 외부 export 가 없으므로 dialog 가 호출하는 _setConsent 동작을 검증.
    // 대신 옵트아웃 상태로 변경 후 getOrCreateAnonId 가 null 반환하는지만 확인.
    localStorage.setItem('snuhmate_llm_consent_v1', 'opted-out');
    expect(getOrCreateAnonId()).toBeNull();
  });
});
