# Archon Pack Patterns — 101-pack / angio-pack 설계 레퍼런스

> 출처: github.com/coleam00/Archon  
> 목적: 101-pack, angio-pack 등 도메인 Pack을 설계할 때 참고할 패턴 정리

---

## 핵심 철학

Archon의 핵심 메시지:  
**"워크플로우가 구조를 정의한다. AI는 각 단계의 빈칸만 채운다."**

Pack 설계에 적용하면:
- Pack은 해당 팀의 예외 규칙과 현장 룰만 담는다
- 공통 정책(교대, 휴식, 금지패턴)은 `clinical-core`에, Pack에는 복붙하지 않는다
- 각 Pack의 워크플로우는 미리 정의된 노드 타입으로 구성한다

---

## 3가지 노드 타입

### 1. Prompt Node (AI 추론 포인트)

에이전트가 판단을 내리는 단계. **범위를 명확히 제한한다.**

```yaml
# 나쁜 예 — 너무 열린 프롬프트
- name: review_schedule
  type: prompt
  prompt: "스케줄을 검토하세요"

# 좋은 예 — 범위 명시
- name: review_ward_schedule
  type: prompt
  prompt: |
    다음 기준으로만 101 병동 스케줄을 검토하라:
    1. 신규간호사가 3일 연속 야간 배치되는지 확인
    2. 프리셉터와 담당 신규간호사가 같은 조에 있는지 확인
    3. 위반 시 조항 번호와 함께 목록으로 출력
    판단 근거가 없으면 "확인 불가"를 명시한다.
```

**Pack 적용 원칙**: Prompt Node는 Pack 고유 규칙만 검토한다. `clinical-core`가 커버하는 공통 규칙을 중복 검토하지 않는다.

---

### 2. Bash Node (결정론적 검증)

AI 없이 실행되는 단계. **Pass/Fail 조건을 코드로 명시한다.**

```yaml
- name: validate_slot_count
  type: bash
  command: |
    # Angio: 시술일 최소 슬롯 수 확인
    bun run server/scripts/validate-angio-slots.ts --date=${DATE}
  on_fail: block  # 실패 시 다음 노드로 진행 불가
```

**Pack 적용 원칙**: 규정 준수 여부는 가능하면 Bash Node로 자동 검증한다. AI 판단에만 의존하지 않는다.

---

### 3. Loop Node (반복 + 종료 조건)

정해진 조건이 충족될 때까지 반복하는 단계.

```yaml
- name: fix_violations
  type: loop
  until: ALL_VIOLATIONS_RESOLVED
  max_iterations: 5
  fresh_context: true  # 루프마다 컨텍스트 초기화
  steps:
    - review_ward_schedule
    - fix_schedule
    - validate_slot_count
```

**Pack 적용 원칙**: 스케줄 생성/검토 루프는 반드시 `max_iterations`를 설정해 무한 루프를 방지한다.

---

## 4가지 결정론적 메커니즘

| 메커니즘 | Archon 원문 | Pack 적용 |
|---------|------------|----------|
| **Isolation** | 독립 git worktree로 병렬 실행 | 팀 Pack별 독립 에이전트로 격리 |
| **Validation Gate** | 조건 불충족 시 Bash로 차단 | `clinical-safety-gate` 스킬로 임상 결과 차단 |
| **Human Checkpoint** | 사람이 승인할 때까지 워크플로우 중단 | `ops-reviewer`만 published 전환 가능 |
| **Bounded AI Scope** | Prompt에 기대 출력 형식 명시 | 에이전트 지시에 "조항 번호 + 원문 인용" 강제 |

---

## 101-pack 설계 가이드

### Pack 구조 원칙

```
101-pack이 담아야 할 것:
  - 3교대 병동 고유 배치 규칙 (e.g., 야간 최소 인원 N명)
  - 프리셉터/신규간호사 pairing 제약
  - 병동 행사/교육 시 coverage delta 계산법
  - 병동 오버타임 특수 케이스

101-pack이 담으면 안 되는 것:
  - 교대 근무 공통 금지패턴 → clinical-core
  - 수당 계산 → payroll-pack
  - 규정 조항 원문 → rag-answerer
```

### 최소 에이전트 세트

```
ward-101-orchestrator       — 101 전체 흐름 조율
ward-scheduler-reviewer     — Prompt Node: 3교대 규칙 검토
preceptor-pairing-reviewer  — Prompt Node: pairing 제약 검토
ward-event-planner          — Prompt Node: 행사 coverage 반영
```

### 최소 스킬 세트

```
ward-roster-review          — 3교대 Prompt → Bash Gate → Human Checkpoint
preceptor-coverage-check    — 신규/프리셉터 pairing Loop
ward-overtime-sanity-check  — 오버타임 Bash 검증
```

---

## angio-pack 설계 가이드

### Pack 구조 원칙

```
angio-pack이 담아야 할 것:
  - 시술실 슬롯 운영 규칙
  - sedation/contrast 스킬 보유자 배치 제약
  - on-call 기준 및 초과근무 계산 특수 케이스
  - 조영제 관련 교육 이벤트 coverage 반영

angio-pack이 담으면 안 되는 것:
  - 병동 프리셉터 규칙 → 101-pack
  - 방사선 안전 → diagnostic-imaging-core (미래)
  - 수당 계산 → payroll-pack
```

### 최소 에이전트 세트

```
angio-orchestrator          — Angio 흐름 조율
procedure-day-planner       — Prompt Node: 시술일 배치 검토
sedation-skill-reviewer     — Prompt Node: 스킬 커버리지 확인
oncall-overtime-auditor     — Prompt Node: on-call/초과근무 검토
```

### 최소 스킬 세트

```
angio-procedure-day-review  — 시술실 운영 규칙 적용
angio-oncall-pay-check      — on-call/수당 Bash 검증
modality-coverage-review    — 스킬 커버리지 Loop
```

---

## Pack 구현 순서 (권장)

```
1. Pack 범위 문서화
   → "담을 것 / 담지 않을 것" 표를 먼저 작성

2. Bash Node(검증 스크립트)부터 구현
   → AI 없이도 통과/실패가 명확한 것부터

3. Prompt Node 범위 제한
   → 기대 출력 형식과 "확인 불가" 케이스를 명시

4. Loop 종료 조건 설정
   → max_iterations와 Human Checkpoint 위치 결정

5. clinical-core와 중복 제거
   → 공통 정책은 Pack에서 제거하고 상위 레이어에 위임
```

---

## 참고: Archon의 17개 사전 빌트인 워크플로우 패턴

| 패턴 | 설명 | Pack 활용 예 |
|------|------|------------|
| Sequential | Plan → Implement → Validate → Review | 스케줄 생성 → 규칙 검증 → 승인 |
| Parallel Review | 여러 Reviewer가 동일 결과물 동시 검토 | 복수 규칙 동시 검증 |
| Iterative Loop | 테스트 통과 전까지 반복 | 스케줄 조정 루프 |
| Multi-Stage Classification | 복잡도 분류 후 전문 에이전트로 라우팅 | 요청 복잡도 판단 후 Pack 선택 |
