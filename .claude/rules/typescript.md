---
paths: ["**/*.ts", "**/*.tsx", "**/*.svelte"]
---

- `any` 타입 사용 금지 — `unknown` 또는 명시적 타입 사용
- `!` 논-null 단언 사용 시 주석으로 이유 명시
- `as` 타입 단언은 외부 API 응답 파싱 시에만 허용
- ESM 모듈: `.js` 확장자 명시 (import './foo.js')
- Svelte 컴포넌트: props는 `export let`, 내부 상태는 `let`
