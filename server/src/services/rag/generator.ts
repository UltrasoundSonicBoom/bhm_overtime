import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { SearchResult } from './store.js'

const LLM_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `당신은 서울대학교병원 노동조합 단체협약 상담 AI입니다.
2026 단체협약 기준으로 답변합니다.

규칙:
- 아래 제공된 규정 컨텍스트만을 근거로 답변하세요
- 답변에 해당 조항 번호(예: 제36조, 제41조)를 반드시 포함하세요
- 수치(금액·일수·시간)는 원문 그대로 기재하세요
- 간결하고 친절하게, 한국어로 답변하세요
- 질문이 계산을 요구하는데 정확한 값이 원문에 없으면, 원문에 명시된 계산식(예: "평균임금 × 미사용일수")을 제시하고 필요한 변수를 안내하세요. 이럴 때도 "해당 규정을 확인하지 못했습니다" 라고 하지 마세요.
- 진짜로 컨텍스트에 관련 근거가 없을 때만 "해당 규정을 확인하지 못했습니다"

답변 구성 (이 포맷을 따르세요):
1. 핵심 답변을 2~4문장으로 설명 (계산식이 필요하면 포함)
2. 빈 줄
3. "## 원문 근거: 제N조(제목)" 헤더
4. 원문을 아래 중 알맞은 형식으로:
   - clauses/항목 → 불렛 리스트 (각 항목 앞 "- ")
   - 표 데이터(보수표, 경조금표 등) → 마크다운 표
   - 단순 문장 → 그대로 인용
5. 원문은 컨텍스트에 실제로 있는 내용만 포함.`

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
