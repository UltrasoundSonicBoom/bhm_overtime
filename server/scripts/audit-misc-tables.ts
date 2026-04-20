import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

async function main() {
  const tables = [
    'allowances',
    'pay_tables',
    'leave_types',
    'ceremonies',
    'calculation_rules',
    'rule_versions',
    'rule_entries',
    'admin_users',
    'content_entries',
    'approval_tasks',
    'audit_logs',
  ]

  console.log('Neon misc tables (baseline check):')
  for (const t of tables) {
    try {
      const r = await sql<Array<{ c: number }>>`SELECT COUNT(*)::int AS c FROM ${sql(t)}`
      console.log(`  ${t.padEnd(24)} ${r[0].c}`)
    } catch (e) {
      console.log(`  ${t.padEnd(24)} ERR ${(e as Error).message}`)
    }
  }

  console.log('\nadmin_users sample:')
  try {
    const rows = await sql`SELECT email, role FROM admin_users ORDER BY email`
    console.table(rows)
  } catch (e) { console.log('  read failed:', (e as Error).message) }

  await sql.end()
}
main().catch(e => { console.error(e); process.exit(1) })
