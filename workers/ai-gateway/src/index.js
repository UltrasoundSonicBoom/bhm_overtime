/**
 * snuhmate-ai-gateway — Cloudflare Worker
 *
 * GET  /ai/agents      → 에이전트 카탈로그 (정적 JSON)
 * GET  /ai/framework   → 선택한 에이전트 프레임워크 메타데이터
 * POST /ai/agent/run   → DeepSeek SSE 스트리밍 프록시 (키는 Worker secret)
 */

import CORE_AGENTS from './agents.json';
import PRODUCT_AGENTS from './product-agents.json';

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';
const MAX_INPUT_BYTES = 8 * 1024;
const AGENTS = [...CORE_AGENTS, ...PRODUCT_AGENTS];
const FRAMEWORK = {
  id: 'cloudflare-agents-sdk-ready-sse',
  name: 'Cloudflare Agents SDK-ready SSE Gateway',
  runtime: 'Cloudflare Workers',
  transport: 'Server-Sent Events',
  providerContract: 'OpenAI-compatible /chat/completions',
  adminAuth: 'Authorization: Bearer <SNUHMATE_ADMIN_TOKEN>',
};

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

function publicAgent(agent) {
  const { system_prompt, user_prompt_template, ...rest } = agent;
  return rest;
}

function timingSafeEqual(a, b) {
  const left = new TextEncoder().encode(a || '');
  const right = new TextEncoder().encode(b || '');
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left[i] ^ right[i];
  }
  return diff === 0;
}

function authorizeAgent(template, request, env, origin) {
  if (!template.requires_admin) return null;

  const expected = (env.SNUHMATE_ADMIN_TOKEN || env.ADMIN_AGENT_TOKEN || '').trim();
  if (!expected) {
    return json({ error: 'admin auth not configured' }, origin, 503);
  }

  const header = request.headers.get('Authorization') || '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) {
    return json({ error: 'admin token required' }, origin, 401);
  }

  const provided = header.slice(prefix.length).trim();
  if (!timingSafeEqual(provided, expected)) {
    return json({ error: 'admin token invalid' }, origin, 403);
  }

  return null;
}

function validateInputs(template, inputs, origin) {
  for (const spec of template.inputs || []) {
    const value = inputs[spec.id];
    if (spec.required && !String(value || '').trim()) {
      return json({ error: `input '${spec.id}' required` }, origin, 422);
    }
  }

  for (const [key, val] of Object.entries(inputs)) {
    if (new TextEncoder().encode(String(val ?? '')).length > MAX_INPUT_BYTES) {
      return json({ error: `input '${key}' too large` }, origin, 413);
    }
  }

  return null;
}

function sseEvent(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function providerSseToClientSse(upstream, origin) {
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      let closed = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            if (raw === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              closed = true;
              return;
            }
            try {
              const parsed = JSON.parse(raw);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) controller.enqueue(encoder.encode(sseEvent(delta)));
            } catch {
              // Ignore malformed provider chunks and keep the stream alive.
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        controller.enqueue(encoder.encode(sseEvent(`[ERROR] ${err.message}`)));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        if (!closed) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...corsHeaders(origin),
    },
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
      const catalog = AGENTS.map(publicAgent);
      return json(catalog, origin);
    }

    // GET /ai/framework
    if (request.method === 'GET' && url.pathname === '/ai/framework') {
      return json(FRAMEWORK, origin);
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

      const authError = authorizeAgent(template, request, env, origin);
      if (authError) return authError;

      const validationError = validateInputs(template, inputs, origin);
      if (validationError) return validationError;

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

      // DeepSeek/OpenAI-style SSE → 프론트가 바로 표시 가능한 delta SSE로 변환
      return providerSseToClientSse(upstream, origin);
    }

    return json({ error: 'not found' }, origin, 404);
  },
};
