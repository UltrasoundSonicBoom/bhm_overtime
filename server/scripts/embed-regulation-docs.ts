import 'dotenv/config'
import postgres from 'postgres'
import { embedBatch } from '../src/services/embedding'

type CliOptions = {
  versionId?: number
  write: boolean
  limit?: number
  allowActiveVersionWrite: boolean
}

type VersionRow = {
  id: number
  year: number
  title: string
  status: string
}

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    write: false,
    allowActiveVersionWrite: false,
  }

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]

    if (arg === '--write') {
      options.write = true
      continue
    }
    if (arg === '--allow-active-version-write') {
      options.allowActiveVersionWrite = true
      continue
    }
    if (arg.startsWith('--version-id=')) {
      options.versionId = Number(arg.split('=')[1])
      continue
    }
    if (arg === '--version-id') {
      options.versionId = Number(argv[++index])
      continue
    }
    if (arg.startsWith('--limit=')) {
      options.limit = Number(arg.split('=')[1])
      continue
    }
    if (arg === '--limit') {
      options.limit = Number(argv[++index])
    }
  }

  return options
}

async function resolveVersion(versionId?: number): Promise<VersionRow> {
  if (versionId) {
    const rows = await sql<VersionRow[]>`
      select id, year, title, status
      from regulation_versions
      where id = ${versionId}
      limit 1
    `
    if (rows.length === 0) {
      throw new Error(`Version ${versionId} not found`)
    }
    return rows[0]
  }

  const rows = await sql<VersionRow[]>`
    select id, year, title, status
    from regulation_versions
    where status = 'active'
    order by year desc, id desc
    limit 1
  `

  if (rows.length === 0) {
    throw new Error('No active regulation version found')
  }

  return rows[0]
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const version = await resolveVersion(options.versionId)

  if (options.write && version.status === 'active' && !options.allowActiveVersionWrite) {
    throw new Error(
      `Version ${version.id} is active. Re-run with --allow-active-version-write if you intentionally want to affect live retrieval.`,
    )
  }

  const limitClause = options.limit ? sql`limit ${options.limit}` : sql``
  const rows = await sql`
    select id, section_title, content
    from regulation_documents
    where version_id = ${version.id}
      and embedding is null
    order by chunk_index asc
    ${limitClause}
  `

  console.log(JSON.stringify({
    mode: options.write ? 'write' : 'dry-run',
    version,
    pendingEmbeddingCount: rows.length,
    sample: rows.slice(0, 5).map((row) => ({
      id: row.id,
      sectionTitle: row.section_title,
      preview: String(row.content).slice(0, 160),
    })),
  }, null, 2))

  if (!options.write || rows.length === 0) {
    if (!options.write) {
      console.log('\nDry run only. Re-run with --write to update embeddings.')
    }
    return
  }

  const texts = rows.map((row) => `${row.section_title || ''}\n${row.content}`.trim())
  const embeddings = await embedBatch(texts)

  for (let index = 0; index < rows.length; index++) {
    const vector = `[${embeddings[index].join(',')}]`
    await sql`
      update regulation_documents
      set embedding = ${vector}::vector
      where id = ${rows[index].id}
    `
  }

  const [stats] = await sql`
    select
      count(*)::int as total,
      count(*) filter (where embedding is not null)::int as embedded,
      count(*) filter (where embedding is null)::int as pending
    from regulation_documents
    where version_id = ${version.id}
  `

  console.log(`\nEmbedded ${rows.length} regulation chunks.`)
  console.log(JSON.stringify({ versionId: version.id, stats }, null, 2))
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await sql.end({ timeout: 1 })
  })
