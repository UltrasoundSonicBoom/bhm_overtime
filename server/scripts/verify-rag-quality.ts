import 'dotenv/config'
import postgres from 'postgres'
import { embed } from '../src/services/embedding'
import { classifyRagMode, rerankMatches } from '../src/services/rag-ranking'

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

type FaqRow = {
  id: number
  question: string
  article_ref: string | null
  answer?: string
  score: number | string
}

type DocRow = {
  id: number
  section_title: string | null
  metadata: Record<string, unknown> | null
  content?: string
  score: number | string
}

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
        answer,
        article_ref,
        1 - (embedding <=> ${vector}::vector) as score
      from faq_entries
      where version_id = ${version.id}
        and embedding is not null
        and is_published = true
      order by embedding <=> ${vector}::vector
      limit 8
    `

    const docMatches = await sql`
      select
        id,
        section_title,
        content,
        metadata,
        1 - (embedding <=> ${vector}::vector) as score
      from regulation_documents
      where version_id = ${version.id}
        and embedding is not null
      order by embedding <=> ${vector}::vector
      limit 8
    `

    const rerankedFaqMatches = rerankMatches(
      question,
      (faqMatches as unknown as FaqRow[]).map((match) => ({
        ...match,
        score: Number(match.score),
      })),
      (match) => `${match.question}\n${match.answer || ''}\n${match.article_ref || ''}`,
    )

    const rerankedDocMatches = rerankMatches(
      question,
      (docMatches as unknown as DocRow[]).map((match) => ({
        ...match,
        score: Number(match.score),
      })),
      (match) => {
        const metadata = match.metadata as Record<string, unknown> | null
        return `${match.section_title || ''}\n${String(metadata?.article_ref || '')}\n${match.content || ''}`
      },
    )

    const topFaqScore = Number(rerankedFaqMatches[0]?.rerankedScore || 0)
    const topDocScore = Number(rerankedDocMatches[0]?.rerankedScore || 0)
    const classification = classifyRagMode({ faqScore: topFaqScore, docScore: topDocScore })

    results.push({
      question,
      classification,
      topFaqScore,
      topDocScore,
      faqMatches: rerankedFaqMatches.slice(0, 3).map((match) => ({
        question: match.question,
        articleRef: match.article_ref,
        score: Number(match.rerankedScore),
      })),
      docMatches: rerankedDocMatches.slice(0, 3).map((match) => {
        const metadata = match.metadata as Record<string, unknown> | null
        return {
          sectionTitle: match.section_title,
          articleRef: metadata?.article_ref ?? null,
          score: Number(match.rerankedScore),
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
