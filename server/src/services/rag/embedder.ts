import OpenAI from 'openai'

const MODEL = 'text-embedding-3-small'
const DIMENSIONS = 1536

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function embedOne(text: string): Promise<number[]> {
  const res = await client.embeddings.create({
    model: MODEL,
    input: text,
    dimensions: DIMENSIONS,
  })
  return res.data[0].embedding
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH = 100
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH)
    let attempt = 0
    while (attempt < 3) {
      try {
        const res = await client.embeddings.create({
          model: MODEL,
          input: slice,
          dimensions: DIMENSIONS,
        })
        out.push(...res.data.map((d) => d.embedding))
        break
      } catch (e) {
        attempt++
        if (attempt >= 3) throw e
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000))
      }
    }
  }
  return out
}
