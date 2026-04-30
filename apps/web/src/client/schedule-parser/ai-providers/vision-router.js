// vision-router.js — Vision LLM 우선순위 라우팅 (OpenAI 임시 전환).
//
// LM Studio (momo-auto-macmini, qwen3-vl-4b) 경로는 thinking-token JSON 깨짐 이슈로
// 당분간 비활성. _archive/vision-router.lmstudio.js 에 보관.
//
// 1. OpenAI Vision API (gpt-4o-mini) — PUBLIC_OPENAI_API_KEY (개발/임시)
// 2. Anthropic Claude Vision (admin dev key, 일일 3회 한도)
// 3. 둘 다 실패 → null 반환 → 호출자가 수동 입력 폴백 모달

import { isDailyVisionLimitReached, incrementDailyVisionCount } from '../parse-cache.js';
import { callVisionLLM } from './vision-client.js';

const OPENAI_BASE = 'https://api.openai.com/v1';
const OPENAI_MODEL = 'gpt-4o-mini';
const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_MODEL = 'claude-sonnet-4-5';

/**
 * Vision 파싱 — OpenAI → Anthropic 폴백.
 * @param {Object} params
 * @param {string} params.imageBase64
 * @param {string} [params.mimeType='image/png']
 * @param {Object} [params.hints]
 * @param {Object} [params.opts]
 * @param {string} [params.opts.openaiKey] — 호출부 BYOK
 * @param {string} [params.opts.anthropicKey] — 호출부 BYOK
 * @returns {Promise<{
 *   provider: 'openai' | 'anthropic' | 'none',
 *   grid: object | null,
 *   raw?: string,
 *   error?: string,
 * }>}
 */
export async function routeVision({ imageBase64, mimeType = 'image/png', hints = {}, opts = {} }) {
  const openaiKey = opts.openaiKey || _getOpenAIKey();
  if (openaiKey) {
    if (isDailyVisionLimitReached()) {
      return {
        provider: 'none',
        grid: null,
        error: '오늘 자동 파싱 한도(3회)를 모두 사용했어요. 수동 입력으로 진행하세요.',
      };
    }
    try {
      const result = await callVisionLLM({
        imageBase64, mimeType,
        baseURL: OPENAI_BASE,
        model: OPENAI_MODEL,
        apiKey: openaiKey,
        hints,
        timeout: 60000,
      });
      incrementDailyVisionCount();
      return { provider: 'openai', grid: result.grid, raw: result.raw };
    } catch (e) {
      console.warn('[vision-router] OpenAI 실패, Anthropic 폴백 시도', e?.message);
    }
  }

  // Anthropic 폴백
  if (isDailyVisionLimitReached()) {
    return {
      provider: 'none',
      grid: null,
      error: '오늘 자동 파싱 한도(3회)를 모두 사용했어요. 수동 입력으로 진행하세요.',
    };
  }

  const anthropicKey = opts.anthropicKey || _getAnthropicDevKey();
  if (!anthropicKey) {
    return {
      provider: 'none',
      grid: null,
      error: 'AI Vision 사용 불가 (OpenAI/Anthropic 키 모두 미설정). 수동 입력으로 진행하세요.',
    };
  }

  try {
    const result = await callVisionLLM({
      imageBase64, mimeType,
      baseURL: ANTHROPIC_BASE,
      model: ANTHROPIC_MODEL,
      apiKey: anthropicKey,
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

function _getOpenAIKey() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_OPENAI_API_KEY) {
    return import.meta.env.PUBLIC_OPENAI_API_KEY;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('snuhmate_openai_api_key') || null;
  }
  return null;
}

function _getAnthropicDevKey() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_ANTHROPIC_DEV_KEY) {
    return import.meta.env.PUBLIC_ANTHROPIC_DEV_KEY;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('snuhmate_anthropic_dev_key') || null;
  }
  return null;
}
