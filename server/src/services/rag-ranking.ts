export const FAQ_DIRECT_THRESHOLD = 0.8
export const DOC_RETRIEVAL_THRESHOLD = 0.55

type ScoredMatch = {
  score: number
}

export type RerankedMatch<T> = T & {
  rerankedScore: number
}

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return normalizeForSearch(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}

function lexicalOverlap(query: string, candidate: string): number {
  const queryTokens = tokenize(query)
  const candidateTokens = new Set(tokenize(candidate))

  if (queryTokens.length === 0) {
    return 0
  }

  const matches = queryTokens.filter((token) => candidateTokens.has(token)).length
  return matches / queryTokens.length
}

function phraseBoost(query: string, candidate: string): number {
  const normalizedQuery = normalizeForSearch(query)
  const normalizedCandidate = normalizeForSearch(candidate)

  if (!normalizedQuery || !normalizedCandidate) {
    return 0
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 0.08
  }

  return 0
}

export function rerankMatches<T extends ScoredMatch>(
  query: string,
  matches: T[],
  getText: (match: T) => string,
): RerankedMatch<T>[] {
  return matches
    .map((match) => ({
      ...match,
      rerankedScore:
        match.score +
        lexicalOverlap(query, getText(match)) * 0.15 +
        phraseBoost(query, getText(match)),
    }))
    .sort((left, right) => right.rerankedScore - left.rerankedScore)
}

export function classifyRagMode(input: {
  faqScore: number
  docScore: number
}): 'faq-direct' | 'regulation-doc' | 'fallback' {
  if (input.faqScore >= FAQ_DIRECT_THRESHOLD) {
    return 'faq-direct'
  }

  if (input.docScore >= DOC_RETRIEVAL_THRESHOLD) {
    return 'regulation-doc'
  }

  return 'fallback'
}
