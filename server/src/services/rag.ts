import OpenAI from 'openai'
import postgres from 'postgres'
import 'dotenv/config'
import { embed } from './embedding'
import { classifyRagMode, rerankMatches } from './rag-ranking'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

const LLM_MODEL = 'gpt-4o-mini'

type FaqRow = {
  id: number
  category: string
  question: string
  answer: string
  article_ref: string | null
  score: number | string
}

type DocRow = {
  id: number
  section_title: string | null
  content: string
  metadata: Record<string, unknown> | null
  score: number | string
}

interface RagResult {
  answer: string
  sources: Array<{ title: string; ref: string; score: number }>
  isFaqMatch: boolean
  model: string
  tokenUsage?: { prompt: number; completion: number }
}

/**
 * RAG 파이프라인: 쿼리 임베딩 → 벡터 검색 → FAQ 직접 매치 or LLM 답변
 */
export async function ragAnswer(
  query: string,
  _sessionId?: string,
): Promise<RagResult> {
  // 1. 쿼리 임베딩
  const queryEmb = await embed(query)
  const vecStr = `[${queryEmb.join(',')}]`

  // 2. FAQ 시맨틱 검색 (top 3)
  const faqResults = await sql`
    SELECT
      faq_entries.id,
      faq_entries.category,
      faq_entries.question,
      faq_entries.answer,
      faq_entries.article_ref,
      1 - (faq_entries.embedding <=> ${vecStr}::vector) as score
    FROM faq_entries
    LEFT JOIN regulation_versions
      ON regulation_versions.id = faq_entries.version_id
    WHERE faq_entries.embedding IS NOT NULL
      AND faq_entries.is_published = true
      AND (
        faq_entries.version_id IS NULL
        OR regulation_versions.status = 'active'
      )
    ORDER BY faq_entries.embedding <=> ${vecStr}::vector
    LIMIT 8
  `
  const rerankedFaqResults = rerankMatches(
    query,
    (faqResults as unknown as FaqRow[]).map((faq) => ({
      ...faq,
      score: Number(faq.score),
    })),
    (faq) => `${faq.question}\n${faq.answer}\n${faq.article_ref || ''}`,
  )

  // 3. regulation_documents 시맨틱 검색 (top 5)
  const docResults = await sql`
    SELECT
      regulation_documents.id,
      regulation_documents.section_title,
      regulation_documents.content,
      regulation_documents.metadata,
      1 - (regulation_documents.embedding <=> ${vecStr}::vector) as score
    FROM regulation_documents
    INNER JOIN regulation_versions
      ON regulation_versions.id = regulation_documents.version_id
    WHERE regulation_documents.embedding IS NOT NULL
      AND regulation_versions.status = 'active'
    ORDER BY regulation_documents.embedding <=> ${vecStr}::vector
    LIMIT 8
  `
  const rerankedDocResults = rerankMatches(
    query,
    (docResults as unknown as DocRow[]).map((doc) => ({
      ...doc,
      score: Number(doc.score),
    })),
    (doc) => {
      const metadata = doc.metadata as Record<string, unknown> | null
      return `${doc.section_title || ''}\n${String(metadata?.article_ref || '')}\n${doc.content}`
    },
  )

  const retrievalMode = classifyRagMode({
    faqScore: Number(rerankedFaqResults[0]?.rerankedScore || 0),
    docScore: Number(rerankedDocResults[0]?.rerankedScore || 0),
  })

  // 4. FAQ 직접 매치 (높은 유사도 시 LLM 호출 생략)
  if (retrievalMode === 'faq-direct' && rerankedFaqResults.length > 0) {
    const best = rerankedFaqResults[0]
    return {
      answer: best.answer,
      sources: [{
        title: best.question,
        ref: best.article_ref || '',
        score: Number(best.rerankedScore),
      }],
      isFaqMatch: true,
      model: 'faq-direct',
    }
  }

  // 5. LLM 호출 (컨텍스트 구성)
  let context = ''

  if (rerankedFaqResults.length > 0) {
    context += '## 관련 FAQ\n'
    for (const faq of rerankedFaqResults.slice(0, 3)) {
      context += `Q: ${faq.question}\nA: ${faq.answer}\n(${faq.article_ref || ''})\n\n`
    }
  }

  if (rerankedDocResults.length > 0) {
    context += '## 관련 규정 원문\n'
    for (const doc of rerankedDocResults.slice(0, 5)) {
      const meta = doc.metadata as Record<string, unknown> | null
      context += `### ${doc.section_title || '(제목 없음)'} ${String(meta?.article_ref || '')}\n${doc.content}\n\n`
    }
  }

  const systemPrompt = `당신은 서울대학교병원 노동조합 규정 상담 AI입니다.
2026 단체협약(2025.10.23 갱신) 기준으로 답변합니다.

규칙:
- 아래 제공된 규정/FAQ 컨텍스트만을 근거로 답변하세요
- 답변에 해당 조항 번호(예: 제32조, 별도합의)를 반드시 포함하세요
- 컨텍스트에 없는 내용은 "해당 규정을 확인하지 못했습니다"라고 답하세요
- 간결하고 친절하게 답변하세요
- 금액, 일수 등 수치는 정확하게 기재하세요`

  const response = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${context}\n---\n질문: ${query}` },
    ],
    temperature: 0.3,
    max_tokens: 800,
  })

  const answer = response.choices[0]?.message?.content || '답변을 생성할 수 없습니다.'

  // sources 조합
  const sources: RagResult['sources'] = []
  for (const faq of rerankedFaqResults.slice(0, 2)) {
    sources.push({
      title: faq.question,
      ref: faq.article_ref || '',
      score: Number(faq.rerankedScore),
    })
  }
  for (const doc of rerankedDocResults.slice(0, 3)) {
    const meta = doc.metadata as Record<string, unknown> | null
    sources.push({
      title: doc.section_title || '',
      ref: String(meta?.article_ref || ''),
      score: Number(doc.rerankedScore),
    })
  }

  return {
    answer,
    sources,
    isFaqMatch: false,
    model: LLM_MODEL,
    tokenUsage: {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
    },
  }
}
