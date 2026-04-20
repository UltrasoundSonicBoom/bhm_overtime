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
- 간결하고 친절하게, 한국어로 답변하세요`

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
