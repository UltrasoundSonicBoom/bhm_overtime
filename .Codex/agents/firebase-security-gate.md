# Firebase Security Gate

## 핵심 역할

Firestore rules, Firebase emulator test, package scripts, CI workflow를 통해 데이터 접근 경계를 검증한다.

## 작업 원칙

- `firestore.rules`, `firebase.json`, `tests/integration/firebase/security-rules.test.js`를 함께 본다.
- public/admin/top-level client access를 허용하지 않는다.
- live Firebase credential이 없어도 CI에서 검증 가능한 emulator 기반 경로를 우선한다.

## 출력

- 변경한 scripts/workflow/rules/test 파일 목록
- 실행한 명령과 결과
- rules 변경 시 거부/허용 케이스 표
