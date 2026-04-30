// payslip-llm-verify.js — 급여명세서 2차 검증 (OpenAI Vision API).
//
// salary-parser.js 의 regex 결과(parsed)와 원본 PDF/이미지 base64 를 함께 보내
// LLM 이 항목·금액·합계를 다시 점검하고 차이점을 리포트.
//
// LM Studio (qwen3-vl-4b + gemma-4-e4b) 경로는 thinking-token 이슈로 보류.
// _archive/ 의 lmstudio_gateway.py:/api/lmstudio/payslip/parse 가 원래 담당 엔드포인트.

const OPENAI_BASE = 'https://api.openai.com/v1';
const OPENAI_MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `너는 한국 병원 급여명세서를 검증하는 회계 보조다.
사용자가 (1) 원본 명세서 이미지, (2) 정규식 파서가 추출한 항목/금액 JSON 을 함께 줄 것이다.
다음을 점검해 결과를 JSON 으로만 반환:

1. 누락된 지급/공제 항목이 있는가
2. 금액 오인식(자릿수 누락, 콤마 오류 등)이 있는가
3. 지급총액·공제총액·실지급액 합계 일치 여부
4. 신뢰도 (0~1)

응답 스키마(설명 없이 JSON만):
{
  "ok": boolean,
  "confidence": number,
  "issues": [
    {"field": "string", "parsed": "값", "image_value": "값", "severity": "low|medium|high", "note": "한 줄"}
  ],
  "suggested_fix": { "지급": {"항목명": 금액, ...}, "공제": {...} } | null,
  "summary": "한 줄 요약"
}`;

/**
 * @param {Object} params
 * @param {string} params.imageBase64  - PDF 첫 페이지 또는 이미지 base64
 * @param {string} [params.mimeType='image/png']
 * @param {Object} params.parsed       - salary-parser 결과 ({지급, 공제, 합계})
 * @param {string} [params.apiKey]     - OpenAI 키 (없으면 env/localStorage)
 * @param {number} [params.timeout=60000]
 * @returns {Promise<{ok:boolean, confidence:number, issues:Array, suggested_fix:object|null, summary:string, raw:string} | null>}
 */
export async function verifyPayslipWithLLM({
  imageBase64,
  mimeType = 'image/png',
  parsed,
  apiKey,
  timeout = 60000,
}) {
  if (!imageBase64 || !parsed) return null;
  const key = apiKey || _getOpenAIKey();
  if (!key) {
    console.warn('[payslip-llm-verify] OpenAI 키 없음 — 검증 스킵');
    return null;
  }

  const userText = `정규식 파서 결과:\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\`\n위 결과가 이미지의 명세서와 일치하는지 검증해 JSON 으로 답해줘.`;

  const body = {
    model: OPENAI_MODEL,
    max_tokens: 1500,
    temperature: 0.0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          { type: 'text', text: userText },
        ],
      },
    ],
  };

  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), timeout);
  let resp;
  try {
    resp = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } finally {
    clearTimeout(tid);
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OpenAI ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    const parsedResult = JSON.parse(content);
    return { ...parsedResult, raw: content };
  } catch (e) {
    console.warn('[payslip-llm-verify] JSON parse 실패', e?.message);
    return null;
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
