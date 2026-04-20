import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { SearchResult } from './store.js'

const LLM_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `당신은 서울대학교병원 노동조합 단체협약 상담 AI입니다.
2026 단체협약 기준으로 답변합니다.

규칙:
- 아래 제공된 규정 컨텍스트만을 근거로 답변하세요
- 답변에 해당 조항 번호(예: 제36조, 제41조)를 반드시 포함하세요
- 컨텍스트에 없는 내용은 "해당 규정을 확인하지 못했습니다"라고 답하세요
- 금액, 일수 등 수치는 원문 그대로 기재하세요
- 간결하고 친절하게, 한국어로 답변하세요

답변 구성 (반드시 이 포맷을 따르세요):
1. 먼저 질문에 대한 핵심 답변을 2~3문장으로 간결하게 설명
2. 빈 줄
3. "## 원문 근거: 제N조(제목)" 헤더 한 줄
4. 원문을 아래 중 알맞은 형식으로 포함:
   - 조항에 clauses/항목이 있으면 불렛 리스트 (각 항목 앞에 "- " 붙임)
   - 조항이 표 데이터(보수표, 경조금표 등)를 포함하면 마크다운 표 형식:
     | 컬럼1 | 컬럼2 |
     |---|---|
     | 값1 | 값2 |
   - 단순 문장이면 그대로 인용
5. 원문은 컨텍스트에 실제로 있는 내용만. 추가 설명은 절대 금지.`

export function buildContext(results: SearchResult[]): string {
  const lines: string[] = ['## 관련 규정 원문', '']
  for (const r of results) {
    lines.push(`### ${r.articleTitle ?? '(제목 없음)'} [${r.docId ?? ''}]`)
    lines.push(r.content)
    lines.push('')
  }
  return lines.join('\n')
}

export interface GenerateArgs {
  question: string
  results: SearchResult[]
  articleHint?: string
}

export function streamRagAnswer(args: GenerateArgs) {
  const context = buildContext(args.results)
  const userPrefix = args.articleHint ? `[관심 조항: ${args.articleHint}]\n` : ''
  return streamText({
    model: openai(LLM_MODEL),
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `${context}\n---\n${userPrefix}질문: ${args.question}` },
    ],
    temperature: 0.3,
    maxOutputTokens: 800,
  })
}
