// firebase/sync/corpus-sync.js — 익명화된 근무표 코퍼스 Firestore 저장.
//
// 컬렉션: anonymous_corpus/{auto-id}
// 사용자 uid 미연결 (진짜 익명).
// Firestore 보안 규칙: write-only-no-auth (admin만 read).
//
// 백엔드 SQLite에도 함께 저장 (parser-reviews 큐로 활용).

import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../client/config.js';
import { anonymize, getCorpusConsent } from '../../client/schedule-parser/anonymize.js';

/**
 * 코퍼스 제출 — 동의 OFF면 noop.
 * @param {Object} params
 * @param {DutyGrid} params.grid - 파싱 결과
 * @param {boolean} [params.consentOverride] - true면 동의 강제 무시 (테스트용)
 * @returns {Promise<{ submitted: boolean, reason?: string }>}
 */
export async function submitToCorpus({ grid, consentOverride } = {}) {
  if (!grid) return { submitted: false, reason: 'no_grid' };

  const consent = getCorpusConsent();
  if (!consent.granted && !consentOverride) {
    return { submitted: false, reason: 'no_consent' };
  }

  let anon;
  try {
    anon = anonymize(grid);
  } catch (e) {
    return { submitted: false, reason: `anonymize_failed: ${e?.message?.slice(0, 100)}` };
  }
  if (!anon || anon.rows.length === 0) {
    return { submitted: false, reason: 'empty_after_anon' };
  }

  // 1. Firestore 시도 (best-effort)
  let firestoreOk = false;
  try {
    const { db, firestoreMod } = await _f();
    const col = firestoreMod.collection(db, 'anonymous_corpus');
    await firestoreMod.addDoc(col, anon);
    firestoreOk = true;
  } catch (e) {
    console.warn('[corpus] Firestore write 실패 (정상 — admin 외에는 read 차단)', e?.message);
  }

  // 2. 백엔드 SQLite 시도 (best-effort)
  let backendOk = false;
  try {
    const { probeBackend } = await import('../../client/schedule-parser/parse-cache.js');
    const url = await probeBackend();
    if (url) {
      const fd = new FormData();
      fd.set('corpus_json', JSON.stringify(anon));
      const resp = await fetch(`${url}/corpus/submit`, { method: 'POST', body: fd });
      backendOk = resp.ok;
    }
  } catch (e) {
    // 백엔드 없으면 silent skip
  }

  const submitted = firestoreOk || backendOk;
  return {
    submitted,
    reason: submitted ? undefined : 'all_destinations_failed',
    firestore: firestoreOk,
    backend: backendOk,
  };
}

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return { db: _firebase.db, firestoreMod: _firebase.firestoreMod };
}
