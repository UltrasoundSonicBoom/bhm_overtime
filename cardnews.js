const STORAGE_KEYS = {
  keywords: 'cardnews.keywords',
  decks: 'cardnews.decks',
};

const SAMPLE_KEYWORDS = ['퇴직금', '삼성전자 주식', '서울대병원', '의료AI'];
const GOOGLE_NEWS_IMAGE = 'https://lh3.googleusercontent.com/-DR60l-K8vnyi99NZovm9HlXyZwQ85GMDxiwJWzoasZYCUrPuUM_P_4Rb7ei03j-0nRs0c4F=w256';

const QUERY_ALIASES = {
  '퇴직금': {
    news: ['퇴직금', '퇴직연금'],
    papers: ['severance pay labor retirement benefit', 'retirement benefit labor law'],
  },
  '삼성전자주식': {
    news: ['삼성전자 주식', '삼성전자 실적'],
    papers: ['Samsung Electronics stock semiconductor earnings', 'Samsung Electronics market outlook'],
  },
  '서울대병원': {
    news: ['서울대병원', '서울대병원 연구'],
    papers: ['Seoul National University Hospital', 'Seoul National University Hospital clinical research'],
  },
  '의료ai': {
    news: ['의료AI', '헬스케어 AI'],
    papers: ['medical artificial intelligence healthcare', 'clinical AI healthcare'],
  },
};

const state = {
  keywords: [],
  decks: [],
  loading: false,
  requestId: 0,
};

const els = {
  keywordInput: document.getElementById('keywordInput'),
  addKeywordBtn: document.getElementById('addKeywordBtn'),
  clearKeywordsBtn: document.getElementById('clearKeywordsBtn'),
  generateDecksBtn: document.getElementById('generateDecksBtn'),
  keywordChips: document.getElementById('keywordChips'),
  sampleKeywords: document.getElementById('sampleKeywords'),
  cardnewsStatus: document.getElementById('cardnewsStatus'),
  decksSection: document.getElementById('decksSection'),
  pendingKeywordRow: document.getElementById('pendingKeywordRow'),
  selectedCount: document.getElementById('selectedCount'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, maxLength = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function keywordKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

function uniqueBy(list, getKey) {
  const seen = new Set();
  return list.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeKeywords(rawValues) {
  const keywords = [];
  const seen = new Set();

  rawValues.forEach((rawValue) => {
    String(rawValue ?? '')
      .split(/[\n,]/)
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .forEach((keyword) => {
        const key = keywordKey(keyword);
        if (!key || seen.has(key)) return;
        seen.add(key);
        keywords.push(keyword);
      });
  });

  return keywords.slice(0, 6);
}

function hasKeyword(keyword) {
  const key = keywordKey(keyword);
  return state.keywords.some((item) => keywordKey(item) === key);
}

function findKeywordIndex(keyword) {
  const key = keywordKey(keyword);
  return state.keywords.findIndex((item) => keywordKey(item) === key);
}

function loadStoredKeywords() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('keywords');
  if (fromUrl) return normalizeKeywords([fromUrl]);

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.keywords) || '[]');
    if (Array.isArray(stored) && stored.length) return normalizeKeywords(stored);
  } catch {}

  return [];
}

function loadStoredDecks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.decks) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEYS.keywords, JSON.stringify(state.keywords));
  localStorage.setItem(STORAGE_KEYS.decks, JSON.stringify(state.decks));
}

function setStatus(message, tone = 'info') {
  if (!els.cardnewsStatus) return;
  els.cardnewsStatus.textContent = message;
  els.cardnewsStatus.dataset.tone = tone;
  els.cardnewsStatus.classList.toggle('active', Boolean(message));
}

function formatDateLabel(value) {
  if (!value) return '날짜 미상';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 미상';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function rebuildAbstract(abstractInvertedIndex) {
  if (!abstractInvertedIndex || typeof abstractInvertedIndex !== 'object') return '';

  const words = [];
  Object.entries(abstractInvertedIndex).forEach(([word, positions]) => {
    if (!Array.isArray(positions)) return;
    positions.forEach((position) => {
      words[position] = word;
    });
  });

  return words.join(' ').replace(/\s+/g, ' ').trim();
}

function setControlsDisabled(disabled) {
  if (els.keywordInput) els.keywordInput.disabled = disabled;
  if (els.addKeywordBtn) els.addKeywordBtn.disabled = disabled;
  if (els.clearKeywordsBtn) els.clearKeywordsBtn.disabled = disabled;
  if (els.generateDecksBtn) els.generateDecksBtn.disabled = disabled;
}

function renderPendingInput() {
  if (!els.pendingKeywordRow || !els.keywordInput) return;

  const pending = normalizeKeywords([els.keywordInput.value]).filter((keyword) => !hasKeyword(keyword));
  if (!pending.length) {
    els.pendingKeywordRow.hidden = true;
    els.pendingKeywordRow.innerHTML = '';
    return;
  }

  els.pendingKeywordRow.hidden = false;
  els.pendingKeywordRow.innerHTML = pending.map((keyword) => `
    <div class="cardnews-pending-chip">
      <span class="cardnews-chip-check">입력 중</span>
      <span>${escapeHtml(keyword)}</span>
      <small>아직 추가되지 않음</small>
    </div>
  `).join('');
}

function renderKeywordChips() {
  if (!els.keywordChips) return;

  if (els.selectedCount) {
    els.selectedCount.textContent = `${state.keywords.length}개`;
  }

  if (!state.keywords.length) {
    els.keywordChips.innerHTML = '<p class="cardnews-note">선택된 키워드가 없습니다. 위에서 추가하면 여기로 이동합니다.</p>';
    return;
  }

  els.keywordChips.innerHTML = state.keywords.map((keyword) => `
    <span class="cardnews-chip">
      <span class="cardnews-chip-check">선택됨</span>
      <span class="cardnews-chip-label">${escapeHtml(keyword)}</span>
      <button class="cardnews-chip-remove" type="button" data-remove-keyword="${escapeHtml(keyword)}" aria-label="${escapeHtml(keyword)} 삭제">삭제</button>
    </span>
  `).join('');
}

function renderSampleKeywords() {
  if (!els.sampleKeywords) return;

  const available = SAMPLE_KEYWORDS.filter((keyword) => !hasKeyword(keyword));
  if (!available.length) {
    els.sampleKeywords.innerHTML = '<p class="cardnews-note">추천 키워드는 모두 담았습니다.</p>';
    return;
  }

  els.sampleKeywords.innerHTML = available.map((keyword) => `
    <button class="cardnews-sample" type="button" data-sample-keyword="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>
  `).join('');
}

function renderSourcePills(deck, sourceIds) {
  return sourceIds
    .map((sourceId) => deck.sources.find((item) => item.id === sourceId))
    .filter(Boolean)
    .slice(0, 3)
    .map((source) => `<span class="news-card-source-pill">${escapeHtml(source.kind === 'paper' ? `논문 · ${source.source}` : `뉴스 · ${source.source}`)}</span>`)
    .join('');
}

function renderCardMedia(deck, card) {
  if (card.imageUrl) {
    return `
      <div class="news-card-media">
        <img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.imageAlt || card.title)}" loading="lazy">
        <div class="news-card-media-copy">
          <strong>${escapeHtml(card.imageLabel || '오늘의 브리핑')}</strong>
          <span>${escapeHtml(card.imageCaption || '키워드 흐름을 빠르게 스캔할 수 있게 정리했습니다.')}</span>
        </div>
      </div>
    `;
  }

  const sources = (card.sourceIds || [])
    .map((sourceId) => deck.sources.find((item) => item.id === sourceId))
    .filter(Boolean)
    .slice(0, 3);

  if (!sources.length) return '';

  return `
    <div class="news-card-source-strip">
      ${sources.map((source) => `
        <span class="news-card-source-mark">${escapeHtml(source.kind === 'paper' ? `논문 · ${source.source}` : `뉴스 · ${source.source}`)}</span>
      `).join('')}
    </div>
  `;
}

function renderCard(deck, card, index) {
  const cardClassMap = {
    cover: 'news-card-cover',
    pulse: 'news-card-pulse',
    source: 'news-card-source',
    research: 'news-card-research',
    watch: 'news-card-watch',
  };

  return `
    <article class="news-card ${cardClassMap[card.slot] || 'news-card-cover'}">
      <div class="news-card-top">
        <div class="news-card-topline">
          <span class="news-card-eyebrow">${escapeHtml(card.eyebrow || deck.keyword)}</span>
          <span class="news-card-index">${String(index + 1).padStart(2, '0')}</span>
        </div>
        ${renderCardMedia(deck, card)}
        <h3 class="news-card-title">${escapeHtml(card.title)}</h3>
        <p class="news-card-body">${escapeHtml(card.body)}</p>
        <span class="news-card-highlight">${escapeHtml(card.highlight || '핵심 요약')}</span>
      </div>
      <div class="news-card-footer">
        <ul class="news-card-list">
          ${(card.bullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
        <div class="news-card-caption">${escapeHtml(card.footer || '')}</div>
        <div class="news-card-sources">${renderSourcePills(deck, card.sourceIds || [])}</div>
      </div>
    </article>
  `;
}

function renderDeckSources(deck) {
  if (!Array.isArray(deck.sources) || !deck.sources.length) {
    return `
      <details class="deck-sources">
        <summary>원문 0건</summary>
        <div class="deck-source-list">
          <div class="deck-source-summary">공개 원문이 충분하지 않아 요약 중심으로 정리했습니다.</div>
        </div>
      </details>
    `;
  }

  return `
    <details class="deck-sources">
      <summary>원문 ${deck.sources.length}건 보기</summary>
      <div class="deck-source-list">
        ${deck.sources.map((source) => `
          <div class="deck-source-item">
            <span class="deck-source-kind">${escapeHtml(source.kind === 'paper' ? '논문' : '뉴스')}</span>
            <div class="deck-source-body">
              <a class="deck-source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>
              <div class="deck-source-meta">${escapeHtml(source.source)} · ${escapeHtml(formatDateLabel(source.publishedAt))}${source.meta ? ` · ${escapeHtml(source.meta)}` : ''}</div>
              <div class="deck-source-summary">${escapeHtml(source.summary)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </details>
  `;
}

function renderDecks() {
  if (!els.decksSection) return;

  if (!state.decks.length) {
    els.decksSection.innerHTML = `
      <section class="cardnews-band">
        <div class="cardnews-empty">
          키워드를 고르고 카드를 만들면 여기에 모바일 카드뉴스가 쌓입니다.
        </div>
      </section>
    `;
    return;
  }

  els.decksSection.innerHTML = state.decks.map((deck) => `
    <section class="deck-section" data-keyword="${escapeHtml(deck.keyword)}">
      <div class="deck-header">
        <div class="deck-title-wrap">
          <div class="deck-title">${escapeHtml(deck.deckTitle || `${deck.keyword} 브리핑`)}</div>
          <div class="deck-subtitle">${escapeHtml(deck.deckSubtitle || '')}</div>
        </div>
        <button type="button" class="cardnews-secondary-btn" data-regenerate-keyword="${escapeHtml(deck.keyword)}">다시 생성</button>
      </div>
      <div class="deck-meta">
        <span class="deck-meta-badge">키워드 ${escapeHtml(deck.keyword)}</span>
        <span class="deck-meta-badge">뉴스 ${escapeHtml(deck.newsCount ?? 0)}</span>
        <span class="deck-meta-badge">논문 ${escapeHtml(deck.paperCount ?? 0)}</span>
        <span class="deck-meta-badge">${escapeHtml(formatDateLabel(deck.generatedAt))}</span>
      </div>
      <div class="deck-scroller">
        ${(deck.cards || []).map((card, index) => renderCard(deck, card, index)).join('')}
      </div>
      ${renderDeckSources(deck)}
    </section>
  `).join('');
}

function sortDecksByKeywordOrder(decks) {
  return [...decks].sort((a, b) => findKeywordIndex(a.keyword) - findKeywordIndex(b.keyword));
}

function addKeywords(rawValue) {
  const before = state.keywords.length;
  const next = normalizeKeywords([...state.keywords, rawValue]);
  const addedCount = Math.max(0, next.length - before);
  state.keywords = next;
  persistState();
  renderKeywordChips();
  renderSampleKeywords();
  renderPendingInput();
  return addedCount;
}

function removeKeyword(keyword) {
  const targetKey = keywordKey(keyword);
  state.keywords = state.keywords.filter((item) => keywordKey(item) !== targetKey);
  state.decks = state.decks.filter((deck) => keywordKey(deck.keyword) !== targetKey);
  persistState();
  renderKeywordChips();
  renderSampleKeywords();
  renderPendingInput();
  renderDecks();
}

async function fetchJsonWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error((data && data.message) || `요청 실패 (${response.status})`);
    }

    return data;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('원문을 불러오는 시간이 길어져서 다시 시도해 주세요.');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function splitNewsTitleAndSource(value) {
  const clean = stripHtml(value);
  const dividerIndex = clean.lastIndexOf(' - ');
  if (dividerIndex === -1) {
    return { title: clean, source: 'Google 뉴스' };
  }

  return {
    title: clean.slice(0, dividerIndex).trim(),
    source: clean.slice(dividerIndex + 3).trim() || 'Google 뉴스',
  };
}

function resolveQueries(keyword) {
  const normalizedKey = keywordKey(keyword);
  const alias = QUERY_ALIASES[normalizedKey];

  return {
    news: uniqueBy([keyword, ...((alias && alias.news) || [])], (item) => keywordKey(item)),
    papers: uniqueBy([keyword, ...((alias && alias.papers) || [])], (item) => keywordKey(item)),
  };
}

async function fetchGoogleNews(keyword) {
  const { news: newsQueries } = resolveQueries(keyword);
  let lastError = null;

  for (const query of newsQueries) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:30d`)}&hl=ko&gl=KR&ceid=KR:ko`;
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const data = await fetchJsonWithTimeout(url, 20000);
        if (data && data.status === 'ok') {
          const items = Array.isArray(data.items) ? data.items : [];
          const mapped = uniqueBy(items.map((item, index) => {
            const parsed = splitNewsTitleAndSource(item.title || item.description || '');
            const summary = stripHtml(item.description || item.content || '');
            return {
              id: `${keywordKey(keyword)}-news-${index + 1}`,
              kind: 'news',
              title: parsed.title || truncateText(summary, 90) || `${keyword} 관련 기사`,
              source: parsed.source || 'Google 뉴스',
              url: item.link || rssUrl,
              publishedAt: item.pubDate || '',
              summary: truncateText(summary || parsed.title || `${keyword} 관련 최근 기사입니다.`, 130),
              meta: 'Google 뉴스',
            };
          }), (item) => `${keywordKey(item.title)}|${keywordKey(item.source)}`).slice(0, 6);

          if (mapped.length) return mapped;
          break;
        }

        if (data && typeof data.message === 'string' && data.message.includes('processed')) {
          await sleep(1400 * (attempt + 1));
          continue;
        }

        throw new Error((data && data.message) || '뉴스 피드를 정리하지 못했습니다.');
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return [];
}

async function fetchOpenAlex(keyword) {
  const { papers: paperQueries } = resolveQueries(keyword);
  let lastError = null;

  for (const query of paperQueries) {
    try {
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=has_abstract:true&sort=relevance_score:desc&per-page=4`;
      const data = await fetchJsonWithTimeout(url, 20000);
      const results = Array.isArray(data.results) ? data.results : [];

      const papers = uniqueBy(results.map((item, index) => {
        const abstract = rebuildAbstract(item.abstract_inverted_index);
        const source = item.primary_location?.source?.display_name || item.host_venue?.display_name || 'OpenAlex';
        const landingPage = item.primary_location?.landing_page_url || item.ids?.doi || item.id || '#';
        const metaParts = [];

        if (item.publication_year) metaParts.push(`${item.publication_year}`);
        if (typeof item.cited_by_count === 'number') metaParts.push(`인용 ${item.cited_by_count}`);

        return {
          id: `${keywordKey(keyword)}-paper-${index + 1}`,
          kind: 'paper',
          title: item.display_name || item.title || `${keyword} 관련 연구`,
          source,
          url: landingPage,
          publishedAt: item.publication_date || `${item.publication_year || ''}`.trim(),
          summary: truncateText(abstract || `${source}에 공개된 관련 연구입니다.`, 180),
          meta: metaParts.join(' · '),
        };
      }), (item) => `${keywordKey(item.title)}|${keywordKey(item.source)}`).slice(0, 4);

      if (papers.length) return papers;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return [];
}

function buildDeckAngle(keyword, news, papers) {
  if (news.length && papers.length) {
    return `${keyword}은 현장 기사와 연구 흐름이 동시에 잡혀서 같이 읽기 좋습니다.`;
  }
  if (news.length) {
    return `${keyword}은 기사 흐름이 먼저 잡히고 있어서 현장 반응 확인에 유리합니다.`;
  }
  if (papers.length) {
    return `${keyword}은 기사보다 연구 쪽 자료가 먼저 보입니다.`;
  }
  return `${keyword}은 공개 원문이 적어서 다음 갱신 때 다시 보는 편이 좋습니다.`;
}

function buildWatchItems(keyword, news, papers, warnings) {
  const items = [];

  warnings.forEach((warning) => items.push(warning));

  if (news[0]) {
    items.push(`${formatDateLabel(news[0].publishedAt)} 이후 새 헤드라인이 붙는지 다시 확인하기`);
  } else {
    items.push('기사 연결이 적어서 공식 발표나 보도자료가 나오는지 먼저 보기');
  }

  if (papers[0]) {
    items.push(`${papers[0].source} 후속 연구나 인용 수가 늘어나는지 보기`);
  } else {
    items.push('공개 초록이 적어서 학회 발표나 기관 리포트를 같이 보기');
  }

  if (/주식|stock/.test(keyword.toLowerCase())) {
    items.push('실적 발표, 증권사 코멘트, 장 마감 이후 기사까지 함께 보기');
  } else if (/병원|hospital/.test(keyword.toLowerCase())) {
    items.push('기관 공지, 연구 발표, 진료 현장 기사 사이의 온도 차이 보기');
  } else if (/ai|인공지능/.test(keyword.toLowerCase())) {
    items.push('도입 사례와 규제 이슈가 같이 움직이는지 확인하기');
  } else {
    items.push('짧은 속보보다 원문에서 반복되는 표현이 무엇인지 먼저 보기');
  }

  return uniqueBy(items, (item) => item).slice(0, 4);
}

function buildDeck(keyword, news, papers, warnings = []) {
  const leadNews = news[0];
  const leadPaper = papers[0];
  const sources = [...news, ...papers];

  const subtitleParts = [`최근 뉴스 ${news.length}건`, `공개 논문 ${papers.length}편`];
  if (warnings.length) subtitleParts.push(truncateText(warnings[0], 36));

  const cards = [
    {
      slot: 'cover',
      eyebrow: 'Today Brief',
      title: `${keyword} 한눈에 보기`,
      body: leadNews
        ? truncateText(`${leadNews.title} 중심으로 현재 흐름을 잡았습니다.`, 92)
        : leadPaper
          ? truncateText(`${leadPaper.title}을 중심으로 연구 흐름을 먼저 정리했습니다.`, 92)
          : '공개 원문이 적어서 다음 갱신 포인트 위주로 먼저 정리했습니다.',
      highlight: `뉴스 ${news.length} · 논문 ${papers.length}`,
      bullets: [
        buildDeckAngle(keyword, news, papers),
        leadNews ? `${leadNews.source} 기사부터 읽으면 현재 이슈 파악이 빠릅니다.` : '최근 기사보다 설명형 원문을 먼저 보는 편이 좋습니다.',
        leadPaper ? `${leadPaper.source} 연구가 배경 설명을 보완합니다.` : '연구 원문이 적어서 해설 기사 비중이 커질 수 있습니다.',
      ],
      footer: '선택한 키워드 기준으로 바로 읽을 순서를 먼저 잡았습니다.',
      sourceIds: [leadNews?.id, leadPaper?.id].filter(Boolean),
      imageUrl: 'snuhmaterect.png?v=1.3',
      imageAlt: `${keyword} 카드뉴스 표지`,
      imageLabel: 'SNUH 메이트',
      imageCaption: '선택된 키워드로 카드뉴스를 바로 엮었습니다.',
    },
    {
      slot: 'pulse',
      eyebrow: 'News Pulse',
      title: news.length ? '방금 쌓인 헤드라인' : '뉴스 흐름은 더 확인이 필요합니다',
      body: news.length
        ? truncateText(leadNews.summary || leadNews.title, 110)
        : '뉴스 피드에서 바로 읽을 만한 제목이 적어서 다음 업데이트를 기다리는 편이 좋습니다.',
      highlight: news.length ? '짧은 제목 중심으로 스캔' : '뉴스 피드 부족',
      bullets: news.length
        ? news.slice(0, 3).map((item) => `${truncateText(item.title, 58)} · ${item.source}`)
        : ['기사 수집량이 적습니다.', '다른 표현의 키워드로 다시 시도해 보세요.', '공식 발표 여부를 같이 확인해 보세요.'],
      footer: '긴 문단 대신 제목과 매체명을 먼저 보여주는 뉴스레터식 배열입니다.',
      sourceIds: news.slice(0, 3).map((item) => item.id),
      imageUrl: GOOGLE_NEWS_IMAGE,
      imageAlt: 'Google News 아이콘',
      imageLabel: 'Google News',
      imageCaption: '최근 기사 흐름을 먼저 훑어봅니다.',
    },
    {
      slot: 'source',
      eyebrow: 'Source Ledger',
      title: '원문에서 바로 확인할 줄기',
      body: sources.length
        ? '기사와 논문을 한 줄씩 섞어서 어디부터 열어볼지 순서를 잡았습니다.'
        : '지금은 원문 연결이 적어서 다시 생성 시점이 중요합니다.',
      highlight: sources.length ? '원문 우선순위' : '원문 부족',
      bullets: sources.length
        ? sources.slice(0, 4).map((item) => `${item.kind === 'paper' ? '논문' : '뉴스'} · ${truncateText(item.title, 54)}`)
        : ['지금 연결된 공개 원문이 많지 않습니다.', '시간을 두고 다시 묶어보면 더 나아질 수 있습니다.', '같은 의미의 다른 키워드도 시도해 보세요.'],
      footer: '원문 확인 버튼은 카드 아래에서 바로 열 수 있습니다.',
      sourceIds: sources.slice(0, 4).map((item) => item.id),
    },
    {
      slot: 'research',
      eyebrow: 'Research Lens',
      title: papers.length ? '연구에서 보이는 흐름' : '연구 근거는 더 필요합니다',
      body: papers.length
        ? truncateText(leadPaper.summary, 116)
        : 'OpenAlex에서 바로 이어지는 공개 초록이 적어서 기사 중심 브리핑으로 읽는 편이 좋습니다.',
      highlight: papers.length ? `논문 ${papers.length}편 연결` : '논문 연결 적음',
      bullets: papers.length
        ? papers.slice(0, 3).map((item) => `${truncateText(item.title, 56)} · ${item.source}`)
        : ['공개 초록이 적습니다.', '기관명 또는 영문 키워드로 다시 찾으면 나아질 수 있습니다.', '학회명이나 주제어를 추가로 넣어보세요.'],
      footer: '논문이 적게 잡혀도 빈칸 대신 현재 확보된 근거 수준을 그대로 적었습니다.',
      sourceIds: papers.slice(0, 3).map((item) => item.id),
    },
    {
      slot: 'watch',
      eyebrow: 'What To Watch',
      title: '다음 체크 포인트',
      body: '지금 카드뉴스를 보고 나서 다음에 무엇을 다시 확인할지 한 장에 모았습니다.',
      highlight: '업데이트 포인트',
      bullets: buildWatchItems(keyword, news, papers, warnings),
      footer: '새 기사나 후속 논문이 나오면 같은 키워드로 다시 생성해 보세요.',
      sourceIds: [leadNews?.id, leadPaper?.id].filter(Boolean),
    },
  ];

  return {
    keyword,
    deckTitle: `${keyword} 브리핑`,
    deckSubtitle: subtitleParts.join(' · '),
    newsCount: news.length,
    paperCount: papers.length,
    generatedAt: new Date().toISOString(),
    cards,
    sources,
  };
}

async function collectDeckForKeyword(keyword) {
  const warnings = [];

  const [newsResult, paperResult] = await Promise.allSettled([
    fetchGoogleNews(keyword),
    fetchOpenAlex(keyword),
  ]);

  const news = newsResult.status === 'fulfilled' ? newsResult.value : [];
  const papers = paperResult.status === 'fulfilled' ? paperResult.value : [];

  if (newsResult.status === 'rejected') {
    warnings.push('뉴스 연결이 느려 일부 기사만 반영됐습니다.');
  }

  if (paperResult.status === 'rejected') {
    warnings.push('논문 연결이 느려 기사 중심으로 먼저 정리했습니다.');
  }

  return buildDeck(keyword, news, papers, warnings);
}

async function generateDecks(keywords) {
  if (state.loading) return;

  const targetKeywords = normalizeKeywords(keywords && keywords.length ? keywords : state.keywords);
  if (!targetKeywords.length) {
    setStatus('키워드를 먼저 추가해 주세요.', 'error');
    return;
  }

  state.loading = true;
  state.requestId += 1;
  const requestId = state.requestId;
  setControlsDisabled(true);

  const nextDecks = [];

  try {
    for (let index = 0; index < targetKeywords.length; index += 1) {
      const keyword = targetKeywords[index];
      setStatus(`${index + 1}/${targetKeywords.length} ${keyword} 원문을 직접 모으는 중입니다.`, 'info');
      const deck = await collectDeckForKeyword(keyword);
      if (requestId !== state.requestId) return;
      nextDecks.push(deck);
    }

    if (
      targetKeywords.length === state.keywords.length &&
      targetKeywords.every((keyword, index) => keywordKey(keyword) === keywordKey(state.keywords[index]))
    ) {
      state.decks = nextDecks;
    } else {
      const targetKeys = new Set(targetKeywords.map((keyword) => keywordKey(keyword)));
      const others = state.decks.filter((deck) => !targetKeys.has(keywordKey(deck.keyword)));
      state.decks = sortDecksByKeywordOrder([...others, ...nextDecks]);
    }

    persistState();
    renderDecks();
    setStatus(`카드뉴스 ${nextDecks.length}세트를 만들었습니다. 원문은 브라우저에서 바로 모았습니다.`, 'success');
  } catch (error) {
    setStatus(error.message || '카드뉴스를 만들지 못했습니다.', 'error');
  } finally {
    if (requestId === state.requestId) {
      state.loading = false;
      setControlsDisabled(false);
    }
  }
}

function handleAddKeyword() {
  if (state.loading) return;
  if (!els.keywordInput) return;

  const value = els.keywordInput.value.trim();
  if (!value) {
    setStatus('추가할 키워드를 먼저 입력해 주세요.', 'error');
    return;
  }

  const beforeCount = state.keywords.length;
  const nextCount = normalizeKeywords([...state.keywords, value]).length;
  const addedCount = addKeywords(value);

  if (els.keywordInput) els.keywordInput.value = '';
  renderPendingInput();

  if (!addedCount) {
    setStatus('이미 담긴 키워드는 한 번만 유지했습니다.', 'info');
    return;
  }

  if (beforeCount < 6 && nextCount === 6) {
    setStatus('키워드는 최대 6개까지 담았습니다.', 'info');
    return;
  }

  setStatus('선택된 키워드에 추가했습니다.', 'success');
}

function bindEvents() {
  els.addKeywordBtn?.addEventListener('click', handleAddKeyword);

  els.keywordInput?.addEventListener('input', () => {
    renderPendingInput();
  });

  els.keywordInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddKeyword();
    }
  });

  els.clearKeywordsBtn?.addEventListener('click', () => {
    state.requestId += 1;
    state.keywords = [];
    state.decks = [];
    persistState();
    if (els.keywordInput) els.keywordInput.value = '';
    renderKeywordChips();
    renderSampleKeywords();
    renderPendingInput();
    renderDecks();
    setStatus('선택된 키워드를 모두 비웠습니다.', 'success');
  });

  els.generateDecksBtn?.addEventListener('click', () => generateDecks());

  document.addEventListener('click', (event) => {
    if (state.loading) return;

    const removeButton = event.target.closest('[data-remove-keyword]');
    if (removeButton) {
      removeKeyword(removeButton.getAttribute('data-remove-keyword') || '');
      setStatus('선택된 키워드에서 제거했습니다.', 'success');
      return;
    }

    const regenerateButton = event.target.closest('[data-regenerate-keyword]');
    if (regenerateButton) {
      generateDecks([regenerateButton.getAttribute('data-regenerate-keyword') || '']);
      return;
    }

    const sampleButton = event.target.closest('[data-sample-keyword]');
    if (sampleButton) {
      const keyword = sampleButton.getAttribute('data-sample-keyword') || '';
      addKeywords(keyword);
      setStatus('추천 키워드를 선택했습니다.', 'success');
    }
  });
}

function init() {
  state.keywords = loadStoredKeywords();
  state.decks = sortDecksByKeywordOrder(
    loadStoredDecks().filter((deck) => hasKeyword(deck.keyword))
  );
  renderKeywordChips();
  renderSampleKeywords();
  renderPendingInput();
  renderDecks();
  bindEvents();
}

init();
