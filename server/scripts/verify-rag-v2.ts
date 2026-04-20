import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import 'dotenv/config'
import { retrieve, streamRagAnswer } from '../src/services/rag/index.js'

const ROOT = resolve(new URL('.', import.meta.url).pathname, '../..')

interface GoldenItem {
  question: string
  expected_refs: string[]
}

async function collectAnswer(question: string): Promise<{ answer: string; sources: string[] }> {
  const results = await retrieve(question, 6)
  const stream = streamRagAnswer({ question, results })
  let full = ''
  for await (const delta of stream.textStream) full += delta
  return {
    answer: full,
    sources: results.map((r) => r.articleTitle ?? '').filter(Boolean),
  }
}

async function main() {
  const raw = await readFile(resolve(ROOT, 'server/tests/rag-v2-golden.json'), 'utf-8')
  const items: GoldenItem[] = JSON.parse(raw)

  let pass = 0
  for (const item of items) {
    const { answer, sources } = await collectAnswer(item.question)
    const hay = (answer + ' ' + sources.join(' ')).toLowerCase()
    const ok = item.expected_refs.some((ref) => hay.includes(ref.toLowerCase()))
    if (ok) pass++
    console.log(`${ok ? '✓' : '✗'} ${item.question}`)
    if (!ok) {
      console.log(`    expected refs: ${item.expected_refs.join(', ')}`)
      console.log(`    answer: ${answer.slice(0, 200)}`)
    }
  }

  const total = items.length
  console.log(`\nScore: ${pass}/${total} (${((pass / total) * 100).toFixed(0)}%)`)
  if (pass < 8) {
    console.error('FAIL: expected >= 8/10')
    process.exit(1)
  }
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
