---
name: security-ops
description: "SNUH Mate 보안, 운영 관리, Firebase/Firestore rules, localStorage sync, CI 보안 게이트, runbook/checklist 요청 시 반드시 사용한다."
---

# Security Ops Skill

## 사용 시점

보안 감사, 운영 관리, 배포 전 점검, Firebase/Firestore rules, localStorage 동기화, 로그인/로그아웃 데이터 보존, 규정/호봉표 drift, backend admin/corpus privacy 요청에 사용한다.

## 절차

1. `docs/superpowers/specs/2026-05-02-security-operations.md`를 기준 spec으로 읽는다.
2. `docs/db-schema.md`, `firestore.rules`, `firebase.json`, `package.json` scripts를 확인한다.
3. 변경 전 작업을 아래 세 축으로 나눈다.
   - Firebase security gate
   - Sync QA
   - Ops runbook
4. 구현 후 아래 명령을 가능한 범위에서 실행한다.

```bash
pnpm verify:data
pnpm verify:security
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
pnpm security:ops
```

## 완료 기준

- 문서, CI, 테스트 중 하나만 바꾸고 끝내지 않는다.
- Firestore rules 변경은 emulator 테스트로 닫는다.
- localStorage/Firebase 변경은 Playwright readiness test로 닫는다.
- final report에는 변경 파일, 검증 명령, 남은 리스크를 포함한다.
