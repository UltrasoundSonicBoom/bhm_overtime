import 'dotenv/config'
import postgres from 'postgres'
import { embed } from '../src/services/embedding'

type CliOptions = {
  versionId?: number
}

type VersionRow = {
  id: number
  year: number
  title: string
  status: string
}

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const FAQ_DIRECT_THRESHOLD = 0.85
const DOC_RETRIEVAL_THRESHOLD = 0.75

const evaluationQuestions = [
  '온콜 출근하면 몇 시간 인정되나요?',
  '배우자 출산휴가는 며칠인가요?',
  '야간근무를 많이 하면 리커버리 데이가 생기나요?',
  '연차는 최대 며칠까지 쌓이나요?',
  '공휴일 근무하면 얼마나 가산되나요?',
  '가족돌봄 유급휴가는 며칠인가요?',
]

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {}

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg.startsWith('--version-id=')) {
      options.versionId = Number(arg.split('=')[1])
      continue
    }
    if (arg === '--version-id') {
      options.versionId = Number(argv[++index])
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
  const results = []

  for (const question of evaluationQuestions) {
    const questionEmbedding = await embed(question)
    const vector = `[${questionEmbedding.join(',')}]`

    const faqMatches = await sql`
      select
        id,
        question,
        article_ref,
        1 - (embedding <=> ${vector}::vector) as score
      from faq_entries
      where version_id = ${version.id}
        and embedding is not null
        and is_published = true
      order by embedding <=> ${vector}::vector
      limit 3
    `

    const docMatches = await sql`
      select
        id,
        section_title,
        metadata,
        1 - (embedding <=> ${vector}::vector) as score
      from regulation_documents
      where version_id = ${version.id}
        and embedding is not null
      order by embedding <=> ${vector}::vector
      limit 3
    `

    const topFaqScore = Number(faqMatches[0]?.score || 0)
    const topDocScore = Number(docMatches[0]?.score || 0)
    const classification =
      topFaqScore >= FAQ_DIRECT_THRESHOLD
        ? 'faq-direct'
        : topDocScore >= DOC_RETRIEVAL_THRESHOLD
          ? 'regulation-doc'
          : 'fallback'

    results.push({
      question,
      classification,
      topFaqScore,
      topDocScore,
      faqMatches: faqMatches.map((match) => ({
        question: match.question,
        articleRef: match.article_ref,
        score: Number(match.score),
      })),
      docMatches: docMatches.map((match) => {
        const metadata = match.metadata as Record<string, unknown> | null
        return {
          sectionTitle: match.section_title,
          articleRef: metadata?.article_ref ?? null,
          score: Number(match.score),
        }
      }),
    })
  }

  console.log(JSON.stringify({ version, results }, null, 2))
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await sql.end({ timeout: 1 })
  })
