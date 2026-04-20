# BHM Overtime — 작업 체크리스트

> 상세 플랜: [tasks/plan-regulation-unification.md](plan-regulation-unification.md)
> **v1.5 업데이트 (2026-04-20)**: RAG v2 재구축 트랙 추가 (상세: [tasks/plan.md](plan.md)).
> **v1.4 업데이트 (2026-04-14)**: App Lock 트랙 추가. 런칭 게이트(G3/G5) 병행 작업.

---

## 🧠 RAG v2 재구축 트랙 — 2026-04-20

> 상세 플랜: [tasks/plan.md](plan.md)
> 원칙: FAQ/card-news API 는 옵션A(410 Gone) 로 중단, Chat RAG 만 원문 기반 재구축.
> 소스: `data/regulations_full_v2026.md` + `data/union_regulation_2026.json` (이 둘만 사용).
> 스택: Vercel (serverless) + Neon pgvector + Vercel AI SDK + OpenAI embeddings.

### Track 1 — UI 접점 제거 (API 라우트는 유지)

> **중요**: `/api/faq/*`, `/api/card-news/*` **백엔드 라우트는 변경하지 않음**.
> 사용자 UI 에서 해당 기능으로의 진입만 모두 끊는다. 데이터/응답/cron 그대로.

- [ ] **T1.1** 홈/네비에서 FAQ · 카드뉴스 진입점 숨김
  - [ ] `index.html` 홈 그리드에서 "카드뉴스" · "FAQ" 타일 제거 또는 숨김
  - [ ] `shared-layout.js` 네비/햄버거 메뉴에 해당 링크 제거
  - [ ] `cardnews.html` 직접 접근 시 "서비스 일시 중단" 안내 (또는 홈으로 리다이렉트)
  - [ ] `regulation.html` 의 잔여 "물어보기" 탭 흔적 완전 제거 (regulation.html:1162 주석 확인)
  - [ ] `server/src/routes/faq.ts`, `cardNews.ts` **수정 금지** (백엔드 무변경)
  - [ ] `?v=` 번프 규칙 준수 (수정한 번들의 `index.html` `<script src>` 버전 증가)

#### ◆ Checkpoint C1 — UI 접점 제거 완료
- [ ] `curl -i /api/faq` 및 `/api/card-news` → **여전히 200** (백엔드 무변경 확인)
- [ ] 배포 후 홈/네비에서 카드뉴스·FAQ 타일 안 보임
- [ ] `cardnews.html` 직접 접근 시 안내 확인
- [ ] Sentry 에러 변화 없음 (24h)

---

### Track 2 — 신규 RAG 챗봇 (핵심)

#### Phase A — 데이터 파이프라인

- [ ] **T2.1** 소스 파일 정리
  - [ ] `~/Downloads/regulations_full_v2026.md` → `data/regulations_full_v2026.md` 이동
  - [ ] `data/union_regulation_2026.json` 그대로 사용
  - [ ] MD `##`/`###` 섹션 수 vs JSON `id` 개수 비교 → 커버리지 갭 메모

- [ ] **T2.2** 신규 DB 스키마 `rag_chunks_v2`
  - [ ] `server/drizzle/0006_rag_chunks_v2.sql` 작성 (vector(1536), HNSW index)
  - [ ] `server/src/db/schema.ts` 에 `ragChunksV2` 테이블 정의 추가
  - [ ] `npm run db:generate` + `db:apply` 성공
  - [ ] Neon 에서 `\d rag_chunks_v2` 로 확인

- [ ] **T2.3** Ingest 스크립트 `ingest-rag-v2.ts`
  - [ ] 의존성 추가: `@langchain/textsplitters`
  - [ ] JSON 로더: 각 조항(title+content+clauses 합침) → 1 chunk (조항 단위 유지)
  - [ ] MD 로더: `##`/`###` 분할 → 1200자 초과 시 RecursiveCharacterTextSplitter (chunkSize=800, overlap=120)
  - [ ] OpenAI 배치 임베딩 (100개씩)
  - [ ] `--dry-run` 플래그 지원 (chunk preview + token 추정)
  - [ ] `--write` 실행 시 replay 가능 (같은 `doc_id` 는 DELETE → INSERT)
  - [ ] `package.json` 스크립트 `rag:v2:ingest` 추가

#### ◆ Checkpoint C2 — Ingest 검증
- [ ] `npx tsx server/scripts/ingest-rag-v2.ts --dry-run` → chunk ≥ 50개 미리보기
- [ ] `npx tsx server/scripts/ingest-rag-v2.ts --write` → `SELECT count(*)` ≥ 50
- [ ] 수동 SQL: "연차 유급휴가" 임베딩 검색 top-3 에 `art_36_*` 또는 `제36조` 섹션 포함

#### Phase B — API 레이어

- [ ] **T2.4** `/api/rag/chat` 엔드포인트 (streaming)
  - [ ] 의존성 추가: `ai`, `@ai-sdk/openai`
  - [ ] RAG 모듈 생성: `server/src/services/rag/`
    - [ ] `chunker.ts` — RecursiveCharacterTextSplitter 래퍼
    - [ ] `embedder.ts` — OpenAI embedding
    - [ ] `store.ts` — pgvector insert/search SQL
    - [ ] `retriever.ts` — top-k + rerank
    - [ ] `generator.ts` — `streamText` 호출
    - [ ] `index.ts` — entry
  - [ ] `server/src/routes/ragChat.ts` — POST 핸들러
  - [ ] `api/rag/chat.ts` — Vercel 함수 진입점 (기존 `_shared.ts` 패턴)
  - [ ] `chat_history` 에 질문/답변 저장 (또는 `rag_chat_history_v2` 신설)
  - [ ] 시스템 프롬프트: "컨텍스트 외 정보 생성 금지, 조항 번호 필수 포함, 수치 원문 유지"
  - [ ] 응답 마지막 frame 에 `sources[]` (doc_id, article_title, score) 포함
  - [ ] Rate limit 재사용 (세션당 분당 20건)

#### ◆ Checkpoint C3 — API 검증
- [ ] `curl -N -X POST /api/rag/chat -d '{"question":"연차 며칠이야"}'` → 스트리밍 응답
- [ ] 답변에 "제36조" 포함
- [ ] "대표이사 전화번호?" → "확인되지 않습니다"
- [ ] 응답 속도: 첫 토큰 < 2초 (Vercel 타임아웃 안전)

#### Phase C — UI

- [ ] **T2.5** 조항 카드 액션박스에 "AI 질문" 버튼 + 채팅 바텀시트
  - **원칙**: 현재 `regulation.html` UIUX 그대로. 조항 카드의 PDF/전화/이메일 옆에 **네 번째 버튼만 추가**.
  - [ ] `regulation.js:620-626` `reg-action-grid-3` 블록:
    - [ ] 주석 처리된 `askAboutArticle` 버튼(L624-625) 해제 및 활성
    - [ ] grid 클래스 `reg-action-grid-3` → `reg-action-grid-4` 로 변경
    - [ ] 기존 PDF/전화/이메일 버튼 모양·동작·간격 **무변경**
  - [ ] `regulation.html` CSS 에 `reg-action-grid-4` 대응 스타일 추가 (기존 `reg-action-grid-3` 유지)
  - [ ] `askAboutArticle(title)` 함수 시그니처 확장 → `(title, articleRef, content)` — 조항 번호·요약 모달에 전달
  - [ ] `regulation_v2.html` / `regulation_v2.md` 는 **예제이므로 손대지 않음**
  - [ ] `chat-ui.js` 신규 모듈 (독립 / 재사용 가능)
    - [ ] bottom-sheet modal (~80vh)
    - [ ] 헤더: "📜 {articleRef} ({title}) 에 대해 질문하기"
    - [ ] 첫 질문에 조항 컨텍스트 자동 포함 (`articleHint` 필드로 API 에 전달)
    - [ ] 스트리밍 토큰 실시간 렌더 (`ReadableStream` 파싱)
    - [ ] 출처 chip 클릭 시 sheet 닫고 해당 조항 카드로 스크롤
    - [ ] 에러 상태 UI (429 / 500 / 네트워크)
    - [ ] 모바일 375px 우선
    - [ ] 외부에서 호출 가능한 `window.AskChatUI.open({title, articleRef, content})`
  - [ ] `?v=` 번프 규칙 준수 + `index.html`/`regulation.html` 의 `<script src>` 버전 업데이트
  - [ ] **홈 화면에 별도 AI 진입점 추가하지 않음** (조항 카드 버튼 경로만 사용)

#### ◆ Checkpoint C4 — E2E 검증
- [ ] Playwright 시나리오: 규정 탭 → 조항 카드 "AI 질문" 클릭 → 모달 열림 → 질문 입력 → 토큰 실시간 렌더 → 출처 chip 표시
- [ ] 모바일 뷰포트(375px) 레이아웃 정상
- [ ] 사용자 1명이 30초 안에 답변 받는 경험

#### Phase D — 품질 / 문서화

- [ ] **T2.6** 품질 평가
  - [ ] `tests/rag-v2-golden.json` — 10개 대표 질문 + 기대 조항 번호
    - 연차, 상여금, 청원휴가, 야간수당, 육아휴직, 퇴직금, 복지포인트, 건강검진, 장애인수당, 환경직 처우
  - [ ] `server/scripts/verify-rag-v2.ts` — 자동 평가 + 점수 리포트
  - [ ] `package.json` 스크립트 `rag:v2:verify` 추가
  - [ ] 통과 기준: 10문제 중 8개 이상 기대 조항 번호 포함

- [ ] **T2.7** 재사용 템플릿 문서화
  - [ ] `docs/rag-starter-kit.md` — 5개 모듈 설명 + 환경변수 + 복사 가이드
  - [ ] 비용 추정 섹션 (임베딩 1회 + 월 1000 쿼리)
  - [ ] 다른 프로젝트로 복사하는 체크리스트 (≤ 6단계)

#### ◆ Checkpoint C5 — 런칭 및 재사용성
- [ ] `CHANGELOG.md` 에 "2026-04-20 RAG v2 교체" 추가
- [ ] `CLAUDE.md` 변경 이력 테이블에 한 줄 추가
- [ ] 문서 따라 빈 Vercel 프로젝트에서 30분 내 챗봇 기동 가능 확인

---



## 🔒 App Lock 트랙 — PIN / 생체인증 (런칭 전 선택적)

> 상세 플랜: [tasks/plan-app-lock.md](plan-app-lock.md)  
> 목적: G5 First-run 경험 + G3 민감 데이터 보호 신호 강화

### Phase 1: 핵심 잠금 모듈

- [x] **L1** `appLock.js` 신규 파일 — PIN setup/verify/lockout 핵심 로직
  - [x] `AppLock.setupPin(pin)` — SHA-256(pin+salt), bhm_settings 저장
  - [x] `AppLock.verifyPin(pin)` — 검증 + 5회 실패 → lockUntil 설정
  - [x] `AppLock.isLocked()` / `AppLock.unlock()` / `AppLock.disablePin()`
- [x] **L2** FOUC 방지 인라인 스크립트 + 잠금 오버레이 렌더링
  - [x] `index.html` `<head>` 인라인: pinEnabled → body visibility:hidden
  - [x] `shared-layout.js` AppLock.checkAndPrompt() 훅
  - [x] 오버레이 스타일 — appLock.js 인라인 CSS (style.css 불필요)

#### Checkpoint 1
- [x] 단위 테스트 6개 PASS (setupPin, verifyPin, changePin, disablePin, lockout, biometric)
- [x] PIN 설정 → 새로고침 → 잠금 오버레이 표시 확인 (Playwright 검증 완료)
- [x] FOUC 없음 육안 확인 (Playwright 스크린샷 확인 완료)

### Phase 2: 설정 UI + PIN 재설정

- [x] **L3** 프로필 탭 "앱 잠금" 설정 카드
  - [x] PIN 미설정 → "PIN 설정하기" 버튼
  - [x] PIN 설정 → "켜짐" 뱃지 + 변경/해제 버튼
  - [x] PIN 설정 모달 (숫자 키패드, 4-6자리, 확인 재입력)
- [x] **L4** PIN 분실 → Google 재인증 재설정 경로
  - [x] 잠금 오버레이 "PIN을 잊으셨나요?" 링크
  - [x] OAuth 성공 → 기존 PIN 삭제 + 새 PIN 설정 모달

#### Checkpoint 2
- [x] 단위 테스트 PASS (changePin, lockout 재확인)
- [x] 브라우저에서 전체 흐름 확인 (Playwright: PIN 입력→해제, 5회 실패→카운트다운, changePin, disablePin)
- [x] **L1-L4 자동화 검증 51 PASS / 0 FAIL** (tests/applock-l1-l4.js, 2026-04-14)

### Phase 3: 생체인증 + 넛지 + Drive 연동

- [x] **L5** 생체인증 (WebAuthn) 등록/인증 UI
  - [x] `AppLock.BiometricLock.register()` / `.authenticate()`
  - [x] 잠금 오버레이 "Face ID / 지문으로 열기" 버튼
  - [x] 생체인증 취소 → PIN 화면 자동 전환
  - [ ] 실기기(iOS Safari / Android Chrome) 수동 테스트 필요
- [x] **L6** Google 로그인 직후 PIN 설정 넛지 바텀시트
  - [x] 로그인 성공 후 → 넛지 모달 (1회, dismissible)
  - [x] "설정할게요" → PIN 설정 즉시 / "나중에" → pinNudgeDismissed:true
- [x] **L7** PIN 설정을 Google Drive에 백업
  - [x] `syncManager.js` `_pushAppLock()` / `_pullAppLock()` 추가 (PIN 필드만 분리)
  - [x] `syncManager.js` `fullSync()` 에 `_pullAppLock()` 병렬 실행
  - [x] `syncManager.js` 공개 API에 `pushAppLockSettings` 노출
  - [x] `appLock.js` setupPin/disablePin 에서 Drive push 트리거

#### Checkpoint 3 (완성)
- [x] 단위 테스트 PASS (L7 포함)
- [x] 넛지 바텀시트 코드 검증 완료 (index.html 코드 확인)
- [x] regulation.html / cardnews.html 타 페이지 잠금 동작 확인 (Playwright 검증)
- [ ] 첫 설치 → Google 로그인 → 넛지 → PIN 설정 → 잠금 전체 흐름 (실기기 수동 권장)
- [ ] Drive 복원 후 PIN 설정 유지 확인 (Google 계정 필요, 실기기 수동)
- [ ] 생체인증 (iOS Safari / Android Chrome 실기기 수동)

---

## 🎯 온보딩 퍼널 트랙 — 개인정보 → 시간외 전환율 개선

> 상세 플랜: [tasks/plan-app-lock.md](plan-app-lock.md) (Track 2 섹션)  
> 목표: 전환율 7% → 30% | 사전 조건: **관찰 세션 1회 먼저**
> Source: /office-hours 세션 2026-04-14, Status: APPROVED

- [ ] **관찰 세션** — 실제 사용자 옆에서 막히는 지점 1곳 확인 (구현 전 필수, 코드 검증용)
- [x] **F1** `saveProfile()` 성공 직후 CTA 카드 표시 (기존 구현 확인됨)
  - [x] `index.html` `profileSavedCTA` div 존재 (line 1590)
  - [x] `app.js` saveProfile(): 직종별 문구 분기 (간호직/보건직/사무직/기타) 구현됨
  - [x] `app.js` switchTab(): CTA 숨김 구현됨 (line 333)
- [x] **F2** 시간외 탭 "시급 0원" 경고 배너 (기존 구현 확인됨)
  - [x] `otHourlyWarning` 배너 + "👤 개인정보 입력하기 →" 버튼 존재 (line 1113)
- [x] **F3** 홈 화면 프로필 미완성 힌트 (기존 구현 확인됨)
  - [x] `homeProfileNudge` div 존재 (line 317)
  - [x] `app.js` initHomeTab(): jobType 없으면 표시 (line 88)
  - [x] `app.js` saveProfile(): 힌트 숨김 (line 845)

#### 퍼널 체크포인트
- [x] F1: saveProfile CTA + 직종별 문구 분기 코드 확인 완료
- [x] F2: 시간외 경고 배너 + 이동 버튼 코드 확인 완료
- [x] F3: 홈 힌트 표시/숨김 코드 확인 완료
- [ ] 관찰 세션 후 실제 전환율 측정 (30일 GA 비교)

---

## 🔵 Phase 0: 런칭 게이트 잔여 (LAUNCH.md 기준)

- [x] **G3** 데이터 복구 UX — orphan 복구 메뉴 + beforeunload flush (LAUNCH.md 확인)
- [ ] **G4** 법무 체크 — 상표/도메인 메일 (선택사항), OAuth 승인 완료 ✅
- [x] **G5** First-run — #googlePermissionDialog 권한 설명 모달 (LAUNCH.md 확인)
- [ ] **G6** 관측 대시보드 — supabase_launch_views.sql Supabase Studio 실행 필요
- [x] **G8** 공유 루프 — "🔗 동료에게 공유하기" 버튼 (Web Share API → 클립보드 → 텍스트 폴백)

---

> **v1.3 업데이트 (2026-04-12)**: Phase 0-5 완료. Phase 6-10 실행 순서: 6 → 7 → 9 → 8 → 10

---

## ✅ Phase 0-5 완료 (2026-04-12, 106 PASS / 0 FAIL)

| Phase | 테스트 | 결과 |
|-------|--------|------|
| Phase 0: 전수 감사 | tests/phase0-audit.js (20) | ✅ PASS |
| Phase 1: regulation-constants.js | tests/phase1-constants.js (28) | ✅ PASS |
| Phase 2: 버그 수정 6종 | tests/phase2-bugfix.js (14) | ✅ PASS |
| Phase 3: 회귀 검증 | tests/calc-regression.js (31) | ✅ PASS |
| Phase 4: 표시 일관성 | tests/phase4-display.js (5) | ✅ PASS |
| Phase 5: 데드코드 정리 | tests/phase5-cleanup.js (8) | ✅ PASS |

생성 파일: `regulation-constants.js`, `docs/regulation-audit-2026.md`, `docs/bugfix-impact-2026.md`, `data/archive/PayrollEngine.legacy.js`

---

## 🔵 Phase 6: Union Regulation Admin UI — **실행 1순위 (독립)**

> 테스트: `tests/phase6-admin-ui.js` | 파일: `admin/union_regulation_admin.html`

- [x] **R11-a** `admin/union_regulation_admin.html` 골격 + 상수 목록 테이블 렌더링
  - [x] `regulation-constants.js` script 태그 로드 → 조항/키/값 테이블 표시
- [x] **R11-b** `nurse_regulation.json` 동기화 상태 비교 패널
  - [x] fetch로 nurse_regulation.json 로드 → 불일치 항목 🔴 표시
- [x] **R11-c** 인라인 편집 + 변경 내용 클립보드 복사 (DB 연결 전 개발자 전달용)
- [x] **R12** `nurse_regulation.json` BUG-N-01 수정 (야간 2.0 / 휴일 1.5 분리)
  - [x] `night_22_to_06: 2.0`, `holiday_within_8h: 1.5`, `holiday_over_8h: 2.0`

### Phase 6 체크포인트
- [x] `admin/union_regulation_admin.html` 브라우저에서 열리고 31개+ 상수 목록 표시
- [x] nurse_regulation.json 불일치 항목 시각 경고 확인
- [x] phase6-admin-ui.js PASS (14 PASS / 0 FAIL, 2026-04-14)

---

## ✅ 이미 완료된 항목 (2026-04-10 체크포인트 기준)

> 새로 구현할 필요 없음

- [x] **Track A**: RAG 완료 (145 chunks + 145 embeddings, FAQ 50개 임베딩)
- [x] **Track B**: Admin & Content API 완료 (`adminOps.ts` — draft/review/published 워크플로우)
- [x] **ops-orchestrator 에이전트**: 자연어 → 운영팀 라우팅 에이전트 구현 완료
- [x] **admin/index.html**: 버전/FAQ/시나리오 관리 UI 기존 구현

---

## 🔵 Phase 7: 역계산 검증 시스템 — **실행 2순위 (독립, Phase 8 선행 필수)**

> 테스트: `tests/phase7-verify.js` | 수정: `calculators.js` + `app.js`

- [x] **R13** `CALC.verifyPayslip(parsedData, calcResult, {tolerance})` 구현
  - [x] 시그니처: `({items:[{name,amount}], totalGross}, calcResult, {tolerance:0.01})`
  - [x] 항목별 비교: 실제 vs 예상, diffPct, 상태(일치/오차/불일치)
  - [x] 허용오차: Math.abs(diff)/expected ≤ 0.01 또는 ≤ 500원
  - [x] 반환: `{matched, discrepancies:[{item,expected,actual,diffPct}]}`
- [x] **R14** 역계산 검증 UI (app.js 섹션 추가)
  - [x] 항목별 비교 테이블 (일치 ✅ / 오차 🟡 / 불일치 🔴)
  - [x] 불일치 항목에 버그 번호 링크 표시

### Phase 7 체크포인트
- [ ] 실제 명세서 2512/2601 역계산 결과 브라우저 확인 (실 명세서 필요 — 사용자 수동)
- [x] BUG-01(리프레시)/BUG-02(장기근속) 탐지 로직 존재 확인 (코드 검증: discrepancies, tolerance, 항목 매핑)
- [x] phase7-verify.js PASS (23 PASS / 0 FAIL, 2026-04-14)

---

## 🔵 Phase 8: AI 인사이트 엔진 — **실행 4순위 (Phase 7 완료 후)**

> 테스트: `tests/phase8-insight.js` | 신규: `insight-engine.js`

- [x] **R15** `insight-engine.js` 신규 생성
  - [x] `INSIGHT.generateAIReport(payslips)` → `{period, summary, anomalies, trend}`
  - [x] 이상 탐지 규칙: ① 수당 소멸 ② 시간외 급증(>40h) ③ 장기근속 계단 이상
- [x] **R16** 인사이트 대시보드 UI (app.js 또는 신규 dashboard.js)
  - [x] 월별 통상임금 트렌드 차트/테이블
  - [x] 이상 탐지 알림 카드
  - [x] "AI에게 설명하기" JSON 복사 버튼

### Phase 8 체크포인트
- [ ] 3개월 명세서 집계 트렌드 브라우저 표시 (실 명세서 필요 — 사용자 수동)
- [x] AI 리포트 JSON 출력 구조 확인 (코드 검증: JSON.stringify, {period, summary, anomalies, trend} 존재)
- [x] phase8-insight.js PASS (18 PASS / 0 FAIL, 2026-04-14)

---

## 🔵 Phase 9: 간호사 규정 CALC 통합 — **실행 3순위 (독립)**

> 테스트: `tests/phase9-nurse.js` | 수정: `calculators.js`, `content/policies/2026/nurse_regulation.json`

| 항목 | 규정 출처 | 현황 |
|-----|----------|------|
| 프리셉터 수당 (200,000원/2주) | `new_hire_training.preceptor_allowance` | ❌ CALC 없음 |
| 프라임팀 대체 (20,000원/일) | `shift_worker_rules.substitute_work.prime_team_allowance` | ❌ CALC 없음 |
| 리커버리데이 (야간 7회 초과 시 1일) | `shift_worker_rules.recovery_day` | ❌ CALC 없음 |
| 40세 이상 야간 제외 경고 | `shift_worker_rules.age_based_night_exclusion` | ❌ 없음 |
| BUG-N-01 야간/휴일 배율 분리 | 제47조(2.0) / 제34조(1.5) | ❌ 미수정 |

- [x] **R17** `CALC.calcNursePay({preceptorWeeks, primeTeamDays})` 구현 (`calculators.js`)
  - [x] 프리셉터: preceptorWeeks × 100,000
  - [x] 프라임팀: primeTeamDays × 20,000
- [x] **R17-b** `CALC.checkNurseScheduleRules({nightShifts, age, pattern})` 구현
  - [x] 리커버리데이: nightShifts > 7 → recoveryDays = nightShifts - 7
  - [x] 40세+ 야간: age ≥ 40 && nightShifts > 0 → warnings 추가
  - [x] N-OFF-D 패턴 탐지
- [x] **R18** 급여 시뮬레이터에 간호사 전용 입력 추가 (app.js)
- [x] **R19** `nurse_regulation.json` BUG-N-01 수정 → R12에서 완료 (skip)

### Phase 9 체크포인트
- [x] nightShifts=7 → recoveryDays=0 / nightShifts=8 → recoveryDays=1 확인 (코드 검증: `nightShifts > 7 ? nightShifts - 7 : 0`)
- [x] 프리셉터 2주 → 200,000원 확인 (코드 검증: `Math.floor(2/2)*200000`)
- [x] phase9-nurse.js PASS (23 PASS / 0 FAIL, 2026-04-14)

---

## 🔵 Phase 10: 퇴직금 강화 — **실행 5순위**

> 테스트: `tests/phase10-retirement.js` | 수정: `retirement-engine.js`

| 문제 | 현황 |
|-----|------|
| 3개월 평균임금 | 명세서 1개 grossPay만 사용 |
| ARCH-01 DATA 참조 | 하드코딩 SEV_PAY/SEV_MULTI 잔존 |
| 운영기능직 임금피크 보호 | 미구현 (최저임금 120% 기준) |

- [x] **R20** `RetirementEngine.getThreeMonthAverage(payslips)` 구현
  - [x] 반환: `{average, months:3, warning: null|'insufficient_data'|'wage_peak_protection'}`
  - [x] 3개월 미만 데이터 → `warning: 'insufficient_data'`
  - [x] 평균 < 최저임금×209h×1.2 → `warning: 'wage_peak_protection'`
- [x] **R21** ARCH-01 완결: `retirement-engine.js` SEV_PAY/SEV_MULTI 하드코딩 제거 → DATA 참조
  - [x] fallback 유지 (DATA 미존재 시 기존 하드코딩값 사용)
  - [x] 퇴직금 계산 결과 변경 없음 확인 (calc-regression.js 재실행)
- [x] **R22** 운영기능직 임금피크 보호: 2026 최저임금 9,860원 × 209h × 1.2 = 2,472,120원 기준
- [x] **R23** 퇴직금 UI — 평균임금 breakdown 탭 + 명세서 기반 vs 수동입력 비교

### Phase 10 체크포인트
- [x] getThreeMonthAverage() 3개월 평균 정확도 확인 (phase10 18 PASS)
- [x] ARCH-01: SEV_MULTI → `window.DATA.severanceMultipliersPre2001` 참조 추가 완료 (2026-04-15)
- [x] phase10-retirement.js PASS (18 PASS / 0 FAIL, 2026-04-14)

---

## ✅ Phase 42: overtime.js + profile.js (2026-04-15)

| 테스트 | 결과 |
|--------|------|
| Phase 42: overtime + profile | ✅ 71 PASS / 0 FAIL |

- [x] OVERTIME: getUserStorageKey/SyncManager/recordLocalEdit 연동
- [x] 헬퍼: _parseTime(HH:MM→분), _minutesToHours(15분 반올림), _calcCommuteBreakdown(야간 1320~360분)
- [x] CRUD: addRecord/updateRecord/deleteRecord/getMonthRecords/getDateRecords
- [x] calcTimeBreakdown: isWeekend, extended/night/holiday/holidayNight 4분류
- [x] calcEstimatedPay: 150%/200%/8h초과, oncall_standby 대기수당, onCallTransport 교통비
- [x] createRecord: oncall_callout 출퇴근 2h 가산(_calcCommuteBreakdown)
- [x] 통계: calcMonthlyStats(byType 3종), calcYearlyStats(12개월 순회)
- [x] exportData(JSON)/importData(YYYY-MM regex 검증)
- [x] PROFILE: bhm_hr_profile 키, save/load/clear, SyncManager/recordLocalEdit
- [x] parseDate, calcServiceYears, calcFamilyAllowance(numFamily/numChildren)
- [x] calcWage: CALC.calcOrdinaryWage 위임, 2016.02.01 근속가산 기준, weeklyHours fallback 209

---

## ✅ Phase 41: payroll.js (2026-04-15)

| 테스트 | 결과 |
|--------|------|
| Phase 41: payroll.js | ✅ 68 PASS / 0 FAIL |

- [x] PAYROLL 구조: categories 5개(overtime/deduction/leave/career/welfare), cards 배열
- [x] 카드 ID 17개: overtimeCalc, nightShift, oncall, dutyPay, familyAllowance, deductionCalc, unpaidLeave, annualLeave, unusedLeave, parentalLeave, promotionDiff, promotionDate, longService, medicalDiscount, gradeHistory, welfarePoint, selfDevAllowance
- [x] overtimeCalc: 15분 절삭(floor×4/4), 150%/200% 배율, 8h 초과 분기, 209h 통상시급, OVERTIME 자동 불러오기
- [x] oncall: 대기/콜아웃/시간/야간여부 4개 입력
- [x] shouldShow: familyAllowance 조건부 카드
- [x] init(): qaCardsContainer, PROFILE.load/calcWage, 프로필경고, 명세서 비교 배너, shouldShow 필터
- [x] recalc(): DOM 스냅샷 보존→init재호출→값 복원
- [x] 헬퍼: _buildGradeHistory, _getGradeStartDate(promotionDate 우선), _savePromoData, _buildPayslipCompare, _buildResultHTML, _otStep

---

## ✅ Phase 40: cardnews.js (2026-04-15)

| 테스트 | 결과 |
|--------|------|
| Phase 40: cardnews | ✅ 73 PASS / 0 FAIL |

- [x] 상수: DAILY_KEYWORD=의료AI, MAX_CUSTOM_KEYWORDS=3, STORAGE_KEYS 4개
- [x] 유틸리티: escapeHtml, stripHtml(태그제거), truncateText(말줄임표), relativeTime, sortByFreshness, uniqueBy
- [x] 키워드 관리: loadStoredKeywords/persistState/addCustomKeyword/removeCustomKeyword/hasKeyword/normalizeKeywords, MAX_KEYWORDS 제한
- [x] 수집 엔진: fetchGoogleNewsBatch/News, fetchOpenAlexBatch/Alex, selectTopSources, collectItemsForKeyword, fetchJsonWithTimeout
- [x] 중복방지: collectAll requestId 스냅샷, stale 취소, collectDailyAutoItems, DAILY_KEYWORD 항목 유지
- [x] 렌더링: renderCatTabs, renderFeed, createFeedItem(publishedAt/openDetail), setLoading, getActiveTabKeyword
- [x] 설정 패널: openSettings/closeSettings/initSettings/syncSettingsUI/renderCustomChips/getCustomKeywords
- [x] 상세 뷰: openDetail/closeDetail/buildRelatedEl, fetchSummary(SUMMARY_CACHE_KEY/load/save), cdBack
- [x] 자동갱신: shouldAutoRefresh(cadenceHours, lastCollectedAt vs Date.now())
- [x] init(): 자동 호출, state 구조 5개 필드

---

## ✅ Phase 39: payroll-views.js (2026-04-15)

| 테스트 | 결과 |
|--------|------|
| Phase 39: payroll-views | ✅ 71 PASS / 0 FAIL |

- [x] 공개 API: initPayrollTab, renderPayHistory, renderPayPayslip
- [x] 서브탭 라우팅: pay-payslip / pay-calc / pay-qa + dataset.subtab
- [x] buildNetPayCard: netPay/grossPay/miniStat(stat-gross/stat-deduct)
- [x] buildBarChart: maxVal, netPay 기반 막대, CSS 클래스
- [x] buildChangeFactors: salaryItems/deductionItems latest vs prev 비교
- [x] buildStatsRow/buildStatCard: 최솟값/최댓값/평균 계산
- [x] buildDonutChart + buildColorbarLegendItem: pay-colorbar/fill/legend
- [x] buildHBarSection: pay-hbar-row/fill/name/amount/track, up/down 방향
- [x] buildCompareGrid: 지급합계/공제합계/실지급액
- [x] buildTextUploadBtn + handleInlineUpload: PDF accept, SALARY_PARSER 연동 3단계
- [x] buildArchiveList: pay-archive-row, deleteMonthlyData, 수정 버튼
- [x] openEditModal: overlay/modal/item-row/save/cancel/total-row, overwrite=true, editedAt
- [x] buildEmptyState: pay-empty-state, 📭, 조건부 액션 버튼
- [x] aggregation 필터: netPay>0||grossPay>0, reduce 합산, 요약 계산

---

## ✅ Phase 38: salary-parser.js + G5 Google 권한 다이얼로그 (2026-04-15)

| 테스트 | 결과 |
|--------|------|
| Phase 38: salary-parser + G5 | ✅ 75 PASS / 0 FAIL |

- [x] **SALARY_PARSER** 공개 API 12개: parseFile, saveMonthlyData, replaceMonthlyData, loadMonthlyData, deleteMonthlyData, listSavedMonths, parsePeriodYearMonth, applyStableItemsToProfile, compareWithApp, parsePDFText, parseImage
- [x] **SALARY_PATTERNS**: 시간외수당, 야간수당, 기본급, 장기근속수당, 당직비, 군복무수당
- [x] **DEDUCTION_PATTERNS**: 소득세, 건강보험, 국민연금, 고용보험, 노동조합비
- [x] **SUMMARY_PATTERNS**: 총지급액, 공제총액, 실지급액 + parseAmount 쉼표 제거
- [x] 핵심 파싱: extractSummary(grossPay/totalDeduction/netPay), extractEmployeeInfo(사원번호/직종), extractPeriod(년월분)
- [x] analyzeGrid + parseExcel(XLSX) + parseCSV + parsePDF(pdfjsLib) + parseFile 라우터 (ext split)
- [x] localStorage CRUD: saveMonthlyData/loadMonthlyData/deleteMonthlyData/listSavedMonths
- [x] PAYSLIP_TO_PROFILE_MAP: 조정급→adjustPay, 직책수당→positionPay; compareWithApp 통상임금 합계 비교
- [x] **G5** googlePermissionDialog: Drive/Calendar 권한 설명, 연결하기/나중에 버튼, GoogleAuth.signIn() 호출

---

## ✅ Phase 37: 런칭 게이트 G1/G2/G3 (2026-04-15)

| 테스트 | 결과 |
|--------|------|
| Phase 37: Launch Gates G1/G2/G3 | ✅ 47 PASS / 0 FAIL |

- [x] **G1** 온보딩 히어로: "놓친 수당" 훅, 창작자 배지(핵의학과), 3단 CTA ladder(로그인없이/Google/튜토리얼)
- [x] **G1** Privacy 배지: 로컬우선/구글드라이브/익명통계, privacy.html 링크
- [x] **G8** 공유 버튼: shareBtn, shareQr(qrserver.com API), shareCopyBtn, Web Share API
- [x] **G2** pullOnResume: RESUME_COOLDOWN_MS=20s, _lastResumePull, visibilitychange/focus 리스너
- [x] **G2** 복원 처리: restored/remote_wins 필터, 토스트, _refreshUI, 실패 조용히 처리
- [x] **G3** beforeunload flush: pending 타이머 즉시 push, payslip 키 파싱
- [x] **G3** orphan 백업: 타임스탬프 키, localStorage 저장, index.html 복구 UI
- [x] **G3** fullSync/migrateGuestData/resolveConflict 공개 API 확인

---

## ✅ Phase 36: Admin Rule-Versions UI 전체 (2026-04-15)

| 테스트 | 결과 |
|--------|------|
| Phase 36: Admin Rule-Versions UI | ✅ 69 PASS / 0 FAIL |

- [x] 버전 목록 테이블 HTML: version-table, btn-new-version, btn-show-diff
- [x] 신규 버전 모달: nv-version/effective-from/to/change-note/copy-from, confirm/cancel
- [x] 항목 편집 패널: entries-panel, cat-filter, entry-tbody, entries-info
- [x] Diff 패널: diff-from/to, btn-run-diff, diff-result (added/changed/removed 색상 클래스)
- [x] JS 함수 10개: loadVersions, buildVersionRow, activateVersion, openEntries, renderEntries, saveEntry, populateDiffSelects, renderDiff
- [x] saveEntry 파싱 로직: JSON.parse → Number fallback → 문자열 fallback
- [x] adminOps.ts: GET/PUT entries, GET diff API, flattenForDiff

---

## ✅ Phase 35: Track D 규정 버전 관리 (2026-04-15)

| 테스트 | 결과 |
|--------|------|
| Phase 35: Track D Rule Versioning | ✅ 50 PASS / 0 FAIL |

- [x] **D1** rule_versions 스키마: version(unique), effective_from/to, is_active, change_note, 인덱스 2개
- [x] **D1** rule_entries 스키마: version_id FK(cascade), category, key(dot-path), value_json(jsonb), unique(version+key)
- [x] **D2** migrate-rules-from-json.ts: VERSION=2026.1.0, dry-run, flatten(배열→jsonb), upsert, DATABASE_URL 체크
- [x] **D3** calcOrdinaryWage ruleSet 주입: _getRuleValue, wage_tables_2025, DATA fallback
- [x] **D4 API** rule-versions GET/POST/activate + regulation_diff

---

## ✅ Phase 34: App Lock L5-L7 (2026-04-15)

| 테스트 | 결과 |
|--------|------|
| Phase 34: App Lock L5-L7 | ✅ 43 PASS / 0 FAIL |

- [x] **L5** BiometricLock 서브모듈: isSupported/register/authenticate/disable, WebAuthn API 사용, 오버레이 연동
- [x] **L5** 설정 UI: biometricSettingRow, 지원 여부 체크, 등록/제거 버튼
- [x] **L6** 넛지 바텀시트: pinNudgeSheet, pinNudgeDismissed, "설정할게요"/"나중에" 처리
- [x] **L7** Drive 동기화: _pushAppLock/_pullAppLock, APPLOCK_FIELDS (biometricCredId 제외), fullSync 포함

---

## ✅ Phase 33: Track E Career Platform (2026-04-15)

| 테스트 | 결과 |
|--------|------|
| Phase 33: Track E Career Platform | ✅ 56 PASS / 0 FAIL |

- [x] **E1** 근무이력 UI: renderWorkHistory, openWorkHistorySheet, save/delete 함수 검증
- [x] **E2** AI 이력서: generateAIResume + resume.ts (月1회 제한, GPT, 폴백) 검증
- [x] **E3** 시간외 조기경보: _renderOvertimeAlertBanner (WARNING/CRITICAL, 44px 터치) 검증
- [x] **E4** 퇴직 타임라인: _renderRetirementTimeline (12개월 루프, 최고/최저 강조) 검증
- [x] 네오브루탈 스타일 (2px border, 4px offset shadow) 확인

---

## ✅ 최종 체크포인트 — DB 연결 준비 완료

- [x] 규정 원문 ↔ 코드 전수 검증 완료
- [x] 모든 계산 엔진 DATA 단일 참조
- [x] `retirement-engine.js` DATA 참조 확인 (R21)
- [x] 회귀 검증 PASS (R6 → calc-regression.js 31 PASS)
- [x] `nurse_regulation.json` 야간 배율 분리 완료 (R19/R12)
- [x] `union_regulation_admin.html` 동작 확인 (R11)
- [x] 역계산 검증 시스템 동작 확인 (R13-14)
- [x] 간호사 규정 CALC 통합 완료 (R17-18)
- [x] 퇴직금 3개월 평균 계산 완료 (R20)
- [x] Track A/B 진행 가능 상태 확인

---

## ⏭️ 이후 작업 (DB 연결 후)

> 이 섹션은 규정 단일화 완료 후 진행

- [ ] Supabase DB 연결: DATA_STATIC → DB API 응답으로 교체
- [ ] nurse_regulation.json → DB regulation_versions 테이블로 이전
- [ ] 두 시스템(프론트/백) 동일한 DB 출처 연결
- [ ] 운영팀 에이전트 실사용 활성화

---

*상세 내용은 [tasks/plan-regulation-unification.md](plan-regulation-unification.md) 참조*
