/**
 * Task D6: 규정 변경 Agent 파이프라인
 *
 * 새 규정 JSON을 현행 활성 버전과 비교하여:
 *   1. 변경 항목 diff 출력
 *   2. 각 변경 항목을 admin review queue(content_entries)에 draft로 등록
 *   3. "이번 개정으로 바뀐 것" FAQ 초안 자동 생성 (OpenAI)
 *
 * 사용법:
 *   npx tsx scripts/regulation-change-pipeline.ts --input=hospital_rule_master_2027.json
 *   npx tsx scripts/regulation-change-pipeline.ts --input=hospital_rule_master_2027.json --apply
 *   npx tsx scripts/regulation-change-pipeline.ts --input=hospital_rule_master_2027.json --apply --faq
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import OpenAI from 'openai'
import { ruleVersions, ruleEntries } from '../src/db/schema'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
void __dirname

const APPLY = process.argv.includes('--apply')
const GEN_FAQ = process.argv.includes('--faq')
const INPUT_ARG = process.argv.find((a) => a.startsWith('--input='))
const INPUT_FILE = INPUT_ARG ? INPUT_ARG.split('=')[1] : null

if (!INPUT_FILE) {
  console.error('[ERROR] --input=<파일경로> 필수')
  console.error('예: npx tsx scripts/regulation-change-pipeline.ts --input=hospital_rule_master_2027.json')
  process.exit(1)
}

// ── 타입 ─────────────────────────────────────────────────────────────────

interface DiffItem {
  category: string
  key: string
  type: 'added' | 'removed' | 'changed'
  oldValue?: unknown
  newValue?: unknown
}

// ── flat-key 변환 (migrate-rules-from-json.ts와 동일 로직) ───────────────

type Entry = { category: string; key: string; value: unknown }

function flatten(obj: unknown, prefix: string): { key: string; value: unknown }[] {
  if (obj === null || typeof obj !== 'object') return [{ key: prefix, value: obj }]
  if (Array.isArray(obj)) return [{ key: prefix, value: obj }]
  const entries: { key: string; value: unknown }[] = []
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const childKey = prefix ? `${prefix}.${k}` : k
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      entries.push({ key: childKey, value: v })
    } else {
      entries.push(...flatten(v, childKey))
    }
  }
  return entries
}

function buildEntries(json: Record<string, unknown>): Entry[] {
  const result: Entry[] = []
  for (const [category, subtree] of Object.entries(json)) {
    if (category === '_meta') continue
    for (const { key, value } of flatten(subtree, '')) {
      result.push({ category, key, value })
    }
  }
  return result
}

// ── diff 계산 ──────────────────────────────────────────────────────────────

function computeDiff(
  newEntries: Entry[],
  currentMap: Map<string, unknown>,
): DiffItem[] {
  const diff: DiffItem[] = []
  const newMap = new Map(newEntries.map((e) => [`${e.category}.${e.key}`, e]))

  // changed / added
  for (const [fullKey, entry] of newMap) {
    const currentVal = currentMap.get(fullKey)
    if (currentVal === undefined) {
      diff.push({ category: entry.category, key: entry.key, type: 'added', newValue: entry.value })
    } else if (JSON.stringify(currentVal) !== JSON.stringify(entry.value)) {
      diff.push({ category: entry.category, key: entry.key, type: 'changed', oldValue: currentVal, newValue: entry.value })
    }
  }

  // removed
  for (const [fullKey] of currentMap) {
    if (!newMap.has(fullKey)) {
      const [category, ...rest] = fullKey.split('.')
      diff.push({ category, key: rest.join('.'), type: 'removed', oldValue: currentMap.get(fullKey) })
    }
  }

  return diff
}

// ── FAQ 초안 생성 (OpenAI) ─────────────────────────────────────────────────

async function generateFaqDraft(diff: DiffItem[]): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const changedSummary = diff
    .filter((d) => d.type !== 'added')
    .slice(0, 30) // 첫 30개만 전달 (토큰 절약)
    .map((d) => {
      if (d.type === 'changed') {
        return `[변경] ${d.category}.${d.key}: ${JSON.stringify(d.oldValue)} → ${JSON.stringify(d.newValue)}`
      }
      return `[삭제] ${d.category}.${d.key}: ${JSON.stringify(d.oldValue)}`
    })
    .join('\n')

  const addedSummary = diff
    .filter((d) => d.type === 'added')
    .slice(0, 10)
    .map((d) => `[추가] ${d.category}.${d.key}: ${JSON.stringify(d.newValue)}`)
    .join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `당신은 병원 단체협약 규정 변경 사항을 직원들에게 쉽게 설명하는 FAQ 작성자입니다.
아래 규정 변경 항목들을 바탕으로 FAQ 형식(Q&A)의 한국어 안내문을 작성해주세요.
마크다운 형식으로 작성하고, Q는 ## Q로, A는 일반 단락으로 표현해주세요.
기술적인 키 이름은 사람이 이해할 수 있는 용어로 변환해주세요.
최대 5개의 Q&A를 작성해주세요.`,
      },
      {
        role: 'user',
        content: `다음 규정 변경 항목들을 바탕으로 FAQ를 작성해주세요:\n\n변경 사항:\n${changedSummary}\n\n추가 사항:\n${addedSummary}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content ?? ''
}

// ── 메인 ──────────────────────────────────────────────────────────────────

async function main() {
  // 1) 입력 파일 파싱
  const inputPath = path.resolve(process.cwd(), INPUT_FILE!)
  if (!fs.existsSync(inputPath)) {
    console.error(`[ERROR] 파일 없음: ${inputPath}`)
    process.exit(1)
  }

  const newJson = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as Record<string, unknown>
  const newEntries = buildEntries(newJson)
  const newVersion = (newJson._meta as Record<string, unknown>)?.version as string ?? path.basename(inputPath, '.json')

  console.log(`\n[D6 Regulation Change Pipeline]`)
  console.log(`  입력 파일: ${inputPath}`)
  console.log(`  신규 버전: ${newVersion}`)
  console.log(`  변환된 항목 수: ${newEntries.length}`)
  console.log(`  모드: ${APPLY ? '실제 적재' : 'dry-run'}${GEN_FAQ ? ' + FAQ 생성' : ''}`)

  // 2) DB 연결
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('[ERROR] DATABASE_URL 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  try {
    // 3) 현행 활성 버전 rule_entries 조회
    const [activeVersion] = await db
      .select({ id: ruleVersions.id, version: ruleVersions.version })
      .from(ruleVersions)
      .where(eq(ruleVersions.isActive, true))
      .limit(1)

    if (!activeVersion) {
      console.log('\n[WARN] 현행 활성 버전이 없습니다. diff를 건너뜁니다.')
      console.log('  → migrate-rules-from-json.ts --apply 로 초기 버전을 먼저 적재하세요.')
      await client.end()
      return
    }

    console.log(`\n  현행 활성 버전: ${activeVersion.version} (id=${activeVersion.id})`)

    const currentRows = await db
      .select({ key: ruleEntries.key, valueJson: ruleEntries.valueJson, category: ruleEntries.category })
      .from(ruleEntries)
      .where(eq(ruleEntries.versionId, activeVersion.id))

    // currentMap: fullKey(category.key) → value
    const currentMap = new Map<string, unknown>(
      currentRows.map((r) => [`${r.category}.${r.key}`, r.valueJson]),
    )

    // 4) diff 계산
    const diff = computeDiff(newEntries, currentMap)

    const added = diff.filter((d) => d.type === 'added').length
    const changed = diff.filter((d) => d.type === 'changed').length
    const removed = diff.filter((d) => d.type === 'removed').length

    console.log(`\n  변경 항목 수: +${added} 추가 / ~${changed} 변경 / -${removed} 삭제`)

    if (diff.length === 0) {
      console.log('  [INFO] 현행 버전과 동일합니다. 변경 사항 없음.')
      await client.end()
      return
    }

    // 상세 diff 출력
    console.log('\n  상위 20개 변경 항목:')
    diff.slice(0, 20).forEach((d) => {
      const icon = d.type === 'added' ? '+ ' : d.type === 'removed' ? '- ' : '~ '
      console.log(`    ${icon}${d.category}.${d.key}`)
      if (d.type === 'changed') {
        console.log(`      이전: ${JSON.stringify(d.oldValue)}`)
        console.log(`      이후: ${JSON.stringify(d.newValue)}`)
      }
    })

    if (!APPLY) {
      console.log('\n[dry-run] --apply 플래그 없음. DB 변경 없이 종료합니다.')
      console.log(`실제 적재하려면: npx tsx scripts/regulation-change-pipeline.ts --input=${INPUT_FILE} --apply\n`)
      await client.end()
      return
    }

    // 5) review queue에 변경 항목 draft 등록 (content_entries)
    // 카테고리별로 1개 draft 항목 생성 (항목이 너무 많으면 묶어서 처리)
    const byCategory = new Map<string, DiffItem[]>()
    for (const d of diff) {
      if (!byCategory.has(d.category)) byCategory.set(d.category, [])
      byCategory.get(d.category)!.push(d)
    }

    let draftCount = 0
    for (const [category, items] of byCategory) {
      const title = `[규정 변경] ${newVersion} — ${category} (${items.length}개 항목)`
      const bodyLines = items.map((d) => {
        if (d.type === 'added') return `- **추가** \`${d.key}\`: ${JSON.stringify(d.newValue)}`
        if (d.type === 'removed') return `- **삭제** \`${d.key}\` (이전 값: ${JSON.stringify(d.oldValue)})`
        return `- **변경** \`${d.key}\`: ${JSON.stringify(d.oldValue)} → ${JSON.stringify(d.newValue)}`
      })
      const body = `## ${category} 변경 사항\n\n` + bodyLines.join('\n')

      await client`
        INSERT INTO content_entries (
          content_type, slug, title, status, body, metadata, created_by, updated_by
        ) VALUES (
          'notice',
          ${`regulation-diff-${newVersion}-${category}-${Date.now()}`},
          ${title},
          'draft',
          ${body},
          ${JSON.stringify({ sourceVersion: newVersion, category, diffCount: items.length, type: 'regulation_change_draft' })},
          NULL,
          NULL
        )
        ON CONFLICT DO NOTHING
      `
      draftCount++
    }

    console.log(`\n[완료] review queue에 ${draftCount}개 draft 등록`)

    // 6) FAQ 초안 생성 (--faq 플래그)
    if (GEN_FAQ && process.env.OPENAI_API_KEY) {
      console.log('\n[FAQ 생성 중] OpenAI gpt-4o-mini 호출...')
      const faqMarkdown = await generateFaqDraft(diff)

      if (faqMarkdown) {
        const faqTitle = `[FAQ] ${newVersion} 규정 개정 — 주요 변경 사항`
        await client`
          INSERT INTO content_entries (
            content_type, slug, title, status, body, metadata, created_by, updated_by
          ) VALUES (
            'faq',
            ${`faq-regulation-change-${newVersion}-${Date.now()}`},
            ${faqTitle},
            'draft',
            ${faqMarkdown},
            ${JSON.stringify({ sourceVersion: newVersion, type: 'ai_faq_draft', model: 'gpt-4o-mini' })},
            NULL,
            NULL
          )
          ON CONFLICT DO NOTHING
        `
        console.log(`  FAQ 초안 등록 완료: "${faqTitle}"`)
        console.log(`\n--- FAQ 미리보기 ---\n${faqMarkdown.slice(0, 500)}...\n`)
      }
    } else if (GEN_FAQ && !process.env.OPENAI_API_KEY) {
      console.log('\n[SKIP] OPENAI_API_KEY 없음. FAQ 생성 건너뜁니다.')
    }

    console.log('\n  다음 단계:')
    console.log('    1. Admin → Review 탭에서 draft 항목 확인')
    console.log('    2. 내용 검토 후 published 전환')
    console.log(`    3. 새 규정 버전(${newVersion})을 activate 하려면: PUT /api/admin/rule-versions/:id/activate`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})
