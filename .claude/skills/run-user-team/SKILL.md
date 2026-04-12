---
name: run-user-team
description: BHM Overtime 사용자팀을 가동한다. 병원 직원(간호사 등)이 규정 질의나 급여 시뮬레이션을 요청할 때 사용. "연차 며칠이야?", "야간수당 계산해줘", "규정 찾아줘" 같은 직원 질문 시 반드시 이 스킬을 사용할 것.
---

# Run User Team

## 역할

병원 직원의 규정 질의 및 급여 시뮬레이션 요청에 답한다.
user-orchestrator가 질문을 분류하고 rag-answerer 또는 pay-simulator에게 위임한다.

## Phase 0: 컨텍스트 확인

```
1. 로그인한 사용자 정보 확인 (가능 시)
2. 이전 대화 이력 확인 (연속 대화인지)
3. 질문 유형 파악 (규정/계산/일반)
```

## 실행 패턴

**생성-검증 패턴**:
- rag-answerer: 규정에서 정보 검색 + 출처 포함 답변 생성
- pay-simulator: 수당/급여 계산 + 계산 근거 생성
- 결과 검증 후 사용자에게 전달

## 질문 유형별 처리

```
규정 질의 → rag-answerer
  "연차는 몇 일이에요?"
  "야간수당 기준이 뭐예요?"
  "휴가 신청 방법 알려줘"

수당 계산 → pay-simulator
  "야간 5회면 수당이 얼마예요?"
  "연장근무 3시간 추가하면?"
  "이번 달 예상 급여 계산해줘"

복합 → rag-answerer → pay-simulator
  "야간수당 규정 보고 내 수당 계산해줘"

일반 → 직접 응답
  "앱 사용법 알려줘"
  "담당자 연락처가 어떻게 돼요?"
```

## 응답 품질 기준

- 규정 답변: 조항 번호 + 원문 인용 포함
- 계산 결과: 계산 식 + 근거 조항 + 면책 고지
- 불확실한 내용: "담당자 확인 권장" 명시

## 이력 저장

```javascript
// 대화 완료 후 chatbot_history에 저장
POST /api/chat/history
{
  user_id: userId,
  question: userQuestion,
  answer: generatedAnswer,
  sources: sourceCitations
}
```

## 테스트 시나리오

### 정상 흐름
```
입력: "야간 근무 5회하면 수당 얼마예요?"

1. user-orchestrator: 계산 요청 분류 → pay-simulator 호출
2. pay-simulator: nurse-regulation.ts 기반 계산
3. 결과: "야간 5회 기준 예상 수당은 약 X만원입니다. (계산 근거: ...)"
4. chatbot_history에 저장
```

### 에러 흐름
```
입력: "급여가 잘못 나온 것 같아요"
→ user-orchestrator: "급여 오류는 인사팀 또는 노동조합에 직접 문의하세요.
   인사팀: 내선 XXX / 노조 상담: 내선 XXX"
```
