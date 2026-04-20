import { embedOne } from './embedder.js'
import { searchSimilar, type SearchResult } from './store.js'

// 규정 질문에서 자주 쓰이는 구어체 ↔ 원문 동의어 매핑.
// 쿼리 리라이트가 아니라 rerank 시 확장 매칭에 사용.
const SYNONYMS: Record<string, string[]> = {
  연차: ['연차', '유급휴가', '연차휴가', '휴가'],
  수당: ['수당', '지급', '보전'],
  상여금: ['상여금', '보너스'],
  경조: ['경조', '경조금', '청원휴가', '결혼', '조의'],
  휴직: ['휴직', '육아', '질병', '간병'],
  야근: ['야근', '야간', '연장'],
  월급: ['월급', '임금', '급여', '보수'],
}

function expandTokens(tokens: string[]): string[] {
  const out = new Set<string>()
  for (const t of tokens) {
    out.add(t)
    const lowered = t.toLowerCase()
    for (const [key, alts] of Object.entries(SYNONYMS)) {
      if (lowered.includes(key) || alts.some((a) => lowered.includes(a))) {
        alts.forEach((a) => out.add(a))
      }
    }
  }
  return Array.from(out)
}

export function rerankByKeyword(query: string, results: SearchResult[]): SearchResult[] {
  const baseTokens = query
    .toLowerCase()
    .split(/[\s,.?!]+/)
    .filter((t) => t.length >= 2)
  const tokens = expandTokens(baseTokens)

  return [...results]
    .map((r) => {
      const title = (r.articleTitle ?? '').toLowerCase()
      const body = (r.content ?? '').toLowerCase()
      // Title matches carry much more weight than body matches.
      let titleHits = 0
      let bodyHits = 0
      for (const t of tokens) {
        if (title.includes(t)) titleHits++
        else if (body.includes(t)) bodyHits++
      }
      // ALL tokens present in a single field → extra bonus (whole-phrase intent).
      const allInTitle = baseTokens.every((t) => title.includes(t))
      const allInBody = baseTokens.every((t) => body.includes(t))
      // Articles (metadata.kind === 'article') are authoritative for regulation Qs.
      const kind = (r.metadata as { kind?: string } | null)?.kind
      const kindBonus = kind === 'article' ? 0.04 : 0

      const boost =
        titleHits * 0.15 +
        bodyHits * 0.03 +
        (allInTitle ? 0.15 : 0) +
        (allInBody ? 0.05 : 0) +
        kindBonus

      return { ...r, score: r.score + boost }
    })
    .sort((a, b) => b.score - a.score)
}

export async function retrieve(query: string, k = 6): Promise<SearchResult[]> {
  const emb = await embedOne(query)
  // Pull a wide candidate pool so key articles that rank low on raw vector
  // similarity (but high on keyword/synonym match after rerank) still enter.
  // Example: "연차 수당" raw vector places 제36조(연차 유급휴가) below many
  // 보수표 rows; only with pool ≥30 does rerank pull it back to #1.
  const raw = await searchSimilar(emb, Math.max(k * 6, 36))
  return rerankByKeyword(query, raw).slice(0, k)
}
