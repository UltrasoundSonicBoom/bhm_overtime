---
name: gpters-research-case
description: |
  다른 GPTers 멤버들이 Claude Code로 만든 사례를 탐색하고 영감을 얻습니다. 카테고리 브라우징, 키워드 검색, 맞춤 추천을 제공합니다. '다른 사람들은 뭘 만들었어', '사례 보여줘', '참고할 만한 거', '영감', '구경' 같은 말을 하면 이 스킬을 사용하세요.
---

# GPTers Case Research

다른 GPTers 멤버들이 Claude Code로 만든 사례를 탐색합니다.

## Quick Start

```text
/gpters-research-case $ARGUMENTS  # 키워드로 검색 (예: /gpters-research-case 자동화)
/gpters-research-case             # 탐색 방식 선택
```

## Phase 1: 탐색 방식 선택

AskUserQuestion:
- "어떻게 찾아볼까요?"
  - 전체 카테고리 둘러보기 → Phase 2A
  - 키워드로 검색 → Phase 2B
  - 나한테 맞는 사례 추천해줘 → Phase 2C
  - 최신 사례부터 보기 → Phase 2A (최신순 정렬)

## Phase 2A: 카테고리 브라우징

`gpters-docs/cases/_index.md` 기반으로 카테고리별 사례 보여주기:

```
📂 업무 자동화 (N개)
  • {제목} — {한 줄 요약}
  • ...

📂 코딩/개발 (N개)
  • ...

📂 리서치/분석 (N개)
  • ...

📂 문서/콘텐츠 (N개)
  • ...

궁금한 사례가 있으면 번호를 알려주세요!
```

## Phase 2B: 키워드 검색

`gpters-docs/cases/` + `my/cases/` 에서 Grep으로 키워드 검색 → 매칭 사례 보여주기.

## Phase 2C: 추천

사용자의 CLAUDE.md에서 프로젝트 정보를 읽고, 관련 사례를 추천.

## Phase 3: 사례 상세

선택된 사례의 전체 내용을 보여주고:

AskUserQuestion:
- "이 사례 어떠세요?"
  - 이걸로 프로젝트 정해볼래요 → /gpters-thinking-partner 실행
  - 비슷한 사례 더 보고 싶어요 → Phase 2 (같은 카테고리)
  - 다른 카테고리 보고 싶어요 → Phase 1로
  - 충분히 봤어요, 종료할게요 → 종료

## References

- 사례 DB: `gpters-docs/cases/` (제공된 사례)
- 내 사례: `my/cases/` (내가 작성한 사례)

## Rules

- 원문의 신뢰성이 중요하므로 사례 내용은 편집하지 않고 원문 그대로 보여줍니다
- 없는 사례를 꾸며내면 신뢰를 잃으므로 카테고리가 비어있을 때 솔직히 안내합니다
- Phase 2C에서 CLAUDE.md에 프로젝트 정보가 없으면 맥락 매칭이 불가능하므로 Phase 2A(전체 카테고리)로 폴백합니다
- 검색 결과가 0건이면 사용자가 다음 행동을 알 수 있도록 대안(다른 키워드, 전체 카테고리)을 함께 안내합니다
