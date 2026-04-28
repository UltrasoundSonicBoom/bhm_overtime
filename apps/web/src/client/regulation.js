/* ============================================
   regulation.js — 규정/상담 페이지 로직 v3 — regulation.html 단일 ESM entry
   2-tab structure: 찾아보기 (FAQ 통합) / 물어보기

   Phase 2-G: regulation.html 의 8 script 통합 → 단일 type=module entry.

   Security note: All innerHTML usage in this file renders content from
   DATA.handbook and DATA.faq — trusted, hardcoded internal data sources
   defined in data.js. No user-supplied content is rendered as HTML.
   This matches the existing pattern used in app.js.
   ============================================ */
import './appLock.js';
import './shared-layout.js';
import '@snuhmate/shared-utils';
import '@snuhmate/data';
import '@snuhmate/profile/profile';
import '@snuhmate/calculators';
import { registerActions } from '@snuhmate/shared-utils';
// Phase 5: cross-module 명시 named import
import { DATA } from '@snuhmate/data';
import { PROFILE } from '@snuhmate/profile/profile';
import { CALC } from '@snuhmate/calculators';
import { escapeHtml } from '@snuhmate/shared-utils';
// pdf.js는 CDN — type=module HTML 에 명시 외부 로드 유지

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
// Phase 5-followup: 두 진입점 지원
//   1. regulation.html 단일 entry (DOMContentLoaded) — 직접 URL 접근
//   2. SPA tab-reference fragment 동적 로드 — window.initRegulationFragment() 호출
function _initRegulationAll() {
  if (typeof initTheme === 'function') initTheme();
  if (typeof initSubTabs === 'function') initSubTabs();
  if (typeof initBrowse === 'function') initBrowse();
  if (typeof initPdfSheet === 'function') initPdfSheet();
}
document.addEventListener('DOMContentLoaded', () => {
  // browseSearch DOM 이 있을 때만 초기화 (regulation.html 단독 진입)
  if (document.getElementById('browseSearch')) _initRegulationAll();
});
// SPA fragment 진입점 — tab-reference 로드 후 app.js 가 호출
if (typeof window !== 'undefined') {
  window.initRegulationFragment = _initRegulationAll;
}

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
// 키는 'theme' 하나로 통일 (값: 'neo' | 'linear'). 과거 'snuhmate-theme' 키는 1회성 마이그레이션 후 제거.
// 토글 UI는 현재 비활성 (shared-layout.js에서 themeBtn 주석 처리) — init만 수행.

function initTheme() {
  var legacy = localStorage.getItem('snuhmate-theme');
  if (legacy !== null) {
    localStorage.setItem('theme', legacy === 'neo' ? 'neo' : 'linear');
    localStorage.removeItem('snuhmate-theme');
  }
  var saved = localStorage.getItem('theme');
  if (saved === 'linear') {
    document.documentElement.removeAttribute('data-theme');
  }
}

// ═══════════ 📖 찾아보기 ═══════════

var browseActiveChapter = null; // null = "전체", 또는 장 이름 (예: "제4장 근로시간")

// ── 장(Chapter)별 아이콘 매핑 ──
var CHAPTER_ICONS = {
  '제1장 총칙': '📜',
  '제2장 조합 활동': '🤝',
  '제3장 인사': '👔',
  '제4장 근로시간': '⏰',
  '제5장 임금 및 퇴직금': '💰',
  '제6장 복리후생 및 교육훈련': '🎁',
  '제7장 안전보건, 재해보상': '🛡️',
  '제8장 단체교섭': '🤲',
  '제9장 노사협의회': '💬',
  '제10장 부칙': '📎',
  '별도 합의사항': '📝',
  '별첨': '📋'
};

// ── 숨김 장(Chapter) ──
// 실제 업무와 관련 없는 장은 찾아보기 탭에서 제외.
// 주석처리(해당 항목 삭제)하면 해당 장이 다시 표시됨.
var HIDDEN_CHAPTERS = {
  '제1장 총칙': true,
  '제2장 조합 활동': true,
  '제3장 인사': true,
  '제8장 단체교섭': true,
  '제9장 노사협의회': true,
  '제10장 부칙': true,
  '별도 합의사항': true,
  // '별첨': 표시됨 (보수표, 휴직제도 등 유용)
};

// ── 조항 → 담당 부서 매핑 (DATA.contacts 키와 일치) ──
// 장/제목 키워드 기반 휴리스틱
function getContactDeptForArticle(art) {
  var chapter = (art && art.chapter) || '';
  var title = (art && art.title) || '';

  // 안전보건 / 진료비
  if (/진료비|감면/.test(title)) return '외래/입원 원무과';
  if (/건강진단|건강관리|검진|근골격/.test(title)) return '건강증진센터';
  if (/재해|보상|요양|휴업|장해|유족/.test(title)) return '외래/입원 원무과';
  if (/안전보건위원회|안전보건교육/.test(title)) return '건강증진센터';
  // 복리후생
  if (/경조금/.test(title)) return '노사협력과';
  if (/어린이집|기숙사|제복|식사|복리후생/.test(title)) return '총무과';
  if (/제63조의2/.test(title)) return '인사팀 (일반/휴가)';
  // 임금
  if (/제5장/.test(chapter) || /상여금|퇴직금|퇴직수당|임금/.test(title)) return '인사팀 (급여계)';
  // 근로시간 / 인사
  if (/연차|청원휴가|휴가/.test(title)) return '인사팀 (일반/휴가)';
  if (/근로조건|근무시간|제32조|시간외|야간/.test(title)) return '인사팀 (일반/휴가)';
  if (/제3장/.test(chapter) || /인사원칙|인사/.test(title)) return '인사팀 (일반/휴가)';
  // 조합 활동, 총칙, 교섭, 노사협의회, 부칙
  if (/제[12]장|제[89]장|제10장|별도 합의/.test(chapter)) return '노동조합 (서울대병원분회)';
  // 별첨
  if (/별첨|보수표/.test(chapter) || /보수표|임금 구성/.test(title)) return '인사팀 (급여계)';
  return '노사협력과';
}

// ── 부서명 라벨 2줄 분리: "인사팀 (일반/휴가)" → "인사팀<br>일반/휴가" ──
function formatDeptLabel(deptName) {
  var match = /^(.+?)\s*\((.+)\)\s*$/.exec(deptName || '');
  if (match) return escapeHtml(match[1]) + '<br>' + escapeHtml(match[2]);
  return escapeHtml(deptName || '');
}

// ── 조항 ID를 안전하게 확보 (JSON id > ref 파싱 > title 파싱) ──
function getArticleId(article) {
  if (!article) return '';
  if (article.id) return String(article.id);
  var refRe = /(제[\d가-힣]+조(?:의\d+)?)/;
  var refHit = refRe.exec(article.ref || '');
  if (refHit) return 'art_' + refHit[1].replace(/[^0-9]/g, '');
  var titleHit = refRe.exec(article.title || '');
  if (titleHit) return 'art_' + titleHit[1].replace(/[^0-9]/g, '');
  return 'art_' + (article.title || '').slice(0, 10);
}

// ── 즐겨찾기 (localStorage) ──
function getFavStorageKey() {
  return window.getUserStorageKey ? window.getUserStorageKey('snuhmate_reg_favorites') : 'snuhmate_reg_favorites';
}
function loadFavorites() {
  try {
    var raw = localStorage.getItem(getFavStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveFavorites(arr) {
  try { localStorage.setItem(getFavStorageKey(), JSON.stringify(arr)); } catch (e) {}
  // Phase 8: Firestore write-through (로그인 시만, fire-and-forget)
  if (typeof window !== 'undefined' && window.__firebaseUid) {
    import('/src/firebase/sync/favorites-sync.js').then(m =>
      m.writeFavorites(null, window.__firebaseUid, arr)
    ).catch(err => {
      console.warn('[Phase 8] favorites cloud sync 실패 (무해)', err?.message || err);
    });
  }
}
function isFavorited(articleId) {
  return loadFavorites().indexOf(articleId) !== -1;
}
function toggleFavorite(articleId) {
  var favs = loadFavorites();
  var idx = favs.indexOf(articleId);
  if (idx === -1) favs.push(articleId);
  else favs.splice(idx, 1);
  saveFavorites(favs);
  return idx === -1;
}

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

  // 정적 JSON(union_regulation_2026.json)이 찾아보기의 표준 데이터 소스.
  // JSON 로드 실패 시 data.js의 DATA.handbook을 그대로 사용.
  tryLoadBrowseFromJson().then(function() {
    browseActiveChapter = null; // 기본 "전체"
    renderChapterTabs();
    renderFavChips();
    renderBrowseList();

    var searchInput = document.getElementById('browseSearch');
    var debounceTimer;
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() { searchBrowse(searchInput.value.trim()); }, 200);
    });
  });
}

/**
 * 정적 JSON (data/union_regulation_2026.json) 로드 → 장(Chapter) 기반 sections로 변환
 * → DATA.handbook에 저장.
 */
function tryLoadBrowseFromJson() {
  var url = '/data/union_regulation_2026.json';
  // file:// 에서도 동작하도록 상대경로 사용
  return fetch(url)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(articles) {
      if (!Array.isArray(articles) || articles.length === 0) return;
      var byChapter = {};
      var order = [];
      articles.forEach(function(art) {
        var ch = art.chapter || '기타';
        if (!byChapter[ch]) {
          byChapter[ch] = {
            category: ch,
            icon: CHAPTER_ICONS[ch] || '📄',
            articles: []
          };
          order.push(ch);
        }
        // content + clauses를 body로 병합 (fallback용)
        var bodyParts = [];
        if (art.content && art.content.trim()) bodyParts.push(art.content.trim());
        if (Array.isArray(art.clauses) && art.clauses.length) bodyParts.push(art.clauses.join('\n'));
        var ref = '';
        var titleRefRe = /(제[\d가-힣]+조(?:의\d+)?)/;
        var refHit = titleRefRe.exec(art.title || '');
        if (refHit) ref = refHit[1];
        byChapter[ch].articles.push({
          id: art.id,
          title: art.title || '',
          ref: ref,
          body: bodyParts.join('\n\n'),
          contactDept: getContactDeptForArticle(art),
          // 목업 구조 그대로 렌더하기 위해 원본 필드 보존
          _content: art.content || '',
          _clauses: Array.isArray(art.clauses) ? art.clauses : [],
          _history: art.history || [],
          _relatedAgreements: art.related_agreements || [],
          _tables: art.tables || []
        });
      });
      // HIDDEN_CHAPTERS에 포함된 장은 렌더에서 제외 (데이터는 JSON에 그대로 있음)
      var visibleOrder = order.filter(function(ch) { return !HIDDEN_CHAPTERS[ch]; });
      DATA.handbook = visibleOrder.map(function(ch) { return byChapter[ch]; });
      var visibleArticleCount = DATA.handbook.reduce(function(s, sec) { return s + sec.articles.length; }, 0);
      console.log('[regulation.js] Loaded handbook from JSON (' + DATA.handbook.length + ' chapters visible / ' + order.length + ' total, ' + visibleArticleCount + ' articles visible / ' + articles.length + ' total)');
    })
    .catch(function(err) {
      console.log('[regulation.js] JSON handbook load failed:', err.message);
    });
}

// ── 장(Chapter) 탭 좌/우 화살표 스크롤 ──
function scrollChapterTabs(direction) {
  var container = document.getElementById('browseChapterTabs');
  if (!container) return;
  var step = Math.max(120, container.clientWidth * 0.6);
  container.scrollBy({ left: step * direction, behavior: 'smooth' });
}

// ── 장(Chapter) 탭 렌더 ──
function renderChapterTabs() {
  var container = document.getElementById('browseChapterTabs');
  if (!container || !DATA.handbook) return;
  container.textContent = '';

  var totalCount = DATA.handbook.reduce(function(sum, s) { return sum + s.articles.length; }, 0);

  var mkTab = function(label, chapterKey, count) {
    var btn = document.createElement('button');
    btn.className = 'reg-chapter-tab';
    btn.dataset.chapter = chapterKey === null ? '' : chapterKey;
    // 라벨 + 개수 배지
    btn.appendChild(document.createTextNode(label));
    if (typeof count === 'number') {
      var countSpan = document.createElement('span');
      countSpan.className = 'reg-chapter-tab-count';
      countSpan.textContent = count;
      btn.appendChild(countSpan);
    }
    if ((chapterKey === null && browseActiveChapter === null) || chapterKey === browseActiveChapter) {
      btn.classList.add('active');
    }
    btn.onclick = function() {
      browseActiveChapter = chapterKey;
      document.getElementById('browseSearch').value = '';
      renderChapterTabs();
      renderBrowseList();
      var el = document.getElementById('browseArticles');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    container.appendChild(btn);
  };

  mkTab('전체', null, totalCount);
  DATA.handbook.forEach(function(section) {
    mkTab(section.category, section.category, section.articles.length);
  });
}

// ── 즐겨찾기 칩 렌더 ──
function renderFavChips() {
  var container = document.getElementById('browseFavChips');
  if (!container) return;
  container.textContent = '';

  var favs = loadFavorites();
  if (favs.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'reg-fav-chips-empty';
    empty.textContent = '☆ 아직 즐겨찾기한 규정이 없습니다. 조항 옆의 별을 눌러 추가하세요.';
    container.appendChild(empty);
    return;
  }

  // favs를 DATA.handbook에서 찾아서 칩으로
  var articleIndex = {};
  (DATA.handbook || []).forEach(function(section) {
    section.articles.forEach(function(a) {
      var id = getArticleId(a);
      articleIndex[id] = { article: a, section: section };
    });
  });

  favs.forEach(function(favId) {
    var hit = articleIndex[favId];
    if (!hit) return;
    var chip = document.createElement('button');
    chip.className = 'reg-fav-chip';
    chip.textContent = '⭐ ' + hit.article.title;
    chip.onclick = function() {
      // 해당 장으로 전환 후 조항 열기
      browseActiveChapter = hit.section.category;
      document.getElementById('browseSearch').value = '';
      renderChapterTabs();
      renderBrowseList();
      // 렌더 후 해당 카드 스크롤+open
      setTimeout(function() {
        var selector = '.reg-article[data-article-id="' + favId + '"]';
        var card = document.querySelector(selector);
        if (card) {
          card.classList.add('open');
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 80);
    };
    container.appendChild(chip);
  });
}

// ── 조항 리스트 렌더 ──
function renderBrowseList() {
  var container = document.getElementById('browseArticles');
  if (!container || !DATA.handbook) return;

  var articles = [];
  DATA.handbook.forEach(function(section) {
    if (!browseActiveChapter || section.category === browseActiveChapter) {
      section.articles.forEach(function(a) {
        articles.push(Object.assign({}, a, {
          _category: section.category,
          _categoryIcon: section.icon
        }));
      });
    }
  });

  renderArticles(articles, container, { showCategory: !browseActiveChapter });
}

// Renders article accordion from trusted DATA.handbook, with direct calculator blocks
// Security: All content from trusted DATA.handbook (hardcoded in data.js or union_regulation_2026.json)
function renderArticles(articles, container, options) {
  const opts = options || {};
  const highlightQuery = opts.highlight;
  const showCategory = opts.showCategory;

  var parts = [];

  articles.forEach(function(article, i) {
    // "제36조(연차 유급휴가)" → "연차 유급휴가" (배지에 이미 제36조 있으므로 중복 제거)
    var displayTitle = (article.title || '').replace(/^제[\d가-힣]+조(?:의\d+)?\s*\(([^)]+)\)\s*$/, '$1');
    if (!displayTitle || displayTitle === article.title) displayTitle = article.title || '';
    const titleText = highlightQuery ? applyHighlight(escapeHtml(displayTitle), highlightQuery) : escapeHtml(displayTitle);
    const refText = escapeHtml(article.ref || '');

    const escapedRef = (article.ref || '').replace(/'/g, "\\'");
    const articleId = getArticleId(article);
    const escapedArticleId = articleId.replace(/'/g, "\\'");
    const isFav = isFavorited(articleId);
    const favClass = isFav ? 'reg-article-fav active' : 'reg-article-fav';
    const favChar = isFav ? '★' : '☆';

    // 헤더 미리보기 (첫 clause의 앞 35자, 또는 content)
    var previewSrc = (article._clauses && article._clauses[0]) || article._content || article.body || '';
    previewSrc = previewSrc.replace(/^\(\d+\)\s*/, '').replace(/\s+/g, ' ').trim();
    var previewText = previewSrc.length > 38 ? previewSrc.slice(0, 38) + '…' : previewSrc;

    // 담당 부서
    const deptName = article.contactDept || getContactDeptForArticle({ chapter: article._category, title: article.title });
    const deptInfo = (DATA.contacts && DATA.contacts[deptName]) || { phone: '', email: '' };
    const deptLabel = formatDeptLabel(deptName);
    const telHref = deptInfo.phone ? 'tel:' + deptInfo.phone.replace(/-/g, '') : '#';
    const mailtoHref = buildSmartMailto(article, deptName, deptInfo.email || '');

    // 원문 박스 내용: content (리드) + clauses (불렛) + tables (표) + 제정이력 태그
    var origInner = '';
    if (article._content && article._content.trim()) {
      var leadHtml = highlightQuery
        ? applyHighlight(escapeHtml(article._content.trim()), highlightQuery)
        : escapeHtml(article._content.trim());
      origInner += '<div class="reg-orig-lead">' + leadHtml + '</div>';
    }
    if (Array.isArray(article._clauses) && article._clauses.length > 0) {
      origInner += '<ul class="reg-clause-list">';
      article._clauses.forEach(function(clause) {
        var m = /^\(([\d가-힣]+)\)\s*(.+)$/s.exec(clause);
        var numTxt = m ? m[1] : '·';
        var body = m ? m[2] : clause;
        if (highlightQuery) body = applyHighlight(escapeHtml(body), highlightQuery);
        else body = escapeHtml(body);
        origInner += '<li><span class="reg-clause-num">' + escapeHtml(numTxt) + '</span>' + body + '</li>';
      });
      origInner += '</ul>';
    } else if (!article._content && article.body) {
      // JSON 로드 안된 경우의 fallback
      origInner += '<div class="reg-article-content">' + formatBody(article.body, highlightQuery) + '</div>';
    }
    // 데이터 표 (상여금 표, 퇴직금 지급률 표 등)
    if (Array.isArray(article._tables) && article._tables.length > 0) {
      article._tables.forEach(function(tbl) {
        if (!tbl || !tbl.headers || !tbl.rows) return;
        origInner += '<div class="reg-data-table-wrap">';
        if (tbl.title) origInner += '<div class="reg-data-table-title">' + escapeHtml(tbl.title) + '</div>';
        origInner += '<div class="reg-data-table-scroll"><table class="reg-data-table"><thead><tr>';
        tbl.headers.forEach(function(h) {
          origInner += '<th>' + escapeHtml(String(h)) + '</th>';
        });
        origInner += '</tr></thead><tbody>';
        tbl.rows.forEach(function(row) {
          origInner += '<tr>';
          row.forEach(function(cell) {
            origInner += '<td>' + escapeHtml(String(cell)) + '</td>';
          });
          origInner += '</tr>';
        });
        origInner += '</tbody></table></div></div>';
      });
    }
    // 제정/개정 이력 태그
    if (Array.isArray(article._history) && article._history.length > 0) {
      article._history.forEach(function(h) {
        if (h.date && h.date !== 'unknown') {
          var dateStr = String(h.date).replace(/-/g, '.');
          origInner += '<span class="reg-history-tag">📝 ' + escapeHtml(h.type || '개정') + ' ' + escapeHtml(dateStr) + '</span>';
        }
      });
    }

    // 부속 합의 (별도 박스로 렌더)
    var relatedHtml = '';
    if (Array.isArray(article._relatedAgreements) && article._relatedAgreements.length > 0) {
      article._relatedAgreements.forEach(function(ra) {
        if (!ra) return;
        relatedHtml += '<div class="reg-box-related">';
        relatedHtml += '<span class="reg-box-label reg-box-label-related">🔗 부속합의' + (ra.date ? ' · ' + escapeHtml(ra.date) : '') + '</span>';
        if (ra.title) relatedHtml += '<div class="reg-related-title">' + escapeHtml(ra.title) + '</div>';
        if (ra.content) {
          var raBody = highlightQuery
            ? applyHighlight(escapeHtml(ra.content), highlightQuery)
            : escapeHtml(ra.content);
          relatedHtml += '<div class="reg-related-content">' + raBody + '</div>';
        }
        relatedHtml += '</div>';
      });
    }

    // 계산기 (프로필 이름 + 근속 포함)
    var calcKey = ARTICLE_CALCULATORS[article.title];
    var calcBlock = '';
    if (calcKey) {
      try { calcBlock = renderCalcBlock(calcKey) || ''; } catch (e) { calcBlock = ''; }
    }

    parts.push('<div class="reg-article" data-index="' + i + '" data-article-id="' + escapeHtml(articleId) + '">'
      + '<div class="reg-article-header" data-action="toggleArticle">'
      + '<span class="reg-article-num">' + refText + '</span>'
      + '<div class="reg-article-title-group">'
      + '<div class="reg-article-title">' + titleText + '</div>'
      + (previewText ? '<div class="reg-article-preview">' + escapeHtml(previewText) + '</div>' : '')
      + '</div>'
      + '<span class="' + favClass + '" data-action="handleFavClick" data-article-id="' + escapedArticleId + '" title="즐겨찾기">' + favChar + '</span>'
      + '<span class="reg-article-chevron">▸</span>'
      + '</div>'
      + '<div class="reg-article-body">'
      // ── 주황 원문 박스 ──
      + '<div class="reg-box-orig">'
      +   '<span class="reg-box-label reg-box-label-orig">📜 규정 원문</span>'
      +   origInner
      + '</div>'
      // ── 부속 합의 박스 (라벤더) ──
      + relatedHtml
      + calcBlock
      // ── 파랑 연락망 박스 (3버튼 통합) — AI 질문 버튼은 차후 고도화 예정 ──
      + '<div class="reg-box-contact">'
      +   '<span class="reg-box-label reg-box-label-contact">📞 담당 부서</span>'
      +   '<div class="reg-contact-dept">' + escapeHtml(deptName) + '</div>'
      +   '<div class="reg-action-grid-3">'
      +     '<button class="reg-action-btn btn-pdf" data-action="openPdfForRef" data-pdf-ref="' + escapedRef + '">📄<br>PDF<span class="reg-action-btn-sub">원문 보기</span></button>'
      +     '<a class="reg-action-btn btn-call" href="' + telHref + '">📞<br>전화' + (deptInfo.phone ? '<span class="reg-action-btn-sub">' + escapeHtml(deptInfo.phone) + '</span>' : '') + '</a>'
      +     '<a class="reg-action-btn btn-mail" href="' + mailtoHref + '">✉️<br>이메일<span class="reg-action-btn-sub">' + escapeHtml(deptInfo.email || '문의') + '</span></a>'
      // AI 질문 버튼 (차후 RAG 고도화):
      // + '<button class="reg-action-btn" onclick="askAboutArticle(\'' + escapeHtml(article.title).replace(/\u0027/g, "\\u0027") + '\')">💬 AI 질문</button>'
      +   '</div>'
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

// ── 즐겨찾기 토글 (카드 확장/축소와 분리) ──
function handleFavClick(event, articleId) {
  event.stopPropagation();
  var added = toggleFavorite(articleId);
  // 별 아이콘 즉시 업데이트
  var star = event.target;
  if (added) {
    star.classList.add('active');
    star.textContent = '★';
  } else {
    star.classList.remove('active');
    star.textContent = '☆';
  }
  // 즐겨찾기 칩 영역 재렌더
  renderFavChips();
}

// ── 스마트 mailto: 프로필 + 규정 원문 + 계산 결과를 포함한 메일 초안 생성 ──
function buildSmartMailto(article, deptName, email) {
  if (!email) return '#';
  var profile = _cachedProfile || {};
  var wage = _cachedWage || null;

  var subject = '[규정 문의] ' + (article.title || '') + ' 관련 문의';

  // 근속연수 계산
  var serviceStr = '';
  if (profile.hireDate) {
    var hd = new Date(profile.hireDate);
    if (!isNaN(hd.getTime())) {
      var now = new Date();
      var months = (now.getFullYear() - hd.getFullYear()) * 12 + (now.getMonth() - hd.getMonth());
      var years = Math.floor(months / 12);
      serviceStr = years + '년 ' + (months % 12) + '개월';
    }
  }

  var profileLines = [];
  profileLines.push('- 사번: ' + (profile.employeeNumber || ''));
  profileLines.push('- 성명: ' + (profile.name || ''));
  profileLines.push('- 소속: ' + (profile.department || ''));
  if (profile.jobType || profile.grade) {
    profileLines.push('- 직종/직급: ' + (profile.jobType || '') + (profile.grade ? ' / ' + profile.grade : ''));
  }
  if (serviceStr) profileLines.push('- 근속: ' + serviceStr);

  // 해당 조항 계산 결과 (있는 경우)
  var calcLines = [];
  if (wage) {
    if (wage.monthlyWage) calcLines.push('- 월 통상임금: ' + wage.monthlyWage.toLocaleString('ko-KR') + '원');
    if (wage.hourlyRate) calcLines.push('- 시급: ' + wage.hourlyRate.toLocaleString('ko-KR') + '원');
  }
  var calcKey = ARTICLE_CALCULATORS[article.title];
  if (calcKey) {
    try {
      var calcFn = FAQ_CALCULATORS[calcKey];
      if (calcFn) {
        var calcResult = calcFn(profile, wage);
        if (calcResult && calcResult.rows) {
          calcLines.push('');
          calcLines.push('[' + calcResult.label + ']');
          calcResult.rows.forEach(function(row) {
            calcLines.push('- ' + row[0] + ': ' + row[1]);
          });
        }
      }
    } catch (e) { /* 계산 실패 시 생략 */ }
  }

  var bodyLines = [
    '안녕하세요, ' + (deptName || '') + ' 담당자님.',
    '',
    '아래 규정 관련하여 문의드립니다.',
    '',
    '[내 정보]',
  ].concat(profileLines);

  if (calcLines.length > 0) {
    bodyLines.push('');
    bodyLines.push('[내 정보 기준 계산]');
    calcLines.forEach(function(l) { bodyLines.push(l); });
  }

  bodyLines.push('');
  bodyLines.push('[관련 규정]');
  bodyLines.push(article.title || '');
  if (article.body) {
    bodyLines.push('');
    // 규정 원문이 너무 길지 않도록 500자로 제한
    var snippet = article.body.length > 500 ? (article.body.slice(0, 500) + '...') : article.body;
    bodyLines.push(snippet);
  }

  bodyLines.push('');
  bodyLines.push('[문의 내용]');
  bodyLines.push('(여기에 상세 내용을 작성해 주세요)');
  bodyLines.push('');
  bodyLines.push('감사합니다.');

  var body = bodyLines.join('\n');
  return 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
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

// escapeHtml은 shared-utils.js에서 window 전역으로 제공됨.

function getHandbookPdfUrl() {
  // file:// 프로토콜에서는 PDF.js가 상대경로를 못 읽으므로 절대 URL 사용
  if (window.location.protocol === 'file:') {
    return window.location.href.replace(/\/[^/]*$/, '/data/2026_handbook.pdf');
  }
  return '/data/2026_handbook.pdf';
}

function openPdfPicker() {
  openPdfSheet(getHandbookPdfUrl(), '조합원 수첩 (전체)');
}

function openPdfForRef(ref) {
  var page = getPdfPageForRef(ref);
  var label = ref ? '조합원 수첩 — ' + ref : '조합원 수첩';
  openPdfSheet(getHandbookPdfUrl(), label, page);
}

// AI 챗봇 (물어보기) 섹션 제거됨. 정적 규정 브라우징만 남김.

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
    return '<div class="reg-box-calc reg-box-calc-empty">'
      + '📊 <a href="index.html#profile">내 정보</a>를 입력하면 실제 금액을 계산해드립니다.'
      + '</div>';
  }

  // 프로필 이름/근속이 있으면 라벨에 병기 (목업의 "내 연차 계산 (김간호, 7년차)" 형식)
  var labelSuffix = '';
  if (_cachedProfile && _cachedProfile.name) {
    var parts = [_cachedProfile.name];
    if (_cachedProfile.hireDate) {
      var hd = new Date(_cachedProfile.hireDate);
      if (!isNaN(hd.getTime())) {
        var years = Math.floor((new Date() - hd) / (365.25 * 24 * 60 * 60 * 1000));
        if (years >= 1) parts.push(years + '년차');
      }
    }
    labelSuffix = ' (' + parts.join(', ') + ')';
  }

  var html = '<div class="reg-box-calc">';
  html += '<div class="reg-box-calc-title">📊 ' + escapeHtml(result.label) + escapeHtml(labelSuffix) + '</div>';
  result.rows.forEach(function(row) {
    html += '<div class="reg-box-calc-row">'
      + '<span class="reg-box-calc-label">' + escapeHtml(row[0]) + '</span>'
      + '<span class="reg-box-calc-value">' + row[1] + '</span>'
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
  if (typeof window.loadPDFJS === 'function') {
    try { await window.loadPDFJS(); } catch (e) { /* fallthrough */ }
  }
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

// Phase 3-A: 정적 HTML 6 onclick 위임 등록
// Phase 3-E: regulation.js 동적 markup 3 onclick 추가
registerActions({
  pdfPrevPage: () => pdfPrevPage(),
  pdfNextPage: () => pdfNextPage(),
  pdfZoom: (el) => pdfZoom(parseFloat(el.dataset.zoomDelta)),
  scrollChapterTabs: (el) => scrollChapterTabs(parseInt(el.dataset.scrollDirection, 10)),
  // Phase 3-E
  toggleArticle: (el) => toggleArticle(el),  // 기존: toggleArticle(this) — el 자체 전달
  handleFavClick: (el, e) => handleFavClick(e, el.dataset.articleId),
  openPdfForRef: (el) => openPdfForRef(el.dataset.pdfRef),
});

// Phase 2-regression: inline onclick window 노출 (ESM 모듈 스코프 회복)
// Phase 3-F 에서 KEEP/REMOVE 결정 — regulation.js 동적 markup onclick (handleFavClick/openPdfForRef/toggleArticle) 잔존

