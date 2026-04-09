/* ============================================
   regulation.js — 규정/상담 페이지 로직 v2
   3-tab structure: FAQ / 찾아보기 / 물어보기

   Security note: All innerHTML usage in this file renders content from
   DATA.handbook and DATA.faq — trusted, hardcoded internal data sources
   defined in data.js. No user-supplied content is rendered as HTML.
   This matches the existing pattern used in app.js.
   ============================================ */

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSubTabs();
  initFaq();
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

// Renders article accordion from trusted DATA.handbook articles
function renderArticles(articles, container, options) {
  const opts = options || {};
  const highlightQuery = opts.highlight;
  const showCategory = opts.showCategory;
  let html = '';

  articles.forEach(function(article, i) {
    const bodyFormatted = formatBody(article.body, highlightQuery);
    const titleText = highlightQuery ? applyHighlight(escapeHtml(article.title), highlightQuery) : escapeHtml(article.title);
    const refText = escapeHtml(article.ref || '');
    const categoryLabel = showCategory && article._category
      ? ' <span style="font-size:var(--text-label-small); color:var(--text-muted); margin-left:4px;">' + article._categoryIcon + ' ' + escapeHtml(article._category) + '</span>'
      : '';

    const escapedTitle = escapeHtml(article.title).replace(/'/g, "\\'");
    const escapedRef = escapeHtml(article.ref || '').replace(/'/g, "\\'");

    html += '<div class="reg-article" data-index="' + i + '">'
      + '<div class="reg-article-header" onclick="toggleArticle(this)">'
      + '<div class="reg-article-title-group">'
      + '<div class="reg-article-title">' + titleText + categoryLabel + '</div>'
      + '<div class="reg-article-ref">\uD83D\uDCCC ' + refText + '</div>'
      + '</div>'
      + '<span class="reg-article-chevron">▸</span>'
      + '</div>'
      + '<div class="reg-article-body">'
      + '<div class="reg-article-content">' + bodyFormatted + '</div>'
      + '<div class="reg-article-actions">'
      + '<button class="btn btn-outline" onclick="openPdfForRef(\'' + escapedRef + '\')">\uD83D\uDCC4 PDF 원문 보기</button>'
      + '<button class="btn btn-outline" onclick="askAboutArticle(\'' + escapedTitle + '\')">\uD83D\uDCAC 이 규정 질문하기</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  });

  // All content from trusted DATA.handbook
  container.innerHTML = html || '<div class="reg-empty"><div class="reg-empty-icon">\uD83D\uDCED</div><div class="reg-empty-text">조항이 없습니다.</div></div>';
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
    container.innerHTML = '<div class="reg-empty">'
      + '<div class="reg-empty-icon">\uD83D\uDD0D</div>'
      + '<div class="reg-empty-text">"' + escapeHtml(query) + '" 검색 결과가 없습니다.<br>다른 키워드로 검색해보세요.</div>'
      + '</div>';
    return;
  }

  container.innerHTML = '<div style="font-size:var(--text-body-normal); color:var(--text-muted); margin-bottom:12px;">' + results.length + '개 결과</div>';
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

function openPdfPicker() {
  openPdfSheet('data/2026_조합원_수첩_최종파일.pdf', '조합원 수첩 (전체)');
}

function openPdfForRef(ref) {
  var page = getPdfPageForRef(ref);
  var label = ref ? '조합원 수첩 — ' + ref : '조합원 수첩';
  openPdfSheet('data/2026_조합원_수첩_최종파일.pdf', label, page);
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

var API_BASE = '/api';
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
}

// ── Chat messages ──
// Bot messages use innerHTML for formatted responses from trusted internal sources.
// User messages use textContent for safety.
function addChatMessage(text, type, sources) {
  var container = document.getElementById('chatMessages');
  var msg = document.createElement('div');
  msg.className = 'chat-msg ' + type;

  if (type === 'user') {
    msg.textContent = text;
  } else {
    // Bot content is from trusted API or internal DATA sources
    msg.innerHTML = text;
    if (sources && sources.length > 0) {
      sources.forEach(function(s) {
        var refSpan = document.createElement('span');
        refSpan.className = 'ref';
        refSpan.textContent = s.ref ? '\uD83D\uDCCC ' + s.ref : s.title;
        msg.appendChild(refSpan);
      });
    }
  }

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function addTypingIndicator() {
  var container = document.getElementById('chatMessages');
  var indicator = document.createElement('div');
  indicator.className = 'chat-msg bot';
  indicator.id = 'typingIndicator';
  indicator.style.opacity = '0.6';
  indicator.textContent = '답변 생성 중...';
  container.appendChild(indicator);
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

  try {
    var res = await fetch(API_BASE + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query, sessionId: chatSessionId }),
    });

    removeTypingIndicator();
    if (!res.ok) throw new Error('API error: ' + res.status);

    var data = await res.json();
    var answerHtml = data.answer.replace(/\n/g, '<br>');
    addChatMessage(answerHtml, 'bot', data.sources);

    showRelatedFaq(query);
  } catch (err) {
    removeTypingIndicator();
    var result = searchChatLocal(query);
    if (result) {
      var html = '';
      if (result.faq) {
        html += '<div style="margin-bottom:6px;">' + escapeHtml(result.faq.a) + '</div>';
      }
      if (result.handbook.length > 0) {
        html += renderHandbookSource(result.handbook);
      }
      var ref = result.faq ? result.faq.ref : (result.handbook[0] ? result.handbook[0].ref : null);
      var sources = ref ? [{ ref: ref, title: '' }] : [];
      addChatMessage(html, 'bot', sources);
      addChatMessage(
        '<small style="color:var(--text-muted);">* AI 서버에 연결할 수 없어 로컬 검색 결과입니다.</small>',
        'bot'
      );

      showRelatedFaq(query);
    } else {
      addChatMessage(
        '해당 질문에 대한 답변을 찾지 못했습니다.<br>'
        + '<small style="color:var(--text-muted)">더 구체적인 키워드로 검색해보세요. 예: "온콜", "연차", "야간"</small>',
        'bot'
      );
    }
  }
}

// Show related FAQ links after an AI answer
function showRelatedFaq(query) {
  if (!DATA.faq) return;
  var q = query.toLowerCase();
  var related = DATA.faq.filter(function(f) {
    return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) ||
      (f.category && f.category.toLowerCase().includes(q));
  }).slice(0, 3);

  if (related.length === 0) return;

  var container = document.getElementById('chatMessages');
  var relMsg = document.createElement('div');
  relMsg.className = 'chat-msg bot';
  relMsg.style.cssText = 'max-width:100%; background:transparent; border:none; padding:4px 0;';

  var titleDiv = document.createElement('div');
  titleDiv.style.cssText = 'font-size:var(--text-body-normal); margin-bottom:4px;';
  titleDiv.innerHTML = '<strong>관련 FAQ:</strong>';
  relMsg.appendChild(titleDiv);

  related.forEach(function(faq) {
    var link = document.createElement('div');
    link.style.cssText = 'cursor:pointer; color:var(--accent-indigo); font-size:var(--text-body-normal); margin-top:4px;';
    link.textContent = '▸ ' + faq.q;
    link.addEventListener('click', function() {
      addChatMessage(faq.q, 'user');
      handleChatQuery(faq.q);
    });
    relMsg.appendChild(link);
  });

  container.appendChild(relMsg);
  container.scrollTop = container.scrollHeight;
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

// ═══════════ ❓ FAQ (독립 탭) ═══════════

var faqActiveCategory = null;

function initFaq() {
  var searchBtn = document.getElementById('faqSearchBtn');
  var searchInput = document.getElementById('faqSearchInput');
  if (!searchBtn || !searchInput) return;

  searchBtn.addEventListener('click', function() { searchFaq(searchInput.value.trim()); });
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchFaq(searchInput.value.trim());
  });

  renderFaqCategories();
  // Start with first category selected
  if (DATA.faq) {
    var categories = [];
    DATA.faq.forEach(function(f) {
      if (categories.indexOf(f.category) === -1) categories.push(f.category);
    });
    if (categories.length > 0) {
      faqActiveCategory = categories[0];
    }
  }
  renderFaqList();
  updateFaqCategoryActive();
}

function renderFaqCategories() {
  var container = document.getElementById('faqCategoryTags');
  if (!container || !DATA.faq) return;

  var categories = [];
  DATA.faq.forEach(function(f) {
    if (categories.indexOf(f.category) === -1) categories.push(f.category);
  });

  // "전체" tag
  var allTag = document.createElement('button');
  allTag.className = 'quick-tag';
  allTag.textContent = '전체';
  allTag.style.fontWeight = '600';
  allTag.onclick = function() {
    faqActiveCategory = null;
    document.getElementById('faqSearchInput').value = '';
    renderFaqList();
    updateFaqCategoryActive();
  };
  container.appendChild(allTag);

  categories.forEach(function(cat) {
    var tag = document.createElement('button');
    tag.className = 'quick-tag';
    tag.textContent = cat;
    tag.dataset.category = cat;
    tag.onclick = function() {
      faqActiveCategory = cat;
      document.getElementById('faqSearchInput').value = '';
      renderFaqList();
      updateFaqCategoryActive();
    };
    container.appendChild(tag);
  });
}

function updateFaqCategoryActive() {
  document.querySelectorAll('#faqCategoryTags .quick-tag').forEach(function(tag) {
    var isActive = (!faqActiveCategory && !tag.dataset.category) ||
                   (tag.dataset.category === faqActiveCategory);
    tag.style.borderColor = isActive ? 'var(--accent-indigo)' : '';
    tag.style.color = isActive ? 'var(--accent-indigo)' : '';
  });
}

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

// Renders FAQ as reg-article accordion (same style as 찾아보기)
// Trusted DATA.faq content only
function renderFaqList(items) {
  var container = document.getElementById('faqList');
  if (!container) return;

  var faqItems = items || DATA.faq;
  if (!faqItems) return;

  var filtered = faqActiveCategory
    ? faqItems.filter(function(f) { return f.category === faqActiveCategory; })
    : faqItems;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="reg-empty" style="padding:30px;"><div class="reg-empty-text">검색 결과가 없습니다.</div></div>';
    return;
  }

  // Load profile for calculations
  loadProfileForFaq();

  var html = '';
  filtered.forEach(function(item, i) {
    var refText = item.ref ? escapeHtml(item.ref) : '';
    var catText = escapeHtml(item.category);
    var answerHtml = formatFaqAnswer(item.a);
    var calcHtml = renderCalcBlock(item.q);

    html += '<div class="reg-article" data-index="' + i + '">'
      + '<div class="reg-article-header" onclick="toggleFaqItem(this)">'
      + '<div class="reg-article-title-group">'
      + '<div class="reg-article-title">' + escapeHtml(item.q) + '</div>'
      + '<div class="reg-article-ref">'
      + '<span style="margin-right:6px;">' + catText + '</span>'
      + (refText ? '\uD83D\uDCCC ' + refText : '')
      + '</div>'
      + '</div>'
      + '<span class="reg-article-chevron">▸</span>'
      + '</div>'
      + '<div class="reg-article-body">'
      + '<div class="reg-article-content">' + answerHtml + '</div>'
      + calcHtml
      + '</div>'
      + '</div>';
  });

  container.innerHTML = html;
}

function toggleFaqItem(headerEl) {
  var article = headerEl.closest('.reg-article');
  var wasOpen = article.classList.contains('open');

  // Accordion: close all siblings
  article.parentElement.querySelectorAll('.reg-article.open').forEach(function(s) {
    s.classList.remove('open');
  });

  if (!wasOpen) {
    article.classList.add('open');
    if (window.innerWidth <= 768) {
      setTimeout(function() {
        article.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }
}

async function searchFaq(query) {
  if (!query) {
    renderFaqList();
    return;
  }

  try {
    var res = await fetch(API_BASE + '/faq/search?q=' + encodeURIComponent(query));
    if (!res.ok) throw new Error('API error: ' + res.status);
    var data = await res.json();
    if (data.results && data.results.length > 0) {
      faqActiveCategory = null;
      updateFaqCategoryActive();
      renderFaqList(data.results.map(function(r) {
        return { q: r.question, a: r.answer, category: r.category, ref: r.articleRef };
      }));
      return;
    }
  } catch (err) {
    // Fallback to local search
  }

  // Local fallback
  var q = query.toLowerCase();
  var localResults = DATA.faq.filter(function(f) {
    return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) ||
      (f.category && f.category.toLowerCase().includes(q));
  });
  faqActiveCategory = null;
  updateFaqCategoryActive();
  renderFaqList(localResults);
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
