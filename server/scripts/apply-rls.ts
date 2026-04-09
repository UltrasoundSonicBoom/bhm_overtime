import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

async function main() {
  const rlsPath = join(import.meta.dirname, 'rls-policies.sql')
  const rlsSQL = readFileSync(rlsPath, 'utf-8')

  const statements = rlsSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Executing ${statements.length} RLS statements...`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.split('\n').filter(l => !l.startsWith('--'))[0]?.trim().slice(0, 70) || ''
    try {
      await sql.unsafe(stmt)
      console.log(`  [${i + 1}/${statements.length}] ✓ ${preview}`)
    } catch (e: unknown) {
      const err = e as { message: string }
      if (err.message.includes('already exists')) {
        console.log(`  [${i + 1}/${statements.length}] ⊘ ${preview} (already exists)`)
      } else {
        console.error(`  [${i + 1}/${statements.length}] ✗ ${preview}`)
        console.error(`    ${err.message}`)
      }
    }
  }

  // HNSW 인덱스 확인
  const indexes = await sql`
    SELECT indexname FROM pg_indexes
    WHERE indexname LIKE '%embedding%' OR indexname LIKE '%hnsw%'
  `
  console.log('\nVector indexes:', indexes.map(i => i.indexname))

  // RLS 확인
  const rls = await sql`
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname = 'public' AND tablename IN (
      'regulation_versions','regulation_documents','pay_tables','allowances',
      'calculation_rules','faq_entries','chat_history','admin_users','leave_types','ceremonies'
    )
    ORDER BY tablename
  `
  console.log('\nRLS status:')
  rls.forEach(t => console.log(`  ${t.tablename}: ${t.rowsecurity ? '✓ enabled' : '✗ disabled'}`))

  await sql.end()
  console.log('\nDone!')
}

main().catch(e => { console.error(e); process.exit(1) })
