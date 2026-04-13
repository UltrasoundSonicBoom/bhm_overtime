# Spec: Admin Unified Shell v2

**작성일:** 2026-04-13  
**목표:** 비개발자(수간호사, 운영팀)가 AI 에이전트 도움으로 콘텐츠/규정/FAQ를 스스로 관리할 수 있는 단일 Admin 인터페이스  
**기반:** 토스 디자인 철학 — Zero to One, Progressive Disclosure, Inline Feedback, Error Prevention, Consistency

---

## 1. 목표 (Objective)

### 핵심 문제

| # | 문제 | 현재 상태 |
|---|------|-----------|
| 1 | Admin 진입점 4곳 분산 | `admin/index.html`, `review-queue.html`, `union_regulation_admin.html`, `nurse_admin/admin.html` |
| 2 | CSS 토큰 3벌 중복 정의 | `admin/admin.css`, `nurse_admin/nurse_admin.css`, `nurse_admin/publish.css` — `--blue` 값이 파일마다 다름 |
| 3 | RC 상수 JS 소스 하드코딩 | `union_regulation_admin.js:20` RC 객체 → 규정 바뀌면 개발자가 코드 수정해야 함 |
| 4 | constants 뷰가 stub | `index.html` constants 패널이 `union_regulation_admin.html` 링크만 제공, 실제 UI 없음 |
| 5 | review-queue.js 중복 | N+1 픽스된 버전이 `admin.js`에 있는데 `review-queue.js`도 별도 존재 |
| 6 | AI 어시스턴트 패널 없음 | 비개발자가 자연어로 운영할 수단 없음 |

### 수용 기준 (Acceptance Criteria)

- `https://www.snuhmate.com/admin/` 하나의 URL만 기억하면 모든 운영 작업 가능
- 새 FAQ 작성 → 검토 요청 → 승인 게시를 3분 내 완료 (비개발자 기준)
- 규정 상수가 JS 소스가 아닌 API 응답에서 로드됨
- CSS `:root` 변수 정의가 `shell.css` 단 하나 (나머지는 import/override)
- 삭제 대상 파일 4개가 레포에서 제거됨: `review-queue.html`, `review-queue.js`, `union_regulation_admin.html`, `admin/admin.css`
- 모바일(375px)에서 검토/승인 동작 확인

---

## 2. 파일·폴더 구조 (Project Structure)

### 확정 구조

```
/admin/
  index.html                   ← ✅ DONE — SPA 단일 진입점, 8개 view-panel
  shell.css                    ← ✅ DONE — 공유 디자인 토큰 + 셸 레이아웃
  admin.js                     ← ✅ DONE (Phase B에서 constants 뷰 로직 추가)
  union_regulation_admin.js    ← KEEP + 리팩터 (API 로드, constants 패널에 임베드)
  [삭제 예정] admin.css         ← shell.css로 대체 완료
  [삭제 예정] review-queue.html ← index.html review 패널로 통합 완료
  [삭제 예정] review-queue.js   ← admin.js로 통합 완료
  [삭제 예정] union_regulation_admin.html ← index.html constants 패널로 통합

/nurse_admin/
  admin.html                   ← KEEP (admin 셸에서 링크, Phase C에서 iframe)
  index.html                   ← KEEP (직원용 배포 근무표 뷰어, admin 범주 아님)
  nurse_admin.css              ← Phase B: shell.css 토큰 매핑 레이어 추가
  publish.css                  ← Phase B: shell.css 토큰 매핑 레이어 추가
  nurse_admin.js               ← KEEP
  publish.js                   ← KEEP

/server/src/routes/
  adminOps.ts                  ← Phase B: GET /admin/regulation-constants 엔드포인트 추가
```

### 설계 원칙

**단일 진입점 원칙**: `admin/index.html` 이외 admin HTML 파일은 존재하지 않아야 함.  
새 관리 기능 → `index.html`에 `data-view-panel` 추가 + `admin.js`에 렌더 함수 추가.

**CSS 상속 원칙**: 모든 스타일은 `shell.css`를 기반으로 함.  
nurse_admin은 자체 CSS를 유지하되, `:root` 변수는 `shell.css`에서 상속받는 레이어를 추가.

**JS 분리 원칙**: view별 JS 파일을 만들지 않음. `admin.js` 하나에서 모든 view 로직 관리.  
파일이 1500줄을 넘으면 `admin-regulation.js`, `admin-content.js`로 분리 검토.

**nurse_admin 통합 경계**: `nurse_admin/` 내 파일은 현재 기능을 유지하면서 admin 셸에서  
링크(Phase B) → iframe 임베드(Phase C) 순서로 단계적 통합.

---

## 3. 구현 계획 (Implementation Plan)

### Phase A — 이미 완료된 것 정리 ✅

| 작업 | 파일 | 상태 |
|------|------|------|
| Supabase 키 제거 → `/api/config` | `admin.js`, `server/src/index.ts` | ✅ |
| N+1 제거 → JOIN 쿼리 | `server/src/routes/adminOps.ts`, `review-queue.js` | ✅ |
| versionId=1 하드코딩 제거 | `union_regulation_admin.js` | ✅ |
| 토스 디자인 토큰 | `admin/shell.css` | ✅ |
| SPA 셸 8개 view panel | `admin/index.html` | ✅ |
| 모든 render 함수 CSS 마이그레이션 | `admin/admin.js` | ✅ |

---

### Phase B — Admin 통합 완결 (다음 구현 대상)

**B1. 파일 정리**

삭제 대상:
- `admin/review-queue.html` — `index.html` review 패널로 기능 통합됨
- `admin/review-queue.js` — `admin.js` `renderReviewList()` + `loadApprovals()`로 통합됨
- `admin/admin.css` — `shell.css`로 대체됨
- `admin/union_regulation_admin.html` — B3에서 `index.html` constants 패널로 통합 후 삭제

체크 필요:
- `review-queue.html`이 다른 곳에서 링크되는지 확인 후 삭제
- `admin.css`가 어딘가 `<link>`로 로드되는지 확인 후 삭제

**B2. CSS 토큰 통일**

`nurse_admin/nurse_admin.css`와 `nurse_admin/publish.css`의 `:root` 변수 블록을  
`shell.css` 값으로 재매핑하는 레이어를 각 파일 최상단에 추가:

```css
/* nurse_admin.css — shell.css 토큰 매핑 */
/* shell.css의 변수가 로드되어 있을 때 사용; 없으면 fallback 값 유지 */
:root {
  --bg:    var(--bg,    #f2f4f6);   /* shell.css: --bg */
  --blue:  var(--blue,  #3182f6);   /* shell.css: --blue */
  --ink:   var(--text-primary, #191f28);
  /* ... */
}
```

단, nurse_admin은 자체 페이지에서 `shell.css`를 로드하지 않으므로  
fallback 값을 shell.css 토큰 값과 동일하게 맞추는 방식으로 통일.

**B3. constants 뷰 완결**

현재 `index.html` constants 패널은 stub:
```html
<div class="alert alert-info">규정 상수 상세 비교는 ... union_regulation_admin.html을 이용하세요.</div>
```

변경 후:
1. `GET /api/admin/regulation-constants` 엔드포인트 추가 (서버에서 `regulation-constants.js` 읽어서 JSON 반환)
2. `index.html` constants 패널에 실제 상수 테이블 UI 추가 (상수명, 값, 조항, 설명)
3. `admin.js`에 `loadRegulationConstants()` + `renderConstantsTable()` 함수 추가
4. `union_regulation_admin.js`의 RC 비교 로직(SYNC_MAP)을 constants 뷰에 통합
5. `union_regulation_admin.html` 삭제

서버 엔드포인트:
```typescript
// GET /api/admin/regulation-constants
// regulation-constants.js를 파싱해서 키/값/설명 배열 반환
adminOpsRouter.get('/regulation-constants', authMiddleware, async (c) => {
  // regulation-constants.js에서 상수 읽어서 구조화된 JSON 반환
  return c.json({ results: constantsArray })
})
```

**B4. review-queue 정리**

`admin/index.html`의 review 패널이 이미 승인/반려 기능을 갖추고 있음.  
`review-queue.html` → `../admin/` 리다이렉트 추가 후 삭제.

---

### Phase C — nurse_admin iframe 통합

`index.html`에 schedule 뷰 패널 추가:
```html
<section data-view-panel="schedule" style="display:none;">
  <iframe
    src="../nurse_admin/admin.html"
    style="width:100%;height:calc(100vh - 120px);border:none;"
    title="근무표 Admin">
  </iframe>
</section>
```

사이드바의 "근무표 Admin" `<a>` 링크를 `<button data-view="schedule">` 로 변경.

전제: nurse_admin/admin.html 자체가 독립 동작해야 함 (현재 그렇게 구현됨).

---

### Phase D — AI 어시스턴트 패널

**D1. UI 추가**

`index.html`에 우측 고정 패널 (320px, 토글 가능):
```html
<aside class="admin-ai-panel" id="aiPanel" hidden>
  <div class="ai-panel-header">
    <h2>AI 어시스턴트</h2>
    <button id="aiPanelClose">닫기</button>
  </div>
  <div class="ai-panel-shortcuts">
    <button data-prompt="FAQ 초안 작성">FAQ 초안 작성</button>
    <button data-prompt="검토 큐 요약">검토 큐 요약</button>
    <button data-prompt="규정 변경 확인">규정 변경 확인</button>
  </div>
  <textarea id="aiPromptInput" placeholder="무엇을 도와드릴까요?"></textarea>
  <button id="aiSendBtn" class="btn btn-primary">전송</button>
  <div id="aiResponseArea"></div>
</aside>
```

**D2. 서버 엔드포인트**

```typescript
// POST /api/admin/ai-assist
// body: { prompt: string, context?: { view, data } }
// SSE 스트리밍 응답
// 내부적으로 ops-orchestrator 에이전트 라우팅
```

**D3. 셸 레이아웃 변경**

AI 패널 열릴 때:
- `admin-main`의 오른쪽 여백 조정 (또는 오버레이 방식)
- 모바일: 패널이 bottom sheet로 표시

---

## 4. 코드 스타일 (Code Style)

### HTML
- 모든 뷰는 `<section data-view-panel="[name]">` 패턴
- 상태 변경: `display:none` ↔ `display:''` (JS에서 관리)
- 인라인 스타일은 레이아웃 원타이머(`display:flex;gap:8px`)만 허용, 색상/폰트는 CSS 클래스

### CSS
- 새 컴포넌트 → `shell.css`에 추가 (별도 파일 만들지 않음)
- `!important` 사용 금지
- 색상 값은 반드시 CSS 변수로 (`color: #3182f6` → `color: var(--blue)`)

### JavaScript
- DOM 생성: `document.createElement` + `.textContent` (innerHTML 금지)
- 이벤트: 이벤트 위임 (`list.addEventListener('click', ...)`) 선호
- 에러 표시: `setResult(message)` 인라인 (toast 팝업 사용 안 함)
- API 호출: `apiJson(path, options, requireAuth)` 헬퍼 사용
- 새 뷰 데이터: `state` 객체에 필드 추가, `renderAll()`에 렌더 함수 등록

### TypeScript (서버)
- Hono 라우터 패턴 유지
- 인증 필요 엔드포인트: `authMiddleware` 미들웨어 적용
- 응답 형식: `{ result: T }` (단건) / `{ results: T[] }` (복수)

---

## 5. 테스트 전략 (Testing Strategy)

### 단위 테스트 (없음)
현재 admin JS는 브라우저 직접 실행 환경. 서버 로직만 단위 테스트.

### 통합 테스트 (서버)
- B3에서 추가하는 `GET /api/admin/regulation-constants` → `tests/phase-b3-constants.js`
- 응답 구조 검증: `{ results: [{ key, value, ref, desc }] }`

### 수동 QA 체크리스트 (각 Phase 완료 후)
```
Phase B 완료 확인:
[ ] admin/index.html 로드 → admin.css 404 없음 (삭제 확인)
[ ] review-queue.html 접근 → admin/ 리다이렉트 동작
[ ] constants 뷰 → 상수 테이블 로드됨 (API 응답 확인)
[ ] nurse_admin CSS → --blue 값이 #3182f6 (shell.css와 일치)

Phase C 완료 확인:
[ ] 사이드바 "근무표 Admin" 클릭 → iframe 로드됨
[ ] iframe 내 로그인 상태 독립적으로 동작

Phase D 완료 확인:
[ ] AI 패널 토글 동작
[ ] "FAQ 초안 작성" 숏컷 → 응답 스트리밍
[ ] 모바일 375px에서 bottom sheet로 표시
```

---

## 6. 경계 (Boundaries)

### 항상 해야 할 것 (Always)
- 새 admin 기능 → `admin/index.html` view panel 추가 방식으로
- DOM 생성 → `document.createElement` + `.textContent` (XSS 방어)
- API 인증 필요 엔드포인트 → `authMiddleware` 적용
- 모든 사용자 입력 → 서버에서 검증 (클라이언트 검증은 UX용)

### 먼저 확인할 것 (Ask First)
- `admin/index.html` 구조 변경 (grid, topbar, sidebar)
- `shell.css` 토큰 값 변경
- nurse_admin 기능 수정 (별도 팀 영향 가능)
- API 응답 스키마 변경

### 절대 하지 말 것 (Never)
- `innerHTML`에 서버/사용자 데이터 직접 삽입
- 새 admin HTML 파일 생성 (`index.html`에 view panel 추가)
- CSS 토큰을 `:root`에 중복 정의 (shell.css 외)
- 소스 코드에 Supabase 키 하드코딩
- `admin.css` 또는 삭제 예정 파일을 새 기능에 참조

---

## 7. 미적용 항목 현황 (Gap Summary)

| 항목 | 담당 파일 | Phase | 상태 |
|------|-----------|-------|------|
| `review-queue.html` 삭제 | `admin/` | B1 | 미완 |
| `review-queue.js` 삭제 | `admin/` | B1 | 미완 |
| `admin.css` 삭제 | `admin/` | B1 | 미완 |
| `union_regulation_admin.html` 삭제 | `admin/` | B3 | 미완 |
| constants 뷰 실제 UI (테이블) | `admin/index.html`, `admin.js` | B3 | 미완 |
| `GET /api/admin/regulation-constants` | `server/src/routes/adminOps.ts` | B3 | 미완 |
| CSS 토큰 통일 (nurse_admin) | `nurse_admin/*.css` | B2 | 미완 |
| schedule iframe 통합 | `admin/index.html` | C | 미완 |
| AI 어시스턴트 패널 UI | `admin/index.html`, `shell.css` | D | 미완 |
| `POST /api/admin/ai-assist` | `server/src/routes/adminOps.ts` | D | 미완 |
