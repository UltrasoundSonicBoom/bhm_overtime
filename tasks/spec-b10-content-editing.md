# Spec: B10 — Content Editing Flows

## Goal
Enable content listing, creation, editing, saving, and status management in the Admin Content surface.

## Current State
- Content surface panel exists in admin/index.html (Phase 20)
- Backend API supports: GET /admin/content, POST /admin/content, GET /admin/content/:id, POST /admin/content/:id/revisions, PATCH /admin/content/:id/status
- Content entries have statuses: draft, review, published, archived
- Revisions track changes with revision_number, body, summary, metadata

## Required Flows
1. **List** — Show all content entries with type, title, status, last updated
2. **Create** — Form to create new content entry (type, title, slug, body)
3. **Edit** — Click entry to load details, edit body, save as new revision
4. **Status Change** — Transition between draft/review/published/archived
5. **History** — Show revision history for selected entry

## Content Types
- policy, faq, notice, landing, dataset

## Draft vs Published Distinction
- Status tags with visual differentiation (draft=yellow, published=green, review=blue, archived=red)
- Published revision tracked separately from current revision

## Change History
- Each edit creates a new revision via POST /admin/content/:id/revisions
- Revision list shown in entry detail view

## Implementation
- Add content editor form to the Content surface panel in admin/index.html
- Add JS functions: loadContentDetail, saveContentRevision, changeContentStatus
- Content list already rendered by renderContentEntries (Phase 20)
- Click on entry loads detail into editor form

## Acceptance Criteria
- [ ] Content list shows entries with status tags
- [ ] New content creation form works
- [ ] Editing an entry creates a new revision
- [ ] Status transitions (draft->review, review->published) work
- [ ] Revision history is visible for selected entry
- [ ] Draft and Published entries are visually distinct
