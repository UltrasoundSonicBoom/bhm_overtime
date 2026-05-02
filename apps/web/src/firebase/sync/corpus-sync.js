// firebase/sync/corpus-sync.js — 익명화된 근무표 코퍼스 백엔드 저장.
//
// 현재 보안 정책은 Firestore top-level write 를 허용하지 않는다.
// 코퍼스는 로컬 FastAPI 백엔드 SQLite에만 저장하고 parser-reviews 큐에서 검수한다.

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

  return {
    submitted: backendOk,
    reason: backendOk ? undefined : 'all_destinations_failed',
    firestore: false,
    backend: backendOk,
  };
}
