노동조합 규정 관리 시스템 (Regulation Management System) 상세 명세서

문서 버전: v2.0 (Architecture & UI/UX Design Spec 포함)
작성일자: 2026-04-15
대상 시스템: SNUH 노동조합 단체협약 및 규정 AI 검색·관리 웹 애플리케이션

1. 프로젝트 개요

1.1. 목적

방대하고 복잡한 '노동조합 단체협약서 및 조합원 수첩'을 디지털화하여, 조합원들이 필요한 규정을 쉽게 검색하고 AI를 통해 명확히 해석할 수 있도록 지원. 또한 관리자가 매년 갱신되는 규정을 효율적으로 버전 관리(PDF 업로드 및 AI 자동 비교)할 수 있는 통합 관리 환경 제공.

1.2. 타겟 사용자

일반 사용자 (조합원): 본인의 근로조건, 휴가, 임금 등에 대한 규정을 검색하고 실무 적용 가이드를 얻고자 하는 직원.

관리자 (노동조합 간부 및 인사담당자): 규정 데이터를 최신화하고, 새로운 단체협약 체결 시 변경 사항을 추적·반영하는 담당자.

2. 시스템 아키텍처 명세 (System Architecture)

다른 LLM이 코드를 생성할 때 참조해야 할 핵심 아키텍처 구조입니다.

2.1. 기술 스택 (Tech Stack)

Frontend: HTML5, Vanilla JavaScript, Tailwind CSS (CDN 방식 적용)

Backend (추후 확장): Node.js / Express

Database: 구조화된 JSON 배열 (regulations.json). 추후 SQLite / PostgreSQL로 마이그레이션.

AI Integration: Google Gemini 2.5 Flash API (REST API 방식 연동)

2.2. 시스템 워크플로우 (Data Flow)

[검색 및 AI 응답 플로우]

User Input(자연어) -> JS에서 JSON 데이터의 chapter, title, keywords 기반 1차 필터링(Regex/Includes).

매칭된 규정이 있을 경우 -> 해당 규정의 전체 텍스트(원문, 불렛 리스트)를 컨텍스트로 묶어 Gemini API 호출.

API 응답 결과를 HTML로 파싱하여 'All-in-One 챗 버블' UI에 렌더링.

[문의 메일 연동 플로우]

챗 버블 내 ✉️ 문의 버튼 클릭 -> JS가 현재 검색어와 매칭된 부서 이메일을 가져옴.

mailto: 프로토콜과 encodeURIComponent를 사용하여 제목/본문이 사전 작성된 메일 클라이언트 즉시 호출.

[관리자 PDF 파이프라인]

PDF 업로드 -> 텍스트 추출 -> Gemini API를 통한 이전 버전 JSON과의 Diff 분석 -> draft.json 임시 생성 -> UI에서 좌우 비교(하이라이트) -> 승인 시 Active DB 덮어쓰기.

3. UI/UX 디자인 명세 (Design System)

LLM 프론트엔드 코드 생성 시 반드시 지켜야 할 디자인 가이드라인입니다.

3.1. 디자인 철학: Neobrutalism (네오브루탈리즘) & Mobile-First

특징: 대비가 강한 배경색, 두꺼운 검은색 테두리, 하드 섀도우(흐림 효과 없는 그림자), 직관적인 타이포그래피.

레이아웃: 모바일 화면을 최우선으로 고려한 Single-Column (1단) 채팅 레이아웃. 좌우 분할 화면 지양.

3.2. CSS 코어 변수 및 스타일 (Tailwind 커스텀)

코드를 생성할 때 아래의 CSS 클래스 속성을 반드시 구현해야 합니다.

Background Color: #f4f4f0 (따뜻한 오프화이트)

Point Colors: * Yellow: #fde047 (bg-yellow-300) - 헤더, 긍정 액션

Pink: #f9a8d4 (bg-pink-300) - 챗봇 아이콘, 검색 버튼

Blue: #93c5fd (bg-blue-300) - 주요 정보 박스

Green: #86efac (bg-green-300) - 성공 알림, 연락망 모달 헤더

Purple: #d8b4fe (bg-purple-300) - AI 생성 버튼 등

Neo-border: border: 3px solid #000;

Neo-shadow: box-shadow: 4px 4px 0px #000; (큰 카드에는 6px 6px 0px)

Button Action: &:active { transform: translate(4px, 4px); box-shadow: 0px 0px 0px #000; }

Custom Scrollbar: 너비 8px, 트랙 #f4f4f0 (좌측 border 2px solid #000), 썸 #000.

3.3. [가장 중요] All-in-One 챗 버블 (통합 UI 구조)

검색 결과 렌더링 시 별도의 탭이나 창 분리 없이, 하나의 큰 챗봇 버블(Box) 안에 아래 4가지 요소가 세로로 쌓여야 합니다.

관련 규정 원문 영역 (Orange Box): 조항 제목, 본문, 불렛 리스트, 즐겨찾기 버튼 포함. (bg-orange-50, border-2 border-black)

AI 맞춤 답변 영역: Gemini가 생성한 직접적인 답변 텍스트.

AI 실무 적용 가이드 영역 (Purple Box): 조건, 절차, 유의사항 3단계 가이드 리스트. (bg-purple-50, border-2 border-purple-300)

관련 부서 연락망 영역 (Blue Box): 버블 맨 하단 배치. 부서명, 📞 전화 (tel:) 버튼, ✉️ 문의 (mailto:) 버튼 포함. (bg-blue-50, border-2 border-black)

4. 프롬프트 엔지니어링 명세 (Prompt Engineering)

시스템이 Gemini API로 요청을 보낼 때 사용하는 시스템 프롬프트 템플릿입니다. 이 프롬프트 구조가 유지되어야 동일한 형태의 답변(답변+실무가이드)이 반환됩니다.

4.1. 매칭 결과가 있을 때의 프롬프트 (Unified Prompt)

당신은 사내 규정 안내 AI 어시스턴트입니다. 다음 규정을 바탕으로 사용자 질문에 대한 맞춤 답변과 실무 가이드를 작성해주세요.

[출력 형식 가이드 (HTML 형식으로 작성, 마크다운 기호 절대 금지)]
<div class="mb-4">
  <h4 class="font-bold text-lg mb-2 text-blue-700">💡 질문에 대한 AI 맞춤 답변</h4>
  <p class="text-base leading-relaxed text-gray-800 font-medium">[여기에 명확하고 친절한 답변 작성. 줄바꿈은 <br> 태그 사용]</p>
</div>
<div class="bg-purple-50 p-4 border-2 border-purple-300 rounded-lg">
  <h4 class="font-bold text-lg mb-3">✨ AI 실무 적용 가이드</h4>
  <ol class="list-decimal pl-5 space-y-2 font-medium text-gray-800">
    <li><b>조건 확인:</b> [신청 대상 및 조건]</li>
    <li><b>신청 절차:</b> [필요 서류 및 부서장 승인 여부]</li>
    <li><b>유의 사항:</b> [기타 유의사항]</li>
  </ol>
</div>

[규정 조항]: ${result.title}
[규정 원문]: ${result.content}
[세부 항목]: ${result.bullets.join(', ')}
[사용자 질문]: ${query}


4.2. 검색 결과가 없을 때의 프롬프트 (Fallback Prompt)

사용자가 "${query}"라고 질문했지만 관련된 사내 규정을 찾을 수 없습니다. 
규정이 존재하지 않거나, 다른 키워드(예: 연차, 휴직, 상여금 등)로 검색해 보라고 친절하게 안내해 주세요. 
줄바꿈은 <br> 태그, 강조는 <b> 태그를 사용하세요. 마크다운 기호(*, # 등)는 절대 사용하지 마세요.


5. 기능 상세 명세

F1. 공통 기능 (Global Navigation)

기능 ID

기능명

설명

F1-1

GNB (상단 메뉴)

Dashboard, Search & Chat, Admin 탭 간 SPA 라우팅

F1-2

알림(Notification) 센터

🔔 클릭 시 시스템 알림 드롭다운 UI 제공

F1-3

비상연락망 전역 모달

📞 아이콘 클릭 시, 사내 주요 부서 리스트(노사협력과, 인사팀 등) 모달 오픈. 원클릭 전화 및 스마트 이메일 템플릿 연동

F2. 대시보드 (Dashboard)

기능 ID

기능명

설명

F2-1

요약 통계 / 퀵 카테고리

통계 위젯 및 장(Chapter)별 퀵 필터 버튼. 클릭 시 Search 탭 이동 후 자동 검색

F2-2

즐겨찾기 / 최근 업데이트

★ 저장된 규정 목록 및 신규 업데이트 규정 리스트 제공

F3. AI 검색 및 탐색 (Search & Chat)

기능 ID

기능명

설명

F3-1

검색 & 필터링

자연어 입력 및 최근 검색어(태그) 제공

F3-2

All-in-One 챗 버블 렌더링

[3.3 디자인 명세]를 준수하여 원문, AI답변, 실무가이드, 담당부서 버튼을 하나의 말풍선 HTML로 결합하여 렌더링

F3-3

스마트 이메일 (Mailto)

부서 이메일 문의 시, 제목: [규정 문의] {규정명} 관련, 본문: 관련 검색어 {검색어} / 문의내용... 양식이 자동 인코딩되어 메일앱 오픈

F4. 관리자 페이지 (Admin)

기능 ID

기능명

설명

F4-1

PDF 버전 관리

단체협약 PDF 업로드 -> 진행률 바 -> 기존 버전과 새 초안의 Diff 뷰(하이라이트) 비교 후 승인/반려

F4-2

규정 CRUD 관리

테이블 뷰 형태의 규정 리스트 출력 및 데이터 수정 모달 제공

6. 데이터 구조 (Data Schema)

6.1. Regulation Object (regulations.json)

{
  "id": "문서 고유 ID (예: art_41)",
  "chapter": "소속 장 (예: 제4장 근로시간)",
  "title": "조항 제목 (예: 제41조(청원휴가))",
  "content": "조항 본문 핵심 텍스트",
  "bullets": ["세부 항목 리스트 1"],
  "keywords": ["검색용 키워드 배열"],
  "contactDept": "매핑될 담당 부서 키 (예: 인사팀 (일반/휴가))"
}


6.2. Contact Object (contacts)

{
  "dept": "부서명 (예: 인사팀 (급여계))",
  "roles": "담당 업무 요약",
  "phone": "02-2072-XXXX",
  "email": "hr@snuh.org"
}
