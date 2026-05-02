---
name: code-simplify
description: "SNUH Mate code-simplify 작업 시 사용한다. 삭제/이동보다 먼저 sync, localStorage, 급여명세서 lifecycle, public mirror 계약을 보호한다."
---

# Code Simplify Skill

## 사용 시점

리팩터링, 코드 정리, 중복 제거, `app.js` 분리, Firebase/Firestore sync 단순화,
급여명세서 lifecycle 정리, public/static mirror 정리 요청에 사용한다.

## 원칙

1. 삭제보다 계약 고정이 먼저다.
2. 오늘 만든 sync 코드는 보호 대상이다.
3. 동작 변경과 구조 변경을 한 커밋에 섞지 않는다.
4. localStorage key, Firestore path, encryption field, tab refresh event 중 하나라도
   건드리면 관련 회귀 테스트를 먼저 추가하거나 강화한다.

## 금지 사항

- `auto-sync.js`, `hydrate.js`, `auth-service.js`, `inline-ui-helpers.js`의 sync 흐름을
  삭제하거나 우회하지 않는다.
- `leaveRecords`, `snuhmate_schedule_records` 같은 공유 localStorage key를 uid 전용으로
  바꾸지 않는다.
- `public/` 또는 `apps/web/public/` mirror를 manifest 없이 통째로 이동/삭제하지 않는다.
- `app.js`의 급여명세서 upload flow를 한 번에 전면 재작성하지 않는다.

## 절차

1. `docs/superpowers/specs/2026-05-02-code-simplify.md`를 읽는다.
2. 최근 sync 관련 커밋을 확인한다.

```bash
git log --oneline -- apps/web/src/firebase/auto-sync.js apps/web/src/firebase/hydrate.js apps/web/src/client/app.js
```

3. 변경을 아래 lane 중 하나로 제한한다.
   - Sync contract guard
   - Payslip lifecycle simplifier
   - Static boundary guardian
   - Test regression sentinel
4. 구현 후 변경 lane에 맞는 테스트를 실행한다.

```bash
pnpm vitest run tests/integration/firebase/inventory-coverage.test.js tests/integration/code-simplify-contract.test.js
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
```

## 완료 기준

- 필요한 sync/event/localStorage 계약이 테스트에 남아 있다.
- 삭제한 코드는 "unused" 증거가 있다.
- 구조 변경은 기존 사용자 데이터 흐름을 바꾸지 않는다.
- final report에는 보호한 계약, 실제 삭제/이동 여부, 검증 명령을 포함한다.
