---
name: deep-research
description: |
  Claude Code 사용 중 막히거나 팁이 필요할 때, 로컬 사례 DB와 웹 검색을 병행하여 답을 찾아줍니다. 결과는 my/research/에 파일로 축적됩니다. '막혔어', 'Claude Code 팁', '이거 어떻게 해' 같은 Claude Code 사용법 질문에 이 스킬을 사용하세요.
---

# Deep Research

Claude Code 사용 중 막힐 때 팁과 기능을 검색합니다.
로컬 사례 DB + 웹 검색을 병행하여 최신 정보를 제공.
결과는 `my/research/`에 파일 단건으로 축적.

## Quick Start

```text
/deep-research $ARGUMENTS     # 키워드로 검색 (예: /deep-research plan mode)
/deep-research                # 뭘 찾을지 물어봄
```

## Phase 1: 주제 파악

입력 키워드가 `$ARGUMENTS`로 전달되면 바로 Phase 2, 없으면 AskUserQuestion:
- "어떤 것이 궁금하세요?"
  - 프롬프트/plan mode 사용법
  - 에러 해결/디버깅
  - 스킬/커맨드/MCP 만들기
  - 기타 (직접 입력)

## Phase 2: 병렬 검색

3개 소스를 병렬로 검색:

### 2-1. 로컬 팁 DB

`gpters-docs/tips/claude-code-tips.md` 에서 Grep 검색

### 2-2. 로컬 사례 DB

`gpters-docs/cases/` 에서 키워드 관련 사례 검색

### 2-3. 웹 검색

WebSearch로 최신 정보 검색:
- `"Claude Code {키워드} tip"` 또는 `"Claude Code {키워드} 사용법"`
- 공식 문서, 블로그, GitHub 이슈 등에서 관련 정보 수집
- 최대 3개 소스 참조

## Phase 3: 종합 출력 (채팅 미리보기)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 "{키워드}" 검색 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 팁
- {로컬 DB에서 찾은 팁}
- {웹에서 찾은 팁}

## 관련 사례 (GPTers)
1. **{사례 제목}** — {한 줄 요약}

## 웹 참고 자료
- [{제목}]({URL}) — {한 줄 요약}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Phase 4: 저장 + HITL

### 자동 저장

검색 결과를 `my/research/YYMMDD-{slug}.md` 에 자동 저장.

### Slug 생성 규칙

파일명: `YYMMDD-{slug}.md`
- YYMMDD: 스킬 실행 시점
- slug: 핵심 키워드 2-4개, kebab-case
  - 한글 허용 (예: `plan-mode-사용법`)
  - 특수문자 제거, 공백→하이픈
  - 최대 30자
  - 동일 파일 존재 시: `-v2`, `-v3` 접미사

저장 형식:

```markdown
---
title: "{키워드} 검색 결과"
date: YYYY-MM-DD
keyword: "{키워드}"
sources: [로컬팁, 사례DB, 웹검색]
---

## 팁
- {팁 내용}

## 관련 사례
- {사례 요약}

## 웹 참고 자료
- [{제목}]({URL})
```

### HITL

```
📄 저장: my/research/YYMMDD-{slug}.md
```

AskUserQuestion:
- "도움이 됐나요?"
  - 네, 충분해요 → "프로젝트를 시작하려면 /gpters-thinking-partner 를 써보세요!" 안내 후 종료
  - 더 구체적으로 알고 싶어요 → Phase 1로 (키워드 재입력)
  - 다른 주제를 검색할래요 → Phase 1로 (새 주제)

## References

- 팁 DB: `gpters-docs/tips/claude-code-tips.md`
- 사례 DB: `gpters-docs/cases/`
- 산출물: `my/research/`

## Rules

- 없는 정보를 꾸며내면 신뢰를 잃으므로 결과가 없을 때 솔직히 안내합니다
- GPTers 사례가 가장 맥락에 맞는 정보이므로 우선 보여주고 웹 결과로 보강합니다
- 출처 없는 정보는 검증이 불가능하므로 웹 검색 결과에는 항상 URL을 포함합니다
- 깨진 링크는 사용자 경험을 해치므로 실제 접근 가능한 URL만 안내합니다
- 스터디원 대부분이 비개발자이므로 전문 용어는 쉬운 말로 풀어서 설명합니다
- 나중에 검색하고 분류하려면 frontmatter에 keyword, date, sources가 있어야 합니다
- WebSearch가 실패해도 로컬 DB만으로 유용한 결과를 제공할 수 있으므로 에러 대신 부분 결과를 보여줍니다
- 3개 소스 모두 결과가 없으면 사용자가 다음 행동을 알 수 있도록 대안(다른 키워드)을 안내합니다
