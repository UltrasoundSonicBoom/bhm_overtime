// firebase/crypto.js — Phase 8 Task 4 암호화 레이어
//
// 알고리즘: AES-GCM 256-bit
// 키 파생: SHA-256(uid + '|snuh-mate-2026') → AES-GCM key (결정론적)
// IV: 매 암호화마다 12-byte 랜덤 (crypto.getRandomValues)
// 저장 형태: { _v: 1, iv: <base64>, c: <base64> }
//
// 적용 범위: Firestore write 직전 / read 직후. localStorage 는 평문 유지.
// 트레이드오프: 암호화 필드는 Firestore 인덱스/쿼리 불가 — 화이트리스트 (_encrypted-fields.js)
// 가 인덱싱 가능 필드는 평문 유지하도록 분기.
//
// 키 회수: uid 잃으면 데이터 영구 잠금. Google 로그인 회복 시 uid 동일 → 데이터 회복.
// 키 회전: v1 미지원 (필요 시 client-side 재암호화 별도 phase).

const SALT = 'snuh-mate-2026';

// ── 키 파생 ──
export async function deriveKey(uid) {
  if (!uid || typeof uid !== 'string') {
    throw new Error('deriveKey: uid 가 비어있거나 string 이 아님');
  }
  const seed = new TextEncoder().encode(uid + '|' + SALT);
  const hash = await crypto.subtle.digest('SHA-256', seed);
  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── 단일 값 암호화 ──
export async function encryptValue(value, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return {
    _v: 1,
    iv: _b64(iv),
    c: _b64(new Uint8Array(cipher)),
  };
}

// ── 단일 값 복호화 ──
// 잘못된 _v / 잘못된 키 / 손상된 ciphertext → throw
// null / undefined → null 반환 (no-op)
export async function decryptValue(blob, key) {
  if (blob === null || blob === undefined) return null;
  if (!blob || typeof blob !== 'object') {
    throw new Error('decryptValue: blob 형식 오류');
  }
  if (blob._v !== 1) {
    throw new Error('decryptValue: 미지원 버전 _v=' + blob._v);
  }
  const iv = _ub64(blob.iv);
  const cipher = _ub64(blob.c);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
}

// ── Doc 단위 helper — 화이트리스트 기준 자동 분기 ──
// fields 패턴:
//   'name'              → doc.name 필드 암호화
//   'entries[].hours'   → doc.entries 배열의 각 항목의 hours 필드 암호화
//
// 평문 필드는 그대로 통과. 화이트리스트에 없는 필드는 그대로 통과.
export async function encryptDoc(doc, fields, key) {
  if (!doc || typeof doc !== 'object') return doc;
  const out = {};
  // 모든 필드 복사 (평문 유지)
  for (const [k, v] of Object.entries(doc)) {
    if (v === undefined) continue;  // undefined 는 Firestore 가 거부 — 제거
    out[k] = v;
  }
  // 화이트리스트 적용
  for (const fieldPath of (fields || [])) {
    if (fieldPath.includes('[].')) {
      // entries[].hours 패턴
      const [arrayKey, subField] = fieldPath.split('[].');
      const arr = out[arrayKey];
      if (!Array.isArray(arr)) continue;
      out[arrayKey] = await Promise.all(arr.map(async (item) => {
        if (item == null || typeof item !== 'object') return item;
        const v = item[subField];
        if (v === undefined) return item;
        if (v === null) return item;  // null 보존
        return { ...item, [subField]: await encryptValue(v, key) };
      }));
    } else {
      // 단일 필드
      const v = out[fieldPath];
      if (v === undefined) continue;
      if (v === null) continue;  // null 보존 (암호화 안 함)
      out[fieldPath] = await encryptValue(v, key);
    }
  }
  return out;
}

export async function decryptDoc(doc, fields, key) {
  if (!doc || typeof doc !== 'object') return doc;
  const out = { ...doc };
  for (const fieldPath of (fields || [])) {
    if (fieldPath.includes('[].')) {
      const [arrayKey, subField] = fieldPath.split('[].');
      const arr = out[arrayKey];
      if (!Array.isArray(arr)) continue;
      out[arrayKey] = await Promise.all(arr.map(async (item) => {
        if (item == null || typeof item !== 'object') return item;
        const v = item[subField];
        if (v == null) return item;
        if (typeof v !== 'object' || v._v !== 1) return item;  // 평문이면 그대로
        return { ...item, [subField]: await decryptValue(v, key) };
      }));
    } else {
      const v = out[fieldPath];
      if (v == null) continue;
      if (typeof v !== 'object' || v._v !== 1) continue;  // 평문이면 그대로
      out[fieldPath] = await decryptValue(v, key);
    }
  }
  return out;
}

// ── base64 유틸 (브라우저 + Node 호환) ──
function _b64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // 브라우저: btoa / Node: Buffer
  if (typeof btoa === 'function') return btoa(bin);
  return Buffer.from(bytes).toString('base64');
}

function _ub64(b64) {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}
