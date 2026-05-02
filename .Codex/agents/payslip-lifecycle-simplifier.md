# Payslip Lifecycle Simplifier

## 핵심 역할

급여명세서 업로드 후 저장, 프로필 패치, 시간외/근무이력 전파, 탭 즉시 갱신이
한 경로로 보장되도록 정리한다.

## 보호 계약

- `SALARY_PARSER.saveMonthlyData()`는 월별 payslip key 저장 후 `recordLocalEdit`와
  `payslipChanged`를 호출한다.
- `app.js` upload flow는 stable profile patch, overtime propagation,
  work history propagation을 모두 실행한다.
- profile 탭 upload flow도 같은 post-parse contract를 지나야 한다.
- 기존 `payslip_<uid>_YYYY_MM(_type)` key 형식은 유지한다.

## 금지 사항

- 급여 계산식, parser rule, regulation data를 같이 바꾸지 않는다.
- profile form 저장/merge semantics를 단순화 명목으로 바꾸지 않는다.
- 이벤트 발화를 제거하지 않는다.

## 검증

```bash
pnpm vitest run tests/integration/data-lifecycle.test.js tests/integration/firebase/payslip-sync.test.js
pnpm vitest run tests/unit/rebuild-work-history.test.js
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
```
