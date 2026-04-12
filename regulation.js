/* ============================================
   regulation.js — 규정/상담 페이지 로직 v3
   2-tab structure: 찾아보기 (FAQ 통합) / 물어보기

   Security note: All innerHTML usage in this file renders content from
   DATA.handbook and DATA.faq — trusted, hardcoded internal data sources
   defined in data.js. No user-supplied content is rendered as HTML.
   This matches the existing pattern used in app.js.
   ============================================ */

// ── handbook 조항 제목 → 계산기 매핑 (FAQ 중간 레이어 제거) ──
var ARTICLE_CALCULATORS = {
  '시간외근무': '시간외근무는 어떻게 계산하나요?',
  '온콜출근 수당': '온콜 출근하면 수당이 얼마인가요?',
  '통상임금 구성': '통상임금이 뭐에요?',
  '가족수당': '가족수당은 얼마인가요?',
  '연차유급휴가': '연차가 몇 일이에요?',
  '장기근속수당': '장기근속수당은?',
  '명절지원비': '명절지원비는 언제?',
  '육아휴직': '육아휴직 급여는?',
  '퇴직수당': '퇴직금은 어떻게 계산하나요?'
};

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSubTabs();
  initBrowse();
  initAsk();
  initPdfSheet();
});

// ═══════════ Sub-tab 전환 ═══════════

function initSubTabs() {
  const tabButtons = document.querySelectorAll('#regSubTabs .reg-bookmark-tab');
  const tabContents = document.querySelectorAll('.sub-content');
  const accent = document.getElementById('regTabAccent');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.subtab;
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabContents.forEach(c => c.classList.remove('active'));
      const targetEl = document.getElementById(`subtab-${target}`);
      if (targetEl) targetEl.classList.add('active');
      // Update accent bar color
      if (accent) {
        accent.className = 'reg-tab-accent ' + target;
      }
    });
  });

  // URL hash로 서브탭 직접 진입
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const matchBtn = document.querySelector(`#regSubTabs .reg-bookmark-tab[data-subtab="${hash}"]`);
    if (matchBtn) matchBtn.click();
  }
}

// ═══════════ 테마 ═══════════

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

// ═══════════ 📖 찾아보기 ═══════════

var browseActiveCategory = null;

// ── PDF page mapping (2026_조합원_수첩_최종파일.pdf) ──
// More specific patterns first; getPdfPageForRef matches the first hit.
var PDF_PAGE_MAP = [
  { pattern: '별도합의 (2015.05)', page: 25 },
  { pattern: '별도합의 (2021.11)', page: 27 },
  { pattern: '별도합의 (2024.11)', page: 37 },
  { pattern: '복무규정 제30조', page: 99 },
  { pattern: '제32조', page: 20 },
  { pattern: '제33조', page: 21 },
  { pattern: '제34조', page: 27 },
  { pattern: '제36조', page: 28 },
  { pattern: '제37조', page: 29 },
  { pattern: '제38조', page: 29 },
  { pattern: '제39조', page: 30 },
  { pattern: '제40조', page: 30 },
  { pattern: '제41조', page: 30 },
  { pattern: '제42조', page: 30 },
  { pattern: '제44조', page: 31 },
  { pattern: '제46조', page: 32 },
  { pattern: '제47조', page: 33 },
  { pattern: '제48조', page: 34 },
  { pattern: '제49조', page: 34 },
  { pattern: '제50조', page: 34 },
  { pattern: '제51조', page: 35 },
  { pattern: '제52조', page: 35 },
  { pattern: '제53조', page: 36 },
  { pattern: '제54조', page: 37 },
  { pattern: '제58조', page: 38 },
  { pattern: '제62조', page: 44 },
  { pattern: '제63조', page: 45 },
  { pattern: '제67조', page: 38 },
  { pattern: '보수표', page: 96 },
  { pattern: '별표', page: 96 },
  { pattern: '복무규정', page: 99 },
  { pattern: '복리후생 안내서', page: 38 },
  { pattern: '별도합의', page: 20 },
  { pattern: '규정', page: 4 },
];

function getPdfPageForRef(ref) {
  if (!ref) return 1;
  for (var i = 0; i < PDF_PAGE_MAP.length; i++) {
    if (ref.indexOf(PDF_PAGE_MAP[i].pattern) !== -1) return PDF_PAGE_MAP[i].page;
  }
  return 1;
}

function initBrowse() {
  // Load profile for calculator blocks
  loadProfileForFaq();

  // Try loading from DB via /api/regulations/browse, fallback to DATA.handbook
  tryLoadBrowseFromApi().then(function() {
    renderBrowseCategories();

    // Start with first category selected
    if (DATA.handbook && DATA.handbook.length > 0) {
      browseActiveCategory = DATA.handbook[0].category;
    }
    renderBrowseList();
    updateBrowseCategoryActive();

    var searchInput = document.getElementById('browseSearch');
    var debounceTimer;
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() { searchBrowse(searchInput.value.trim()); }, 200);
    });
  });
}

/**
 * Fetch regulation browse data from DB-backed API endpoint.
 * On success, merges into DATA.handbook so existing rendering works unchanged.
 * On failure, silently falls back to the static DATA.handbook from data.js.
 */
function tryLoadBrowseFromApi() {
  var apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
  var url = apiBase + '/api/regulations/browse';

  return fetch(url)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (data && data.sections && data.sections.length > 0) {
        // Convert API sections to DATA.handbook format for seamless rendering
        var dbHandbook = data.sections.map(function(section) {
          return {
            category: section.category,
            icon: section.icon || '📄',
            articles: section.articles.map(function(article) {
              return {
                title: article.title || '',
                ref: article.ref || '',
                body: article.body || '',
                _sourceFile: article.sourceFile,
                _chunkIds: article.chunkIds,
                _fromDb: true
              };
            })
          };
        });
        // Replace DATA.handbook with DB-sourced data
        if (typeof DATA !== 'undefined' && dbHandbook.length > 0) {
          DATA.handbook = dbHandbook;
          console.log('[regulation.js] Loaded browse data from DB (' + dbHandbook.length + ' sections)');
        }
      }
    })
    .catch(function(err) {
      // Fallback: use existing DATA.handbook from data.js
      console.log('[regulation.js] DB browse unavailable, using DATA.handbook fallback:', err.message);
    });
}


function renderBrowseCategories() {
  var container = document.getElementById('browseCategoryTags');
  if (!container || !DATA.handbook) return;

  // "전체" tag
  var allTag = document.createElement('button');
  allTag.className = 'quick-tag';
  allTag.textContent = '전체';
  allTag.style.fontWeight = '600';
  allTag.onclick = function() {
    browseActiveCategory = null;
    document.getElementById('browseSearch').value = '';
    renderBrowseList();
    updateBrowseCategoryActive();
    var el = document.getElementById('browseArticles');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  container.appendChild(allTag);

  DATA.handbook.forEach(function(section) {
    var tag = document.createElement('button');
    tag.className = 'quick-tag';
    tag.textContent = section.category;
    tag.dataset.category = section.category;
    tag.onclick = function() {
      browseActiveCategory = section.category;
      document.getElementById('browseSearch').value = '';
      renderBrowseList();
      updateBrowseCategoryActive();
      var el = document.getElementById('browseArticles');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    container.appendChild(tag);
  });
}

function updateBrowseCategoryActive() {
  document.querySelectorAll('#browseCategoryTags .quick-tag').forEach(function(tag) {
    var isActive = (!browseActiveCategory && !tag.dataset.category) ||
                   (tag.dataset.category === browseActiveCategory);
    tag.style.borderColor = isActive ? 'var(--accent-indigo)' : '';
    tag.style.color = isActive ? 'var(--accent-indigo)' : '';
  });
}

function renderBrowseList() {
  var container = document.getElementById('browseArticles');
  if (!container || !DATA.handbook) return;

  var articles = [];
  DATA.handbook.forEach(function(section) {
    if (!browseActiveCategory || section.category === browseActiveCategory) {
      section.articles.forEach(function(a) {
        articles.push(Object.assign({}, a, {
          _category: section.category,
          _categoryIcon: section.icon
        }));
      });
    }
  });

  renderArticles(articles, container, { showCategory: !browseActiveCategory });
}

// Renders article accordion from trusted DATA.handbook, with direct calculator blocks
// Security: All content from trusted DATA.handbook (hardcoded in data.js)
function renderArticles(articles, container, options) {
  const opts = options || {};
  const highlightQuery = opts.highlight;
  const showCategory = opts.showCategory;

  var parts = [];

  articles.forEach(function(article, i) {
    const bodyFormatted = formatBody(article.body, highlightQuery);
    const titleText = highlightQuery ? applyHighlight(escapeHtml(article.title), highlightQuery) : escapeHtml(article.title);
    const refText = escapeHtml(article.ref || '');
    const categoryLabel = showCategory && article._category
      ? ' <span style="font-size:var(--text-label-small); color:var(--text-muted); margin-left:4px;">' + article._categoryIcon + ' ' + escapeHtml(article._category) + '</span>'
      : '';

    const escapedTitle = escapeHtml(article.title).replace(/'/g, "\\'");
    const escapedRef = escapeHtml(article.ref || '').replace(/'/g, "\\'");

    // Direct calculator block (no FAQ intermediary)
    var calcKey = ARTICLE_CALCULATORS[article.title];
    var calcBlock = '';
    if (calcKey) {
      try { calcBlock = renderCalcBlock(calcKey) || ''; } catch (e) { calcBlock = ''; }
    }

    parts.push('<div class="reg-article" data-index="' + i + '">'
      + '<div class="reg-article-header" onclick="toggleArticle(this)">'
      + '<div class="reg-article-title-group">'
      + '<div class="reg-article-title">' + titleText + categoryLabel + '</div>'
      + '<div class="reg-article-ref">\uD83D\uDCCC ' + refText + '</div>'
      + '</div>'
      + '<span class="reg-article-chevron">▸</span>'
      + '</div>'
      + '<div class="reg-article-body">'
      + '<div class="reg-article-content">' + bodyFormatted + '</div>'
      + calcBlock
      + '<div class="reg-article-actions">'
      + '<button class="btn btn-outline" onclick="openPdfForRef(\'' + escapedRef + '\')">\uD83D\uDCC4 PDF 원문 보기</button>'
      + '<button class="btn btn-outline" onclick="askAboutArticle(\'' + escapedTitle + '\')">\uD83D\uDCAC 이 규정 질문하기</button>'
      + '</div>'
      + '</div>'
      + '</div>');
  });

  var result = parts.join('');
  container.textContent = '';
  if (!result) {
    var emptyDiv = document.createElement('div');
    emptyDiv.className = 'reg-empty';
    var iconDiv = document.createElement('div');
    iconDiv.className = 'reg-empty-icon';
    iconDiv.textContent = '\uD83D\uDCED';
    var textDiv = document.createElement('div');
    textDiv.className = 'reg-empty-text';
    textDiv.textContent = '조항이 없습니다.';
    emptyDiv.appendChild(iconDiv);
    emptyDiv.appendChild(textDiv);
    container.appendChild(emptyDiv);
  } else {
    // Content from trusted DATA.handbook — no user input
    container.innerHTML = result;
  }
}

function toggleArticle(headerEl) {
  const article = headerEl.closest('.reg-article');
  const wasOpen = article.classList.contains('open');

  // Close all siblings (accordion behavior)
  var siblings = article.parentElement.querySelectorAll('.reg-article.open');
  siblings.forEach(function(s) { s.classList.remove('open'); });

  // Toggle clicked one
  if (!wasOpen) {
    article.classList.add('open');
    // On mobile, scroll to show the opened article
    if (window.innerWidth <= 768) {
      setTimeout(function() {
        article.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }
}

function searchBrowse(query) {
  var container = document.getElementById('browseArticles');

  if (!query) {
    renderBrowseList();
    return;
  }

  var q = query.toLowerCase();
  var results = [];

  // Search handbook articles
  DATA.handbook.forEach(function(section) {
    section.articles.forEach(function(article) {
      var inTitle = article.title.toLowerCase().includes(q);
      var inBody = article.body.toLowerCase().includes(q);
      var inRef = article.ref.toLowerCase().includes(q);

      if (inTitle || inBody || inRef) {
        results.push(Object.assign({}, article, {
          _category: section.category,
          _categoryIcon: section.icon
        }));
      }
    });
  });

  if (results.length === 0) {
    container.textContent = '';
    var emptyDiv = document.createElement('div');
    emptyDiv.className = 'reg-empty';
    var iconDiv = document.createElement('div');
    iconDiv.className = 'reg-empty-icon';
    iconDiv.textContent = '\uD83D\uDD0D';
    var textDiv = document.createElement('div');
    textDiv.className = 'reg-empty-text';
    textDiv.textContent = '"' + query + '" 검색 결과가 없습니다. 다른 키워드로 검색해보세요.';
    emptyDiv.appendChild(iconDiv);
    emptyDiv.appendChild(textDiv);
    container.appendChild(emptyDiv);
    return;
  }

  container.textContent = '';
  var countDiv = document.createElement('div');
  countDiv.style.cssText = 'font-size:var(--text-body-normal); color:var(--text-muted); margin-bottom:12px;';
  countDiv.textContent = results.length + '개 결과';
  container.appendChild(countDiv);
  var articlesDiv = document.createElement('div');
  container.appendChild(articlesDiv);
  renderArticles(results, articlesDiv, { highlight: q, showCategory: true });
}

// ── Helpers ──

function formatBody(body, highlight) {
  var html = escapeHtml(body);
  html = html.replace(/• /g, '<span class="bullet">\u2022 </span>');
  if (highlight) {
    html = applyHighlight(html, highlight);
  }
  return html;
}

function applyHighlight(text, query) {
  var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return text.replace(re, '<span class="reg-highlight">$1</span>');
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getHandbookPdfUrl() {
  // file:// 프로토콜에서는 PDF.js가 상대경로를 못 읽으므로 절대 URL 사용
  if (window.location.protocol === 'file:') {
    return window.location.href.replace(/\/[^/]*$/, '/data/2026_handbook.pdf');
  }
  return 'data/2026_handbook.pdf';
}

function openPdfPicker() {
  openPdfSheet(getHandbookPdfUrl(), '조합원 수첩 (전체)');
}

function openPdfForRef(ref) {
  var page = getPdfPageForRef(ref);
  var label = ref ? '조합원 수첩 — ' + ref : '조합원 수첩';
  openPdfSheet(getHandbookPdfUrl(), label, page);
}

function askAboutArticle(title) {
  // Switch to 물어보기 tab and pre-fill
  var askTab = document.querySelector('#regSubTabs .reg-bookmark-tab[data-subtab="ask"]');
  if (askTab) askTab.click();
  var input = document.getElementById('chatInput');
  if (input) {
    input.value = title;
    input.focus();
  }
}

// ═══════════ 💬 물어보기 (AI 상담) ═══════════

// 로컬 개발: Live Server(3000) → Hono API(3001) 자동 연결
var API_BASE = (function() {
  if (location.protocol === 'file:') return 'http://localhost:3001/api';
  var localHosts = { 'localhost': true, '127.0.0.1': true, '::1': true };
  if (localHosts[location.hostname] && location.port !== '3001') return 'http://localhost:3001/api';
  return '/api';
})();
var chatSessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

function initAsk() {
  var sendBtn = document.getElementById('chatSend');
  var input = document.getElementById('chatInput');
  if (sendBtn) sendBtn.addEventListener('click', handleChat);
  if (input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleChat();
    });
  }
  initChatWelcome();
}

// ── Chat: 사용자 이름 가져오기 ──
function getChatUserName() {
  try {
    var key = window.getUserStorageKey ? window.getUserStorageKey('bhm_hr_profile') : 'bhm_hr_profile';
    var stored = localStorage.getItem(key);
    if (stored) {
      var p = JSON.parse(stored);
      if (p && p.name && p.name.trim()) return p.name.trim() + '님';
    }
  } catch(e) {}
  return '사용자';
}

// ── Chat: 초기 웰컴 메시지 ──
function initChatWelcome() {
  var userName = getChatUserName();
  var bubble = addChatMessage(null, 'bot', null, true);
  bubble.appendChild(document.createTextNode('안녕하세요, ' + userName + '! 저는 서울대학교병원 단체협약 규정을 안내해드리는 AI입니다.'));
  var ex = document.createElement('div');
  ex.style.cssText = 'opacity:0.82; font-size:13px; margin-top:4px;';
  ex.textContent = '예: "온콜 수당 얼마?", "연차 며칠?", "경조 휴가"';
  bubble.appendChild(ex);
  var container = document.getElementById('chatMessages');
  if (container) container.scrollTop = container.scrollHeight;
}

// ── Chat 메시지 렌더 ──
// bot 메시지: 내부 신뢰 API 응답 또는 DATA 소스 (innerHTML 사용)
// user 메시지: 항상 textContent로 처리 (XSS 방지)
// rawBubble=true 이면 빈 bubble 엘리먼트를 반환해 caller가 DOM으로 직접 채움
function addChatMessage(text, type, sources, rawBubble) {
  var container = document.getElementById('chatMessages');

  var row = document.createElement('div');
  row.className = 'chat-row ' + type;

  // 아바타
  var avatarEl;
  if (type === 'bot') {
    avatarEl = document.createElement('img');
    avatarEl.className = 'chat-avatar-img';
    avatarEl.src = 'snuhmaterect.png';
    avatarEl.alt = 'SNUH Mate';
  } else {
    avatarEl = document.createElement('div');
    avatarEl.className = 'chat-avatar-user';
    avatarEl.textContent = getChatUserName().charAt(0);
  }

  // 버블 래퍼 (이름 + 버블)
  var wrap = document.createElement('div');
  wrap.className = 'chat-bubble-wrap';

  var nameLabel = document.createElement('div');
  nameLabel.className = 'chat-name-label';
  nameLabel.textContent = type === 'bot' ? 'SNUH Mate' : getChatUserName();
  wrap.appendChild(nameLabel);

  var bubble = document.createElement('div');
  bubble.className = 'chat-bubble';

  if (!rawBubble) {
    if (type === 'user') {
      // 사용자 입력: textContent 사용 (XSS 방지)
      bubble.textContent = text;
    } else {
      // bot: 내부 신뢰 API 응답 또는 DATA 소스만 사용
      // escapeHtml()로 처리된 FAQ 텍스트와 신뢰된 API HTML만 허용
      var div = document.createElement('div');
      div.textContent = text;
      // trusted API HTML 처리: newline → br 치환된 서버 응답
      if (text && text.indexOf('<') !== -1) {
        bubble.innerHTML = text; // trusted internal source only
      } else {
        bubble.textContent = text;
      }
      if (sources && sources.length > 0) {
        var refsDiv = document.createElement('div');
        refsDiv.className = 'chat-refs';
        sources.forEach(function(s) {
          var tag = document.createElement('span');
          tag.className = 'chat-ref-tag';
          tag.textContent = '📌 ' + (s.ref || s.title || '');
          refsDiv.appendChild(tag);
        });
        bubble.appendChild(refsDiv);
      }
    }
  }

  wrap.appendChild(bubble);
  row.appendChild(avatarEl);
  row.appendChild(wrap);
  container.appendChild(row);

  if (type === 'bot') {
    // 답변 시작점이 보이도록 smooth scroll
    // rAF 두 번: 첫 번째에서 layout, 두 번째에서 정확한 rect 측정
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        var containerRect = container.getBoundingClientRect();
        var rowRect = row.getBoundingClientRect();
        var target = rowRect.top - containerRect.top + container.scrollTop - 12;
        container.scrollTo({ top: target, behavior: 'smooth' });
      });
    });
  } else {
    container.scrollTop = container.scrollHeight;
  }
  return bubble;
}

function addTypingIndicator() {
  var container = document.getElementById('chatMessages');
  var row = document.createElement('div');
  row.className = 'chat-row bot';
  row.id = 'typingIndicator';

  var img = document.createElement('img');
  img.className = 'chat-avatar-img';
  img.src = 'snuhmaterect.png';
  img.alt = 'SNUH Mate';

  var wrap = document.createElement('div');
  wrap.className = 'chat-bubble-wrap';

  var nameLabel = document.createElement('div');
  nameLabel.className = 'chat-name-label';
  nameLabel.textContent = 'SNUH Mate';
  wrap.appendChild(nameLabel);

  var bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  var dots = document.createElement('div');
  dots.className = 'chat-typing-dots';
  for (var i = 0; i < 3; i++) {
    var s = document.createElement('span');
    dots.appendChild(s);
  }
  bubble.appendChild(dots);
  wrap.appendChild(bubble);

  row.appendChild(img);
  row.appendChild(wrap);
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  var el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

async function handleChat() {
  var input = document.getElementById('chatInput');
  var query = input.value.trim();
  if (!query) return;

  addChatMessage(query, 'user');
  input.value = '';
  await handleChatQuery(query);
}

async function handleChatQuery(query) {
  addTypingIndicator();
  var botBubble = null;

  try {
    var res = await fetch(API_BASE + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query, sessionId: chatSessionId }),
    });

    removeTypingIndicator();
    if (!res.ok) throw new Error('API error: ' + res.status);

    var data = await res.json();
    // 서버 응답: 신뢰된 내부 소스, newline을 br로 변환
    var answerHtml = data.answer.replace(/\n/g, '<br>');
    botBubble = addChatMessage(answerHtml, 'bot', data.sources);
    showRelatedFaq(query, botBubble);

  } catch (err) {
    removeTypingIndicator();
    var result = searchChatLocal(query);
    if (result) {
      // 로컬 fallback: escapeHtml 처리된 텍스트 + 내부 DATA 렌더
      var bubble = addChatMessage(null, 'bot', null, true);
      if (result.faq) {
        var faqDiv = document.createElement('div');
        faqDiv.textContent = result.faq.a;
        bubble.appendChild(faqDiv);
      }
      if (result.handbook.length > 0) {
        var hDiv = document.createElement('div');
        hDiv.style.marginTop = '6px';
        hDiv.innerHTML = renderHandbookSource(result.handbook); // internal DATA only
        bubble.appendChild(hDiv);
      }
      var note = document.createElement('div');
      note.style.cssText = 'margin-top:9px; font-size:12px; opacity:0.72; border-top:1px solid rgba(255,255,255,0.2); padding-top:7px;';
      note.textContent = '* 서버 연결 불가 — 로컬 규정 검색 결과입니다.';
      bubble.appendChild(note);
      var ref = result.faq ? result.faq.ref : (result.handbook[0] ? result.handbook[0].ref : null);
      if (ref) {
        var refsDiv = document.createElement('div');
        refsDiv.className = 'chat-refs';
        var tag = document.createElement('span');
        tag.className = 'chat-ref-tag';
        tag.textContent = '📌 ' + ref;
        refsDiv.appendChild(tag);
        bubble.appendChild(refsDiv);
      }
      showRelatedFaq(query, bubble);
      // fallback 내용 다 붙인 뒤 시작점으로 smooth scroll
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          var container = document.getElementById('chatMessages');
          var row = bubble.closest('.chat-row');
          if (!row) return;
          var containerRect = container.getBoundingClientRect();
          var rowRect = row.getBoundingClientRect();
          var target = rowRect.top - containerRect.top + container.scrollTop - 12;
          container.scrollTo({ top: target, behavior: 'smooth' });
        });
      });
    } else {
      var bubble2 = addChatMessage(null, 'bot', null, true);
      bubble2.textContent = '해당 질문에 대한 규정을 찾지 못했습니다.';
      var hint = document.createElement('div');
      hint.style.cssText = 'font-size:13px; opacity:0.82; margin-top:5px;';
      hint.textContent = '더 구체적인 키워드로 질문해보세요. 예: "온콜", "연차", "야간수당"';
      bubble2.appendChild(hint);
    }
  }
}

// 관련 FAQ — 별도 메시지가 아닌 bot 버블 안에 추가
function showRelatedFaq(query, targetBubble) {
  if (!DATA.faq || !targetBubble) return;
  var q = query.toLowerCase();
  var related = DATA.faq.filter(function(f) {
    return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) ||
      (f.category && f.category.toLowerCase().includes(q));
  }).slice(0, 3);

  if (related.length === 0) return;

  var relDiv = document.createElement('div');
  relDiv.className = 'chat-related';

  var titleEl = document.createElement('div');
  titleEl.className = 'chat-related-title';
  titleEl.textContent = '관련 질문';
  relDiv.appendChild(titleEl);

  related.forEach(function(faq) {
    var link = document.createElement('div');
    link.className = 'chat-related-link';
    link.textContent = '▸ ' + faq.q;
    link.addEventListener('click', function() {
      addChatMessage(faq.q, 'user');
      handleChatQuery(faq.q);
    });
    relDiv.appendChild(link);
  });

  targetBubble.appendChild(relDiv);
  var container = document.getElementById('chatMessages');
  if (container) container.scrollTop = container.scrollHeight;
}

// ── Local chat search (API fallback) ──
var CHAT_ALIASES = {
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

var CHAT_CATEGORY_MAP = {
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

  var qWords = query.split(/\s+/);

  var mappedCategory = null;
  for (var i = 0; i < qWords.length; i++) {
    if (CHAT_CATEGORY_MAP[qWords[i]]) { mappedCategory = CHAT_CATEGORY_MAP[qWords[i]]; break; }
  }
  if (!mappedCategory) {
    for (var key in CHAT_ALIASES) {
      var words = CHAT_ALIASES[key];
      if (query.includes(key) || words.some(function(w) { return query.includes(w); })) {
        if (CHAT_CATEGORY_MAP[key]) { mappedCategory = CHAT_CATEGORY_MAP[key]; break; }
      }
    }
  }

  var scored = DATA.faq.map(function(item) {
    var score = 0;
    var qLower = item.q.toLowerCase();
    var aLower = item.a.toLowerCase();
    qWords.forEach(function(w) {
      if (qLower.includes(w)) score += 5;
      if (aLower.includes(w)) score += 1;
    });
    Object.entries(CHAT_ALIASES).forEach(function(entry) {
      var aliasKey = entry[0], aliasWords = entry[1];
      var queryHasKey = query.includes(aliasKey) || aliasWords.some(function(w) { return query.includes(w); });
      if (queryHasKey && (qLower.includes(aliasKey) || aLower.includes(aliasKey))) score += 3;
    });
    if (mappedCategory && item.category === mappedCategory) score += 2;
    return Object.assign({}, item, { score: score });
  });

  var best = scored.filter(function(s) { return s.score > 0; }).sort(function(a, b) { return b.score - a.score; })[0];

  var handbookArticles = [];
  if (mappedCategory && DATA.handbook) {
    var section = DATA.handbook.find(function(h) { return h.category === mappedCategory; });
    if (section) {
      var articleScores = section.articles.map(function(art) {
        var s = 0;
        var tLower = art.title.toLowerCase();
        var bLower = art.body.toLowerCase();
        qWords.forEach(function(w) { if (tLower.includes(w)) s += 5; if (bLower.includes(w)) s += 1; });
        return Object.assign({}, art, { score: s });
      });
      var sorted = articleScores.sort(function(a, b) { return b.score - a.score; });
      if (qWords.length >= 2 && sorted[0] && sorted[0].score > 0) {
        handbookArticles = sorted.filter(function(a) { return a.score > 0; }).slice(0, 2);
      } else {
        handbookArticles = sorted;
      }
    }
  }

  if (handbookArticles.length === 0 && best && DATA.handbook) {
    var faqCatMap = {
      '근로시간': '근로시간', '온콜': '온콜', '야간근무': '근로시간',
      '휴가': '연차·휴가', '경조': '청원·경조', '수당': '임금·수당',
      '휴직': '휴직', '승진': '승진', '복지': '복지'
    };
    var hbCat = faqCatMap[best.category];
    if (hbCat) {
      var sect = DATA.handbook.find(function(h) { return h.category === hbCat; });
      if (sect) {
        var matched = sect.articles.filter(function(a) { return best.ref && a.ref.includes(best.ref.split(',')[0].trim()); });
        handbookArticles = matched.length > 0 ? matched.slice(0, 2) : [sect.articles[0]];
      }
    }
  }

  if (!best && handbookArticles.length === 0) return null;
  return { faq: best || null, handbook: handbookArticles };
}

// Renders handbook source block from trusted DATA.handbook content
function renderHandbookSource(articles) {
  if (!articles || articles.length === 0) return '';
  var html = '<div style="margin-top:10px; padding:10px 12px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); border-radius:var(--radius-md); font-size:var(--text-body-normal);">';
  html += '<div style="font-weight:600; color:var(--accent-indigo); margin-bottom:6px;">\uD83D\uDCD6 규정 원문</div>';
  articles.forEach(function(art, i) {
    if (i > 0) html += '<hr style="border:none; border-top:1px solid rgba(99,102,241,0.1); margin:8px 0;">';
    html += '<div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">' + escapeHtml(art.title) + ' <span style="font-size:var(--text-label-small); padding:2px 8px; border-radius:4px; background:rgba(99,102,241,0.1); color:var(--accent-indigo);">' + escapeHtml(art.ref) + '</span></div>';
    html += '<div style="color:var(--text-secondary); white-space:pre-line; line-height:1.6;">' + escapeHtml(art.body) + '</div>';
  });
  html += '</div>';
  return html;
}

// ═══════════ FAQ 포맷팅/계산기 (찾아보기 내 인라인용) ═══════════


// ── FAQ 답변 포맷팅 엔진 ──
// 플레인 텍스트를 구조화된 HTML로 변환
// Trusted DATA.faq content only — no user input
function formatFaqAnswer(text) {
  // data.js에서 수동 포맷 완료 → \n, • 그대로 렌더 (white-space: pre-line)
  var escaped = escapeHtml(text);

  // 볼드 처리: 금액, 퍼센트, 일수, 시간, 포인트
  escaped = escaped.replace(/([\d,]+원)/g, '<strong>$1</strong>');
  escaped = escaped.replace(/([\d.]+%)/g, '<strong>$1</strong>');
  escaped = escaped.replace(/([\d,]+만원)/g, '<strong>$1</strong>');
  escaped = escaped.replace(/(\d+일)/g, '<strong>$1</strong>');
  escaped = escaped.replace(/(\d+시간)/g, '<strong>$1</strong>');
  escaped = escaped.replace(/(\d+P)/g, '<strong>$1</strong>');

  // 중복 strong 제거
  escaped = escaped.replace(/<strong><strong>/g, '<strong>');
  escaped = escaped.replace(/<\/strong><\/strong>/g, '</strong>');

  return escaped;
}

// ── FAQ별 계산 함수 매핑 ──
// question 문자열 기준으로 매칭, 프로필 데이터로 실제 금액 계산
var FAQ_CALCULATORS = {
  '시간외근무는 어떻게 계산하나요?': function(_p, wage) {
    if (!wage) return null;
    return {
      label: '내 시간외수당 (1시간 기준)',
      rows: [
        ['내 시급', CALC.formatCurrency(wage.hourlyRate)],
        ['연장 1시간', CALC.formatCurrency(Math.round(wage.hourlyRate * 1.5))],
        ['야간 1시간', CALC.formatCurrency(Math.round(wage.hourlyRate * 2.0))],
        ['휴일 1시간 (8h 이내)', CALC.formatCurrency(Math.round(wage.hourlyRate * 1.5))],
        ['휴일 1시간 (8h 초과)', CALC.formatCurrency(Math.round(wage.hourlyRate * 2.0))]
      ]
    };
  },
  '온콜 출근하면 수당이 얼마인가요?': function(_p, wage) {
    if (!wage) return null;
    var workHours = 4; // 예시: 4시간 실근무
    var result = CALC.calcOnCallPay(wage.hourlyRate, 0, 1, workHours, true);
    return {
      label: '온콜 출근 1회 예시 (야간 ' + workHours + '시간 근무)',
      rows: [
        ['내 시급', CALC.formatCurrency(wage.hourlyRate)],
        ['온콜교통비', CALC.formatCurrency(result.온콜교통비)],
        ['시간외수당 (' + workHours + 'h+2h)', CALC.formatCurrency(result.시간외근무수당)],
        ['합계', CALC.formatCurrency(result.합계)]
      ]
    };
  },
  '통상임금이 뭐에요?': function(_p, wage) {
    if (!wage) return null;
    return {
      label: '내 통상임금',
      rows: [
        ['월 통상임금', CALC.formatCurrency(wage.monthlyWage)],
        ['시급 (÷209시간)', CALC.formatCurrency(wage.hourlyRate)]
      ]
    };
  },
  '가족수당은 얼마인가요?': function(profile) {
    if (!profile) return null;
    var result = CALC.calcFamilyAllowance(profile.numFamily || 0, profile.numChildren || 0);
    if (result.total === 0 && !profile.numFamily && !profile.numChildren) return null;
    return {
      label: '내 가족수당',
      rows: [['월 가족수당', CALC.formatCurrency(result.total)]]
    };
  },
  '연차가 몇 일이에요?': function(profile) {
    if (!profile || !profile.hireDate) return null;
    var hireDate = new Date(profile.hireDate);
    if (isNaN(hireDate.getTime())) return null;
    var result = CALC.calcAnnualLeave(hireDate);
    return {
      label: '내 연차',
      rows: [
        ['근속', result.explanation],
        ['연차일수', result.totalLeave + '일']
      ]
    };
  },
  '장기근속수당은?': function(profile) {
    if (!profile || !profile.hireDate) return null;
    var hireDate = new Date(profile.hireDate);
    if (isNaN(hireDate.getTime())) return null;
    var years = Math.floor((new Date() - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
    var result = CALC.calcLongServicePay(years);
    return {
      label: '내 장기근속수당',
      rows: [
        ['근속연수', years + '년 (' + result.구간 + ')'],
        ['월 수당', CALC.formatCurrency(result.월수당)]
      ]
    };
  },
  '명절지원비는 언제?': function(_p, wage) {
    if (!wage || !wage.displayInfo) return null;
    return {
      label: '내 명절지원비',
      rows: [
        ['1회 금액', CALC.formatCurrency(wage.displayInfo.holidayBonusPerTime)],
        ['지급 시기', wage.displayInfo.holidayBonusMonths],
        ['연 합계', CALC.formatCurrency(wage.displayInfo.holidayBonusPerTime * 4)]
      ]
    };
  },
  '육아휴직 급여는?': function(_p, wage) {
    if (!wage) return null;
    var m = wage.monthlyWage;
    return {
      label: '내 육아휴직 예상 급여',
      rows: [
        ['1~3개월', CALC.formatCurrency(Math.min(m, 2500000)) + ' (100%, 상한 250만)'],
        ['4~6개월', CALC.formatCurrency(Math.min(m, 2000000)) + ' (100%, 상한 200만)'],
        ['7~12개월', CALC.formatCurrency(Math.min(Math.round(m * 0.8), 1600000)) + ' (80%, 상한 160만)']
      ]
    };
  },
  '무급휴가 쓰면 얼마 공제되나요?': function(_p, wage) {
    if (!wage) return null;
    var daily = Math.round(wage.monthlyWage / 30);
    return {
      label: '무급휴가 1일 공제액',
      rows: [
        ['통상임금 월액', CALC.formatCurrency(wage.monthlyWage)],
        ['1일 공제액 (÷30)', CALC.formatCurrency(daily)]
      ]
    };
  },
  '미사용 연차 보상금은?': function(_p, wage) {
    if (!wage) return null;
    var daily = wage.hourlyRate * 8;
    return {
      label: '미사용 연차 1일 보상금',
      rows: [
        ['시급', CALC.formatCurrency(wage.hourlyRate)],
        ['1일 (8시간)', CALC.formatCurrency(daily)],
        ['5일 예시', CALC.formatCurrency(daily * 5)]
      ]
    };
  },
  '퇴직금은 어떻게 계산하나요?': function(profile, wage) {
    if (!wage || !profile || !profile.hireDate) return null;
    var years = Math.floor((new Date() - new Date(profile.hireDate)) / (365.25 * 24 * 60 * 60 * 1000));
    if (years < 1) return { label: '퇴직금', rows: [['상태', '근속 1년 미만 (해당없음)']] };
    var avg = CALC.calcAverageWage(wage.monthlyWage, 3);
    var r = CALC.calcSeveranceFullPay(avg.monthlyAvgWage, years, profile.hireDate);
    return {
      label: '내 예상 퇴직금',
      rows: [
        ['월 평균임금', CALC.formatCurrency(avg.monthlyAvgWage)],
        ['근속기간', r.근속기간 || (years + '년')],
        ['예상 퇴직금', CALC.formatCurrency(r.퇴직금)]
      ]
    };
  }
};

// 프로필 + 통상임금 로드 (캐시)
var _cachedProfile = null;
var _cachedWage = null;

function loadProfileForFaq() {
  if (typeof PROFILE === 'undefined') return;
  _cachedProfile = PROFILE.load();
  if (_cachedProfile && _cachedProfile.jobType && _cachedProfile.grade && typeof CALC !== 'undefined') {
    var longServiceYears = 0;
    if (_cachedProfile.hireDate) {
      var hd = new Date(_cachedProfile.hireDate);
      if (!isNaN(hd.getTime())) {
        longServiceYears = Math.floor((new Date() - hd) / (365.25 * 24 * 60 * 60 * 1000));
      }
    }
    _cachedWage = CALC.calcOrdinaryWage(_cachedProfile.jobType, _cachedProfile.grade, _cachedProfile.year || 1, {
      hasMilitary: _cachedProfile.hasMilitary,
      militaryMonths: _cachedProfile.militaryMonths,
      hasSeniority: _cachedProfile.hasSeniority,
      seniorityYears: longServiceYears,
      longServiceYears: longServiceYears,
      adjustPay: _cachedProfile.adjustPay || 0,
      upgradeAdjustPay: _cachedProfile.upgradeAdjustPay || 0,
      specialPayAmount: _cachedProfile.specialPay || 0,
      positionPay: _cachedProfile.positionPay || 0,
      workSupportPay: _cachedProfile.workSupportPay || 0,
      weeklyHours: _cachedProfile.weeklyHours || 209
    });
  }
}

function renderCalcBlock(question) {
  var calcFn = FAQ_CALCULATORS[question];
  if (!calcFn) return '';

  var result = calcFn(_cachedProfile, _cachedWage);
  if (!result) {
    return '<div style="margin-top:12px; padding:10px 12px; border-radius:var(--radius-md); background:rgba(99,102,241,0.04); border:1px dashed rgba(99,102,241,0.2);">'
      + '<div style="font-size:var(--text-body-normal); color:var(--text-muted);">'
      + '\uD83D\uDCCA <a href="index.html#profile" style="color:var(--accent-indigo);">내 정보</a>를 입력하면 실제 금액을 계산해드립니다.'
      + '</div></div>';
  }

  var html = '<div style="margin-top:12px; padding:12px 14px; border-radius:var(--radius-md); background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15);">';
  html += '<div style="font-size:var(--text-body-normal); font-weight:600; color:var(--accent-indigo); margin-bottom:8px;">\uD83D\uDCCA ' + escapeHtml(result.label) + '</div>';
  result.rows.forEach(function(row) {
    html += '<div style="display:flex; justify-content:space-between; padding:3px 0; font-size:var(--text-body-normal);">'
      + '<span style="color:var(--text-secondary);">' + escapeHtml(row[0]) + '</span>'
      + '<span style="font-weight:600; color:var(--text-primary);">' + row[1] + '</span>'
      + '</div>';
  });
  html += '</div>';
  return html;
}


// ═══════════ 📄 PDF 바텀시트 ═══════════

var pdfDoc = null;
var pdfCurrentPage = 1;
var pdfScale = 1.0;

function initPdfSheet() {
  document.getElementById('pdfClose').addEventListener('click', closePdfSheet);
  document.getElementById('pdfOverlay').addEventListener('click', function(e) {
    if (e.target === document.getElementById('pdfOverlay')) {
      closePdfSheet();
    }
  });
}

function openPdfSheet(url, title, startPage) {
  var overlay = document.getElementById('pdfOverlay');
  overlay.classList.add('active');
  document.getElementById('pdfSheetTitle').textContent = title || 'PDF 원문';
  document.body.style.overflow = 'hidden';
  loadPdf(url, startPage || 1);
}

function closePdfSheet() {
  var overlay = document.getElementById('pdfOverlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  pdfDoc = null;
}

async function loadPdf(url, startPage) {
  if (typeof pdfjsLib === 'undefined') {
    alert('PDF.js 라이브러리가 로드되지 않았습니다.');
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  try {
    pdfDoc = await pdfjsLib.getDocument(url).promise;
    pdfCurrentPage = Math.min(Math.max(startPage || 1, 1), pdfDoc.numPages);
    pdfScale = 1.0;

    // Auto fit width
    var page = await pdfDoc.getPage(pdfCurrentPage);
    var bodyWidth = document.getElementById('pdfSheetBody').clientWidth - 32;
    var viewport = page.getViewport({ scale: 1.0 });
    pdfScale = bodyWidth / viewport.width;

    renderPdfPage();
  } catch (err) {
    var body = document.getElementById('pdfSheetBody');
    body.textContent = '';
    var errDiv = document.createElement('div');
    errDiv.className = 'reg-empty';
    errDiv.innerHTML = '<div class="reg-empty-icon">\u26A0\uFE0F</div>';
    var errText = document.createElement('div');
    errText.className = 'reg-empty-text';
    errText.textContent = 'PDF 로드 실패: ' + err.message;
    errDiv.appendChild(errText);
    body.appendChild(errDiv);
  }
}

async function renderPdfPage() {
  if (!pdfDoc) return;

  var page = await pdfDoc.getPage(pdfCurrentPage);
  var canvas = document.getElementById('pdfCanvas');
  var ctx = canvas.getContext('2d');

  var viewport = page.getViewport({ scale: pdfScale });
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: ctx, viewport: viewport }).promise;

  document.getElementById('pdfPageInfo').textContent = pdfCurrentPage + ' / ' + pdfDoc.numPages;
  document.getElementById('pdfZoomInfo').textContent = Math.round(pdfScale * 100) + '%';
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
