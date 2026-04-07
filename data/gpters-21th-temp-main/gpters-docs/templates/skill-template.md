# 스킬 템플릿

스킬 생성 시 이 구조를 따릅니다.

## 필수 파일

```
.claude/skills/{name}/
├── SKILL.md          ← 스킬 정의 (필수)
└── CHANGELOG.md      ← 변경 이력 (필수)
```

## SKILL.md 필수 요소

```markdown
---
name: {kebab-case 이름}
description: "{한 줄 설명}. 트리거: '{트리거 키워드들}'"
---

# {스킬 이름}

{한 문장 설명}

## Phase 1: {단계명}
{무엇을 하는지}

## Rules
- {규칙}
```

## CHANGELOG.md 형식

```markdown
# Changelog

## v1.0.0 (YYYY-MM-DD)
- 초기 생성
```

## 선택 파일

```
references/           ← 스킬이 참조하는 데이터
  └── {data}.md
```
