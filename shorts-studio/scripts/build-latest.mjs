import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const SHORTS_DIR = path.resolve(ROOT, 'shorts-studio');
const DATA_DIR = path.resolve(SHORTS_DIR, 'data');
const ROOT_DATA_DIR = path.resolve(ROOT, 'data');

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; SNUHMateShorts/1.0; +https://snuhmate.com)',
  Accept: 'application/json, text/plain, */*',
};

const CATEGORY_COLORS = {
  snuh: {color: '#ff6b57', soft: '#ffe2dd'},
  'medical-ai': {color: '#2fbf71', soft: '#d9f6e4'},
  'ai-use': {color: '#3d7eff', soft: '#dce9ff'},
  'year-end-tax': {color: '#ff9c33', soft: '#ffe7c7'},
  wealth: {color: '#14a39a', soft: '#d5f3ef'},
};

function keywordKey(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '');
}

function uniqueBy(list, getKey) {
  const seen = new Set();
  const result = [];

  for (const item of list) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function compactText(value, maxLength = 180) {
  const clean = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}…`;
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value) {
  return decodeHtml(String(value ?? '').replace(/<[^>]+>/g, ' '));
}

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 미상';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateValue(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortByFreshness(list) {
  return [...list].sort((a, b) => parseDateValue(b.publishedAt) - parseDateValue(a.publishedAt));
}

function sourceMatchesTerms(source, terms) {
  if (!Array.isArray(terms) || !terms.length) return true;
  const haystack = `${source.title || ''} ${source.summary || ''} ${source.source || ''}`.toLowerCase();
  return terms.some((term) => haystack.includes(String(term).toLowerCase()));
}

function isFarFutureDate(value) {
  const timestamp = parseDateValue(value);
  if (!timestamp) return false;
  return timestamp > Date.now() + (30 * 24 * 60 * 60 * 1000);
}

function rebuildAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  const words = [];
  Object.entries(invertedIndex).forEach(([word, positions]) => {
    if (!Array.isArray(positions)) return;
    positions.forEach((position) => {
      words[position] = word;
    });
  });
  return words.join(' ').replace(/\s+/g, ' ').trim();
}

function extractXmlTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return decodeHtml(match?.[1] || '');
}

async function fetchText(url) {
  const response = await fetch(url, {headers: FETCH_HEADERS});
  if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status})`);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {headers: FETCH_HEADERS});
  if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status})`);
  return response.json();
}

function loadPipelineConfig() {
  const code = readFileSync(path.resolve(ROOT, 'cardnews-pipeline.js'), 'utf8');
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox);
  return sandbox.CARDNEWS_PIPELINE;
}

function splitNewsTitleAndSource(value, fallbackSource = 'Google 뉴스') {
  const clean = stripTags(value);
  const dividerIndex = clean.lastIndexOf(' - ');
  if (dividerIndex === -1) {
    return {title: clean, source: fallbackSource};
  }

  return {
    title: clean.slice(0, dividerIndex).trim(),
    source: clean.slice(dividerIndex + 3).trim() || fallbackSource,
  };
}

async function fetchGoogleNewsByQuery(query, lookbackDays, categoryLabel) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:${lookbackDays}d`)}&hl=ko&gl=KR&ceid=KR:ko`;
  const xml = await fetchText(rssUrl);
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).map((match) => match[1]);

  return items.slice(0, 6).map((block, index) => {
    const titleData = splitNewsTitleAndSource(extractXmlTag(block, 'title'), extractXmlTag(block, 'source') || 'Google 뉴스');
    const description = compactText(stripTags(extractXmlTag(block, 'description')), 150);
    return {
      id: `${keywordKey(categoryLabel)}-news-${index + 1}`,
      kind: 'news',
      title: compactText(titleData.title || `${categoryLabel} 관련 기사`, 100),
      source: titleData.source || 'Google 뉴스',
      publishedAt: extractXmlTag(block, 'pubDate'),
      summary: description || compactText(titleData.title, 110),
      url: extractXmlTag(block, 'link'),
      meta: 'Google 뉴스',
    };
  }).filter((item) => item.title && item.url);
}

async function fetchGoogleNews(category, pipeline) {
  let collected = [];

  for (const query of category.newsQueries || [category.label]) {
    const recent = await fetchGoogleNewsByQuery(query, pipeline.lookbackDays || 2, category.label).catch(() => []);
    const filtered = recent
      .filter((item) => !isFarFutureDate(item.publishedAt))
      .filter((item) => sourceMatchesTerms(item, category.newsTerms));

    collected = uniqueBy([...collected, ...filtered], (item) => `${keywordKey(item.title)}|${keywordKey(item.source)}|${item.url}`);
  }

  if (collected.length < (pipeline.sourceLimitPerCategory || 3)) {
    for (const query of category.newsQueries || [category.label]) {
      const fallback = await fetchGoogleNewsByQuery(query, pipeline.supplementDays || 14, category.label).catch(() => []);
      const filtered = fallback
        .filter((item) => !isFarFutureDate(item.publishedAt))
        .filter((item) => sourceMatchesTerms(item, category.newsTerms));

      collected = uniqueBy([...collected, ...filtered], (item) => `${keywordKey(item.title)}|${keywordKey(item.source)}|${item.url}`);
    }
  }

  return sortByFreshness(collected).slice(0, 6);
}

async function fetchOpenAlexByQuery(query, lookbackDays, categoryLabel) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - lookbackDays);
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=has_abstract:true,from_publication_date:${fromDate.toISOString().slice(0, 10)}&sort=publication_date:desc&per-page=6`;
  const data = await fetchJson(url);
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((item, index) => {
    const abstract = rebuildAbstract(item.abstract_inverted_index);
    const source = item.primary_location?.source?.display_name || item.host_venue?.display_name || 'OpenAlex';
    const landingPage = item.primary_location?.landing_page_url || item.ids?.doi || item.id || '#';
    const metaParts = [];
    if (item.publication_year) metaParts.push(String(item.publication_year));
    if (typeof item.cited_by_count === 'number') metaParts.push(`인용 ${item.cited_by_count}`);

    return {
      id: `${keywordKey(categoryLabel)}-paper-${index + 1}`,
      kind: 'paper',
      title: compactText(item.display_name || item.title || `${categoryLabel} 관련 연구`, 120),
      source,
      publishedAt: item.publication_date || `${item.publication_year || ''}`.trim(),
      summary: compactText(abstract || `${source}에 공개된 관련 연구입니다.`, 170),
      url: landingPage,
      meta: metaParts.join(' · '),
    };
  }).filter((item) => item.title && item.url);
}

async function fetchOpenAlex(category, pipeline) {
  let collected = [];

  for (const query of category.paperQueries || [category.label]) {
    const recent = await fetchOpenAlexByQuery(query, pipeline.lookbackDays || 2, category.label).catch(() => []);
    const filtered = recent
      .filter((item) => !isFarFutureDate(item.publishedAt))
      .filter((item) => sourceMatchesTerms(item, category.paperTerms));

    collected = uniqueBy([...collected, ...filtered], (item) => `${keywordKey(item.title)}|${keywordKey(item.source)}|${item.url}`);
  }

  if (!collected.length) {
    for (const query of category.paperQueries || [category.label]) {
      const fallback = await fetchOpenAlexByQuery(query, pipeline.supplementDays || 14, category.label).catch(() => []);
      const filtered = fallback
        .filter((item) => !isFarFutureDate(item.publishedAt))
        .filter((item) => sourceMatchesTerms(item, category.paperTerms));

      collected = uniqueBy([...collected, ...filtered], (item) => `${keywordKey(item.title)}|${keywordKey(item.source)}|${item.url}`);
    }
  }

  return sortByFreshness(collected).slice(0, 6);
}

function selectTopSources(category, news, papers, pipeline) {
  const mix = Array.isArray(category.mix) && category.mix.length ? category.mix : ['news', 'paper', 'news'];
  const selected = [];
  const used = new Set();

  const pick = (kind) => {
    const list = kind === 'paper' ? papers : news;
    const next = list.find((item) => !used.has(item.id));
    if (!next) return;
    used.add(next.id);
    selected.push(next);
  };

  mix.forEach((kind) => pick(kind));

  const combined = uniqueBy([...news, ...papers], (item) => item.id);
  combined.forEach((item) => {
    if (selected.length >= (pipeline.sourceLimitPerCategory || 3)) return;
    if (used.has(item.id)) return;
    used.add(item.id);
    selected.push(item);
  });

  while (selected.length < (pipeline.sourceLimitPerCategory || 3)) {
    const fallbackIndex = selected.length + 1;
    selected.push({
      id: `${keywordKey(category.label)}-fallback-${fallbackIndex}`,
      kind: 'news',
      title: `${category.label} 최신 공개 자료 보강 필요`,
      source: 'SNUH 메이트',
      publishedAt: new Date().toISOString(),
      summary: `${category.label} 카테고리는 최근 48시간 공개 자료가 적어 다음 회차 보강 관찰이 필요합니다.`,
      url: 'https://snuhmate.com',
      meta: 'fallback',
    });
  }

  return selected.slice(0, pipeline.sourceLimitPerCategory || 3);
}

function createHookDraft(category, source) {
  return compactText(`${category.hookLead}: ${source.kind === 'paper' ? '논문 한 줄' : '뉴스 한 줄'}`, 34);
}

function reviseHookTitle(category, source) {
  const titleCore = compactText(source.title, 24).replace(/[:\-–|]/g, ' ').trim();
  if (source.kind === 'paper') {
    return compactText(`${category.reelTag} 근거, ${titleCore}입니다`, 34);
  }

  if (/\d/.test(titleCore)) {
    return compactText(`${category.reelTag}, 숫자로 보면 ${titleCore}`, 34);
  }

  return compactText(`${category.reelTag}, 지금은 ${titleCore}`, 34);
}

function buildClip(category, source, order) {
  const colors = CATEGORY_COLORS[category.id] || {color: '#3d7eff', soft: '#dce9ff'};
  return {
    id: `short-${String(order).padStart(2, '0')}`,
    order,
    fileName: `clip-${String(order).padStart(2, '0')}.mp4`,
    category: category.label,
    categoryShort: category.shortLabel || category.label,
    categoryColor: colors.color,
    categorySoft: colors.soft,
    hookDraft: createHookDraft(category, source),
    hookTitle: reviseHookTitle(category, source),
    insight: compactText(source.summary || source.title, 90),
    corePoint: compactText(source.title, 68),
    visualLayout: compactText(`상단 후킹 제목 · 중앙 ${category.shortLabel || category.label} 핵심 2줄 · 하단 ${source.kind === 'paper' ? '논문' : '뉴스'} 출처`, 64),
    sourceType: source.kind,
    sourceName: source.source,
    sourceTitle: source.title,
    sourceUrl: source.url,
    publishedAt: source.publishedAt || new Date().toISOString(),
    durationSec: 10,
    renderTemplate: 'hook-top / insight-center / source-bottom',
    sourceLabel: `${source.kind === 'paper' ? '논문' : '뉴스'} · ${source.source}`,
    publishedLabel: formatDateLabel(source.publishedAt),
  };
}

async function buildDataset() {
  const pipeline = loadPipelineConfig();
  const decks = [];
  const clips = [];
  let order = 1;

  for (const category of pipeline.categories || []) {
    const [news, papers] = await Promise.all([
      fetchGoogleNews(category, pipeline),
      fetchOpenAlex(category, pipeline),
    ]);

    const selectedSources = selectTopSources(category, news, papers, pipeline);

    decks.push({
      categoryId: category.id,
      category: category.label,
      selectedSourceCount: selectedSources.length,
      sources: selectedSources,
      angle: category.deckAngle,
      generatedAt: new Date().toISOString(),
    });

    selectedSources.slice(0, 2).forEach((source) => {
      clips.push(buildClip(category, source, order));
      order += 1;
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    cadenceHours: pipeline.cadenceHours || 48,
    lookbackDays: pipeline.lookbackDays || 2,
    promptSummary: pipeline.prompts,
    decks,
    clips: clips.slice(0, pipeline.shortsLimit || 10),
  };
}

await fs.mkdir(DATA_DIR, {recursive: true});
await fs.mkdir(ROOT_DATA_DIR, {recursive: true});

const dataset = await buildDataset();

await fs.writeFile(path.join(DATA_DIR, 'latest-shorts.json'), JSON.stringify(dataset.clips, null, 2));
await fs.writeFile(path.join(DATA_DIR, 'latest-dataset.json'), JSON.stringify(dataset, null, 2));
await fs.writeFile(path.join(ROOT_DATA_DIR, 'cardnews-latest.json'), JSON.stringify(dataset, null, 2));

console.log(`Built ${dataset.decks.length} decks and ${dataset.clips.length} short clips.`);
