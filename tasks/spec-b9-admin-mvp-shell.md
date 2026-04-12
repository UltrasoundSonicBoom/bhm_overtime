# Spec: B9 — Admin MVP Shell

## Goal
Upgrade `admin/index.html` to serve as the unified Admin entry point with full navigation across all admin functions.

## Current State
- `admin/index.html` has regulation-specific tabs: overview, calendar, versions, faq, scenarios
- `admin/review-queue.html` is a standalone page
- `admin/union_regulation_admin.html` is a standalone page
- Backend API at `/api/admin/*` supports: dashboard, versions, faqs, content, approvals, audit-logs

## Required Navigation Surfaces
The shell must provide navigation to these 6 sections:
1. **Dashboard** — summary metrics (versions, content, approvals, audit logs)
2. **Content** — content_entries list with status indicators
3. **FAQ** — FAQ management per version
4. **Versions** — regulation version management
5. **Review** — approval queue (review-queue)
6. **Logs** — audit_logs viewer

## Auth State Distinction
- **Not logged in**: show login button, disable all admin actions, show "login required" message
- **Logged in**: show user email, enable navigation and actions
- Auth uses existing Supabase OAuth flow in admin.js

## Mobile Minimum Usability
- Navigation must be horizontally scrollable or collapsible on mobile
- All surfaces must be single-column on narrow viewports
- Bottom nav bar for mobile (already exists in CSS)

## Implementation Approach
- Extend existing `admin/index.html` surface-nav to include all 6 sections
- Add surface panels for Content, Review, and Logs (Dashboard=existing overview, FAQ=existing, Versions=existing)
- Reuse existing `admin.css` styles, extend as needed
- Keep review-queue.html as a separate standalone page (linked from Review surface)

## Design System Compliance
- Colors from DESIGN.md: Ink #101218, Paper #fcfbf7, Primary Blue #2c6cff
- Typography: IBM Plex Sans KR for UI, Space Grotesk for display
- Components: hard outline buttons, compact height 40-44px

## Acceptance Criteria
- [ ] All 6 navigation items visible: Dashboard, Content, FAQ, Versions, Review, Logs
- [ ] Logged-out state shows login prompt, disables admin actions
- [ ] Logged-in state shows email, enables all sections
- [ ] Mobile viewport has scrollable nav and single-column layout
- [ ] No console errors on page load
- [ ] Existing regulation admin functionality preserved (no regression)
