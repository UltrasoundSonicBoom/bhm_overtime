import OpenAI from 'openai'
import 'dotenv/config'

const CARD_NEWS_MODEL = process.env.CARD_NEWS_MODEL || 'gpt-4o-mini'
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; SNUHMateCardNews/1.0; +https://snuhmate.com)',
  Accept: 'application/json, text/plain, */*',
}

const MAX_NEWS_ITEMS = 5
const MAX_PAPER_ITEMS = 4

export interface CardNewsQueryPlan {
  keyword: string
  newsQueryKo: string
  paperQueryEn: string
  angle: string
}

export interface CardNewsSource {
  id: string
  kind: 'news' | 'paper'
  title: string
  source: string
  publishedAt: string | null
  summary: string
  url: string
  meta?: string | null
}

export interface CardNewsCard {
  slot: 'cover' | 'pulse' | 'source' | 'research' | 'watch'
  eyebrow: string
  title: string
  body: string
  bullets: string[]
  highlight: string
  footer: string
  sourceIds: string[]
}

export interface CardNewsDeck {
  keyword: string
  deckTitle: string
  deckSubtitle: string
  cards: CardNewsCard[]
  sources: CardNewsSource[]
  newsCount: number
  paperCount: number
  generatedAt: string
  queryPlan: CardNewsQueryPlan
}

type KeywordBundle = {
  plan: CardNewsQueryPlan
  news: CardNewsSource[]
  papers: CardNewsSource[]
}

export function normalizeKeywords(rawKeywords: string[]): string[] {
  const seen = new Set<string>()
  const keywords: string[] = []

  for (const raw of rawKeywords) {
    const cleaned = String(raw ?? '')
      .split(/[\n,]/)
      .map((part) => part.trim())
      .filter(Boolean)

    for (const keyword of cleaned) {
      const lowered = keyword.toLowerCase()
      if (seen.has(lowered)) continue
      seen.add(lowered)
      keywords.push(keyword)
    }
  }

  return keywords.slice(0, 6)
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ')
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractXmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return decodeHtml(match?.[1] || '')
}

function compactText(value: string, maxLength = 220): string {
  const cleaned = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1).trim()}…`
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()
  const result: T[] = []

  for (const item of items) {
    const key = getKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }

  return result
}

function safeDateLabel(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function parseGoogleNewsRss(xml: string, idPrefix = 'news'): CardNewsSource[] {
  const itemBlocks = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).map((match) => match[1])

  return itemBlocks.slice(0, MAX_NEWS_ITEMS).map((block, index) => {
    const source = extractXmlTag(block, 'source')
    const rawTitle = extractXmlTag(block, 'title')
    const description = compactText(stripTags(extractXmlTag(block, 'description')), 180)
    const title = source && rawTitle.endsWith(` - ${source}`)
      ? rawTitle.slice(0, -(source.length + 3)).trim()
      : rawTitle

    return {
      id: `${idPrefix}-${index + 1}`,
      kind: 'news' as const,
      title: compactText(title, 110),
      source: source || 'Google 뉴스',
      publishedAt: safeDateLabel(extractXmlTag(block, 'pubDate')),
      summary: description || title,
      url: extractXmlTag(block, 'link'),
      meta: source || null,
    }
  }).filter((item) => item.title && item.url)
}

export function rebuildAbstractText(
  invertedIndex?: Record<string, number[] | undefined> | null,
): string {
  if (!invertedIndex || typeof invertedIndex !== 'object') return ''

  const positions: string[] = []
  Object.entries(invertedIndex).forEach(([word, indexes]) => {
    if (!Array.isArray(indexes)) return
    indexes.forEach((position) => {
      positions[position] = word
    })
  })

  return positions
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractArxivEntries(xml: string, idPrefix = 'paper'): CardNewsSource[] {
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).map((match) => match[1])

  return entries.slice(0, MAX_PAPER_ITEMS).map((entry, index) => {
    const title = compactText(extractXmlTag(entry, 'title'), 140)
    const summary = compactText(extractXmlTag(entry, 'summary'), 240)
    const publishedAt = safeDateLabel(extractXmlTag(entry, 'published'))
    const linkMatch = entry.match(/<link[^>]+href="([^"]+)"[^>]+rel="alternate"[^>]*\/?>/i)

    return {
      id: `${idPrefix}-${index + 1}`,
      kind: 'paper' as const,
      title,
      source: 'arXiv',
      publishedAt,
      summary,
      url: decodeHtml(linkMatch?.[1] || extractXmlTag(entry, 'id')),
      meta: 'preprint',
    }
  }).filter((item) => item.title && item.url)
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: FETCH_HEADERS })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`)
  }
  return response.text()
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: FETCH_HEADERS })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`)
  }
  return response.json() as Promise<T>
}

async function searchGoogleNews(query: string, keyword: string): Promise<CardNewsSource[]> {
  if (!query.trim()) return []

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`
  try {
    const xml = await fetchText(url)
    const parsed = parseGoogleNewsRss(xml, `${sanitizeId(keyword)}-news`)
    return uniqueBy(parsed, (item) => item.title.toLowerCase()).slice(0, MAX_NEWS_ITEMS)
  } catch {
    return []
  }
}

type OpenAlexResponse = {
  results?: Array<{
    display_name?: string
    publication_date?: string
    cited_by_count?: number
    primary_location?: {
      landing_page_url?: string | null
      source?: {
        display_name?: string | null
      } | null
    } | null
    open_access?: {
      oa_url?: string | null
    } | null
    doi?: string | null
    abstract_inverted_index?: Record<string, number[]>
  }>
}

async function searchOpenAlex(query: string, keyword: string): Promise<CardNewsSource[]> {
  if (!query.trim()) return []

  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=has_abstract:true&sort=relevance_score:desc&per-page=${MAX_PAPER_ITEMS}`

  try {
    const json = await fetchJson<OpenAlexResponse>(url)
    const items = (json.results || []).map((item, index) => {
      const abstract = compactText(rebuildAbstractText(item.abstract_inverted_index), 240)
      const source =
        item.primary_location?.source?.display_name ||
        (item.doi ? 'DOI' : 'OpenAlex')

      return {
        id: `${sanitizeId(keyword)}-paper-${index + 1}`,
        kind: 'paper' as const,
        title: compactText(item.display_name || '', 140),
        source,
        publishedAt: safeDateLabel(item.publication_date || null),
        summary: abstract || '초록 정보를 확인하지 못했습니다.',
        url:
          item.primary_location?.landing_page_url ||
          item.open_access?.oa_url ||
          item.doi ||
          '',
        meta: item.cited_by_count ? `cited ${item.cited_by_count}` : null,
      }
    })

    return uniqueBy(
      items.filter((item) => item.title && item.url),
      (item) => item.title.toLowerCase(),
    ).slice(0, MAX_PAPER_ITEMS)
  } catch {
    return []
  }
}

async function searchArxiv(query: string, keyword: string): Promise<CardNewsSource[]> {
  if (!query.trim()) return []

  const normalized = query
    .trim()
    .replace(/\s+/g, '+AND+')
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(normalized)}&start=0&max_results=${MAX_PAPER_ITEMS}`

  try {
    const xml = await fetchText(url)
    return uniqueBy(
      extractArxivEntries(xml, `${sanitizeId(keyword)}-arxiv`),
      (item) => item.title.toLowerCase(),
    ).slice(0, MAX_PAPER_ITEMS)
  } catch {
    return []
  }
}

function sanitizeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'topic'
}

function buildFallbackPlan(keyword: string): CardNewsQueryPlan {
  return {
    keyword,
    newsQueryKo: keyword,
    paperQueryEn: keyword,
    angle: `${keyword} 관련 흐름을 최근 뉴스와 연구 관점으로 정리합니다.`,
  }
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = String(text ?? '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null

  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

async function buildKeywordPlans(keywords: string[]): Promise<CardNewsQueryPlan[]> {
  if (!openai || keywords.length === 0) {
    return keywords.map(buildFallbackPlan)
  }

  try {
    const response = await openai.chat.completions.create({
      model: CARD_NEWS_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: [
            'You convert Korean user keywords into compact news and paper search plans.',
            'Return JSON only.',
            'Schema: {"items":[{"keyword":"", "newsQueryKo":"", "paperQueryEn":"", "angle":""}]}',
            'newsQueryKo should stay in Korean.',
            'paperQueryEn should be a concise English academic query.',
            'angle must be one short Korean sentence.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({ keywords }),
        },
      ],
    })

    const parsed = extractJsonObject(response.choices[0]?.message?.content || '')
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : []

    const mapped = rawItems
      .map((item) => {
        const keyword = String((item as Record<string, unknown>).keyword || '').trim()
        if (!keyword) return null
        return {
          keyword,
          newsQueryKo: String((item as Record<string, unknown>).newsQueryKo || keyword).trim() || keyword,
          paperQueryEn: String((item as Record<string, unknown>).paperQueryEn || keyword).trim() || keyword,
          angle: String((item as Record<string, unknown>).angle || `${keyword} 관련 흐름을 정리합니다.`).trim(),
        } satisfies CardNewsQueryPlan
      })
      .filter((item): item is CardNewsQueryPlan => Boolean(item))

    return keywords.map((keyword) => mapped.find((item) => item.keyword === keyword) || buildFallbackPlan(keyword))
  } catch {
    return keywords.map(buildFallbackPlan)
  }
}

async function gatherKeywordBundle(plan: CardNewsQueryPlan): Promise<KeywordBundle> {
  const newsCandidates = uniqueBy(
    [plan.newsQueryKo, plan.keyword].filter(Boolean),
    (item) => item.toLowerCase(),
  )
  const paperCandidates = uniqueBy(
    [plan.paperQueryEn, plan.keyword].filter(Boolean),
    (item) => item.toLowerCase(),
  )

  const newsResults = uniqueBy(
    (await Promise.all(newsCandidates.slice(0, 2).map((query) => searchGoogleNews(query, plan.keyword)))).flat(),
    (item) => item.title.toLowerCase(),
  ).slice(0, MAX_NEWS_ITEMS)

  const openAlexResults = uniqueBy(
    (await Promise.all(paperCandidates.slice(0, 2).map((query) => searchOpenAlex(query, plan.keyword)))).flat(),
    (item) => item.title.toLowerCase(),
  )

  const arxivResults = openAlexResults.length >= 2
    ? []
    : uniqueBy(
      (await Promise.all(paperCandidates.slice(0, 1).map((query) => searchArxiv(query, plan.keyword)))).flat(),
      (item) => item.title.toLowerCase(),
    )

  const papers = uniqueBy(
    [...openAlexResults, ...arxivResults],
    (item) => item.title.toLowerCase(),
  ).slice(0, MAX_PAPER_ITEMS)

  return {
    plan,
    news: newsResults,
    papers,
  }
}

function trimBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => compactText(String(item || ''), 80))
    .filter(Boolean)
    .slice(0, 3)
}

function normalizeSourceIds(value: unknown, sources: CardNewsSource[]): string[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set(sources.map((source) => source.id))
  return value
    .map((item) => String(item || '').trim())
    .filter((item) => allowed.has(item))
}

function buildFallbackDeck(bundle: KeywordBundle): CardNewsDeck {
  const generatedAt = new Date().toISOString()
  const allSources = [...bundle.news, ...bundle.papers]
  const newsBullets = bundle.news.slice(0, 3).map((item) => item.title)
  const paperBullets = bundle.papers.slice(0, 3).map((item) => item.title)

  const cards: CardNewsCard[] = [
    {
      slot: 'cover',
      eyebrow: 'AUTO CARD NEWS',
      title: `${bundle.plan.keyword} 지금 봐야 할 흐름`,
      body: bundle.plan.angle,
      bullets: [
        `뉴스 ${bundle.news.length}건`,
        `논문 ${bundle.papers.length}편`,
      ],
      highlight: '오늘의 키워드',
      footer: '최근 공개 소스를 기준으로 요약했어요.',
      sourceIds: allSources.slice(0, 2).map((item) => item.id),
    },
    {
      slot: 'pulse',
      eyebrow: 'NEWS PULSE',
      title: '최근 기사에서 많이 보인 포인트',
      body: bundle.news.length
        ? '제목 기준으로 반복된 흐름을 먼저 묶었습니다.'
        : '관련 뉴스 노출이 많지 않아 추가 확인이 필요합니다.',
      bullets: newsBullets.length ? newsBullets : ['관련 뉴스 노출이 제한적입니다.'],
      highlight: `${bundle.news.length}개 기사 수집`,
      footer: '중복 제목은 정리했습니다.',
      sourceIds: bundle.news.slice(0, 3).map((item) => item.id),
    },
    {
      slot: 'source',
      eyebrow: 'SOURCE BOARD',
      title: '뉴스와 연구를 같이 보면',
      body: '헤드라인과 논문 제목을 나란히 두고 주제를 빠르게 잡았습니다.',
      bullets: [...newsBullets.slice(0, 2), ...(paperBullets.slice(0, 1))].slice(0, 3),
      highlight: bundle.papers.length ? '현장 + 연구 같이 보기' : '뉴스 중심 요약',
      footer: '카드 아래 원문 링크를 바로 열 수 있습니다.',
      sourceIds: [...bundle.news.slice(0, 2), ...bundle.papers.slice(0, 1)].map((item) => item.id),
    },
    {
      slot: 'research',
      eyebrow: 'RESEARCH',
      title: bundle.papers.length ? '논문에서 읽히는 방향' : '연구 노출은 아직 얇아요',
      body: bundle.papers.length
        ? '가장 관련도가 높은 논문을 중심으로 한 줄씩 뽑았습니다.'
        : '이 키워드는 최신 기사 대비 공개 논문 연결이 약했습니다.',
      bullets: paperBullets.length ? paperBullets : ['영문 학술 검색 기준으로 즉시 연결된 논문이 적었습니다.'],
      highlight: bundle.papers.length ? `${bundle.papers.length}편 확인` : '논문 보강 필요',
      footer: '학술 검색은 OpenAlex와 arXiv를 함께 봤습니다.',
      sourceIds: bundle.papers.slice(0, 3).map((item) => item.id),
    },
    {
      slot: 'watch',
      eyebrow: 'WHAT TO WATCH',
      title: '다음 업데이트에서 볼 것',
      body: '새 뉴스와 연구를 다시 모으면 아래 포인트가 먼저 바뀔 가능성이 큽니다.',
      bullets: [
        '새 정책·실적 발표 체크',
        '현장 적용 사례 누적 확인',
        '후속 논문·리포트 추가 관찰',
      ],
      highlight: '재생성하면 바로 갱신',
      footer: '같은 키워드로 다시 만들면 최신 카드로 바뀝니다.',
      sourceIds: allSources.slice(0, 2).map((item) => item.id),
    },
  ]

  return {
    keyword: bundle.plan.keyword,
    deckTitle: `${bundle.plan.keyword} 카드뉴스`,
    deckSubtitle: `${bundle.plan.angle} 최근 뉴스 ${bundle.news.length}건, 논문 ${bundle.papers.length}편을 반영했습니다.`,
    cards,
    sources: allSources,
    newsCount: bundle.news.length,
    paperCount: bundle.papers.length,
    generatedAt,
    queryPlan: bundle.plan,
  }
}

async function buildDecksWithModel(bundles: KeywordBundle[]): Promise<CardNewsDeck[] | null> {
  if (!openai || bundles.length === 0) return null

  const sourcePayload = bundles.map((bundle) => ({
    keyword: bundle.plan.keyword,
    newsQueryKo: bundle.plan.newsQueryKo,
    paperQueryEn: bundle.plan.paperQueryEn,
    angle: bundle.plan.angle,
    news: bundle.news.map((item) => ({
      id: item.id,
      title: item.title,
      source: item.source,
      publishedAt: item.publishedAt,
      summary: item.summary,
    })),
    papers: bundle.papers.map((item) => ({
      id: item.id,
      title: item.title,
      source: item.source,
      publishedAt: item.publishedAt,
      summary: item.summary,
      meta: item.meta,
    })),
  }))

  try {
    const response = await openai.chat.completions.create({
      model: CARD_NEWS_MODEL,
      temperature: 0.25,
      messages: [
        {
          role: 'system',
          content: [
            'You are an editorial planner for a Korean mobile card-news app.',
            'Work only from the provided sources.',
            'Never invent facts.',
            'If research coverage is thin, say so clearly.',
            'Return JSON only.',
            'Schema: {"decks":[{"keyword":"","deckTitle":"","deckSubtitle":"","cards":[{"slot":"cover|pulse|source|research|watch","eyebrow":"","title":"","body":"","bullets":[""],"highlight":"","footer":"","sourceIds":[""]}]}]}',
            'Each deck must contain exactly 5 cards, one per slot in this order: cover, pulse, source, research, watch.',
            'Use concise Korean for mobile reading.',
            'Each body must be 1-2 sentences.',
            'Each bullets array must have 2-3 items when possible.',
            'highlight should be a short punch line under 20 Korean characters when possible.',
            'Design guardrails: the cards should feel like a curated mobile digest, not an article.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({ bundles: sourcePayload }),
        },
      ],
    })

    const parsed = extractJsonObject(response.choices[0]?.message?.content || '')
    const rawDecks = Array.isArray(parsed?.decks) ? parsed.decks : []
    const generatedAt = new Date().toISOString()

    const decks = bundles.map((bundle) => {
      const rawDeck = rawDecks.find((item) => {
        const keyword = String((item as Record<string, unknown>).keyword || '').trim()
        return keyword === bundle.plan.keyword
      }) as Record<string, unknown> | undefined

      if (!rawDeck) return buildFallbackDeck(bundle)

      const fallback = buildFallbackDeck(bundle)
      const cardsInput = Array.isArray(rawDeck.cards) ? rawDeck.cards : []
      const cards = ['cover', 'pulse', 'source', 'research', 'watch'].map((slot) => {
        const rawCard = cardsInput.find(
          (item) => String((item as Record<string, unknown>).slot || '').trim() === slot,
        ) as Record<string, unknown> | undefined
        const fallbackCard = fallback.cards.find((item) => item.slot === slot)!

        if (!rawCard) return fallbackCard

        return {
          slot: slot as CardNewsCard['slot'],
          eyebrow: compactText(String(rawCard.eyebrow || fallbackCard.eyebrow), 28),
          title: compactText(String(rawCard.title || fallbackCard.title), 54),
          body: compactText(String(rawCard.body || fallbackCard.body), 160),
          bullets: trimBullets(rawCard.bullets).length
            ? trimBullets(rawCard.bullets)
            : fallbackCard.bullets,
          highlight: compactText(String(rawCard.highlight || fallbackCard.highlight), 30),
          footer: compactText(String(rawCard.footer || fallbackCard.footer), 60),
          sourceIds: normalizeSourceIds(rawCard.sourceIds, fallback.sources).length
            ? normalizeSourceIds(rawCard.sourceIds, fallback.sources)
            : fallbackCard.sourceIds,
        }
      })

      return {
        keyword: bundle.plan.keyword,
        deckTitle: compactText(String(rawDeck.deckTitle || fallback.deckTitle), 40),
        deckSubtitle: compactText(String(rawDeck.deckSubtitle || fallback.deckSubtitle), 110),
        cards,
        sources: fallback.sources,
        newsCount: bundle.news.length,
        paperCount: bundle.papers.length,
        generatedAt,
        queryPlan: bundle.plan,
      } satisfies CardNewsDeck
    })

    return decks
  } catch {
    return null
  }
}

export async function generateCardNewsDecks(keywords: string[]): Promise<CardNewsDeck[]> {
  const normalized = normalizeKeywords(keywords)
  if (!normalized.length) return []

  const plans = await buildKeywordPlans(normalized)
  const bundles = await Promise.all(plans.map(gatherKeywordBundle))
  const modeled = await buildDecksWithModel(bundles)
  if (modeled) return modeled
  return bundles.map(buildFallbackDeck)
}
