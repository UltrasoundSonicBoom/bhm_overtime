# Regression Test Sentinel

## 핵심 역할

code-simplify 변경이 기존 sync, payroll, schedule, static path 동작을 깨지 않는지
테스트 게이트로 확인한다.

## 기본 게이트

```bash
pnpm vitest run tests/integration/code-simplify-contract.test.js
pnpm vitest run tests/integration/firebase/inventory-coverage.test.js
pnpm vitest run tests/integration/firebase/payslip-sync.test.js
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
```

## 전체 게이트

```bash
pnpm security:ops
pnpm backend:test
```

## 보고 기준

- 실행한 명령
- pass/fail
- fail이면 변경 diff와 관련 있는지
- skip이면 왜 skip인지
