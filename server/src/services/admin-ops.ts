export const contentStatuses = [
  'draft',
  'review',
  'published',
  'archived',
] as const

export type ContentStatus = (typeof contentStatuses)[number]
export type ApprovalDecision = 'approved' | 'rejected'

const allowedTransitions: Record<ContentStatus, ContentStatus[]> = {
  draft: ['review', 'archived'],
  review: ['draft', 'published', 'archived'],
  published: ['review', 'archived'],
  archived: ['draft'],
}

export function canTransitionStatus(
  from: ContentStatus,
  to: ContentStatus,
): boolean {
  if (from === to) {
    return true
  }

  return allowedTransitions[from].includes(to)
}

export function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function canRequestReview(input: {
  status: ContentStatus
  currentRevisionId: number | null
  pendingApprovalCount: number
}): boolean {
  if (!input.currentRevisionId) {
    return false
  }

  if (input.pendingApprovalCount > 0) {
    return false
  }

  return canTransitionStatus(input.status, 'review')
}

export function resolveApprovalDecision(input: {
  decision: ApprovalDecision
  currentRevisionId: number | null
  existingPublishedRevisionId: number | null
}): {
  entryStatus: ContentStatus
  revisionStatus: ContentStatus
  publishedRevisionId: number | null
  closeOtherPendingTasks: boolean
} {
  if (input.decision === 'approved') {
    return {
      entryStatus: 'published',
      revisionStatus: 'published',
      publishedRevisionId:
        input.currentRevisionId ?? input.existingPublishedRevisionId ?? null,
      closeOtherPendingTasks: true,
    }
  }

  return {
    entryStatus: 'draft',
    revisionStatus: 'draft',
    publishedRevisionId: input.existingPublishedRevisionId ?? null,
    closeOtherPendingTasks: true,
  }
}
