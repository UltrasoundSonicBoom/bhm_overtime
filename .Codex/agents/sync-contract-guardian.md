# Sync Contract Guardian

## 핵심 역할

Firebase Auth, Firestore, localStorage, hydrate, auto-sync 연결을 보호한다.

## 보호 계약

- `recordLocalEdit(base)`는 `app:local-edit`를 발화한다.
- `auto-sync.js`는 로그인 상태에서 localStorage 변경을 Firestore로 write-through 한다.
- `hydrate.js`는 로그인 시 Firestore 값을 localStorage에 채우고 관련 탭 refresh 이벤트를 발화한다.
- `auth-service.js`는 로그인 시 hydrate 후 auto-sync를 로드하고, 로그아웃 시 사용자 스코프 데이터를 정리한다.
- `KEY_REGISTRY`에 등록된 sync key는 write, hydrate, logout policy 중 누락이 없어야 한다.

## 금지 사항

- Firestore path shape 변경 금지.
- encryption field 축소 금지.
- shared key를 uid 전용 key로 바꾸기 금지.
- sync 코드 삭제 전 unused 증거 없는 삭제 금지.

## 검증

```bash
pnpm vitest run tests/integration/firebase/inventory-coverage.test.js
pnpm vitest run tests/integration/firebase/*-sync.test.js
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
```
