// Phase 8 Task 4 — 암호화 레이어 (AES-GCM, uid 파생 키) 검증
//
// 검증 항목:
//   1. deriveKey: 동일 uid → 동일 key (결정론적), 다른 uid → 다른 key
//   2. encryptValue / decryptValue 라운드트립 (string, number, object, array)
//   3. 동일 평문 + 동일 키 → 다른 ciphertext (IV 랜덤성)
//   4. encryptDoc / decryptDoc 화이트리스트 분기 (평문 필드 보존, 암호화 필드 변환)
//   5. nested 'entries[].field' 패턴 (overtime/leave 시간/일수 필드)
//   6. 잘못된 키로 복호화 → null 또는 throw
//   7. _v 버전 관리 — 미지원 버전 → null
//   8. 빈/null 값 처리

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';

// jsdom 에는 crypto.subtle 없음 → Node 의 webcrypto 를 globalThis 에 wire
beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  // Node 19+ 의 globalThis.crypto 는 이미 webcrypto (read-only). jsdom 의 window.crypto 만 wire.
  if (!dom.window.crypto || !dom.window.crypto.subtle) {
    const nodeCrypto = await import('node:crypto');
    Object.defineProperty(global.window, 'crypto', {
      value: nodeCrypto.webcrypto,
      configurable: true,
    });
  }
  // globalThis.crypto 가 누락된 환경 대비 (Node 18 이하) — defineProperty 로 set 시도
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
    const nodeCrypto = await import('node:crypto');
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: nodeCrypto.webcrypto,
        configurable: true,
      });
    } catch (e) { /* read-only — 무시 (이미 정상이라는 뜻) */ }
  }
});

describe('crypto — deriveKey', () => {
  it('동일 uid → 동일 key (결정론적)', async () => {
    const { deriveKey, encryptValue, decryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const k1 = await deriveKey('alice');
    const k2 = await deriveKey('alice');
    // CryptoKey 객체는 직접 비교 못 함 → encrypt/decrypt 라운드트립으로 동등성 검증
    const blob = await encryptValue('test', k1);
    const restored = await decryptValue(blob, k2);
    expect(restored).toBe('test');
  });

  it('다른 uid → 다른 key (alice 로 암호화 → bob 으로 복호화 실패)', async () => {
    const { deriveKey, encryptValue, decryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const aliceKey = await deriveKey('alice');
    const bobKey = await deriveKey('bob');
    const blob = await encryptValue('secret', aliceKey);
    // Bob 의 키로 복호화 시도 → throw (AES-GCM 인증 실패) 또는 잘못된 평문
    await expect(decryptValue(blob, bobKey)).rejects.toBeDefined();
  });
});

describe('crypto — encryptValue / decryptValue 라운드트립', () => {
  it('문자열', async () => {
    const { deriveKey, encryptValue, decryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const blob = await encryptValue('김간호', key);
    expect(await decryptValue(blob, key)).toBe('김간호');
  });

  it('숫자', async () => {
    const { deriveKey, encryptValue, decryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const blob = await encryptValue(15000, key);
    expect(await decryptValue(blob, key)).toBe(15000);
  });

  it('객체 (parsedFields 시나리오)', async () => {
    const { deriveKey, encryptValue, decryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const obj = { 기본급: 5000000, 직무수당: 200000, 연장근로수당: 150000 };
    const blob = await encryptValue(obj, key);
    expect(await decryptValue(blob, key)).toEqual(obj);
  });

  it('배열', async () => {
    const { deriveKey, encryptValue, decryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const arr = [1, 2, { hours: 8.5 }];
    const blob = await encryptValue(arr, key);
    expect(await decryptValue(blob, key)).toEqual(arr);
  });

  it('null', async () => {
    const { deriveKey, encryptValue, decryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const blob = await encryptValue(null, key);
    expect(await decryptValue(blob, key)).toBe(null);
  });
});

describe('crypto — IV 랜덤성', () => {
  it('동일 평문 + 동일 키 → 다른 ciphertext (IV 매번 다름)', async () => {
    const { deriveKey, encryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const a = await encryptValue('same', key);
    const b = await encryptValue('same', key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.c).not.toBe(b.c);
  });

  it('암호문 형태: { _v: 1, iv: <base64>, c: <base64> }', async () => {
    const { deriveKey, encryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const blob = await encryptValue('x', key);
    expect(blob._v).toBe(1);
    expect(typeof blob.iv).toBe('string');
    expect(typeof blob.c).toBe('string');
    // base64 패턴 (alphanumeric + +/=)
    expect(blob.iv).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe('crypto — _v 버전 관리', () => {
  it('잘못된 _v → throw', async () => {
    const { deriveKey, decryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    await expect(decryptValue({ _v: 99, iv: 'AAAAAAAAAAAAAAAA', c: 'AA==' }, key)).rejects.toBeDefined();
  });

  it('null/undefined → null', async () => {
    const { deriveKey, decryptValue } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    expect(await decryptValue(null, key)).toBe(null);
    expect(await decryptValue(undefined, key)).toBe(null);
  });
});

describe('crypto — encryptDoc / decryptDoc 화이트리스트', () => {
  it('암호화 필드만 변환, 평문 필드 보존', async () => {
    const { deriveKey, encryptDoc, decryptDoc } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const doc = {
      payMonth: '2026-04',
      payDate: '2026-04-25',
      payslipName: '정기급여',
      parsedFields: { 기본급: 5000000 },
      lastEditAt: 12345,
    };
    const fields = ['parsedFields'];  // parsedFields 만 암호화
    const enc = await encryptDoc(doc, fields, key);
    expect(enc.payMonth).toBe('2026-04');                  // 평문
    expect(enc.payDate).toBe('2026-04-25');                // 평문
    expect(enc.payslipName).toBe('정기급여');              // 평문
    expect(enc.lastEditAt).toBe(12345);                    // 평문
    expect(enc.parsedFields).not.toEqual(doc.parsedFields); // 암호화됨
    expect(enc.parsedFields._v).toBe(1);
    // 라운드트립
    const dec = await decryptDoc(enc, fields, key);
    expect(dec).toEqual(doc);
  });

  it('암호화 대상 필드 누락 시 그대로 통과', async () => {
    const { deriveKey, encryptDoc, decryptDoc } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const doc = { payMonth: '2026-04' };
    const enc = await encryptDoc(doc, ['parsedFields'], key);  // doc 에 parsedFields 없음
    expect(enc).toEqual({ payMonth: '2026-04' });
    expect(await decryptDoc(enc, ['parsedFields'], key)).toEqual(doc);
  });

  it('null/undefined 필드는 암호화 안 함 (필드 자체가 없는 것과 동일)', async () => {
    const { deriveKey, encryptDoc, decryptDoc } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const doc = { name: null, employeeId: undefined, department: '내과' };
    const enc = await encryptDoc(doc, ['name', 'employeeId', 'department'], key);
    expect(enc.name).toBe(null);                            // null 보존
    expect('employeeId' in enc).toBe(false);                // undefined 제거
    expect(enc.department._v).toBe(1);                      // 정상 암호화
    const dec = await decryptDoc(enc, ['name', 'employeeId', 'department'], key);
    expect(dec.department).toBe('내과');
    expect(dec.name).toBe(null);
  });
});

describe('crypto — entries[].field 패턴 (overtime/leave)', () => {
  it('entries 배열의 특정 필드만 암호화', async () => {
    const { deriveKey, encryptDoc, decryptDoc } = await import('../../../apps/web/src/firebase/crypto.js');
    const key = await deriveKey('u1');
    const doc = {
      lastEditAt: 1,
      entries: [
        { date: '2026-04-01', hours: 4, type: '평일연장' },
        { date: '2026-04-02', hours: 2.5, type: '휴일근무' },
      ],
    };
    // entries[].hours, entries[].type 중 hours 만 암호화 → date/type 평문 유지
    const fields = ['entries[].hours'];
    const enc = await encryptDoc(doc, fields, key);
    expect(enc.entries[0].date).toBe('2026-04-01');         // 평문
    expect(enc.entries[0].type).toBe('평일연장');           // 평문
    expect(enc.entries[0].hours._v).toBe(1);                // 암호화
    expect(enc.entries[1].hours._v).toBe(1);
    expect(enc.lastEditAt).toBe(1);
    const dec = await decryptDoc(enc, fields, key);
    expect(dec).toEqual(doc);
  });
});
