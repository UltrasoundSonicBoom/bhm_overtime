import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const sql = postgres(
  process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL!,
  { prepare: false },
)

async function main() {
  const migrationName = process.argv[2]
  if (!migrationName) {
    throw new Error('Usage: npm run db:apply -- <migration-file.sql>')
  }

  const migrationPath = path.resolve(import.meta.dirname, '..', 'drizzle', migrationName)
  const migrationSql = readFileSync(migrationPath, 'utf8')
  const statements = migrationSql
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean)

  console.log(`Applying ${migrationName} with ${statements.length} statements...`)

  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index]!
    const preview = statement.slice(0, 84).replace(/\s+/g, ' ')
    try {
      await sql.unsafe(statement)
      console.log(`[${index + 1}/${statements.length}] ok ${preview}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (
        message.includes('already exists')
        || message.includes('duplicate key')
      ) {
        console.log(`[${index + 1}/${statements.length}] skip ${preview} :: ${message}`)
        continue
      }
      throw error
    }
  }

  await sql.end()
  console.log(`Applied ${migrationName}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
