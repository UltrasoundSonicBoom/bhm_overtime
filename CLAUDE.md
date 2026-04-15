
## 코딩 원칙 (Andrej Karpathy Rules)

> 출처: github.com/forrestchang/andrej-karpathy-skills

**이 원칙들은 기본값이다. 불명확하면 코드보다 질문이 먼저다.**

### 1. 코딩 전에 먼저 생각하라

- 가정은 명시적으로 말한다. 불확실하면 묻는다.
- 여러 해석이 가능하면 제시한다 — 하나를 침묵 속에 선택하지 않는다.
- 더 단순한 접근이 있으면 말한다. 필요 시 반론을 제기한다.

### 2. 단순함이 우선이다

- 요청된 것만 만든다. 추측성 기능 추가 금지.
- 단일 사용 코드에 추상화 금지.
- 200줄로 쓴 게 50줄로 쓸 수 있다면 다시 쓴다.

### 3. 수술적 변경만 한다

- 필요한 것만 건드린다. 인접 코드 개선 금지.
- 깨지지 않은 것을 리팩토링하지 않는다.
- 기존 스타일을 그대로 따른다.
- 관련 없는 죽은 코드를 발견하면 언급만 하고 삭제하지 않는다.

### 4. 검증 가능한 목표로 실행한다

멀티스텝 작업 시 간단한 계획을 먼저 제시한다:
```
1. [단계] → 검증: [확인 방법]
2. [단계] → 검증: [확인 방법]
```

---

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## 하네스: BHM Overtime 3레이어 에이전트 팀

**목표:** 빌드팀(개발)/운영팀(비개발자)/사용자팀(직원)이 협업하여 SNUH Mate 앱을 자율적으로 개발·운영한다.

**트리거:**
- 백엔드 Task 구현, Track A/B 진행, RAG 파이프라인 → `run-build-team` 스킬 또는 `@build-orchestrator`
- FAQ/공지 업데이트, 규정 문서 적재, 검토 큐 → `run-ops-team` 스킬 또는 `@ops-orchestrator`
- 규정 질의, 급여 시뮬레이션, 직원 챗봇 → `run-user-team` 스킬 또는 `@user-orchestrator`

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-04-12 | 초기 구성 | 3레이어 13개 에이전트 + 3개 스킬 | 하네스 엔지니어링 도입 |
