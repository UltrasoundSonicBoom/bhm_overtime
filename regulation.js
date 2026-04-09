/* ============================================
   regulation.js — 규정/상담 페이지 로직
   ============================================ */

// ── Sub-tab 전환 ──
document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('#regSubTabs .sub-tab');
  const tabContents = document.querySelectorAll('.sub-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.subtab;

      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabContents.forEach(c => c.classList.remove('active'));
      const targetEl = document.getElementById(`subtab-${target}`);
      if (targetEl) targetEl.classList.add('active');
    });
  });

  // URL hash로 서브탭 직접 진입 지원
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const matchBtn = document.querySelector(`#regSubTabs .sub-tab[data-subtab="${hash}"]`);
    if (matchBtn) matchBtn.click();
  }

  initTheme();
  renderWikiToc();
  initChat();
  initFaq();
});

// ── 테마 토글 (index.html과 동일한 로직) ──
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'neo' ? '' : 'neo';
  html.setAttribute('data-theme', next);
  localStorage.setItem('snuhmate-theme', next);
}

function initTheme() {
  const saved = localStorage.getItem('snuhmate-theme');
  if (saved !== null) {
    document.documentElement.setAttribute('data-theme', saved);
  }
}

// ═══════════ 📖 규정 위키 ═══════════
// Note: DATA.handbook is a trusted internal data source (hardcoded in data.js),
// not user-supplied input. innerHTML usage matches existing app.js patterns.

function renderWikiToc() {
  const toc = document.getElementById('wikiToc');
  if (!toc || !DATA.handbook) return;
  let html = '';
  DATA.handbook.forEach((section, idx) => {
    const count = section.articles.length;
    html += `<div class="wiki-toc-item" onclick="showWikiCategory(${idx})" style="
      padding:10px 12px; margin-bottom:4px; border-radius:6px; cursor:pointer;
      display:flex; align-items:center; justify-content:space-between;
      transition:background 0.2s;
    " onmouseover="this.style.background='rgba(99,102,241,0.1)'" onmouseout="this.style.background='transparent'">
      <span>${section.icon} ${section.category}</span>
      <span class="badge" style="font-size:var(--text-label-small);">${count}</span>
    </div>`;
  });
  toc.innerHTML = html;
}

function showWikiCategory(categoryIdx) {
  const section = DATA.handbook[categoryIdx];
  if (!section) return;
  const container = document.getElementById('wikiContent');

  let html = `<div class="card">
    <div class="card-title" style="font-size:var(--text-title-large);">
      <span>${section.icon}</span> ${section.category}
      <span class="badge indigo">${section.articles.length}개 항목</span>
    </div>`;

  section.articles.forEach(article => {
    const bodyHtml = article.body.replace(/\n/g, '<br>').replace(/• /g, '<span style="color:var(--accent-indigo)">•</span> ');
    html += `<div class="wiki-article" style="
      margin-bottom:12px; padding:12px 14px; border-radius:8px;
      border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02);
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <strong style="font-size:var(--text-body-large); color:var(--text-primary);">${article.title}</strong>
        <span style="font-size:var(--text-label-small); padding:2px 8px; border-radius:4px; background:rgba(99,102,241,0.1); color:var(--accent-indigo);">📌 ${article.ref}</span>
      </div>
      <div style="font-size:var(--text-body-large); line-height:1.7; color:var(--text-secondary);">${bodyHtml}</div>
    </div>`;
  });

  html += '</div>';
  container.innerHTML = html;

  document.querySelectorAll('.wiki-toc-item').forEach((el, i) => {
    el.style.background = i === categoryIdx ? 'rgba(99,102,241,0.12)' : 'transparent';
    el.style.borderLeft = i === categoryIdx ? '3px solid var(--accent-indigo)' : '3px solid transparent';
  });
}

function searchHandbook() {
  const query = document.getElementById('wikiSearch').value.trim().toLowerCase();
  const countEl = document.getElementById('wikiSearchCount');
  const container = document.getElementById('wikiContent');

  if (!query) {
    countEl.style.display = 'none';
    container.innerHTML = `<div class="card" style="text-align:center; padding:40px 20px; color:var(--text-muted);">
      <div style="font-size:var(--text-amount-huge); margin-bottom:12px;">📖</div>
      좌측 목차에서 카테고리를 선택하거나,<br>상단 검색창에 키워드를 입력하세요.
    </div>`;
    document.querySelectorAll('.wiki-toc-item').forEach(el => {
      el.style.background = 'transparent';
      el.style.borderLeft = '3px solid transparent';
    });
    return;
  }

  let results = [];
  DATA.handbook.forEach(section => {
    section.articles.forEach(article => {
      const inTitle = article.title.toLowerCase().includes(query);
      const inBody = article.body.toLowerCase().includes(query);
      const inRef = article.ref.toLowerCase().includes(query);
      if (inTitle || inBody || inRef) {
        results.push({ ...article, categoryIcon: section.icon, category: section.category });
      }
    });
  });

  countEl.textContent = `${results.length}개 결과`;
  countEl.style.display = 'block';

  if (results.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:30px; color:var(--text-muted);">
      검색 결과가 없습니다. 다른 키워드로 검색해보세요.
    </div>`;
    return;
  }

  const highlightRe = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  let html = '';
  results.forEach(article => {
    let bodyHtml = article.body.replace(/\n/g, '<br>').replace(/• /g, '<span style="color:var(--accent-indigo)">•</span> ');
    bodyHtml = bodyHtml.replace(highlightRe, '<mark style="background:rgba(251,191,36,0.3); color:var(--text-primary); padding:0 2px; border-radius:2px;">$1</mark>');
    const titleHtml = article.title.replace(highlightRe, '<mark style="background:rgba(251,191,36,0.3); color:var(--text-primary); padding:0 2px; border-radius:2px;">$1</mark>');

    html += `<div class="card" style="margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <strong style="font-size:var(--text-body-large);">${article.categoryIcon} ${titleHtml}</strong>
        <span style="font-size:var(--text-label-small); padding:2px 8px; border-radius:4px; background:rgba(99,102,241,0.1); color:var(--accent-indigo);">📌 ${article.ref}</span>
      </div>
      <div style="font-size:var(--text-label-small); color:var(--text-muted); margin-bottom:6px;">${article.category}</div>
      <div style="font-size:var(--text-body-large); line-height:1.7; color:var(--text-secondary);">${bodyHtml}</div>
    </div>`;
  });
  container.innerHTML = html;
}

function clearWikiSearch() {
  document.getElementById('wikiSearch').value = '';
  searchHandbook();
}

// ═══════════ 📄 PDF 뷰어 ═══════════

let pdfDoc = null;
let pdfCurrentPage = 1;
let pdfScale = 1.0;

function loadSelectedPdf() {
  const select = document.getElementById('pdfSelect');
  if (!select) return;
  loadPdf(select.value);
}

async function loadPdf(url) {
  if (typeof pdfjsLib === 'undefined') {
    alert('PDF.js 라이브러리가 로드되지 않았습니다.');
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  try {
    pdfDoc = await pdfjsLib.getDocument(url).promise;
    pdfCurrentPage = 1;
    pdfScale = 1.0;

    document.getElementById('pdfControls').style.display = 'block';
    document.getElementById('pdfPlaceholder').style.display = 'none';

    renderPdfPage();
  } catch (err) {
    alert('PDF 로드 실패: ' + err.message);
  }
}

async function renderPdfPage() {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(pdfCurrentPage);
  const canvas = document.getElementById('pdfCanvas');
  const ctx = canvas.getContext('2d');

  const viewport = page.getViewport({ scale: pdfScale });
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: ctx, viewport }).promise;

  document.getElementById('pdfPageInfo').textContent = `${pdfCurrentPage} / ${pdfDoc.numPages}`;
  document.getElementById('pdfZoomInfo').textContent = `${Math.round(pdfScale * 100)}%`;
}

function pdfPrevPage() {
  if (pdfCurrentPage <= 1) return;
  pdfCurrentPage--;
  renderPdfPage();
}

function pdfNextPage() {
  if (!pdfDoc || pdfCurrentPage >= pdfDoc.numPages) return;
  pdfCurrentPage++;
  renderPdfPage();
}

function pdfZoom(delta) {
  pdfScale = Math.max(0.5, Math.min(3.0, pdfScale + delta));
  renderPdfPage();
}

function pdfFitWidth() {
  if (!pdfDoc) return;
  pdfDoc.getPage(pdfCurrentPage).then(page => {
    const containerWidth = document.getElementById('pdfCanvasContainer').clientWidth - 32;
    const viewport = page.getViewport({ scale: 1.0 });
    pdfScale = containerWidth / viewport.width;
    renderPdfPage();
  });
}

// ═══════════ 💬 AI 챗봇 ═══════════
// Uses RAG API with local searchChat() fallback when API is unavailable.

const API_BASE = '/api';
let chatSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── 챗봇 초기화 ──
function initChat() {
  const sendBtn = document.getElementById('chatSend');
  const input = document.getElementById('chatInput');
  if (!sendBtn || !input) return;

  sendBtn.addEventListener('click', handleChat);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChat();
  });

  renderChatQuickTags();
}

function renderChatQuickTags() {
  const container = document.getElementById('chatQuickTags');
  if (!container || !DATA.faq) return;
  const categories = [...new Set(DATA.faq.map(f => f.category))];
  categories.forEach(cat => {
    const tag = document.createElement('button');
    tag.className = 'quick-tag';
    tag.textContent = cat;
    tag.onclick = () => {
      addChatMessage(cat, 'user');
      handleChatQuery(cat);
    };
    container.appendChild(tag);
  });
}

// ── 메시지 추가 (trusted internal data only) ──
function addChatMessage(text, type, sources) {
  const container = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = `chat-msg ${type}`;

  if (type === 'user') {
    msg.textContent = text;
  } else {
    msg.innerHTML = text;
    if (sources && sources.length > 0) {
      const refHtml = sources.map(s =>
        `<span class="ref">${s.ref ? '📌 ' + s.ref : s.title}</span>`
      ).join(' ');
      msg.innerHTML += refHtml;
    }
  }

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function addTypingIndicator() {
  const container = document.getElementById('chatMessages');
  const indicator = document.createElement('div');
  indicator.className = 'chat-msg bot';
  indicator.id = 'typingIndicator';
  indicator.style.opacity = '0.6';
  indicator.textContent = '답변 생성 중...';
  container.appendChild(indicator);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

async function handleChat() {
  const input = document.getElementById('chatInput');
  const query = input.value.trim();
  if (!query) return;

  addChatMessage(query, 'user');
  input.value = '';

  await handleChatQuery(query);
}

async function handleChatQuery(query) {
  addTypingIndicator();

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query, sessionId: chatSessionId }),
    });

    removeTypingIndicator();

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const answerHtml = data.answer.replace(/\n/g, '<br>');
    addChatMessage(answerHtml, 'bot', data.sources);

    if (data.isFaqMatch) {
      addChatMessage(
        '<small style="color:var(--text-muted);">FAQ에서 직접 매칭된 답변입니다.</small>',
        'bot'
      );
    }
  } catch (err) {
    removeTypingIndicator();
    // Fallback to local search
    const result = searchChatLocal(query);
    if (result) {
      let html = '';
      if (result.faq) {
        html += `<div style="margin-bottom:6px;">${result.faq.a}</div>`;
      }
      if (result.handbook.length > 0) {
        html += renderHandbookSource(result.handbook);
      }
      const ref = result.faq ? result.faq.ref : (result.handbook[0] ? result.handbook[0].ref : null);
      const sources = ref ? [{ ref, title: '' }] : [];
      addChatMessage(html, 'bot', sources);
      addChatMessage(
        '<small style="color:var(--text-muted);">* AI 서버에 연결할 수 없어 로컬 검색 결과입니다.</small>',
        'bot'
      );
    } else {
      addChatMessage(
        '해당 질문에 대한 답변을 찾지 못했습니다.<br>' +
        '<small style="color:var(--text-muted)">더 구체적인 키워드로 검색해보세요. 예: "온콜", "연차", "야간", "가족수당"</small>',
        'bot'
      );
    }
  }
}

// ── 로컬 챗봇 검색 (API 실패 시 fallback) ──
const CHAT_ALIASES = {
  '온콜': ['on-call', '호출', '대기', '콜'],
  '연차': ['연가', '연차', '쉬는날', '몇일'],
  '야간': ['밤번', 'night', '밤', '나이트'],
  '급여': ['월급', '봉급', '급료', '임금', '페이'],
  '퇴직': ['퇴사', '이직', '그만'],
  '승진': ['승격', '진급', '승급'],
  '출산': ['임신', '육아', '아기', '아이'],
  '수당': ['보조', '지원', '얼마'],
  '감면': ['할인', '진료비', '병원비'],
  '경조': ['돌아가', '사망', '장례', '조문', '결혼', '입양', '화환', '조의', '장의', '부의', '축의'],
  '할머니': ['조부모', '외조부모', '할아버지', '외할머니', '외할아버지'],
  '형제': ['형', '오빠', '언니', '누나', '동생', '자매', '남매'],
  '부모': ['아버지', '어머니', '아빠', '엄마', '시어머니', '시아버지', '장인', '장모'],
  '자녀': ['아들', '딸', '아이', '자식'],
  '검진': ['건강검진', '검사'],
  '헌혈': ['피', '혈액'],
  '교육': ['연수', '학회', '방사선', '보수교육'],
  '돌봄': ['간병', '가족돌봄', '간호'],
  '복지': ['포인트', '복지포인트', '어린이집'],
  '통상임금': ['시급', '임금', '통상'],
  '호봉': ['승급', '연봉']
};

const CHAT_CATEGORY_MAP = {
  '연차': '연차·휴가', '휴가': '연차·휴가', '연가': '연차·휴가', '쉬는날': '연차·휴가',
  '온콜': '온콜', '호출': '온콜', '대기수당': '온콜',
  '야간': '근로시간', '밤번': '근로시간', '리커버리': '근로시간',
  '경조': '청원·경조', '결혼': '청원·경조', '사망': '청원·경조', '돌아가': '청원·경조', '장례': '청원·경조',
  '수당': '임금·수당', '급여': '임금·수당', '월급': '임금·수당', '통상임금': '임금·수당', '가족수당': '임금·수당',
  '승진': '승진', '승격': '승진', '호봉': '승진',
  '휴직': '휴직', '육아휴직': '휴직', '질병휴직': '휴직',
  '출산': '연차·휴가', '임신': '연차·휴가',
  '복지': '복지', '감면': '복지', '진료비': '복지', '어린이집': '복지', '복지포인트': '복지',
  '근로시간': '근로시간', '근무시간': '근로시간', '시간외': '근로시간'
};

function searchChatLocal(query) {
  query = query.toLowerCase().trim();
  if (!query || !DATA.faq) return null;

  const qWords = query.split(/\s+/);

  let mappedCategory = null;
  for (const word of qWords) {
    if (CHAT_CATEGORY_MAP[word]) { mappedCategory = CHAT_CATEGORY_MAP[word]; break; }
  }
  if (!mappedCategory) {
    for (const [key, words] of Object.entries(CHAT_ALIASES)) {
      if (query.includes(key) || words.some(w => query.includes(w))) {
        if (CHAT_CATEGORY_MAP[key]) { mappedCategory = CHAT_CATEGORY_MAP[key]; break; }
      }
    }
  }

  const scored = DATA.faq.map(item => {
    let score = 0;
    const qLower = item.q.toLowerCase();
    const aLower = item.a.toLowerCase();
    qWords.forEach(w => {
      if (qLower.includes(w)) score += 5;
      if (aLower.includes(w)) score += 1;
    });
    Object.entries(CHAT_ALIASES).forEach(([key, words]) => {
      const queryHasKey = query.includes(key) || words.some(w => query.includes(w));
      if (queryHasKey && (qLower.includes(key) || aLower.includes(key))) score += 3;
    });
    if (mappedCategory && item.category === mappedCategory) score += 2;
    return { ...item, score };
  });

  const best = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score)[0];

  let handbookArticles = [];
  if (mappedCategory && DATA.handbook) {
    const section = DATA.handbook.find(h => h.category === mappedCategory);
    if (section) {
      const articleScores = section.articles.map(art => {
        let s = 0;
        const tLower = art.title.toLowerCase();
        const bLower = art.body.toLowerCase();
        qWords.forEach(w => { if (tLower.includes(w)) s += 5; if (bLower.includes(w)) s += 1; });
        return { ...art, score: s };
      });
      const sorted = articleScores.sort((a, b) => b.score - a.score);
      if (qWords.length >= 2 && sorted[0] && sorted[0].score > 0) {
        handbookArticles = sorted.filter(a => a.score > 0).slice(0, 2);
      } else {
        handbookArticles = sorted;
      }
    }
  }

  if (handbookArticles.length === 0 && best && DATA.handbook) {
    const faqCatMap = {
      '근로시간': '근로시간', '온콜': '온콜', '야간근무': '근로시간',
      '휴가': '연차·휴가', '경조': '청원·경조', '수당': '임금·수당',
      '휴직': '휴직', '승진': '승진', '복지': '복지'
    };
    const hbCat = faqCatMap[best.category];
    if (hbCat) {
      const section = DATA.handbook.find(h => h.category === hbCat);
      if (section) {
        const matched = section.articles.filter(a => best.ref && a.ref.includes(best.ref.split(',')[0].trim()));
        handbookArticles = matched.length > 0 ? matched.slice(0, 2) : [section.articles[0]];
      }
    }
  }

  if (!best && handbookArticles.length === 0) return null;
  return { faq: best || null, handbook: handbookArticles };
}

function renderHandbookSource(articles) {
  if (!articles || articles.length === 0) return '';
  let html = '<div style="margin-top:10px; padding:10px 12px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); border-radius:8px; font-size:var(--text-body-normal);">';
  html += '<div style="font-weight:600; color:var(--accent-indigo); margin-bottom:6px;">📖 규정 원문</div>';
  articles.forEach((art, i) => {
    if (i > 0) html += '<hr style="border:none; border-top:1px solid rgba(99,102,241,0.1); margin:8px 0;">';
    html += `<div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${art.title} <span style="font-weight:400; color:var(--accent-indigo); font-size:var(--text-body-normal);">${art.ref}</span></div>`;
    html += `<div style="color:var(--text-secondary); white-space:pre-line; line-height:1.6;">${art.body}</div>`;
  });
  html += '</div>';
  return html;
}

// ═══════════ ❓ FAQ ═══════════
// Uses API with local DATA.faq fallback.

let faqActiveCategory = null;

function initFaq() {
  const searchBtn = document.getElementById('faqSearchBtn');
  const searchInput = document.getElementById('faqSearchInput');
  if (!searchBtn || !searchInput) return;

  searchBtn.addEventListener('click', () => searchFaq(searchInput.value.trim()));
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchFaq(searchInput.value.trim());
  });

  renderFaqCategories();
  // Start with first category selected instead of all 50 items
  if (DATA.faq) {
    const categories = [...new Set(DATA.faq.map(f => f.category))];
    if (categories.length > 0) {
      faqActiveCategory = categories[0];
    }
  }
  renderFaqList();
  updateFaqCategoryActive();
}

function renderFaqCategories() {
  const container = document.getElementById('faqCategoryTags');
  if (!container || !DATA.faq) return;

  const categories = [...new Set(DATA.faq.map(f => f.category))];

  // "전체" 태그
  const allTag = document.createElement('button');
  allTag.className = 'quick-tag';
  allTag.textContent = '전체';
  allTag.style.fontWeight = '600';
  allTag.onclick = () => {
    faqActiveCategory = null;
    document.getElementById('faqSearchInput').value = '';
    renderFaqList();
    updateFaqCategoryActive();
  };
  container.appendChild(allTag);

  categories.forEach(cat => {
    const tag = document.createElement('button');
    tag.className = 'quick-tag';
    tag.textContent = cat;
    tag.dataset.category = cat;
    tag.onclick = () => {
      faqActiveCategory = cat;
      document.getElementById('faqSearchInput').value = '';
      renderFaqList();
      updateFaqCategoryActive();
    };
    container.appendChild(tag);
  });
}

function updateFaqCategoryActive() {
  document.querySelectorAll('#faqCategoryTags .quick-tag').forEach(tag => {
    const isActive = (!faqActiveCategory && !tag.dataset.category) ||
                     (tag.dataset.category === faqActiveCategory);
    tag.style.borderColor = isActive ? 'var(--accent-indigo)' : '';
    tag.style.color = isActive ? 'var(--accent-indigo)' : '';
  });
}

function renderFaqList(items) {
  const container = document.getElementById('faqList');
  if (!container) return;

  const faqItems = items || DATA.faq;
  if (!faqItems) return;

  const filtered = faqActiveCategory
    ? faqItems.filter(f => f.category === faqActiveCategory)
    : faqItems;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="card" style="text-align:center; padding:30px; color:var(--text-muted);">검색 결과가 없습니다.</div>';
    return;
  }

  let html = '';
  filtered.forEach((item, idx) => {
    html += `<div class="card" style="margin-bottom:8px; cursor:pointer;" onclick="toggleFaqAnswer(this)">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <div style="flex:1;">
          <div style="font-size:var(--text-body-large); font-weight:600; color:var(--text-primary); margin-bottom:4px;">
            ${item.q}
          </div>
          <span class="badge" style="font-size:var(--text-label-small);">${item.category}</span>
          ${item.ref ? `<span style="font-size:var(--text-label-small); color:var(--accent-indigo); margin-left:8px;">📌 ${item.ref}</span>` : ''}
        </div>
        <span style="color:var(--text-muted); font-size:var(--text-title-large); transition:transform 0.2s;" class="faq-chevron">▸</span>
      </div>
      <div class="faq-answer" style="display:none; margin-top:12px; padding-top:12px; border-top:1px solid var(--border-glass); font-size:var(--text-body-large); line-height:1.7; color:var(--text-secondary);">
        ${item.a}
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

function toggleFaqAnswer(card) {
  const answer = card.querySelector('.faq-answer');
  const chevron = card.querySelector('.faq-chevron');
  if (!answer) return;

  const isOpen = answer.style.display !== 'none';
  answer.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.textContent = isOpen ? '▸' : '▾';
}

async function searchFaq(query) {
  if (!query) {
    renderFaqList();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/faq/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      faqActiveCategory = null;
      updateFaqCategoryActive();
      renderFaqList(data.results.map(r => ({
        q: r.question,
        a: r.answer,
        category: r.category,
        ref: r.articleRef,
      })));
      return;
    }
  } catch (err) {
    // Fallback to local search
  }

  // Local fallback
  const q = query.toLowerCase();
  const localResults = DATA.faq.filter(f =>
    f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) ||
    (f.category && f.category.toLowerCase().includes(q))
  );
  faqActiveCategory = null;
  updateFaqCategoryActive();
  renderFaqList(localResults);
}
