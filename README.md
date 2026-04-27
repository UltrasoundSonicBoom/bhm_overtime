# SNUH Mate

서울대학교병원 노동조합 직원용 급여·시간외·휴가·근무이력·규정 PWA.

## Brand & Naming

**Brand**: SNUH Mate.

Internal/legacy strings include `bhm_*` prefix (보라매병원 시절 흔적). 이는 user-facing copy 에 절대 노출되지 않으며, localStorage 키는 v1.x → v2.x 에서 lazy migration 으로 자동 `snuhmate_*` 로 전환됨.

마이그레이션 정책: `docs/superpowers/specs/2026-04-27-data-lifecycle-policy.md` 참고.

## Features

- 통상임금 + 시간외 수당 자동 계산 (단협 기준)
- 명세서 업로드 (PDF/Excel) → 자동 파싱 + 프로필 시드
- 근무이력 자동 시드 (명세서 시계열 기반)
- 휴가 / 연차 자동 산출
- 규정 페이지 (Q&A + handbook)
- 퇴직금 시뮬레이터
- 데이터 백업/복원 (v1.0 + v2.0 양쪽 지원)

## Tech

- Vanilla JS ESM + Vite + Vitest + Playwright + ESLint v9
- localStorage 단일 데이터 소스 (Phase 6 에서 Firebase Auth/Firestore 도입 예정)
- PWA (Service Worker + manifest)
- Vercel 배포

## Roadmap

- Phase 5 (완료): cross-module ESM 명시 import + ESLint no-undef strict + 데이터 lifecycle 정책
- Phase 5-followup (진행 중): 디자인 토큰 분리 + 브랜드/네이밍 위생
- Phase 6 (예정): TurboRepo + Astro file-based routing + TypeScript gradual
- Phase 7 (예정): Tailwind 디자인 시스템

## Scripts

```bash
npm run dev              # Vite dev server
npm run build            # 프로덕션 빌드 → dist/
npm run preview          # 빌드 결과 로컬 서빙

npm run test:unit        # Vitest 단위 테스트
npm run test:integration # 통합 테스트 (jsdom)
npm run test:smoke       # Playwright e2e
npm run lint             # ESLint no-undef strict
npm run check:regulation # 단협 규정 link 검증
npm run check:paytable   # 호봉표 drift 검증
```

## License

ISC
