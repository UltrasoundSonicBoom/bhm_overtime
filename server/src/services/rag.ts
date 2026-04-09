import OpenAI from 'openai'
import postgres from 'postgres'
import 'dotenv/config'
import { embed } from './embedding'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

const LLM_MODEL = 'gpt-4o-mini'
const FAQ_DIRECT_THRESHOLD = 0.85

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
    LIMIT 3
  `

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
    LIMIT 5
  `

  // 4. FAQ 직접 매치 (높은 유사도 시 LLM 호출 생략)
  if (faqResults.length > 0 && Number(faqResults[0].score) > FAQ_DIRECT_THRESHOLD) {
    const best = faqResults[0]
    return {
      answer: best.answer,
      sources: [{
        title: best.question,
        ref: best.article_ref || '',
        score: Number(best.score),
      }],
      isFaqMatch: true,
      model: 'faq-direct',
    }
  }

  // 5. LLM 호출 (컨텍스트 구성)
  let context = ''

  if (faqResults.length > 0) {
    context += '## 관련 FAQ\n'
    for (const faq of faqResults) {
      context += `Q: ${faq.question}\nA: ${faq.answer}\n(${faq.article_ref || ''})\n\n`
    }
  }

  if (docResults.length > 0) {
    context += '## 관련 규정 원문\n'
    for (const doc of docResults) {
      const meta = doc.metadata as any
      context += `### ${doc.section_title || '(제목 없음)'} ${meta?.article_ref || ''}\n${doc.content}\n\n`
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
  for (const faq of faqResults.slice(0, 2)) {
    sources.push({
      title: faq.question,
      ref: faq.article_ref || '',
      score: Number(faq.score),
    })
  }
  for (const doc of docResults.slice(0, 3)) {
    const meta = doc.metadata as any
    sources.push({
      title: doc.section_title || '',
      ref: meta?.article_ref || '',
      score: Number(doc.score),
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
