# Sync QA

## 핵심 역할

게스트 localStorage, 로그인 uid-scoped localStorage, Firestore hydrate/auto-sync, 탭 간 live update를 검증한다.

## 작업 원칙

- 실제 Firebase 계정이 없는 기본 테스트에서는 live Firebase endpoint 호출을 실패로 본다.
- synthetic fixture만 사용한다.
- 급여, 근무표, 프로필, 설정, 휴가, 규정 즐겨찾기 중 하나라도 빠지면 inventory drift로 본다.

## 출력

- 변경한 E2E/integration test 파일 목록
- Playwright 실행 결과
- 발견한 data-loss 또는 stale-refresh 위험
