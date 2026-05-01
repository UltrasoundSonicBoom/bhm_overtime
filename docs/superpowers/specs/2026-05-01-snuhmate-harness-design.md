# SNUHmate Harness Design (smate-)

- **Status:** Draft, pending user review
- **Date:** 2026-05-01
- **Owner:** Jayce (kgh1379)
- **Origin:** brainstorming session — harness-100 패턴을 SNUHmate 1인 운영 환경에 맞게 워크플로우 중심으로 재설계
- **Related memory:** `project_harness.md` (18일 전 13-agent 3-tier 구조 폐기 학습)
- **Companion docs:** `docs/harness/architecture.md`, `docs/harness/persona-matrix.md`, `docs/harness/b-catalog.md`

## 1. 목적

두 가지 레이어를 시간 차로 묶는다.

- **(A) 개발팀 하네스** — Jayce가 SNUHmate를 더 빠르고 안정적으로 만들기 위한 Claude Code 에이전트·스킬 팀.
- **(B) SNUHmate 사용자 기능 슬롯** — 병원 직원이 "AI를 쓰는 홈페이지구나" 하고 체감할 수 있는 기능들. (A)의 첫 산출물이자 지속 산출물.

(A)가 먼저, (A) 위에서 (B) 슬롯을 표준 게이트로 양산한다.

## 2. 비목표 (Non-goals)

- 임상 케이스 컨퍼런스, 의료기록 감사, 안전 모니터링, EMR 실시간 연동, 보험청구 처리 — SNUHmate 권한 범위 밖.
- 13-agent 3-tier 도메인 격리 구조 — 18일 전 폐기된 학습. 1인 운영 환경에 과잉.
- 사용자에게 행동 권유("야간 1번 더 서면 명절수당 충족" 류) — 병원 직원은 스케줄·규칙을 따르지 행동 최적화를 하지 않음. 페르소나 미스.

## 3. 아키텍처 — Workflow-shaped (Option 3)

스킬이 *워크플로우*를, 에이전트가 *역할*을 담당. 모든 식별자는 `smate-` 프리픽스로 다른 플러그인·기본 스킬과 구분.

### 3.1 Agents (8명, `.claude/agents/smate-*.md`)

| 에이전트                     | 책임                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `@smate-orchestrator`        | 진입점. 사용자 요청을 받아 적합한 `smate-*` 스킬로 라우팅. 단독 결정은 하지 않고 전문가에 위임.                   |
| `@smate-persona-curator`     | 부서×직종 페르소나 매트릭스(`docs/harness/persona-matrix.md`)를 유지·갱신. 모든 (B) 작업의 첫 단계 게이트.        |
| `@smate-design-system-guard` | `globals.css` 토큰·캘린더 셀 너비·인라인 스타일 0건·`feedback_design_system_first` 룰 검증. UI 변경 PR 자동 검사. |
| `@smate-payroll-expert`      | 단협·호봉표·계산기·명세서 파서·LLM 보조 파서 도메인. B2/B4 슬롯의 도메인 자료 공급.                               |
| `@smate-playwright-runner`   | 확장 4축 스모크 (§3.4).                                                                                           |
| `@smate-brand-curator`       | 톤·문체·B7/B8/B9 글쓰기 (환자 설명문, 부서 위키 톤, AI 뉴스레터).                                                 |
| `@smate-pr-ops-reviewer`     | 코드리뷰·CHANGELOG 작성·spec drift 검출·PR 본문 자동 작성.                                                        |
| `@smate-doc-keeper`          | feature 완료 시 spec/CLAUDE.md/MEMORY/CHANGELOG 자동 동기화 (§3.5).                                               |

### 3.2 Skills (10개, `.claude/skills/smate-*/SKILL.md`)

| 스킬                     | 매핑          | 한 줄                                                 |
| ------------------------ | ------------- | ----------------------------------------------------- |
| `smate-payroll-loop`     | 우선 #2       | 명세서 파서·계산기·퇴직금 회귀 루프                   |
| `smate-design-guard`     | 우선 #3       | 디자인시스템 가드 (UI 변경 시 자동 호출)              |
| `smate-feature-e2e`      | 우선 #6       | spec→plan→build→QA→PR 끝-끝 워크플로우                |
| `smate-brand-content`    | 우선 #7       | 채용 공고·SNS·보도자료·사용자 공지                    |
| `smate-smoke`            | 우선 #4       | 확장 4축 검증 (동기화·버튼·DS·viewport)               |
| `smate-pr-ops`           | 우선 #5       | PR 운영 (review·CHANGELOG·doc drift)                  |
| `smate-regulation-sync`  | 우선 #1       | 단협·호봉표 drift 검증 (`pnpm verify:data` 위에 얹음) |
| `smate-persona-research` | B 게이트      | 부서×직종 페르소나 인터뷰·매트릭스 갱신               |
| `smate-b-feature`        | (B) 슬롯 표준 | persona→spec→DS→domain→build→smoke→PR→docs 8단계      |
| `smate-doc-sync`         | 자동 갱신     | feature-e2e/b-feature 끝에서 호출, 모든 md 갱신       |

### 3.3 (B) 슬롯 표준 8단계 (`smate-b-feature`)

```
1. @smate-persona-curator      → 부서×직종 페르소나 산출 (skip 불가)
2. spec 작성                    → docs/superpowers/specs/YYYY-MM-DD-*.md
3. @smate-design-system-guard   → 토큰·패턴 사전 점검
4. 도메인 자료 수집              → @smate-payroll-expert or @smate-brand-curator
5. 구현                          → writing-plans → executing-plans
6. @smate-playwright-runner     → 확장 4축 검증
7. @smate-pr-ops-reviewer       → PR 작성·리뷰·CHANGELOG
8. @smate-doc-keeper            → spec/CLAUDE.md/MEMORY/harness docs 자동 갱신
```

게이트 1(persona)과 8(doc-keeper)은 누락 불가. 나머지는 변경 범위에 따라 생략 가능.

### 3.4 `@smate-playwright-runner` 확장 4축

| 축             | 검증                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| (a) 동기화     | `project_sync_test_patterns` 4시나리오: 게스트→로그인 마이그레이션·payslip 전이·다기기 hydrate·write-through                |
| (b) 버튼 기능  | 변경된 route의 모든 인터랙티브 컨트롤 클릭 → 콘솔 에러 0 + 의도한 state 전이 확인                                           |
| (c) DS 부합    | `globals.css` 토큰만 사용 / 인라인 스타일 0건 / 캘린더 셀 ≈53px / 칩 wrap+8px / `feedback_design_system_first` 룰 자동 검증 |
| (d) 3 viewport | 320 / 768 / 1280px 스크린샷 캡처, 이전 베이스라인 대비 diff                                                                 |

콘솔 에러 0건은 모든 축의 공통 통과 조건.

### 3.5 `@smate-doc-keeper` 자동 동기화

> **스킬↔에이전트 관계:** 워크플로우 명세는 `smate-doc-sync` 스킬에 적혀 있고, 그 워크플로우를 실제로 실행(파일 diff 생성·승인 요청·commit)하는 역할이 `@smate-doc-keeper` 에이전트. 다른 모든 smate 페어도 이 패턴을 따름(스킬 = 절차, 에이전트 = 역할).

`smate-feature-e2e`·`smate-b-feature`의 마지막 단계에서 자동 호출:

| 변경 유형                 | 갱신 대상                                        |
| ------------------------- | ------------------------------------------------ |
| 신규 agent/skill 추가     | 본 spec(`2026-05-01-snuhmate-harness-design.md`) |
| 신규 (B) 기능             | `CLAUDE.md` "탭/기능 인덱스" 섹션                |
| 신규 데이터/규정/페르소나 | `MEMORY.md` 인덱스 + 관련 `project_*.md`         |
| 모든 머지                 | `CHANGELOG.md`                                   |

**승인 게이트:** `git diff docs/ CLAUDE.md MEMORY.md` 출력 → 사용자 승인 후에만 commit. 자동 commit 금지.

## 4. (B) 카탈로그 v2

| ID     | 이름                                                                 | 상태   | 깃발                  |
| ------ | -------------------------------------------------------------------- | ------ | --------------------- |
| **B6** | 마스킹 서비스 (CSV/Excel/PDF/사진 → Python 1차 + OpenAI privacy 2차) | 신규   | 독립                  |
| **B9** | 부서 위키 자동 정리 (마스킹된 자료 → 부서별 위키)                    | 신규   | 독립                  |
| B2a    | 급여 곡선 (입사 ~ 정년)                                              | 신규   | 자산 재사용 (B2 묶음) |
| B2b    | 호봉/승진 궤적 (과거 + 다음 예상 연도)                               | 신규   | 자산 재사용 (B2 묶음) |
| B2c    | 부서 로테이션 궤적 시각화                                            | 신규   | 자산 재사용 (B2 묶음) |
| B3     | 근무표 사진 → 스케줄 자동 입력                                       | 진행중 | —                     |
| B4     | 명세서 → AI 분석 카드 (LLM 보조 파서 위)                             | 진행중 | —                     |
| B7     | 환자 설명문 생성기 (인포그래픽 + TTS)                                | 후속   | —                     |
| B8     | 부서별 AI 뉴스레터 (해커뉴스 스타일)                                 | 후속   | —                     |
| B11    | 부서 지침서 → 자기학습 카드                                          | 후속   | —                     |

**삭제됨:** B1(수당 최적화 어드바이저, 페르소나 미스), B5(피로도 트래커, 사람마다 너무 다름).

**해자 메커니즘:** 직원이 매일 만지는 자료가 SNUHmate를 거쳐 마스킹·구조화·학습됨. B6은 모든 (B)의 게이트(마스킹 안 된 자료는 (B)에 못 들어옴). B9는 B6의 자연스러운 출구.

## 5. 디렉토리 구조

```
.claude/
  agents/
    smate-orchestrator.md
    smate-persona-curator.md
    smate-design-system-guard.md
    smate-payroll-expert.md
    smate-playwright-runner.md
    smate-brand-curator.md
    smate-pr-ops-reviewer.md
    smate-doc-keeper.md
  skills/
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
docs/
  superpowers/specs/2026-05-01-snuhmate-harness-design.md   ← 본 문서
  harness/
    architecture.md     # 본 설계 한 페이지 요약 (개발자 진입점)
    persona-matrix.md   # @smate-persona-curator의 living document
    b-catalog.md        # B 슬롯 상태 추적
```

## 6. CLAUDE.md 패치

다음 섹션 3개 추가:

- `## 하네스 진입점` — `@smate-orchestrator` 사용법, 빠른 명령 예시
- `## (B) 신규 기능 추가 절차` — `smate-b-feature` 8단계 요약
- `## 자동 문서 동기화` — `@smate-doc-keeper` 트리거와 승인 흐름

기존 "자체 검증 루프" 섹션은 → `smate-smoke` 스킬 호출 안내로 축약 (룰 본문은 SKILL.md로 이동).

## 7. 검증 (이 spec 자체에 적용되는 정의)

- (A) 셋업 완료의 정의: 모든 8 agents + 10 skills 파일이 `.claude/`에 존재하고, `@smate-orchestrator`로 호출 가능하며, `pnpm lint && pnpm check`가 통과.
- 첫 번째 (B) 슬롯 작동의 정의: B6 또는 B9 기능 1개가 `smate-b-feature` 8단계를 처음부터 끝까지 통과해 PR 머지 + `@smate-doc-keeper`가 본 spec과 CLAUDE.md를 자동 갱신.

## 8. 미해결 / 후속 결정 (TBD 아님 — 의도된 후속)

- B6의 OpenAI privacy API 연동 세부 — B6 슬롯 진행 시 `smate-b-feature` 1~3단계에서 결정.
- B9의 부서 위키 데이터 모델 — Firestore vs 별도 컬렉션 — B9 슬롯 진행 시 결정.
- `smate-doc-keeper`가 `~/.claude/projects/.../memory/`(사용자 홈)에 쓸지 여부 — 첫 적용 후 사용자 피드백으로 결정.
- 페르소나 인터뷰 1차 대상 부서 — `smate-persona-research` 첫 실행 시 사용자와 합의.

## 9. 브레인스토밍 결정 로그 (요약)

| 시점             | 결정                                                 |
| ---------------- | ---------------------------------------------------- |
| 초기             | (A)+(B) 두 레이어, (A) 먼저                          |
| 우선순위         | 7개 모두 인스코프, #2/#3/#6 1차                      |
| (B) 첫 깃발 후보 | B1 폐기(페르소나 미스), B5 폐기(개인차)              |
| 해자 정의        | 직원 자료가 SNUHmate를 거쳐 누적 = 해자, B6이 게이트 |
| 아키텍처         | Option 3 (Workflow-shaped) — 13-agent 폐기 학습 반영 |
| 네이밍           | `smate-` 프리픽스 강제 (다른 스킬과 혼동 방지)       |
| 페르소나         | `@smate-persona-curator` 정식 에이전트로 게이트화    |
| 자동 문서        | `@smate-doc-keeper` 정식 에이전트, 승인 게이트 필수  |
