# SNUH Mate

서울대학교병원 직원용 급여, 시간외, 휴가, 근무이력, 규정, 근무표 운영 도구입니다.

현재 코드는 과거 `bhm_overtime` 정적 앱에서 출발했지만, 2026-04-30 기준으로는 `apps/web` Astro 앱, workspace 패키지, Firebase 동기화 계층, 로컬 근무표 파싱 백엔드, 운영/팀 스케줄 실험 화면이 함께 있는 monorepo입니다.

## 현재 상태

- 공개 앱: Astro static app, Vercel 배포 대상은 `apps/web/dist`
- 메인 사용자 화면: `/app/`
- 온보딩: `/`
- 규정/챗봇 탭: `/app/` 내부 ReferenceIsland, 독립 규정 페이지는 `/regulation/`
- 퇴직금/공로연수 분석: `/retirement/`
- 근무표/팀 운영 실험: `/schedule_suite/`, `/dashboard/`, `/nurse_admin/*.html`
- 디자인 시스템: `/design-system/` 및 하위 토큰/컴포넌트/패턴/가이드 페이지
- 관리자 리뷰 큐: `/admin/parser-reviews/`, 로컬 FastAPI 백엔드가 켜져 있을 때 사용

## 핵심 기능

- 급여명세서 PDF/Excel 업로드, 파싱, 프로필 시드
- 통상임금, 시간외, 온콜, 휴일/야간 수당 계산
- 휴가, 연차, 근무이력 관리
- 단체협약/취업규칙/병원 가이드 기반 규정 조회
- 퇴직금, 공로연수, 중간정산 시나리오 분석
- Excel/CSV/iCal/PDF/image 근무표 파싱
- Firebase Auth 기반 선택적 다기기 동기화
- Firestore sync 모듈, 암호화 대상 필드, 마이그레이션 다이얼로그
- SNUH Mate 디자인 시스템 컴포넌트와 토큰

## 구조

```text
apps/web/                 Astro 앱, 실제 배포 산출물
apps/web/src/client/      브라우저 앱 로직
apps/web/src/firebase/    Firebase Auth, Firestore sync, migration, crypto
apps/web/src/components/  Astro islands, UI components, layout, patterns
apps/web/public/          정적 asset, admin, nurse_admin, chrome-extension mirror
packages/                 calculators, data, profile, shared utilities
backend/                  FastAPI 근무표 파싱/캐시/코퍼스 로컬 백엔드
public/                   legacy/static mirror. apps/web/public과 동기화 대상
chrome-extension/         Chrome extension source
docs/                     architecture, design-system, phase specs/plans
tests/                    unit, integration, Playwright smoke
archive/                  폐기/보존된 이전 구조와 실험
```

`server/`에는 현재 Python LM Studio gateway 파일만 남아 있습니다. 예전 `server/src` Hono/Drizzle/Supabase API 구조는 현재 런타임 기준이 아니며, Supabase 백엔드 업그레이드 흔적은 `archive/backend-upgrade-supabase/`에 보존되어 있습니다.

## 데이터 경계

- 게스트 사용자는 localStorage만으로 동작합니다.
- 로그인 사용자는 Firebase Auth + Firestore로 선택적 동기화를 사용합니다.
- `localStorage`는 여전히 오프라인 우선 UX의 기준 저장소입니다. Firestore는 로그인 사용자용 cloud hydrate/write-through 계층입니다.
- 급여, 프로필, 근무이력 등 민감 데이터는 sync 모듈에서 경계를 나눕니다.
- 근무표 파싱은 Excel/CSV/iCal은 브라우저 결정론 파서가 우선입니다.
- PDF/image Vision 파싱은 로컬 LM Studio 또는 명시된 키 기반 fallback만 사용합니다.

## 실행

```bash
pnpm install
pnpm dev
```

기본 개발 서버는 `apps/web`의 Astro dev server입니다.

자주 쓰는 명령:

```bash
pnpm build              # apps/web Astro build
pnpm preview            # apps/web Astro preview
pnpm check              # Astro check
pnpm test:unit          # unit tests
pnpm test:integration   # integration tests
pnpm test:smoke         # Playwright smoke
pnpm lint               # ESLint
pnpm check:regulation   # 단협 원문 링크/값 검증
pnpm check:paytable     # 호봉표 drift 검증
```

## 로컬 백엔드

근무표 PDF/image 파싱 리뷰 큐와 캐시 검증은 `backend/`의 FastAPI 서비스를 사용합니다.

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

또는 루트에서:

```bash
pnpm backend:dev
pnpm backend:test
```

주요 endpoint:

- `GET /health`
- `POST /parse/excel`
- `POST /parse/csv`
- `GET /cache/get`
- `POST /cache/put`
- `POST /corpus/submit`
- `GET /admin/reviews`

## 제품 방향

현재 가까운 제품 방향은 개인용 급여/근태 PWA에 더해 Team Plan을 붙이는 것입니다. 1차 demo scope는 101 병동과 Angio처럼 운영 규칙이 다른 두 팀을 기준으로 잡습니다.

Team Plan에서 중요한 경계:

- 로그인 identity와 직원/팀원 business identity는 분리
- 개인 급여/명세서 데이터와 팀 근무표 데이터는 분리
- 외부 AI/solver에 병원 실데이터를 기본 전송하지 않음
- MVP 가치는 완전 자동 생성보다 import, 검증, 조정, 배포, 교대요청, 승인

관련 문서:

- `SPEC.md`
- `docs/superpowers/specs/2026-04-29-nurse-schedule-rule-workflow-prd.md`
- `docs/superpowers/specs/2026-04-29-phase8-firebase-auth.md`
- `docs/design-system/usage.md`

## 문서 상태

이 README는 2026-04-30 현재 파일 구조와 런타임 기준으로 갱신되었습니다. 오래된 Hono/Drizzle/Supabase Admin Platform 문맥은 현재 기준 SPEC에서 제거했습니다.

## License

ISC
