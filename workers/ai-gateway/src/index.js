/**
 * snuhmate-ai-gateway — Cloudflare Worker
 *
 * GET  /ai/agents      → 에이전트 카탈로그 (정적 JSON)
 * POST /ai/agent/run   → DeepSeek SSE 스트리밍 프록시 (키는 Worker secret)
 */

import AGENTS from './agents.json';

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';
const MAX_INPUT_BYTES = 8 * 1024;

// ── CORS ──────────────────────────────────────────────────────
function corsHeaders(origin) {
  const allowed = [
    'https://snuhmate.com',
    'https://snuhmate.pages.dev',
  ];
  // localhost 개발 환경 허용
  const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin || '');
  const allowOrigin = allowed.includes(origin) || isLocalhost ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, origin, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// ── 프롬프트 렌더 ──────────────────────────────────────────────
function renderPrompt(template, inputs) {
  let result = template;
  for (const [k, v] of Object.entries(inputs)) {
    result = result.replaceAll(`{{${k}}}`, v ?? '');
  }
  // 조건 블록 {{#key}}...{{/key}}
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, content) =>
    inputs[key] ? content : ''
  );
  return result;
}

// ── 메인 핸들러 ───────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // GET /ai/agents
    if (request.method === 'GET' && url.pathname === '/ai/agents') {
      // 프론트에 system_prompt / user_prompt_template 노출 안 함
      const catalog = AGENTS.map(({ system_prompt, user_prompt_template, ...rest }) => rest);
      return json(catalog, origin);
    }

    // POST /ai/agent/run
    if (request.method === 'POST' && url.pathname === '/ai/agent/run') {
      if (!env.DEEPSEEK_API_KEY) {
        return json({ error: 'DEEPSEEK_API_KEY not configured' }, origin, 500);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'invalid JSON' }, origin, 400);
      }

      const { agent_id, inputs = {} } = body;
      const template = AGENTS.find(a => a.id === agent_id);
      if (!template) {
        return json({ error: `agent not found: ${agent_id}` }, origin, 404);
      }

      // 입력값 크기 검증
      for (const [key, val] of Object.entries(inputs)) {
        if (new TextEncoder().encode(val).length > MAX_INPUT_BYTES) {
          return json({ error: `input '${key}' too large` }, origin, 413);
        }
      }

      const userPrompt = renderPrompt(template.user_prompt_template, inputs);

      const upstream = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: template.system_prompt },
            { role: 'user', content: userPrompt },
          ],
          stream: true,
          temperature: 0.4,
          max_tokens: 2048,
        }),
      });

      if (!upstream.ok) {
        const err = await upstream.text();
        return json({ error: err }, origin, upstream.status);
      }

      // DeepSeek SSE → 클라이언트 SSE 그대로 전달
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...corsHeaders(origin),
        },
      });
    }

    return json({ error: 'not found' }, origin, 404);
  },
};
