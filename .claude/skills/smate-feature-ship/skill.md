---
name: smate-feature-ship
description: "SNUHmate 신규 기능을 spec→구현→QA→PR→머지까지 끝-끝으로 진행하는 메타 워크플로우. 다른 smate-* 스킬과 사람 작업(superpowers:writing-plans·executing-plans)을 단계별로 조합. '새 기능 만들어줘 끝까지', '이 기능 출시까지', 'B6/B9 같은 사용자 슬롯 신규 작업', '한 사이클 돌려줘' 등에 사용."
---

# SNUHmate Feature Ship — 신규 기능 끝-끝 워크플로우

새 사용자 기능(B 카탈로그) 또는 큰 내부 변경의 spec→QA→머지 전체 사이클을 _기존 smate 스킬 + superpowers_ 조합으로 진행. 이 스킬 자체는 *조합 가이드*이지 새 작업을 직접 수행하지 않는다.

## 언제 사용

- 새 (B) 사용자 기능 슬롯 시작 (B6 마스킹·B9 부서 위키·B2 커리어 트윈·B7 환자 설명문·B8 AI 뉴스 등)
- 한 PR로 닫기엔 큰 변경 (예: schedule 탭 phase 3, retirement 새 시뮬)
- 끝-끝 사이클을 한 번 돌고 싶을 때 ("이 기능 머지까지 한 번에")

## 단계 (구성)

### Step 1: 페르소나 게이트 (B 카탈로그 신규 슬롯이면 필수)

`docs/harness/persona-matrix.md` 의 해당 슬롯 행이 채워졌는지 확인. 비어있으면 **사용자 인터뷰 먼저** — 추측 페르소나로 시작 금지 (B1 폐기 교훈).

### Step 2: 브레인스토밍 → spec

- `superpowers:brainstorming` 호출
- 결과를 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` 에 저장
- 사용자 승인 게이트

### Step 3: plan 작성

- `superpowers:writing-plans` 호출
- 결과를 `docs/superpowers/plans/YYYY-MM-DD-<topic>.md` 에 저장
- TDD 원칙·작은 task 단위

### Step 4: 도메인 사전 점검 (영역별 분기)

- 급여·계산기·파서 변경 → `/smate-payroll-review` (Phase 1 만)
- UI 변경 예정 → `/smate-design-guard` 베이스라인 통과 확인
- B6 마스킹 → `/smate-b6-masking` 진입

### Step 5: 구현

- `superpowers:subagent-driven-development` (추천) 또는 `superpowers:executing-plans`
- task 단위 commit, 자주 푸시

### Step 6: 영역별 회귀·가드

| 영역               | 호출                                |
| ------------------ | ----------------------------------- |
| 급여·계산기·파서   | `/smate-payroll-review` (Phase 2~4) |
| UI/CSS/Astro       | `/smate-design-guard`               |
| B6 마스킹          | `/smate-b6-masking` E2E             |
| 단협·호봉표 데이터 | `pnpm verify:data`                  |

### Step 7: 머지 (`/smate-pr-ops`)

- 리뷰어 게이트 → ship-it 자동 commit·push·PR·머지
- 🔴 발견 시 STOP, 사용자 수정

### Step 8: 사후 (선택)

- B 카탈로그 상태 갱신 (`docs/harness/b-catalog.md`)
- 메모리 갱신 (사용자 홈 `MEMORY.md` 의 관련 `project_*.md`)
- Feature flag·canary 가 있다면 `/schedule` 로 정리 시점 예약

## 통과 조건 (전체 사이클)

- spec 작성·사용자 승인
- plan 작성·태스크 모두 완료
- 영역별 가드 🟢
- PR 리뷰 🔴 0건
- CI 통과
- 머지 완료

## 단축 모드 (작은 변경)

새 기능이 아니라 _작은 수정_ 이라면 Step 1·2·3 skip 가능:

```
small-change → Step 4 (영역 가드) → Step 5 (구현) → Step 6 (회귀) → Step 7 (머지)
```

이 경우 본 스킬 호출 대신 `/smate-pr-ops` 직접 호출이 더 빠름.

## 에러 핸들링

- **spec 단계에서 사용자 의도 불명확** → Step 2 에서 멈춤, 추가 질문
- **plan 사이즈 폭발 (50+ tasks)** → 서브 프로젝트로 분할 권유
- **Step 6 회귀 발견** → Step 5 로 돌아가 수정, Step 6 재실행
- **Step 7 🔴 발견** → 수정 후 Step 7 재호출, 머지 우회 금지

## 참조

- 도메인 가드: `/smate-payroll-review`, `/smate-design-guard`, `/smate-b6-masking`
- PR 자동화: `/smate-pr-ops`
- 일반 워크플로우: `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:subagent-driven-development`
- B 카탈로그·페르소나: `docs/harness/b-catalog.md`, `docs/harness/persona-matrix.md`
