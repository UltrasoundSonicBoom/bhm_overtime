# Spec: SNUH Mate AI Action Bridge (Intermediate Plan)

## Assumptions
1. SNUH Mate remains an external web service reachable from personal mobile and home networks.
2. Hospital GW and EMR are not directly reachable from the public internet and must only be used inside the hospital network.
3. The first deployable bridge is an approved browser extension for hospital PCs, not a stealth background automation tool.
4. The bridge may auto-open pages and prefill fields, but final submission must remain a human click.
5. Email-based workflows should pass a task link or structured summary, not trigger hidden automation on open.
6. Patient data, resident IDs, chart numbers, and other high-risk identifiers must not be entered into the AI flow.

## Objective
Build a realistic "middle path" for AI-assisted actions in SNUH Mate:

- The web app answers regulation and workflow questions.
- When confidence is low or the user wants help, the app generates a structured draft email to the right department.
- For a small set of allowed workflows such as leave registration, the app creates an action ticket.
- Inside the hospital network, an approved browser extension can continue that ticket by opening GW/EMR pages and prefilling fields.
- The system must feel like a productivity assistant, not like hidden remote control software.

Success means:

- Users can go from "I have a question" to "I have a ready-to-send draft" in one flow.
- Users can go from "I want to register leave" to "GW/EMR form is opened and prefilled" on a hospital PC.
- No automatic submission occurs without visible user confirmation.
- The architecture is explainable to security reviewers and operations staff.

## Tech Stack
- Existing web app: static HTML/CSS/JS in repo root
- Existing backend: Hono + TypeScript in `server/src`
- Existing AI stack: OpenAI + PostgreSQL RAG in `server/src/services/rag.ts`
- Existing user storage model: browser localStorage + optional Google Drive/Calendar sync
- New bridge surface:
  - Browser extension for Chrome/Edge on hospital PCs
  - HTTPS task handoff from `snuhmate.com` to the extension
  - No native helper app in v1

## Commands
- Web app local open: open `index.html` directly or serve statically
- Server dev: `cd server && npm run dev`
- Server tests: `cd server && npm test`
- RAG baseline check: `cd server && npm run rag:baseline`
- RAG verify: `cd server && npm run rag:verify`
- DB push: `cd server && npm run db:push`

## Project Structure
- `index.html`
  Main SNUH Mate app shell and tab entry points
- `regulation.html`
  Regulation browse + ask experience
- `regulation.js`
  Existing AI chat UI logic and local fallback logic
- `googleAuth.js`
  Google sign-in and scope handling
- `server/src/routes/chat.ts`
  Current AI chat API
- `server/src/services/rag.ts`
  Current regulation/FAQ retrieval and answer generation
- `docs/ai-bridge-intermediate-spec.md`
  This feature specification

Planned additions:

- `server/src/routes/ai-actions.ts`
  Create and retrieve action tickets, email drafts, bridge tasks
- `server/src/services/ai-actions.ts`
  Action orchestration and policy checks
- `server/src/services/department-routing.ts`
  Department and email recipient resolution
- `bridge-extension/`
  Hospital-PC browser extension package
- `bridge-extension/content/`
  Page-specific content scripts for approved GW/EMR pages
- `bridge-extension/background/`
  Extension background worker, task polling, permission gate

## Code Style
Keep the current repo style:

- Plain, explicit browser JavaScript for the web app
- TypeScript for server routes and services
- Small composable server functions with narrow responsibilities
- Guardrails before convenience

Example server style:

```ts
type CreateActionTicketInput = {
  kind: 'leave_registration' | 'department_email_draft'
  userId: string | null
  payload: Record<string, unknown>
}

export async function createActionTicket(input: CreateActionTicketInput) {
  if (!input.kind) {
    throw new Error('kind is required')
  }

  return {
    ticketId: crypto.randomUUID(),
    status: 'pending_user_review' as const,
  }
}
```

## Testing Strategy
- Server unit tests:
  - department routing
  - action ticket creation
  - permission and scope validation
  - AI fallback to email-draft recommendation
- Server integration tests:
  - `POST /ai-actions/email-draft`
  - `POST /ai-actions/leave-ticket`
  - `GET /ai-actions/:ticketId`
- Manual browser checks:
  - mobile web flow for draft generation
  - desktop web flow for task handoff screen
  - extension-installed flow on approved host pages
- Security review checklist:
  - no auto-submit
  - allowlisted hostnames only
  - allowlisted DOM selectors only
  - visible user confirmation before any write action

## Boundaries
- Always:
  - show the user what will be sent or filled before execution
  - preserve a manual final confirmation step
  - log bridge actions at the ticket level
  - separate public-web behavior from hospital-network behavior
- Ask first:
  - adding a native desktop helper
  - storing hospital email addresses or org charts as production data
  - adding auto-submit or silent background execution
  - integrating directly with internal SSO, GW, or EMR APIs
- Never:
  - attempt hidden automation from email open events
  - bypass login, MFA, or internal access controls
  - scrape or store patient records in SNUH Mate
  - emulate malware-like behavior such as invisible key injection or stealth page control

## Product Scope

### In Scope for v1
- AI answer with confidence-aware escalation
- Department email draft generation
- Structured action ticket creation
- Hospital-PC extension handoff for approved flows
- Leave registration preparation and prefill
- Human confirmation before submit

### Out of Scope for v1
- Fully automated EMR/GW submission
- Native helper installation
- Background task execution from email click alone
- General-purpose internal web automation
- Any patient-facing or clinical-order workflow

## Primary User Flows

### Flow A: Regulation answer to HR email draft
1. User asks a regulation question in SNUH Mate.
2. AI answers with sources and confidence.
3. If confidence is low, or the user taps `인사과 문의 초안 만들기`, the app opens an escalation sheet.
4. The sheet contains:
   - recommended department
   - recipient email
   - user original question
   - AI summary of the question
   - related regulations and why confirmation is needed
5. User reviews and copies, downloads, or opens a draft email.

### Flow B: Leave request to bridge task
1. User types a request like `4/19 연차 등록`.
2. AI extracts structured values:
   - leave type
   - date or date range
   - optional reason or memo
3. SNUH Mate saves the leave item locally.
4. The app creates:
   - a personal email draft to the user's hospital email if requested
   - a bridge task ticket for GW/EMR prefilling
5. If the user is on a hospital PC with the extension installed, they can tap `병원 시스템에서 이어서 하기`.
6. The extension opens the approved leave-management page and prefills the form.
7. User reviews the fields and manually clicks submit.

## Architecture

### 1. Public Web Layer
Responsibilities:

- AI answer generation
- low-confidence detection
- email draft generation
- action ticket creation
- task handoff UI

Key rule:

- The public web layer never directly automates internal GW/EMR pages.

### 2. Action Ticket Layer
An action ticket is a short-lived structured handoff object.

Required fields:

- `ticket_id`
- `kind`
- `created_at`
- `expires_at`
- `status`
- `created_by_user_id` or anonymous session id
- `display_summary`
- `structured_payload`
- `allowed_execution_contexts`
- `audit_log`

Ticket kinds for v1:

- `department_email_draft`
- `leave_registration`

Status values:

- `draft`
- `pending_user_review`
- `ready_for_bridge`
- `bridge_opened`
- `prefill_done`
- `completed`
- `expired`
- `cancelled`

### 3. Hospital-PC Browser Extension
Responsibilities:

- detect when the user explicitly wants to continue a bridge task
- validate hostname and page eligibility
- fetch task details from SNUH Mate
- open the approved internal page
- prefill allowlisted fields only
- show a visible confirmation banner

Extension constraints:

- only runs on allowlisted domains and paths
- only handles approved task kinds
- no hidden execution
- no persistent collection of form contents

### 4. Internal Page Content Scripts
Responsibilities:

- map structured task payloads to known DOM fields
- fill only specific approved selectors
- fail safely if layout changes or fields are missing

Example approved selectors for leave flow:

- leave type dropdown
- start date field
- end date field
- note or memo field

Hard rule:

- selector failures stop execution and show the user a recovery prompt

## UX Specification

### AI Bottom Sheet
Attach a persistent `AI 상담` entry point to:

- leave tab
- overtime tab
- payroll tab
- retirement surfaces

The sheet shows three sections:

1. `답변`
2. `다음 행동`
3. `확인 필요`

Example action buttons:

- `인사과 문의 초안 만들기`
- `총무과 메일 초안 만들기`
- `휴가 등록 준비`
- `내 병원 메일로 보내기`
- `병원 시스템에서 이어서 하기`

### Email Draft Review Sheet
Required blocks:

- recipient department
- recipient email
- email subject
- original user question
- AI-rewritten summary
- source references
- editable body

CTA buttons:

- `초안 복사`
- `메일 앱에서 열기`
- `나중에 다시 보기`

### Bridge Handoff Screen
When a bridge task exists, show:

- task title
- task summary
- expiration time
- supported environment note
- extension detection state

States:

- `extension_not_found`
- `extension_available`
- `unsupported_network_or_host`
- `task_expired`

CTA buttons:

- `병원 시스템에서 이어서 하기`
- `수동으로 입력하기`
- `복사용 값 보기`

## AI and Agent Behavior

### Chatbot responsibilities
- answer regulation questions
- explain calculations
- summarize uncertainty
- recommend escalation

### Agent responsibilities
- convert user intent into structured actions
- generate mail drafts
- create bridge tickets
- decide when execution should stop and require a human

### Confidence policy
The system must not pretend certainty.

If any of the following is true:

- top source quality is weak
- sources conflict
- required personal context is missing
- internal-policy interpretation is ambiguous

Then the agent must:

- clearly say confirmation is needed
- offer a draft email
- not present the answer as final

## Security Model

### Threat model
- public web app attempting internal automation without consent
- malicious or forged bridge links
- extension abuse on unapproved sites
- hidden submission or data exfiltration

### Required controls
- signed or HMAC-protected task tokens
- short task expiration, default 24 hours or less
- one-click explicit user initiation
- domain allowlist for extension execution
- path allowlist for extension execution
- field allowlist for content scripts
- visible banner while prefill is active
- no auto-submit
- audit event on each bridge step

### Sensitive data rules
- do not include patient data in tickets
- do not include full payroll PDFs in tickets
- include only the minimum fields needed for the target action

## API Specification

### POST `/api/ai-actions/email-draft`
Creates a department email draft package.

Request:

```json
{
  "question": "연차를 올해 이월해서 쓸 수 있나요?",
  "targetDepartmentHint": "인사과",
  "context": {
    "feature": "leave",
    "regulationRefs": ["제32조"],
    "aiAnswer": "..."
  }
}
```

Response:

```json
{
  "draftId": "draft_123",
  "department": "인사과",
  "to": "hr@example.org",
  "subject": "[SNUH Mate 문의] 연차 이월 관련 확인 요청",
  "body": "...",
  "summary": "...",
  "needsHumanReview": true
}
```

### POST `/api/ai-actions/leave-ticket`
Creates a structured leave-registration ticket.

Request:

```json
{
  "leaveType": "annual",
  "startDate": "2026-04-19",
  "endDate": "2026-04-19",
  "memo": "",
  "sendHospitalEmailDraft": true
}
```

Response:

```json
{
  "ticketId": "ticket_123",
  "status": "ready_for_bridge",
  "handoffUrl": "https://www.snuhmate.com/bridge-task/ticket_123",
  "emailDraft": {
    "to": "my-hospital-email@example.org",
    "subject": "[휴가 등록 준비] 연차 / 2026-04-19",
    "body": "..."
  }
}
```

### GET `/api/ai-actions/:ticketId`
Returns sanitized ticket details for web review and extension pickup.

## Data Model

### `ai_action_tickets`
- `id`
- `kind`
- `status`
- `created_by_user_id`
- `anonymous_session_id`
- `payload_json`
- `display_summary`
- `allowed_contexts_json`
- `expires_at`
- `created_at`
- `updated_at`

### `ai_action_events`
- `id`
- `ticket_id`
- `actor_type` (`user`, `web`, `extension`)
- `event_type`
- `metadata_json`
- `created_at`

### `department_directory`
- `id`
- `department_name`
- `email`
- `status`
- `notes`

## Extension Specification

### Permissions
- minimal host permissions for approved internal domains only
- storage for temporary task state
- tabs for opening approved pages
- scripting for explicit page-prefill actions

### Extension flow
1. User opens handoff page.
2. Web app checks whether extension is present.
3. User clicks `병원 시스템에서 이어서 하기`.
4. Web page sends the ticket id to the extension.
5. Extension validates:
   - ticket kind
   - host allowlist
   - ticket expiration
6. Extension opens the internal target page.
7. Content script waits for the expected form.
8. Content script fills approved fields.
9. Extension shows `입력 완료, 제출 전 확인하세요`.

### Failure modes
- extension missing
- internal site unavailable
- selector mismatch
- expired ticket
- unsupported task kind

Fallback UI must show:

- manual steps
- copyable values
- draft email if relevant

## Rollout Plan

### Phase 1
- email draft generation only
- no bridge execution

### Phase 2
- bridge task tickets
- extension detection
- handoff page

### Phase 3
- leave registration prefill on one approved internal page
- audit events
- admin kill switch

### Phase 4
- expand to one or two more low-risk workflows after review

## Success Criteria
- Users can generate a department email draft in under 30 seconds from an AI answer.
- Users can generate a leave bridge ticket in under 20 seconds.
- On an approved hospital PC, the extension can open the target leave page and prefill approved fields with a visible confirmation banner.
- No workflow auto-submits without a user click.
- Expired or malformed tickets fail closed.
- The entire system can be explained to security reviewers as user-initiated browser assistance, not stealth automation.

## Open Questions
- What are the real department email addresses for 인사과, 총무과, 노사협력과?
- Which internal domain and exact path correspond to `부서근태관리`?
- Is a browser extension installable under hospital IT policy?
- Must bridge features be disabled unless the user is on a hospital-managed PC?
- Does the hospital require audit export or approval logging for semi-automated form prefills?
- Should the first rollout support only leave, or also payroll discrepancy inquiry drafts?

## Reference Notes
- Chrome extension external messaging and extension-to-web communication should follow Chrome's official manifest and messaging guidance.
- Any future native-app or custom-protocol launch must follow OS-level registered protocol handling and should not be part of v1.
