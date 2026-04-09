import 'dotenv/config'
import postgres from 'postgres'
import { accessSync, constants, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type VersionRow = {
  id: number
  year: number
  title: string
  status: string
  effective_date: string | null
  source_files: string[] | null
}

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const repoRoot = resolve(import.meta.dirname, '..', '..')
const defaultSources = [
  'data/2026_handbook.pdf',
  'data/hospital_guidelines_2026.md',
]

function countFaqEntriesInDataJs(): number {
  const dataJsPath = resolve(repoRoot, 'data.js')
  const content = readFileSync(dataJsPath, 'utf8')
  const start = content.indexOf('faq: [')
  if (start < 0) {
    return 0
  }

  let index = content.indexOf('[', start)
  let depth = 0
  let inString = false
  let quote = ''
  let end = -1

  for (; index < content.length; index++) {
    const char = content[index]
    const prev = content[index - 1]

    if (inString) {
      if (char === quote && prev !== '\\') {
        inString = false
        quote = ''
      }
      continue
    }

    if (char === '"' || char === '\'') {
      inString = true
      quote = char
      continue
    }

    if (char === '[') depth++
    if (char === ']') {
      depth--
      if (depth === 0) {
        end = index
        break
      }
    }
  }

  const block = content.slice(start, end + 1)
  return (block.match(/\bq\s*:/g) || []).length
}

function fileExists(relativePath: string): boolean {
  try {
    accessSync(resolve(repoRoot, relativePath), constants.R_OK)
    return true
  } catch {
    return false
  }
}

async function main() {
  const [connection] = await sql`
    select current_database() as db, current_user as db_user, now() as checked_at
  `

  const [counts] = await sql`
    select
      (select count(*)::int from regulation_versions) as regulation_versions,
      (select count(*)::int from regulation_documents) as regulation_documents,
      (select count(*)::int from regulation_documents where embedding is not null) as regulation_documents_embedded,
      (select count(*)::int from faq_entries) as faq_entries,
      (select count(*)::int from faq_entries where embedding is not null) as faq_embedded
  `

  const versions = await sql<VersionRow[]>`
    select id, year, title, status, effective_date, source_files
    from regulation_versions
    order by year desc, id desc
  `

  const dataJsFaqCount = countFaqEntriesInDataJs()
  const sourceChecks = defaultSources.map((relativePath) => ({
    path: relativePath,
    exists: fileExists(relativePath),
  }))

  const activeVersion = versions.find((version) => version.status === 'active') ?? null
  const faqGap = dataJsFaqCount - Number(counts.faq_entries)

  console.log(JSON.stringify({
    environment: {
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      connection,
      repoRoot,
    },
    counts,
    versions,
    activeVersion,
    dataParity: {
      dataJsFaqCount,
      dbFaqCount: Number(counts.faq_entries),
      faqGap,
    },
    sourceChecks,
    decision: {
      baselineDb: 'remote-supabase',
      writeModeDefault: 'dry-run',
      reason: 'public routes are live; ingest and embedding scripts should require explicit write flags',
    },
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await sql.end({ timeout: 1 })
  })
