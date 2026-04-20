import { embedOne } from './embedder.js'
import { searchSimilar, type SearchResult } from './store.js'

export function rerankByKeyword(query: string, results: SearchResult[]): SearchResult[] {
  const tokens = query
    .toLowerCase()
    .split(/[\s,.?!]+/)
    .filter((t) => t.length >= 2)
  return [...results]
    .map((r) => {
      const hay = `${r.articleTitle ?? ''} ${r.content}`.toLowerCase()
      const boost = tokens.reduce((acc, t) => (hay.includes(t) ? acc + 0.05 : acc), 0)
      return { ...r, score: r.score + boost }
    })
    .sort((a, b) => b.score - a.score)
}

export async function retrieve(query: string, k = 6): Promise<SearchResult[]> {
  const emb = await embedOne(query)
  const raw = await searchSimilar(emb, k * 2)
  return rerankByKeyword(query, raw).slice(0, k)
}
