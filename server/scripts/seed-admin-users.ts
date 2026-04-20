import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

const ADMINS = [
  { email: 'kgh1379@gmail.com', role: 'super_admin' },
  { email: 'ultrasoundsonicboom@gmail.com', role: 'super_admin' },
] as const

async function main() {
  for (const a of ADMINS) {
    const existing = await sql`SELECT id, user_id, role FROM admin_users WHERE email = ${a.email}`
    if (existing.length > 0) {
      const row = existing[0]
      if (row.role !== a.role) {
        await sql`UPDATE admin_users SET role = ${a.role}, is_active = true WHERE id = ${row.id}`
        console.log(`UPDATED ${a.email}: role → ${a.role}`)
      } else {
        console.log(`SKIP    ${a.email}: already ${a.role}`)
      }
    } else {
      const userId = randomUUID()
      await sql`
        INSERT INTO admin_users (user_id, email, role, is_active)
        VALUES (${userId}, ${a.email}, ${a.role}, true)
      `
      console.log(`INSERT  ${a.email} (user_id=${userId}, role=${a.role})`)
    }
  }

  console.log('\n최종 admin_users:')
  const rows = await sql`SELECT email, role, is_active FROM admin_users ORDER BY email`
  console.table(rows)

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
