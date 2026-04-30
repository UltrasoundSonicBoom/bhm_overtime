// vision-router.js — Vision LLM 우선순위 라우팅.
//
// 1. 서버 REST API (/api/lmstudio/schedule/parse) — momo LM Link 경유
// 2. Anthropic Claude Vision (admin dev key, 일일 3회 한도)
// 3. 둘 다 실패 → null 반환 → 호출자가 수동 입력 폴백 모달

import { probeBackend, isDailyVisionLimitReached, incrementDailyVisionCount } from '../parse-cache.js';
import { callVisionLLM } from './vision-client.js';

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_MODEL = 'claude-sonnet-4-5';

/**
 * Vision 파싱 — 서버 REST API → Anthropic 폴백.
 * @param {Object} params
 * @param {string} params.imageBase64
 * @param {string} [params.mimeType='image/png']
 * @param {Object} [params.hints]
 * @param {Object} [params.opts]
 * @param {string} [params.opts.anthropicKey] — Phase 3 BYOK
 * @returns {Promise<{
 *   provider: 'lm-studio' | 'anthropic' | 'none',
 *   grid: object | null,
 *   raw?: string,
 *   error?: string,
 * }>}
 */
export async function routeVision({ imageBase64, mimeType = 'image/png', hints = {}, opts = {} }) {
  // 1. 서버 REST API — momo LM Link를 통해 서버에서 LM Studio 호출
  const backend = await probeBackend();
  if (backend) {
    try {
      const ctl = new AbortController();
      const tid = setTimeout(() => ctl.abort(), 120000);
      const resp = await fetch(`${backend}/api/lmstudio/schedule/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          mime_type: mimeType,
          document_type: 'schedule',
          create_review: true,
        }),
        signal: ctl.signal,
      });
      clearTimeout(tid);
      if (resp.ok) {
        const data = await resp.json();
        return { provider: 'lm-studio', grid: data.normalized, raw: JSON.stringify(data.extracted) };
      }
    } catch (e) {
      console.warn('[vision-router] 서버 REST API 실패, Anthropic 폴백 시도', e?.message);
    }
  }

  // 2. Anthropic 폴백 — 일일 3회 한도 가드
  if (isDailyVisionLimitReached()) {
    return {
      provider: 'none',
      grid: null,
      error: '오늘 자동 파싱 한도(3회)를 모두 사용했어요. 수동 입력으로 진행하세요.',
    };
  }

  const apiKey = opts.anthropicKey || _getAnthropicDevKey();
  if (!apiKey) {
    return {
      provider: 'none',
      grid: null,
      error: 'AI Vision 사용 불가 (서버 다운 + API 키 미설정). 수동 입력으로 진행하세요.',
    };
  }

  try {
    const result = await callVisionLLM({
      imageBase64, mimeType,
      baseURL: ANTHROPIC_BASE,
      model: ANTHROPIC_MODEL,
      apiKey,
      hints,
      timeout: 60000,
    });
    incrementDailyVisionCount();
    return { provider: 'anthropic', grid: result.grid, raw: result.raw };
  } catch (e) {
    return {
      provider: 'none',
      grid: null,
      error: `Vision API 호출 실패: ${e?.message?.slice(0, 100)}`,
    };
  }
}

/**
 * Phase 2 임시: Astro 빌드타임 환경변수 또는 admin이 콘솔에서 설정한 키.
 * Phase 3에서 설정 탭 BYOK UI로 교체.
 */
function _getAnthropicDevKey() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_ANTHROPIC_DEV_KEY) {
    return import.meta.env.PUBLIC_ANTHROPIC_DEV_KEY;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('snuhmate_anthropic_dev_key') || null;
  }
  return null;
}
