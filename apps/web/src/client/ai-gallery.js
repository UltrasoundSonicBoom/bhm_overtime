// ai-gallery.js — AI 에이전트 갤러리 (탭 진입 시 dynamic import)
// 카탈로그: /data/ai-agents*.json (정적, 항상 로드)
// 실행: POST /ai/agent/run → Cloudflare Worker (DeepSeek 키 서버사이드 보관)

const CATALOG_URLS = ['/data/ai-agents.json', '/data/ai-agents-product.json'];
const WORKER_URL = 'https://snuhmate-ai-gateway.kgh1379.workers.dev';

let _catalog = null;
let _activeAgentId = null;
let _activeAgent = null;

// ── 초기화 (idempotent) ────────────────────────────────────────
export async function initAIGallery() {
  if (document.getElementById('aiAgentGrid')?._inited) return;
  const grid = document.getElementById('aiAgentGrid');
  if (!grid) return;
  grid._inited = true;

  await _fetchAndRender();
  _bindFilter();
  _bindRunPanel();
}

// ── 카탈로그 fetch (정적 JSON — 서버 없어도 항상 동작) ───────────
async function _fetchAndRender() {
  const grid = document.getElementById('aiAgentGrid');
  try {
    const catalogs = await Promise.all(CATALOG_URLS.map(async url => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
      return res.json();
    }));
    _catalog = _visibleCatalog(catalogs.flat());
    _renderChips(_catalog);
    _renderCards(_catalog);
  } catch (e) {
    grid.replaceChildren();
    const wrap = _el('div', 'col-span-full text-center p-6');
    const icon = _el('div', 'text-3xl mb-2');
    icon.textContent = '⚠️';
    const msg = _el('div', 'text-brand-text-muted text-sm');
    msg.textContent = '에이전트 목록을 불러올 수 없습니다.';
    wrap.appendChild(icon);
    wrap.appendChild(msg);
    grid.appendChild(wrap);
  }
}

// ── 카테고리 칩 렌더 ───────────────────────────────────────────
function _renderChips(catalog) {
  const wrap = document.getElementById('aiCategoryChips');
  if (!wrap) return;
  const cats = ['전체', ...new Set(catalog.map(a => a.category))];
  wrap.replaceChildren();
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'ai-chip' + (cat === '전체' ? ' active' : '');
    btn.dataset.cat = cat === '전체' ? 'all' : cat;
    btn.type = 'button';
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.ai-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      _applyFilter();
    });
    wrap.appendChild(btn);
  });
}

// ── 카드 렌더 (DOM API 사용 — XSS 방지) ─────────────────────────
function _renderCards(agents) {
  const grid = document.getElementById('aiAgentGrid');
  if (!grid) return;
  grid.replaceChildren();

  if (!agents.length) {
    const p = _el('p', 'col-span-full text-center text-brand-text-muted p-6');
    p.textContent = '검색 결과가 없습니다.';
    grid.appendChild(p);
    return;
  }

  agents.forEach(agent => {
    const card = _el('div', 'ai-agent-card');
    card.dataset.agentId = agent.id;

    // 헤더 (아이콘 + 이름)
    const header = _el('div', 'ai-agent-card-header');
    const icon = _el('span', 'ai-agent-icon');
    icon.textContent = agent.icon;
    const name = _el('span', 'ai-agent-name');
    name.textContent = agent.name;
    header.appendChild(icon);
    header.appendChild(name);

    // 태그
    const meta = _el('div', 'ai-agent-meta');
    [agent.category, ...(agent.personas || [])].forEach(tag => {
      const span = _el('span', 'ai-agent-tag');
      span.textContent = tag;
      meta.appendChild(span);
    });

    // 예상 소요 시간
    const est = _el('div', 'ai-agent-est');
    est.textContent = `⏱ 약 ${agent.estimated_seconds}초`;

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(est);
    card.addEventListener('click', () => _openRunPanel(agent));
    grid.appendChild(card);
  });
}

// ── 필터 ──────────────────────────────────────────────────────
function _bindFilter() {
  document.getElementById('aiSearch')?.addEventListener('input', _applyFilter);
}

function _applyFilter() {
  if (!_catalog) return;
  const activeCat = document.querySelector('.ai-chip.active')?.dataset.cat || 'all';
  const query = (document.getElementById('aiSearch')?.value || '').trim().toLowerCase();
  const filtered = _catalog.filter(a => {
    const catMatch = activeCat === 'all' || a.category === activeCat;
    const textMatch = !query ||
      a.name.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query) ||
      (a.personas || []).some(p => p.toLowerCase().includes(query)) ||
      String(a.framework || '').toLowerCase().includes(query);
    return catMatch && textMatch;
  });
  _renderCards(filtered);
}

// ── 실행 패널 ─────────────────────────────────────────────────
function _bindRunPanel() {
  document.getElementById('aiRunClose')?.addEventListener('click', _closeRunPanel);
  document.getElementById('aiRunForm')?.addEventListener('submit', _onSubmit);
  document.getElementById('aiCopyBtn')?.addEventListener('click', _onCopy);
}

function _openRunPanel(agent) {
  _activeAgentId = agent.id;
  _activeAgent = agent;
  const panel = document.getElementById('aiRunPanel');
  const titleEl = document.getElementById('aiRunTitle');
  const inputsWrap = document.getElementById('aiRunInputs');
  const outputWrap = document.getElementById('aiOutputWrap');
  const output = document.getElementById('aiOutput');

  titleEl.textContent = `${agent.icon} ${agent.name}`;
  outputWrap.style.display = 'none';
  output.textContent = '';
  output.classList.remove('streaming');

  inputsWrap.replaceChildren();
  (agent.inputs || []).forEach(inp => {
    const label = document.createElement('label');
    label.className = 'flex flex-col gap-1';

    const labelText = _el('span', 'text-sm font-medium text-brand-body-normal');
    labelText.textContent = inp.label;
    if (inp.required) {
      const star = _el('span', 'text-red-500');
      star.textContent = ' *';
      labelText.appendChild(star);
    }
    label.appendChild(labelText);

    let field;
    if (inp.type === 'textarea') {
      field = document.createElement('textarea');
      field.rows = 4;
      field.className = 'w-full p-2 rounded-md border border-brand-text-muted text-brand-body-normal text-sm resize-y';
    } else if (inp.type === 'select') {
      field = document.createElement('select');
      field.className = 'w-full p-2 rounded-md border border-brand-text-muted text-brand-body-normal text-sm bg-white';
      (inp.options || []).forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        field.appendChild(o);
      });
    } else {
      field = document.createElement('input');
      field.type = 'text';
      field.className = 'w-full p-2 rounded-md border border-brand-text-muted text-brand-body-normal text-sm';
    }

    field.name = inp.id;
    field.id = `ai-input-${inp.id}`;
    if (inp.placeholder) field.placeholder = inp.placeholder;
    if (inp.required) field.required = true;

    label.appendChild(field);
    inputsWrap.appendChild(label);
  });

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function _closeRunPanel() {
  document.getElementById('aiRunPanel').style.display = 'none';
  _activeAgentId = null;
  _activeAgent = null;
}

async function _onSubmit(e) {
  e.preventDefault();
  if (!_activeAgentId) return;

  const form = document.getElementById('aiRunForm');
  const btn = document.getElementById('aiRunBtn');
  const outputWrap = document.getElementById('aiOutputWrap');
  const output = document.getElementById('aiOutput');

  const inputs = {};
  new FormData(form).forEach((val, key) => { inputs[key] = String(val); });

  btn.disabled = true;
  btn.textContent = '실행 중…';
  output.textContent = '';
  output.classList.add('streaming');
  outputWrap.style.display = 'block';
  output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    const headers = { 'Content-Type': 'application/json' };
    const adminToken = _activeAgent?.requires_admin ? _adminToken() : '';
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const res = await fetch(`${WORKER_URL}/ai/agent/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ agent_id: _activeAgentId, inputs }),
    });

    if (!res.ok) {
      const err = await res.text();
      output.textContent = `오류: ${err}`;
      output.classList.remove('streaming');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const chunk = line.slice(6);
        if (chunk === '[DONE]') break;
        output.textContent += _decodeSseChunk(chunk);
      }
    }
  } catch (err) {
    output.textContent = `연결 오류: ${err.message}`;
  } finally {
    output.classList.remove('streaming');
    btn.disabled = false;
    btn.textContent = '✨ 실행';
  }
}

function _onCopy() {
  const text = document.getElementById('aiOutput')?.textContent || '';
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('aiCopyBtn');
    btn.textContent = '복사됨 ✓';
    setTimeout(() => { btn.textContent = '복사'; }, 1500);
  });
}

function _el(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function _visibleCatalog(catalog) {
  const adminMode = _isAdminMode();
  return catalog.filter(agent => agent.audience !== 'admin' || adminMode);
}

function _isAdminMode() {
  try {
    return sessionStorage.getItem('snuhmate_admin_mode') === '1' ||
      localStorage.getItem('snuhmate_admin_mode') === '1' ||
      new URLSearchParams(window.location.search).get('aiAdmin') === '1';
  } catch {
    return false;
  }
}

function _adminToken() {
  try {
    return sessionStorage.getItem('snuhmate_admin_token') || '';
  } catch {
    return '';
  }
}

function _decodeSseChunk(chunk) {
  try {
    return JSON.parse(chunk);
  } catch {
    return chunk;
  }
}
