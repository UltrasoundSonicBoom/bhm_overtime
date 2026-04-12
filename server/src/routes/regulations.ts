import { Hono } from 'hono'
import postgres from 'postgres'
import 'dotenv/config'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const regulationRoutes = new Hono()

type DocRow = {
  id: number
  chunk_index: number
  source_file: string | null
  section_title: string | null
  content: string
  metadata: Record<string, unknown> | null
  token_count: number | null
}

type VersionRow = {
  id: number
  year: number
  title: string
  status: string
  effective_date: string | null
}

type BrowseArticle = {
  title: string
  ref: string
  body: string
  sourceFile: string | null
  chunkIds: number[]
}

type BrowseSection = {
  category: string
  icon: string
  articles: BrowseArticle[]
}

const CATEGORY_ICONS: Record<string, string> = {
  '근로시간/수당': '💰',
  '휴가/휴직': '🏖️',
  '복리후생': '🏥',
  '인사/징계': '📋',
  '안전/보건': '🛡️',
  '부칙': '📎',
  '기타': '📄',
}

function inferCategory(sectionTitle: string | null, metadata: Record<string, unknown> | null): string {
  if (metadata?.category && typeof metadata.category === 'string') {
    return metadata.category
  }

  const title = sectionTitle || ''
  const articleRef = String(metadata?.article_ref || '')
  const combined = `${title} ${articleRef}`

  if (/수당|임금|급여|보수|시간외|근로시간|온콜|통상임금|가산/.test(combined)) return '근로시간/수당'
  if (/휴가|휴직|연차|출산|육아|경조|병가/.test(combined)) return '휴가/휴직'
  if (/복리|의료|할인|장기근속|명절|학자금|복지/.test(combined)) return '복리후생'
  if (/인사|징계|해고|전보|승진|평가/.test(combined)) return '인사/징계'
  if (/안전|보건|재해|산재/.test(combined)) return '안전/보건'
  if (/부칙/.test(combined)) return '부칙'

  return '기타'
}

function mergeConsecutiveChunks(docs: DocRow[]): BrowseArticle[] {
  const grouped = new Map<string, { docs: DocRow[]; ids: number[] }>()

  for (const doc of docs) {
    const key = doc.section_title || `chunk-${doc.id}`
    if (!grouped.has(key)) {
      grouped.set(key, { docs: [], ids: [] })
    }
    const group = grouped.get(key)!
    group.docs.push(doc)
    group.ids.push(doc.id)
  }

  const articles: BrowseArticle[] = []
  for (const [title, group] of grouped) {
    const sortedDocs = group.docs.sort((a, b) => a.chunk_index - b.chunk_index)
    const body = sortedDocs.map(d => d.content).join('\n\n')
    const firstMeta = sortedDocs[0]?.metadata as Record<string, unknown> | null
    const ref = String(firstMeta?.article_ref || '')

    articles.push({
      title,
      ref,
      body,
      sourceFile: sortedDocs[0]?.source_file || null,
      chunkIds: group.ids,
    })
  }

  return articles
}

/**
 * GET /api/regulations/browse?versionId=
 *
 * Returns regulation_documents grouped as browse-friendly sections.
 * If no versionId, uses the active version.
 * This is the same data source RAG uses for retrieval.
 */
regulationRoutes.get('/browse', async (c) => {
  const versionIdParam = c.req.query('versionId')

  let version: VersionRow
  if (versionIdParam) {
    const rows = await sql<VersionRow[]>`
      select id, year, title, status, effective_date
      from regulation_versions
      where id = ${Number(versionIdParam)}
      limit 1
    `
    if (rows.length === 0) {
      return c.json({ error: 'Version not found' }, 404)
    }
    version = rows[0]
  } else {
    const rows = await sql<VersionRow[]>`
      select id, year, title, status, effective_date
      from regulation_versions
      where status = 'active'
      order by year desc, id desc
      limit 1
    `
    if (rows.length === 0) {
      return c.json({
        version: null,
        sections: [],
      })
    }
    version = rows[0]
  }

  const docs = await sql<DocRow[]>`
    select
      id,
      chunk_index,
      source_file,
      section_title,
      content,
      metadata,
      token_count
    from regulation_documents
    where version_id = ${version.id}
    order by chunk_index asc
  `

  // Group by category
  const categoryMap = new Map<string, DocRow[]>()
  for (const doc of docs) {
    const category = inferCategory(doc.section_title, doc.metadata)
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    categoryMap.get(category)!.push(doc)
  }

  const sections: BrowseSection[] = []
  for (const [category, categoryDocs] of categoryMap) {
    sections.push({
      category,
      icon: CATEGORY_ICONS[category] || '📄',
      articles: mergeConsecutiveChunks(categoryDocs),
    })
  }

  c.header('Cache-Control', 'public, max-age=300')
  return c.json({
    version: {
      id: version.id,
      year: version.year,
      title: version.title,
      status: version.status,
    },
    sections,
  })
})

/**
 * GET /api/regulations/chunks?ids=1,2,3
 *
 * Returns specific chunks by ID, for cross-referencing from RAG citations.
 */
regulationRoutes.get('/chunks', async (c) => {
  const idsParam = c.req.query('ids')
  if (!idsParam) {
    return c.json({ error: 'ids parameter required' }, 400)
  }

  const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n))
  if (ids.length === 0) {
    return c.json({ results: [] })
  }

  const rows = await sql`
    select
      rd.id,
      rd.section_title,
      rd.content,
      rd.metadata,
      rd.source_file,
      rd.chunk_index,
      rv.year,
      rv.title as version_title,
      rv.status as version_status
    from regulation_documents rd
    inner join regulation_versions rv on rv.id = rd.version_id
    where rd.id = any(${ids})
    order by rd.chunk_index asc
  `

  return c.json({ results: rows })
})

export default regulationRoutes
