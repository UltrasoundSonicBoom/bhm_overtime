---
name: gpters-skill-updater
description: |
  만든 스킬이 기대대로 동작하지 않거나 개선하고 싶을 때, SKILL.md를 분석하고 수정 diff를 제시합니다. '스킬이 안 돼', '스킬 고쳐줘', '스킬 업데이트', 'description 바꾸고 싶어' 같은 말을 하면 이 스킬을 사용하세요.
---

# GPTers Skill Updater

만든 스킬이 잘 안 될 때, 더 좋게 바꾸고 싶을 때 도와줍니다.

## Quick Start

```text
/gpters-skill-updater              # 기본 실행
```

## Phase 1: 어떤 스킬을 고칠까요?

`.claude/skills/` 디렉토리를 스캔하여 사용자가 만든 스킬 목록을 보여준다:

```
현재 설치된 스킬:

  📦 제공 스킬 (스타터킷)
  • gpters-setup, gpters-thinking-partner, gpters-writer ...

  🔧 내가 만든 스킬
  • {사용자가 만든 스킬 목록}

어떤 스킬을 수정할까요?
```

AskUserQuestion:
- "어떤 스킬을 수정할까요?"
  - {최근 만든 스킬 1}
  - {최근 만든 스킬 2}
  - {최근 만든 스킬 3}
  - 다른 스킬 (직접 선택)

## Phase 2: 뭐가 문제인가요?

AskUserQuestion:
- "어떤 부분을 고치고 싶어요?"
  - 실행하면 에러가 나요
  - 결과가 마음에 안 들어요
  - 새로운 기능을 추가하고 싶어요
  - 설명(description)을 바꾸고 싶어요

## Phase 3: 수정

선택한 스킬의 SKILL.md를 읽고 사용자 피드백 반영:

1. 현재 SKILL.md 내용을 보여준다
2. 수정 diff를 채팅에 미리보기로 제시
3. AskUserQuestion: "이렇게 수정할까요?"
   - 네, 적용해주세요 → 수정 + CHANGELOG 기록
   - 좀 더 수정해주세요 → 피드백 반영 후 다시 미리보기
   - 취소할게요 → 종료

## Phase 4: 테스트 안내

```
수정 완료!

📝 변경 내역: CHANGELOG.md에 기록했어요
🧪 테스트: /{skill-name} 을 실행해서 확인해보세요
```

## Rules

- 제공 스킬(gpters-*)은 스타터킷 업데이트 시 덮어쓰일 수 있으므로 수정 전 사용자에게 이 점을 안내합니다
- 의도치 않은 변경을 되돌릴 수 있도록 수정 전 CHANGELOG에 이전 상태를 기록합니다
- 사용자가 직접 만든 스킬은 덮어쓰기 위험이 없으므로 자유롭게 수정합니다
