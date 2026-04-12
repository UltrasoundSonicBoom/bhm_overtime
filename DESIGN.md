# SNUH Mate Nurse Admin Design System

## 1. Product Intent

This design system exists for head nurses and schedule operators who need to make safe staffing decisions under time pressure. The interface should feel like an operational console, not a marketing page and not a toy dashboard.

The default mood is:

- precise like an IBM-style control surface
- clear and trust-building like Toss operations
- assertive and tactile with a restrained neo-brutal edge

The one thing users should remember is that the screen makes risk obvious before they publish.

## 2. Visual Theme & Atmosphere

Use a bright, paper-first canvas with heavy ink outlines, dense information blocks, and selective highlight colors. The board should feel like a working wall covered with live operational cards rather than floating glossy UI.

The product is not minimalist. It is disciplined density:

- strong contrast
- compact modules
- visible state changes
- almost no decorative softness
- every highlight tied to a staffing or compliance meaning

Keep the page energetic but not chaotic. The page should reward scanning.

## 3. Target Users

- head nurse running monthly roster reviews
- scheduler comparing generated candidates
- nursing admin manager validating rules, leave, and publish impact

Primary jobs:

1. see whether coverage is safe
2. see who is overloaded or breaking a rule
3. pin, repair, and publish without losing context
4. understand compensation or policy impact without opening a separate handbook

## 4. Color Palette & Semantic Roles

### Core

- `Ink`: `#101218`
- `Paper`: `#fcfbf7`
- `Paper Alt`: `#f2efe6`
- `Grid`: `#d7d1c3`
- `Muted Text`: `#55606f`

### Action

- `Primary Blue`: `#2c6cff`
- `Primary Blue Deep`: `#1846b8`
- `Mint Success`: `#8fe7a8`
- `Amber Warning`: `#ffcc4d`
- `Coral Risk`: `#ff8f7a`
- `Lavender Insight`: `#d9ddff`

### Shift Colors

- `D`: `#dce9ff`
- `E`: `#ffe083`
- `N`: `#9ec2ff`
- `OFF`: `#ece8dd`
- `LEAVE`: `#ffc7d0`
- `EDU`: `#bff0cf`

### Rules

- `Coverage OK`: mint
- `Coverage Under`: coral
- `Coverage Over`: amber
- `Policy Info`: lavender

Never use gradients as the primary identity. Use flat fills and subtle paper layering.

## 5. Typography

### Font Families

- Primary UI: `IBM Plex Sans KR`
- Display / short emphasis: `Space Grotesk`
- Data labels / versioning / calculations: `IBM Plex Mono`

### Type Rules

- page title: 32-38px, `Space Grotesk`, 700
- section title: 20-24px, `Space Grotesk`, 700
- card title: 14-16px, `IBM Plex Sans KR`, 700
- body: 13-15px, `IBM Plex Sans KR`, 500
- metadata: 11-12px, `IBM Plex Sans KR`, 600
- numeric metrics: 20-28px, `Space Grotesk`, 700

No negative letter spacing. No viewport-based type scaling.

## 6. Layout Principles

- Use a three-zone workspace on desktop: control rail, board, inspector.
- Let the board dominate the screen.
- Keep the first screen fully useful without scrolling.
- Dense information is good when grouped into clear modules.
- Use visible horizontal rhythm between sections, not giant empty space.
- Prefer fixed and predictable widths for controls, pills, shift cells, summary cards, and sticky columns.

## 7. Surfaces & Elevation

- Panels use solid backgrounds, dark outlines, and offset shadows.
- Cards may use 6px radius maximum.
- Main modules can cast a hard shadow like `4px 4px 0 Ink`.
- Nested cards are discouraged. Use inset separators or tinted blocks instead.
- Tables should feel gridded and crisp, with sticky headers and sticky left columns.

## 8. Components

### Buttons

- hard outline
- compact height: 40-44px
- strong pressed state using translate and shorter shadow
- primary actions use amber or blue only when they are truly primary
- destructive or risky actions use coral

### Metric Cards

- short label, large number, one support line
- always show what time period the number refers to

### Candidate Cards

- must show ranking, quality signals, and tradeoffs immediately
- selected state should be obvious at a glance

### Rule / Violation Rows

- compact, scan-friendly, one strong label plus one explanation line
- show why the rule matters, not just the rule code

### Shift Cells

- stable size
- easy to click
- selected, pending, locked, and risky states must be visually distinct
- never require hover to understand the current shift

### Scenario Cards

- look like test fixtures
- show pass/fail, category, and the rule or amount being verified

## 9. Interaction Rules

- every action should preserve context; avoid page jumps
- when a nurse or cell is selected, the inspector must explain the next safe action
- rule warnings should appear before publish, not after
- compensation hints should appear inline when a shift has obvious pay or leave implications
- optimistic feedback is fine, but operational state must remain truthful

## 10. Do

- design for scanning under fatigue
- keep state labels explicit: `Published`, `Candidate`, `Pending`, `Recovery due`
- make risk colors semantic and repeatable
- use real nurse/admin language instead of generic SaaS copy
- connect board state to handbook rules in the same screen

## 11. Don't

- do not build hero sections, onboarding fluff, or decorative empty states
- do not use soft glassmorphism, glows, or purple-blue gradients
- do not hide important rules behind collapses when the user is about to publish
- do not center the whole interface
- do not let board cells resize based on content

## 12. Responsive Behavior

- On tablet, move the inspector below the board but keep the control rail visible.
- On mobile, preserve the board as a horizontally scrollable work surface instead of stacking away the schedule.
- Critical actions must stay reachable without opening modals.

## 13. Quality Bar

If a screenshot looks like a generic admin template, it failed. If a head nurse can scan it and instantly answer "where is the risk, what changed, and what do I do next," it passed.
