import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MODEL = 'text-embedding-3-small'
const DIMENSIONS = 1536

/**
 * 단일 텍스트 임베딩 생성
 */
export async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: MODEL,
    input: text,
    dimensions: DIMENSIONS,
  })
  return res.data[0].embedding
}

/**
 * 배치 임베딩 생성 (최대 2048개)
 * rate limit 대응: 실패 시 지수 backoff 재시도
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    let attempt = 0

    while (attempt < 3) {
      try {
        const res = await openai.embeddings.create({
          model: MODEL,
          input: batch,
          dimensions: DIMENSIONS,
        })
        results.push(...res.data.map(d => d.embedding))
        break
      } catch (e: unknown) {
        attempt++
        const err = e as { status?: number; message?: string }
        if (attempt >= 3) throw e
        const delay = Math.pow(2, attempt) * 1000
        console.warn(`Embedding retry ${attempt}/3 (${err.message}), waiting ${delay}ms...`)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }

  return results
}
