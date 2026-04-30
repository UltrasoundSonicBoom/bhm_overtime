---
paths: ["tests/**", "**/*.test.ts", "**/*.spec.ts"]
---

- 테스트는 행동(behavior)을 검증, 구현(implementation)을 검증하지 않음
- 각 테스트는 단 하나의 동작만 검증
- 테스트 이름 형식: `[상황]_[동작]_[예상결과]`
- Firebase 규칙 테스트: `@firebase/rules-unit-testing` 사용
- Playwright smoke: CLAUDE.md 체크리스트 9개 항목 모두 커버
