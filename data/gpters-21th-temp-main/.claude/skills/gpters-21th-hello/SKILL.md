---
name: gpters-21th-hello
description: |
  1주차 라이브 체험 스킬. 관심분야를 파악하고 GPTers 사례 DB에서 맞춤 콘텐츠를 선별하여 HTML 전자책을 자동 생성합니다. 'hello', '첫 체험', '전자책', '라이브 체험', '21기' 같은 말을 하면 이 스킬을 사용하세요.
---

# GPTers 21th Hello

1주차 라이브에서 참가자가 직접 실행하여 **눈에 보이는 산출물**을 만드는 체험 스킬.
자기소개 → 관심분야 매칭 → HTML 전자책 → 사례글까지 한 흐름으로 이어집니다.

## Quick Start

```text
/gpters-21th-hello              # 기본 실행
```

## 산출물

| # | 파일 | 설명 |
|---|------|------|
| 1 | `gpters-21th-{user.name}.html` | 맞춤 전자책 15쪽 (프로젝트 루트에 생성) |
| 2 | `my/cases/YYMMDD-hello-world.md` | 첫 사례글 (/gpters-writer 연동) |

---

## Phase 1: 자기소개 (1분)

```
안녕하세요! Claude Code 첫 체험을 시작합니다.
3분 뒤에 나만의 전자책이 만들어질 거예요.
```

AskUserQuestion (2개 순차):

1. "이름(닉네임)이 뭔가요?"
   - 자유 입력

2. "어떤 분야에 관심 있으세요?"
   - 반복 업무 자동화 (계약서, 메일, 보고서 등)
   - 코딩/개발 (웹앱, 봇, 도구 만들기)
   - 문서/콘텐츠 (글쓰기, 영상, 자료 제작)
   - 아직 모르겠어요 (전체 맛보기)

→ 답변을 `user.name`, `user.interest` 변수로 저장.

---

## Phase 2: 레퍼런스 자동 읽기 (자동, 사용자 대기 없음)

`user.interest` 기반으로 `gpters-docs/` 레퍼런스를 읽어 전자책 소스를 구성.

### 읽기 대상

| 소스 | 경로 | 용도 |
|------|------|------|
| 사례 DB | `gpters-docs/cases/_index.md` | 관심분야 매칭 사례 선별 |
| 매칭 사례 본문 | `gpters-docs/cases/260317-*.md` | 관심분야 카테고리에서 상위 5개 사례 본문 읽기 |
| 팁 | `gpters-docs/tips/claude-code-tips.md` | 관심분야 관련 팁 10개 선별 |
| 커리큘럼 | `gpters-docs/curriculum/week1.md` ~ `week4.md` | 4주 로드맵 요약 |

### 관심분야 → 카테고리 매핑

| user.interest | _index.md 카테고리 | 팁 우선순위 |
|---------------|-------------------|------------|
| 업무 자동화 | `## 업무 자동화` | Getting started + 실전 생산성 |
| 코딩/개발 | `## 코딩/개발` | Plan Mode + 디버깅 |
| 문서/콘텐츠 | `## 문서/콘텐츠` | 프롬프트 팁 + 스킬/커맨드 |
| 전체 맛보기 | 각 카테고리 상위 2개씩 | 전체 고르게 |

### 사례 선별 기준

1. `_index.md`에서 매칭 카테고리의 사례 목록 추출
2. 추출 실패 사례 (`## 추출 실패`) 제외
3. 상위 5개 사례 본문 읽기 (word_count 기준 내림차순 — 내용이 풍부한 순)
4. 각 사례에서 추출: 제목, 한줄요약, 핵심 과정 3줄, 결과/임팩트

---

## Phase 3: HTML 전자책 생성 (자동)

`gpters-21th-{user.name}.html` 을 프로젝트 루트에 생성.

### 전자책 구조 (15쪽)

| 쪽 | 내용 | 소스 | B5 컴포넌트 |
|----|------|------|------------|
| 1 | **표지** | user 입력 | Cover (stripe + badge + cover-label) |
| 2 | **목차** | 자동 생성 | TOC (toc-row + toc-num + toc-section-label) |
| 3 | **나의 프로필** | Phase 1 | Profile Card (avatar + info-grid + tag) |
| 4-5 | **Claude Code란?** — 핵심 개념 2쪽 | 팁 DB | Feature Card (feature-icon + highlight-box) |
| 6-10 | **추천 사례 5선** — 사례당 1쪽 | 사례 DB | Case Card (steps + tech-tags + highlight-box) |
| 11-13 | **실전 팁 10선** — 관심분야 맞춤 | 팁 DB | Tip List (step-num + tip-title + tip-desc) |
| 14 | **4주 로드맵** | 커리큘럼 | Timeline (timeline-card + timeline-num + tag) |
| 15 | **마무리** | 고정 | Closing (closing-center + next-cards) |

### HTML 디자인 규칙

- **단일 파일**: 외부 리소스 없이 CSS inline + Google Fonts CDN만 허용
- **페이지 구분**: `page-break-after: always` 로 인쇄/PDF 변환 대응
- **디자인 시스템**: `references/design-system.md` (B5 White Clean) 참조 — 모든 색상, 타이포, 컴포넌트 규격은 해당 문서를 SSOT로 사용

### 생성 후 안내

```
전자책이 완성됐어요!

📖 파일: gpters-21th-{user.name}.html
📄 총 15쪽: 표지 + 사례 5개 + 팁 10개 + 로드맵

브라우저에서 열어보세요:
  open gpters-21th-{user.name}.html

PDF로 저장하려면 브라우저에서 Ctrl+P (인쇄) → PDF로 저장
```

---

## Phase 4: 사례글 연동 (/gpters-writer 자동 호출)

전자책 생성 완료 후 자연스럽게 사례글 작성으로 이어짐.

```
방금 Claude Code로 나만의 전자책을 만들었어요!
이 경험을 사례글로 남겨볼까요? 1분이면 됩니다.
```

AskUserQuestion:
- "사례글도 바로 작성할까요?"
  - 네, 바로 해요 → `/gpters-writer` 호출 (아래 컨텍스트 주입)
  - 나중에 할게요 → 종료 메시지

### /gpters-writer 컨텍스트 주입

`/gpters-writer` 호출 시 Phase 0 세션 스캔 대신 아래 컨텍스트를 직접 주입:

```yaml
session_hint:
  작업: "Claude Code로 나만의 전자책(HTML 15쪽) 생성"
  도구: "Claude Code /gpters-21th-hello 스킬"
  결과: "gpters-21th-{user.name}.html 생성 완료"
  관심분야: "{user.interest}"
  포함_사례: "{선별된 5개 사례 제목}"
```

이 힌트로 `/gpters-writer`의 Turn 1-3이 자동 맥락을 가짐:
- Turn 1 힌트: "방금 Claude Code로 전자책을 만드셨네요!"
- Turn 2 힌트: before = 수동으로 사례 찾기 / after = 맞춤 전자책 자동 생성
- Turn 3: 사용자 자유 선택

### 사례글 저장

`/gpters-writer` 표준 플로우 → `my/cases/YYMMDD-hello-world.md` 에 저장.

---

## Rules

- 라이브 체험은 3분 안에 끝나야 집중력이 유지되므로 전체 플로우를 3분 이내로 설계합니다
- 사용자 입력은 Phase 1에서만 받고 나머지는 자동 실행하여 체험 흐름이 끊기지 않게 합니다
- 외부 CDN이나 리소스에 의존하면 오프라인 환경에서 깨지므로 HTML은 단일 파일로 생성합니다
- 100단어 미만 사례는 전자책 콘텐츠로 활용하기에 내용이 부족하므로 건너뛰고 다음 사례를 선택합니다
- 관심 분야에 사례가 0개이면 빈 결과 대신 전체 카테고리에서 랜덤 선별하여 체험 품질을 보장합니다
- 사례글 작성은 부담이 될 수 있으므로 `/gpters-writer` 호출은 사용자가 선택할 수 있게 합니다
- 파일명에 한글이 들어가면 일부 OS에서 문제가 생기므로 `{user.name}`은 영문 kebab-case로 변환합니다

## References

- 사례 DB: `gpters-docs/cases/`
- 팁 DB: `gpters-docs/tips/claude-code-tips.md`
- 커리큘럼: `gpters-docs/curriculum/`
- 사례글 스킬: `/gpters-writer` (연동)
- 산출물: 프로젝트 루트 + `my/cases/`
