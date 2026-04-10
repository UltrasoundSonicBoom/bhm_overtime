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

test('rerankMatches recognizes compact Korean compounds like 리커버리데이', () => {
  const results = rerankMatches(
    '야간근무를 많이 하면 리커버리 데이가 생기나요?',
    [
      {
        id: 1,
        question: '야간근무 기준은?',
        score: 0.52,
      },
      {
        id: 2,
        question: '리커버리데이란?',
        score: 0.49,
      },
    ],
    (match) => match.question,
  )

  assert.equal(results[0]?.id, 2)
})

test('rerankMatches prefers time-recognition answers over money answers for hour questions', () => {
  const results = rerankMatches(
    '온콜 출근하면 몇 시간 인정되나요?',
    [
      {
        id: 1,
        question: '온콜 출근하면 수당이 얼마인가요?',
        score: 0.71,
      },
      {
        id: 2,
        question: '온콜 출퇴근 시간 인정은?',
        score: 0.69,
      },
    ],
    (match) => match.question,
  )

  assert.equal(results[0]?.id, 2)
})

test('rerankMatches boosts answers that carry the same maximum-bound intent', () => {
  const results = rerankMatches(
    '연차는 최대 며칠까지 쌓이나요?',
    [
      {
        id: 1,
        question: '병가는 최대 며칠?',
        answer: '최대 60일까지 가능합니다.',
        score: 0.52,
      },
      {
        id: 2,
        question: '연차가 몇 일이에요?',
        answer: '1년 이상 15일, 2년마다 1일 가산, 최대 25일입니다.',
        score: 0.66,
      },
    ],
    (match) => `${match.question}\n${match.answer ?? ''}`,
  )

  assert.equal(results[0]?.id, 2)
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
