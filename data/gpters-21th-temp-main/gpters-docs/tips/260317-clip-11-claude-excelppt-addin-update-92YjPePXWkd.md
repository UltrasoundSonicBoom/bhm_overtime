---
title: "Claude Excel/PPT 애드인 업데이트 - 통합 컨텍스트부터 Skills까지"
source: "https://www.gpters.org/nocode/post/claude-excelppt-addin-update-92YjPePXWkd0oSw"
author: "null"
clipped_at: "2026-03-17T07:55:59Z"
word_count: 582
method: "article-defuddle"
---

![\"Excel](https://tribe-s3-production.imgix.net/maRFghi9QwMFjEl5r6Ftk?auto=compress,format)

Claude for Excel은 AI가 스프레드시트 안에서 직접 데이터를 분석하고 수식을 작성하는 엑셀 애드인이에요. Claude for PowerPoint는 같은 방식으로 프레젠테이션을 자동 생성하고 편집하는 파워포인트 애드인이고요.

  
2026년 3월 11일, Anthropic이 이 두 애드인에 꽤 큰 업데이트를 발표했어요. 핵심은 딱 4가지예요.

- **통합 컨텍스트**: Excel과 PowerPoint가 대화 내용을 공유
- **스킬(Skills)**: 반복 작업을 원클릭으로 자동화
- **지속적 지침(Instructions)**: 조직 규칙을 미리 세팅
- **멀티 클라우드 배포**: Bedrock, Vertex AI, Foundry 지원

하나씩 살펴볼게요.

---

![\"PowerPoint에서](https://tribe-s3-production.imgix.net/ONT6yib9GzJCAGZXXs7ha?auto=compress,format)

\\"PowerPoint에서

## 통합 컨텍스트 공유 — 탭 전환 없이 연속 작업

이번 업데이트에서 가장 체감이 클 기능이에요.  
Claude for Excel과 Claude for PowerPoint가 이제 열려 있는 파일 전체에서 대화 컨텍스트를 공유해요.

무슨 말이냐면, Excel에서 Claude랑 데이터 분석을 하면서 나눈 대화가 PowerPoint에서도 그대로 이어진다는 거예요. 탭을 전환하거나, \\"아까 그 데이터 있잖아\\"라고 다시 설명할 필요가 없어요.  

**실전 시나리오를 하나 볼게요:**

1. Excel에서 비교 대상 회사들의 재무 데이터를 분석해요
2. Claude가 거래 비교표(Comparables Table)를 자동 생성해요
3. \\"이걸 피치 덱에 넣어줘\\"라고 하면, PowerPoint에서 바로 슬라이드가 만들어져요
4. \\"이 내용으로 클라이언트 이메일도 써줘\\"까지 가능해요

중간에 데이터를 복사-붙여넣기하거나 다시 설명하는 단계가 완전히 사라져요.  
  

![\"컴퓨터](https://tribe-s3-production.imgix.net/aV8840W2oo7FPHjpjEGOa?auto=compress,format)

## 스킬(Skills) — 반복 워크플로우를 원클릭으로

**스킬(Skills)** 은 자주 쓰는 워크플로우를 하나의 버튼으로 묶어주는 기능이에요. 한 번 만들어두면 매번 같은 프롬프트를 입력할 필요 없이, 클릭 한 번으로 전체 워크플로우가 실행돼요.

### Excel 스킬

스킬

설명

**LBO/DCF/3-Statement 모델**

재무 모델 템플릿을 자동으로 구축

**거래 비교 분석**

Comparables Analysis 실행

**데이터 정리**

스프레드시트 데이터 클렌징

**모델 감사**

공식 오류, 재무 무결성 체크

### PowerPoint 스킬

스킬

설명

**경쟁 분석 프레젠테이션**

경쟁 환경 데이터를 포함한 슬라이드 생성

**슬라이드 업데이트**

기존 슬라이드를 최신 데이터로 자동 갱신

**일관성 검토**

숫자 일관성, 내러티브 정렬 감사

스타터 스킬 세트는 **Financial Analysis 플러그인** 을 설치하면 자동으로 들어와요. 금융 분야 실무자라면 설치하자마자 바로 써볼 수 있어요.

---

## 지속적 지침(Instructions) — 조직 규칙을 한 번만 설정

매번 \\"숫자는 소수점 둘째 자리까지\\", \\"한 줄 bullet만 써줘\\"라고 말하는 게 귀찮았다면 이 기능이 딱이에요.

**Instructions** 는 조직 차원에서 Claude의 행동 규칙을 미리 설정하는 기능이에요:

- **Excel**: 숫자 포맷(소수점, 통화 기호, 단위), hardcoded 가정 플래깅
- **PowerPoint**: 한 줄 bullet 제한, 슬라이드 레이아웃 규칙, 브랜드 가이드라인

한 번 세팅해두면 팀 전체가 일관된 결과물을 받아볼 수 있어요.  

---

## 배포 옵션 — 어디서든 접근 가능

엔터프라이즈 환경에서 \\"보안 때문에 못 쓴다\\"는 핑계가 통하지 않도록 배포 옵션을 대폭 넓혔어요:

플랫폼

비고

**Amazon Bedrock**

AWS 환경에서 바로 연결

**Google Cloud Vertex AI**

GCP 사용 조직용

**Microsoft Foundry**

Azure 생태계 연동

**LLM 게이트웨이**

기존 사내 게이트웨이 경유 가능

Excel의 Agent Mode에서는 **Microsoft 365 Copilot 사용자도 지원** 해요. 이미 Copilot을 쓰고 있다면 Claude를 추가 에이전트로 활용할 수 있다는 뜻이에요.

## 요금제 & 시작하기

현재 베타로 제공 중이고, 유료 플랜에서만 사용할 수 있어요:

- **Claude for Excel**: Pro, Max, Team, Enterprise 플랜
- **Claude for PowerPoint**: Max, Team, Enterprise 플랜 (Pro는 아직 미포함)

Mac과 Windows 모두 지원해요.  
설치는 Excel/PowerPoint의 \[홈\] 탭 → \[추가기능\]에서 \\"Claude\\"를 검색하면 돼요.

---

## 🙋🏻♀️ 자주 묻는 질문

### Claude for Excel은 무료로 쓸 수 있나요?

무료 플랜에서는 사용할 수 없어요. Pro 이상 유료 구독이 필요합니다.

### Claude for Excel 설치하려면 뭐가 필요한가요?

유료 플랜 구독과 Mac 또는 Windows 환경이면 충분해요. Excel의 \[홈\] 탭 → \[추가기능\] → \\"Claude\\" 검색으로 바로 설치할 수 있어요.

### Claude for Excel과 Microsoft 365 Copilot의 차이점은?

Copilot은 Microsoft 생태계 전반의 범용 AI 어시스턴트예요. Claude for Excel은 스프레드시트 분석과 재무 모델링에 특화되어 있고, 스킬(Skills) 기능으로 복잡한 워크플로우를 원클릭 자동화할 수 있다는 게 차이점이에요. 둘 다 함께 쓸 수도 있어요.

### Claude for Excel과 PowerPoint 간 데이터 공유는 어떻게 되나요?

같은 Claude 세션 내에서 두 앱이 열려 있으면 자동으로 컨텍스트가 공유돼요. 별도 설정 없이 Excel에서 분석한 내용을 PowerPoint에서 바로 활용할 수 있어요.
