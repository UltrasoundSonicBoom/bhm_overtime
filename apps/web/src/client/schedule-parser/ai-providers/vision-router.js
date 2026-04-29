// vision-router.js — Vision LLM 우선순위 라우팅.
//
// 1. 로컬 LM Studio (맥미니, OpenAI-compatible) — Qwen3-VL 8B
// 2. Anthropic Claude Vision (admin dev key, 일일 3회 한도)
// 3. 둘 다 실패 → null 반환 → 호출자가 수동 입력 폴백 모달

import { probeBackend, isDailyVisionLimitReached, incrementDailyVisionCount } from '../parse-cache.js';
import { callVisionLLM } from './vision-client.js';

const LMSTUDIO_BASE = 'http://localhost:1234/v1';
const LMSTUDIO_MODEL = 'qwen3-vl-8b';

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_MODEL = 'claude-sonnet-4-5';

/**
 * Vision 파싱 — 우선순위에 따라 LM Studio → Anthropic 폴백.
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
  // 1. 로컬 LM Studio 시도 (백엔드가 있으면 LM Studio도 있을 가능성 큼)
  const backend = await probeBackend();
  let lmStudioReachable = false;
  if (backend) {
    try {
      const ctl = new AbortController();
      const tid = setTimeout(() => ctl.abort(), 1500);
      const resp = await fetch(`${LMSTUDIO_BASE}/models`, { signal: ctl.signal });
      clearTimeout(tid);
      if (resp.ok) {
        const data = await resp.json();
        const ids = (data?.data || []).map(m => m.id);
        lmStudioReachable = ids.some(id => id.toLowerCase().includes('vl') || id === LMSTUDIO_MODEL);
      }
    } catch (_e) { /* LM Studio not reachable */ }
  }

  if (lmStudioReachable) {
    try {
      const result = await callVisionLLM({
        imageBase64, mimeType,
        baseURL: LMSTUDIO_BASE,
        model: LMSTUDIO_MODEL,
        hints,
        timeout: 60000,
      });
      return { provider: 'lm-studio', grid: result.grid, raw: result.raw };
    } catch (e) {
      console.warn('[vision-router] LM Studio 실패, Anthropic 폴백 시도', e?.message);
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
      error: 'AI Vision 사용 불가 (로컬 LLM 다운 + API 키 미설정). 수동 입력으로 진행하세요.',
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
  // 빌드 타임 (PUBLIC_*은 클라이언트 노출되므로 admin-only 환경 한정)
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_ANTHROPIC_DEV_KEY) {
    return import.meta.env.PUBLIC_ANTHROPIC_DEV_KEY;
  }
  // localStorage (admin이 콘솔에서 직접 설정)
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('snuhmate_anthropic_dev_key') || null;
  }
  return null;
}
