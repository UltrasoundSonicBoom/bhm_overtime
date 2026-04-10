import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyRagMode,
  rerankMatches,
} from '../src/services/rag-ranking'

test('rerankMatches prefers strong lexical overlap over raw vector score', () => {
  const results = rerankMatches(
    '배우자 출산휴가는 며칠인가요?',
    [
      {
        id: 1,
        question: '배우자 돌아가시면?',
        score: 0.74,
      },
      {
        id: 2,
        question: '배우자 출산휴가는?',
        score: 0.72,
      },
    ],
    (match) => match.question,
  )

  assert.equal(results[0]?.id, 2)
  assert.ok(results[0].rerankedScore > results[1].rerankedScore)
})

test('classifyRagMode returns faq-direct when reranked faq score clears the threshold', () => {
  const mode = classifyRagMode({
    faqScore: 0.81,
    docScore: 0.41,
  })

  assert.equal(mode, 'faq-direct')
})

test('classifyRagMode returns regulation-doc when faq is weak but doc score is strong enough', () => {
  const mode = classifyRagMode({
    faqScore: 0.52,
    docScore: 0.62,
  })

  assert.equal(mode, 'regulation-doc')
})

test('classifyRagMode falls back when both faq and doc scores are weak', () => {
  const mode = classifyRagMode({
    faqScore: 0.58,
    docScore: 0.46,
  })

  assert.equal(mode, 'fallback')
})
