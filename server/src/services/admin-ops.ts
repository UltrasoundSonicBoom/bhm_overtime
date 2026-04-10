export const contentStatuses = [
  'draft',
  'review',
  'published',
  'archived',
] as const

export type ContentStatus = (typeof contentStatuses)[number]

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
