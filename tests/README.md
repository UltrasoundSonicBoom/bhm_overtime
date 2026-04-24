# Tests

자동화된 회귀 방지 스위트. 리팩토링 전후 `npm test`로 무결성 확인.

## 구성

```
tests/
├── unit/                       # Vitest 단위 테스트 (빠른 로직 회귀)
│   ├── calculators.test.js     # CALC 순수 함수 — 시간외/연차/가족수당/퇴직금 (21)
│   └── calc-registry.test.js   # Plan E: data/calc-registry.json ↔ DATA drift-check (43 + 7 skip)
└── e2e/                        # Playwright 구조 스모크
    └── smoke.spec.js           # 8 메인 탭 + 4 payroll 서브탭 + 콘솔 에러 (3)
```

## 실행

최초 셋업:

```bash
npm install
npx playwright install chromium  # 브라우저 바이너리 1회 설치
```

평상시:

```bash
npm test                 # 단위 + 스모크 순차 실행
npm run test:unit        # Vitest 단독 (<1s)
npm run test:smoke       # Playwright 단독 (~5s, 로컬 서버 자동 기동)
npm run test:unit:watch  # 개발 중 watch 모드
```

## 새 테스트 추가

### 단위 (Vitest)
- `tests/unit/<파일명>.test.js`
- `CALC.*` 순수 함수 위주. DATA 의존은 `globalThis.DATA = DATA;` 먼저 세팅.
- **Registry drift**: 신규 DATA 값·계산 함수·CALC 참조 추가 시 `data/calc-registry.json` 에도 항목 추가 필요 (`docs/architecture/README.md` 참조).

### e2e (Playwright)
- `tests/e2e/<파일명>.spec.js`
- 로컬 서버 URL은 `baseURL` 기반 상대 경로 사용 (`playwright.config.js` 참조).

## 알려진 제외 사항

- `data.js:659` 의 `localhost:3001` CSP 경고는 개발 백엔드 부재가 원인 — 테스트에서 `IGNORED_ERROR_PATTERNS` 로 필터링.
