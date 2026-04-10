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

function compactNormalize(text: string): string {
  return normalizeForSearch(text).replace(/\s+/g, '')
}

function stemKoreanToken(token: string): string {
  return token
    .replace(
      /(입니다|이었다|이다|인가요|인가|되나요|돼요|나요|예요|이에요|이란|란|하기|하면|하며|하는|되어|되고|되는)$/u,
      '',
    )
    .replace(/(으로|에서|에게|부터|까지|처럼)$/u, '')
    .replace(/(은|는|이|가|을|를|에|의|도|만|과|와|로)$/u, '')
}

function tokenize(text: string): string[] {
  return normalizeForSearch(text)
    .split(' ')
    .map((token) => stemKoreanToken(token.trim()))
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

function buildQueryConcepts(query: string): string[] {
  const tokens = tokenize(query)
  const concepts = new Set<string>()

  for (const token of tokens) {
    if (token.length >= 2) {
      concepts.add(token)
    }
  }

  for (let index = 0; index < tokens.length - 1; index++) {
    const joined = `${tokens[index]}${tokens[index + 1]}`
    if (joined.length >= 4) {
      concepts.add(joined)
    }
  }

  return [...concepts]
}

function buildJoinedQueryConcepts(query: string): string[] {
  const tokens = tokenize(query)
  const concepts = new Set<string>()

  for (let index = 0; index < tokens.length - 1; index++) {
    const joined = `${tokens[index]}${tokens[index + 1]}`
    if (joined.length >= 4) {
      concepts.add(joined)
    }
  }

  return [...concepts]
}

function conceptBoost(query: string, candidate: string): number {
  const compactCandidate = compactNormalize(candidate)
  if (!compactCandidate) {
    return 0
  }

  const genericConcepts = new Set([
    '몇',
    '며칠',
    '최대',
    '얼마',
    '가산',
    '수당',
    '시간',
    '휴가',
    '근무',
    '인정',
  ])

  let boost = 0
  for (const concept of buildJoinedQueryConcepts(query)) {
    if (compactCandidate.includes(compactNormalize(concept))) {
      boost += 0.12
    }
  }

  for (const concept of buildQueryConcepts(query)) {
    if (
      concept.length >= 2 &&
      !genericConcepts.has(concept) &&
      compactCandidate.includes(compactNormalize(concept))
    ) {
      boost += 0.08
    }
  }

  return Math.min(boost, 0.16)
}

function intentBoost(query: string, candidate: string): number {
  const normalizedQuery = normalizeForSearch(query)
  const normalizedCandidate = normalizeForSearch(candidate)

  let boost = 0

  const asksHours =
    normalizedQuery.includes('몇 시간') ||
    (normalizedQuery.includes('시간') && normalizedQuery.includes('인정'))
  const asksDays =
    normalizedQuery.includes('며칠') ||
    normalizedQuery.includes('몇 일') ||
    normalizedQuery.includes('휴가')
  const asksAmount =
    normalizedQuery.includes('얼마') ||
    normalizedQuery.includes('가산') ||
    normalizedQuery.includes('수당')
  const asksMaximum =
    normalizedQuery.includes('최대') ||
    normalizedQuery.includes('한도')

  const hasTimeAnswer =
    normalizedCandidate.includes('시간') || normalizedCandidate.includes('인정')
  const hasDayAnswer =
    /\d+\s*일/u.test(normalizedCandidate) || normalizedCandidate.includes('휴가')
  const hasMoneyAnswer =
    normalizedCandidate.includes('수당') ||
    normalizedCandidate.includes('지급') ||
    normalizedCandidate.includes('가산') ||
    normalizedCandidate.includes('원') ||
    normalizedCandidate.includes('150')

  if (asksHours && hasTimeAnswer) {
    boost += 0.06
  }
  if (asksHours && hasMoneyAnswer && !hasTimeAnswer) {
    boost -= 0.04
  }

  if (asksDays && hasDayAnswer) {
    boost += 0.05
  }

  if (asksAmount && hasMoneyAnswer) {
    boost += 0.05
  }

  if (asksMaximum && normalizedCandidate.includes('최대')) {
    boost += 0.04
  }

  return boost
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
        phraseBoost(query, getText(match)) +
        conceptBoost(query, getText(match)) +
        intentBoost(query, getText(match)),
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
