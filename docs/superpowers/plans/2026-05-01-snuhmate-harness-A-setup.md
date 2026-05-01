# SNUHmate Harness (A) Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SNUHmate 개발팀 하네스 셸을 구축한다. `@smate-orchestrator` 진입점을 통해 8개의 specialist 에이전트와 10개의 워크플로우 스킬에 라우팅 가능한 상태로 만든다.

**Architecture:** Workflow-shaped (Option 3). 모든 식별자는 `smate-` 프리픽스. 스킬 = 절차, 에이전트 = 역할. 페어링: `smate-doc-sync` 스킬 ↔ `@smate-doc-keeper` 에이전트, `smate-smoke` ↔ `@smate-playwright-runner`, etc. 첫 번째 (B) 슬롯(B6 마스킹)은 별도 plan에서 다룸.

**Tech Stack:** Markdown (agent/skill 정의), CLAUDE.md 패치, docs/harness/ living docs. Python/JS 코드 변경 없음.

**Spec:** [docs/superpowers/specs/2026-05-01-snuhmate-harness-design.md](../specs/2026-05-01-snuhmate-harness-design.md)

---

## File Structure

```
.claude/agents/                                (CREATE 8 files)
  smate-orchestrator.md
  smate-persona-curator.md
  smate-design-system-guard.md
  smate-payroll-expert.md
  smate-playwright-runner.md
  smate-brand-curator.md
  smate-pr-ops-reviewer.md
  smate-doc-keeper.md

.claude/skills/                                (CREATE 10 dirs+SKILL.md)
  smate-payroll-loop/SKILL.md
  smate-design-guard/SKILL.md
  smate-feature-e2e/SKILL.md
  smate-brand-content/SKILL.md
  smate-smoke/SKILL.md
  smate-pr-ops/SKILL.md
  smate-regulation-sync/SKILL.md
  smate-persona-research/SKILL.md
  smate-b-feature/SKILL.md
  smate-doc-sync/SKILL.md

docs/harness/                                  (CREATE 3 files)
  architecture.md
  persona-matrix.md
  b-catalog.md

CLAUDE.md                                      (MODIFY: +3 sections, 1 section condensed)
```

---

## Conventions (apply to every agent/skill file)

**Agent file template** (Claude Code subagent format):

```markdown
---
name: smate-XXX
description: <한 줄 — 역할과 호출 시점>
tools: Read, Bash, Grep, Glob, Edit, Write, Skill, Agent, TodoWrite
model: opus
---

# @smate-XXX

## 역할

<2~3 문장>

## 호출 시점

- <트리거 1>
- <트리거 2>

## 책임 / 비책임

| 한다 | 안 한다 |
| ---- | ------- |
| ...  | ...     |

## 출력 포맷

<예시>

## 의존하는 스킬

- `smate-YYY` — <왜>
```

**Skill file template** (Claude Code skill format):

```markdown
---
name: smate-XXX
description: <한 줄 — 무엇을 자동화하는지>
---

# /smate-XXX

## 언제 사용

<트리거>

## 입력

- <필수>
- <선택>

## 단계

1. <step>
2. <step>

## 통과 조건

- <체크 1>
- <체크 2>

## 호출하는 에이전트

- `@smate-YYY`
```

---

## Task 1: 디렉토리 구조 생성

**Files:**

- Create: `.claude/agents/.gitkeep`
- Create: `.claude/skills/.gitkeep`
- Create: `docs/harness/.gitkeep`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p .claude/agents .claude/skills docs/harness
touch .claude/agents/.gitkeep .claude/skills/.gitkeep docs/harness/.gitkeep
```

- [ ] **Step 2: 검증**

```bash
ls -la .claude/agents .claude/skills docs/harness
```

Expected: 각 디렉토리에 `.gitkeep` 파일이 존재.

- [ ] **Step 3: 커밋**

```bash
git add .claude/agents/.gitkeep .claude/skills/.gitkeep docs/harness/.gitkeep
git commit -m "chore(harness): create smate directory structure"
```

---

## Task 2: `@smate-orchestrator` 작성 (앵커 에이전트, 풀 템플릿)

**Files:**

- Create: `.claude/agents/smate-orchestrator.md`

- [ ] **Step 1: 파일 작성**

```markdown
---
name: smate-orchestrator
description: SNUHmate 개발 작업의 진입점. 사용자 요청을 받아 적합한 smate 스킬·에이전트로 라우팅. 단독 결정은 하지 않고 전문가에 위임.
tools: Read, Bash, Grep, Glob, Skill, Agent, TodoWrite
model: opus
---

# @smate-orchestrator

## 역할

SNUHmate 개발 작업 진입점. 사용자 요청을 분석해 9개 smate 스킬 또는 7명의 specialist 중 적합한 곳으로 라우팅. 직접 코드 수정·문서 작성은 하지 않음.

## 호출 시점

- 사용자가 `@smate-orchestrator`를 명시적으로 호출
- "smate", "하네스", "smate 워크플로우" 키워드 등장
- 특정 스킬을 모르겠을 때 사용자가 도움 요청

## 라우팅 결정 표

| 사용자 의도                                     | 호출할 것                 |
| ----------------------------------------------- | ------------------------- |
| 급여/퇴직금 회귀 검증                           | `/smate-payroll-loop`     |
| 디자인시스템 위반 점검                          | `/smate-design-guard`     |
| 새 기능 spec→QA→PR 끝-끝                        | `/smate-feature-e2e`      |
| 브랜딩·홍보 콘텐츠 작성                         | `/smate-brand-content`    |
| Playwright 스모크 (확장 4축)                    | `/smate-smoke`            |
| PR 리뷰·CHANGELOG·doc drift                     | `/smate-pr-ops`           |
| 단협·호봉표 drift 검증                          | `/smate-regulation-sync`  |
| 부서×직종 페르소나 인터뷰                       | `/smate-persona-research` |
| 새 (B) 슬롯 만들기 (마스킹·위키 등 사용자 기능) | `/smate-b-feature`        |
| feature 완료 후 spec/CLAUDE.md/MEMORY 갱신      | `/smate-doc-sync`         |

## 책임 / 비책임

| 한다                              | 안 한다                       |
| --------------------------------- | ----------------------------- |
| 의도 분석·스킬 선택·에이전트 위임 | 직접 코드 수정                |
| 여러 스킬 조합 워크플로우 안내    | 도메인 의사결정 (전문가 호출) |
| TodoWrite로 진행 추적             | 사용자 승인 게이트 우회       |

## 출력 포맷
```

의도 분석: <요청을 한 문장으로>
선택한 스킬/에이전트: /smate-XXX or @smate-YYY
이유: <왜 이걸 골랐는가, 한 문장>
다음 단계: <첫 행동>

```

## 의존하는 스킬

- 모든 `smate-*` 스킬

## 참조

- 설계: `docs/superpowers/specs/2026-05-01-snuhmate-harness-design.md`
- 한 페이지 요약: `docs/harness/architecture.md`
```

- [ ] **Step 2: 검증**

```bash
test -f .claude/agents/smate-orchestrator.md && head -5 .claude/agents/smate-orchestrator.md
```

Expected: 파일 존재하고 frontmatter `name: smate-orchestrator` 보임.

- [ ] **Step 3: 커밋**

```bash
git add .claude/agents/smate-orchestrator.md
git commit -m "feat(harness): add @smate-orchestrator entry agent"
```

---

## Tasks 3–9: 나머지 7개 specialist agent 작성

각 에이전트는 §Conventions 의 템플릿을 따른다. 아래 표의 각 행이 하나의 task. **각 task는 (1) 파일 작성 (2) `head -5`로 frontmatter 검증 (3) 단독 commit** 3-step.

| Task | 파일                           | name                      | description                                                                                | tools                              | 핵심 책임 (body의 §역할 + §책임 표 채울 내용)                                                                                                                                                                                                                             |
| ---- | ------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3    | `smate-persona-curator.md`     | smate-persona-curator     | 부서×직종 페르소나 매트릭스 유지·갱신. 모든 (B) 작업 전 게이트로 호출됨.                   | Read, Write, Edit, Bash, TodoWrite | 인터뷰 노트 정리 → `docs/harness/persona-matrix.md` 갱신. (B) 작업 시 "이 기능은 부서·직종 어디에 어떤 시나리오로 쓰이는가" 산출 강제. 페르소나 미스(예: B1)를 사전 차단.                                                                                                 |
| 4    | `smate-design-system-guard.md` | smate-design-system-guard | UI 변경 시 globals.css 토큰·캘린더 셀 너비·인라인 스타일 0건 등 디자인시스템 룰 자동 검증. | Read, Grep, Glob, Bash             | 변경된 .css/.astro/.html을 grep으로 스캔: (1) `style="..."` 인라인 0건 (2) `globals.css` 토큰 외 hex/rgb 사용 금지 (3) `.ot-cal-grid` 셀 너비 룰 (4) memory `feedback_design_system_first` 룰. `pnpm check` 실행. 위반 시 항목별 fix 제안.                                |
| 5    | `smate-payroll-expert.md`      | smate-payroll-expert      | 단협·호봉표·계산기·명세서 파서 도메인 전문. B2/B4 슬롯 도메인 자료 공급.                   | Read, Grep, Bash                   | `apps/web/public/data/full_union_regulation_2026.md`, `union_regulation_2026.json`, `packages/calculators/src/`, `apps/web/src/client/salary-parser.js` 읽고 "이 변경이 호봉표 drift 일으키는가?" "이 명세서 형식은 기존 파서로 처리되는가?" 답변. `pnpm test:unit` 실행. |
| 6    | `smate-playwright-runner.md`   | smate-playwright-runner   | 확장 4축 (동기화·버튼·DS·viewport) 스모크 검증. UI 변경 PR의 필수 게이트.                  | Read, Bash, Grep, Glob             | 4축 검증 (§Task 14 smate-smoke SKILL.md와 동일 룰). `mcp__plugin_playwright_playwright__browser_*` 도구 또는 `pnpm test:smoke`. 실패 항목별 스크린샷 경로 보고. **memory `feedback_keep_dev_server_alive`: 검증 후 dev 서버 백그라운드로 유지.**                          |
| 7    | `smate-brand-curator.md`       | smate-brand-curator       | SNUHmate 톤·문체. B7/B8/B9, 채용 공고, SNS, 보도자료, 사용자 공지.                         | Read, Write, Edit                  | `docs/design-system/`의 톤 가이드(있으면)와 기존 `apps/web/public/notice.md` 등의 문체를 참고해 일관된 카피 생성. 차별화·공감·non-pushy 원칙 (memory `feedback_non_pushy_ux`).                                                                                            |
| 8    | `smate-pr-ops-reviewer.md`     | smate-pr-ops-reviewer     | 코드리뷰·CHANGELOG·spec drift 검출·PR 본문 자동 작성.                                      | Read, Bash, Grep, Glob             | `git diff main...HEAD` 분석. (1) spec과 실제 변경 일치 여부 (2) 변경된 코드의 SQL/LLM 신뢰 경계·조건부 사이드이펙트 (3) `apps/web/public/CHANGELOG.md` 항목 자동 작성 (4) PR 본문 (Summary/Test plan) 작성.                                                               |
| 9    | `smate-doc-keeper.md`          | smate-doc-keeper          | feature 완료 시 spec/CLAUDE.md/MEMORY/CHANGELOG 자동 동기화. **승인 게이트 필수.**         | Read, Edit, Write, Bash            | `smate-feature-e2e`/`smate-b-feature` 마지막에 호출. 변경 유형별 갱신 (§Task 19 smate-doc-sync 표 참조). 갱신 후 `git diff docs/ CLAUDE.md MEMORY.md` 출력 → 사용자 OK 응답 받기 전에는 commit 금지. 자동 commit 절대 금지.                                               |

각 task의 step 패턴:

- [ ] **Step 1: 파일 작성** — §Conventions Agent 템플릿에 표 행의 내용을 채워 `.claude/agents/<name>.md` 작성
- [ ] **Step 2: 검증** — `test -f .claude/agents/<name>.md && head -5 ...`로 frontmatter 확인
- [ ] **Step 3: 커밋** — `git add .claude/agents/<name>.md && git commit -m "feat(harness): add @<name> agent"`

---

## Task 10: `smate-payroll-loop` SKILL 작성 (앵커 스킬, 풀 템플릿)

**Files:**

- Create: `.claude/skills/smate-payroll-loop/SKILL.md`

- [ ] **Step 1: 파일 작성**

```markdown
---
name: smate-payroll-loop
description: 급여·퇴직금 계산기·명세서 파서 변경 시 회귀 루프. 단협·호봉표·계산기·파서 변경에 모두 동일 검증 절차 적용.
---

# /smate-payroll-loop

## 언제 사용

- `packages/calculators/src/` 변경
- `apps/web/src/client/salary-parser.js` 또는 `payslip-llm-verify.js` 변경
- `apps/web/public/data/union_regulation_*.json` 또는 `full_union_regulation_*.md` 변경
- 새 명세서 형식 추가 시
- 호봉표 데이터 갱신 시

## 입력

- 변경 범위 (필수): 파일 경로 또는 PR 번호
- 새 명세서 샘플 (선택): PDF/Excel/CSV 경로

## 단계

1. `@smate-payroll-expert` 호출 → 변경의 도메인 영향 분석
2. 영향받는 단위 테스트 식별 (`tests/unit/calculators.test.js`, `excel-parser.test.js`, `csv-parser.test.js`, `retirement-payslip-sync.test.js`)
3. `pnpm test:unit -- <영향받는 파일>` 먼저 실행 → 베이스라인 확인
4. 변경 적용 (호출자가 이미 했거나 이 단계에서 수행)
5. 동일 단위 테스트 재실행 → diff 확인
6. drift 의심 시 `pnpm verify:data` 실행 (단협·호봉표 drift)
7. 새 명세서 형식이라면 `salary-parser-debug` 스킬 흐름 적용
8. 완료 보고: 통과/실패 + 어떤 케이스가 깨졌는지

## 통과 조건

- 영향받는 단위 테스트 100% 통과
- `pnpm verify:data` 통과 (drift 변경이라면)
- 새 명세서 샘플 1개 이상 정상 파싱

## 호출하는 에이전트

- `@smate-payroll-expert`
- 실패 시 `@smate-pr-ops-reviewer` 회귀 노트 작성
```

- [ ] **Step 2: 검증**

```bash
test -f .claude/skills/smate-payroll-loop/SKILL.md && head -5 .claude/skills/smate-payroll-loop/SKILL.md
```

Expected: frontmatter `name: smate-payroll-loop` 보임.

- [ ] **Step 3: 커밋**

```bash
git add .claude/skills/smate-payroll-loop/
git commit -m "feat(harness): add /smate-payroll-loop skill"
```

---

## Tasks 11–19: 나머지 9개 SKILL.md 작성

§Conventions Skill 템플릿 사용. 각 task = (1) `mkdir -p .claude/skills/<name>` (2) SKILL.md 작성 (3) `head -5` 검증 (4) commit.

| Task | 디렉토리/파일                     | name                   | description                                                                                | 단계 (요약 — body에 풀어 쓸 것)                                                                                                                                                  | 통과 조건                                        |
| ---- | --------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 11   | `smate-design-guard/SKILL.md`     | smate-design-guard     | UI/CSS/Astro 변경 시 디자인시스템 룰 자동 검증                                             | (1) 변경된 파일 grep (2) 인라인 스타일 검색 (3) `globals.css` 토큰 외 색상 검색 (4) `pnpm check` (5) `@smate-design-system-guard` 호출                                           | 인라인 스타일 0, 토큰 외 색 0, `pnpm check` 통과 |
| 12   | `smate-feature-e2e/SKILL.md`      | smate-feature-e2e      | 신규 기능을 spec→plan→build→QA→PR→docs 끝-끝으로 진행                                      | (1) spec 작성 가이드 (`docs/superpowers/specs/`) (2) `superpowers:writing-plans` 호출 (3) 구현 (4) `/smate-smoke` (5) `/smate-pr-ops` (6) `/smate-doc-sync`                      | 모든 단계 통과 + PR 머지 + doc-keeper 승인 받음  |
| 13   | `smate-brand-content/SKILL.md`    | smate-brand-content    | 브랜딩·홍보 콘텐츠(채용·SNS·보도자료·공지) 생성                                            | (1) 입력(직종·목적·톤) 확인 (2) `@smate-brand-curator` 호출 (3) 채널별 변형 (4) 법적 리뷰(차별 표현·근로조건 오기재 검토 — 별도 RAG 후속)                                        | 카피 생성 + 사용자 OK                            |
| 14   | `smate-smoke/SKILL.md`            | smate-smoke            | 확장 4축 Playwright 스모크 (동기화·버튼·DS·viewport)                                       | (1) Astro dev 서버 (`pnpm --filter @snuhmate/web dev`) 시작 (2) 4축 검증 (a)~(d) 순차 (3) 콘솔 에러 0건 확인 (4) dev 서버 백그라운드 유지 (5) 스크린샷 경로 보고                 | 4축 모두 통과, 콘솔 에러 0                       |
| 15   | `smate-pr-ops/SKILL.md`           | smate-pr-ops           | PR 작성·리뷰·CHANGELOG·spec drift                                                          | (1) `git diff main...HEAD` (2) `@smate-pr-ops-reviewer` 호출 (3) `apps/web/public/CHANGELOG.md` + `public/CHANGELOG.md` 갱신 (4) `gh pr create`로 PR 본문 자동 작성              | PR 생성, CHANGELOG 갱신, drift 0                 |
| 16   | `smate-regulation-sync/SKILL.md`  | smate-regulation-sync  | 단협·호봉표·법령 데이터 drift 검증                                                         | (1) `pnpm verify:data` (2) `apps/web/public/data/union_regulation_2026.json` ↔ `full_union_regulation_2026.md` 일관성 (3) `packages/regulation-constants/src/index.js` 매핑 검증 | `verify:data` 통과                               |
| 17   | `smate-persona-research/SKILL.md` | smate-persona-research | 부서×직종 페르소나 인터뷰 또는 관찰 결과 매트릭스에 반영                                   | (1) 입력(부서·직종·인터뷰 노트 또는 관찰 시나리오) (2) `@smate-persona-curator` 호출 (3) `docs/harness/persona-matrix.md` 갱신 안 또는 PR (4) 사용자 승인 후 commit              | persona-matrix 갱신 + 사용자 승인                |
| 18   | `smate-b-feature/SKILL.md`        | smate-b-feature        | 새 (B) 사용자 기능 슬롯을 표준 8단계 게이트로 진행                                         | 8단계: persona-research → spec → design-guard 사전점검 → 도메인 자료 → 구현(writing-plans→executing-plans) → smoke → pr-ops → doc-sync                                           | 8단계 통과, persona/doc-sync 게이트는 skip 불가  |
| 19   | `smate-doc-sync/SKILL.md`         | smate-doc-sync         | feature-e2e/b-feature 끝에서 호출, spec/CLAUDE.md/MEMORY/CHANGELOG 자동 갱신 + 승인 게이트 | (1) `git diff main...HEAD` 분석 (2) 변경 유형 분류 (3) 해당 md 갱신 (4) `git diff docs/ CLAUDE.md MEMORY.md` 출력 (5) 사용자 "OK" 응답 대기 (6) 사용자 승인 후에만 commit        | 사용자 승인 받고 commit, 자동 commit 0           |

각 task의 step 패턴:

- [ ] **Step 1**: `mkdir -p .claude/skills/<name>`
- [ ] **Step 2**: `<name>/SKILL.md` 작성 (위 표의 단계·통과조건을 §Conventions Skill 템플릿에 채움)
- [ ] **Step 3**: `head -5 .claude/skills/<name>/SKILL.md` 로 frontmatter 확인
- [ ] **Step 4**: `git add .claude/skills/<name>/ && git commit -m "feat(harness): add /<name> skill"`

---

## Task 20: `docs/harness/architecture.md` 작성 (한 페이지 요약)

**Files:**

- Create: `docs/harness/architecture.md`

- [ ] **Step 1: 파일 작성**

```markdown
# SNUHmate Harness — Architecture Overview

> 이 문서는 한 페이지 요약입니다. 전체 설계는 [`docs/superpowers/specs/2026-05-01-snuhmate-harness-design.md`](../superpowers/specs/2026-05-01-snuhmate-harness-design.md) 를 참조하세요.

## 진입점
```

@smate-orchestrator ← 모든 SNUHmate 개발 작업의 시작점

```

## 8 Agents

| 에이전트 | 한 줄 |
| --- | --- |
| `@smate-orchestrator` | 진입점·라우팅 |
| `@smate-persona-curator` | 부서×직종 매트릭스, (B) 게이트 |
| `@smate-design-system-guard` | UI 룰 자동 검증 |
| `@smate-payroll-expert` | 단협·계산기·파서 도메인 |
| `@smate-playwright-runner` | 확장 4축 스모크 |
| `@smate-brand-curator` | 톤·콘텐츠 |
| `@smate-pr-ops-reviewer` | 리뷰·CHANGELOG·drift |
| `@smate-doc-keeper` | 자동 문서 동기화 (승인 게이트 필수) |

## 10 Skills

| 스킬 | 매핑 |
| --- | --- |
| `/smate-payroll-loop` | 급여·퇴직금 회귀 |
| `/smate-design-guard` | DS 가드 |
| `/smate-feature-e2e` | spec→QA→PR 끝-끝 |
| `/smate-brand-content` | 브랜딩·콘텐츠 |
| `/smate-smoke` | 확장 4축 스모크 |
| `/smate-pr-ops` | PR 운영 |
| `/smate-regulation-sync` | 단협·호봉표 drift |
| `/smate-persona-research` | 페르소나 갱신 |
| `/smate-b-feature` | (B) 슬롯 표준 8단계 |
| `/smate-doc-sync` | 자동 문서 갱신 |

## (B) 슬롯 8단계

```

persona-curator → spec → design-guard → 도메인 자료
→ 구현 → playwright-runner → pr-ops-reviewer → doc-keeper

```

게이트 1·8 (persona, doc-keeper)은 skip 불가.

## 살아있는 문서

- `persona-matrix.md` — `@smate-persona-curator` 가 유지
- `b-catalog.md` — B 슬롯 상태 추적
```

- [ ] **Step 2: 검증**

```bash
test -f docs/harness/architecture.md && wc -l docs/harness/architecture.md
```

Expected: 60~100 lines.

- [ ] **Step 3: 커밋**

```bash
git add docs/harness/architecture.md
git commit -m "docs(harness): add architecture one-pager"
```

---

## Task 21: `docs/harness/persona-matrix.md` 작성 (빈 템플릿)

**Files:**

- Create: `docs/harness/persona-matrix.md`

- [ ] **Step 1: 파일 작성**

```markdown
# SNUHmate Persona Matrix

> 이 문서는 `@smate-persona-curator` 가 유지하는 살아있는 문서입니다. 부서×직종별 SNUHmate 사용자 시나리오를 정리합니다.
>
> **작성 원칙:** 행동 권유(예: "야간 1번 더 서면 명절수당 충족")가 아니라 *실제 사용자가 겪는 마찰점·자료 흐름·의사결정 시점*을 적습니다.

## 매트릭스

| 부서               | 직종 | 주된 자료 흐름 | 마찰점 | (B) 슬롯 적합도 |
| ------------------ | ---- | -------------- | ------ | --------------- |
| _아직 인터뷰 없음_ |      |                |        |                 |

## 인터뷰 로그

(인터뷰 진행 시 여기에 1건씩 추가)

### YYYY-MM-DD — 부서/직종

- 인터뷰이: (익명·역할만)
- 핵심 인용:
- 자료 흐름:
- 마찰점:
- 시사점:

## (B) 슬롯별 페르소나 가드

각 (B) 작업 전 `@smate-persona-curator` 가 이 표를 채워야 함.

| (B) 슬롯                 | 1차 페르소나       | 사용 빈도 | 결정적 시나리오 |
| ------------------------ | ------------------ | --------- | --------------- |
| B6 마스킹                | _TBD - B6 시작 시_ |           |                 |
| B9 부서 위키             |                    |           |                 |
| B2 커리어 트윈           |                    |           |                 |
| B3 근무표 사진 → 스케줄  |                    |           |                 |
| B4 명세서 → AI 분석 카드 |                    |           |                 |
| B7 환자 설명문           |                    |           |                 |
| B8 AI 뉴스레터           |                    |           |                 |
| B11 자기학습 카드        |                    |           |                 |
```

- [ ] **Step 2: 검증**

```bash
test -f docs/harness/persona-matrix.md && head -5 docs/harness/persona-matrix.md
```

- [ ] **Step 3: 커밋**

```bash
git add docs/harness/persona-matrix.md
git commit -m "docs(harness): add persona matrix template"
```

---

## Task 22: `docs/harness/b-catalog.md` 작성 (B 슬롯 상태 추적)

**Files:**

- Create: `docs/harness/b-catalog.md`

- [ ] **Step 1: 파일 작성**

```markdown
# SNUHmate (B) Catalog — 사용자 기능 슬롯 상태

> 이 문서는 `@smate-doc-keeper` 가 (B) 슬롯 진행 시 자동 갱신합니다.

## 상태 정의

- **idea** — 카탈로그에 올라와 있고 페르소나/spec 미작성
- **spec** — spec 작성 완료, plan 미작성
- **planning** — plan 작성 완료, 미구현
- **building** — 구현 중
- **shipped** — 머지 완료, 사용자 노출
- **deprecated** — 폐기

## (B) 슬롯

| ID  | 이름                    | 상태     | 최근 갱신  | spec                                                                               | plan                  | PR  |
| --- | ----------------------- | -------- | ---------- | ---------------------------------------------------------------------------------- | --------------------- | --- |
| B6  | 마스킹 서비스           | spec     | 2026-05-01 | [spec](../superpowers/specs/2026-05-01-snuhmate-harness-design.md#4-b-카탈로그-v2) | _별도 plan 작성 예정_ | —   |
| B9  | 부서 위키 자동 정리     | idea     | 2026-05-01 | —                                                                                  | —                     | —   |
| B2a | 급여 곡선 (입사~정년)   | idea     | 2026-05-01 | —                                                                                  | —                     | —   |
| B2b | 호봉/승진 궤적          | idea     | 2026-05-01 | —                                                                                  | —                     | —   |
| B2c | 부서 로테이션 궤적      | idea     | 2026-05-01 | —                                                                                  | —                     | —   |
| B3  | 근무표 사진 → 스케줄    | building | 2026-05-01 | (in-progress, memory `project_llm_telemetry_inprogress`)                           | (in-progress)         | —   |
| B4  | 명세서 → AI 분석 카드   | building | 2026-05-01 | (in-progress)                                                                      | (in-progress)         | —   |
| B7  | 환자 설명문 (인포+TTS)  | idea     | 2026-05-01 | —                                                                                  | —                     | —   |
| B8  | 부서별 AI 뉴스레터      | idea     | 2026-05-01 | —                                                                                  | —                     | —   |
| B11 | 부서 지침서 → 학습 카드 | idea     | 2026-05-01 | —                                                                                  | —                     | —   |

## 폐기됨

- B1 수당 최적화 어드바이저 — 페르소나 미스 (병원 직원은 행동 최적화를 안 함)
- B5 피로도 패턴 트래커 — 사람마다 너무 다름
```

- [ ] **Step 2: 검증**

```bash
test -f docs/harness/b-catalog.md && grep "B6" docs/harness/b-catalog.md
```

- [ ] **Step 3: 커밋**

```bash
git add docs/harness/b-catalog.md
git commit -m "docs(harness): add B catalog status tracker"
```

---

## Task 23: `CLAUDE.md` 패치 (3 sections + 1 condense)

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: 현재 CLAUDE.md 읽고 삽입 위치 확인**

```bash
grep -n "^## " CLAUDE.md
```

새 섹션 3개를 어디에 둘지 결정 (현재 마지막 섹션 `## Skill routing` 뒤가 자연스러움).

- [ ] **Step 2: 새 섹션 3개 추가 — `## Skill routing` 끝에 append**

`CLAUDE.md` 끝에 다음 추가:

```markdown
## 하네스 진입점 — `@smate-orchestrator`

SNUHmate 개발 작업은 `@smate-orchestrator` 로 시작한다. 모르는 작업이 들어오면 먼저 호출.

빠른 명령:

- 급여·퇴직금 변경: `/smate-payroll-loop`
- UI 변경: `/smate-design-guard` → `/smate-smoke`
- 새 기능 끝-끝: `/smate-feature-e2e`
- 새 (B) 사용자 슬롯 (마스킹·위키 등): `/smate-b-feature`
- 머지 직전: `/smate-pr-ops` + `/smate-doc-sync`

설계 전체: [`docs/superpowers/specs/2026-05-01-snuhmate-harness-design.md`](docs/superpowers/specs/2026-05-01-snuhmate-harness-design.md)
한 페이지 요약: [`docs/harness/architecture.md`](docs/harness/architecture.md)

## (B) 신규 기능 추가 절차 — `/smate-b-feature` 8단계
```

1. /smate-persona-research (부서×직종 매트릭스 갱신, skip 불가)
2. spec 작성 (docs/superpowers/specs/)
3. /smate-design-guard (사전 룰 점검)
4. 도메인 자료 수집 (@smate-payroll-expert or @smate-brand-curator)
5. writing-plans → executing-plans
6. /smate-smoke (확장 4축)
7. /smate-pr-ops (리뷰·CHANGELOG·PR)
8. /smate-doc-sync (spec/CLAUDE.md/MEMORY 갱신, skip 불가)

```

상태: [`docs/harness/b-catalog.md`](docs/harness/b-catalog.md)

## 자동 문서 동기화 — `@smate-doc-keeper`

`/smate-feature-e2e`·`/smate-b-feature` 마지막 단계에서 자동 호출. 사용자 승인 게이트 필수.

흐름:
1. `git diff main...HEAD` 분석 → 변경 유형 분류
2. spec / CLAUDE.md / MEMORY.md / CHANGELOG.md 갱신
3. `git diff docs/ CLAUDE.md MEMORY.md` 출력
4. **사용자 "OK" 응답 대기 (자동 commit 절대 금지)**
5. 승인 후 commit
```

- [ ] **Step 3: 기존 "자체 검증 루프" 섹션을 `/smate-smoke` 안내로 축약**

현재 `## 자체 검증 루프` 섹션의 본문 룰을 `/smate-smoke` 스킬과 `@smate-playwright-runner` 에이전트로 옮긴 상태. CLAUDE.md에는 다음만 남김:

```markdown
## 자체 검증 루프

수정 후 "완료"라고 말하기 전에 변경 범위에 맞는 검증을 직접 실행한다.

→ 워크플로우는 `/smate-smoke` 스킬과 `@smate-playwright-runner` 에이전트로 위임. 자세한 룰은 `.claude/skills/smate-smoke/SKILL.md` 와 `.claude/agents/smate-playwright-runner.md` 참조.

기본 명령(빠른 참조):

- `pnpm lint && pnpm check`
- `pnpm test:unit` / `pnpm test:integration` / `pnpm test:smoke`
- `pnpm verify:data` (단협/호봉표 변경 시)
- 전체: `pnpm verify`
```

기존 섹션의 상세 본문(70+ 줄)은 삭제. 본문이 이미 SKILL.md에 들어가 있으므로 단일 진실 원천 보존.

- [ ] **Step 4: 검증**

```bash
grep -c "^## " CLAUDE.md  # 새 섹션 3개 추가됨 (이전 + 3 + 기존 자체검증 1개 그대로)
grep "smate-orchestrator" CLAUDE.md  # 신규 섹션 보임
wc -l CLAUDE.md  # 70~100 줄 줄어들었어야 함 (자체 검증 루프 축약)
```

- [ ] **Step 5: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs(claude): wire smate harness entry points (3 sections + smoke condense)"
```

---

## Task 24: 라우팅 검증 (smoke test the harness itself)

**Files:** (검증만)

- [ ] **Step 1: 모든 agent/skill 파일 인벤토리**

```bash
ls .claude/agents/smate-*.md | wc -l   # 8
ls .claude/skills/smate-*/SKILL.md | wc -l  # 10
```

Expected: 정확히 8과 10.

- [ ] **Step 2: frontmatter 일관성 검증**

```bash
for f in .claude/agents/smate-*.md; do
  echo "=== $f ==="
  head -8 "$f" | grep -E "^(name|description|tools|model):"
done
for f in .claude/skills/smate-*/SKILL.md; do
  echo "=== $f ==="
  head -5 "$f" | grep -E "^(name|description):"
done
```

Expected: 모든 agent에 name/description/tools/model 4줄, 모든 skill에 name/description 2줄.

- [ ] **Step 3: 교차 참조 검증** — `@smate-XXX` 와 `/smate-XXX` 가 본문에서 잘못된 이름으로 호출되는지

```bash
grep -r "smate-" .claude/agents .claude/skills docs/harness CLAUDE.md \
  | grep -oE "smate-[a-z-]+" | sort -u
```

Expected: 정확히 18개의 unique 이름 (8 agents + 10 skills) — 오타·존재하지 않는 참조 0건.

- [ ] **Step 4: 의도된 진입점 호출 검증** — `@smate-orchestrator` 라우팅 표가 모든 스킬을 커버하는지

```bash
grep "/smate-" .claude/agents/smate-orchestrator.md | grep -oE "/smate-[a-z-]+" | sort -u | wc -l
```

Expected: 10 (모든 스킬 라우팅 표에 등장).

- [ ] **Step 5: 빌드 가능 여부 (변경 없음 검증)**

```bash
pnpm lint
pnpm check
```

Expected: 통과 (이번 plan은 코드 변경 0건이므로 베이스라인 그대로).

---

## Task 25: 최종 PR 생성

**Files:** (PR 생성만)

- [ ] **Step 1: 브랜치 푸시**

```bash
git push -u origin claude/nervous-bassi-da48cd
```

- [ ] **Step 2: PR 생성**

```bash
gh pr create --title "feat(harness): SNUHmate smate- harness setup (A)" --body "$(cat <<'EOF'
## Summary

- 8 smate agents + 10 smate skills + 3 docs/harness/ 살아있는 문서 추가
- CLAUDE.md 3 섹션 추가 (하네스 진입점·(B) 절차·자동 문서 동기화) + 자체 검증 루프 섹션 축약 (룰은 SKILL.md로 이동)
- 첫 번째 (B) 슬롯 (B6 마스킹) 은 별도 plan/PR 로 진행 예정

## Spec & Plan

- Spec: docs/superpowers/specs/2026-05-01-snuhmate-harness-design.md
- Plan: docs/superpowers/plans/2026-05-01-snuhmate-harness-A-setup.md

## Test plan

- [x] `ls .claude/agents/smate-*.md | wc -l` = 8
- [x] `ls .claude/skills/smate-*/SKILL.md | wc -l` = 10
- [x] frontmatter 일관성 (name/description/tools/model)
- [x] 모든 `smate-*` 참조 이름 18개로 unique (오타 0)
- [x] `@smate-orchestrator` 라우팅 표가 10 스킬 모두 커버
- [x] `pnpm lint && pnpm check` 통과 (코드 변경 0건)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: PR URL 출력 + executing-plans 종료**

PR URL을 사용자에게 보고하고 이 plan 종료.

---

## Self-Review

**Spec coverage:**

- §3.1 8 agents → Tasks 2–9 ✓
- §3.2 10 skills → Tasks 10–19 ✓
- §3.3 (B) 8단계 → Task 18 (`/smate-b-feature`)에 명시 ✓
- §3.4 확장 4축 → Tasks 6 (agent), 14 (skill) 양쪽에 명시 ✓
- §3.5 doc-keeper 자동 동기화 + 승인 게이트 → Tasks 9, 19, 23 (CLAUDE.md 섹션) ✓
- §5 디렉토리 구조 → Task 1, 20–22 ✓
- §6 CLAUDE.md 패치 3 섹션 + 축약 → Task 23 (5 steps) ✓
- §7 검증 정의 (8 agents + 10 skills 존재, orchestrator 호출 가능, lint/check 통과) → Task 24 ✓
- §4 (B) 카탈로그 → Task 22 (b-catalog.md) ✓

**Placeholder scan:**

- "TBD" — Task 21 persona-matrix.md 빈 템플릿 안의 _아직 인터뷰 없음_, "TBD - B6 시작 시" 는 의도된 라이브 문서 placeholder. 다른 placeholder 0건.
- "TODO/implement later" 0건.
- "Add appropriate error handling" 0건.
- "Similar to Task N" 사용 — Tasks 3–9, 11–19에서 표 형태로 풀어쓴 것은 *반복 패턴의 압축*이지 placeholder가 아님. 표의 각 행이 task의 본문 자체.

**Type consistency:**

- 에이전트 이름 표기: `@smate-XXX` 통일 ✓
- 스킬 이름 표기: `/smate-XXX` 또는 `smate-XXX` (frontmatter에서) — `@`와 `/`의 구분 일관 ✓
- `smate-doc-sync` (스킬) ↔ `@smate-doc-keeper` (에이전트) 페어링 — Tasks 9, 19, 23에서 모두 같은 매핑 사용 ✓
- `smate-smoke` ↔ `@smate-playwright-runner` 페어링 동일 검증 ✓

**Scope discipline:**

- 코드 변경 0건 — 의도적 (이 plan은 셸만 만든다)
- 첫 번째 (B) 슬롯 B6 마스킹은 별도 plan에서 진행
- 페르소나 인터뷰 자체는 Jayce-led 활동 → 스킬은 갱신 메커니즘만 제공
