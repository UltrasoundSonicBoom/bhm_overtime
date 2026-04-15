# SNUH Mate — 파일 맵

> 최종 수정: 2026-04-14  
> 목적: 모든 MD 파일·하네스·스킬의 위치, 역할, 참조 관계를 단일 문서로 정리한다.

---

## 1. 진실의 단일 소스 (루트 파일)

레포 루트에는 **역할이 명확한 파일만** 둔다.

| 파일 | 역할 | 수정 주기 | 참조처 |
|------|------|-----------|--------|
| `CLAUDE.md` | Claude 동작 지침 + 스킬 라우팅 + 하네스 트리거 | 정책 변경 시 | Claude Code 세션마다 자동 로드 |
| `CHANGELOG.md` | 앱 사용자 대상 업데이트 내역 | 배포 시마다 | 홈 화면 (`initHomeTab` → `fetch('./CHANGELOG.md')`) |
| `SPEC.md` | Admin & Content 백엔드 전체 스펙 | 아키텍처 변경 시 | `tasks/plan.md`, 에이전트 컨텍스트 |
| `ROADMAP.md` | 트랙 우선순위 + 다음 액션 요약 | 분기별 | 팀 공유용 |
| `DESIGN.md` | Admin·간호사 어드민 UI 디자인 시스템 | 디자인 변경 시 | admin-ui-engineer 에이전트 |
| `LAUNCH.md` | 정식 오픈 런칭 체크리스트 (8게이트) | Phase 진행 시 | 런칭 직전 점검 |
| `AGENTS.md` | 에이전트 목록 요약 (한 줄 설명) | 에이전트 추가 시 | 온보딩 참조용 |

### 정리 대상 (루트에서 제거 또는 이동 권장)

| 파일 | 문제 | 조치 |
|------|------|------|
| `task.md` | `tasks/plan.md`의 outdated autoplan restore 복사본 | 삭제 가능 |
| `notice.md` | 공지 원본인지 운영 메모인지 불명확 | `content/notices/` 또는 `ops/`로 이동 |

---

## 2. tasks/ — 구현 추적

**단일 소스:** `tasks/plan.md`가 전체 태스크의 진입점이다.

```
tasks/
├── plan.md                    ← 메인 태스크 추적 (Track A/B/C/D/E 전체)
├── todo.md                    ← 단기 임시 메모 (plan.md에 흡수 후 삭제)
├── task-a1-baseline.md        ← A1 상세 스펙
├── spec-a2-ingest-pipeline.md
├── spec-a3-embeddings.md
├── spec-a4-chatbot-quality.md
├── spec-a5-version-source-flow.md
├── spec-b1-directory-conventions.md
├── spec-b3-admin-api-contracts.md
├── spec-b4-admin-auth-middleware.md
├── spec-b5-admin-regulation-faq-flow.md
├── spec-b7-notices-faq-migration.md
├── spec-b8-rag-browse-unification.md
├── spec-b9-admin-mvp-shell.md
├── spec-b10-content-editing.md
├── spec-b11-faq-version-admin-ui.md
├── spec-c1-google-drive.md    ← Track C (Google 연동)
├── spec-c2-google-calendar.md
├── spec-admin-*.md            ← Admin 상세 스펙
├── spec-db-connection.md
├── spec-nurse-regulation-db.md
├── spec-ops-orchestrator-live.md
├── spec-regulation-unification.md
├── plan-app-lock.md           ← 미니 플랜 (별도 기능)
└── plan-regulation-unification.md
```

**규칙:**
- 태스크 상태(완료/진행)는 `plan.md` 체크박스로만 추적
- 상세 스펙이 필요한 태스크는 `spec-{task-id}-{slug}.md`로 분리
- Google 관련 스펙은 `tasks/spec-c*.md`가 기준 (`docs/google-auth-*.md`는 초안, 중복)

---

## 3. docs/ — 참조 문서

구현에 직접 쓰이지 않는 참조·분석·가이드 문서.

```
docs/
├── harness/
│   ├── snuhmate-harness-map.md      ← 하네스 전체 구조 맵
│   ├── agent-design-patterns.md     ← 에이전트 설계 패턴
│   ├── skill-writing-guide.md       ← 스킬 작성 방법
│   ├── skill-testing-guide.md       ← 스킬 테스트 방법
│   ├── orchestrator-template.md     ← 오케스트레이터 템플릿
│   ├── team-examples.md             ← 팀 구성 예시
│   └── archon-pack-patterns.md      ← Archon 패턴 (외부 참조)
├── qa-report-2026-04-05.md          ← QA 검증 리포트
├── regulation-audit-2026.md         ← 규정 감사 기록
├── bugfix-impact-2026.md            ← 버그픽스 영향 분석
├── cardnews-content-pipeline.md     ← 카드뉴스 파이프라인
├── google-auth-plan.md              ← Google 인증 초안 (→ tasks/spec-c1 참조)
├── google-auth-spec.md              ← Google 인증 스펙 초안 (→ tasks/spec-c1 참조)
├── google-auth-drive-calendar-implementation-plan.md
└── google-data-sync-spec.md         ← Google Drive/Calendar 동기화 스펙 초안
```

**정리 대상:**

| 파일 | 문제 | 조치 |
|------|------|------|
| `docs/google-auth-*.md` 4개 | `tasks/spec-c1/c2`와 내용 중복 | spec 파일 기준으로 통합 후 이 파일들은 `archived/` 이동 |

---

## 4. .claude/agents/ — 하네스 에이전트 정의

Claude Code가 `@에이전트명`으로 직접 호출하는 서브에이전트들.

```
.claude/agents/
├── build-orchestrator.md        ← Track A/B 빌드팀 총괄
├── backend-platform-engineer.md ← Hono + Drizzle API, DB 스키마
├── rag-pipeline-engineer.md     ← 규정 문서 ingest, 임베딩, 검색 품질
├── regulation-ingestor.md       ← PDF/MD 청킹 + DB 적재
├── admin-ui-engineer.md         ← Admin/Nurse Admin UI (DESIGN.md 참조)
├── devops-engineer.md           ← Vercel 배포, Supabase 마이그레이션
├── qa-engineer.md               ← 4단계 QA Gate 체크리스트
├── ops-orchestrator.md          ← 운영팀 총괄 (비개발자 자연어 → 서브에이전트)
├── content-editor.md            ← FAQ/공지 초안 → draft 상태로 등록
├── ops-reviewer.md              ← 검토 큐 승인/반려, published 전환
├── user-orchestrator.md         ← 직원 챗봇 진입점
├── rag-answerer.md              ← /api/chat 규정 질의응답
└── pay-simulator.md             ← 야간/연장/초과근무 수당 계산
```

**참조 관계:**
- `CLAUDE.md` → 트리거 조건 정의 (`@build-orchestrator`, `@ops-orchestrator`, `@user-orchestrator`)
- `DESIGN.md` → `admin-ui-engineer`가 참조
- `tasks/plan.md` → `build-orchestrator`가 Track A/B 체크포인트 기준으로 사용
- `docs/harness/snuhmate-harness-map.md` → 전체 구조 다이어그램

---

## 5. ops/ — 운영 에이전트 작업 파일

비개발자 운영자 + ops-orchestrator가 사용하는 프롬프트·보고서.

```
ops/
├── README.md                        ← 운영팀 사용 가이드
├── prompts/
│   └── content-edit-contract.md     ← 콘텐츠 편집 계약서 (에이전트용)
└── reports/
    └── track-checkpoint-2026-04-10.md ← 트랙 체크포인트 보고서
```

---

## 6. content/ — 콘텐츠 원본

운영자가 관리하는 MD 원본. Admin/DB 인덱싱의 소스.

```
content/
└── README.md    ← 콘텐츠 디렉토리 규칙 설명
    (정책, FAQ, 공지 MD 파일들이 여기 위치)
```

---

## 7. .gstack/projects/ — office-hours 산출물 (레포 외부)

`/office-hours` 스킬이 생성하는 design 파일. 레포 밖 `~/.gstack/`에 저장됨.

```
~/.gstack/projects/UltrasoundSonicBoom-bhm_overtime/
└── momo-main-design-YYYYMMDD-HHmmss.md   ← office-hours 출력 (design 결정)
```

**참조 관계:**
- 승인된 design 파일의 내용은 `tasks/plan.md`의 해당 Track에 Task로 반영
- `momo-main-design-20260414-212025.md` → `tasks/plan.md` Track C (C1~C4)

---

## 8. data/ — 데이터·외부 프로젝트 (정리 필요)

```
data/
├── hospital_guidelines_2026.md          ← 병원 규정 원문 (content/로 이동 권장)
├── 백엔드 아키텍처 업그레이드 계획.md     ← 계획 문서인데 data/ 위치 (docs/로 이동 권장)
├── excel-parser/
│   ├── README.md
│   └── 급여csv 파싱 성공 복사본.md
├── nurse-rostering-builder/             ← 별도 서브프로젝트
│   ├── PAGES_AND_FEATURES.md
│   ├── SCHEDULING_ALGORITHM.md
│   ├── SITEMAP.md
│   └── todo.md
└── gpters-21th-temp-main/               ← 임시 외부 프로젝트 복사본
    ├── CLAUDE.md
    └── README.md
```

**정리 대상:**

| 파일/폴더 | 문제 | 조치 |
|-----------|------|------|
| `data/hospital_guidelines_2026.md` | 규정 원문인데 data/ 위치 | `content/policies/`로 이동 |
| `data/백엔드 아키텍처 업그레이드 계획.md` | 계획 문서인데 data/ 위치 | `docs/`로 이동 |
| `data/gpters-21th-temp-main/` | 임시 외부 프로젝트 복사본 | 삭제 또는 별도 레포 |

---

## 9. 스킬 위치

스킬은 두 곳에 있다.

| 위치 | 종류 | 관리 주체 |
|------|------|-----------|
| `.agent/workflows/*.md` | gstack 워크플로우 스킬 (design-review, animate 등) | gstack 자동 설치 |
| `.agents/skills/*/SKILL.md` | 에이전트 스킬 (browser-use, cloud 등) | gstack 자동 설치 |
| `CLAUDE.md` Skill routing 섹션 | 스킬 트리거 규칙 | 수동 관리 |

---

## 10. 참조 흐름 요약

```
신규 아이디어/UX 개선
  └→ /office-hours
       └→ ~/.gstack/projects/.../momo-main-design-*.md  (설계 결정)
            └→ tasks/plan.md Track 추가               (구현 추적)

백엔드 아키텍처
  └→ SPEC.md                                          (스펙)
       └→ tasks/plan.md Track A/B                     (구현 추적)
            └→ tasks/spec-{id}-*.md                   (상세 스펙)

운영 콘텐츠
  └→ content/*.md                                     (원본)
       └→ ops-orchestrator → content-editor           (초안)
            └→ ops-reviewer                           (승인/게시)

앱 업데이트
  └→ CHANGELOG.md (루트)                              (사용자 대상)
       └→ fetch('./CHANGELOG.md') in app.js           (홈 화면 표시)

Claude 행동
  └→ CLAUDE.md                                        (지침)
       └→ .claude/agents/*.md                         (에이전트 정의)
```

---

## 11. 즉시 정리 권장 목록

| 우선순위 | 항목 | 작업 |
|---------|------|------|
| 높음 | `task.md` (루트) | 삭제 — `tasks/plan.md`가 기준 |
| 높음 | `docs/google-auth-*.md` 4개 | `tasks/spec-c1/c2` 기준으로 통합, 원본은 `docs/archived/`로 |
| 중간 | `data/hospital_guidelines_2026.md` | `content/policies/`로 이동 |
| 중간 | `data/백엔드 아키텍처 업그레이드 계획.md` | `docs/`로 이동 |
| 낮음 | `notice.md` (루트) | `content/notices/` 또는 삭제 |
| 낮음 | `data/gpters-21th-temp-main/` | 삭제 또는 별도 레포 |
