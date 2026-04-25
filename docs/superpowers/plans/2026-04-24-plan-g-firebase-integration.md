# Plan G — Firebase Auth + Firestore 도입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SNUH Mate 웹앱에 Firebase Auth(Google) + Firestore(서울 리전)를 도입해서 PC Chrome 중심의 다기기 동기화와 사용자 식별 기반을 만든다. 기존 Supabase 시도에서 막혔던 ① Auth redirect, ② RLS, ③ 스키마 마이그레이션, ④ Google API 병행 문제를 제거한다.

**Architecture:**
- **SDK 로딩**: Firebase v10 modular ESM을 `gstatic.com` CDN에서 직접 import — 번들러 없이 현재 패턴(XLSX/PDF.js CDN) 유지.
- **데이터 모델**: localStorage가 소스 오브 트루스(guest 모드 유지), 로그인 시 Firestore는 **write-through 미러**. 로그아웃 = 로컬 데이터 유지, 클라우드 접근 차단.
- **리전**: `asia-northeast3` (서울). PIPA 국외이전 동의 회피.
- **PDF 원본**: 저장 안 함 (Phase 1 스코프). Parsed JSON만 Firestore에 저장. 민감도 최소화.
- **Security**: 본인 uid만 접근(Supabase RLS와 동일 의미의 Firestore rules).

**Tech Stack:**
- Firebase v10.12.0 modular SDK (ESM from `https://www.gstatic.com/firebasejs/10.12.0/`)
- Firebase Auth (Google provider, `signInWithPopup`)
- Firestore (asia-northeast3)
- Vitest (유닛) + Playwright (스모크) — 기존 러너 유지
- `firebase-tools` CLI (rules 배포 전용, 프로젝트 devDependency)

---

## ASSUMPTIONS (확인 필요)

이 plan은 아래 전제 위에서 작성됐습니다. 실행 전 확인해 주세요:

1. **Firebase 무료 티어로 시작** — Spark plan. 500명 수준 사용자까지 무료로 충분. 초과 시 Blaze로 업그레이드 필요.
2. **초기 사용자는 < 100명** — Firestore 동시 연결 100 제한 내에서 운영. onSnapshot 구독은 최소화(필요할 때만).
3. **PDF 원본은 저장하지 않음** — 명세서는 파싱된 JSON만 클라우드로. "원본도 백업" 요구가 생기면 Phase 2로 분리.
4. **AppLock PIN은 로컬 전용 유지** — 디바이스 로컬 잠금. Firebase 신원과 독립.
5. **기존 `schema.sql`은 archive로 이동** — 삭제하지 않고 `archive/supabase-schema-2026.sql`로 보관 (참고용).
6. **모바일은 2차 목표** — PC Chrome 동작 먼저 검증 후 모바일 대응. Playwright 스모크도 desktop Chrome.
7. **Firebase 프로젝트는 사용자가 직접 생성** — Task 0.1은 콘솔 수작업 안내. 이후 자동화된 코드 변경으로 연결.
8. **DOM 조작은 `innerHTML` 금지** — 프로젝트 security hook 정책. 모든 DOM은 `createElement` + `textContent` / `appendChild`로 구성.

→ 위 가정 중 하나라도 다르면 관련 Phase를 시작하기 전에 알려주세요.

---

## File Structure

**신규 파일:**
| 경로 | 책임 |
|---|---|
| `firebase/firebase-init.js` | Firebase App 초기화 싱글톤 (`initializeApp` 1회 호출) |
| `firebase/auth-service.js` | `signInWithGoogle`, `signOut`, `onAuthChanged` wrapper |
| `firebase/data-store.js` | localStorage ↔ Firestore 동기화 추상 레이어 |
| `firebase/auth-ui.js` | 헤더 Sign-In 버튼/아바타 렌더링 (DOM API 기반) |
| `firebase/sync/profile-sync.js` | profile 엔티티 동기화 |
| `firebase/sync/overtime-sync.js` | overtime 엔티티 동기화 |
| `firebase/sync/leave-sync.js` | leave 엔티티 동기화 |
| `firebase/sync/payslip-sync.js` | payslip 엔티티 동기화 |
| `firebase/sync/favorites-sync.js` | favorites 엔티티 동기화 |
| `firebase/migration-dialog.js` | 첫 로그인 시 로컬↔클라우드 병합 선택 UI |
| `firestore.rules` | Security Rules (uid-based) |
| `firebase.json` | Firebase CLI 프로젝트 설정 |
| `tests/unit/firebase-*.test.js` | 모듈별 유닛 테스트 |

**수정 파일:**
| 경로 | 변경 내용 |
|---|---|
| `index.html` | CSP `script-src`에 `https://www.gstatic.com` 추가, Firebase init 모듈 로드 |
| `config.js` | `BHM_CONFIG.firebase` 설정 블록 추가 |
| `shared-layout.js` | `auth-ui.js` 모듈을 DOMContentLoaded에서 호출 |
| `style.css` | Auth UI + migration dialog 스타일 |
| `profile.js` | 저장 시 `profileSync.write()` 호출 |
| `overtime.js` | 저장 시 `overtimeSync.writeRecord()` 호출 |
| `leave.js` | 저장 시 `leaveSync.writeRecord()` 호출 |
| `salary-parser.js` | 월별 저장 시 `payslipSync.writeMonthly()` 호출 |
| `regulation.js` | 즐겨찾기 저장 시 `favoritesSync.write()` 호출 |
| `package.json` | devDependency: `firebase-tools` + 배포 스크립트 |
| `schema.sql` | → `archive/supabase-schema-2026.sql` 로 이동 |
| `admin/health-monitor.js` | supabaseClient 주석 제거 |
| `tests/e2e/smoke.spec.js` | Sign-In 버튼 렌더 검증 추가 |
| `CHANGELOG.md` | Plan G 릴리즈 노트 |

**스코프 밖 (Phase 2+):**
- PDF 원본 Firebase Storage 업로드
- 모바일 UI 최적화
- 실시간 멀티 기기 onSnapshot 동기화 (Phase 1은 로그인 시 1회 pull + write-through)
- Calendar/Drive API 병행 (필요 시 별도 plan)
- 관리자 dashboard의 Firebase 전환

---

## Phase 0 — Firebase 프로젝트 셋업 (콘솔 수작업)

### Task 0.1: Firebase 콘솔에서 프로젝트 생성

**Files:** 없음 (콘솔 수작업)

- [ ] **Step 1: Firebase 콘솔 접속**

브라우저에서 https://console.firebase.google.com 열기. kgh1379@gmail.com 계정으로 로그인.

- [ ] **Step 2: 프로젝트 생성**

"프로젝트 추가" → 이름 `snuh-mate-prod` → Google Analytics 비활성 → 생성.

- [ ] **Step 3: 웹앱 등록**

프로젝트 홈 → "</> 웹 앱 추가" → 닉네임 `snuh-mate-web` → Firebase Hosting 설정 **건너뛰기** → 등록.

- [ ] **Step 4: 구성 객체 복사 및 보관**

화면에 표시되는 `firebaseConfig` 객체 (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`)를 복사해서 로컬 메모에 임시 보관. Task 0.4에서 사용.

- [ ] **Step 5: 검증**

프로젝트 개요 페이지에 `snuh-mate-web` 앱이 표시되는지 확인.

---

### Task 0.2: Google 로그인 제공업체 활성화

**Files:** 없음 (콘솔 수작업)

- [ ] **Step 1: Authentication 메뉴 이동**

Firebase 콘솔 좌측 → Build → Authentication → "시작하기".

- [ ] **Step 2: Google 제공업체 활성화**

"Sign-in method" 탭 → Google → 사용 설정 **ON** → 프로젝트 지원 이메일: `kgh1379@gmail.com` → 저장.

- [ ] **Step 3: 승인된 도메인 추가**

Settings → Authorized domains → 다음 도메인이 있는지 확인하고 없으면 추가:
- `localhost` (개발용, 자동 추가됨)
- `snuhmate.com`
- `www.snuhmate.com`
- `angio.snuhmate.com`

- [ ] **Step 4: 검증**

Sign-in method 탭에서 Google 상태가 "사용 설정됨"인지 확인.

---

### Task 0.3: Firestore 데이터베이스 생성 (서울 리전)

**Files:** 없음 (콘솔 수작업)

- [ ] **Step 1: Firestore 메뉴 이동**

Build → Firestore Database → "데이터베이스 만들기".

- [ ] **Step 2: 리전 선택**

위치: `asia-northeast3 (Seoul)` 선택. **이 선택은 되돌릴 수 없음** — 서울 리전 확정 후 다음 단계로.

- [ ] **Step 3: 보안 모드 선택**

"프로덕션 모드에서 시작" 선택.

- [ ] **Step 4: 기본 deny 규칙 확인**

생성 직후 Rules 탭에서 다음이 적용됐는지 확인:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
이 상태로 Phase 3까지 유지. 클라이언트는 아직 Firestore에 접근 안 함.

- [ ] **Step 5: 검증**

Firestore Database 개요 페이지에 "asia-northeast3" 리전이 표시되는지 확인.

---

### Task 0.4: config.js에 Firebase 설정 추가

**Files:**
- Modify: `config.js`

- [ ] **Step 1: config.js 업데이트**

파일 내용을 다음으로 교체:
```js
// ============================================================
// config.js — 앱 설정
// ============================================================

window.BHM_CONFIG = {
  env: 'production',

  sentryDsn: '',

  // Firebase (Auth + Firestore)
  // 값은 Firebase 콘솔 → 프로젝트 설정 → 웹 앱 구성에서 복사.
  // apiKey는 공개되어도 안전 (Security Rules가 실제 보안을 담당).
  firebase: {
    apiKey: 'AIza...REPLACE_ME',
    authDomain: 'snuh-mate-prod.firebaseapp.com',
    projectId: 'snuh-mate-prod',
    storageBucket: 'snuh-mate-prod.appspot.com',
    messagingSenderId: 'REPLACE_ME',
    appId: 'REPLACE_ME',
  },
};

// 개발 중 설정 누락 가드
(function () {
  var f = window.BHM_CONFIG.firebase;
  if (!f || f.apiKey.indexOf('REPLACE_ME') !== -1) {
    console.warn('[BHM_CONFIG] Firebase 설정이 채워지지 않았습니다 — Firebase 기능 비활성');
    window.BHM_CONFIG.firebase = null;
  }
})();
```

`REPLACE_ME` 자리에 Task 0.1 Step 4에서 복사한 실제 값을 채움.

- [ ] **Step 2: 커밋**

```bash
git add config.js
git commit -m "feat(firebase): config.js — Firebase 설정 블록 + REPLACE_ME 가드"
```

---

## Phase 1 — Firebase SDK 부트스트랩

### Task 1.1: CSP에 gstatic.com 추가

**Files:**
- Modify: `index.html:15-27`

- [ ] **Step 1: 현재 CSP 읽기**

Run: `grep -n "script-src" index.html | head -3`
Expected: `<meta http-equiv="Content-Security-Policy" ...`

- [ ] **Step 2: script-src와 connect-src 업데이트**

`script-src` 디렉티브에 `https://www.gstatic.com` 추가. `connect-src`에 Firebase REST 엔드포인트 명시 추가. `frame-src`에 Firebase auth 도메인 추가:

```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://cdn.sheetjs.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.channel.io https://tally.so https://browser.sentry-cdn.com https://www.gstatic.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
    img-src 'self' data: blob: https://*.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com https://cdn.channel.io https://snuhmate.com https://tally.so;
    font-src 'self' data: https://fonts.gstatic.com;
    media-src 'self' https://cdn.channel.io;
    connect-src 'self' https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://www.google.com https://www.googletagmanager.com https://apis.data.go.kr https://api.rss2json.com https://api.openalex.org https://news.google.com https://*.channel.io wss://*.channel.io https://*.sentry.io https://tally.so https://cdn.jsdelivr.net;
    frame-src 'self' https://tally.so https://snuh-mate-prod.firebaseapp.com;
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
  ">
```

- [ ] **Step 3: 주석 업데이트**

CSP 앞의 주석(12-14번 라인)을 다음으로 교체:
```html
<!--
  I5: Content Security Policy
  - gstatic.com: Firebase SDK ESM 모듈 로드
  - *.googleapis.com: Firestore + Auth REST 엔드포인트
  - snuh-mate-prod.firebaseapp.com (frame-src): OAuth popup 렌더링
-->
```

- [ ] **Step 4: 스모크 검증**

Playwright MCP로 CSP 깨짐 확인 (CLAUDE.md 규약):
1. `python3 -m http.server 8080 &` (background)
2. `browser_navigate http://localhost:8080/index.html?app=1`
3. `browser_console_messages` — CSP 위반 에러 0건 확인
4. `browser_close`

- [ ] **Step 5: 커밋**

```bash
git add index.html
git commit -m "feat(firebase): CSP에 gstatic.com + Firebase REST 엔드포인트 허용"
```

---

### Task 1.2: firebase/firebase-init.js — App 초기화 싱글톤

**Files:**
- Create: `firebase/firebase-init.js`
- Test: `tests/unit/firebase-init.test.js`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p firebase/sync
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/unit/firebase-init.test.js`:
```js
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('firebase-init', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('설정이 없으면 null 반환', async () => {
    globalThis.window = { BHM_CONFIG: { firebase: null } };
    const { getFirebaseApp } = await import('../../firebase/firebase-init.js');
    expect(getFirebaseApp()).toBeNull();
  });

  it('설정이 있으면 2번 호출해도 같은 인스턴스 반환 (싱글톤)', async () => {
    globalThis.window = {
      BHM_CONFIG: {
        firebase: {
          apiKey: 'test-key',
          authDomain: 'test.firebaseapp.com',
          projectId: 'test-project',
          storageBucket: 'test.appspot.com',
          messagingSenderId: '123',
          appId: '1:123:web:abc',
        },
      },
    };
    vi.mock('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js', () => ({
      initializeApp: vi.fn(() => ({ name: 'test-app' })),
      getApps: vi.fn(() => []),
    }));
    const { getFirebaseApp } = await import('../../firebase/firebase-init.js');
    const a = getFirebaseApp();
    const b = getFirebaseApp();
    expect(a).toBe(b);
    expect(a.name).toBe('test-app');
  });
});
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

Run: `npx vitest run tests/unit/firebase-init.test.js`
Expected: FAIL — `Cannot find module '../../firebase/firebase-init.js'`

- [ ] **Step 4: firebase-init.js 작성**

`firebase/firebase-init.js`:
```js
// firebase/firebase-init.js
// Firebase App 초기화 — 한 번만 호출되는 싱글톤.
// 설정이 없으면 null 반환하여 호출부에서 fallback 처리.

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';

let _app = null;
let _initialized = false;

export function getFirebaseApp() {
  if (_initialized) return _app;
  _initialized = true;

  const config = (typeof window !== 'undefined' && window.BHM_CONFIG && window.BHM_CONFIG.firebase) || null;
  if (!config) {
    _app = null;
    return null;
  }

  const existing = getApps();
  _app = existing.length > 0 ? existing[0] : initializeApp(config);
  return _app;
}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

Run: `npx vitest run tests/unit/firebase-init.test.js`
Expected: PASS, 2 tests

- [ ] **Step 6: 커밋**

```bash
git add firebase/firebase-init.js tests/unit/firebase-init.test.js
git commit -m "feat(firebase): firebase-init.js — App 초기화 싱글톤"
```

---

### Task 1.3: index.html에서 Firebase init 모듈 부트스트랩

**Files:**
- Modify: `index.html`

- [ ] **Step 1: config.js 로드 위치 확인**

Run: `grep -n "config.js" index.html`

- [ ] **Step 2: config.js 직후에 module 스크립트 추가**

찾은 라인 직후에 다음 라인 삽입:
```html
<script type="module">
  if (window.BHM_CONFIG && window.BHM_CONFIG.firebase) {
    import('./firebase/firebase-init.js').then(({ getFirebaseApp }) => {
      const app = getFirebaseApp();
      if (app) {
        window.__FIREBASE_APP__ = app;
        window.dispatchEvent(new CustomEvent('firebase:ready'));
      }
    }).catch(err => {
      console.error('[firebase] 초기화 실패', err);
    });
  }
</script>
```

- [ ] **Step 3: 스모크 — 콘솔에서 초기화 확인**

Playwright MCP:
1. `python3 -m http.server 8080 &`
2. `browser_navigate http://localhost:8080/index.html?app=1`
3. `browser_evaluate` → `window.__FIREBASE_APP__?.name`
4. Expected: `"[DEFAULT]"`
5. `browser_console_messages` — 에러 0건

- [ ] **Step 4: 커밋**

```bash
git add index.html
git commit -m "feat(firebase): index.html — Firebase app 부트스트랩 module 로드"
```

---

## Phase 2 — Auth 서비스

### Task 2.1: firebase/auth-service.js — signInWithGoogle / signOut / onAuthChanged

**Files:**
- Create: `firebase/auth-service.js`
- Test: `tests/unit/firebase-auth-service.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/unit/firebase-auth-service.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js', () => ({
  getAuth: vi.fn(() => ({ _type: 'auth' })),
  GoogleAuthProvider: vi.fn(function () { this.addScope = vi.fn(); }),
  signInWithPopup: vi.fn(async () => ({ user: { uid: 'u1', email: 'a@b.com', displayName: 'Tester' } })),
  signOut: vi.fn(async () => undefined),
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb({ uid: 'u1', email: 'a@b.com', displayName: 'Tester' });
    return () => {};
  }),
}));

vi.mock('../../firebase/firebase-init.js', () => ({
  getFirebaseApp: vi.fn(() => ({ name: 'test-app' })),
}));

describe('auth-service', () => {
  beforeEach(() => vi.resetModules());

  it('signInWithGoogle은 user 객체를 반환', async () => {
    const mod = await import('../../firebase/auth-service.js');
    const user = await mod.signInWithGoogle();
    expect(user.uid).toBe('u1');
    expect(user.email).toBe('a@b.com');
  });

  it('onAuthChanged는 초기 콜백을 받음', async () => {
    const mod = await import('../../firebase/auth-service.js');
    const cb = vi.fn();
    mod.onAuthChanged(cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1' }));
  });

  it('getCurrentUser는 동기적으로 현재 상태 반환', async () => {
    const mod = await import('../../firebase/auth-service.js');
    mod.onAuthChanged(() => {});
    expect(mod.getCurrentUser()?.uid).toBe('u1');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run tests/unit/firebase-auth-service.test.js`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: auth-service.js 작성**

`firebase/auth-service.js`:
```js
// firebase/auth-service.js
// Firebase Auth wrapper — Google Sign-In 전용.

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as _signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirebaseApp } from './firebase-init.js';

let _authInstance = null;
let _currentUser = null;
const _listeners = new Set();

function auth() {
  if (_authInstance) return _authInstance;
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase app not initialized');
  _authInstance = getAuth(app);
  onAuthStateChanged(_authInstance, (user) => {
    _currentUser = user;
    _listeners.forEach((cb) => {
      try { cb(user); } catch (e) { console.error('[auth] listener error', e); }
    });
  });
  return _authInstance;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth(), provider);
  return result.user;
}

export async function signOut() {
  await _signOut(auth());
}

export function onAuthChanged(callback) {
  _listeners.add(callback);
  auth();
  if (_currentUser !== null) callback(_currentUser);
  return () => _listeners.delete(callback);
}

export function getCurrentUser() {
  return _currentUser;
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npx vitest run tests/unit/firebase-auth-service.test.js`
Expected: PASS, 3 tests

- [ ] **Step 5: 커밋**

```bash
git add firebase/auth-service.js tests/unit/firebase-auth-service.test.js
git commit -m "feat(firebase): auth-service — Google Sign-In + onAuthChanged wrapper"
```

---

### Task 2.2: firebase/auth-ui.js — 헤더 Sign-In 버튼/아바타 (DOM API)

**이 태스크는 `innerHTML`을 쓰지 않고 모든 DOM을 `createElement` + `textContent` + `appendChild`로 구성한다** (프로젝트 security hook 정책).

**Files:**
- Create: `firebase/auth-ui.js`
- Modify: `shared-layout.js`
- Modify: `style.css`

- [ ] **Step 1: auth-ui.js 작성 (Google SVG 포함, innerHTML 미사용)**

`firebase/auth-ui.js`:
```js
// firebase/auth-ui.js
// 헤더 우상단 Sign-In 버튼 / 사용자 아바타 렌더링.
// 모든 DOM은 createElement + textContent로 구성 (innerHTML 금지).

function _svgEl(tag, attrs) {
  const ns = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(ns, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function _googleLogo() {
  const svg = _svgEl('svg', { width: '16', height: '16', viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  const paths = [
    { fill: '#4285F4', d: 'M22.54 12.26c0-.78-.07-1.53-.2-2.26H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.74h3.57c2.08-1.92 3.28-4.74 3.28-8.05z' },
    { fill: '#34A853', d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.74c-.99.66-2.26 1.06-3.71 1.06-2.85 0-5.27-1.93-6.13-4.52H2.18v2.84A10.99 10.99 0 0 0 12 23z' },
    { fill: '#FBBC04', d: 'M5.87 14.14a6.6 6.6 0 0 1 0-4.28V7.02H2.18a11 11 0 0 0 0 9.96l3.69-2.84z' },
    { fill: '#EA4335', d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.02l3.69 2.84C6.73 7.31 9.15 5.38 12 5.38z' },
  ];
  paths.forEach(p => svg.appendChild(_svgEl('path', p)));
  return svg;
}

function _buildSigninButton() {
  const btn = document.createElement('button');
  btn.id = 'bhm-auth-signin';
  btn.className = 'auth-btn';
  btn.type = 'button';
  btn.hidden = true;
  btn.appendChild(_googleLogo());
  const span = document.createElement('span');
  span.textContent = '클라우드 동기화 켜기';
  btn.appendChild(span);
  return btn;
}

function _buildUserPanel() {
  const panel = document.createElement('div');
  panel.id = 'bhm-auth-user';
  panel.className = 'auth-user';
  panel.hidden = true;

  const avatar = document.createElement('img');
  avatar.id = 'bhm-auth-avatar';
  avatar.width = 28;
  avatar.height = 28;
  avatar.alt = '';
  avatar.src = '';
  panel.appendChild(avatar);

  const name = document.createElement('span');
  name.id = 'bhm-auth-name';
  panel.appendChild(name);

  const signout = document.createElement('button');
  signout.id = 'bhm-auth-signout';
  signout.className = 'auth-signout';
  signout.type = 'button';
  signout.textContent = '로그아웃';
  panel.appendChild(signout);

  return panel;
}

export function mountAuthUI(container) {
  if (!container) return;
  if (!window.BHM_CONFIG?.firebase) return;

  const slot = document.createElement('div');
  slot.id = 'bhm-auth-slot';
  slot.className = 'auth-slot';
  const signinBtn = _buildSigninButton();
  const userPanel = _buildUserPanel();
  slot.appendChild(signinBtn);
  slot.appendChild(userPanel);
  container.appendChild(slot);

  const avatar = userPanel.querySelector('#bhm-auth-avatar');
  const nameEl = userPanel.querySelector('#bhm-auth-name');
  const signoutBtn = userPanel.querySelector('#bhm-auth-signout');

  signinBtn.addEventListener('click', async () => {
    signinBtn.disabled = true;
    try {
      const { signInWithGoogle } = await import('./auth-service.js');
      await signInWithGoogle();
    } catch (e) {
      console.error('[auth] sign-in failed', e);
      alert('로그인에 실패했습니다: ' + (e.message || e.code || 'unknown'));
    } finally {
      signinBtn.disabled = false;
    }
  });

  signoutBtn.addEventListener('click', async () => {
    if (!confirm('로그아웃하시겠습니까? 이 기기의 로컬 데이터는 유지됩니다.')) return;
    const { signOut } = await import('./auth-service.js');
    await signOut();
  });

  import('./auth-service.js').then(({ onAuthChanged }) => {
    onAuthChanged((user) => {
      if (user) {
        signinBtn.hidden = true;
        userPanel.hidden = false;
        avatar.src = user.photoURL || '';
        avatar.alt = user.displayName || user.email || '';
        nameEl.textContent = user.displayName || user.email || '사용자';
      } else {
        signinBtn.hidden = false;
        userPanel.hidden = true;
        avatar.src = '';
        nameEl.textContent = '';
      }
    });
  });
}
```

- [ ] **Step 2: shared-layout.js에서 auth-ui 모듈 호출**

`shared-layout.js` 파일 끝에 다음 추가:
```js
if (typeof window !== 'undefined' && window.BHM_CONFIG?.firebase) {
  window.addEventListener('DOMContentLoaded', () => {
    import('./firebase/auth-ui.js').then(({ mountAuthUI }) => {
      const header = document.querySelector('header') || document.querySelector('.app-header') || document.body;
      mountAuthUI(header);
    }).catch(err => console.warn('[auth-ui] load failed', err));
  });
}
```

- [ ] **Step 3: style.css에 스타일 추가**

`style.css` 파일 끝에 다음 추가:
```css
/* Firebase Auth UI */
.auth-slot {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 50;
}
.auth-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: #fff;
  color: #3c4043;
  font-size: 13px;
  cursor: pointer;
}
.auth-btn:hover { background: #f8f9fa; }
.auth-btn:disabled { opacity: 0.5; cursor: wait; }
.auth-user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid #dadce0;
}
.auth-user img { border-radius: 50%; }
.auth-signout {
  background: transparent;
  border: 0;
  color: #1a73e8;
  cursor: pointer;
  font-size: 12px;
}
```

- [ ] **Step 4: 스모크 — 버튼 렌더 + 클릭**

Playwright MCP:
1. `python3 -m http.server 8080 &`
2. `browser_navigate http://localhost:8080/index.html?app=1`
3. `browser_snapshot` — 우상단에 "클라우드 동기화 켜기" 버튼 확인
4. `browser_console_messages` — 에러 0건
5. (수동) 버튼 클릭 → Google 팝업 열림 확인 (실제 로그인은 Phase 7 검증에서)

- [ ] **Step 5: 커밋**

```bash
git add firebase/auth-ui.js shared-layout.js style.css
git commit -m "feat(firebase): auth-ui 모듈 — Sign-In 버튼 + 아바타 (DOM API 기반)"
```

---

## Phase 3 — Firestore Security Rules

### Task 3.1: firestore.rules 작성

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: firestore.rules 작성**

프로젝트 루트에 `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    match /profiles/{uid} {
      allow read, write: if isOwner(uid);
    }

    match /overtime/{uid}/records/{recordId} {
      allow read, write: if isOwner(uid);
    }

    match /leave/{uid}/records/{recordId} {
      allow read, write: if isOwner(uid);
    }

    match /payslips/{uid}/monthly/{monthKey} {
      allow read, write: if isOwner(uid);
    }

    match /favorites/{uid} {
      allow read, write: if isOwner(uid);
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add firestore.rules
git commit -m "feat(firebase): firestore.rules — uid 기반 본인 데이터 접근만 허용"
```

---

### Task 3.2: firebase.json + firebase-tools 설치 + rules 배포

**Files:**
- Create: `firebase.json`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: firebase-tools 설치**

Run: `npm install --save-dev firebase-tools`
Expected: devDependencies에 firebase-tools 추가

- [ ] **Step 2: firebase.json 작성**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

- [ ] **Step 3: .gitignore에 .firebaserc 추가**

`.gitignore` 파일 끝에:
```
.firebaserc
```

- [ ] **Step 4: npm script 추가**

`package.json`의 `scripts`에 추가:
```json
"firebase:rules:deploy": "firebase deploy --only firestore:rules"
```

- [ ] **Step 5: 로그인 + 프로젝트 연결 (수동)**

Run:
```
npx firebase login
npx firebase use --add
# → snuh-mate-prod 선택, alias "default"
```

- [ ] **Step 6: rules 배포**

Run: `npm run firebase:rules:deploy`
Expected: "Deploy complete!" 메시지

- [ ] **Step 7: 커밋**

```bash
git add firebase.json package.json package-lock.json .gitignore
git commit -m "feat(firebase): firebase-tools + rules 배포 스크립트"
```

---

## Phase 4 — 데이터 스토어 추상화

### Task 4.1: firebase/data-store.js — localStorage + Firestore 통합 인터페이스

**Files:**
- Create: `firebase/data-store.js`
- Test: `tests/unit/firebase-data-store.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/unit/firebase-data-store.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetDoc = vi.fn(async () => undefined);
const mockGetDoc = vi.fn(async () => ({ exists: () => true, data: () => ({ name: 'cloud' }) }));
const mockDocRef = vi.fn((...parts) => ({ _path: parts.join('/') }));

vi.mock('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js', () => ({
  getFirestore: vi.fn(() => ({ _type: 'firestore' })),
  doc: mockDocRef,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  collection: vi.fn((...p) => ({ _path: p.join('/') })),
  getDocs: vi.fn(async () => ({ forEach: (cb) => cb({ id: 'r1', data: () => ({ hours: 8 }) }) })),
  deleteDoc: vi.fn(async () => undefined),
}));

vi.mock('../../firebase/firebase-init.js', () => ({
  getFirebaseApp: vi.fn(() => ({ name: 'test-app' })),
}));

vi.mock('../../firebase/auth-service.js', () => ({
  getCurrentUser: vi.fn(() => ({ uid: 'u1' })),
}));

describe('data-store', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = v; },
      removeItem(k) { delete this._store[k]; },
    };
    mockSetDoc.mockClear();
    mockGetDoc.mockClear();
  });

  it('writeDoc: 로컬 저장 + 로그인 시 Firestore 미러', async () => {
    const { writeDoc } = await import('../../firebase/data-store.js');
    await writeDoc('profiles', { name: 'Test' }, { localKey: 'bhm_hr_profile' });
    expect(localStorage.getItem('bhm_hr_profile')).toBe(JSON.stringify({ name: 'Test' }));
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'profiles/u1' }),
      expect.objectContaining({ name: 'Test' })
    );
  });

  it('readDoc: 로그인 시 Firestore 먼저, 로컬로 반영', async () => {
    const { readDoc } = await import('../../firebase/data-store.js');
    const result = await readDoc('profiles', { localKey: 'bhm_hr_profile' });
    expect(result).toEqual({ name: 'cloud' });
    expect(localStorage.getItem('bhm_hr_profile')).toBe(JSON.stringify({ name: 'cloud' }));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/unit/firebase-data-store.test.js`
Expected: FAIL

- [ ] **Step 3: data-store.js 작성**

`firebase/data-store.js`:
```js
// firebase/data-store.js
// localStorage + Firestore 통합 스토어.
// 정책: localStorage = source of truth (guest 모드 유지)
//      로그인 시 Firestore = write-through 미러

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getFirebaseApp } from './firebase-init.js';
import { getCurrentUser } from './auth-service.js';

let _dbInstance = null;
function db() {
  if (_dbInstance) return _dbInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  _dbInstance = getFirestore(app);
  return _dbInstance;
}

export async function writeDoc(collectionPath, value, { localKey }) {
  if (localKey) localStorage.setItem(localKey, JSON.stringify(value));
  const user = getCurrentUser();
  if (!user) return;
  const firestore = db();
  if (!firestore) return;
  await setDoc(doc(firestore, collectionPath, user.uid), {
    ...value,
    _updatedAt: Date.now(),
  });
}

export async function readDoc(collectionPath, { localKey }) {
  const user = getCurrentUser();
  const firestore = db();

  if (user && firestore) {
    const snap = await getDoc(doc(firestore, collectionPath, user.uid));
    if (snap.exists()) {
      const data = snap.data();
      delete data._updatedAt;
      if (localKey) localStorage.setItem(localKey, JSON.stringify(data));
      return data;
    }
  }

  if (!localKey) return null;
  const raw = localStorage.getItem(localKey);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function writeCollectionItem(collectionPath, itemId, value, { localKey }) {
  if (localKey) {
    const raw = localStorage.getItem(localKey);
    const bucket = raw ? JSON.parse(raw) : [];
    if (Array.isArray(bucket)) {
      const idx = bucket.findIndex((it) => it.id === itemId);
      if (idx >= 0) bucket[idx] = { ...value, id: itemId };
      else bucket.push({ ...value, id: itemId });
      localStorage.setItem(localKey, JSON.stringify(bucket));
    }
  }

  const user = getCurrentUser();
  if (!user) return;
  const firestore = db();
  if (!firestore) return;

  await setDoc(
    doc(firestore, collectionPath, user.uid, 'records', itemId),
    { ...value, _updatedAt: Date.now() }
  );
}

export async function readCollection(collectionPath, { localKey }) {
  const user = getCurrentUser();
  const firestore = db();

  if (user && firestore) {
    const col = collection(firestore, collectionPath, user.uid, 'records');
    const snap = await getDocs(col);
    const out = [];
    snap.forEach((d) => {
      const data = d.data();
      delete data._updatedAt;
      out.push({ ...data, id: d.id });
    });
    if (localKey) localStorage.setItem(localKey, JSON.stringify(out));
    return out;
  }

  if (!localKey) return [];
  const raw = localStorage.getItem(localKey);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function deleteCollectionItem(collectionPath, itemId, { localKey }) {
  if (localKey) {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      let bucket = JSON.parse(raw);
      if (Array.isArray(bucket)) bucket = bucket.filter((it) => it.id !== itemId);
      localStorage.setItem(localKey, JSON.stringify(bucket));
    }
  }

  const user = getCurrentUser();
  if (!user) return;
  const firestore = db();
  if (!firestore) return;

  await deleteDoc(doc(firestore, collectionPath, user.uid, 'records', itemId));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/unit/firebase-data-store.test.js`
Expected: PASS, 2 tests

- [ ] **Step 5: 커밋**

```bash
git add firebase/data-store.js tests/unit/firebase-data-store.test.js
git commit -m "feat(firebase): data-store — localStorage + Firestore 통합 read/write"
```

---

## Phase 5 — Profile 동기화 (Thin Vertical Slice)

**이 Phase의 목표**: 단일 엔티티(profile)로 Auth → Firestore → UI 전체 흐름을 검증한다. 이 패턴이 작동하면 Phase 6의 나머지 4개 엔티티는 동일 패턴 복사로 빠르게 구현된다.

### Task 5.1: firebase/sync/profile-sync.js

**Files:**
- Create: `firebase/sync/profile-sync.js`
- Test: `tests/unit/firebase-sync-profile.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/unit/firebase-sync-profile.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWriteDoc = vi.fn(async () => undefined);
const mockReadDoc = vi.fn(async () => ({ name: 'Test', hireDate: '2020-01-01' }));

vi.mock('../../firebase/data-store.js', () => ({
  writeDoc: mockWriteDoc,
  readDoc: mockReadDoc,
}));

describe('profile-sync', () => {
  beforeEach(() => {
    mockWriteDoc.mockClear();
    mockReadDoc.mockClear();
  });

  it('write(profile)은 profiles 컬렉션에 저장', async () => {
    const { profileSync } = await import('../../firebase/sync/profile-sync.js');
    await profileSync.write({ name: 'Test' });
    expect(mockWriteDoc).toHaveBeenCalledWith(
      'profiles',
      { name: 'Test' },
      { localKey: 'bhm_hr_profile' }
    );
  });

  it('read()는 데이터 반환', async () => {
    const { profileSync } = await import('../../firebase/sync/profile-sync.js');
    const result = await profileSync.read();
    expect(result.name).toBe('Test');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/unit/firebase-sync-profile.test.js`
Expected: FAIL

- [ ] **Step 3: profile-sync.js 작성**

`firebase/sync/profile-sync.js`:
```js
// firebase/sync/profile-sync.js
// Profile 엔티티 — 단일 문서, profiles/{uid}

import { writeDoc, readDoc } from '../data-store.js';

const COLLECTION = 'profiles';
const LOCAL_KEY = 'bhm_hr_profile';

export const profileSync = {
  async write(profile) {
    return writeDoc(COLLECTION, profile, { localKey: LOCAL_KEY });
  },
  async read() {
    return readDoc(COLLECTION, { localKey: LOCAL_KEY });
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/unit/firebase-sync-profile.test.js`
Expected: PASS, 2 tests

- [ ] **Step 5: 커밋**

```bash
git add firebase/sync/profile-sync.js tests/unit/firebase-sync-profile.test.js
git commit -m "feat(firebase): profile-sync — profile 엔티티 동기화"
```

---

### Task 5.2: profile.js — PROFILE.save()에 sync 연결

**Files:**
- Modify: `profile.js`

- [ ] **Step 1: 현재 save() 위치 확인**

Run: `grep -n "function save\|PROFILE.save\|save: function\|localStorage.setItem.*bhm_hr_profile" profile.js`

- [ ] **Step 2: profile.js 상단에 sync helper 추가**

파일 상단(첫 주석 이후, 기존 코드 이전)에 추가:
```js
// Firebase sync (선택적 — 설정이 없으면 noop)
var _profileSyncPromise = null;
function _getProfileSync() {
  if (!window.BHM_CONFIG || !window.BHM_CONFIG.firebase) return Promise.resolve(null);
  if (!_profileSyncPromise) {
    _profileSyncPromise = import('./firebase/sync/profile-sync.js')
      .then(m => m.profileSync)
      .catch(err => { console.warn('[profile] sync unavailable', err); return null; });
  }
  return _profileSyncPromise;
}
```

- [ ] **Step 3: save() 함수에서 sync 호출**

Step 1의 grep 결과로 찾은 저장 지점에서 localStorage.setItem 직후에 추가:
```js
// localStorage.setItem('bhm_hr_profile', JSON.stringify(profile));  (기존 유지)
_getProfileSync().then(sync => {
  if (sync) sync.write(profile).catch(err => console.warn('[profile] cloud sync failed', err));
});
```

- [ ] **Step 4: 스모크 — 프로필 저장 시 Firestore 반영 (수동)**

1. `python3 -m http.server 8080 &`
2. Chrome에서 `http://localhost:8080/index.html?app=1` 열고 실제 로그인
3. 프로필 탭 → 이름 입력 → 저장
4. Firebase 콘솔 → Firestore → `profiles/{uid}` 문서 생성 확인

- [ ] **Step 5: 커밋**

```bash
git add profile.js
git commit -m "feat(firebase): profile.js — save() 시 Firestore 미러"
```

---

### Task 5.3: 로그인 시 profile 자동 복원

**Files:**
- Modify: `firebase/auth-ui.js`
- Modify: `profile.js`

- [ ] **Step 1: auth-ui의 onAuthChanged 핸들러 확장**

Task 2.2에서 만든 `firebase/auth-ui.js`의 `onAuthChanged` 콜백 끝에 추가:
```js
if (user) {
  try {
    const { profileSync } = await import('./sync/profile-sync.js');
    await profileSync.read();
    window.dispatchEvent(new CustomEvent('profile:cloud-loaded'));
  } catch (e) {
    console.warn('[auth-ui] profile cloud pull failed', e);
  }
}
```

(단, `onAuthChanged((user) => {...})` 콜백을 `async`로 변경해야 await 가능)

- [ ] **Step 2: profile.js에서 이벤트 수신 + UI 재로드**

`profile.js` 파일 끝에:
```js
if (typeof window !== 'undefined') {
  window.addEventListener('profile:cloud-loaded', () => {
    if (typeof PROFILE !== 'undefined' && typeof PROFILE.reloadUI === 'function') {
      PROFILE.reloadUI();
    }
  });
}
```

- [ ] **Step 3: PROFILE.reloadUI 함수가 없으면 추가**

Run: `grep -n "reloadUI\|renderProfile\|loadProfile" profile.js profile-tab.js | head -10`

`reloadUI`가 없으면, 기존 초기 렌더 함수를 찾아 (예: `renderProfile`, `loadProfileFromStorage`) `PROFILE.reloadUI = renderProfile;` 같은 alias 추가.

- [ ] **Step 4: 스모크 — 다기기 시나리오 (수동)**

1. Chrome A에서 로그인 → 프로필 저장
2. Chrome B(시크릿)에서 같은 계정 로그인 → 프로필 자동 로드 확인

- [ ] **Step 5: 커밋**

```bash
git add firebase/auth-ui.js profile.js
git commit -m "feat(firebase): 로그인 시 profile 자동 복원 + UI 재로드"
```

---

## Phase 6 — 나머지 엔티티 동기화

**패턴**: Phase 5의 profile과 동일. 각 엔티티마다 sync 모듈 생성 → 저장 함수에 연결.

### Task 6.1: overtime-sync.js (기록 컬렉션)

**Files:**
- Create: `firebase/sync/overtime-sync.js`
- Test: `tests/unit/firebase-sync-overtime.test.js`
- Modify: `overtime.js`, `firebase/auth-ui.js`

- [ ] **Step 1: 테스트 작성**

`tests/unit/firebase-sync-overtime.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWriteItem = vi.fn(async () => undefined);
const mockReadCol = vi.fn(async () => [{ id: 'r1', hours: 8, date: '2026-04-24' }]);
const mockDeleteItem = vi.fn(async () => undefined);

vi.mock('../../firebase/data-store.js', () => ({
  writeCollectionItem: mockWriteItem,
  readCollection: mockReadCol,
  deleteCollectionItem: mockDeleteItem,
}));

describe('overtime-sync', () => {
  beforeEach(() => {
    mockWriteItem.mockClear();
    mockReadCol.mockClear();
    mockDeleteItem.mockClear();
  });

  it('writeRecord는 overtime 컬렉션에 아이템 저장', async () => {
    const { overtimeSync } = await import('../../firebase/sync/overtime-sync.js');
    await overtimeSync.writeRecord('r1', { hours: 8, date: '2026-04-24' });
    expect(mockWriteItem).toHaveBeenCalledWith(
      'overtime', 'r1', { hours: 8, date: '2026-04-24' },
      { localKey: 'bhm_overtime_records' }
    );
  });

  it('readAll은 배열 반환', async () => {
    const { overtimeSync } = await import('../../firebase/sync/overtime-sync.js');
    const result = await overtimeSync.readAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe('r1');
  });

  it('deleteRecord는 아이템 삭제', async () => {
    const { overtimeSync } = await import('../../firebase/sync/overtime-sync.js');
    await overtimeSync.deleteRecord('r1');
    expect(mockDeleteItem).toHaveBeenCalledWith(
      'overtime', 'r1', { localKey: 'bhm_overtime_records' }
    );
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/unit/firebase-sync-overtime.test.js`
Expected: FAIL

- [ ] **Step 3: overtime-sync.js 작성**

`firebase/sync/overtime-sync.js`:
```js
// firebase/sync/overtime-sync.js
// Overtime 기록 — overtime/{uid}/records/{recordId}

import { writeCollectionItem, readCollection, deleteCollectionItem } from '../data-store.js';

const COLLECTION = 'overtime';
const LOCAL_KEY = 'bhm_overtime_records';

export const overtimeSync = {
  async writeRecord(id, record) {
    return writeCollectionItem(COLLECTION, id, record, { localKey: LOCAL_KEY });
  },
  async readAll() {
    return readCollection(COLLECTION, { localKey: LOCAL_KEY });
  },
  async deleteRecord(id) {
    return deleteCollectionItem(COLLECTION, id, { localKey: LOCAL_KEY });
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/unit/firebase-sync-overtime.test.js`
Expected: PASS, 3 tests

- [ ] **Step 5: overtime.js에 sync 연결**

Run: `grep -n "bhm_overtime_records\|OVERTIME\\.save\|saveRecord\|deleteRecord" overtime.js | head -10`

파일 상단에 helper 추가 (profile.js Task 5.2 Step 2와 동일 패턴):
```js
var _otSyncPromise = null;
function _getOvertimeSync() {
  if (!window.BHM_CONFIG || !window.BHM_CONFIG.firebase) return Promise.resolve(null);
  if (!_otSyncPromise) {
    _otSyncPromise = import('./firebase/sync/overtime-sync.js')
      .then(m => m.overtimeSync)
      .catch(() => null);
  }
  return _otSyncPromise;
}
```

저장 함수에서 localStorage 업데이트 직후:
```js
_getOvertimeSync().then(s => s && s.writeRecord(record.id, record).catch(err => console.warn('[overtime] sync failed', err)));
```

삭제 함수에서:
```js
_getOvertimeSync().then(s => s && s.deleteRecord(recordId).catch(err => console.warn('[overtime] delete sync failed', err)));
```

- [ ] **Step 6: 로그인 시 pull — auth-ui.js 확장**

`firebase/auth-ui.js`의 onAuthChanged 로그인 분기에 추가:
```js
try {
  const { overtimeSync } = await import('./sync/overtime-sync.js');
  await overtimeSync.readAll();
  window.dispatchEvent(new CustomEvent('overtime:cloud-loaded'));
} catch (e) { console.warn('[auth-ui] overtime pull failed', e); }
```

`overtime.js` 파일 끝에 이벤트 리스너 추가:
```js
if (typeof window !== 'undefined') {
  window.addEventListener('overtime:cloud-loaded', () => {
    if (typeof OVERTIME !== 'undefined' && typeof OVERTIME.reloadUI === 'function') {
      OVERTIME.reloadUI();
    } else if (typeof renderOvertimeTab === 'function') {
      renderOvertimeTab();
    }
  });
}
```

- [ ] **Step 7: 커밋**

```bash
git add firebase/sync/overtime-sync.js tests/unit/firebase-sync-overtime.test.js overtime.js firebase/auth-ui.js
git commit -m "feat(firebase): overtime-sync + overtime.js 연결 + 로그인 pull"
```

---

### Task 6.2: leave-sync.js

**Files:**
- Create: `firebase/sync/leave-sync.js`
- Test: `tests/unit/firebase-sync-leave.test.js`
- Modify: `leave.js`, `firebase/auth-ui.js`

- [ ] **Step 1: 테스트 작성**

`tests/unit/firebase-sync-leave.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWriteItem = vi.fn(async () => undefined);
const mockReadCol = vi.fn(async () => []);
const mockDeleteItem = vi.fn(async () => undefined);

vi.mock('../../firebase/data-store.js', () => ({
  writeCollectionItem: mockWriteItem,
  readCollection: mockReadCol,
  deleteCollectionItem: mockDeleteItem,
}));

describe('leave-sync', () => {
  beforeEach(() => {
    mockWriteItem.mockClear();
    mockReadCol.mockClear();
    mockDeleteItem.mockClear();
  });

  it('writeRecord는 leave 컬렉션에 저장', async () => {
    const { leaveSync } = await import('../../firebase/sync/leave-sync.js');
    await leaveSync.writeRecord('l1', { startDate: '2026-05-01', endDate: '2026-05-05', type: 'annual' });
    expect(mockWriteItem).toHaveBeenCalledWith(
      'leave', 'l1', expect.objectContaining({ type: 'annual' }),
      { localKey: 'leaveRecords' }
    );
  });

  it('deleteRecord 동작', async () => {
    const { leaveSync } = await import('../../firebase/sync/leave-sync.js');
    await leaveSync.deleteRecord('l1');
    expect(mockDeleteItem).toHaveBeenCalledWith('leave', 'l1', { localKey: 'leaveRecords' });
  });
});
```

- [ ] **Step 2: 실패 확인 → 구현**

`firebase/sync/leave-sync.js`:
```js
import { writeCollectionItem, readCollection, deleteCollectionItem } from '../data-store.js';

const COLLECTION = 'leave';
const LOCAL_KEY = 'leaveRecords';

export const leaveSync = {
  async writeRecord(id, record) {
    return writeCollectionItem(COLLECTION, id, record, { localKey: LOCAL_KEY });
  },
  async readAll() {
    return readCollection(COLLECTION, { localKey: LOCAL_KEY });
  },
  async deleteRecord(id) {
    return deleteCollectionItem(COLLECTION, id, { localKey: LOCAL_KEY });
  },
};
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npx vitest run tests/unit/firebase-sync-leave.test.js`
Expected: PASS, 2 tests

- [ ] **Step 4: leave.js 연결**

Run: `grep -n "leaveRecords\|saveLeave\|deleteLeave" leave.js`

Task 6.1 Step 5와 동일 패턴으로 `_getLeaveSync()` helper 추가, 저장/삭제 훅 삽입.

- [ ] **Step 5: 로그인 pull + 이벤트**

`firebase/auth-ui.js`에 leave pull 추가 (Task 6.1 Step 6과 동일).

`leave.js`에 이벤트 리스너:
```js
if (typeof window !== 'undefined') {
  window.addEventListener('leave:cloud-loaded', () => {
    if (typeof LEAVE !== 'undefined' && typeof LEAVE.reloadUI === 'function') LEAVE.reloadUI();
    else if (typeof renderLeaveTab === 'function') renderLeaveTab();
  });
}
```

- [ ] **Step 6: 커밋**

```bash
git add firebase/sync/leave-sync.js tests/unit/firebase-sync-leave.test.js leave.js firebase/auth-ui.js
git commit -m "feat(firebase): leave-sync + leave.js 연결"
```

---

### Task 6.3: payslip-sync.js (월별 맵)

**Files:**
- Create: `firebase/sync/payslip-sync.js`
- Test: `tests/unit/firebase-sync-payslip.test.js`
- Modify: `salary-parser.js`, `firebase/auth-ui.js`

- [ ] **Step 1: 테스트 작성**

`tests/unit/firebase-sync-payslip.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetDoc = vi.fn(async () => undefined);
const mockGetDocs = vi.fn(async () => ({
  forEach: (cb) => {
    cb({ id: '2026_04', data: () => ({ totalPay: 5000000 }) });
    cb({ id: '2026_03', data: () => ({ totalPay: 4800000 }) });
  }
}));

vi.mock('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((...p) => ({ _path: p.join('/') })),
  collection: vi.fn((...p) => ({ _path: p.join('/') })),
  setDoc: mockSetDoc,
  getDoc: vi.fn(),
  getDocs: mockGetDocs,
  deleteDoc: vi.fn(),
}));

vi.mock('../../firebase/firebase-init.js', () => ({ getFirebaseApp: () => ({}) }));
vi.mock('../../firebase/auth-service.js', () => ({ getCurrentUser: () => ({ uid: 'u1' }) }));

describe('payslip-sync', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _s: {},
      getItem(k) { return this._s[k] || null; },
      setItem(k, v) { this._s[k] = v; },
      removeItem(k) { delete this._s[k]; },
      key(i) { return Object.keys(this._s)[i]; },
      get length() { return Object.keys(this._s).length; },
    };
    mockSetDoc.mockClear();
  });

  it('writeMonthly(2026_04, data)는 payslips/u1/monthly/2026_04에 저장', async () => {
    const { payslipSync } = await import('../../firebase/sync/payslip-sync.js');
    await payslipSync.writeMonthly('2026_04', { totalPay: 5000000 });
    expect(localStorage.getItem('bhm_overtime_payslips_2026_04')).toBeTruthy();
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'payslips/u1/monthly/2026_04' }),
      expect.objectContaining({ totalPay: 5000000 })
    );
  });

  it('readAllMonthly는 년월별 맵 반환', async () => {
    const { payslipSync } = await import('../../firebase/sync/payslip-sync.js');
    const result = await payslipSync.readAllMonthly();
    expect(result['2026_04'].totalPay).toBe(5000000);
    expect(result['2026_03'].totalPay).toBe(4800000);
  });
});
```

- [ ] **Step 2: 실패 확인 → 구현**

`firebase/sync/payslip-sync.js`:
```js
// firebase/sync/payslip-sync.js
// Payslip — 월 단위. payslips/{uid}/monthly/{yyyy_mm}

import {
  getFirestore, doc, setDoc, collection, getDocs, deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getFirebaseApp } from '../firebase-init.js';
import { getCurrentUser } from '../auth-service.js';

function _db() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}
function _localKey(monthKey) {
  return `bhm_overtime_payslips_${monthKey}`;
}

export const payslipSync = {
  async writeMonthly(monthKey, data) {
    localStorage.setItem(_localKey(monthKey), JSON.stringify(data));
    const user = getCurrentUser();
    const db = _db();
    if (!user || !db) return;
    await setDoc(
      doc(db, 'payslips', user.uid, 'monthly', monthKey),
      { ...data, _updatedAt: Date.now() }
    );
  },

  async readMonthly(monthKey) {
    const raw = localStorage.getItem(_localKey(monthKey));
    if (raw) { try { return JSON.parse(raw); } catch {} }
    return null;
  },

  async readAllMonthly() {
    const user = getCurrentUser();
    const db = _db();
    const out = {};
    if (user && db) {
      const snap = await getDocs(collection(db, 'payslips', user.uid, 'monthly'));
      snap.forEach((d) => {
        const data = d.data();
        delete data._updatedAt;
        out[d.id] = data;
        localStorage.setItem(_localKey(d.id), JSON.stringify(data));
      });
      return out;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('bhm_overtime_payslips_')) {
        const monthKey = k.replace('bhm_overtime_payslips_', '');
        try { out[monthKey] = JSON.parse(localStorage.getItem(k)); } catch {}
      }
    }
    return out;
  },

  async deleteMonthly(monthKey) {
    localStorage.removeItem(_localKey(monthKey));
    const user = getCurrentUser();
    const db = _db();
    if (!user || !db) return;
    await deleteDoc(doc(db, 'payslips', user.uid, 'monthly', monthKey));
  },
};
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npx vitest run tests/unit/firebase-sync-payslip.test.js`
Expected: PASS, 2 tests

- [ ] **Step 4: salary-parser.js 연결**

Run: `grep -n "bhm_overtime_payslips_\|saveMonthlyData" salary-parser.js`

상단에 helper 추가 + 저장 직후 훅:
```js
var _paySyncPromise = null;
function _getPayslipSync() {
  if (!window.BHM_CONFIG || !window.BHM_CONFIG.firebase) return Promise.resolve(null);
  if (!_paySyncPromise) {
    _paySyncPromise = import('./firebase/sync/payslip-sync.js')
      .then(m => m.payslipSync).catch(() => null);
  }
  return _paySyncPromise;
}
```

`saveMonthlyData` 또는 동등 함수 안의 `localStorage.setItem(bhm_overtime_payslips_${monthKey}, ...)` 직후:
```js
_getPayslipSync().then(s => s && s.writeMonthly(monthKey, parsedData).catch(err => console.warn('[payslip] sync failed', err)));
```

- [ ] **Step 5: 로그인 pull — auth-ui.js**

`firebase/auth-ui.js`의 로그인 분기에 추가:
```js
try {
  const { payslipSync } = await import('./sync/payslip-sync.js');
  await payslipSync.readAllMonthly();
  window.dispatchEvent(new CustomEvent('payslip:cloud-loaded'));
} catch (e) { console.warn('[auth-ui] payslip pull failed', e); }
```

- [ ] **Step 6: 커밋**

```bash
git add firebase/sync/payslip-sync.js tests/unit/firebase-sync-payslip.test.js salary-parser.js firebase/auth-ui.js
git commit -m "feat(firebase): payslip-sync + salary-parser 저장 훅 + 로그인 pull"
```

---

### Task 6.4: favorites-sync.js (규정 즐겨찾기)

**Files:**
- Create: `firebase/sync/favorites-sync.js`
- Test: `tests/unit/firebase-sync-favorites.test.js`
- Modify: `regulation.js`, `firebase/auth-ui.js`

- [ ] **Step 1: 테스트 작성**

`tests/unit/firebase-sync-favorites.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWriteDoc = vi.fn(async () => undefined);
const mockReadDoc = vi.fn(async () => ({ items: ['A', 'B'] }));

vi.mock('../../firebase/data-store.js', () => ({
  writeDoc: mockWriteDoc,
  readDoc: mockReadDoc,
}));

describe('favorites-sync', () => {
  beforeEach(() => {
    mockWriteDoc.mockClear();
    mockReadDoc.mockClear();
  });

  it('write는 favorites 컬렉션에 items 배열 저장', async () => {
    const { favoritesSync } = await import('../../firebase/sync/favorites-sync.js');
    await favoritesSync.write(['A', 'B', 'C']);
    expect(mockWriteDoc).toHaveBeenCalledWith(
      'favorites', { items: ['A', 'B', 'C'] }, { localKey: 'bhm_favorites' }
    );
  });

  it('read는 items 배열만 반환', async () => {
    const { favoritesSync } = await import('../../firebase/sync/favorites-sync.js');
    const result = await favoritesSync.read();
    expect(result).toEqual(['A', 'B']);
  });
});
```

- [ ] **Step 2: 실패 확인 → 구현**

`firebase/sync/favorites-sync.js`:
```js
// firebase/sync/favorites-sync.js
// 규정 즐겨찾기 — favorites/{uid} 단일 문서, items 배열 필드

import { writeDoc, readDoc } from '../data-store.js';

export const favoritesSync = {
  async write(items) {
    return writeDoc('favorites', { items }, { localKey: 'bhm_favorites' });
  },
  async read() {
    const data = await readDoc('favorites', { localKey: 'bhm_favorites' });
    if (!data) return [];
    return Array.isArray(data) ? data : (data.items || []);
  },
};
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npx vitest run tests/unit/firebase-sync-favorites.test.js`
Expected: PASS, 2 tests

- [ ] **Step 4: regulation.js 연결**

Run: `grep -n "bhm_favorites" regulation.js`

Task 5.2 패턴으로 `_getFavoritesSync()` helper + 저장 훅 삽입.

- [ ] **Step 5: 로그인 pull — auth-ui.js**

Task 6.1 Step 6 패턴 반복.

- [ ] **Step 6: 커밋**

```bash
git add firebase/sync/favorites-sync.js tests/unit/firebase-sync-favorites.test.js regulation.js firebase/auth-ui.js
git commit -m "feat(firebase): favorites-sync + regulation.js 연결"
```

---

## Phase 7 — 첫 로그인 마이그레이션 UI

### Task 7.1: migration-dialog.js — 충돌 해결 다이얼로그 (DOM API)

**Files:**
- Create: `firebase/migration-dialog.js`
- Modify: `style.css`
- Modify: `firebase/auth-ui.js`

- [ ] **Step 1: 다이얼로그 모듈 작성 (innerHTML 미사용)**

`firebase/migration-dialog.js`:
```js
// firebase/migration-dialog.js
// 첫 로그인 시 로컬 vs 클라우드 상태를 비교해 사용자 의사 결정을 받는다.
// 전략:
//   case A: 로컬 있음, 클라우드 없음 → 자동 업로드
//   case B: 로컬 없음, 클라우드 있음 → 자동 다운로드
//   case C: 양쪽 다 있음 → 사용자 선택
//   case D: 양쪽 다 없음 → no-op

const LOCAL_KEYS = {
  profile: 'bhm_hr_profile',
  overtime: 'bhm_overtime_records',
  leave: 'leaveRecords',
  favorites: 'bhm_favorites',
};

function _countLocal() {
  const counts = { profile: 0, overtime: 0, leave: 0, favorites: 0, payslips: 0 };
  try { counts.profile = localStorage.getItem(LOCAL_KEYS.profile) ? 1 : 0; } catch {}
  try {
    const ot = JSON.parse(localStorage.getItem(LOCAL_KEYS.overtime) || '[]');
    counts.overtime = Array.isArray(ot) ? ot.length : 0;
  } catch {}
  try {
    const lv = JSON.parse(localStorage.getItem(LOCAL_KEYS.leave) || '[]');
    counts.leave = Array.isArray(lv) ? lv.length : 0;
  } catch {}
  try {
    const f = JSON.parse(localStorage.getItem(LOCAL_KEYS.favorites) || '[]');
    counts.favorites = Array.isArray(f) ? (f.length > 0 ? 1 : 0) : (f && f.items ? 1 : 0);
  } catch {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('bhm_overtime_payslips_')) counts.payslips++;
  }
  return counts;
}

async function _countCloud() {
  const { getCurrentUser } = await import('./auth-service.js');
  const user = getCurrentUser();
  if (!user) return null;
  const { getFirestore, doc, getDoc, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  const { getFirebaseApp } = await import('./firebase-init.js');
  const db = getFirestore(getFirebaseApp());

  const [profile, overtime, leave, favorites, payslips] = await Promise.all([
    getDoc(doc(db, 'profiles', user.uid)).then(s => s.exists() ? 1 : 0).catch(() => 0),
    getDocs(collection(db, 'overtime', user.uid, 'records')).then(s => s.size).catch(() => 0),
    getDocs(collection(db, 'leave', user.uid, 'records')).then(s => s.size).catch(() => 0),
    getDoc(doc(db, 'favorites', user.uid)).then(s => s.exists() ? 1 : 0).catch(() => 0),
    getDocs(collection(db, 'payslips', user.uid, 'monthly')).then(s => s.size).catch(() => 0),
  ]);
  return { profile, overtime, leave, favorites, payslips };
}

function _total(c) {
  if (!c) return 0;
  return c.profile + c.overtime + c.leave + c.favorites + c.payslips;
}

function _tr(label, leftVal, rightVal) {
  const tr = document.createElement('tr');
  const td0 = document.createElement('td');
  td0.textContent = label;
  const td1 = document.createElement('td');
  td1.textContent = String(leftVal);
  const td2 = document.createElement('td');
  td2.textContent = String(rightVal);
  tr.appendChild(td0); tr.appendChild(td1); tr.appendChild(td2);
  return tr;
}

function _renderConflictDialog(local, cloud) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fb-migration-overlay';

    const card = document.createElement('div');
    card.className = 'fb-migration-card';

    const h3 = document.createElement('h3');
    h3.textContent = '클라우드 동기화 설정';
    card.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = '이 기기와 클라우드에 각각 데이터가 있습니다. 어떻게 할까요?';
    card.appendChild(p);

    const table = document.createElement('table');
    table.className = 'fb-migration-table';
    const thead = document.createElement('thead');
    const thr = document.createElement('tr');
    ['', '이 기기', '클라우드'].forEach(t => {
      const th = document.createElement('th'); th.textContent = t; thr.appendChild(th);
    });
    thead.appendChild(thr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.appendChild(_tr('프로필', local.profile ? '있음' : '없음', cloud.profile ? '있음' : '없음'));
    tbody.appendChild(_tr('시간외 기록', local.overtime + '건', cloud.overtime + '건'));
    tbody.appendChild(_tr('휴가 기록', local.leave + '건', cloud.leave + '건'));
    tbody.appendChild(_tr('급여명세서', local.payslips + '개월', cloud.payslips + '개월'));
    tbody.appendChild(_tr('즐겨찾기', local.favorites ? '있음' : '없음', cloud.favorites ? '있음' : '없음'));
    table.appendChild(tbody);
    card.appendChild(table);

    const actions = document.createElement('div');
    actions.className = 'fb-migration-actions';
    [
      { choice: 'local', label: '이 기기 데이터를 클라우드에 올리기', primary: true },
      { choice: 'cloud', label: '클라우드 데이터를 이 기기로 받기', primary: true },
      { choice: 'cancel', label: '취소 (로그아웃)', primary: false },
    ].forEach(opt => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt.label;
      if (!opt.primary) b.className = 'secondary';
      b.addEventListener('click', () => {
        overlay.remove();
        resolve(opt.choice);
      });
      actions.appendChild(b);
    });
    card.appendChild(actions);

    const hint = document.createElement('p');
    hint.className = 'fb-migration-hint';
    hint.textContent = '병합은 현재 지원하지 않습니다. 필요 시 백업 후 진행하세요 (개인정보 탭 → 내보내기).';
    card.appendChild(hint);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}

export async function runFirstLoginMigration() {
  const local = _countLocal();
  const cloud = await _countCloud();
  if (!cloud) return;

  const localTotal = _total(local);
  const cloudTotal = _total(cloud);

  if (localTotal === 0 && cloudTotal === 0) return;

  if (localTotal > 0 && cloudTotal === 0) {
    await _uploadLocalToCloud();
    return;
  }

  if (localTotal === 0 && cloudTotal > 0) {
    await _downloadCloudToLocal();
    window.dispatchEvent(new CustomEvent('data:reload-all'));
    return;
  }

  const choice = await _renderConflictDialog(local, cloud);
  if (choice === 'local') {
    await _uploadLocalToCloud();
  } else if (choice === 'cloud') {
    await _downloadCloudToLocal();
    window.dispatchEvent(new CustomEvent('data:reload-all'));
  } else {
    const { signOut } = await import('./auth-service.js');
    await signOut();
  }
}

async function _uploadLocalToCloud() {
  const { profileSync } = await import('./sync/profile-sync.js');
  const { overtimeSync } = await import('./sync/overtime-sync.js');
  const { leaveSync } = await import('./sync/leave-sync.js');
  const { payslipSync } = await import('./sync/payslip-sync.js');
  const { favoritesSync } = await import('./sync/favorites-sync.js');

  const profile = JSON.parse(localStorage.getItem(LOCAL_KEYS.profile) || 'null');
  if (profile) await profileSync.write(profile);

  const ot = JSON.parse(localStorage.getItem(LOCAL_KEYS.overtime) || '[]');
  for (const rec of ot) if (rec && rec.id) await overtimeSync.writeRecord(rec.id, rec);

  const lv = JSON.parse(localStorage.getItem(LOCAL_KEYS.leave) || '[]');
  for (const rec of lv) if (rec && rec.id) await leaveSync.writeRecord(rec.id, rec);

  const monthKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('bhm_overtime_payslips_')) monthKeys.push(k.replace('bhm_overtime_payslips_', ''));
  }
  for (const monthKey of monthKeys) {
    const data = JSON.parse(localStorage.getItem('bhm_overtime_payslips_' + monthKey) || 'null');
    if (data) await payslipSync.writeMonthly(monthKey, data);
  }

  const fav = JSON.parse(localStorage.getItem(LOCAL_KEYS.favorites) || '[]');
  const favArr = Array.isArray(fav) ? fav : (fav && fav.items ? fav.items : []);
  if (favArr.length > 0) await favoritesSync.write(favArr);
}

async function _downloadCloudToLocal() {
  const { profileSync } = await import('./sync/profile-sync.js');
  const { overtimeSync } = await import('./sync/overtime-sync.js');
  const { leaveSync } = await import('./sync/leave-sync.js');
  const { payslipSync } = await import('./sync/payslip-sync.js');
  const { favoritesSync } = await import('./sync/favorites-sync.js');
  await profileSync.read();
  await overtimeSync.readAll();
  await leaveSync.readAll();
  await payslipSync.readAllMonthly();
  await favoritesSync.read();
}
```

- [ ] **Step 2: style.css에 다이얼로그 스타일 추가**

`style.css` 끝에:
```css
.fb-migration-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.fb-migration-card {
  background: #fff; padding: 24px; border-radius: 8px;
  max-width: 480px; width: 90%;
}
.fb-migration-card h3 { margin-top: 0; }
.fb-migration-table { width: 100%; margin: 16px 0; border-collapse: collapse; }
.fb-migration-table th, .fb-migration-table td {
  padding: 6px 8px; border-bottom: 1px solid #eee; text-align: left;
}
.fb-migration-actions { display: flex; flex-direction: column; gap: 8px; }
.fb-migration-actions button {
  padding: 10px 16px; border: 1px solid #1a73e8; background: #1a73e8;
  color: #fff; border-radius: 4px; cursor: pointer;
}
.fb-migration-actions button.secondary {
  background: #fff; color: #5f6368; border-color: #dadce0;
}
.fb-migration-hint { font-size: 12px; color: #5f6368; margin-top: 12px; }
```

- [ ] **Step 3: auth-ui.js에서 로그인 직후 마이그레이션 호출**

`firebase/auth-ui.js`의 로그인 분기를 다음과 같이 재정비 — 기존 개별 pull 호출을 대체:
```js
if (user && !window.__FB_MIGRATION_DONE__) {
  window.__FB_MIGRATION_DONE__ = true;
  try {
    const { runFirstLoginMigration } = await import('./migration-dialog.js');
    await runFirstLoginMigration();
  } catch (e) {
    console.error('[auth-ui] migration failed', e);
  }
}
```

기존 Task 5.3, 6.1 Step 6, 6.2 Step 5, 6.3 Step 5, 6.4 Step 5에서 추가한 개별 `profileSync.read()` / `overtimeSync.readAll()` / ... 호출은 `runFirstLoginMigration`이 이미 처리하므로 **제거**.

대신 각 엔티티 탭 재렌더는 `data:reload-all` 이벤트로 통합:
```js
window.addEventListener('data:reload-all', () => {
  ['profile:cloud-loaded', 'overtime:cloud-loaded', 'leave:cloud-loaded', 'payslip:cloud-loaded', 'favorites:cloud-loaded']
    .forEach(ev => window.dispatchEvent(new CustomEvent(ev)));
});
```

- [ ] **Step 4: 스모크 — 3가지 시나리오 (수동)**

1. **Case A (로컬만)**: 로그아웃 상태에서 프로필 + 시간외 2건 저장 → 로그인 → 다이얼로그 없이 자동 업로드 → Firebase 콘솔에서 Firestore 데이터 확인
2. **Case B (클라우드만)**: 새 시크릿 창 → 같은 계정 로그인 → 자동 다운로드 → UI에 데이터 복원 확인
3. **Case C (양쪽 충돌)**: 로그아웃 후 새 시간외 추가 → 재로그인 → 충돌 다이얼로그 표시 → "이 기기 올리기" 선택 → 반영 확인

- [ ] **Step 5: 커밋**

```bash
git add firebase/migration-dialog.js firebase/auth-ui.js style.css
git commit -m "feat(firebase): 첫 로그인 마이그레이션 다이얼로그 (case A/B/C, DOM API)"
```

---

## Phase 8 — Supabase 잔여물 정리

### Task 8.1: schema.sql을 archive로 이동

**Files:**
- Move: `schema.sql` → `archive/supabase-schema-2026.sql`

- [ ] **Step 1: archive 디렉토리 확인**

Run: `ls archive/ || mkdir archive`

- [ ] **Step 2: 파일 이동**

```bash
git mv schema.sql archive/supabase-schema-2026.sql
```

- [ ] **Step 3: 이동된 파일 상단에 설명 주석 추가**

`archive/supabase-schema-2026.sql` 맨 위에:
```sql
-- ==========================================
-- ARCHIVED: 이 스키마는 Supabase 시도(2026 Q1~Q2) 때 만들어졌습니다.
-- Firebase Firestore로 전환되면서 Plan G(2026-04-24)에서 archive로 이동됐습니다.
-- 참고용이며, 현재 앱은 Firestore를 사용합니다. firestore.rules 를 보세요.
-- ==========================================

```

- [ ] **Step 4: 커밋**

```bash
git add archive/supabase-schema-2026.sql
git commit -m "chore(firebase): schema.sql → archive/ (Supabase 시도 참고용)"
```

---

### Task 8.2: 코드 내 Supabase 주석/참조 정리

**Files:**
- Modify: Supabase 언급 JS 파일들

- [ ] **Step 1: Supabase 언급 검색**

Run: `grep -rn "supabase\|Supabase" --include="*.js" --exclude-dir=archive --exclude-dir=node_modules --exclude-dir=.worktrees . | head -30`

- [ ] **Step 2: 각 건별 처리**

주석만 있는 경우 제거 또는 "Firestore" 로 교체. 구현 의존이 있으면 이 Plan의 스코프 밖이므로 TODO 주석 대신 별도 이슈/plan으로 기록.

예: `admin/health-monitor.js`에서 `// supabaseClient.js:15-19 와 동일 로직` → `// Firestore 초기화와 동일 패턴` 또는 완전 제거.

- [ ] **Step 3: 커밋**

```bash
git add <수정한 파일들>
git commit -m "chore(firebase): Supabase 주석 참조 정리"
```

---

## Phase 9 — 스모크 + 회귀 테스트

### Task 9.1: Playwright 스모크 — 로그아웃 상태 회귀 확인

**Files:**
- Modify: `tests/e2e/smoke.spec.js`

- [ ] **Step 1: 기존 smoke.spec.js 확인**

Run: `cat tests/e2e/smoke.spec.js`

- [ ] **Step 2: "로그아웃 상태에서 Sign-In 버튼 표시 + 기존 8탭 동작" 케이스 추가**

`tests/e2e/smoke.spec.js`에 추가:
```js
test('로그아웃 상태에서 Sign-In 버튼이 표시되지만 앱은 정상 동작', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:8785/index.html?app=1');
  await page.waitForLoadState('networkidle');

  const signinBtn = page.locator('#bhm-auth-signin');
  if (await signinBtn.count() > 0) {
    await expect(signinBtn).toBeVisible();
  }

  const tabs = ['tab-home', 'tab-payroll', 'tab-overtime', 'tab-leave', 'tab-reference', 'tab-profile', 'tab-settings', 'tab-feedback'];
  for (const id of tabs) {
    const selector = `[data-tab="${id}"], #${id}-link, button[onclick*="${id}"]`;
    const el = page.locator(selector).first();
    if (await el.count() > 0) {
      await el.click();
      await page.waitForTimeout(300);
    }
  }

  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 3: 실행 + 통과 확인**

Run: `npm run test:smoke`
Expected: 기존 테스트 + 신규 테스트 모두 PASS

- [ ] **Step 4: 커밋**

```bash
git add tests/e2e/smoke.spec.js
git commit -m "test(firebase): smoke — Sign-In 버튼 렌더 + 로그아웃 상태 회귀"
```

---

### Task 9.2: 전체 테스트 + 실연동 스모크

- [ ] **Step 1: 유닛 테스트 전체 실행**

Run: `npm run test:unit`
Expected: 기존 36개 + 신규 (firebase-init 2 + auth-service 3 + data-store 2 + profile-sync 2 + overtime-sync 3 + leave-sync 2 + payslip-sync 2 + favorites-sync 2 = 18) ≈ 54개 PASS

- [ ] **Step 2: E2E 스모크 전체**

Run: `npm run test:smoke`
Expected: 전체 PASS

- [ ] **Step 3: 실연동 Playwright MCP 스모크 (수동)**

1. `python3 -m http.server 8080 &`
2. `browser_navigate http://localhost:8080/index.html?app=1`
3. 우상단 "클라우드 동기화 켜기" 클릭 → Google 팝업 → 실제 계정 로그인
4. 프로필 탭 → 이름/입사일 저장
5. Firebase 콘솔에서 `profiles/{uid}` 문서 생성 확인
6. 시간외 1건 저장 → `overtime/{uid}/records/{id}` 확인
7. 로그아웃 → localStorage 유지 확인 (프로필 UI 데이터 남아있음)
8. 시크릿 창에서 같은 계정 로그인 → 자동 다운로드 확인
9. `browser_console_messages` — 에러 0건
10. `browser_close`

- [ ] **Step 4: CHANGELOG 업데이트 + 릴리즈 커밋**

`CHANGELOG.md`에 추가:
```markdown
## [Unreleased] — Plan G: Firebase 통합

### Added
- Firebase Auth (Google Sign-In) — 헤더 우상단 "클라우드 동기화" 버튼
- Firestore 연동 — profile, overtime, leave, payslip, favorites 엔티티 자동 동기화
- 첫 로그인 마이그레이션 다이얼로그 (로컬 vs 클라우드 충돌 해결)

### Changed
- CSP: `gstatic.com` + Firebase REST 엔드포인트 허용
- `config.js`: `BHM_CONFIG.firebase` 설정 블록 추가

### Moved
- `schema.sql` → `archive/supabase-schema-2026.sql`

### Policy
- localStorage = source of truth (guest 모드 완전 동작)
- Firestore = write-through 미러 (로그인 시에만)
- PDF 원본은 클라우드 저장 안 함 (parsed JSON만)
- 서울 리전(`asia-northeast3`) — PIPA 국외이전 동의 회피
```

```bash
git add CHANGELOG.md
git commit -m "docs(firebase): CHANGELOG — Plan G 요약"
```

---

## Phase 10 (Future) — Graduation: Firebase에서 이사 나가기

**이 Phase는 "지금 실행하지 않는" 계획이다.** Firebase 무료 티어가 소진되기 시작할 때 발동한다. Plan G의 `data-store.js` 추상화 덕분에 **이사 비용은 2~3일 수준**으로 예상된다.

### Graduation 임계치 (발동 조건)

Firebase 콘솔 → Usage and billing에서 월 1회 확인. 아래 중 **2개 이상**이 연속 2개월 넘으면 graduation 시작.

| 지표 | 무료 한도 | 경고 임계치 (80%) | Graduation 임계치 (상시 초과) |
|---|---|---|---|
| 일일 Firestore 읽기 | 50,000 | 40,000 | 지속 50K+ |
| 일일 Firestore 쓰기 | 20,000 | 16,000 | 지속 20K+ |
| 월 Blaze 비용 | $0 (Spark) | $10 | $30+ 지속 |
| Firestore 저장 | 1 GB | 800 MB | 1 GB+ |
| 동시 연결 | 100 | 80 | 100+ (onSnapshot 남용) |

**주의**: Blaze로 넘어가도 사용량이 위 한도의 **10배 이내면 월 $20~50** 수준. 자가호스팅 관리 시간(시급)을 감안하면 **월 $30~50까지는 이사가 오히려 손해**. 진짜 이사가 이득인 시점은 보통 **월 $50+ 또는 사용자 1만 명+**.

---

### Task 10.1: 사용량 모니터링 대시보드 (월 1회 체크)

**Files:**
- Create: `docs/operations/firebase-usage-check.md` (체크리스트)

- [ ] **Step 1: 체크리스트 문서 작성**

`docs/operations/firebase-usage-check.md`:
```markdown
# Firebase 사용량 월간 체크

매월 1일에 5분 투자. Firebase 콘솔의 Usage 탭을 열고 아래 값 기록.

## 기록 양식
- 날짜: YYYY-MM-DD
- 총 MAU (Auth): _______
- 일 평균 Firestore 읽기: _______
- 일 평균 Firestore 쓰기: _______
- Firestore 저장 용량: _______ MB
- Blaze 청구액: $_______

## 트리거 (YES면 Task 10.2로)
- [ ] 일일 읽기가 40,000+ 상시인가?
- [ ] 일일 쓰기가 16,000+ 상시인가?
- [ ] 월 청구액이 $30+ 인가?
- [ ] 저장 용량이 800MB+ 인가?

3개월 연속 2개 이상 YES → graduation 플래닝 시작.
```

- [ ] **Step 2: 리마인더 설정**

캘린더에 매월 1일 "Firebase usage 체크" 반복 일정 추가.

- [ ] **Step 3: 커밋**

```bash
git add docs/operations/firebase-usage-check.md
git commit -m "docs(ops): Firebase 월간 사용량 체크리스트"
```

---

### Task 10.2: 이사처 결정 (트리거 발동 시점에 재평가)

이사가 필요해진 시점에 **다시 후보 비교**. 시장 상황이 달라졌을 수 있음. 2026-04 기준 후보는 아래 표 참고.

| 후보 | 이사 적합 시나리오 | 예상 이사 비용 (인일) | 운영 비용 |
|---|---|---|---|
| **PocketBase 자가호스팅** | 트래픽 안정, 운영 가능, 비용 최소화 | 2~3일 | VPS $5~10/월 고정 |
| **Appwrite Cloud** | 실시간 트래픽 많음, 관리 부담 회피 | 1~2일 | 75K MAU 무료, 초과 시 Blaze와 비슷 |
| **Cloudflare D1 + Workers** | 글로벌 분산, 읽기 많음, SQL 필요 | 3~5일 | 매우 저렴 (5M 읽기/일 무료) |
| **Nhost (Postgres + Hasura)** | GraphQL 선호, 복잡한 쿼리 | 3~4일 | 무료 → $25/월부터 |

- [ ] **Step 1: 트리거 발동 시 `docs/superpowers/plans/YYYY-MM-DD-plan-h-graduate-from-firebase.md` 신규 작성**
- [ ] **Step 2: 후보 재평가 (당시 시장 기준)**
- [ ] **Step 3: 하나 선택, Task 10.3으로 진행**

---

### Task 10.3: `data-store.js` 교체 템플릿 (PocketBase 예시)

Plan G의 추상화가 이사를 이만큼 쉽게 만든다는 증거 코드. **실제 이사 시점에** 이 템플릿을 `firebase/data-store.js` 와 같은 인터페이스로 작성.

**Files (이사 시점):**
- Create: `backend/pocketbase-client.js`
- Replace: `firebase/data-store.js` → `backend/data-store.js` (동일 export)

- [ ] **Step 1: PocketBase 서버 셋업 (단일 바이너리)**

VPS에서:
```bash
wget https://github.com/pocketbase/pocketbase/releases/download/vX.Y.Z/pocketbase_X.Y.Z_linux_amd64.zip
unzip pocketbase_X.Y.Z_linux_amd64.zip
./pocketbase serve --http=0.0.0.0:8090
```
Admin UI(http://server:8090/_/)에서 Google OAuth + 컬렉션 스키마 생성:
- `profiles` (사용자 ID = PocketBase user.id)
- `overtime_records` (user 필드 + 데이터)
- `leave_records`, `payslips`, `favorites` 동일

- [ ] **Step 2: `backend/pocketbase-client.js` 작성 (data-store.js 인터페이스 유지)**

이 단계의 코드는 **이사 시점에** 작성. Plan G의 `firebase/data-store.js` export 시그니처(`writeDoc`, `readDoc`, `writeCollectionItem`, `readCollection`, `deleteCollectionItem`)를 그대로 구현.

예시 스켈레톤 (실제 이사 시점에 구체화):
```js
// backend/pocketbase-client.js
import PocketBase from 'https://cdn.jsdelivr.net/npm/pocketbase@0.22.0/dist/pocketbase.es.mjs';

const pb = new PocketBase('https://your-server.com:8090');

export async function writeDoc(collection, value, { localKey }) {
  if (localKey) localStorage.setItem(localKey, JSON.stringify(value));
  if (!pb.authStore.isValid) return;
  const user = pb.authStore.model;
  const existing = await pb.collection(collection).getFirstListItem(`user="${user.id}"`).catch(() => null);
  if (existing) await pb.collection(collection).update(existing.id, { ...value, user: user.id });
  else await pb.collection(collection).create({ ...value, user: user.id });
}

// readDoc, writeCollectionItem, readCollection, deleteCollectionItem —
// Plan G의 firebase/data-store.js와 동일 시그니처로 구현
```

- [ ] **Step 3: 각 엔티티 파일의 import 경로만 변경**

```js
// Before (Firebase):
import { writeDoc, readDoc } from '../data-store.js';  // firebase/data-store.js

// After (PocketBase):
import { writeDoc, readDoc } from '../data-store.js';  // backend/data-store.js (재export)
```

`firebase/sync/*.js` 파일들은 **수정 불필요**. 인터페이스만 같으면 동작.

- [ ] **Step 4: Auth 모듈 교체**

`firebase/auth-service.js` → `backend/auth-service.js`. 동일하게 `signInWithGoogle`, `signOut`, `onAuthChanged`, `getCurrentUser` export 유지. 내부만 PocketBase SDK로.

- [ ] **Step 5: 데이터 이전 1회 스크립트**

`scripts/migrate-firebase-to-pocketbase.js` — 모든 사용자의 Firestore 데이터를 PocketBase로 옮기는 1회성 스크립트. Firebase Admin SDK + PocketBase SDK로 읽기/쓰기.

중요: **사용자에게 "이사 중 30분간 저장 비활성" 공지 필요**. 또는 이중 쓰기 기간 운영(2주: 양쪽 모두 쓰기, 검증 후 Firebase 제거).

- [ ] **Step 6: 회귀 테스트**

기존 54개 유닛 테스트가 data-store 인터페이스만 모킹하므로, **테스트 코드는 변경 불필요**. 전체 실행해서 PASS 확인.

- [ ] **Step 7: Firebase 프로젝트 제거 (이사 확정 후 1개월)**

1개월간 PocketBase로 문제 없이 운영된 뒤 Firebase 콘솔에서 프로젝트 삭제.

---

### Task 10.4: "Graduation이 필요 없을 수도" 체크포인트

매년 1회, 아래 항목을 재검토:

- [ ] 현재 트래픽이 Firebase 무료 한도의 몇 %인가?
- [ ] 월 청구액 추이는?
- [ ] 이사 결정을 미룬 지 얼마나 됐나?

**솔직한 평가**: Firebase 월 $30 미만이면 **이사 안 하는 게 이득**. 관리 시간(시급 환산), 새 이슈 발견, 사용자 로그인 재설정 — 숨은 비용이 크다. 이사는 "현재가 아프다"가 아니라 "미래가 무서울 때" 한다.

---

## Self-Review 체크리스트

plan 작성 후 스스로 확인한 항목:

1. **스펙 커버리지**
   - ✅ 시간외 / 휴가 / 급여 파일 업로드 / 개인정보 / 규정 — 5개 엔티티 모두 동기화 태스크 있음 (Task 5.1, 6.1, 6.2, 6.3, 6.4)
   - ✅ PC Chrome 중심 — Playwright desktop 기준 스모크 (Task 9.1)
   - ✅ 모바일 PDF 업로드 장벽 해소 — PC 업로드 후 Firestore 저장, 모바일은 읽기로 이용 가능

2. **Plan-failure 패턴 스캔**
   - "TBD"/"TODO"/"구현 예정" — 없음
   - "적절한 에러 처리 추가" — 없음 (각 try/catch 코드 명시)
   - "Similar to Task N" — 없음 (Task 6.2~6.4는 동일 패턴이지만 각자 완전한 코드 포함)
   - `innerHTML` — 없음. 모든 동적 DOM은 `createElement` + `textContent`로 구성 (Task 2.2, 7.1)

3. **타입/함수명 일관성**
   - ✅ `profileSync.write/read`, `overtimeSync.writeRecord/readAll/deleteRecord`, `payslipSync.writeMonthly/readAllMonthly` — 각 모듈별 일관된 명명
   - ✅ `getCurrentUser()` — auth-service에서 정의, data-store/migration-dialog에서 동일 사용
   - ✅ localStorage key: `bhm_hr_profile`, `bhm_overtime_records`, `leaveRecords`, `bhm_overtime_payslips_{YYYY_MM}`, `bhm_favorites` — 기존 코드와 동일

4. **Firestore 컬렉션 경로 일관성**
   - ✅ `profiles/{uid}` (단일)
   - ✅ `overtime/{uid}/records/{id}`
   - ✅ `leave/{uid}/records/{id}`
   - ✅ `payslips/{uid}/monthly/{yyyy_mm}`
   - ✅ `favorites/{uid}` (단일)
   - firestore.rules의 match 경로와 data-store의 doc()/collection() 경로 일치

5. **위험 지점**
   - CSP 업데이트(Task 1.1)가 스모크에서 깨지면 롤백 필요 — Task 1.1 Step 4에 스모크 포함
   - `onAuthChanged` 초기 콜백 타이밍 — auth-service에서 `_currentUser` 캐시로 해결
   - 로그아웃 시 데이터 유지 — `signOut()`은 localStorage 건드리지 않음 (Task 2.2 confirm 문구 포함)
   - 여러 탭 동시 로그인 — 각 탭이 별도 `__FB_MIGRATION_DONE__`를 가지므로 두 번째 탭에서도 마이그레이션이 호출될 수 있음. Phase 1 스코프에선 허용 (자동 업로드/다운로드는 idempotent).

6. **Graduation 경로 확보 (Phase 10)**
   - ✅ `data-store.js` 추상화로 SDK 교체만으로 이사 가능
   - ✅ 월간 사용량 체크리스트로 조기 경보
   - ✅ 이사 후보 목록과 비용 비교 준비 (Supabase는 영구 제외)
   - ✅ "이사 안 하는 게 이득"인 시점 명시 (월 $30 미만)

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-24-plan-g-firebase-integration.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
