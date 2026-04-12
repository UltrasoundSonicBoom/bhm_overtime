
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
