---
name: run-build-team
description: BHM Overtime 빌드팀을 가동한다. Track A(RAG 파이프라인) 또는 Track B(Admin API/UI) 태스크를 구현할 때 사용. "Task A2 구현해줘", "Track B 시작해", "백엔드 작업 진행해" 같은 요청 시 반드시 이 스킬을 사용할 것. 다시 실행, 재시작, 특정 Task만 다시 등 후속 요청도 이 스킬로 처리.
---

# Run Build Team

## 역할

tasks/plan.md 기준 Track A/B 체크포인트를 진행한다.
build-orchestrator가 팀을 조율하며, 각 전문가 에이전트에게 작업을 분배한다.

## Phase 0: 컨텍스트 확인

```
1. tasks/plan.md 읽기 → 완료된 Task 체크 여부 확인
2. 사용자 요청에서 Task 번호 또는 Track 파악
3. _workspace/ 존재 여부 확인
   - 없음 → 초기 실행
   - 있음 + "다시" 또는 특정 Task → 부분 재실행
4. 시작할 Task를 사용자에게 확인 (불명확 시)
```

## 팀 구성 (빌드팀)

| 에이전트 | 역할 |
|---------|------|
| build-orchestrator | 팀 리더, 작업 분배, QA Gate 관리 |
| rag-pipeline-engineer | Track A: ingest, 임베딩, 검색 |
| backend-platform-engineer | Hono API, Drizzle 스키마 |
| admin-ui-engineer | Admin/nurse_admin 화면 |
| qa-engineer | 모든 모듈 검증, Gate 통과 판단 |
| devops-engineer | Migration, Vercel 배포 |

## 실행 패턴

**팬아웃/팬인** (에이전트 팀 모드):
1. build-orchestrator가 팀 생성
2. Track에 따라 해당 에이전트들에게 병렬 작업 분배
3. 완료된 모듈을 qa-engineer가 즉시 검증
4. QA Gate 통과 후 다음 Task 진행

## Task → 에이전트 매핑

```
Track A:
  A2 ingest   → rag-pipeline-engineer
  A3 임베딩   → rag-pipeline-engineer + backend-platform-engineer
  A4 품질검증  → qa-engineer + rag-pipeline-engineer
  A5 version  → backend-platform-engineer

Track B:
  B2 스키마   → backend-platform-engineer + devops-engineer
  B3 API계약  → backend-platform-engineer
  B4 인증     → backend-platform-engineer
  B5 운영흐름 → backend-platform-engineer
  B9~B11 UI  → admin-ui-engineer + backend-platform-engineer
  B12~B13 워크플로우 → 전체 팀
```

## 서비스 안정성 확인

작업 시작 전 qa-engineer에게:
- 현재 index.html 기능 동작 확인
- 공개 API 응답 확인
- 기준선(baseline) 기록

## 완료 조건

- 요청한 Task의 acceptance criteria 모두 충족
- qa-engineer의 QA Gate 통과
- tasks/plan.md 해당 항목 체크 업데이트

## 테스트 시나리오

### 정상 흐름
```
입력: "Task A2 구현해줘"
1. tasks/plan.md에서 A2 요구사항 확인
2. rag-pipeline-engineer에게 ingest 스크립트 구현 위임
3. 구현 완료 후 qa-engineer에게 검증 요청
4. 통과 시 tasks/plan.md A2 체크
5. A3 준비 여부 확인 보고
```

### 에러 흐름
```
입력: "Track B 시작해" (A1~A5 미완료)
→ build-orchestrator: "Track B는 Track A Ready 이후 진행 권장합니다.
   현재 완료된 Track A Task: A1만 완료.
   Track B를 먼저 시작하시겠습니까, 아니면 Track A를 이어서 진행할까요?"
```
