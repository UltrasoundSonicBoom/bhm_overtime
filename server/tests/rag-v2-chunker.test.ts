import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunkText, chunkArticle } from '../src/services/rag/chunker.js'

test('chunkText splits long text by char count with overlap', async () => {
  const longText = '가'.repeat(2000)
  const chunks = await chunkText(longText, { chunkSize: 800, overlap: 120 })
  assert.ok(chunks.length >= 3, 'should produce at least 3 chunks')
  assert.ok(chunks.every((c) => c.length <= 900), 'each chunk under size+slack')
})

test('chunkText keeps short text as single chunk', async () => {
  const chunks = await chunkText('짧은 텍스트', { chunkSize: 800, overlap: 120 })
  assert.equal(chunks.length, 1)
  assert.equal(chunks[0], '짧은 텍스트')
})

test('chunkArticle preserves article as one chunk if under threshold', async () => {
  const art = { title: '제36조', content: '연차 유급휴가...', clauses: ['(1) ...', '(2) ...'] }
  const chunks = await chunkArticle(art, 1200)
  assert.equal(chunks.length, 1)
  assert.match(chunks[0], /제36조/)
  assert.match(chunks[0], /\(1\) \.\.\./)
})
