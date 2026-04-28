# Phase 8.0 — Firebase Auth (Email + Google) + Firestore Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** snuhmate.com 에 Firebase Auth (Email + Google) + Firestore (서울 리전) 양방향 동기화를 도입한다. 게스트 모드 0 회귀 + 8개 탭 모든 데이터 인벤토리 빠짐없이 매핑 + identity/payroll 분리 + 카테고리별 마이그레이션 다이얼로그.

**Architecture:**
- **SDK 로딩**: Firebase v10 modular ESM, **gstatic.com CDN 직접 import** (Plan G 패턴 + 기존 pdf.js/xlsx CDN 패턴 일관). 번들러 의존성 0.
- **Source-of-truth**: localStorage 가 게스트 모드의 SoT. 로그인 시 Firestore 가 authoritative + Firestore offline persistence 가 IndexedDB 캐시.
- **Region**: `asia-northeast3` (Seoul). PIPA 국외이전 동의 회피.
- **PDF**: 본 plan 범위 외 (Plan B / Phase 8.1 에서 Drive 이전). Phase 8.0 은 파싱 결과만 Firestore.
- **카카오 / Apple / 네이버**: Phase 8.1 (Plan B). 본 plan 은 Email + Google 만.
- **Hosting**: Cloudflare Pages 그대로. Firebase Hosting 미활성.
- **Security**: `request.auth.uid == userId` strict only. admin 백도어 0.
- **DOM 안전성**: 모든 동적 UI 는 `createElement` + `textContent` + `setAttribute` (innerHTML 금지 — XSS 회피).

**Tech Stack:**
- Firebase v10.12.0 modular SDK (ESM from `https://www.gstatic.com/firebasejs/10.12.0/`)
- Firebase Auth: Email/Password + Google (`signInWithPopup`)
- Firestore: asia-northeast3, offline persistence (IndexedDB)
- Vitest (단위 + 통합) + Playwright (스모크) — 기존 러너
- `firebase-tools` CLI (rules 배포 전용, devDependency)

**Out of Scope (Plan B / Phase 8.1):**
- 카카오 로그인 (Cloud Function Custom Token)
- Cloud Functions 일반
- Drive PDF 이전 (`snuhmate/{YYYY}/`)
- Apple / 네이버 로그인
- Blaze plan 전환

---

## ASSUMPTIONS (확인 필요)

1. **Spark plan 무료 티어로 시작** — Plan A 는 Cloud Functions 없음 → Spark 충분.
2. **Cloudflare Pages env var injection 가능** — `PUBLIC_FIREBASE_*` 환경 변수.
3. **Firestore Spark 일일 한도 충분** — 초기 < 100명 기준.
4. **AppLock PIN 은 device-local 유지** — Firebase 신원과 독립.
5. **Plan G 작업물은 메인에 미반영** (실행되지 않은 plan).

---

## File Structure

### 신규 파일
```
firebase.json                                 # Firestore + (Plan B에서 Functions 추가)
.firebaserc                                   # Project alias
firestore.rules                               # Security Rules (strict)
firestore.indexes.json                        # 복합 인덱스
firebase/                                     # 클라이언트 Firebase 모듈 (apps/web 외부, 공용)
  firebase-init.js                            # App 초기화 싱글톤
  auth-service.js                             # Email/Password + Google
  auth-ui.js                                  # 헤더 로그인/로그아웃 UI
  key-registry.js                             # localStorage key ↔ Firestore path 매핑
  migration-dialog.js                         # 카테고리별 업로드 다이얼로그
  sync/
    profile-sync.js                           # identity/payroll 분리 sync
    work-history-sync.js
    overtime-sync.js
    leave-sync.js
    payslip-sync.js                           # 파싱 결과 (Drive PDF는 Plan B)
    favorites-sync.js
    settings-sync.js
tests/integration/firebase/
  key-registry.test.js
  firebase-init.test.js
  auth-service.test.js
  profile-sync.test.js
  migration-dialog.test.js
  guest-mode-zero-regression.test.js
  inventory-coverage.test.js
  security-rules.test.js
tests/unit/firebase/
  user-storage-key.test.js
tests/e2e/
  phase8-firebase-smoke.spec.js
```

### 수정 파일
```
apps/web/src/client/inline-ui-helpers.js      # getUserStorageKey 정의 추가 (Task 0.1)
apps/web/src/client/config.js                 # Firebase config 추가
apps/web/src/client/app.js                    # Firebase bootstrap 호출
apps/web/src/components/tabs/SettingsIsland.astro  # 로그인 UI mount
packages/profile/src/profile.js               # identity/payroll 분리 + sync hook
packages/profile/src/work-history.js          # sync hook
packages/profile/src/overtime.js              # sync hook
packages/profile/src/leave.js                 # sync hook
packages/profile/src/payroll.js               # sync hook
apps/web/src/client/regulation.js             # favorites sync hook
```

---

## Task 0: Prerequisite — 잠복 버그 fix + 데이터 검증

### Task 0.1: `getUserStorageKey` 정의 추가 + 회귀 가드

**Files:**
- Modify: `apps/web/src/client/inline-ui-helpers.js` (최상단 IIFE 안)
- Test: `tests/unit/firebase/user-storage-key.test.js`

**Why:** `apps/web/`, `packages/` 어디에도 `window.getUserStorageKey =` 정의가 없음 (grep 검증). 모든 호출은 fallback (`base + '_guest'`) 으로만 동작 → user-scoped 분리가 작동하지 않음. Phase 8 전 fix 필수.

- [ ] **Step 1: 실패 테스트 작성**

```javascript
// tests/unit/firebase/user-storage-key.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('window.getUserStorageKey', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      _store: {},
      getItem(k) { return this._store[k] ?? null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
    });
    delete window.__firebaseUid;
  });

  it('게스트(미로그인) 시 base + "_guest" 반환', async () => {
    await import('../../../apps/web/src/client/inline-ui-helpers.js');
    expect(window.getUserStorageKey('snuhmate_hr_profile')).toBe('snuhmate_hr_profile_guest');
  });

  it('로그인 (window.__firebaseUid 설정) 시 base + "_uid_<uid>" 반환', async () => {
    window.__firebaseUid = 'abc123';
    await import('../../../apps/web/src/client/inline-ui-helpers.js');
    expect(window.getUserStorageKey('snuhmate_hr_profile')).toBe('snuhmate_hr_profile_uid_abc123');
  });

  it('uid 변경 시 즉시 반영', async () => {
    await import('../../../apps/web/src/client/inline-ui-helpers.js');
    expect(window.getUserStorageKey('overtimeRecords')).toBe('overtimeRecords_guest');
    window.__firebaseUid = 'xyz789';
    expect(window.getUserStorageKey('overtimeRecords')).toBe('overtimeRecords_uid_xyz789');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/unit/firebase/user-storage-key.test.js`
Expected: FAIL — `window.getUserStorageKey is not a function`

- [ ] **Step 3: 정의 추가 — `inline-ui-helpers.js` 최상단**

`apps/web/src/client/inline-ui-helpers.js` 의 IIFE `(function () { 'use strict';` 직후 (테마 처리 직전) 에 추가:

```javascript
  // ── Phase 8: user-scoped storage key wrapper ──
  // Guest 모드: base + '_guest' / 로그인: base + '_uid_<uid>'
  // window.__firebaseUid 는 firebase/auth-service.js 의 onAuthChanged 에서 설정/해제
  window.getUserStorageKey = function (base) {
    var uid = window.__firebaseUid;
    if (uid && typeof uid === 'string' && uid.length > 0) {
      return base + '_uid_' + uid;
    }
    return base + '_guest';
  };

  // recordLocalEdit: localStorage write 시 lastEdit 메타 기록 (LWW 비교용)
  window.recordLocalEdit = function (base) {
    try {
      var key = 'snuhmate_last_edit_' + base;
      localStorage.setItem(key, new Date().toISOString());
    } catch (e) { /* noop */ }
  };
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/unit/firebase/user-storage-key.test.js`
Expected: PASS — 3 케이스

- [ ] **Step 5: 게스트 모드 회귀 가드**

Run: `npm run test:unit && npm run test:integration`
Expected: PASS — 모든 기존 테스트

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/client/inline-ui-helpers.js tests/unit/firebase/user-storage-key.test.js
git commit -m "fix(phase8-task0): add window.getUserStorageKey definition

Phase 8 prerequisite — defines window.getUserStorageKey wrapper that all
modules depend on. Was missing entirely; all callers fell back to '_guest'
suffix making user-scoped separation non-functional.

Adds window.recordLocalEdit for LWW conflict resolution metadata.

Refs: docs/superpowers/specs/2026-04-29-phase8-firebase-auth.md §4.1"
```

---

### Task 0.2: Production sample localStorage dump 분석

**Files:**
- Create: `scripts/dump-localstorage-keys.html`
- Create: `docs/superpowers/specs/2026-04-29-phase8-localstorage-dump.md`

**Why:** SPEC §4.3 — `bhm_*` 잔존 키 또는 prefix 없는 누락 키 검증.

- [ ] **Step 1: 덤프 도구 작성 (DOM API only)**

`scripts/dump-localstorage-keys.html`:

```html
<!doctype html>
<html><head><meta charset="utf-8"><title>SNUH Mate localStorage Dump</title></head>
<body>
<h1>localStorage 키 덤프</h1>
<p>이 페이지를 snuhmate.com 콘솔에서 열고 출력된 텍스트를 회신하세요.</p>
<pre id="out"></pre>
<script>
(function () {
  var keys = [];
  for (var i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
  keys.sort();
  var lines = ['KEY\tSIZE\tPREVIEW'];
  keys.forEach(function (k) {
    var v = localStorage.getItem(k) || '';
    var size = v.length;
    var preview = v.length > 80 ? v.slice(0, 80) + '...(+' + (v.length - 80) + ')' : v;
    lines.push(k + '\t' + size + '\t' + preview);
  });
  lines.push('\nTOTAL: ' + keys.length + ' keys');
  document.getElementById('out').textContent = lines.join('\n');
})();
</script>
</body></html>
```

- [ ] **Step 2: production 샘플 5명 수집 (사용자 수동)**

owner 가 5명 베타 사용자에게 dump 도구 공유 → 회수된 텍스트를 `docs/superpowers/specs/2026-04-29-phase8-localstorage-dump.md` 에 paste.

- [ ] **Step 3: 누락 키 분석 + 문서화**

수집 결과를 다음 형식으로 기록:

```markdown
# Phase 8 — production localStorage dump 분석

## 수집 시점: 2026-MM-DD (5명 sample)

### A. snuhmate_* (정규화 완료)
- snuhmate_hr_profile_guest (5/5)
- ...

### B. bhm_* (legacy — 마이그레이션 누락)
- bhm_xxx: N/5 → Task 0.3 추가

### C. prefix 없음
- overtimeRecords (5/5), otManualHourly (3/5), ...

### D. orphan
- ???: N/5 → 폐기 또는 등록
```

- [ ] **Step 4: Commit**

```bash
git add scripts/dump-localstorage-keys.html docs/superpowers/specs/2026-04-29-phase8-localstorage-dump.md
git commit -m "docs(phase8-task0): localStorage dump tool + production analysis"
```

---

### Task 0.3: 누락된 legacy `bhm_*` 마이그레이션 추가

**Files:**
- Modify: `apps/web/src/client/inline-ui-helpers.js`
- Test: `tests/integration/legacy-bhm-migration.test.js`

> **Prerequisite**: Task 0.2 분석 완료 후 실행. 누락 키 목록이 비어있으면 이 task skip 가능.

- [ ] **Step 1: 실패 테스트 작성 (Task 0.2 결과 기반)**

```javascript
// tests/integration/legacy-bhm-migration.test.js
import { describe, it, expect, beforeEach } from 'vitest';

describe('legacy bhm_* 마이그레이션 — Task 0.2 발견 키', () => {
  beforeEach(() => { localStorage.clear(); });

  it('Task 0.2 발견 누락 키들이 모두 새 키로 이동', async () => {
    // ↓ Task 0.2 결과로 채울 것 (예시)
    localStorage.setItem('bhm_overtimeRecords', '[{"d":"2026-01-01"}]');
    await import('../../apps/web/src/client/inline-ui-helpers.js');
    expect(localStorage.getItem('bhm_overtimeRecords')).toBeNull();
    expect(localStorage.getItem('overtimeRecords')).toBe('[{"d":"2026-01-01"}]');
  });

  it('이미 새 키 존재 시 덮어쓰지 않음 (idempotent)', async () => {
    localStorage.setItem('bhm_overtimeRecords', 'OLD');
    localStorage.setItem('overtimeRecords', 'NEW');
    await import('../../apps/web/src/client/inline-ui-helpers.js');
    expect(localStorage.getItem('overtimeRecords')).toBe('NEW');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/integration/legacy-bhm-migration.test.js`
Expected: FAIL

- [ ] **Step 3: 마이그레이션 맵 확장**

`apps/web/src/client/inline-ui-helpers.js` 의 기존 `migrateMap` 배열에 추가 (Task 0.2 결과 기반):

```javascript
    var migrateMap = [
      ['bhm_settings', 'snuhmate_settings'],
      ['bhm_local_uid', 'snuhmate_local_uid'],
      ['bhm_deviceId', 'snuhmate_device_id'],
      ['bhm_anon_id', 'snuhmate_anon_id'],
      ['bhm_demo_mode', 'snuhmate_demo_mode'],
      ['bhm_debug_parser', 'snuhmate_debug_parser'],
      ['bhm_leave_migrated_v1', 'snuhmate_leave_migrated_v1'],
      // Task 0.3 추가 — Task 0.2 결과 기반
      // ['bhm_overtimeRecords', 'overtimeRecords'],  ← 예시
    ];
```

- [ ] **Step 4: 테스트 + 회귀 + commit**

Run: `npx vitest run tests/integration/legacy-bhm-migration.test.js && npm run test:integration`
Expected: PASS

```bash
git add apps/web/src/client/inline-ui-helpers.js tests/integration/legacy-bhm-migration.test.js
git commit -m "feat(phase8-task0): extend bhm_* legacy migration coverage"
```

---

## Task 1: Firebase 콘솔 + firebase init

### Task 1.1: Firebase 콘솔 — Email/Password + Google 활성화 (사용자 수동)

- [ ] **Step 1: Authentication 활성화**

브라우저: https://console.firebase.google.com/project/snuhmate/authentication/providers
- **Email/Password** 활성 (Email link 옵션 OFF)
- **Google** 활성 — Project public name `SNUH 메이트`, support email `ultrasoundsonicboom@gmail.com`

- [ ] **Step 2: Users 탭 접근 가능 확인**

---

### Task 1.2: Firestore 데이터베이스 생성 (서울 리전, 사용자 수동)

- [ ] **Step 1: Firestore 생성**

브라우저: https://console.firebase.google.com/project/snuhmate/firestore
- Native mode
- Region: `asia-northeast3 (Seoul)` ← **변경 불가, 신중**
- Production mode (rules 잠긴 상태)

- [ ] **Step 2: Database → Data 탭 접근 가능 확인**

---

### Task 1.3: 로컬 firebase init

**Files:** `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`

- [ ] **Step 1: Firebase CLI 로그인 + 프로젝트 alias**

Run: `firebase projects:list`
Expected: `snuhmate` 표시

Run: `firebase use --add snuhmate`
Expected: `Now using project snuhmate`, `.firebaserc` 자동 생성

- [ ] **Step 2: firebase init firestore (interactive)**

Run: `firebase init firestore`

선택:
- Use existing project → `snuhmate`
- Rules file: `firestore.rules` (기본값)
- Indexes file: `firestore.indexes.json` (기본값)

생성된 `firebase.json` 검증:
```json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }
}
```

- [ ] **Step 3: 초기 stub rules (write-protected)**

`firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // Task 7 에서 strict rules 로 교체
    }
  }
}
```

- [ ] **Step 4: firestore.indexes.json 초기화**

`firestore.indexes.json`:
```json
{ "indexes": [], "fieldOverrides": [] }
```

- [ ] **Step 5: firebase-tools devDependency 추가**

`package.json` devDependencies 에 `"firebase-tools": "^13.0.0"` 추가.

Run: `pnpm install`
Expected: 설치 완료

- [ ] **Step 6: rules 배포 (stub)**

Run: `npx firebase deploy --only firestore:rules`
Expected: `Deploy complete!`

- [ ] **Step 7: Commit**

```bash
git add firebase.json .firebaserc firestore.rules firestore.indexes.json package.json pnpm-lock.yaml
git commit -m "chore(phase8-task1): firebase init (Firestore + stub rules)

- Project: snuhmate (asia-northeast3)
- Stub rules: deny all
- firebase-tools devDependency"
```

---

### Task 1.4: Firebase config — Cloudflare Pages env var injection

**Files:**
- Modify: `apps/web/src/client/config.js`

- [ ] **Step 1: Cloudflare Pages env vars 등록 (사용자 수동)**

https://dash.cloudflare.com → Pages → snuhmate → Settings → Environment Variables

**Production + Preview 두 환경 모두**:
```
PUBLIC_FIREBASE_API_KEY        = (Console → Project settings → Web app config 의 apiKey)
PUBLIC_FIREBASE_AUTH_DOMAIN    = snuhmate.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID     = snuhmate
PUBLIC_FIREBASE_STORAGE_BUCKET = snuhmate.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 914163950802
PUBLIC_FIREBASE_APP_ID         = (Console 의 appId)
```

> Firebase API key 는 **public** — 클라이언트 노출 정상. 보안은 Security Rules 가 담당.

- [ ] **Step 2: 로컬 `.env.local` (gitignored)**

`apps/web/.env.local`:
```
PUBLIC_FIREBASE_API_KEY=<actual-key>
PUBLIC_FIREBASE_AUTH_DOMAIN=snuhmate.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=snuhmate
PUBLIC_FIREBASE_STORAGE_BUCKET=snuhmate.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=914163950802
PUBLIC_FIREBASE_APP_ID=<actual-app-id>
```

확인: `cat .gitignore | grep -E "\.env"` → `.env.local` 패턴 포함

- [ ] **Step 3: config.js 에 firebaseConfig export 추가**

`apps/web/src/client/config.js` 에 추가:

```javascript
// ── Phase 8: Firebase config (Cloudflare env vars 주입) ──
// API key 는 public — Security Rules 로 보호.
export const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};
```

- [ ] **Step 4: 빌드 검증**

Run: `pnpm --filter @snuhmate/web build`
Expected: 성공

Run: `grep -r "PUBLIC_FIREBASE_API_KEY" apps/web/dist/`
Expected: 빈 결과 (변수가 실제 값으로 치환됨)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/client/config.js
git commit -m "feat(phase8-task1): firebaseConfig from Cloudflare env vars"
```

---

### Task 1.5: CSP 에 Firebase 도메인 추가

**Files:**
- Modify: `apps/web/src/layouts/BaseLayout.astro` (또는 CSP 설정 위치)
- Test: `tests/integration/csp-script-src.test.js`

- [ ] **Step 1: 현재 CSP 위치 확인**

Run: `grep -rn "Content-Security-Policy\|script-src\|connect-src" apps/web/src/layouts/ apps/web/src/pages/ apps/web/public/ 2>/dev/null | head -10`

- [ ] **Step 2: CSP 수정**

`script-src` 에 추가: `https://www.gstatic.com`

`connect-src` 에 추가:
```
https://www.googleapis.com
https://identitytoolkit.googleapis.com
https://securetoken.googleapis.com
https://firestore.googleapis.com
https://snuhmate.firebaseapp.com
https://*.firebaseio.com
```

`frame-src` 에 추가 (Google popup):
```
https://snuhmate.firebaseapp.com
https://accounts.google.com
```

- [ ] **Step 3: CSP 검증 테스트 추가**

`tests/integration/csp-script-src.test.js` 에 추가:

```javascript
it('CSP 에 Firebase 도메인 포함 (Phase 8)', async () => {
  const html = await readBuiltHtml();
  const csp = extractCsp(html);
  expect(csp['script-src']).toContain('https://www.gstatic.com');
  expect(csp['connect-src']).toContain('https://firestore.googleapis.com');
  expect(csp['connect-src']).toContain('https://identitytoolkit.googleapis.com');
});
```

> helper (`readBuiltHtml`, `extractCsp`) 가 기존 파일에 없으면 inline 정의:
> ```javascript
> const fs = await import('fs');
> async function readBuiltHtml() {
>   return fs.readFileSync('apps/web/dist/index.html', 'utf-8');
> }
> function extractCsp(html) {
>   const m = html.match(/Content-Security-Policy['"]\s+content=['"]([^'"]+)/);
>   if (!m) return {};
>   const out = {};
>   m[1].split(';').forEach(d => {
>     const [k, ...v] = d.trim().split(/\s+/);
>     if (k) out[k] = v;
>   });
>   return out;
> }
> ```

- [ ] **Step 4: 빌드 + 테스트**

Run: `pnpm --filter @snuhmate/web build && npx vitest run tests/integration/csp-script-src.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/layouts/BaseLayout.astro tests/integration/csp-script-src.test.js
git commit -m "feat(phase8-task1): CSP allows Firebase + gstatic origins"
```

---

## Task 2: Firebase init 모듈

### Task 2.1: `firebase/firebase-init.js`

**Files:**
- Create: `firebase/firebase-init.js`
- Test: `tests/integration/firebase/firebase-init.test.js`

- [ ] **Step 1: 실패 테스트 작성**

```javascript
// tests/integration/firebase/firebase-init.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js', () => ({
  initializeApp: () => ({ name: 'mock-app' }),
}));
vi.mock('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js', () => ({
  getAuth: () => ({ name: 'mock-auth' }),
}));
vi.mock('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js', () => ({
  initializeFirestore: () => ({ name: 'mock-db' }),
  persistentLocalCache: (o) => o,
  persistentMultipleTabManager: () => ({}),
  getFirestore: () => ({ name: 'mock-db' }),
}));

describe('firebase-init', () => {
  beforeEach(async () => {
    const m = await import('../../../firebase/firebase-init.js');
    m.resetFirebaseForTest();
  });

  it('initFirebase() 호출 시 app/auth/db 노출', async () => {
    const { initFirebase } = await import('../../../firebase/firebase-init.js');
    const r = await initFirebase({ apiKey: 'k', authDomain: 'a', projectId: 'p',
      storageBucket: 's', messagingSenderId: 'm', appId: 'i' });
    expect(r.app).toBeDefined();
    expect(r.auth).toBeDefined();
    expect(r.db).toBeDefined();
  });

  it('두 번째 호출은 동일 인스턴스 (싱글톤)', async () => {
    const { initFirebase } = await import('../../../firebase/firebase-init.js');
    const cfg = { apiKey: 'k', authDomain: 'a', projectId: 'p',
      storageBucket: 's', messagingSenderId: 'm', appId: 'i' };
    const a = await initFirebase(cfg);
    const b = await initFirebase(cfg);
    expect(a.app).toBe(b.app);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/integration/firebase/firebase-init.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: `firebase/firebase-init.js` 작성**

```javascript
// firebase/firebase-init.js — Firebase App/Auth/Firestore 싱글톤
//
// SDK 로딩: gstatic.com CDN ESM (번들러 의존성 0, 기존 pdf.js/xlsx 패턴)
// Region: asia-northeast3 (Firestore 콘솔 생성 시 결정됨)
// Offline: persistentLocalCache + multiTab manager

const FIREBASE_VERSION = '10.12.0';
const SDK_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

let _initPromise = null;

export function initFirebase(config) {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const [appMod, authMod, firestoreMod] = await Promise.all([
      import(`${SDK_BASE}/firebase-app.js`),
      import(`${SDK_BASE}/firebase-auth.js`),
      import(`${SDK_BASE}/firebase-firestore.js`),
    ]);

    const app = appMod.initializeApp(config);
    const auth = authMod.getAuth(app);

    let db;
    try {
      db = firestoreMod.initializeFirestore(app, {
        localCache: firestoreMod.persistentLocalCache({
          tabManager: firestoreMod.persistentMultipleTabManager(),
        }),
      });
    } catch (e) {
      db = firestoreMod.getFirestore(app);
    }

    return { app, auth, db, authMod, firestoreMod };
  })();
  return _initPromise;
}

export function resetFirebaseForTest() {
  _initPromise = null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/integration/firebase/firebase-init.test.js`
Expected: PASS — 2 케이스

- [ ] **Step 5: Commit**

```bash
git add firebase/firebase-init.js tests/integration/firebase/firebase-init.test.js
git commit -m "feat(phase8-task2): firebase-init.js singleton (gstatic CDN ESM)"
```

---

### Task 2.2: `apps/web/src/client/app.js` — Firebase bootstrap

**Files:**
- Modify: `apps/web/src/client/app.js`

- [ ] **Step 1: app.js 진입점 위치 식별**

Run: `head -50 apps/web/src/client/app.js`

- [ ] **Step 2: import + bootstrap 추가**

`app.js` 상단:

```javascript
import { initFirebase } from '../../../../firebase/firebase-init.js';
import { firebaseConfig } from './config.js';
```

페이지 로드 후 (DOMContentLoaded 콜백 또는 적절한 진입점 안):

```javascript
// Phase 8: Firebase 초기화 (게스트 모드 0 영향)
(async function bootstrapFirebase() {
  if (!firebaseConfig.apiKey) {
    console.warn('[Phase 8] PUBLIC_FIREBASE_* 미설정 — Firebase 비활성');
    return;
  }
  try {
    await initFirebase(firebaseConfig);
  } catch (e) {
    console.error('[Phase 8] Firebase init 실패', e);
  }
})();
```

- [ ] **Step 3: 빌드 + 게스트 모드 회귀**

Run: `pnpm --filter @snuhmate/web build && npm run test:integration`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/client/app.js
git commit -m "feat(phase8-task2): bootstrap Firebase on page load"
```

---

## Task 3: Auth Service + UI

### Task 3.1: `firebase/auth-service.js`

**Files:**
- Create: `firebase/auth-service.js`
- Test: `tests/integration/firebase/auth-service.test.js`

- [ ] **Step 1: 실패 테스트 작성**

```javascript
// tests/integration/firebase/auth-service.test.js
import { describe, it, expect } from 'vitest';

describe('auth-service', () => {
  it('Email + Google + onAuthChanged 함수 export', async () => {
    const mod = await import('../../../firebase/auth-service.js');
    expect(typeof mod.signInWithEmail).toBe('function');
    expect(typeof mod.signUpWithEmail).toBe('function');
    expect(typeof mod.signInWithGoogle).toBe('function');
    expect(typeof mod.signOutUser).toBe('function');
    expect(typeof mod.onAuthChanged).toBe('function');
    expect(typeof mod.getCurrentUser).toBe('function');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/integration/firebase/auth-service.test.js`
Expected: FAIL

- [ ] **Step 3: `firebase/auth-service.js` 작성**

```javascript
// firebase/auth-service.js — Email/Password + Google Auth
//
// onAuthChanged: window.__firebaseUid 동기화 (getUserStorageKey 가 참조)
// 신규 로그인 시 → migration-dialog.shouldShowMigration 검사 후 dialog
// app:auth-changed 이벤트로 다른 모듈에 통보

import { initFirebase } from './firebase-init.js';
import { firebaseConfig } from '../apps/web/src/client/config.js';

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return _firebase;
}

export async function signInWithEmail(email, password) {
  const { auth, authMod } = await _f();
  const cred = await authMod.signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signUpWithEmail(email, password) {
  const { auth, authMod } = await _f();
  const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle() {
  const { auth, authMod } = await _f();
  const provider = new authMod.GoogleAuthProvider();
  const cred = await authMod.signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutUser() {
  const { auth, authMod } = await _f();
  await authMod.signOut(auth);
}

export async function onAuthChanged(callback) {
  const { auth, authMod } = await _f();
  return authMod.onAuthStateChanged(auth, async (user) => {
    if (user) {
      window.__firebaseUid = user.uid;
      // 신규 로그인 — migration dialog 검사 (Task 8 에서 정의)
      try {
        const mig = await import('./migration-dialog.js');
        if (await mig.shouldShowMigration(user.uid)) {
          mig.openMigrationDialog(user.uid);
        }
      } catch (e) { /* migration 모듈 없으면 무시 (Plan 진행 중) */ }
    } else {
      delete window.__firebaseUid;
    }
    window.dispatchEvent(new CustomEvent('app:auth-changed', { detail: { user } }));
    if (typeof callback === 'function') callback(user);
  });
}

export async function getCurrentUser() {
  const { auth } = await _f();
  return auth.currentUser;
}
```

- [ ] **Step 4: 테스트 통과**

Run: `npx vitest run tests/integration/firebase/auth-service.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add firebase/auth-service.js tests/integration/firebase/auth-service.test.js
git commit -m "feat(phase8-task3): auth-service — Email + Google + onAuthChanged

window.__firebaseUid 동기화. 신규 로그인 시 migration dialog 트리거.
app:auth-changed 이벤트로 모듈 간 통보."
```

---

### Task 3.2: `firebase/auth-ui.js` — DOM 다이얼로그 (createElement only)

**Files:**
- Create: `firebase/auth-ui.js`

- [ ] **Step 1: DOM API only 다이얼로그 모듈**

```javascript
// firebase/auth-ui.js — 로그인/로그아웃 UI (createElement + textContent only)
//
// non-pushy: URL 파라미터로 자동 오픈 금지 (메모리 §non-pushy UX).
// XSS 회피: 모든 동적 콘텐츠는 textContent, innerHTML 사용 금지.

import {
  signInWithEmail, signUpWithEmail, signInWithGoogle, signOutUser, onAuthChanged, getCurrentUser,
} from './auth-service.js';

const DIALOG_ID = 'snuhmateAuthDialog';

export function openAuthDialog() {
  if (document.getElementById(DIALOG_ID)) return;
  const overlay = _buildDialog();
  document.body.appendChild(overlay);
  const onKey = (e) => { if (e.key === 'Escape') closeAuthDialog(); };
  document.addEventListener('keydown', onKey);
  overlay._onKey = onKey;
}

export function closeAuthDialog() {
  const el = document.getElementById(DIALOG_ID);
  if (!el) return;
  if (el._onKey) document.removeEventListener('keydown', el._onKey);
  el.remove();
}

function _el(tag, attrs, children) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') e.className = v;
      else if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v);
    }
  }
  if (Array.isArray(children)) children.forEach(c => c && e.appendChild(c));
  else if (children) e.appendChild(children);
  return e;
}

function _buildDialog() {
  const overlay = _el('div', {
    id: DIALOG_ID,
    className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/50',
  });
  const panel = _el('div', { className: 'bg-white rounded-lg p-6 max-w-sm w-full shadow-xl' });

  panel.appendChild(_el('h2', { className: 'text-lg font-semibold mb-4', text: 'SNUH 메이트 로그인' }));

  const googleBtn = _el('button', {
    type: 'button', id: 'snuhmateGoogleBtn',
    className: 'w-full mb-3 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50',
    text: 'Google 로 로그인',
  });
  panel.appendChild(googleBtn);

  panel.appendChild(_el('div', { className: 'text-xs text-gray-500 text-center my-3', text: '또는' }));

  const emailIn = _el('input', {
    type: 'email', id: 'snuhmateEmail', placeholder: '이메일',
    className: 'w-full mb-2 px-3 py-2 border border-gray-300 rounded',
  });
  const passIn = _el('input', {
    type: 'password', id: 'snuhmatePass', placeholder: '비밀번호 (6자 이상)',
    className: 'w-full mb-3 px-3 py-2 border border-gray-300 rounded',
  });
  panel.appendChild(emailIn);
  panel.appendChild(passIn);

  const signInBtn = _el('button', {
    type: 'button', id: 'snuhmateSignInBtn',
    className: 'w-full mb-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700',
    text: '이메일 로그인',
  });
  const signUpBtn = _el('button', {
    type: 'button', id: 'snuhmateSignUpBtn',
    className: 'w-full mb-3 px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50',
    text: '신규 가입',
  });
  panel.appendChild(signInBtn);
  panel.appendChild(signUpBtn);

  const errEl = _el('p', { id: 'snuhmateAuthErr', className: 'text-xs text-red-600 mb-2 hidden' });
  panel.appendChild(errEl);

  const closeBtn = _el('button', {
    type: 'button', id: 'snuhmateAuthClose',
    className: 'w-full px-4 py-2 text-gray-500 hover:text-gray-700',
    text: '취소',
  });
  panel.appendChild(closeBtn);

  overlay.appendChild(panel);

  const setErr = (msg) => {
    if (msg) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
    else { errEl.textContent = ''; errEl.classList.add('hidden'); }
  };
  const prettyErr = (e) => {
    const code = e?.code || '';
    if (code === 'auth/invalid-credential') return '이메일/비밀번호 불일치';
    if (code === 'auth/weak-password') return '비밀번호 6자 이상';
    if (code === 'auth/email-already-in-use') return '이미 가입된 이메일 — 로그인 시도';
    if (code === 'auth/popup-closed-by-user') return '로그인 창이 닫힘';
    return code || ('로그인 실패: ' + (e?.message || ''));
  };

  googleBtn.addEventListener('click', async () => {
    setErr('');
    try { await signInWithGoogle(); closeAuthDialog(); }
    catch (e) { setErr(prettyErr(e)); }
  });
  signInBtn.addEventListener('click', async () => {
    setErr('');
    try { await signInWithEmail(emailIn.value.trim(), passIn.value); closeAuthDialog(); }
    catch (e) { setErr(prettyErr(e)); }
  });
  signUpBtn.addEventListener('click', async () => {
    setErr('');
    try { await signUpWithEmail(emailIn.value.trim(), passIn.value); closeAuthDialog(); }
    catch (e) { setErr(prettyErr(e)); }
  });
  closeBtn.addEventListener('click', closeAuthDialog);

  return overlay;
}

export async function refreshAuthPill(pillEl) {
  if (!pillEl) return;
  const user = await getCurrentUser();
  if (user) {
    pillEl.textContent = user.email || (user.displayName || '로그인됨');
    pillEl.dataset.signedIn = '1';
  } else {
    pillEl.textContent = '로그인';
    pillEl.dataset.signedIn = '0';
  }
}

export async function logout() {
  await signOutUser();
}

export function bindAuthPill(pillEl) {
  refreshAuthPill(pillEl);
  onAuthChanged(() => refreshAuthPill(pillEl));
}
```

- [ ] **Step 2: SettingsIsland.astro 에 mount**

`apps/web/src/components/tabs/SettingsIsland.astro` 의 적절한 카드 영역에 추가 (정적 마크업이므로 Astro 가 server-render — XSS 위험 없음):

```astro
<div class="settings-card">
  <h3 class="text-base font-semibold mb-2">계정</h3>
  <div class="flex items-center gap-3">
    <span id="snuhmateAuthPill" class="px-3 py-1 rounded-full bg-gray-100 text-sm cursor-pointer">
      로그인
    </span>
    <button type="button" id="snuhmateLogoutBtn"
      class="text-xs text-gray-500 hover:text-gray-700 hidden">
      로그아웃
    </button>
  </div>
  <p class="text-xs text-gray-500 mt-2">
    로그인 시 다기기 동기화 + 클라우드 백업 활성. 게스트 모드도 100% 사용 가능.
  </p>
</div>

<script>
  import { openAuthDialog, bindAuthPill, logout } from '/firebase/auth-ui.js';
  document.addEventListener('DOMContentLoaded', () => {
    const pill = document.getElementById('snuhmateAuthPill');
    const logoutBtn = document.getElementById('snuhmateLogoutBtn');
    if (pill) {
      bindAuthPill(pill);
      pill.addEventListener('click', () => {
        if (pill.dataset.signedIn === '0') openAuthDialog();
      });
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => logout());
    }
    window.addEventListener('app:auth-changed', () => {
      const signedIn = pill?.dataset.signedIn === '1';
      if (signedIn) logoutBtn?.classList.remove('hidden');
      else logoutBtn?.classList.add('hidden');
    });
  });
</script>
```

> import path `/firebase/auth-ui.js` 는 빌드 결과 기준. 기존 import 패턴 (`'../../../../firebase/auth-ui.js'`) 따라 조정.

- [ ] **Step 3: 빌드 + Playwright MCP 스모크**

Run: `pnpm --filter @snuhmate/web build && pnpm --filter @snuhmate/web preview &`

Playwright MCP:
```
browser_navigate http://localhost:4321/?tab=settings
browser_snapshot
browser_console_messages   # 에러 0건
```

수동 검증: 로그인 pill 클릭 → 다이얼로그 → ESC 닫힘. Google 로그인 (popup) → pill 에 이메일 표시. 로그아웃 → pill "로그인" 복귀.

- [ ] **Step 4: Commit**

```bash
git add firebase/auth-ui.js apps/web/src/components/tabs/SettingsIsland.astro
git commit -m "feat(phase8-task3): auth UI — login dialog (DOM API only)

createElement + textContent + setAttribute 만 사용 (innerHTML 금지, XSS 회피).
SettingsIsland 계정 카드, ESC 닫힘, non-pushy (자동 오픈 금지)."
```

---

## Task 4: Key Registry 모듈

### Task 4.1: `firebase/key-registry.js`

**Files:**
- Create: `firebase/key-registry.js`
- Test: `tests/integration/firebase/key-registry.test.js`

- [ ] **Step 1: 실패 테스트 작성**

```javascript
// tests/integration/firebase/key-registry.test.js
import { describe, it, expect } from 'vitest';
import { KEY_REGISTRY, syncKeys, deviceLocalKeys, firestorePathFor, syncKeysByCategory, CATEGORIES }
  from '../../../firebase/key-registry.js';

describe('key-registry', () => {
  it('필수 키 모두 등록 (SPEC §3 인벤토리)', () => {
    const required = [
      'snuhmate_hr_profile',
      'snuhmate_work_history', 'snuhmate_work_history_seeded',
      'overtimeRecords', 'otManualHourly', 'overtimePayslipData',
      'leaveRecords',
      'snuhmate_settings', 'theme',
      'snuhmate_reg_favorites',
      'snuhmate_local_uid', 'snuhmate_anon_id', 'snuhmate_device_id',
      'snuhmate_demo_mode', 'snuhmate_debug_parser',
      'snuhmate_leave_migrated_v1',
    ];
    for (const k of required) expect(KEY_REGISTRY[k]).toBeDefined();
  });

  it('device-local 키는 firestorePath 없음', () => {
    expect(KEY_REGISTRY.snuhmate_local_uid.scope).toBe('device-local');
    expect(KEY_REGISTRY.snuhmate_local_uid.firestorePath).toBeUndefined();
  });

  it('sync 키는 firestorePath 함수 보유', () => {
    const path = firestorePathFor('snuhmate_hr_profile', 'abc');
    expect(path).toMatch(/users\/abc\/profile\/identity/);
  });

  it('Firestore path 충돌 0', () => {
    const seen = new Map();
    for (const [k, def] of Object.entries(KEY_REGISTRY)) {
      if (def.scope !== 'sync' || !def.firestorePath) continue;
      const samplePath = def.firestorePath('UID');
      if (seen.has(samplePath)) {
        // doc-merge 패턴은 동일 doc 공유 OK
        const otherKey = seen.get(samplePath);
        const a = def.shape, b = KEY_REGISTRY[otherKey].shape;
        const sharedDoc = (a === 'doc-merge' || b === 'doc-merge'
                       || a === 'split-identity-payroll' || b === 'split-identity-payroll');
        if (!sharedDoc) throw new Error(`충돌: ${k} ↔ ${otherKey} (${samplePath})`);
      } else {
        seen.set(samplePath, k);
      }
    }
  });

  it('CATEGORIES 7개', () => {
    expect(CATEGORIES).toHaveLength(7);
    expect(CATEGORIES).toEqual(expect.arrayContaining([
      'identity', 'payroll', 'overtime', 'leave', 'workHistory', 'settings', 'reference',
    ]));
  });

  it('syncKeysByCategory(identity) 에 profile 포함', () => {
    expect(syncKeysByCategory('identity')).toContain('snuhmate_hr_profile');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/integration/firebase/key-registry.test.js`
Expected: FAIL

- [ ] **Step 3: `firebase/key-registry.js` 작성**

```javascript
// firebase/key-registry.js — Phase 8 단일 진실원천
//
// 모든 localStorage key 의 Firestore 매핑 정의. SPEC §3 인벤토리 도출.
// 새 localStorage 키 추가 시 → 여기 등록 필수.

export const KEY_REGISTRY = {
  // Profile (identity ↔ payroll 분리 — SPEC §3.4)
  'snuhmate_hr_profile': {
    scope: 'sync', shape: 'split-identity-payroll',
    firestorePath: (uid) => `users/${uid}/profile/identity`,
    payrollPath: (uid) => `users/${uid}/profile/payroll`,
    category: 'identity',
  },
  'snuhmate_work_history': {
    scope: 'sync', shape: 'collection-by-id',
    firestorePath: (uid) => `users/${uid}/work_history`,
    category: 'workHistory',
  },
  'snuhmate_work_history_seeded': {
    scope: 'sync', shape: 'doc-merge',
    firestorePath: (uid) => `users/${uid}/profile/identity`,
    fieldName: 'workHistorySeeded',
    category: 'workHistory',
  },
  // Overtime (SPEC §3.2)
  'overtimeRecords': {
    scope: 'sync', shape: 'collection-by-yyyymm',
    firestorePath: (uid) => `users/${uid}/overtime`,
    category: 'overtime',
  },
  'otManualHourly': {
    scope: 'sync', shape: 'doc-merge',
    firestorePath: (uid) => `users/${uid}/profile/payroll`,
    fieldName: 'manualHourly',
    category: 'payroll',
  },
  'overtimePayslipData': {
    scope: 'sync', shape: 'collection-by-id',
    firestorePath: (uid) => `users/${uid}/payslips`,
    category: 'payroll',
  },
  // Leave (SPEC §3.3)
  'leaveRecords': {
    scope: 'sync', shape: 'collection-by-yyyy',
    firestorePath: (uid) => `users/${uid}/leave/years`,
    category: 'leave',
  },
  // Settings (SPEC §3.6)
  'snuhmate_settings': {
    scope: 'sync', shape: 'doc',
    firestorePath: (uid) => `users/${uid}/settings/app`,
    category: 'settings',
  },
  'theme': {
    scope: 'sync', shape: 'doc-merge',
    firestorePath: (uid) => `users/${uid}/settings/app`,
    fieldName: 'theme',
    category: 'settings',
  },
  // Reference (SPEC §3.5)
  'snuhmate_reg_favorites': {
    scope: 'sync', shape: 'doc',
    firestorePath: (uid) => `users/${uid}/settings/reference`,
    category: 'reference',
  },
  // Device-local (sync 제외 — SPEC §3.6)
  'snuhmate_local_uid': { scope: 'device-local' },
  'snuhmate_anon_id': { scope: 'device-local' },
  'snuhmate_device_id': { scope: 'device-local' },
  'snuhmate_demo_mode': { scope: 'device-local' },
  'snuhmate_debug_parser': { scope: 'device-local' },
  'snuhmate_leave_migrated_v1': { scope: 'device-local' },
};

export const CATEGORIES = ['identity', 'payroll', 'overtime', 'leave', 'workHistory', 'settings', 'reference'];

export function allBaseKeys() { return Object.keys(KEY_REGISTRY); }

export function syncKeys() {
  return Object.entries(KEY_REGISTRY).filter(([, d]) => d.scope === 'sync').map(([k]) => k);
}

export function deviceLocalKeys() {
  return Object.entries(KEY_REGISTRY).filter(([, d]) => d.scope === 'device-local').map(([k]) => k);
}

export function firestorePathFor(baseKey, uid) {
  const def = KEY_REGISTRY[baseKey];
  if (!def || def.scope !== 'sync' || !def.firestorePath) return null;
  return def.firestorePath(uid);
}

export function categoryOf(baseKey) {
  return KEY_REGISTRY[baseKey]?.category ?? null;
}

export function syncKeysByCategory(category) {
  return Object.entries(KEY_REGISTRY)
    .filter(([, d]) => d.scope === 'sync' && d.category === category)
    .map(([k]) => k);
}
```

- [ ] **Step 4: 테스트 통과**

Run: `npx vitest run tests/integration/firebase/key-registry.test.js`
Expected: PASS — 6 케이스

- [ ] **Step 5: Commit**

```bash
git add firebase/key-registry.js tests/integration/firebase/key-registry.test.js
git commit -m "feat(phase8-task4): key-registry — single source of truth

SPEC §3 인벤토리 100% 매핑 + 7 카테고리 + path 충돌 0 검증."
```

---

## Task 5: Profile identity/payroll 분리 + Sync

### Task 5.1: `firebase/sync/profile-sync.js`

**Files:**
- Create: `firebase/sync/profile-sync.js`
- Test: `tests/integration/firebase/profile-sync.test.js`

- [ ] **Step 1: 실패 테스트 작성**

```javascript
// tests/integration/firebase/profile-sync.test.js
import { describe, it, expect } from 'vitest';
import { _splitFields, writeProfile, readProfile } from '../../../firebase/sync/profile-sync.js';

function _mockDb() {
  const store = {};
  return {
    _store: store,
    _writeDoc: (path, data) => { store[path] = { ...(store[path] || {}), ...data }; },
    _readDoc: (path) => store[path] || null,
  };
}

describe('profile-sync — identity/payroll split', () => {
  it('_splitFields 분리', () => {
    const profile = {
      name: '김간호', employeeId: 'E001', department: '내과', position: '대리', hireDate: '2020-01-01',
      hourlyWage: 15000, annualSalary: 50000000, allowancePolicy: 'A', manualHourly: 16000,
    };
    const { identity, payroll } = _splitFields(profile);
    expect(identity.name).toBe('김간호');
    expect(identity.employeeId).toBe('E001');
    expect(identity.hourlyWage).toBeUndefined();
    expect(payroll.hourlyWage).toBe(15000);
    expect(payroll.annualSalary).toBe(50000000);
    expect(payroll.name).toBeUndefined();
  });

  it('write/read 라운드트립으로 원본 복원', async () => {
    const db = _mockDb();
    const original = { name: '박', employeeId: 'E2', department: '응급실', hourlyWage: 17000, manualHourly: 18000 };
    await writeProfile(db, 'uid1', original);
    const restored = await readProfile(db, 'uid1');
    expect(restored).toEqual(expect.objectContaining(original));
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/integration/firebase/profile-sync.test.js`
Expected: FAIL

- [ ] **Step 3: `firebase/sync/profile-sync.js` 작성**

```javascript
// firebase/sync/profile-sync.js — identity ↔ payroll 분리 sync
//
// SPEC §3.4 — snuhmate_hr_profile 한 doc 의 필드를 두 그룹으로 나눔.
// localStorage 는 합쳐진 shape 그대로 (UI 영향 0), Firestore 는 분리 저장.

import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../apps/web/src/client/config.js';

const IDENTITY_FIELDS = [
  'name', 'employeeId', 'department', 'position', 'hireDate',
  'jobLevel', 'rank', 'workHistorySeeded',
];
const PAYROLL_FIELDS = [
  'hourlyWage', 'annualSalary', 'allowancePolicy', 'manualHourly',
  'paymentDay', 'baseHours', 'paymentType',
];

export function _splitFields(profile) {
  if (!profile || typeof profile !== 'object') return { identity: {}, payroll: {} };
  const identity = {};
  const payroll = {};
  for (const [k, v] of Object.entries(profile)) {
    if (IDENTITY_FIELDS.includes(k)) identity[k] = v;
    else if (PAYROLL_FIELDS.includes(k)) payroll[k] = v;
    else identity[k] = v;  // 알려지지 않은 필드 → identity 보존
  }
  return { identity, payroll };
}

export async function writeProfile(dbOrNull, uid, profile) {
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _testMod() }
    : await _f();
  const { identity, payroll } = _splitFields(profile);
  const ts = firestoreMod.serverTimestamp ? firestoreMod.serverTimestamp() : Date.now();
  const idRef = firestoreMod.doc(db, `users/${uid}/profile/identity`);
  const pyRef = firestoreMod.doc(db, `users/${uid}/profile/payroll`);
  await Promise.all([
    firestoreMod.setDoc(idRef, { ...identity, lastEditAt: ts }, { merge: true }),
    firestoreMod.setDoc(pyRef, { ...payroll, lastEditAt: ts }, { merge: true }),
  ]);
}

export async function readProfile(dbOrNull, uid) {
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _testMod() }
    : await _f();
  const idRef = firestoreMod.doc(db, `users/${uid}/profile/identity`);
  const pyRef = firestoreMod.doc(db, `users/${uid}/profile/payroll`);
  const [idSnap, pySnap] = await Promise.all([
    firestoreMod.getDoc(idRef),
    firestoreMod.getDoc(pyRef),
  ]);
  const id = idSnap.exists() ? idSnap.data() : {};
  const py = pySnap.exists() ? pySnap.data() : {};
  const merged = { ...id, ...py };
  delete merged.lastEditAt;
  return Object.keys(merged).length > 0 ? merged : null;
}

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return { db: _firebase.db, firestoreMod: _firebase.firestoreMod };
}

function _testMod() {
  return {
    doc: (db, path) => ({ _db: db, _path: path }),
    setDoc: async (ref, data) => { ref._db._writeDoc(ref._path, data); },
    getDoc: async (ref) => {
      const data = ref._db._readDoc(ref._path);
      return { exists: () => data !== null, data: () => data };
    },
    serverTimestamp: () => Date.now(),
  };
}
```

- [ ] **Step 4: 테스트 통과**

Run: `npx vitest run tests/integration/firebase/profile-sync.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add firebase/sync/profile-sync.js tests/integration/firebase/profile-sync.test.js
git commit -m "feat(phase8-task5): profile-sync — identity/payroll Firestore split

SPEC §3.4 — Firestore 식별/급여 분리 저장.
localStorage 는 기존 shape 유지 (UI 영향 0). 라운드트립 검증."
```

---

### Task 5.2: `packages/profile/src/profile.js` — sync hook 통합

**Files:**
- Modify: `packages/profile/src/profile.js`

- [ ] **Step 1: 현재 PROFILE 객체 위치 식별**

Run: `grep -n "save\|load\|clear\|STORAGE_KEY" packages/profile/src/profile.js | head -20`

- [ ] **Step 2: cloud sync helper + save() / load() hook 추가**

`packages/profile/src/profile.js` 의 PROFILE 객체 안에 helper 추가:

```javascript
    // ── Phase 8: Firestore sync hook (로그인 시만, 실패 무해) ──
    async _syncWriteToCloud(profile) {
      try {
        if (typeof window === 'undefined' || !window.__firebaseUid) return;
        const mod = await import('/firebase/sync/profile-sync.js');
        await mod.writeProfile(null, window.__firebaseUid, profile);
      } catch (e) {
        console.warn('[Phase 8] profile cloud sync 실패 (무해)', e?.message || e);
      }
    },

    async _syncReadFromCloud() {
      try {
        if (typeof window === 'undefined' || !window.__firebaseUid) return null;
        const mod = await import('/firebase/sync/profile-sync.js');
        return await mod.readProfile(null, window.__firebaseUid);
      } catch (e) {
        console.warn('[Phase 8] profile cloud read 실패 (무해)', e?.message || e);
        return null;
      }
    },

    async _pullFromCloudOnce() {
      if (this.__pullingFromCloud) return;
      this.__pullingFromCloud = true;
      try {
        const cloud = await this._syncReadFromCloud();
        if (cloud) {
          const localRaw = localStorage.getItem(this.STORAGE_KEY);
          const localObj = localRaw ? JSON.parse(localRaw) : null;
          const useCloud = !localObj || (cloud.lastEditAt
            && (!localObj.lastEditAt || cloud.lastEditAt > localObj.lastEditAt));
          if (useCloud) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cloud));
            window.dispatchEvent(new CustomEvent('app:profile-updated', { detail: { source: 'cloud' } }));
          }
        }
      } finally { this.__pullingFromCloud = false; }
    },
```

기존 save() 의 마지막 줄 (`localStorage.setItem(this.STORAGE_KEY, ...)` 직후) 추가:

```javascript
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
        if (window.recordLocalEdit) window.recordLocalEdit('snuhmate_hr_profile');
        this._syncWriteToCloud(profile);  // ← Phase 8 추가
```

기존 load() 시작 부분 (마이그레이션 코드 직후):

```javascript
    load() {
      // ... 기존 lazy 마이그레이션
      // Phase 8: 로그인 사용자면 fire-and-forget cloud pull
      if (typeof window !== 'undefined' && window.__firebaseUid) {
        this._pullFromCloudOnce();
      }
      const raw = localStorage.getItem(this.STORAGE_KEY);
      // ... 기존 코드
    },
```

- [ ] **Step 3: 게스트 모드 회귀**

Run: `npm run test:integration -- tests/integration/profile-form-and-clear.test.js`
Expected: PASS

- [ ] **Step 4: 로그인 라운드트립 통합 테스트**

`tests/integration/firebase/profile-sync.test.js` 에 추가:

```javascript
import { vi } from 'vitest';

describe('PROFILE.save() Firestore hook', () => {
  it('로그인 시 _syncWriteToCloud 호출', async () => {
    window.__firebaseUid = 'user1';
    vi.doMock('/firebase/sync/profile-sync.js', () => ({
      writeProfile: vi.fn(), readProfile: vi.fn(async () => null),
    }));
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    const psMod = await import('/firebase/sync/profile-sync.js');
    PROFILE.save({ name: '테스트', hourlyWage: 10000 });
    await new Promise(r => setTimeout(r, 50));
    expect(psMod.writeProfile).toHaveBeenCalled();
  });

  it('게스트 (uid 없음) 시 cloud 호출 0', async () => {
    delete window.__firebaseUid;
    vi.doMock('/firebase/sync/profile-sync.js', () => ({
      writeProfile: vi.fn(), readProfile: vi.fn(async () => null),
    }));
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    const psMod = await import('/firebase/sync/profile-sync.js');
    PROFILE.save({ name: '게스트' });
    await new Promise(r => setTimeout(r, 50));
    expect(psMod.writeProfile).not.toHaveBeenCalled();
  });
});
```

Run: `npx vitest run tests/integration/firebase/profile-sync.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/profile/src/profile.js tests/integration/firebase/profile-sync.test.js
git commit -m "feat(phase8-task5): PROFILE.save()/load() Firestore sync hook

write-through on save (로그인만), LWW pull on load.
게스트 모드 0 영향 (가드 검증)."
```

---

## Task 6: 나머지 인벤토리 sync hooks

> **공통 패턴**: `firebase/sync/<entity>-sync.js` (Firestore read/write helpers) + 해당 모듈의 save/load 에 hook. Task 5 패턴 그대로 반복. 빠짐없이 검증 필수.

### Task 6.1: `work-history-sync.js`

**Files:**
- Create: `firebase/sync/work-history-sync.js`
- Modify: `packages/profile/src/work-history.js`
- Test: `tests/integration/firebase/work-history-sync.test.js`

**Shape**: `collection-by-id` — 각 entry 를 `users/{uid}/work_history/{entryId}` doc 으로.

- [ ] **Step 1: sync 모듈**

```javascript
// firebase/sync/work-history-sync.js
import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../apps/web/src/client/config.js';

let _f = null;
async function _fb() { if (!_f) _f = await initFirebase(firebaseConfig); return _f; }

export async function writeAllWorkHistory(uid, entries) {
  const { db, firestoreMod } = await _fb();
  const ts = firestoreMod.serverTimestamp();
  const batch = firestoreMod.writeBatch(db);
  for (const e of (entries || [])) {
    if (!e?.id) continue;
    const ref = firestoreMod.doc(db, `users/${uid}/work_history/${e.id}`);
    batch.set(ref, { ...e, lastEditAt: ts }, { merge: true });
  }
  await batch.commit();
}

export async function readAllWorkHistory(uid) {
  const { db, firestoreMod } = await _fb();
  const colRef = firestoreMod.collection(db, `users/${uid}/work_history`);
  const snap = await firestoreMod.getDocs(colRef);
  const out = [];
  snap.forEach(d => {
    const data = d.data();
    delete data.lastEditAt;
    out.push({ id: d.id, ...data });
  });
  return out;
}

export async function deleteWorkHistoryEntry(uid, entryId) {
  const { db, firestoreMod } = await _fb();
  await firestoreMod.deleteDoc(firestoreMod.doc(db, `users/${uid}/work_history/${entryId}`));
}
```

- [ ] **Step 2: `work-history.js` save 함수에 hook**

기존 save 함수 (entries 배열 저장 위치) 마지막에:

```javascript
  // Phase 8: Firestore mirror (로그인 시만, fire-and-forget)
  if (typeof window !== 'undefined' && window.__firebaseUid) {
    import('/firebase/sync/work-history-sync.js').then(m =>
      m.writeAllWorkHistory(window.__firebaseUid, entries).catch(err =>
        console.warn('[Phase 8] work_history sync 실패', err?.message || err))
    );
  }
```

기존 remove 함수에 deleteWorkHistoryEntry 호출 추가 (entry id 기반).

- [ ] **Step 3: 테스트**

```javascript
// tests/integration/firebase/work-history-sync.test.js
describe('work-history-sync', () => {
  it('writeAll/readAll 라운드트립', async () => {
    // mock Firestore mod 로 검증
    // ...
  });
  it('save() 호출 시 로그인이면 writeAllWorkHistory 호출', async () => {
    // ...
  });
});
```

Run: `npx vitest run tests/integration/firebase/work-history-sync.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add firebase/sync/work-history-sync.js packages/profile/src/work-history.js tests/integration/firebase/work-history-sync.test.js
git commit -m "feat(phase8-task6.1): work-history Firestore sync (collection-by-id)"
```

---

### Task 6.2: `overtime-sync.js` (yyyymm 분할)

**Files:** `firebase/sync/overtime-sync.js`, `packages/profile/src/overtime.js`, `tests/integration/firebase/overtime-sync.test.js`

**Shape**: `collection-by-yyyymm` — `entry.date` 의 yyyymm 으로 그룹핑.

- [ ] **Step 1: sync 모듈**

```javascript
// firebase/sync/overtime-sync.js
import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../apps/web/src/client/config.js';

let _f = null;
async function _fb() { if (!_f) _f = await initFirebase(firebaseConfig); return _f; }

export async function writeAllOvertime(uid, allEntries) {
  const groups = {};
  for (const e of (allEntries || [])) {
    const ym = (e.date || '').slice(0, 7).replace('-', '');
    if (!ym) continue;
    (groups[ym] ??= []).push(e);
  }
  const { db, firestoreMod } = await _fb();
  const ts = firestoreMod.serverTimestamp();
  const batch = firestoreMod.writeBatch(db);
  for (const [ym, entries] of Object.entries(groups)) {
    const ref = firestoreMod.doc(db, `users/${uid}/overtime/${ym}`);
    batch.set(ref, { entries, lastEditAt: ts });
  }
  await batch.commit();
}

export async function readAllOvertime(uid) {
  const { db, firestoreMod } = await _fb();
  const colRef = firestoreMod.collection(db, `users/${uid}/overtime`);
  const snap = await firestoreMod.getDocs(colRef);
  const all = [];
  snap.forEach(d => { (d.data().entries || []).forEach(e => all.push(e)); });
  all.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return all;
}
```

- [ ] **Step 2~4**: `overtime.js` 의 save/load 에 hook + 테스트 + commit (Task 6.1 패턴)

```bash
git commit -m "feat(phase8-task6.2): overtime Firestore sync (collection-by-yyyymm)"
```

---

### Task 6.3: `leave-sync.js` (yyyy 분할)

**Files:** `firebase/sync/leave-sync.js`, `packages/profile/src/leave.js`, `tests/integration/firebase/leave-sync.test.js`

**Shape**: `collection-by-yyyy` — 연도별 그룹.

- [ ] **Step 1: sync 모듈** (overtime 패턴, yyyy 분할):

```javascript
// firebase/sync/leave-sync.js
import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../apps/web/src/client/config.js';

let _f = null;
async function _fb() { if (!_f) _f = await initFirebase(firebaseConfig); return _f; }

export async function writeAllLeave(uid, allEntries) {
  const groups = {};
  for (const e of (allEntries || [])) {
    const yyyy = (e.date || '').slice(0, 4);
    if (!yyyy) continue;
    (groups[yyyy] ??= []).push(e);
  }
  const { db, firestoreMod } = await _fb();
  const ts = firestoreMod.serverTimestamp();
  const batch = firestoreMod.writeBatch(db);
  for (const [yyyy, entries] of Object.entries(groups)) {
    const ref = firestoreMod.doc(db, `users/${uid}/leave/years/${yyyy}`);
    batch.set(ref, { entries, lastEditAt: ts });
  }
  await batch.commit();
}

export async function readAllLeave(uid) {
  const { db, firestoreMod } = await _fb();
  const colRef = firestoreMod.collection(db, `users/${uid}/leave/years`);
  const snap = await firestoreMod.getDocs(colRef);
  const all = [];
  snap.forEach(d => { (d.data().entries || []).forEach(e => all.push(e)); });
  all.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return all;
}
```

- [ ] **Step 2~4**: hook + 테스트 + commit

```bash
git commit -m "feat(phase8-task6.3): leave Firestore sync (collection-by-yyyy)"
```

---

### Task 6.4: `payslip-sync.js` — 같은 달 다중 명세서 (q3-1)

**Files:** `firebase/sync/payslip-sync.js`, `packages/profile/src/payroll.js`, `tests/integration/firebase/payslip-sync.test.js`

**Why**: SPEC §3.1 + q3-1 — 같은 달 일반 급여 + 소급 + 연차수당 등 2개 이상 명세서. autoId + `payMonth` 인덱스. `driveFileId` 필드는 Plan B 에서 채움.

- [ ] **Step 1: sync 모듈**

```javascript
// firebase/sync/payslip-sync.js
import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../apps/web/src/client/config.js';

let _f = null;
async function _fb() { if (!_f) _f = await initFirebase(firebaseConfig); return _f; }

export async function writeAllPayslips(uid, payslips) {
  const { db, firestoreMod } = await _fb();
  const ts = firestoreMod.serverTimestamp();
  const batch = firestoreMod.writeBatch(db);
  for (const p of (payslips || [])) {
    const colRef = firestoreMod.collection(db, `users/${uid}/payslips`);
    const docRef = p.firestoreId
      ? firestoreMod.doc(db, `users/${uid}/payslips/${p.firestoreId}`)
      : firestoreMod.doc(colRef);
    if (!p.firestoreId) p.firestoreId = docRef.id;
    const data = {
      payMonth: (p.payMonth || p.payDate || '').slice(0, 7),
      payslipName: p.payslipName || p.name || '',
      payDate: p.payDate || '',
      parsedFields: p.parsedFields || p,
      driveFileId: p.driveFileId || null,
      lastEditAt: ts,
    };
    batch.set(docRef, data, { merge: true });
  }
  await batch.commit();
}

export async function readAllPayslips(uid) {
  const { db, firestoreMod } = await _fb();
  const colRef = firestoreMod.collection(db, `users/${uid}/payslips`);
  const q = firestoreMod.query(colRef, firestoreMod.orderBy('payMonth', 'desc'));
  const snap = await firestoreMod.getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ firestoreId: d.id, ...d.data() }));
  return out;
}
```

- [ ] **Step 2: 인덱스 등록**

`firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "payslips",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "payMonth", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Run: `npx firebase deploy --only firestore:indexes`
Expected: 인덱스 생성 (수 분 소요)

- [ ] **Step 3: 같은 달 다중 명세서 테스트**

```javascript
it('같은 달 2개 명세서 (소급/연차수당) 모두 보존', async () => {
  const uid = 'u1';
  const payslips = [
    { payslipName: '2026-04 정기급여', payMonth: '2026-04', parsedFields: {} },
    { payslipName: '2026-04 소급급여', payMonth: '2026-04', parsedFields: {} },
  ];
  await writeAllPayslips(uid, payslips);
  const restored = await readAllPayslips(uid);
  expect(restored).toHaveLength(2);
  expect(restored.map(p => p.payslipName).sort())
    .toEqual(['2026-04 소급급여', '2026-04 정기급여']);
});
```

- [ ] **Step 4: payroll.js hook + commit**

```bash
git commit -m "feat(phase8-task6.4): payslip Firestore sync — multi-payslip per month

q3-1 같은 달 소급/연차수당 별도 명세서 보존.
autoId + payMonth desc index. driveFileId 는 Plan B."
```

---

### Task 6.5: `favorites-sync.js` + `settings-sync.js`

**Files:** `firebase/sync/favorites-sync.js`, `firebase/sync/settings-sync.js`, `tests/integration/firebase/{favorites,settings}-sync.test.js`

**Shape**: `doc` (단일 doc).

- [ ] **Step 1: 두 sync 모듈**

```javascript
// firebase/sync/favorites-sync.js
import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../apps/web/src/client/config.js';
let _f = null;
async function _fb() { if (!_f) _f = await initFirebase(firebaseConfig); return _f; }

export async function writeFavorites(uid, items) {
  const { db, firestoreMod } = await _fb();
  const ref = firestoreMod.doc(db, `users/${uid}/settings/reference`);
  await firestoreMod.setDoc(ref, { items, lastEditAt: firestoreMod.serverTimestamp() }, { merge: true });
}

export async function readFavorites(uid) {
  const { db, firestoreMod } = await _fb();
  const snap = await firestoreMod.getDoc(firestoreMod.doc(db, `users/${uid}/settings/reference`));
  return snap.exists() ? (snap.data().items || []) : [];
}
```

```javascript
// firebase/sync/settings-sync.js
import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../apps/web/src/client/config.js';
let _f = null;
async function _fb() { if (!_f) _f = await initFirebase(firebaseConfig); return _f; }

export async function writeSettings(uid, settings) {
  const { db, firestoreMod } = await _fb();
  const ref = firestoreMod.doc(db, `users/${uid}/settings/app`);
  await firestoreMod.setDoc(ref, { ...settings, lastEditAt: firestoreMod.serverTimestamp() }, { merge: true });
}

export async function readSettings(uid) {
  const { db, firestoreMod } = await _fb();
  const snap = await firestoreMod.getDoc(firestoreMod.doc(db, `users/${uid}/settings/app`));
  return snap.exists() ? snap.data() : null;
}
```

- [ ] **Step 2: hook 통합**

`apps/web/src/client/regulation.js` 의 favorites 저장 함수 마지막에 `writeFavorites` hook (Task 5.2 패턴).
`apps/web/src/client/appLock.js` 또는 settings 저장 위치에 `writeSettings` hook.

- [ ] **Step 3: 테스트 + commit**

```bash
git commit -m "feat(phase8-task6.5): favorites + settings Firestore sync"
```

---

### Task 6.6: 인벤토리 커버리지 검증

**Files:** `tests/integration/firebase/inventory-coverage.test.js`

- [ ] **Step 1: 검증 테스트**

```javascript
import { describe, it, expect } from 'vitest';
import { syncKeys, KEY_REGISTRY } from '../../../firebase/key-registry.js';
import * as fs from 'fs';
import * as path from 'path';

describe('인벤토리 커버리지 — Phase 8 SPEC §3', () => {
  it('모든 sync 키가 firebase/sync/ 모듈에 등장', () => {
    const syncDir = path.resolve('firebase/sync');
    const files = fs.readdirSync(syncDir).map(f => path.join(syncDir, f));
    const allCode = files.map(f => fs.readFileSync(f, 'utf-8')).join('\n');
    const missing = syncKeys().filter(k => {
      const def = KEY_REGISTRY[k];
      const lastSegment = def.firestorePath ? def.firestorePath('').split('/').pop() : '';
      return !allCode.includes(`'${k}'`)
          && !allCode.includes(`"${k}"`)
          && !(lastSegment && allCode.includes(lastSegment));
    });
    expect(missing).toEqual([]);
  });

  it('적어도 7 위치에서 /firebase/sync/ 모듈 import', () => {
    const targetDirs = ['packages', 'apps/web/src/client'];
    let hookCount = 0;
    const walk = (dir) => {
      try {
        for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, f.name);
          if (f.isDirectory()) walk(p);
          else if (/\.(js|ts|astro)$/.test(f.name)) {
            const code = fs.readFileSync(p, 'utf-8');
            if (code.includes('/firebase/sync/')) hookCount++;
          }
        }
      } catch (e) {}
    };
    targetDirs.forEach(walk);
    expect(hookCount).toBeGreaterThanOrEqual(7);  // 7 카테고리 hook
  });
});
```

- [ ] **Step 2: 실행 + 통과**

Run: `npx vitest run tests/integration/firebase/inventory-coverage.test.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/firebase/inventory-coverage.test.js
git commit -m "test(phase8-task6): inventory coverage gate — all sync keys wired"
```

---

## Task 7: Security Rules (strict)

### Task 7.1: 정식 rules + emulator negative tests

**Files:** `firestore.rules`, `tests/integration/firebase/security-rules.test.js`

- [ ] **Step 1: Strict rules 작성**

`firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: emulator 의존성**

`package.json` devDependencies:
```json
"@firebase/rules-unit-testing": "^3.0.0"
```

Run: `pnpm install`

- [ ] **Step 3: negative tests 작성**

`tests/integration/firebase/security-rules.test.js`:

```javascript
import { describe, it, beforeAll, afterAll } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import * as fs from 'fs';

let testEnv;
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'snuhmate-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1', port: 8080,
    },
  });
});
afterAll(async () => { if (testEnv) await testEnv.cleanup(); });

describe('Security Rules — strict uid match', () => {
  it('비인증 사용자: 모든 경로 차단', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('users/any/profile/identity').get());
  });
  it('인증 + 본인 doc read/write 허용', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(ctx.firestore().doc('users/alice/profile/identity').set({ name: 'Alice' }));
    await assertSucceeds(ctx.firestore().doc('users/alice/profile/identity').get());
  });
  it('인증 + 다른 uid doc 차단', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(ctx.firestore().doc('users/bob/profile/identity').get());
    await assertFails(ctx.firestore().doc('users/bob/profile/identity').set({ name: 'X' }));
  });
  it('users/ 외 경로 차단', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(ctx.firestore().doc('admin/x').get());
    await assertFails(ctx.firestore().doc('public/x').set({ a: 1 }));
  });
});
```

- [ ] **Step 4: emulator + 테스트**

Run (별도 터미널, background): `npx firebase emulators:start --only firestore`
Run: `npx vitest run tests/integration/firebase/security-rules.test.js`
Expected: PASS — 4 케이스
emulator 종료.

- [ ] **Step 5: rules + indexes 배포**

Run: `npx firebase deploy --only firestore:rules,firestore:indexes`
Expected: `Deploy complete!`

- [ ] **Step 6: Commit**

```bash
git add firestore.rules firestore.indexes.json tests/integration/firebase/security-rules.test.js package.json pnpm-lock.yaml
git commit -m "feat(phase8-task7): strict Firestore rules — uid match only

본인 uid 만 자기 users/{uid}/** read/write.
4 negative tests (emulator) — 비인증/타인-uid/users-외 경로 차단."
```

---

## Task 8: Migration Dialog

### Task 8.1: `firebase/migration-dialog.js` (DOM API only)

**Files:**
- Create: `firebase/migration-dialog.js`
- Test: `tests/integration/firebase/migration-dialog.test.js`

**Why:** SPEC §7 — 첫 로그인 1회. 카테고리별 체크박스 → 부분 업로드 → 거부 카테고리는 `*_guest` 보존.

- [ ] **Step 1: 다이얼로그 모듈 (createElement only)**

```javascript
// firebase/migration-dialog.js
//
// 첫 로그인 1회 — localStorage 게스트 데이터를 카테고리별로 Firestore 업로드.
// non-pushy: 거부 카테고리는 _guest 보존, 다이얼로그는 명시적 트리거만.
// XSS 회피: createElement + textContent + setAttribute 만.

import { CATEGORIES, syncKeysByCategory, KEY_REGISTRY } from './key-registry.js';

const FLAG_BASE = 'snuhmate_migration_v1_done_uid_';
const LABELS = {
  identity: '개인정보 (이름/사번/부서)',
  payroll: '급여 정보 (시급/연봉)',
  overtime: '시간외 기록',
  leave: '휴가 기록',
  workHistory: '근무이력',
  settings: '설정',
  reference: '취업규칙 즐겨찾기',
};

export async function shouldShowMigration(uid) {
  if (!uid) return false;
  if (localStorage.getItem(FLAG_BASE + uid) === '1') return false;
  const items = await collectGuestData();
  return Object.values(items).some(arr => arr.length > 0);
}

export async function collectGuestData() {
  const result = {};
  for (const cat of CATEGORIES) {
    result[cat] = [];
    for (const baseKey of syncKeysByCategory(cat)) {
      const def = KEY_REGISTRY[baseKey];
      if (!def || def.scope !== 'sync') continue;
      // prefix 있는 키 → _guest, 없는 키 → base 그대로
      const guestKey = (baseKey.startsWith('snuhmate_') || baseKey.startsWith('bhm_'))
        ? baseKey + '_guest' : baseKey;
      const v = localStorage.getItem(guestKey);
      if (v !== null) result[cat].push({ baseKey, guestKey, value: v });
    }
  }
  return result;
}

export async function openMigrationDialog(uid) {
  if (document.getElementById('snuhmateMigrationDialog')) return;
  const items = await collectGuestData();
  const overlay = _buildDialog(items, uid);
  document.body.appendChild(overlay);
}

function _el(tag, attrs, children) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') e.className = v;
      else if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v);
    }
  }
  if (Array.isArray(children)) children.forEach(c => c && e.appendChild(c));
  else if (children) e.appendChild(children);
  return e;
}

function _buildDialog(items, uid) {
  const overlay = _el('div', {
    id: 'snuhmateMigrationDialog',
    className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/50',
  });
  const panel = _el('div', { className: 'bg-white rounded-lg p-6 max-w-md w-full shadow-xl' });

  panel.appendChild(_el('h2', { className: 'text-lg font-semibold mb-2', text: '클라우드 동기화 시작' }));

  const desc = _el('p', { className: 'text-xs text-gray-600 mb-4' });
  desc.appendChild(_el('span', { text: '다음 로컬 데이터를 클라우드에 업로드할까요?' }));
  desc.appendChild(_el('br'));
  desc.appendChild(_el('span', { text: '※ 거부한 항목은 이 기기에만 보관됩니다.' }));
  panel.appendChild(desc);

  const form = _el('form', { id: 'snuhmateMigrationForm', className: 'space-y-2' });
  let any = false;
  for (const cat of CATEGORIES) {
    const count = items[cat]?.length || 0;
    if (count === 0) continue;
    any = true;
    const label = _el('label', { className: 'flex items-center gap-2 text-sm' });
    label.appendChild(_el('input', { type: 'checkbox', name: 'cat', value: cat, checked: 'checked' }));
    label.appendChild(_el('span', { text: `${LABELS[cat] || cat} (${count}개 항목)` }));
    form.appendChild(label);
  }
  panel.appendChild(form);

  if (!any) {
    panel.appendChild(_el('p', {
      className: 'text-sm text-gray-500 italic',
      text: '동기화할 게스트 데이터가 없습니다.',
    }));
  }

  const btnRow = _el('div', { className: 'flex gap-2 mt-4' });
  const laterBtn = _el('button', {
    type: 'button', id: 'snuhmateMigLater',
    className: 'flex-1 px-4 py-2 border border-gray-300 rounded',
    text: '나중에',
  });
  const goBtn = _el('button', {
    type: 'button', id: 'snuhmateMigGo',
    className: 'flex-1 px-4 py-2 bg-blue-600 text-white rounded',
    text: '선택 항목 업로드',
  });
  btnRow.appendChild(laterBtn);
  btnRow.appendChild(goBtn);
  panel.appendChild(btnRow);

  const status = _el('p', { id: 'snuhmateMigStatus', className: 'text-xs text-gray-500 mt-2' });
  panel.appendChild(status);

  laterBtn.addEventListener('click', () => {
    overlay.remove();
    // flag 미설정 → 다음 로그인 시 다시 표시 (사용자 의지 존중)
  });

  goBtn.addEventListener('click', async () => {
    const checked = Array.from(form.querySelectorAll('input[name="cat"]:checked')).map(i => i.value);
    status.textContent = '업로드 중...';
    try {
      await uploadCategories(uid, checked, items);
      localStorage.setItem(FLAG_BASE + uid, '1');
      overlay.remove();
      window.dispatchEvent(new CustomEvent('app:migration-complete', { detail: { categories: checked } }));
    } catch (e) {
      status.textContent = '실패: ' + (e?.message || '');
    }
  });

  overlay.appendChild(panel);
  return overlay;
}

async function uploadCategories(uid, categories, items) {
  for (const cat of categories) {
    const entries = items[cat] || [];
    for (const { baseKey, guestKey, value } of entries) {
      const newKey = baseKey + '_uid_' + uid;
      localStorage.setItem(newKey, value);
      localStorage.removeItem(guestKey);
    }
    await _pushCategoryToCloud(uid, cat);
  }
}

async function _pushCategoryToCloud(uid, cat) {
  const handlers = {
    identity: async () => {
      const raw = localStorage.getItem('snuhmate_hr_profile_uid_' + uid);
      if (!raw) return;
      const m = await import('./sync/profile-sync.js');
      await m.writeProfile(null, uid, JSON.parse(raw));
    },
    payroll: async () => {
      const profileRaw = localStorage.getItem('snuhmate_hr_profile_uid_' + uid);
      if (profileRaw) {
        const m = await import('./sync/profile-sync.js');
        await m.writeProfile(null, uid, JSON.parse(profileRaw));
      }
      const psRaw = localStorage.getItem('overtimePayslipData_uid_' + uid);
      if (psRaw) {
        const m = await import('./sync/payslip-sync.js');
        await m.writeAllPayslips(uid, JSON.parse(psRaw));
      }
    },
    overtime: async () => {
      const raw = localStorage.getItem('overtimeRecords_uid_' + uid);
      if (!raw) return;
      const m = await import('./sync/overtime-sync.js');
      await m.writeAllOvertime(uid, JSON.parse(raw));
    },
    leave: async () => {
      const raw = localStorage.getItem('leaveRecords_uid_' + uid);
      if (!raw) return;
      const m = await import('./sync/leave-sync.js');
      await m.writeAllLeave(uid, JSON.parse(raw));
    },
    workHistory: async () => {
      const raw = localStorage.getItem('snuhmate_work_history_uid_' + uid);
      if (!raw) return;
      const m = await import('./sync/work-history-sync.js');
      await m.writeAllWorkHistory(uid, JSON.parse(raw));
    },
    settings: async () => {
      const raw = localStorage.getItem('snuhmate_settings_uid_' + uid);
      if (!raw) return;
      const m = await import('./sync/settings-sync.js');
      await m.writeSettings(uid, JSON.parse(raw));
    },
    reference: async () => {
      const raw = localStorage.getItem('snuhmate_reg_favorites_uid_' + uid);
      if (!raw) return;
      const m = await import('./sync/favorites-sync.js');
      const items = JSON.parse(raw);
      await m.writeFavorites(uid, Array.isArray(items) ? items : (items.items || []));
    },
  };
  if (handlers[cat]) await handlers[cat]();
}
```

- [ ] **Step 2: 테스트**

```javascript
// tests/integration/firebase/migration-dialog.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { shouldShowMigration, collectGuestData } from '../../../firebase/migration-dialog.js';

describe('migration-dialog', () => {
  beforeEach(() => { localStorage.clear(); });

  it('shouldShowMigration: 게스트 데이터 0 → false', async () => {
    const r = await shouldShowMigration('uid1');
    expect(r).toBe(false);
  });
  it('shouldShowMigration: 게스트 데이터 있고 flag 없음 → true', async () => {
    localStorage.setItem('snuhmate_hr_profile_guest', '{"name":"X"}');
    const r = await shouldShowMigration('uid1');
    expect(r).toBe(true);
  });
  it('shouldShowMigration: flag 설정됨 → false (재오픈 차단)', async () => {
    localStorage.setItem('snuhmate_hr_profile_guest', '{"name":"X"}');
    localStorage.setItem('snuhmate_migration_v1_done_uid_uid1', '1');
    const r = await shouldShowMigration('uid1');
    expect(r).toBe(false);
  });
  it('collectGuestData 카테고리 분류', async () => {
    localStorage.setItem('snuhmate_hr_profile_guest', '{"name":"A"}');
    localStorage.setItem('overtimeRecords', '[{"date":"2026-01-01"}]');
    const items = await collectGuestData();
    expect(items.identity.length).toBeGreaterThan(0);
    expect(items.overtime.length).toBeGreaterThan(0);
    expect(items.leave.length).toBe(0);
  });
});
```

- [ ] **Step 3: 실행 + 통과**

Run: `npx vitest run tests/integration/firebase/migration-dialog.test.js`
Expected: PASS — 4 케이스

- [ ] **Step 4: Commit**

```bash
git add firebase/migration-dialog.js tests/integration/firebase/migration-dialog.test.js
git commit -m "feat(phase8-task8): migration dialog — categorized cloud upload

7 카테고리 체크박스 (identity/payroll/overtime/leave/workHistory/settings/reference).
거부 카테고리는 _guest 보존, 동의 카테고리만 _uid_ + Firestore push.
DOM API only (createElement + textContent), non-pushy ('나중에' 시 flag 미설정)."
```

---

## Task 9: 회귀 가드 + Playwright 스모크

### Task 9.1: 게스트 모드 zero-regression 테스트

**Files:** `tests/integration/firebase/guest-mode-zero-regression.test.js`

- [ ] **Step 1: 테스트**

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Phase 8 — 게스트 모드 0 회귀', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.__firebaseUid;
  });

  it('window.__firebaseUid 미설정 시 cloud 호출 0', async () => {
    const writeSpy = vi.fn();
    vi.doMock('/firebase/sync/profile-sync.js', () => ({
      writeProfile: writeSpy, readProfile: async () => null,
    }));
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    PROFILE.save({ name: 'A' });
    await new Promise(r => setTimeout(r, 50));
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('Firebase 미설정 (env var 없음) 시 정상 동작', async () => {
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    PROFILE.save({ name: '게스트', hourlyWage: 10000 });
    const loaded = PROFILE.load();
    expect(loaded?.name).toBe('게스트');
  });

  it('Phase 5 cross-module ESM 가드 통과', async () => {
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    expect(PROFILE.STORAGE_KEY).toBeDefined();
  });
});
```

- [ ] **Step 2: 실행**

Run: `npx vitest run tests/integration/firebase/guest-mode-zero-regression.test.js`
Expected: PASS

- [ ] **Step 3: 전체 회귀**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/integration/firebase/guest-mode-zero-regression.test.js
git commit -m "test(phase8-task9): guest-mode zero-regression gate"
```

---

### Task 9.2: Playwright 스모크 — 8개 탭 + Auth flow

**Files:** `tests/e2e/phase8-firebase-smoke.spec.js`

- [ ] **Step 1: 시나리오**

```javascript
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4321';
const TABS = ['home', 'payroll', 'overtime', 'leave', 'profile', 'reference', 'settings', 'feedback'];

test.describe('Phase 8 Firebase smoke', () => {
  test('게스트 모드 — 8개 탭 콘솔 에러 0', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    for (const tab of TABS) {
      await page.goto(`${BASE}/?tab=${tab}`);
      await page.waitForLoadState('networkidle');
    }
    // Phase 8 비활성 (env 없음) 경고는 허용
    const realErrors = errors.filter(e => !/Phase 8.*PUBLIC_FIREBASE/.test(e));
    expect(realErrors).toHaveLength(0);
  });

  test('Settings — 로그인 다이얼로그 (non-pushy: 자동 오픈 0)', async ({ page }) => {
    await page.goto(`${BASE}/?tab=settings`);
    await expect(page.locator('#snuhmateAuthDialog')).toHaveCount(0);
    await page.click('#snuhmateAuthPill');
    await expect(page.locator('#snuhmateAuthDialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#snuhmateAuthDialog')).toHaveCount(0);
  });

  test('Phase 7 5 critical regression', async ({ page }) => {
    // 시간외 시급 0 경고 배너
    await page.goto(`${BASE}/?tab=overtime`);
    // ... 기존 회귀 가드 시나리오

    // Profile form clear
    await page.goto(`${BASE}/?tab=profile`);
    // ...

    // Settings backup
    await page.goto(`${BASE}/?tab=settings`);
    // ...

    // Reference chapters
    await page.goto(`${BASE}/?tab=reference`);
    // ...

    // Payroll picker
    await page.goto(`${BASE}/?tab=payroll`);
    // ...
  });
});
```

- [ ] **Step 2: 실행**

Run: `pnpm --filter @snuhmate/web build && pnpm --filter @snuhmate/web preview &`
(서버가 listening 한 후) Run: `npx playwright test tests/e2e/phase8-firebase-smoke.spec.js`
Expected: PASS

- [ ] **Step 3: Playwright MCP 자동 스모크 (CLAUDE.md)**

CLAUDE.md "브라우저 스모크 (자동화)" 규약:

```
browser_navigate http://localhost:4321
browser_snapshot
browser_console_messages
browser_close
```

콘솔 에러 0건 확인.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/phase8-firebase-smoke.spec.js
git commit -m "test(phase8-task9): Playwright smoke — 8 tabs + auth + Phase 7 regression"
```

---

## Task 10: Production deploy

### Task 10.1: Cloudflare Pages env vars 검증 + PR

**Files:** 없음 (외부 dashboard) + PR 생성

- [ ] **Step 1: Cloudflare Pages env vars 등록 확인 (사용자 수동)**

https://dash.cloudflare.com → snuhmate Pages → Settings → Environment Variables
- Production + Preview 두 환경에 `PUBLIC_FIREBASE_*` 6개 등록 확인

- [ ] **Step 2: PR 생성**

```bash
git push -u origin <branch>
gh pr create --title "Phase 8.0 — Firebase Auth + Firestore Sync" --body "$(cat <<'EOF'
## Summary
- Firebase Auth (Email + Google) + Firestore (asia-northeast3)
- 8개 탭 인벤토리 100% 매핑
- identity/payroll Firestore 분리
- 카테고리별 마이그레이션 다이얼로그 (non-pushy)
- 게스트 모드 0 회귀
- DOM API only (innerHTML 금지)

## Out of scope (Plan B / Phase 8.1)
- 카카오 로그인 / Cloud Functions / Drive PDF / Apple / 네이버 / Blaze

## Test plan
- [ ] Cloudflare preview 빌드 성공 + Firebase config inject 확인
- [ ] preview URL 게스트 모드 8개 탭 콘솔 에러 0
- [ ] preview URL Email 로그인 + 마이그레이션 다이얼로그 동작
- [ ] preview URL Google 로그인 동작
- [ ] Firebase Console — Authentication / Firestore data 검증
- [ ] 다른 브라우저 동일 계정 로그인 → 동기화 확인
EOF
)"
```

- [ ] **Step 3: Cloudflare preview URL 수동 검증**

PR 댓글의 Cloudflare preview URL 에서:
1. 게스트 모드 8개 탭 진입 → 콘솔 에러 0
2. Settings 탭 → Email 가입 → 마이그레이션 다이얼로그 → 1 카테고리만 동의 → 업로드
3. Firebase Console Firestore 에서 `users/{uid}/profile/identity` 확인
4. Google 로그인 + 동일 검증
5. 다른 브라우저 (또는 시크릿 창) 동일 계정 로그인 → 데이터 동기화 확인

- [ ] **Step 4: Production 배포 + smoke**

PR merge → Cloudflare 자동 배포 → snuhmate.com 에서:
1. 게스트 모드 동작 검증 (가장 중요)
2. 로그인 + 동기화 검증
3. 콘솔 에러 0건

문제 발견 시 → revert PR (Cloudflare 자동 rollback).

---

### Task 10.2: 메모리 업데이트

**Files:**
- Modify: `/Users/momo/.claude/projects/-Users-momo-Documents-GitHub-bhm-overtime/memory/project_phase8_firebase_kickoff.md`
- Create: `/Users/momo/.claude/projects/-Users-momo-Documents-GitHub-bhm-overtime/memory/MEMORY.md` 의 새 entry

- [ ] **Step 1: kickoff 메모리 → "Phase 8.0 완료, Plan B 다음" 으로 전환**

`project_phase8_firebase_kickoff.md` 의 "다음 세션 첫 액션" 섹션을 업데이트:
- ✅ Plan A (Phase 8.0) 완료 — Email + Google + 인벤토리 sync + 마이그레이션 다이얼로그
- ⏳ Plan B (Phase 8.1) 다음: 카카오 + Cloud Functions + Drive PDF + Blaze 전환

- [ ] **Step 2: MEMORY.md index 갱신**

`MEMORY.md` 에 한 줄 추가:
```markdown
- [Phase 8.0 Complete](project_phase8_complete.md) — Email + Google Auth + Firestore sync 출시 (YYYY-MM-DD). Plan B (카카오) 대기.
```

- [ ] **Step 3: 새 메모리 파일 생성** (Plan B 진입 시 필요한 컨텍스트)

```markdown
---
name: Phase 8.0 완료 / Plan B 진입 컨텍스트
description: Phase 8.0 (Email+Google) 출시 후 Plan B (카카오+Drive PDF) 진입 시 필요 정보
type: project
---
## Plan A (Phase 8.0) 완료 — YYYY-MM-DD
- Production URL: snuhmate.com (Cloudflare)
- Firebase Console: snuhmate (asia-northeast3)
- Auth: Email + Google
- Firestore: 7 카테고리 sync (identity/payroll/overtime/leave/workHistory/settings/reference)
- 마이그레이션 다이얼로그: 카테고리별 동의 기반

## Plan B (Phase 8.1) 진입 시 작업
1. 카카오 디벨로퍼 콘솔 등록 (snuhmate)
2. Blaze plan 전환 + 결제 카드
3. Cloud Functions: `kakaoCustomToken`
4. Drive PDF: `snuhmate/{YYYY}/` 폴더 + `payslips.driveFileId` 채움
5. 기존 PDF re-locate workflow

## 핵심 파일 (Plan A 산출물)
- `firebase/firebase-init.js` — App 싱글톤
- `firebase/auth-service.js` — Email + Google
- `firebase/auth-ui.js` — 다이얼로그
- `firebase/key-registry.js` — 인벤토리 SoT
- `firebase/sync/*.js` — 7 sync 모듈
- `firebase/migration-dialog.js` — 카테고리별 업로드
- `firestore.rules` — strict
```

---

## 부록 A — 회귀 가드 일람

| 가드 | 위치 | 통과 시점 |
|---|---|---|
| Phase 5 cross-module ESM 9 | `tests/integration/cross-module-imports.test.js` | Task 0~10 모든 commit |
| Phase 7 5 critical | `tests/e2e/phase8-firebase-smoke.spec.js` Test 3 | Task 9.2 |
| 게스트 모드 0 회귀 | `tests/integration/firebase/guest-mode-zero-regression.test.js` | Task 5~9 |
| getUserStorageKey | `tests/unit/firebase/user-storage-key.test.js` | Task 0.1 |
| 인벤토리 커버리지 | `tests/integration/firebase/inventory-coverage.test.js` | Task 6.6 |
| Security Rules | `tests/integration/firebase/security-rules.test.js` | Task 7 (emulator) |
| CSP | `tests/integration/csp-script-src.test.js` | Task 1.5 |

---

## 부록 B — Plan B (Phase 8.1) Preview

다음 plan 윤곽 (이 plan 범위 외):

- **B.1**: Blaze plan 전환 + 카드 등록
- **B.2**: Cloud Functions 스캐폴드 (`functions/`)
- **B.3**: kakaoCustomToken function
- **B.4**: 카카오 디벨로퍼 콘솔 + REST API key
- **B.5**: 카카오 SDK 클라이언트 + auth-ui 확장
- **B.6**: Google Drive PDF — `snuhmate/{YYYY}/` 구조 + driveFileId 채움
- **B.7**: 기존 PDF re-locate workflow (선택)
- **B.8**: payslip-sync 의 driveFileId 활성
- **B.9**: Production smoke (Plan A 패턴)
- **B.10**: 메모리 → Phase 8 종료
