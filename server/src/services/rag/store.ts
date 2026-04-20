import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

export interface ChunkRecord {
  source: 'regulations_md' | 'union_regulation_json'
  docId: string | null
  chapter: string | null
  articleTitle: string | null
  content: string
  embedding: number[]
  tokenCount: number | null
  metadata: Record<string, unknown>
}

export async function deleteByDocIds(docIds: string[]): Promise<number> {
  if (!docIds.length) return 0
  const rows = await sql`DELETE FROM rag_chunks_v2 WHERE doc_id IN ${sql(docIds)}`
  return rows.count
}

export async function insertChunks(chunks: ChunkRecord[]): Promise<number> {
  if (!chunks.length) return 0
  const rows = chunks.map((c) => ({
    source: c.source,
    doc_id: c.docId,
    chapter: c.chapter,
    article_title: c.articleTitle,
    content: c.content,
    embedding: `[${c.embedding.join(',')}]`,
    token_count: c.tokenCount,
    metadata: sql.json(c.metadata as postgres.JSONValue),
  }))
  const result = await sql`INSERT INTO rag_chunks_v2 ${sql(rows)}`
  return result.count
}

export interface SearchResult {
  id: number
  source: string
  docId: string | null
  articleTitle: string | null
  chapter: string | null
  content: string
  score: number
  metadata: Record<string, unknown> | null
}

export async function searchSimilar(
  queryEmbedding: number[],
  limit = 6,
): Promise<SearchResult[]> {
  const vec = `[${queryEmbedding.join(',')}]`
  const rows = await sql<SearchResult[]>`
    SELECT
      id,
      source,
      doc_id as "docId",
      article_title as "articleTitle",
      chapter,
      content,
      metadata,
      1 - (embedding <=> ${vec}::vector) AS score
    FROM rag_chunks_v2
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${limit}
  `
  return rows.map((r) => ({ ...r, score: Number(r.score) }))
}

export async function countAll(): Promise<number> {
  const [{ cnt }] = await sql<{ cnt: number }[]>`SELECT count(*)::int AS cnt FROM rag_chunks_v2`
  return cnt
}
