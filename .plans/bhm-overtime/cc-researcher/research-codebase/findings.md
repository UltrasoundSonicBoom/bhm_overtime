# T0a: 코드베이스 종합 탐색 — Findings

> Source: cc-researcher
> Date: 2026-04-17
> Status: complete

---

## [ARCHITECTURE] 2-1. 아키텍처 분석

### 시스템 개요

SNUH Mate (BHM Overtime)은 서울대병원 간호사용 초과근무 수당 계산 웹앱.
배포: Vercel (projectId: prj_YTPwrqMVAmjUGEEc4g0S7UDyMInJ) + snuhmate.com

### 디렉토리 구조

루트 디렉토리에 70개+ 파일이 직접 위치 (빌드 없는 정적 서빙 구조):
- index.html (2453줄) — 메인 앱
- onboarding.html (1507줄) — 랜딩
- app.js (3554줄) — 핵심 앱 로직
- style.css (6221줄) — 전역 스타일
- server/ — Hono 백엔드 API
- admin/ — 운영 Admin UI (정적 HTML+JS)

### 주요 컴포넌트 역할

- index.html + app.js: 메인 SPA. 탭 기반 (홈/시간외/급여/휴가/프로필/설정)
- server/ (Hono): REST API — Chat(RAG), Admin CRUD, Data, Calendar, Teams
- googleDriveStore.js: 사용자 PII를 Google Drive AppData에 저장 (Supabase 아님)
- supabaseClient.js: 익명 텔레메트리만 수신. PII 없음
- admin/: 운영자용 콘텐츠 관리 UI

### 데이터 흐름

사용자 → 브라우저 → LocalStorage (기기)
                  → Google Drive AppData (개인 데이터 백업)
                  → /api/* (Hono Server) → PostgreSQL (Supabase)
                                         → OpenAI API (RAG/Chat)
                  → Supabase anon key (텔레메트리만)

핵심: 개인 데이터(근무/급여/프로필)는 Google Drive에 저장. Supabase는 익명 통계만.

---

## [ARCHITECTURE] 2-2. 기술 스택

프론트엔드: Vanilla JS (프레임워크 없음), HTML5/CSS3, Google Identity Services (GIS)
백엔드: Hono (TS), Drizzle ORM, PostgreSQL (Supabase 호스팅), OpenAI gpt-4o-mini
배포: Vercel (정적 파일 + API serverless routes via /api/ 폴더)
외부 서비스: Supabase, Google Drive/Calendar API, OpenAI, 공공데이터포털, GA, Channel.io, Tally.so

---

## [SECURITY] 2-3. 보안 상태

### CRITICAL

**SEC-01: server/.env — 실제 자격증명 평문 저장**
- 위치: /server/.env
- 내용: DATABASE_URL (비밀번호 포함), OPENAI_API_KEY (실제 키)
- .gitignore로 추적 제외됨. 하지만 실수 커밋 시 즉시 DB + OpenAI 노출

**SEC-02: root .env — 고위험 자격증명 집중**
- 위치: /.env
- 내용: SUPABASE_PAT (프로젝트 전체 제어), SUPABASE_DB_PASSWORD, GOOGLE_CLIENT_SECRET
- PAT 노출 시 Supabase 프로젝트 전체 제어 가능

**SEC-03: SUPABASE_JWT_SECRET 미설정 → JWT 서명 미검증 (가장 긴급)**
- 위치: /server/src/middleware/auth.ts L9-11
- server/.env에 SUPABASE_JWT_SECRET 없음
- requireAdmin 미들웨어가 서명을 검증하지 않고 base64 디코딩만 수행
- 공격자가 임의 JWT payload를 base64 인코딩하여 admin 우회 가능
- 코드: auth.ts L31-41 (개발환경 fallback 경로)

### HIGH

**SEC-04: CORS origin '*' — 모든 출처 허용**
- 위치: /server/src/index.ts L19-23
- cors({ origin: '*' }) 설정
- 악성 사이트에서 Admin API 포함 모든 엔드포인트에 CORS 요청 가능

**SEC-05: notice.md/CHANGELOG 내용이 escapeHtml 없이 innerHTML 삽입**
- 위치: /app.js L221 (renderNoticePager)
- content.innerHTML = items[_noticeIdx] — escapeHtml 미적용
- notice.md는 개발자만 수정 가능하므로 외부 공격보다 내부 위협 시나리오

**SEC-06: 챗봇 메시지 길이 제한 없음 (프롬프트 인젝션 위험)**
- 위치: /server/src/routes/chat.ts L35
- message.trim() 체크만 있고 maxLength 없음
- 긴 프롬프트로 컨텍스트 오염 + OpenAI 과금 증폭 가능

### MEDIUM

**SEC-07: 공공 API 키 하드코딩**
- 위치: /holidays.js L9
- 공공데이터포털 API 키 (낮은 위험)

**SEC-08: admin/ URL 서버 접근 제어 없음**
- robots.txt에서 /admin/ 차단하나 서버 수준 보호 없음
- 但 API는 requireAdmin 미들웨어로 보호됨

### 양호

- CSP 설정됨 (unsafe-eval 최근 제거, object-src none)
- SQL Injection: Drizzle ORM + parameterized query
- Supabase RLS 활성화 (overtime_records, profiles 등)
- escapeHtml 함수 존재 (app.js L7-15)
- Access Token 메모리 보관 (localStorage 아님)
- PIN/WebAuthn AppLock 구현

---

## [ARCHITECTURE] 2-4. 기술 부채

800줄 이상 파일:
- style.css: 6221줄
- app.js: 3554줄 (진행 중 리팩토링)
- index.html: 2453줄
- regulation.js: 1641줄
- salary-parser.js: 1372줄
- payroll.js: 1242줄

주요 부채:
1. data.js 정적 데이터 — 규정/수당이 JS에 하드코딩. DB 마이그레이션 진행 중
2. Vanilla JS 전역 변수 의존 (window.OVERTIME, window.PROFILE 등)
3. serverless rate limit (chat.ts) — 메모리 Map 기반, 인스턴스 간 공유 안 됨

---

## [ARCHITECTURE] 2-5. 배포 구성

- Vercel 정적 파일 서빙 + /api/ serverless routes
- 환경변수: 로컬 = server/.env, 프로덕션 = Vercel 대시보드 (추정)
- vercel.json 없음 → 보안 헤더 (HSTS, X-Frame-Options) 미설정
- SUPABASE_JWT_SECRET 프로덕션 환경변수 여부 확인 필요

---

## 보안 이슈 우선순위

| 순위 | ID | 심각도 | 제목 |
|------|-----|--------|------|
| 1 | SEC-03 | CRITICAL | JWT 서명 미검증 |
| 2 | SEC-01 | CRITICAL | server/.env 실제 자격증명 |
| 3 | SEC-02 | CRITICAL | root .env PAT + Google Secret |
| 4 | SEC-04 | HIGH | CORS origin '*' |
| 5 | SEC-05 | HIGH | notice.md 비검증 innerHTML |
| 6 | SEC-06 | HIGH | 챗봇 메시지 길이 제한 없음 |
| 7 | SEC-08 | MEDIUM | admin/ URL 접근 제어 |
| 8 | SEC-07 | MEDIUM | 공공 API 키 하드코딩 |
