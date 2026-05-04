// life-event.js — Plan dazzling-booping-kettle Track B
// 생활이벤트 탭의 카드 렌더 + 카테고리/검색 필터 + mailto 빌더 + 체크리스트 localStorage.
// 진입: window.initLifeEventFragment() — app.js switchTab('lifeEvent') 가 호출.

const ACTIONS_URL = '/data/regulation-actions.json';
const ARTICLES_URL = '/data/union_regulation_2026.json';

let _state = {
  actions: null,
  articlesById: null,
  filterCategory: 'all',
  searchTerm: '',
  initialized: false,
};

async function loadDataOnce() {
  if (_state.actions && _state.articlesById) return;
  const [actionsRes, articlesRes] = await Promise.all([
    fetch(ACTIONS_URL).then((r) => r.json()),
    fetch(ARTICLES_URL).then((r) => r.json()),
  ]);
  _state.actions = actionsRes;
  _state.articlesById = new Map(articlesRes.map((a) => [a.id, a]));
}

function loadProfile() {
  // 프로필 우선순위: snuhmate_hr_profile_uid_<uid> > snuhmate_hr_profile_guest > snuhmate_hr_profile
  const uid = window.__firebaseUid;
  const keys = [
    uid ? `snuhmate_hr_profile_uid_${uid}` : 'snuhmate_hr_profile_guest',
    'snuhmate_hr_profile_guest',
    'snuhmate_hr_profile',
  ];
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) return JSON.parse(raw) || {};
    } catch {}
  }
  return {};
}

/**
 * mailto: URL 빌더 — email_template 의 {{employeeName}}, {{employeeId}}, {{department}} 등을 치환.
 * @param {object} event — regulation-actions.json 의 event row
 * @param {object} profile — { name, employeeId, department, ... }
 * @returns {string} mailto: URL (subject·body URL-encoded)
 */
export function buildMailto(event, profile) {
  if (!event || !event.email_template) return '';
  const tpl = event.email_template;
  const map = {
    employeeName: (profile && (profile.name || profile.employeeName)) || '[이름]',
    employeeId: (profile && (profile.employeeId || profile.staffId)) || '[사번]',
    department: (profile && (profile.department || profile.dept)) || '[부서]',
  };
  const sub = String(tpl.subject || '').replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] || '');
  const body = String(tpl.body || '').replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] || '');
  const params = new URLSearchParams();
  params.set('subject', sub);
  params.set('body', body);
  // mailto: 는 query string 의 + 인코딩이 일부 클라이언트에서 처리 안되므로 %20 으로 보정
  const qs = params.toString().replace(/\+/g, '%20');
  return `mailto:${tpl.to}?${qs}`;
}

function renderCategoryChips() {
  const wrap = document.getElementById('lifeEventCategoryChips');
  if (!wrap || !_state.actions) return;
  const existing = wrap.querySelectorAll('[data-cat]:not([data-cat="all"])');
  existing.forEach((el) => el.remove());
  const cats = [..._state.actions.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const c of cats) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'le-chip';
    btn.dataset.cat = c.id;
    btn.textContent = `${c.icon || ''} ${c.label}`;
    wrap.appendChild(btn);
  }
}

function applyChipActiveState() {
  const chips = document.querySelectorAll('#lifeEventCategoryChips .le-chip');
  chips.forEach((chip) => {
    const isActive = (chip.dataset.cat || 'all') === _state.filterCategory;
    chip.classList.toggle('active', isActive);
  });
}

function matchesSearch(event, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  if (event.title && event.title.toLowerCase().includes(t)) return true;
  for (const aid of event.regulation_articles) {
    if (aid.toLowerCase().includes(t)) return true;
    const art = _state.articlesById.get(aid);
    if (art && art.title && art.title.toLowerCase().includes(t)) return true;
  }
  if (event.leave && event.leave.article && event.leave.article.toLowerCase().includes(t)) return true;
  if (event.monetary && event.monetary.article && event.monetary.article.toLowerCase().includes(t)) return true;
  return false;
}

function fmtMoney(n) {
  if (typeof n !== 'number') return '';
  return n.toLocaleString('ko-KR') + '원';
}

function renderRegQuote(articleIds) {
  const lines = [];
  for (const aid of articleIds) {
    const art = _state.articlesById.get(aid);
    if (!art) continue;
    const body = (art.content || '').trim();
    const clauses = (art.clauses || []).join('\n');
    const text = body + (body && clauses ? '\n' : '') + clauses;
    lines.push(`【${art.title}】\n${text}`);
  }
  return lines.join('\n\n') || '(인용 가능한 단협 본문 없음 — 별첨/인사팀 안내 참조)';
}

function renderCard(event) {
  const card = document.createElement('article');
  card.className = 'life-event-card';
  card.dataset.eventId = event.event_id;
  card.dataset.cat = event.category;

  const cat = _state.actions.categories.find((c) => c.id === event.category);
  const catLabel = cat ? `${cat.icon || ''} ${cat.label}` : event.category;

  // header
  const header = document.createElement('header');
  const h3 = document.createElement('h3');
  h3.textContent = event.title;
  const catEl = document.createElement('span');
  catEl.className = 'cat';
  catEl.textContent = catLabel;
  header.appendChild(h3);
  header.appendChild(catEl);
  card.appendChild(header);

  // summary chips
  if (event.leave || event.monetary) {
    const sum = document.createElement('section');
    sum.className = 'summary';
    if (event.leave && event.leave.days) {
      const span = document.createElement('span');
      span.textContent = `${event.leave.kind || '휴가'} ${event.leave.days}일${event.leave.article ? ` (${event.leave.article})` : ''}`;
      sum.appendChild(span);
    }
    if (event.leave && !event.leave.days && event.leave.kind) {
      const span = document.createElement('span');
      span.textContent = `${event.leave.kind}${event.leave.article ? ` (${event.leave.article})` : ''}`;
      sum.appendChild(span);
    }
    if (event.monetary && event.monetary.amount) {
      const span = document.createElement('span');
      span.textContent = `${event.monetary.label || '경조금'} ${fmtMoney(event.monetary.amount)}`;
      sum.appendChild(span);
    }
    card.appendChild(sum);
  }

  // 규정 인용
  const det = document.createElement('details');
  const sumEl = document.createElement('summary');
  sumEl.textContent = `📜 단협 원문 (${event.regulation_articles.join(', ')})`;
  det.appendChild(sumEl);
  const quote = document.createElement('div');
  quote.className = 'reg-quote';
  quote.textContent = renderRegQuote(event.regulation_articles);
  det.appendChild(quote);
  card.appendChild(det);

  // 서류 체크리스트
  if (event.documents_required && event.documents_required.length) {
    const docs = document.createElement('section');
    docs.className = 'docs';
    const h4 = document.createElement('h4');
    h4.textContent = '📋 필요 서류';
    docs.appendChild(h4);
    const ul = document.createElement('ul');
    const lsKey = `snuhmate_lifeEvent_${event.event_id}_docs`;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(lsKey) || '{}'); } catch {}
    for (const doc of event.documents_required) {
      const li = document.createElement('li');
      const lbl = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.doc = doc.name;
      cb.checked = !!saved[doc.name];
      cb.addEventListener('change', () => {
        try {
          const cur = JSON.parse(localStorage.getItem(lsKey) || '{}');
          cur[doc.name] = cb.checked;
          localStorage.setItem(lsKey, JSON.stringify(cur));
        } catch {}
      });
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(' ' + doc.name + (doc.issuer ? ` (${doc.issuer})` : '')));
      li.appendChild(lbl);
      if (doc.url) {
        const a = document.createElement('a');
        a.href = doc.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = '발급 링크';
        li.appendChild(a);
      }
      ul.appendChild(li);
    }
    docs.appendChild(ul);
    card.appendChild(docs);
  }

  // 절차
  if (event.procedure_steps && event.procedure_steps.length) {
    const steps = document.createElement('section');
    steps.className = 'steps';
    const h4 = document.createElement('h4');
    h4.textContent = '🔁 절차';
    steps.appendChild(h4);
    const ol = document.createElement('ol');
    for (const s of event.procedure_steps) {
      const li = document.createElement('li');
      li.textContent = s;
      ol.appendChild(li);
    }
    steps.appendChild(ol);
    card.appendChild(steps);
  }

  // 연락처
  if (event.contacts && event.contacts.length) {
    const con = document.createElement('section');
    con.className = 'contacts';
    const h4 = document.createElement('h4');
    h4.textContent = '📞 연락처';
    con.appendChild(h4);
    for (const c of event.contacts) {
      const row = document.createElement('div');
      row.className = 'contact-row';
      const dept = document.createElement('strong');
      dept.textContent = c.dept;
      row.appendChild(dept);
      if (c.phone) {
        const a = document.createElement('a');
        a.href = `tel:${c.phone}`;
        a.textContent = `📞 ${c.phone}`;
        row.appendChild(a);
      }
      if (c.email) {
        const a = document.createElement('a');
        a.href = `mailto:${c.email}`;
        a.textContent = `✉️ ${c.email}`;
        row.appendChild(a);
      }
      if (c.hours) {
        const span = document.createElement('span');
        span.textContent = c.hours;
        span.style.color = 'var(--text-muted, #888)';
        row.appendChild(span);
      }
      con.appendChild(row);
    }
    card.appendChild(con);
  }

  // 액션 (mailto, calc-link)
  const actions = document.createElement('section');
  actions.className = 'actions';
  if (event.email_template) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-mailto';
    btn.textContent = '📧 인사팀 이메일 작성';
    btn.dataset.eventId = event.event_id;
    btn.addEventListener('click', () => {
      const profile = loadProfile();
      const url = buildMailto(event, profile);
      if (!url) return;
      if (!profile || !profile.name) {
        if (window.alert) {
          window.alert('개인정보 탭에서 이름·사번·부서를 입력하면 이메일이 자동으로 채워집니다. 지금은 [이름] 등 placeholder 가 들어가 있습니다.');
        }
      }
      window.location.href = url;
    });
    actions.appendChild(btn);
  }
  if (event.calc_links && event.calc_links.length) {
    for (const link of event.calc_links) {
      const a = document.createElement('a');
      a.className = 'btn-link';
      a.href = link.startsWith('?') ? `/app${link}` : link;
      a.textContent = '관련 계산기 →';
      actions.appendChild(a);
    }
  }
  if (actions.children.length > 0) card.appendChild(actions);

  return card;
}

function renderGrid() {
  const grid = document.getElementById('lifeEventGrid');
  if (!grid || !_state.actions) return;
  grid.textContent = '';
  const events = _state.actions.events.filter((ev) => {
    if (_state.filterCategory !== 'all' && ev.category !== _state.filterCategory) return false;
    if (!matchesSearch(ev, _state.searchTerm)) return false;
    return true;
  });
  if (events.length === 0) {
    const p = document.createElement('p');
    p.className = 'text-brand-text-muted text-center p-6';
    p.textContent = '검색 결과 없음.';
    grid.appendChild(p);
    return;
  }
  for (const ev of events) grid.appendChild(renderCard(ev));

  // URL ?event=xxx deep-link → expand + scroll
  const url = new URL(window.location.href);
  const evParam = url.searchParams.get('event');
  if (evParam) {
    const target = grid.querySelector(`[data-event-id="${evParam}"]`);
    if (target) {
      target.dataset.expanded = 'true';
      const det = target.querySelector('details');
      if (det) det.open = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function bindFilters() {
  const chipsWrap = document.getElementById('lifeEventCategoryChips');
  const search = document.getElementById('lifeEventSearch');
  if (chipsWrap && !chipsWrap.dataset.bound) {
    chipsWrap.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const chip = target.closest('.le-chip');
      if (!chip) return;
      _state.filterCategory = chip.dataset.cat || 'all';
      applyChipActiveState();
      renderGrid();
    });
    chipsWrap.dataset.bound = '1';
  }
  if (search && !search.dataset.bound) {
    let timer;
    search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        _state.searchTerm = String(search.value || '').trim();
        renderGrid();
      }, 180);
    });
    search.dataset.bound = '1';
  }
}

export async function initLifeEventFragment() {
  if (_state.initialized) {
    renderGrid();
    return;
  }
  await loadDataOnce();
  renderCategoryChips();
  bindFilters();
  applyChipActiveState();
  renderGrid();
  _state.initialized = true;
}

if (typeof window !== 'undefined') {
  window.initLifeEventFragment = initLifeEventFragment;
  window.buildLifeEventMailto = buildMailto;
}
