import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canTransitionStatus,
  normalizeSlug,
} from '../src/services/admin-ops'

test('canTransitionStatus allows draft to review', () => {
  assert.equal(canTransitionStatus('draft', 'review'), true)
})

test('canTransitionStatus rejects draft to published direct transition', () => {
  assert.equal(canTransitionStatus('draft', 'published'), false)
})

test('canTransitionStatus allows published back to review', () => {
  assert.equal(canTransitionStatus('published', 'review'), true)
})

test('normalizeSlug keeps Korean text and collapses separators', () => {
  assert.equal(normalizeSlug('  2026 노조 수첩 / FAQ  '), '2026-노조-수첩-faq')
})
