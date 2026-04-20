import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rerankByKeyword } from '../src/services/rag/retriever.js'

test('rerankByKeyword boosts results with exact keyword match', () => {
  const candidates = [
    { id: 1, content: '육아휴직은 3년 이내', articleTitle: '제54조', score: 0.7, source: 'x', docId: null, chapter: null, metadata: null },
    { id: 2, content: '연차 유급휴가는 15일', articleTitle: '제36조', score: 0.8, source: 'x', docId: null, chapter: null, metadata: null },
  ]
  const result = rerankByKeyword('연차 며칠', candidates)
  assert.equal(result[0].id, 2, '연차 매칭이 상위로')
})
