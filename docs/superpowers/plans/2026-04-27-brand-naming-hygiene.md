# Brand & Naming Hygiene — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `bhm_*` 레거시 네이밍 (보라매병원 시절 흔적) 을 SNUH Mate 브랜드와 일관되게 정리. **localStorage 키는 자동 마이그레이션** (사용자 데이터 손실 0), 코드/메타/디스크립션은 **명시적 SNUH 브랜드** 로 전환.

**Architecture:**
- 2단계 접근:
  1. **Code/메타 즉시 정리**: package.json description, README, 주석, 문서, repo 메타
  2. **localStorage 키 lazy 마이그레이션**: load 시 옛 `bhm_*` 키 → 새 `snuhmate_*` 키로 복제 + delete (사용자 무중단)
- repo 명 (`bhm_overtime`) 변경은 GitHub 의 redirect 기능 사용 — 본 plan 은 코드 만 정리, repo 이름 변경은 별도 GitHub UI 작업

**Tech Stack:** Vanilla JS lazy migration + 광역 grep/sed 갱신.

**Branch / Worktree:**
```bash
git worktree add ../bhm_overtime-naming -b feat/brand-naming-hygiene
cd ../bhm_overtime-naming
npm install
```

---

## 사전 인벤토리

| 카테고리 | 키/문자열 | 마이그레이션 정책 |
|---|---|---|
| **localStorage user data** | `bhm_hr_profile`, `bhm_work_history`, `bhm_work_history_seeded`, `bhm_lastEdit_*` | lazy migrate → `snuhmate_*` (양방향 alias 6개월) |
| **localStorage system** | `bhm_settings`, `bhm_local_uid`, `bhm_anon_id`, `bhm_deviceId`, `bhm_demo_mode`, `bhm_debug_parser`, `bhm_leave_migrated_v1` | lazy migrate → `snuhmate_*` |
| **package.json** | `"name": "bhm_overtime"`, description | `name: "snuhmate"` + description 갱신 |
| **README** | "보라매병원 인사관리 웹앱" | "SNUH Mate — 서울대병원 노조 직원용 급여/시간외/근무이력/규정 도구" |
| **repo URL** | `UltrasoundSonicBoom/bhm_overtime` | GitHub UI 에서 별도 rename (자동 redirect) — 본 plan 범위 외 |
| **주석** | `BHM`, `보라매` | `SNUHMate`, `SNUH` |
| **USER_DATA_PATTERNS** | `/^bhm_*/`, `/^snuhmate_*/` 양쪽 매칭 (6개월 후 bhm_ 제거) | profile-tab.js 갱신 |

---

## Task 1: 인벤토리 + 회귀 가드

**Files:**
- Create: `docs/superpowers/plans/2026-04-27-naming-inventory.md`
- Create: `tests/integration/naming-migration.test.js`

- [ ] **Step 1.1: 인벤토리 자동 생성**

```bash
{
  echo "# BHM → SNUHMate 네이밍 인벤토리 — $(date '+%Y-%m-%d')"
  echo ""
  echo "## localStorage 키 사용처"
  grep -rnE "bhm_[a-zA-Z_]+" *.js *.html public/tabs/*.html package.json README.md 2>/dev/null \
    | grep -v "test\|node_modules\|dist\|archive" | head -50
  echo ""
  echo "## 한글 BHM/보라매"
  grep -rnE "보라매|BHM" *.html *.js *.md 2>/dev/null \
    | grep -v "test\|node_modules\|dist" | head -20
  echo ""
  echo "## package.json"
  grep -E "name|description|repository|bugs|homepage" package.json | head -10
} > docs/superpowers/plans/2026-04-27-naming-inventory.md
```

- [ ] **Step 1.2: 마이그레이션 회귀 가드 테스트**

`tests/integration/naming-migration.test.js`:

테스트는 jsdom 환경에서 다음 4 시나리오 검증:

1. **lazy migrate**: 옛 `bhm_hr_profile` 시드 → `PROFILE.load()` 호출 → 새 `snuhmate_hr_profile` 로 복사 + 옛 키 delete
2. **idempotent**: 새 `snuhmate_hr_profile` 만 있으면 그대로 사용 (재 마이그레이션 X)
3. **write 새 키**: `PROFILE.save()` 는 항상 새 키로
4. **양쪽 prefix 매칭**: `clearProfile()` 가 `bhm_*` 잔존 + `snuhmate_*` 동시 wipe

테스트 작성 시 DOM 시드는 createElement 패턴 (innerHTML 사용 금지, security hook 회피):

```js
// DOM seed: createElement 만 사용
['pfName', 'pfMilitaryMonthsGroup', 'pfServiceDisplay', 'profileStatus', 'pfInputFields',
 'pfInputToggleLabel', 'profileSummary', 'pfBasicFields', 'pfBasicPreview', 'pfBasicBadge',
 'pfPayslipLink', 'workHistoryList'].forEach(id => {
  const el = document.createElement('div'); el.id = id; document.body.appendChild(el);
});
```

테스트 시나리오는 `profile-form-and-clear.test.js` / `data-lifecycle.test.js` 패턴을 그대로 따라 작성.

- [ ] **Step 1.3: 테스트 RED 확인**

```bash
npx vitest run tests/integration/naming-migration.test.js
```

Expected: 첫 3 케이스 FAIL (마이그레이션 미구현).

- [ ] **Step 1.4: 커밋**

```bash
git add tests/integration/naming-migration.test.js docs/superpowers/plans/2026-04-27-naming-inventory.md
git commit -m "feat(naming-1): 인벤토리 + lazy migration 회귀 가드 (RED)"
```

---

## Task 2: localStorage 키 lazy 마이그레이션 (PROFILE)

**Files:**
- Modify: `profile.js` (STORAGE_KEY getter + load/save 시 lazy migrate)

- [ ] **Step 2.1: PROFILE.STORAGE_KEY 갱신 + 마이그레이션 함수**

기존:
```js
get STORAGE_KEY() {
  return window.getUserStorageKey ? window.getUserStorageKey('bhm_hr_profile') : 'bhm_hr_profile';
}
```

신규:
```js
// Phase 5-followup: SNUH Mate 브랜드 일관 — bhm_* → snuhmate_* lazy migration
get STORAGE_KEY() {
  return window.getUserStorageKey ? window.getUserStorageKey('snuhmate_hr_profile') : 'snuhmate_hr_profile';
},

get LEGACY_STORAGE_KEY() {
  return window.getUserStorageKey ? window.getUserStorageKey('bhm_hr_profile') : 'bhm_hr_profile';
},

// load 시 옛 키 → 새 키 자동 마이그레이션 (idempotent)
_migrateFromLegacy() {
  const legacyKey = this.LEGACY_STORAGE_KEY;
  const newKey = this.STORAGE_KEY;
  const legacyData = localStorage.getItem(legacyKey);
  if (legacyData && !localStorage.getItem(newKey)) {
    localStorage.setItem(newKey, legacyData);
    localStorage.removeItem(legacyKey);
  }
},
```

`load()` 첫 줄에 `this._migrateFromLegacy();` 추가.

- [ ] **Step 2.2: 테스트 검증**

```bash
npx vitest run tests/integration/naming-migration.test.js
```

Expected: 첫 3 케이스 PASS.

- [ ] **Step 2.3: 커밋**

```bash
git add profile.js
git commit -m "feat(naming-2): PROFILE.STORAGE_KEY → snuhmate_hr_profile + lazy migration"
```

---

## Task 3: 다른 도메인 모듈 lazy 마이그레이션

**Files:**
- Modify: `work-history.js`, `app.js`, `inline-ui-helpers.js`, `appLock.js`

- [ ] **Step 3.1: overtime.js / leave.js — 도메인 키 (overtimeRecords/leaveRecords) 그대로 유지**

`bhm_*` prefix 가 없는 키는 마이그레이션 대상 외. 코드 변경 X.

- [ ] **Step 3.2: work-history.js — bhm_work_history → snuhmate_work_history**

```js
// Before
function _whKey() {
  return window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
}

// After
function _whKey() {
  return window.getUserStorageKey ? window.getUserStorageKey('snuhmate_work_history') : 'snuhmate_work_history_guest';
}

function _whLegacyKey() {
  return window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
}

function _migrateWorkHistory() {
  const legacy = localStorage.getItem(_whLegacyKey());
  const cur = localStorage.getItem(_whKey());
  if (legacy && !cur) {
    localStorage.setItem(_whKey(), legacy);
    localStorage.removeItem(_whLegacyKey());
  }
}
```

`_loadWorkHistory()` 첫 줄에 `_migrateWorkHistory();` 추가.

같은 패턴으로 `_whSeedKey()` 도 변경.

- [ ] **Step 3.3: 광역 lazy migration 함수 (settings/device-id/lastEdit)**

`appLock.js` 또는 `inline-ui-helpers.js` 같은 공통 모듈에 1회 실행 함수 추가:

```js
(function migrateLegacyKeys() {
  const map = [
    ['bhm_demo_mode', 'snuhmate_demo_mode'],
    ['bhm_settings', 'snuhmate_settings'],
    ['bhm_local_uid', 'snuhmate_local_uid'],
    ['bhm_deviceId', 'snuhmate_device_id'],
    ['bhm_anon_id', 'snuhmate_anon_id'],
    ['bhm_debug_parser', 'snuhmate_debug_parser'],
    ['bhm_leave_migrated_v1', 'snuhmate_leave_migrated_v1'],
  ];
  for (const [oldK, newK] of map) {
    const v = localStorage.getItem(oldK);
    if (v !== null && localStorage.getItem(newK) === null) {
      localStorage.setItem(newK, v);
      localStorage.removeItem(oldK);
    }
  }
  // bhm_lastEdit_* 모든 매칭 키 마이그레이션
  const toMigrate = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('bhm_lastEdit_')) toMigrate.push(k);
  }
  toMigrate.forEach(oldK => {
    const newK = oldK.replace(/^bhm_lastEdit_/, 'snuhmate_last_edit_');
    if (localStorage.getItem(newK) === null) {
      localStorage.setItem(newK, localStorage.getItem(oldK));
      localStorage.removeItem(oldK);
    }
  });
})();
```

- [ ] **Step 3.4: 모든 read 위치 갱신**

```bash
grep -rn "bhm_settings\|bhm_demo_mode\|bhm_debug_parser\|bhm_local_uid\|bhm_deviceId\|bhm_anon_id\|bhm_leave_migrated_v1" *.js | grep -v test
```

각 hit 의 string literal 을 새 키 (`snuhmate_*`) 로 교체. 단 마이그레이션 함수 안의 `'bhm_*'` 는 유지 (legacy read).

- [ ] **Step 3.5: 테스트 + 회귀 검증**

```bash
npm run test:unit
npm run test:integration
```

- [ ] **Step 3.6: 커밋**

```bash
git add overtime.js leave.js work-history.js app.js inline-ui-helpers.js appLock.js
git commit -m "feat(naming-3): work-history / settings / device-id / lastEdit lazy migration"
```

---

## Task 4: USER_DATA_PATTERNS 양쪽 매칭 + clearProfile 호환

**Files:**
- Modify: `profile-tab.js` (USER_DATA_PATTERNS + KEEP 키 갱신)

- [ ] **Step 4.1: USER_DATA_PATTERNS 양쪽 prefix 매칭**

```js
const USER_DATA_PATTERNS = [
  /^(bhm|snuhmate)_hr_profile/,       // legacy + new
  /^(bhm|snuhmate)_work_history/,
  /^(bhm|snuhmate)_lastEdit_/,
  /^(bhm|snuhmate)_last_edit_/,
  /^overtimeRecords/,
  /^leaveRecords/,
  /^payslip_/,
  /^otManualHourly/,
  /^overtimePayslipData/,
  /^_orphan_/,
  /^snuhmate_reg_favorites/,
  /^payroll_compare_history/,
  /^cardnews\./,
  /^(bhm|snuhmate)_demo_mode$/,
  /^hwBannerDismissed$/,
];
```

- [ ] **Step 4.2: CLEAR_KEEP_KEYS 갱신**

```js
const CLEAR_KEEP_KEYS = new Set([
  'bhm_local_uid', 'snuhmate_local_uid',
  'bhm_deviceId', 'snuhmate_device_id',
  'bhm_anon_id', 'snuhmate_anon_id',
  'theme', 'snuhmate-theme',
  'bhm_leave_migrated_v1', 'snuhmate_leave_migrated_v1',
  'bhm_debug_parser', 'snuhmate_debug_parser',
  'onboarding_seen_v2',
  'onboarding_count',
]);
```

- [ ] **Step 4.3: 테스트 — clearProfile 양쪽 prefix 모두 wipe**

```bash
npx vitest run tests/integration/naming-migration.test.js
```

Expected: 4 케이스 모두 PASS.

- [ ] **Step 4.4: 커밋**

```bash
git add profile-tab.js
git commit -m "feat(naming-4): USER_DATA_PATTERNS 양쪽 prefix 매칭 + KEEP 갱신"
```

---

## Task 5: 코드/메타/디스크립션 정리

**Files:**
- Modify: `package.json`, `README.md` (없으면 create), 주석 광역 갱신

- [ ] **Step 5.1: package.json 정리**

```json
{
  "name": "snuhmate",
  "version": "1.0.0",
  "description": "SNUH Mate — 서울대병원 노조 직원용 급여/시간외/근무이력/규정 PWA",
  "main": "app.js",
  "...": "...",
  "homepage": "https://snuhmate.com"
}
```

repository URL 은 GitHub repo rename 후 갱신 (별도 작업).

- [ ] **Step 5.2: README 작성/갱신**

README.md 본문은 다음 항목을 textContent 기반 마크다운으로 작성 (코드블록 없는 일반 텍스트):

- 제목: `# SNUH Mate`
- 설명: 서울대학교병원 노동조합 직원용 급여·시간외·휴가·근무이력·규정 PWA
- **Brand 명시 단락**:
  > Brand: SNUH Mate. Internal/legacy strings include `bhm_*` (보라매병원 시절 흔적) but should never appear in user-facing copy. localStorage 키는 v1.x → v2.x 에서 lazy migration 으로 `snuhmate_*` 로 자동 전환됨.
- Features: 통상임금 계산 / 명세서 파싱 / 근무이력 자동 시드 / 휴가·연차 / 규정 페이지 / 퇴직금 시뮬
- Tech: Vanilla JS ESM + Vite + Vitest + Playwright + localStorage (Phase 6 Firebase 도입 예정)
- License: ISC

- [ ] **Step 5.3: 광역 주석/한글 정리**

```bash
# 주석 안의 BHM / 보라매 갱신 (string literal 제외)
grep -rln "보라매\|병원 HR" *.js *.html *.md 2>/dev/null | grep -v "test\|dist\|archive"
```

각 파일 수동 검토 후:
- "병원 HR 종합 시스템" → "SNUH Mate"
- "보라매병원" → "서울대학교병원" (단 데이터/스크립트 X)
- "BHM" 일반 코멘트 → "SNUH Mate" 또는 "SNUHMate"

단, 사용자 데이터 호환 (`bhm_settings.googleSub` 등) 코멘트 문맥은 legacy 라고 명시 — 마이그레이션 추적용.

- [ ] **Step 5.4: 테스트 + 빌드**

```bash
npm run test:unit
npm run test:integration
npm run lint
npm run build
```

- [ ] **Step 5.5: 커밋**

```bash
git add package.json README.md *.js *.html
git commit -m "feat(naming-5): SNUH Mate 브랜드 일관 — package.json + README + 주석 정리"
```

---

## Task 6: 최종 검증 + main 머지

- [ ] **Step 6.1: 종합 회귀**

```bash
npm test
npm run lint
npm run build
```

- [ ] **Step 6.2: Playwright 스모크 — 마이그레이션 라이브 검증**

```bash
npm run preview &
sleep 3
```

Playwright MCP:
1. localStorage 에 옛 `bhm_hr_profile` 시드
2. 페이지 로드 → 1초 후 `localStorage.getItem('snuhmate_hr_profile')` 존재 확인 + `bhm_hr_profile` null 확인
3. 정상 표시 + 사용자 데이터 손실 0

- [ ] **Step 6.3: main 머지 + push**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git checkout main
git merge --ff-only feat/brand-naming-hygiene
git push origin main
git worktree remove ../bhm_overtime-naming
git branch -d feat/brand-naming-hygiene
```

- [ ] **Step 6.4: GitHub repo rename (별도 UI 작업)**

GitHub.com → Settings → Repository name → `bhm_overtime` → `snuhmate`. GitHub 자동 redirect (옛 URL 도 6개월 동안 작동).

이후:
```bash
git remote set-url origin https://github.com/UltrasoundSonicBoom/snuhmate.git
git remote -v
```

package.json 의 repository.url 도 갱신 (별도 commit).

---

## Self-Review

- [ ] PROFILE / WorkHistory / settings / deviceId / lastEdit / demo / debug 모두 lazy migration
- [ ] 사용자 데이터 손실 0 (옛 키 read → 새 키 write + 옛 키 delete)
- [ ] USER_DATA_PATTERNS 양쪽 prefix 매칭 (clearProfile 호환)
- [ ] package.json name = "snuhmate", description SNUH Mate
- [ ] README brand 명시 (legacy bhm_ 흔적 안내)
- [ ] 코드 주석 BHM/보라매 → SNUH/SNUHMate
- [ ] 테스트 4 신규 시나리오 PASS
- [ ] Playwright 라이브 마이그레이션 검증

---

## 산출물

- `profile.js` — STORAGE_KEY snuhmate_ + lazy migration
- `work-history.js` — _whKey snuhmate_ + lazy migration
- `app.js` / `inline-ui-helpers.js` / `appLock.js` — 광역 lazy migration 함수
- `profile-tab.js` — USER_DATA_PATTERNS 양쪽 매칭 + KEEP 갱신
- `package.json` — name/description SNUH Mate
- `README.md` — brand 명시 + legacy 안내
- `tests/integration/naming-migration.test.js` — 회귀 가드
- `docs/superpowers/plans/2026-04-27-naming-inventory.md`

---

## 6개월 후 정리 (별도 plan)

`bhm_*` lazy migration 코드 + 옛 키 KEEP_KEYS 항목 제거. 6개월 사용자 활동으로 모든 사용자 데이터가 새 키로 이전됐다고 가정. 마이그레이션 실패 사용자 위해 1개월 alert "데이터 복원 필요시 백업 다운로드" 안내.

---

## 병렬 작업 호환성 (design-tokens-split.md 와 함께)

본 plan 은 JS / 메타 파일 위주, design-tokens-split 은 CSS / HTML link 위주 → 충돌 영역 적음.

**충돌 가능 영역**:
- HTML entry 파일 (index.html 등) — design-tokens-split 가 `<link>` + `<script>` 추가, 본 plan 은 동일 위치 인라인 변경 없음. 대부분 안전.
- `inline-ui-helpers.js` — design-tokens 에서 initTheme 손댈 수 있음, 본 plan 은 lazy migration 추가. **rebase 시 양쪽 변경 모두 keep**.

권장: design-tokens-split 먼저 머지 → 본 plan rebase 후 진행 (순차). 또는 별도 worktree 동시 진행 후 양쪽 head 머지 (rebase conflict 적음).
