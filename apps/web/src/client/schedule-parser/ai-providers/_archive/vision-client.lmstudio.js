// vision-client.js — OpenAI-compatible Vision API 호출.
//
// LM Studio (로컬, 맥미니)와 Anthropic Claude Vision 양쪽 모두 OpenAI-compatible 스펙 따라
// baseURL + model + apiKey만 바꿔서 동일 코드로 호출.
//
// 응답: 모델이 반환하는 텍스트(JSON 문자열)를 파싱해서 DutyGrid 후보 반환.
// 파싱 실패 시 throw.

import { SCHEDULE_SYSTEM_PROMPT, buildUserPrompt } from '../prompts.js';

/**
 * Vision LLM 호출.
 * @param {Object} params
 * @param {string} params.imageBase64
 * @param {string} params.mimeType
 * @param {string} params.baseURL  ('http://localhost:1234/v1' 또는 'https://api.anthropic.com/v1')
 * @param {string} params.model    ('qwen3-vl-8b' 또는 'claude-sonnet-4-5')
 * @param {string} [params.apiKey]
 * @param {Object} [params.hints]
 * @param {number} [params.timeout=60000]
 * @returns {Promise<{ raw: string, grid: object }>}
 */
export async function callVisionLLM({
  imageBase64,
  mimeType = 'image/png',
  baseURL,
  model,
  apiKey = '',
  hints = {},
  timeout = 60000,
}) {
  if (!imageBase64) throw new Error('imageBase64 required');
  if (!baseURL) throw new Error('baseURL required');
  if (!model) throw new Error('model required');

  const userPrompt = buildUserPrompt(hints);

  const body = {
    model,
    max_tokens: 4000,
    temperature: 0.1,
    messages: [
      { role: 'system', content: SCHEDULE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
  };

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeout);
  let resp;
  try {
    resp = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(tid);
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Vision API ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Vision API: 빈 응답');
  }

  // JSON 추출 (마크다운 fence 또는 그냥 JSON)
  const jsonText = _extractJsonText(content);
  let grid;
  try {
    grid = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Vision API JSON parse 실패: ${e?.message?.slice(0, 100)}`);
  }

  return { raw: content, grid };
}

/**
 * 모델이 ```json ... ``` 펜스로 감싸거나 일반 JSON으로 반환하는 두 케이스 모두 처리.
 */
function _extractJsonText(content) {
  const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // 첫 { 부터 마지막 } 까지
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }
  return content.trim();
}
