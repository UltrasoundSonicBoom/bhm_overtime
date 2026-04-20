import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import 'dotenv/config'
import {
  chunkArticle,
  chunkText,
  embedBatch,
  insertChunks,
  deleteByDocIds,
  countAll,
  type ChunkRecord,
} from '../src/services/rag/index.js'

const ROOT = resolve(new URL('.', import.meta.url).pathname, '../..')

interface JsonArticle {
  id: string
  chapter: string
  title: string
  content: string
  clauses?: string[]
}

async function loadJsonChunks(): Promise<Omit<ChunkRecord, 'embedding'>[]> {
  const raw = await readFile(resolve(ROOT, 'data/union_regulation_2026.json'), 'utf-8')
  const articles: JsonArticle[] = JSON.parse(raw)
  const out: Omit<ChunkRecord, 'embedding'>[] = []
  for (const art of articles) {
    const chunks = await chunkArticle(
      { title: art.title, content: art.content, clauses: art.clauses },
      1200,
    )
    chunks.forEach((content, idx) => {
      out.push({
        source: 'union_regulation_json',
        docId: `${art.id}${chunks.length > 1 ? `__p${idx}` : ''}`,
        chapter: art.chapter,
        articleTitle: art.title,
        content,
        tokenCount: Math.ceil(content.length / 2.5),
        metadata: { article_ref: art.title, origin_id: art.id },
      })
    })
  }
  return out
}

async function loadMdChunks(): Promise<Omit<ChunkRecord, 'embedding'>[]> {
  const raw = await readFile(resolve(ROOT, 'data/regulations_full_v2026.md'), 'utf-8')
  const lines = raw.split('\n')
  type Section = { chapter: string; title: string; body: string[] }
  const sections: Section[] = []
  let curChapter = ''
  let cur: Section | null = null
  for (const line of lines) {
    if (line.startsWith('## ')) {
      curChapter = line.replace(/^##\s+/, '').trim()
      continue
    }
    if (line.startsWith('### ')) {
      if (cur) sections.push(cur)
      cur = { chapter: curChapter, title: line.replace(/^###\s+/, '').trim(), body: [] }
      continue
    }
    if (cur) cur.body.push(line)
  }
  if (cur) sections.push(cur)

  const out: Omit<ChunkRecord, 'embedding'>[] = []
  for (const sec of sections) {
    const text = `${sec.title}\n${sec.body.join('\n')}`.trim()
    const slug = sec.title.replace(/[\s()]+/g, '_').toLowerCase()
    const chunks = await chunkText(text, { chunkSize: 800, overlap: 120 })
    chunks.forEach((content, idx) => {
      out.push({
        source: 'regulations_md',
        docId: `md_${slug}${chunks.length > 1 ? `__p${idx}` : ''}`,
        chapter: sec.chapter,
        articleTitle: sec.title,
        content,
        tokenCount: Math.ceil(content.length / 2.5),
        metadata: { slug },
      })
    })
  }
  return out
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const write = process.argv.includes('--write')
  if (!dryRun && !write) {
    console.error('Use --dry-run or --write')
    process.exit(1)
  }

  console.log('Loading JSON chunks...')
  const jsonChunks = await loadJsonChunks()
  console.log(`  ${jsonChunks.length} chunks from union_regulation_2026.json`)

  console.log('Loading MD chunks...')
  const mdChunks = await loadMdChunks()
  console.log(`  ${mdChunks.length} chunks from regulations_full_v2026.md`)

  const all = [...jsonChunks, ...mdChunks]
  console.log(`Total: ${all.length} chunks`)

  if (dryRun) {
    console.log('\n=== DRY RUN PREVIEW (first 3) ===')
    for (const c of all.slice(0, 3)) {
      console.log(`[${c.source}] ${c.docId} — ${c.articleTitle}`)
      console.log(c.content.slice(0, 120) + '...')
      console.log('')
    }
    const totalTokens = all.reduce((s, c) => s + (c.tokenCount ?? 0), 0)
    console.log(`Estimated tokens: ${totalTokens} (~$${((totalTokens / 1000) * 0.00002).toFixed(4)} for embedding)`)
    return
  }

  console.log('\nEmbedding...')
  const embeddings = await embedBatch(all.map((c) => c.content))
  const records: ChunkRecord[] = all.map((c, i) => ({ ...c, embedding: embeddings[i] }))

  console.log('Clearing existing docs for replay...')
  const docIds = records.map((r) => r.docId).filter((id): id is string => !!id)
  await deleteByDocIds(docIds)

  console.log('Inserting...')
  const inserted = await insertChunks(records)
  const total = await countAll()
  console.log(`Inserted ${inserted}. Total in table: ${total}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
