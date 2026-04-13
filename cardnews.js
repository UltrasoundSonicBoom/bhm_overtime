// ============================================================
// cardnews.js v3 — news.hada.io 스타일 뉴스 큐레이션 피드
// 키워드별 top 3 뉴스·논문을 개별 항목으로 보여줌
// ============================================================

const PIPELINE = window.CARDNEWS_PIPELINE || {
  cadenceHours: 48,
  lookbackDays: 2,
  supplementDays: 14,
  sourceLimitPerCategory: 3,
  categories: [],
};

const CATEGORY_CONFIGS = Array.isArray(PIPELINE.categories) ? PIPELINE.categories : [];
const DAILY_KEYWORD = '의료AI';
const DEFAULT_KEYWORDS = [DAILY_KEYWORD];
const MAX_CUSTOM_KEYWORDS = 3;
const MAX_KEYWORDS = DEFAULT_KEYWORDS.length + MAX_CUSTOM_KEYWORDS;

const STORAGE_KEYS = {
  keywords: 'cardnews.keywords',
  items: 'cardnews.items',
  lastCollectedAt: 'cardnews.lastCollectedAt',
  settings: 'cardnews.settings',
};

const state = {
  keywords: [],
  items: [],
  lastCollectedAt: '',
  loading: false,
  requestId: 0,
  settings: { lookbackDays: 2, sourceType: 'all' },
};

// ── Utilities ──

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stripHtml(v) {
  return String(v ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function truncateText(v, max) {
  if (max === undefined) max = 120;
  var t = String(v ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max - 1).trim() + '…';
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function keywordKey(v) { return String(v ?? '').toLowerCase().replace(/\s+/g, ''); }

function uniqueBy(list, getKey) {
  var seen = new Set();
  return list.filter(function (item) {
    var k = getKey(item);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseDateValue(v) {
  var d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function sortByFreshness(list) {
  return list.slice().sort(function (a, b) { return parseDateValue(b.publishedAt) - parseDateValue(a.publishedAt); });
}

function sourceMatchesTerms(source, terms) {
  if (!Array.isArray(terms) || !terms.length) return true;
  var h = (source.title + ' ' + source.summary + ' ' + source.source).toLowerCase();
  return terms.some(function (t) { return h.includes(String(t).toLowerCase()); });
}

function isFarFutureDate(v) {
  var ts = parseDateValue(v);
  return ts ? ts > Date.now() + 30 * 86400000 : false;
}

function normalizeKeywords(raw) {
  var kws = [], seen = new Set();
  raw.forEach(function (r) {
    String(r ?? '').split(/[\n,]/).map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean).forEach(function (kw) {
      var k = keywordKey(kw);
      if (!k || seen.has(k)) return;
      seen.add(k);
      kws.push(kw);
    });
  });
  return kws.slice(0, MAX_KEYWORDS);
}

function formatDateLabel(v) {
  if (!v) return '';
  var d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
}

function relativeTime(v) {
  if (!v) return '';
  var ms = Date.now() - parseDateValue(v);
  if (ms < 0) return '';
  var h = Math.floor(ms / 3600000);
  if (h < 1) return '방금';
  if (h < 24) return h + '시간 전';
  var d = Math.floor(h / 24);
  if (d < 30) return d + '일 전';
  return formatDateLabel(v);
}

function getDateDaysAgo(days) {
  var d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function rebuildAbstract(idx) {
  if (!idx || typeof idx !== 'object') return '';
  var words = [];
  Object.entries(idx).forEach(function (entry) {
    if (!Array.isArray(entry[1])) return;
    entry[1].forEach(function (pos) { words[pos] = entry[0]; });
  });
  return words.join(' ').replace(/\s+/g, ' ').trim();
}

// ── Category / Keyword helpers ──

function getCategoryConfig(keyword) {
  var k = keywordKey(keyword);
  return CATEGORY_CONFIGS.find(function (c) { return keywordKey(c.label) === k; }) || null;
}

function isDefaultKeyword(kw) { return Boolean(getCategoryConfig(kw)); }

function sortKeywordsByCategoryOrder(kws) {
  return kws.slice().sort(function (a, b) {
    var ai = DEFAULT_KEYWORDS.findIndex(function (d) { return keywordKey(d) === keywordKey(a); });
    var bi = DEFAULT_KEYWORDS.findIndex(function (d) { return keywordKey(d) === keywordKey(b); });
    var sa = ai === -1 ? DEFAULT_KEYWORDS.length + kws.indexOf(a) : ai;
    var sb = bi === -1 ? DEFAULT_KEYWORDS.length + kws.indexOf(b) : bi;
    return sa - sb;
  });
}

function hasKeyword(kw) {
  var k = keywordKey(kw);
  return state.keywords.some(function (i) { return keywordKey(i) === k; });
}

// ── Persistence ──

function loadStoredKeywords() {
  var params = new URLSearchParams(window.location.search);
  var fromUrl = params.get('keywords');
  if (fromUrl) return sortKeywordsByCategoryOrder(normalizeKeywords([fromUrl]));
  try {
    var stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.keywords) || '[]');
    if (Array.isArray(stored) && stored.length) return sortKeywordsByCategoryOrder(normalizeKeywords(stored));
  } catch (e) {}
  return DEFAULT_KEYWORDS.length ? DEFAULT_KEYWORDS.slice() : [];
}

function loadStoredItems() {
  try {
    var stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.items) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (e) { return []; }
}

function loadSettings() {
  try {
    var s = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
    return {
      lookbackDays: [2, 7, 30].indexOf(s.lookbackDays) !== -1 ? s.lookbackDays : 2,
      sourceType: ['all', 'news', 'paper'].indexOf(s.sourceType) !== -1 ? s.sourceType : 'all',
    };
  } catch (e) { return { lookbackDays: 2, sourceType: 'all' }; }
}

function persistState() {
  localStorage.setItem(STORAGE_KEYS.keywords, JSON.stringify(state.keywords));
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
  localStorage.setItem(STORAGE_KEYS.lastCollectedAt, state.lastCollectedAt || '');
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

// ── Status ──

function setStatus(msg, tone) {
  var el = document.getElementById('cnStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.dataset.tone = tone || 'info';
  el.classList.toggle('active', Boolean(msg));
}

// ── Data fetching ──

function fetchJsonWithTimeout(url, timeoutMs) {
  if (!timeoutMs) timeoutMs = 26000;
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs);
  return fetch(url, { signal: ctrl.signal })
    .then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) {}
        if (!res.ok) throw new Error((data && data.message) || '요청 실패 (' + res.status + ')');
        return data;
      });
    })
    .catch(function (err) {
      if (err && err.name === 'AbortError') throw new Error('응답이 늦어졌습니다. 잠시 후 다시 시도해 주세요.');
      throw err;
    })
    .finally(function () { clearTimeout(timer); });
}

function splitNewsTitleAndSource(v) {
  var clean = stripHtml(v);
  var i = clean.lastIndexOf(' - ');
  if (i === -1) return { title: clean, source: 'Google 뉴스' };
  return { title: clean.slice(0, i).trim(), source: clean.slice(i + 3).trim() || 'Google 뉴스' };
}

function resolveQueries(keyword) {
  var cat = getCategoryConfig(keyword);
  if (cat) return {
    news: uniqueBy([keyword].concat(cat.newsQueries || []), keywordKey),
    papers: uniqueBy([keyword].concat(cat.paperQueries || []), keywordKey),
    category: cat,
  };
  return { news: [keyword], papers: [keyword], category: null };
}

async function fetchGoogleNewsBatch(keyword, lookbackDays) {
  var ref = resolveQueries(keyword);
  var newsQueries = ref.news;
  var category = ref.category;
  var lastErr = null;
  var merged = [];

  for (var qi = 0; qi < newsQueries.length; qi++) {
    var query = newsQueries[qi];
    try {
      var rssUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query + ' when:' + lookbackDays + 'd') + '&hl=ko&gl=KR&ceid=KR:ko';
      var url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rssUrl);

      for (var attempt = 0; attempt < 4; attempt++) {
        var data = await fetchJsonWithTimeout(url, 24000);
        if (data && data.status === 'ok') {
          var items = Array.isArray(data.items) ? data.items : [];
          var mapped = items.map(function (item, idx) {
            var parsed = splitNewsTitleAndSource(item.title || item.description || '');
            var desc = stripHtml(item.description || item.content || '');
            return {
              id: keywordKey(keyword) + '-news-' + (keywordKey(parsed.title).slice(0, 18) || idx + 1) + '-' + (idx + 1),
              keyword: keyword,
              kind: 'news',
              title: parsed.title || truncateText(desc, 90) || (keyword + ' 관련 기사'),
              source: parsed.source || 'Google 뉴스',
              url: /^https?:\/\//.test(item.link || '') ? item.link : '',
              publishedAt: item.pubDate || '',
              summary: desc || parsed.title || (keyword + ' 관련 최근 기사입니다.'),
            };
          });
          var filtered = mapped
            .filter(function (it) { return !isFarFutureDate(it.publishedAt); })
            .filter(function (it) { return sourceMatchesTerms(it, category && category.newsTerms); });
          merged = uniqueBy(merged.concat(filtered), function (it) { return keywordKey(it.title) + '|' + keywordKey(it.source) + '|' + it.url; });
          break;
        }
        if (data && typeof data.message === 'string' && data.message.includes('processed')) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        throw new Error((data && data.message) || '뉴스 피드를 정리하지 못했습니다.');
      }
    } catch (e) { lastErr = e; }
  }
  if (!merged.length && lastErr) throw lastErr;
  return sortByFreshness(merged).slice(0, 6);
}

async function resolveOriginalUrl(url) {
  if (!/^https?:\/\//.test(url || '')) return url || '';
  if (!/news\.google\.com\//i.test(url)) return url;
  try {
    var res = await fetch(API_BASE + '/card-news/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url }),
    });
    var data = await res.json();
    return (data && data.finalUrl) || url;
  } catch (e) { return url; }
}

async function resolveItemUrls(items) {
  await Promise.all(items.map(async function (it) {
    it.url = await resolveOriginalUrl(it.url);
  }));
  return items;
}

async function fetchGoogleNews(keyword, lookbackDays) {
  var fresh = await fetchGoogleNewsBatch(keyword, lookbackDays).catch(function () { return []; });
  var items;
  if (fresh.length >= (PIPELINE.sourceLimitPerCategory || 3)) {
    items = fresh;
  } else {
    var supp = PIPELINE.supplementDays || 14;
    if (lookbackDays >= supp) {
      items = fresh;
    } else {
      var fallback = await fetchGoogleNewsBatch(keyword, supp).catch(function () { return []; });
      items = sortByFreshness(uniqueBy(fresh.concat(fallback), function (it) { return keywordKey(it.title) + '|' + it.url; })).slice(0, 6);
    }
  }
  return resolveItemUrls(items);
}

async function fetchOpenAlexBatch(keyword, lookbackDays) {
  var ref = resolveQueries(keyword);
  var paperQueries = ref.papers;
  var category = ref.category;
  var lastErr = null;
  var merged = [];
  var fromDate = getDateDaysAgo(lookbackDays);

  for (var qi = 0; qi < paperQueries.length; qi++) {
    var query = paperQueries[qi];
    try {
      var url = 'https://api.openalex.org/works?search=' + encodeURIComponent(query) + '&filter=has_abstract:true,from_publication_date:' + fromDate + '&sort=publication_date:desc&per-page=6';
      var data = await fetchJsonWithTimeout(url, 22000);
      var results = Array.isArray(data.results) ? data.results : [];
      var papers = results.map(function (item, idx) {
        var abstract = rebuildAbstract(item.abstract_inverted_index);
        var src = (item.primary_location && item.primary_location.source && item.primary_location.source.display_name) || 'OpenAlex';
        var landing = (item.primary_location && item.primary_location.landing_page_url) || (item.ids && item.ids.doi) || item.id || '#';
        var metaParts = [];
        if (item.publication_year) metaParts.push(String(item.publication_year));
        if (typeof item.cited_by_count === 'number') metaParts.push('인용 ' + item.cited_by_count);
        return {
          id: keywordKey(keyword) + '-paper-' + (keywordKey(item.display_name || item.title || 'paper-' + (idx + 1))).slice(0, 18) + '-' + (idx + 1),
          keyword: keyword,
          kind: 'paper',
          title: item.display_name || item.title || (keyword + ' 관련 연구'),
          source: src,
          url: landing,
          publishedAt: item.publication_date || (item.publication_year ? String(item.publication_year) : ''),
          summary: abstract || (src + '에 공개된 관련 연구입니다.'),
          meta: metaParts.join(' · '),
        };
      });
      var filtered = papers
        .filter(function (it) { return !isFarFutureDate(it.publishedAt); })
        .filter(function (it) { return sourceMatchesTerms(it, category && category.paperTerms); });
      merged = uniqueBy(merged.concat(filtered), function (it) { return keywordKey(it.title) + '|' + keywordKey(it.source) + '|' + it.url; });
    } catch (e) { lastErr = e; }
  }
  if (!merged.length && lastErr) throw lastErr;
  return sortByFreshness(merged).slice(0, 6);
}

async function fetchOpenAlex(keyword, lookbackDays) {
  var fresh = await fetchOpenAlexBatch(keyword, lookbackDays).catch(function () { return []; });
  if (fresh.length >= 1) return fresh;
  var supp = PIPELINE.supplementDays || 14;
  if (lookbackDays >= supp) return fresh;
  var fallback = await fetchOpenAlexBatch(keyword, supp).catch(function () { return []; });
  return sortByFreshness(uniqueBy(fresh.concat(fallback), function (it) { return keywordKey(it.title) + '|' + it.url; })).slice(0, 6);
}

// ── Source selection (top N per keyword) ──

function selectTopSources(keyword, news, papers) {
  var cat = getCategoryConfig(keyword);
  var mix = (cat && Array.isArray(cat.mix) && cat.mix.length) ? cat.mix : ['news', 'paper', 'news'];
  var selected = [];
  var used = new Set();
  var limit = PIPELINE.sourceLimitPerCategory || 3;

  function pick(kind) {
    var list = kind === 'paper' ? papers : news;
    var next = list.find(function (it) { return !used.has(it.id); });
    if (!next) return;
    used.add(next.id);
    selected.push(next);
  }

  mix.forEach(pick);

  // Fill up to limit
  var combined = uniqueBy(news.concat(papers), function (it) { return it.id; });
  combined.forEach(function (it) {
    if (selected.length >= limit) return;
    if (used.has(it.id)) return;
    used.add(it.id);
    selected.push(it);
  });

  return selected.slice(0, limit);
}

// ── Data collection ──

async function collectItemsForKeyword(keyword) {
  var lookback = state.settings.lookbackDays || 2;
  var srcType = state.settings.sourceType || 'all';

  var newsPromise = (srcType === 'paper') ? Promise.resolve([]) : fetchGoogleNews(keyword, lookback);
  var paperPromise = (srcType === 'news') ? Promise.resolve([]) : fetchOpenAlex(keyword, lookback);

  var results = await Promise.allSettled([newsPromise, paperPromise]);
  var news = results[0].status === 'fulfilled' ? results[0].value : [];
  var papers = results[1].status === 'fulfilled' ? results[1].value : [];

  // Attach keyword to each item
  news.forEach(function (it) { it.keyword = keyword; });
  papers.forEach(function (it) { it.keyword = keyword; });

  return selectTopSources(keyword, news, papers);
}

async function collectAll(keywords) {
  if (state.loading) return;
  var targets = sortKeywordsByCategoryOrder(normalizeKeywords(keywords && keywords.length ? keywords : state.keywords));
  if (!targets.length) { setStatus('카테고리를 먼저 선택하세요.', 'error'); return; }

  state.loading = true;
  state.requestId++;
  var rid = state.requestId;
  setLoading(true);

  var allItems = [];
  try {
    for (var i = 0; i < targets.length; i++) {
      var kw = targets[i];
      setStatus((i + 1) + '/' + targets.length + ' ' + kw + ' 수집 중…', 'info');
      var items = await collectItemsForKeyword(kw);
      if (rid !== state.requestId) return;
      allItems = allItems.concat(items);
    }

    // Replace items for target keywords, keep others
    var targetKeys = new Set(targets.map(keywordKey));
    var kept = state.items.filter(function (it) { return !targetKeys.has(keywordKey(it.keyword)); });
    state.items = sortByFreshness(kept.concat(allItems));
    state.lastCollectedAt = new Date().toISOString();
    persistState();
    renderFeed();
    renderCatTabs();
    setStatus(allItems.length + '건의 뉴스·논문을 수집했습니다.', 'success');
  } catch (e) {
    setStatus(e.message || '수집에 실패했습니다.', 'error');
  } finally {
    if (rid === state.requestId) {
      state.loading = false;
      setLoading(false);
    }
  }
}

async function collectDailyAutoItems() {
  if (state.loading) return;
  var DAILY_LIMIT = 3;

  state.loading = true;
  state.requestId++;
  var rid = state.requestId;
  setLoading(true);

  try {
    setStatus(DAILY_KEYWORD + ' 자동 수집 중…', 'info');
    var lookback = state.settings.lookbackDays || 2;
    var news = await fetchGoogleNews(DAILY_KEYWORD, lookback).catch(function () { return []; });
    if (rid !== state.requestId) return;

    var items = news
      .filter(function (it) { return /^https?:\/\//.test(it.url || ''); })
      .slice(0, DAILY_LIMIT);
    items.forEach(function (it) { it.keyword = DAILY_KEYWORD; });

    var key = keywordKey(DAILY_KEYWORD);
    var kept = state.items.filter(function (it) { return keywordKey(it.keyword) !== key; });
    state.items = sortByFreshness(kept.concat(items));
    state.lastCollectedAt = new Date().toISOString();
    persistState();
    renderFeed();
    renderCatTabs();

    setStatus(items.length + '건 수집·요약 중…', 'info');
    await Promise.allSettled(items.map(function (it) {
      return fetchSummary(it.url, it.title, it.summary);
    }));
    if (rid !== state.requestId) return;
    setStatus(DAILY_KEYWORD + ' ' + items.length + '건 자동 수집·요약 완료.', 'success');
  } catch (e) {
    setStatus(e.message || '자동 수집에 실패했습니다.', 'error');
  } finally {
    if (rid === state.requestId) {
      state.loading = false;
      setLoading(false);
    }
  }
}

function setLoading(on) {
  var btn = document.getElementById('csGenBtn');
  var refresh = document.getElementById('cnRefreshBtn');
  if (btn) btn.disabled = on;
  if (refresh) refresh.disabled = on;
}

// ── Rendering: Header sub ──

function updateHdSub() {
  // Header removed — no-op
}

// ── Rendering: Category tabs ──

function getActiveTabKeyword() {
  var active = document.querySelector('#catTabs .ctab.on');
  if (!active) return null;
  var text = active.textContent.trim();
  return text === '전체' ? null : text;
}

function renderCatTabs() {
  var tabsEl = document.getElementById('catTabs');
  if (!tabsEl) return;
  while (tabsEl.firstChild) tabsEl.removeChild(tabsEl.firstChild);

  var allTab = document.createElement('div');
  allTab.className = 'ctab on';
  allTab.textContent = '전체';
  allTab.addEventListener('click', function () {
    tabsEl.querySelectorAll('.ctab').forEach(function (t) { t.classList.remove('on'); });
    allTab.classList.add('on');
    renderFeed();
  });
  tabsEl.appendChild(allTab);

  state.keywords.forEach(function (kw) {
    var tab = document.createElement('div');
    tab.className = 'ctab';
    tab.textContent = kw;
    tab.addEventListener('click', function () {
      tabsEl.querySelectorAll('.ctab').forEach(function (t) { t.classList.remove('on'); });
      tab.classList.add('on');
      renderFeed();
    });
    tabsEl.appendChild(tab);
  });

  // Append action buttons to tabs row
  var actions = document.createElement('div');
  actions.className = 'cat-tabs-actions';
  var refreshBtn = document.createElement('button');
  refreshBtn.className = 'cn-icon-btn';
  refreshBtn.id = 'cnRefreshBtn';
  refreshBtn.title = '새로고침';
  refreshBtn.textContent = '↻';
  refreshBtn.disabled = state.loading;
  refreshBtn.addEventListener('click', function () { collectAll(); });
  var settingsBtn = document.createElement('button');
  settingsBtn.className = 'cn-icon-btn';
  settingsBtn.id = 'cnSettingsBtn';
  settingsBtn.title = '설정';
  settingsBtn.textContent = '⚙';
  settingsBtn.addEventListener('click', openSettings);
  actions.appendChild(refreshBtn);
  actions.appendChild(settingsBtn);
  tabsEl.appendChild(actions);
}

// ── Rendering: Feed ──

function renderFeed() {
  var feed = document.getElementById('cnFeed');
  if (!feed) return;
  updateHdSub();
  while (feed.firstChild) feed.removeChild(feed.firstChild);

  if (!state.items.length) {
    var empty = document.createElement('div');
    empty.className = 'cn-empty';
    var t = document.createElement('div');
    t.className = 'cn-empty-title';
    t.textContent = '뉴스가 없습니다';
    var s = document.createElement('div');
    s.className = 'cn-empty-sub';
    s.textContent = '⚙ 설정에서 카테고리를 선택하고 수집하세요';
    empty.appendChild(t);
    empty.appendChild(s);
    feed.appendChild(empty);
    return;
  }

  var activeKw = getActiveTabKeyword();
  var visible = activeKw
    ? state.items.filter(function (it) { return keywordKey(it.keyword) === keywordKey(activeKw); })
    : state.items;

  if (!visible.length) {
    var note = document.createElement('div');
    note.className = 'cn-empty';
    var nt = document.createElement('div');
    nt.className = 'cn-empty-title';
    nt.textContent = '이 카테고리의 뉴스가 없습니다';
    note.appendChild(nt);
    feed.appendChild(note);
    return;
  }

  visible.forEach(function (item, idx) {
    feed.appendChild(createFeedItem(item, idx));
  });
}

function createFeedItem(item, idx) {
  var feedEl = document.createElement('div');
  feedEl.className = 'cn-item';

  // Header row
  var hd = document.createElement('div');
  hd.className = 'cn-item-hd';

  var rank = document.createElement('span');
  rank.className = 'cn-item-rank';
  rank.textContent = String(idx + 1);

  var info = document.createElement('div');
  info.className = 'cn-item-info';

  // Title — only clickable if URL is a valid http(s) link
  var hasValidUrl = typeof item.url === 'string' && /^https?:\/\//.test(item.url);
  var title;
  if (hasValidUrl) {
    title = document.createElement('a');
    title.href = item.url;
    title.target = '_blank';
    title.rel = 'noopener';
  } else {
    title = document.createElement('span');
  }
  title.className = 'cn-item-title';
  title.textContent = item.title || '';

  // Meta row
  var meta = document.createElement('div');
  meta.className = 'cn-item-meta';

  var src = document.createElement('span');
  src.className = 'cn-item-source';
  src.textContent = item.source || '';

  var badge = document.createElement('span');
  badge.className = 'cn-badge ' + (item.kind === 'paper' ? 'cn-badge-paper' : 'cn-badge-news');
  badge.textContent = item.kind === 'paper' ? '논문' : '뉴스';

  var date = document.createElement('span');
  date.className = 'cn-item-date';
  date.textContent = relativeTime(item.publishedAt);

  var cat = document.createElement('span');
  cat.className = 'cn-badge cn-badge-cat';
  cat.textContent = item.keyword || '';

  meta.appendChild(src);
  meta.appendChild(badge);
  meta.appendChild(date);
  meta.appendChild(cat);
  info.appendChild(title);
  info.appendChild(meta);
  hd.appendChild(rank);
  hd.appendChild(info);

  // Subtitle summary (always visible, 2-line clamp, opens detail view)
  var subtitle = document.createElement('div');
  subtitle.className = 'cn-item-subtitle';
  subtitle.textContent = truncateText(item.summary, 120) || '요약 정보가 없습니다.';
  subtitle.addEventListener('click', function () {
    openDetail(item);
  });

  feedEl.appendChild(hd);
  feedEl.appendChild(subtitle);
  return feedEl;
}

// ── Settings panel ──

function openSettings() {
  syncSettingsUI();
  document.getElementById('cnSettings').classList.add('on');
}

function closeSettings() {
  document.getElementById('cnSettings').classList.remove('on');
}

function getCustomKeywords() {
  return state.keywords.filter(function (kw) { return !isDefaultKeyword(kw); });
}

function addCustomKeyword(kw) {
  var trimmed = kw.replace(/\s+/g, ' ').trim();
  if (!trimmed || hasKeyword(trimmed)) return false;
  if (getCustomKeywords().length >= MAX_CUSTOM_KEYWORDS) {
    setStatus('키워드는 최대 ' + MAX_CUSTOM_KEYWORDS + '개까지 추가할 수 있습니다.', 'error');
    return false;
  }
  state.keywords = sortKeywordsByCategoryOrder(normalizeKeywords(state.keywords.concat([trimmed])));
  persistState();
  renderCatTabs();
  return true;
}

function removeCustomKeyword(kw) {
  state.keywords = state.keywords.filter(function (k) { return keywordKey(k) !== keywordKey(kw); });
  // Also remove cached items for this keyword
  state.items = state.items.filter(function (it) { return keywordKey(it.keyword) !== keywordKey(kw); });
  persistState();
  renderCatTabs();
  renderFeed();
}

function renderCustomChips() {
  var el = document.getElementById('csCustomChips');
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
  getCustomKeywords().forEach(function (kw) {
    var chip = document.createElement('div');
    chip.className = 'qchip on';
    chip.textContent = kw;
    var del = document.createElement('span');
    del.className = 'qchip-del';
    del.textContent = '✕';
    del.addEventListener('click', function (e) {
      e.stopPropagation();
      removeCustomKeyword(kw);
      renderCustomChips();
    });
    chip.appendChild(del);
    el.appendChild(chip);
  });
}

function syncSettingsUI() {
  // Keyword chips
  document.querySelectorAll('#csChips .qchip').forEach(function (chip) {
    chip.classList.toggle('on', hasKeyword(chip.getAttribute('data-kw') || ''));
  });
  // Custom keyword chips
  renderCustomChips();
  // Range
  document.querySelectorAll('#csRange .cs-opt').forEach(function (btn) {
    btn.classList.toggle('on', Number(btn.getAttribute('data-val')) === state.settings.lookbackDays);
  });
  // Type
  document.querySelectorAll('#csType .cs-opt').forEach(function (btn) {
    btn.classList.toggle('on', btn.getAttribute('data-val') === state.settings.sourceType);
  });
}

function initSettings() {
  var chipsEl = document.getElementById('csChips');
  if (chipsEl) {
    CATEGORY_CONFIGS.forEach(function (cat) {
      var chip = document.createElement('div');
      chip.className = 'qchip';
      chip.setAttribute('data-kw', cat.label);
      chip.textContent = cat.label;
      chip.addEventListener('click', function () {
        if (hasKeyword(cat.label)) {
          if (isDefaultKeyword(cat.label)) {
            setStatus('기본 키워드는 해제할 수 없습니다.', 'error');
            return;
          }
          state.keywords = state.keywords.filter(function (k) { return keywordKey(k) !== keywordKey(cat.label); });
        } else {
          if (getCustomKeywords().length >= MAX_CUSTOM_KEYWORDS) {
            setStatus('키워드는 최대 ' + MAX_CUSTOM_KEYWORDS + '개까지 추가할 수 있습니다.', 'error');
            return;
          }
          state.keywords = sortKeywordsByCategoryOrder(normalizeKeywords(state.keywords.concat([cat.label])));
        }
        persistState();
        syncSettingsUI();
        renderCatTabs();
      });
      chipsEl.appendChild(chip);
    });
  }

  // Range options
  document.querySelectorAll('#csRange .cs-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#csRange .cs-opt').forEach(function (b) { b.classList.remove('on'); });
      btn.classList.add('on');
      state.settings.lookbackDays = Number(btn.getAttribute('data-val')) || 2;
      persistState();
    });
  });

  // Type options
  document.querySelectorAll('#csType .cs-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#csType .cs-opt').forEach(function (b) { b.classList.remove('on'); });
      btn.classList.add('on');
      state.settings.sourceType = btn.getAttribute('data-val') || 'all';
      persistState();
    });
  });

  // Custom keyword input
  var kwInput = document.getElementById('csKwInput');
  var kwAddBtn = document.getElementById('csKwAddBtn');
  function handleAddKeyword() {
    if (!kwInput) return;
    var val = kwInput.value.trim();
    if (val && addCustomKeyword(val)) {
      kwInput.value = '';
      renderCustomChips();
    }
  }
  if (kwAddBtn) kwAddBtn.addEventListener('click', handleAddKeyword);
  if (kwInput) kwInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); }
  });

  document.getElementById('cnSettingsBack').addEventListener('click', closeSettings);
  document.getElementById('csGenBtn').addEventListener('click', function () {
    closeSettings();
    collectAll();
  });
}

// ── Auto refresh ──

function shouldAutoRefresh() {
  // 매일 아침 6시 기준으로 1회만 수집
  var now = new Date();
  var today6am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
  if (now < today6am) today6am.setDate(today6am.getDate() - 1);
  if (!state.lastCollectedAt) return true;
  return parseDateValue(state.lastCollectedAt) < today6am.getTime();
}

// ── API Base ──

var API_BASE = (function () {
  var h = window.location.hostname;
  var local = { localhost: 'localhost', '127.0.0.1': 'localhost', '::1': 'localhost' };
  if (window.location.protocol === 'file:') return 'http://localhost:3001/api';
  if (local[h] && window.location.port !== '3001') return 'http://' + local[h] + ':3001/api';
  return '/api';
})();

// ── Summary cache ──

var SUMMARY_CACHE_KEY = 'cardnews.summaryCache';

function loadSummaryCache() {
  try {
    var cached = JSON.parse(localStorage.getItem(SUMMARY_CACHE_KEY) || '{}');
    var now = Date.now();
    Object.keys(cached).forEach(function (k) {
      if (now - (cached[k]._ts || 0) > 86400000) delete cached[k];
    });
    return cached;
  } catch (e) { return {}; }
}

function saveSummaryCache(cache) {
  try { localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
}

async function fetchSummary(url, title, fallbackText) {
  var cache = loadSummaryCache();
  var cacheKey = keywordKey(url);
  if (cache[cacheKey]) return cache[cacheKey];

  try {
    var res = await fetch(API_BASE + '/card-news/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, title: title || '', fallbackText: fallbackText || '' }),
    });
    var data = await res.json();
    if (data && !data.error) {
      data._ts = Date.now();
      cache[cacheKey] = data;
      saveSummaryCache(cache);
    }
    return data;
  } catch (e) {
    return { url: url, subtitle: title || '', body: '요약을 불러올 수 없습니다.', keyPoints: [] };
  }
}

// ── Detail view (hada.io style) ──

function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function openDetail(item) {
  var detail = document.getElementById('cnDetail');
  var body = document.getElementById('cdBody');
  var origLink = document.getElementById('cdOrigLink');
  if (!detail || !body) return;

  origLink.href = item.url || '#';
  while (body.firstChild) body.removeChild(body.firstChild);

  // Badges
  var badges = el('div', 'cd-badges');
  var badgeType = el('span', 'cn-badge ' + (item.kind === 'paper' ? 'cn-badge-paper' : 'cn-badge-news'));
  badgeType.textContent = item.kind === 'paper' ? '논문' : '뉴스';
  var badgeCat = el('span', 'cn-badge cn-badge-cat', item.keyword || '');
  badges.appendChild(badgeType);
  badges.appendChild(badgeCat);

  // Title + meta
  var titleEl = el('div', 'cd-title', item.title);
  var metaEl = el('div', 'cd-meta', (item.source || '') + ' · ' + relativeTime(item.publishedAt));

  // Summary section (loading initially)
  var summarySection = el('div', 'cd-section');
  summarySection.id = 'cdSummarySection';
  var loading = el('div', 'cd-loading', '요약을 생성하고 있습니다…');
  summarySection.appendChild(loading);

  body.appendChild(badges);
  body.appendChild(titleEl);
  body.appendChild(metaEl);
  body.appendChild(summarySection);

  // Related items
  var related = state.items.filter(function (it) {
    return keywordKey(it.keyword) === keywordKey(item.keyword) && it.id !== item.id;
  });
  if (related.length) {
    body.appendChild(buildRelatedEl(related));
  }

  // CTA button
  var cta = document.createElement('a');
  cta.className = 'cd-cta';
  cta.href = item.url || '#';
  cta.target = '_blank';
  cta.rel = 'noopener';
  cta.textContent = '원문 보기 →';
  body.appendChild(cta);

  detail.classList.add('on');

  // Fetch AI summary
  fetchSummary(item.url, item.title, item.summary).then(function (summary) {
    var section = document.getElementById('cdSummarySection');
    if (!section) return;
    while (section.firstChild) section.removeChild(section.firstChild);

    if (summary.body) {
      var bodyTitle = el('div', 'cd-section-title', '본문 요약');
      var bodyText = el('div', 'cd-text', summary.body);
      section.appendChild(bodyTitle);
      section.appendChild(bodyText);
    }

    if (summary.keyPoints && summary.keyPoints.length) {
      var kpSection = el('div', 'cd-section');
      kpSection.appendChild(el('div', 'cd-section-title', '핵심 포인트'));
      var list = el('ul', 'cd-points');
      summary.keyPoints.forEach(function (p) {
        var li = el('li', 'cd-point');
        li.appendChild(el('span', 'cd-point-dot'));
        li.appendChild(el('span', 'cd-point-text', p));
        list.appendChild(li);
      });
      kpSection.appendChild(list);
      section.appendChild(kpSection);
    }

    if (!summary.body && (!summary.keyPoints || !summary.keyPoints.length)) {
      section.appendChild(el('div', 'cd-text', summary.subtitle || item.summary || '요약 정보가 없습니다.'));
    }
  });
}

function buildRelatedEl(items) {
  var wrap = el('div', 'cd-related');
  wrap.appendChild(el('div', 'cd-related-title', '함께 보면 좋은 글'));
  items.slice(0, 5).forEach(function (it) {
    var link = document.createElement('a');
    link.className = 'cd-related-item';
    link.href = it.url || '#';
    link.target = '_blank';
    link.rel = 'noopener';
    var titleSpan = document.createTextNode(truncateText(it.title, 60));
    var metaSpan = el('span', 'cd-related-meta', it.source || '');
    link.appendChild(titleSpan);
    link.appendChild(metaSpan);
    wrap.appendChild(link);
  });
  return wrap;
}

function closeDetail() {
  var detail = document.getElementById('cnDetail');
  if (detail) detail.classList.remove('on');
}

// ── Init ──

function init() {
  state.keywords = loadStoredKeywords();
  state.settings = loadSettings();

  // Load items: 사용자 키워드 + 자동 수집 키워드(DAILY_KEYWORD) 모두 유지
  var stored = loadStoredItems();
  state.items = stored.filter(function (it) {
    if (keywordKey(it.keyword) === keywordKey(DAILY_KEYWORD)) return true;
    return state.keywords.some(function (kw) { return keywordKey(kw) === keywordKey(it.keyword); });
  });
  state.lastCollectedAt = localStorage.getItem(STORAGE_KEYS.lastCollectedAt) || '';

  renderCatTabs();
  renderFeed();
  initSettings();

  // Detail view back button
  document.getElementById('cdBack').addEventListener('click', closeDetail);

  if (shouldAutoRefresh()) {
    collectDailyAutoItems();
  }
}

init();
