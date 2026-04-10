import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canRequestReview,
  resolveApprovalDecision,
} from '../src/services/admin-ops'

test('canRequestReview requires a current revision and no pending approval', () => {
  assert.equal(
    canRequestReview({
      status: 'draft',
      currentRevisionId: null,
      pendingApprovalCount: 0,
    }),
    false,
  )

  assert.equal(
    canRequestReview({
      status: 'draft',
      currentRevisionId: 12,
      pendingApprovalCount: 1,
    }),
    false,
  )
})

test('canRequestReview allows draft content with a current revision and no pending approval', () => {
  assert.equal(
    canRequestReview({
      status: 'draft',
      currentRevisionId: 12,
      pendingApprovalCount: 0,
    }),
    true,
  )
})

test('resolveApprovalDecision publishes the current revision when approved', () => {
  const result = resolveApprovalDecision({
    decision: 'approved',
    currentRevisionId: 12,
    existingPublishedRevisionId: 3,
  })

  assert.deepEqual(result, {
    entryStatus: 'published',
    revisionStatus: 'published',
    publishedRevisionId: 12,
    closeOtherPendingTasks: true,
  })
})

test('resolveApprovalDecision returns content to draft when rejected', () => {
  const result = resolveApprovalDecision({
    decision: 'rejected',
    currentRevisionId: 12,
    existingPublishedRevisionId: 3,
  })

  assert.deepEqual(result, {
    entryStatus: 'draft',
    revisionStatus: 'draft',
    publishedRevisionId: 3,
    closeOtherPendingTasks: true,
  })
})
