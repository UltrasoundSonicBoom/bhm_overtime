import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import 'dotenv/config'
import postgres from 'postgres'
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

// ==== JSON shape (new schema, post T1 restructure) ====

interface Table {
  title?: string
  headers: string[]
  rows: string[][]
}

interface HistoryItem {
  date?: string
  type?: string
  note?: string
}

interface RelatedAgreement {
  date: string
  title: string
  content: string
}

interface Article {
  id: string
  chapter: string
  title: string
  content: string
  clauses?: string[]
  tables?: Table[]
  history?: HistoryItem[]
  related_agreements?: RelatedAgreement[]
}

interface ComputationRef {
  value: number | string | boolean
  source_article?: string
  clause?: number | string
  note?: string
}

interface RegulationJson {
  meta: {
    version: string
    effective_date: string
    last_updated: string
  }
  articles: Article[]
  side_agreements: Article[]
  appendix: Article[]
  computation_refs: Record<string, ComputationRef>
}

// ==== Helpers ====

function tableToProse(table: Table, articleTitle: string): string {
  const head = table.title ? `${table.title}` : articleTitle
  const parts: string[] = [head]
  for (const row of table.rows) {
    const kv = table.headers
      .map((h, i) => `${h}: ${row[i] ?? ''}`)
      .join(', ')
    parts.push(kv)
  }
  return parts.join('\n')
}

function buildArticleChunkText(art: Article): string {
  const parts: string[] = [art.title]
  if (art.content) parts.push(art.content)
  if (art.clauses?.length) parts.push(art.clauses.join('\n'))
  if (art.tables?.length) {
    for (const t of art.tables) parts.push(tableToProse(t, art.title))
  }
  if (art.history?.length) {
    const hist = art.history
      .map((h) => `[${h.type ?? ''}${h.date ? ` ${h.date}` : ''}] ${h.note ?? ''}`)
      .join('\n')
    parts.push(hist)
  }
  return parts.filter(Boolean).join('\n')
}

// ==== Loaders ====

async function loadFromJson(): Promise<Omit<ChunkRecord, 'embedding'>[]> {
  const raw = await readFile(resolve(ROOT, 'data/union_regulation_2026.json'), 'utf-8')
  const reg: RegulationJson = JSON.parse(raw)
  const out: Omit<ChunkRecord, 'embedding'>[] = []

  // 1) Articles — full article bundle (content + clauses + tables + history)
  for (const art of reg.articles) {
    const text = buildArticleChunkText(art)
    const chunks = await chunkArticle(
      { title: art.title, content: text, clauses: [] },
      1400,
    )
    chunks.forEach((content, idx) => {
      out.push({
        source: 'union_regulation_json',
        docId: `${art.id}${chunks.length > 1 ? `__p${idx}` : ''}`,
        chapter: art.chapter,
        articleTitle: art.title,
        content,
        tokenCount: Math.ceil(content.length / 2.5),
        metadata: { kind: 'article', article_ref: art.title, origin_id: art.id },
      })
    })
  }

  // 2) Side agreements — each related_agreement becomes its own chunk.
  // Currently 4 agreement_* records each with N related_agreements[] items.
  for (const agree of reg.side_agreements) {
    for (let i = 0; i < (agree.related_agreements?.length ?? 0); i++) {
      const ra = agree.related_agreements![i]
      const body = `${agree.title} — ${ra.title} (${ra.date})\n${ra.content}`
      const chunks = await chunkText(body, { chunkSize: 900, overlap: 120 })
      chunks.forEach((content, cidx) => {
        out.push({
          source: 'union_regulation_json',
          docId: `${agree.id}__ra${i}${chunks.length > 1 ? `__p${cidx}` : ''}`,
          chapter: agree.chapter,
          articleTitle: `${agree.title} [${ra.date}]`,
          content,
          tokenCount: Math.ceil(content.length / 2.5),
          metadata: {
            kind: 'side_agreement',
            parent_id: agree.id,
            ra_date: ra.date,
            ra_title: ra.title,
          },
        })
      })
    }
  }

  // 3) Appendix — each table row (for pay tables) or each clause (refresh) → own chunk
  for (const app of reg.appendix) {
    if (app.tables?.length) {
      for (const table of app.tables) {
        // Header chunk — table description
        const headerChunk = `${app.title} — ${table.title ?? ''}\n헤더: ${table.headers.join(' / ')}`
        out.push({
          source: 'union_regulation_json',
          docId: `${app.id}__${slug(table.title ?? 'table')}__header`,
          chapter: app.chapter,
          articleTitle: `${app.title} — ${table.title ?? ''}`,
          content: headerChunk,
          tokenCount: Math.ceil(headerChunk.length / 2.5),
          metadata: { kind: 'appendix_table_header', parent_id: app.id },
        })
        // Per-row chunks
        table.rows.forEach((row, rIdx) => {
          const prose = table.headers
            .map((h, i) => `${h}: ${row[i] ?? ''}`)
            .join(', ')
          const body = `${app.title} — ${table.title ?? ''}\n${prose}`
          out.push({
            source: 'union_regulation_json',
            docId: `${app.id}__${slug(table.title ?? 'table')}__r${rIdx}`,
            chapter: app.chapter,
            articleTitle: `${app.title} — ${table.title ?? ''}`,
            content: body,
            tokenCount: Math.ceil(body.length / 2.5),
            metadata: {
              kind: 'appendix_row',
              parent_id: app.id,
              table_title: table.title,
              row_index: rIdx,
            },
          })
        })
      }
    }
    if (app.clauses?.length) {
      const body = `${app.title}\n${app.clauses.join('\n')}`
      const chunks = await chunkText(body, { chunkSize: 900, overlap: 120 })
      chunks.forEach((content, cidx) => {
        out.push({
          source: 'union_regulation_json',
          docId: `${app.id}__clauses${chunks.length > 1 ? `__p${cidx}` : ''}`,
          chapter: app.chapter,
          articleTitle: app.title,
          content,
          tokenCount: Math.ceil(content.length / 2.5),
          metadata: { kind: 'appendix_clauses', parent_id: app.id },
        })
      })
    }
  }

  // 4) Computation refs — bundle into a single "계산 상수 요약" chunk
  const refLines = Object.entries(reg.computation_refs).map(
    ([k, v]) => `${k} = ${v.value}${v.note ? ` (${v.note})` : ''} [${v.source_article ?? ''}]`,
  )
  const refsBody = `계산에 사용되는 핵심 상수 요약\n${refLines.join('\n')}`
  const refChunks = await chunkText(refsBody, { chunkSize: 1200, overlap: 120 })
  refChunks.forEach((content, cidx) => {
    out.push({
      source: 'union_regulation_json',
      docId: `computation_refs${refChunks.length > 1 ? `__p${cidx}` : ''}`,
      chapter: '계산 상수',
      articleTitle: '계산 상수 요약',
      content,
      tokenCount: Math.ceil(content.length / 2.5),
      metadata: { kind: 'computation_refs' },
    })
  })

  return out
}

function slug(s: string): string {
  return s.replace(/[\s()/,]+/g, '_').toLowerCase().slice(0, 40)
}

// ==== Main ====

async function truncateAll(): Promise<number> {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
  const result = await sql`DELETE FROM rag_chunks_v2`
  await sql.end()
  return result.count
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const write = process.argv.includes('--write')
  const clearAll = process.argv.includes('--clear-all')
  if (!dryRun && !write) {
    console.error('Use --dry-run or --write (add --clear-all to purge legacy chunks before insert)')
    process.exit(1)
  }

  console.log('Loading chunks from union_regulation_2026.json...')
  const all = await loadFromJson()
  console.log(`Total: ${all.length} chunks`)

  // Breakdown by kind
  const byKind: Record<string, number> = {}
  for (const c of all) {
    const k = (c.metadata?.kind as string) ?? 'unknown'
    byKind[k] = (byKind[k] ?? 0) + 1
  }
  console.log('By kind:')
  for (const [k, n] of Object.entries(byKind).sort()) {
    console.log(`  ${k}: ${n}`)
  }

  if (dryRun) {
    console.log('\n=== DRY RUN PREVIEW ===')
    // Pick 1 of each kind
    const seen = new Set<string>()
    for (const c of all) {
      const k = (c.metadata?.kind as string) ?? 'unknown'
      if (seen.has(k)) continue
      seen.add(k)
      console.log(`\n[${k}] ${c.docId} — ${c.articleTitle}`)
      console.log(c.content.slice(0, 180) + (c.content.length > 180 ? '...' : ''))
    }
    const totalTokens = all.reduce((s, c) => s + (c.tokenCount ?? 0), 0)
    console.log(
      `\nEstimated tokens: ${totalTokens} (~$${((totalTokens / 1000) * 0.00002).toFixed(4)} embed)`,
    )
    return
  }

  console.log('\nEmbedding...')
  const embeddings = await embedBatch(all.map((c) => c.content))
  const records: ChunkRecord[] = all.map((c, i) => ({ ...c, embedding: embeddings[i] }))

  if (clearAll) {
    console.log('Clearing ALL rows from rag_chunks_v2 (--clear-all)...')
    const removed = await truncateAll()
    console.log(`  Removed ${removed} legacy rows.`)
  } else {
    console.log('Clearing existing docs for replay (by doc_id)...')
    const docIds = records.map((r) => r.docId).filter((id): id is string => !!id)
    await deleteByDocIds(docIds)
  }

  console.log('Inserting...')
  const inserted = await insertChunks(records)
  const total = await countAll()
  console.log(`Inserted ${inserted}. Total in table: ${total}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
