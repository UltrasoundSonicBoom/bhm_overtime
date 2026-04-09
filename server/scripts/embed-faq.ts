/**
 * FAQ 임베딩 생성 스크립트
 * faq_entries에서 embedding이 null인 행을 찾아 임베딩 생성 후 업데이트
 */
import 'dotenv/config'
import postgres from 'postgres'
import { embedBatch } from '../src/services/embedding'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

async function main() {
  // embedding이 null인 FAQ 조회
  const rows = await sql`
    SELECT id, question, answer FROM faq_entries
    WHERE embedding IS NULL
    ORDER BY id
  `

  if (rows.length === 0) {
    console.log('All FAQ entries already have embeddings.')
    await sql.end()
    return
  }

  console.log(`Embedding ${rows.length} FAQ entries...`)

  // question + answer 결합하여 임베딩
  const texts = rows.map(r => `${r.question} ${r.answer}`)
  const embeddings = await embedBatch(texts)

  console.log(`Generated ${embeddings.length} embeddings. Updating DB...`)

  for (let i = 0; i < rows.length; i++) {
    const vecStr = `[${embeddings[i].join(',')}]`
    await sql`
      UPDATE faq_entries
      SET embedding = ${vecStr}::vector
      WHERE id = ${rows[i].id}
    `
  }

  // 검증
  const count = await sql`
    SELECT COUNT(*)::int as cnt FROM faq_entries WHERE embedding IS NOT NULL
  `
  console.log(`✓ ${count[0].cnt} FAQ entries now have embeddings`)

  // 시맨틱 유사도 테스트
  const testQuery = '온콜 출근하면 수당'
  const testEmb = (await embedBatch([testQuery]))[0]
  const testVec = `[${testEmb.join(',')}]`
  const similar = await sql`
    SELECT question, 1 - (embedding <=> ${testVec}::vector) as score
    FROM faq_entries
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${testVec}::vector
    LIMIT 3
  `
  console.log(`\nSemantic search test: "${testQuery}"`)
  similar.forEach((r, i) => {
    console.log(`  ${i + 1}. [${Number(r.score).toFixed(3)}] ${r.question}`)
  })

  await sql.end()
  console.log('\nDone!')
}

main().catch(e => { console.error(e); process.exit(1) })
