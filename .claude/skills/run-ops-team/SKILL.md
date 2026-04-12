---
name: run-ops-team
description: BHM Overtime 운영팀을 가동한다. 비개발자 운영자가 FAQ 추가/수정, 공지 작성, 규정 문서 적재, 검토 큐 확인 등 콘텐츠 운영 업무를 처리할 때 사용. "FAQ 추가해줘", "공지 올려줘", "규정 업데이트해줘", "승인 큐 확인" 같은 요청 시 반드시 이 스킬을 사용할 것.
---

# Run Ops Team

## 역할

비개발자 운영자의 콘텐츠 관리 요청을 처리한다.
ops-orchestrator가 요청을 분류하고 적절한 서브에이전트에게 위임한다.

**모든 콘텐츠는 draft 생성 → ops-reviewer 승인 → published 전환 순서를 지킨다.**

## Phase 0: 컨텍스트 확인

```
1. 미처리 approval_tasks 수 확인 (긴급 승인 건 있는지)
2. 이전 작업과 연속된 요청인지 파악
3. 요청 유형 분류
```

## 라우팅 결정

```
요청 분석
   │
   ├── "FAQ 추가/수정/삭제" → content-editor
   ├── "공지 작성" → content-editor
   ├── "규정/PDF 업로드/적재" → regulation-ingestor
   ├── "검토", "승인", "반려" → ops-reviewer
   ├── "이력 확인", "로그 보기" → ops-reviewer
   └── 복합 요청 → 순차 실행
```

## 실행 패턴

**감독자 패턴** (서브 에이전트):
- ops-orchestrator가 Agent 도구로 서브에이전트 호출
- 서브에이전트 결과를 운영자 언어로 번역하여 보고

## 운영 원칙

1. **Draft First**: 생성은 draft로만
2. **Approval Gate**: published = ops-reviewer 승인 필수
3. **No Code Changes**: 운영팀은 소스 코드 수정 안 함
   → 소스 코드 수정이 필요한 요청은 build-orchestrator에 에스컬레이션

## 운영자 응답 형식

기술 용어 없이 작업 결과를 설명:

```
✓ 완료: FAQ 초안이 작성되었습니다.
  제목: "야간근무 수당은 어떻게 계산되나요?"
  상태: 검토 대기

다음 단계:
→ 내용을 확인하고 게시하려면 "이 FAQ 승인해줘"라고 해주세요.
→ 수정이 필요하면 "내용 바꿔줘: [수정 내용]"이라고 해주세요.
```

## 테스트 시나리오

### 정상 흐름
```
입력: "연차 FAQ 추가해줘. 연차는 15일이야."

1. ops-orchestrator: content-editor에게 FAQ 작성 위임
2. content-editor: draft FAQ 생성
   { question: "연차는 며칠 사용할 수 있나요?", answer: "...", status: "draft" }
3. ops-orchestrator: 운영자에게 결과 보고
   "FAQ 초안이 작성되었습니다. 게시하려면 승인해줘라고 해주세요."
4. 운영자: "승인해줘"
5. ops-reviewer: 검토 후 published 전환
```

### 에러 흐름
```
입력: "앱 버튼 색깔 바꿔줘"
→ ops-orchestrator: "화면 수정은 개발팀(빌드팀)에서 처리해야 합니다.
   개발팀에 요청할까요?"
→ (승인 시) build-orchestrator에 에스컬레이션
```
