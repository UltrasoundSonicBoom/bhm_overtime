import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

async function main() {
  // pgvector 확장 활성화
  console.log('Enabling pgvector extension...')
  await sql`CREATE EXTENSION IF NOT EXISTS vector`

  // migration SQL 읽기
  const migrationPath = join(import.meta.dirname, '..', 'drizzle', '0000_silent_human_torch.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  // statement-breakpoint로 분리하여 순차 실행
  const statements = migrationSQL
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  console.log(`Executing ${statements.length} statements...`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.slice(0, 80).replace(/\n/g, ' ')
    try {
      await sql.unsafe(stmt)
      console.log(`  [${i + 1}/${statements.length}] ✓ ${preview}...`)
    } catch (e: unknown) {
      const err = e as { message: string }
      // 이미 존재하는 경우 스킵
      if (err.message.includes('already exists')) {
        console.log(`  [${i + 1}/${statements.length}] ⊘ Already exists: ${preview}...`)
      } else {
        console.error(`  [${i + 1}/${statements.length}] ✗ ${preview}...`)
        console.error(`    Error: ${err.message}`)
        throw e
      }
    }
  }

  // 테이블 확인
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `
  console.log('\nAll public tables:')
  tables.forEach(t => console.log(`  - ${t.table_name}`))

  await sql.end()
  console.log('\nDone!')
}

main().catch(e => { console.error(e); process.exit(1) })
