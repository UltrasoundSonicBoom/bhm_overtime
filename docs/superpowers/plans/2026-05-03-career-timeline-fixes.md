# Career Timeline 신뢰성·정확도 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 커리어 타임라인의 4가지 신뢰성 결함 (현재 진행 근무처 분류 오류, 다음 승급 가시성 부족, 연차 실데이터 미연동, 로그인 데이터 동기화 미설정) 을 해결한다.

**Architecture:**
- 이벤트 status 판정에 dateTo open-ended 케이스 추가 (workplace 가 dateTo 비면 항상 'now')
- 자동승격 시드를 `calcOrdinaryWage` 호출로 항목별 차액(기본급/능력급/상여금) 계산해 저장
- LEAVE 모듈 `getYearRecords` + `calcQuotaSummary` 결과를 매 렌더 시 동적으로 leave 카테고리에 주입 (시드 정적 마일스톤 + 동적 현재 잔여)
- Firestore 동기화: `snuhmate_career_events` 를 `key-registry.js` 에 등록 + `career-events-sync.js` 신규 + auth-service `onAuthChanged` hydrate/write-through 활성화

**Tech Stack:** Astro · Vanilla JS · Vitest · Firebase Firestore (이미 구성됨) · Playwright MCP

---

## Context: 사용자 피드백 4건

1. **현재 진행 근무처가 "과거"로 분류** — `dateTo` 비어있고 `dateFrom` 이 오래되면 status='past' 로 잡혀 과거 요약 카드에 묻힘. screenshot: "과거 이력 1건 · 2006.07 ~ 2006.07 / 핵의학과" 인데 실제로는 현재까지 이어지는 근무처.
2. **다음 승급 가시성 부족** — 현재 자격등급 기준 다음 승격 일자/금액이 hero stat 한 줄로만 노출. 급여 변화도 총액(`+₩459,300`)만 표시되고 항목별(기본급/능력급/상여금) 분해 미반영.
3. **연차·휴가 LEAVE 모듈 미연동** — 정적 시드 7건만 있고 사용자가 휴가 탭에서 입력한 실제 사용량/잔여 일수가 타임라인에 반영 안됨.
4. **로그인/로그아웃 동기화 미설정** — `snuhmate_career_events` 가 `key-registry.js` 에 미등록 상태. hydrate 시 Firestore 에서 안 가져오고, 게스트→로그인 마이그레이션 다이얼로그도 이 키를 다루지 않음. 다기기 동기화 시 데이터 손실 위험.

## File Structure

| 파일 | 역할 |
|---|---|
| [packages/profile/src/career-events.js](packages/profile/src/career-events.js) | seed 생성 시 자동승격 항목별 차액 계산 (`calcOrdinaryWage` 호출) + leave 시드를 동적 함수로 분리 |
| [apps/web/src/client/profile-tab.js](apps/web/src/client/profile-tab.js) | `_careerEventStatus` workplace open-ended 처리, hero stat 다음 승급 강조 + 항목별 expand, leave 동적 주입, render 시 LEAVE 변경 이벤트 구독 |
| [apps/web/src/styles/globals.css](apps/web/src/styles/globals.css) | 다음 승급 강조 카드 스타일 (`.career-next-promo-card`), past-summary "현재 진행" 케이스 분기 |
| [apps/web/src/firebase/key-registry.js](apps/web/src/firebase/key-registry.js) | `snuhmate_career_events` 등록 (encrypt + multi-device sync) |
| [apps/web/src/firebase/sync/career-events-sync.js](apps/web/src/firebase/sync/career-events-sync.js) | 신규 — Firestore write-through + read 함수 |
| [apps/web/src/firebase/migration-dialog.js](apps/web/src/firebase/migration-dialog.js) | `career_events` 카테고리 추가 (게스트→uid 마이그레이션) |
| [tests/unit/career-events.test.js](tests/unit/career-events.test.js) | 신규 — seed/CRUD/status 단위 테스트 8건 |
| [tests/unit/career-events-leave-sync.test.js](tests/unit/career-events-leave-sync.test.js) | 신규 — LEAVE 모듈 연동 테스트 3건 |

---

## Task 1: 현재 진행 근무처를 'now' status 로 처리 (Fix #1)

**Files:**
- Modify: `apps/web/src/client/profile-tab.js` — `_careerEventStatus` 함수 (~line 1090)
- Test: `tests/unit/career-events.test.js`

- [x] **Step 1: 신규 테스트 파일 + 첫 실패 테스트**

```bash
# 파일 생성
touch tests/unit/career-events.test.js
```

`tests/unit/career-events.test.js`:
```javascript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

let _careerEventStatus;
beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  await import('../../apps/web/src/client/profile-tab.js');
  // 모듈 내부 함수 노출이 필요하므로 window.\_careerEventStatus 로 export 하거나
  // 별도 분리 모듈로 추출. 여기서는 분리 모듈 가정 (Step 3 에서 추출).
  _careerEventStatus = window.__test_careerEventStatus;
});

describe('_careerEventStatus', () => {
  const NOW = new Date('2026-05-15');
  it('workplace_dateTo_비어있고_dateFrom_과거이면_now_반환', () => {
    expect(_careerEventStatus({ category: 'workplace', dateFrom: '2006-07', dateTo: '' }, NOW)).toBe('now');
  });
  it('workplace_dateTo_가_과거이면_past', () => {
    expect(_careerEventStatus({ category: 'workplace', dateFrom: '2006-07', dateTo: '2010-12' }, NOW)).toBe('past');
  });
  it('promotion_dateFrom_과거는_past', () => {
    expect(_careerEventStatus({ category: 'promotion', dateFrom: '2010-07' }, NOW)).toBe('past');
  });
});
```

- [x] **Step 2: 테스트 실행해 실패 확인**

```bash
pnpm test:unit -- tests/unit/career-events.test.js
```
Expected: FAIL — `_careerEventStatus is not a function` 또는 workplace open-ended 케이스에서 'past' 반환.

- [x] **Step 3: 함수 수정 (workplace 분기 추가)**

`apps/web/src/client/profile-tab.js` 의 `_careerEventStatus` 교체:
```javascript
function _careerEventStatus(ev, now) {
  if (!ev?.dateFrom) return 'future';
  // 근무처: dateTo 가 비면 "현재까지 이어짐" → 항상 now
  if (ev.category === 'workplace' && !ev.dateTo) return 'now';
  const [y, m] = ev.dateFrom.split('-').map(Number);
  const evStart = new Date(y, (m || 1) - 1, 1);
  const monthDiff = (now.getFullYear() - evStart.getFullYear()) * 12 + (now.getMonth() - evStart.getMonth());
  // 근무처: dateTo 가 있으면 그 종료일 기준 past 판정
  if (ev.category === 'workplace' && ev.dateTo) {
    const [ty, tm] = ev.dateTo.split('-').map(Number);
    const evEnd = new Date(ty, (tm || 1) - 1, 1);
    return now > evEnd ? 'past' : 'now';
  }
  if (Math.abs(monthDiff) <= 1) return 'now';
  return monthDiff > 0 ? 'past' : 'future';
}
// 테스트 expose
if (typeof window !== 'undefined') window.__test_careerEventStatus = _careerEventStatus;
```

- [x] **Step 4: 테스트 통과 확인**

```bash
pnpm test:unit -- tests/unit/career-events.test.js
```
Expected: PASS (3/3)

- [x] **Step 5: Commit**

```bash
git add apps/web/src/client/profile-tab.js tests/unit/career-events.test.js
git commit -m "fix(career): 현재 진행 근무처를 'now' status 로 분류 (dateTo 빈 케이스)"
```

---

## Task 2: 자동승격 항목별 차액 (기본급/능력급/상여금) 분리 노출 (Fix #2-A)

**Files:**
- Modify: `packages/profile/src/career-events.js` — `generateSeedEvents` (~line 100)
- Test: `tests/unit/career-events.test.js`

- [x] **Step 1: 실패 테스트 추가**

`tests/unit/career-events.test.js` 끝에 추가:
```javascript
import { generateSeedEvents } from '@snuhmate/profile/career-events';

describe('generateSeedEvents — 자동승격 항목별 차액', () => {
  it('J1_J2_자동승격_이벤트는_detailTokens에_기본급_능력급_상여금_변화를_담는다', () => {
    const events = generateSeedEvents({
      hireDate: '2015-06-01', jobType: '간호직', grade: 'J3', year: 1,
    });
    const j1j2 = events.find((e) => /J1 → J2/.test(e.title));
    expect(j1j2).toBeTruthy();
    expect(Array.isArray(j1j2.detailTokens)).toBe(true);
    const text = j1j2.detailTokens.map((t) => t.bold || t.text || '').join('');
    expect(text).toMatch(/기준기본급/);
    expect(text).toMatch(/능력급/);
    expect(text).toMatch(/상여금/);
  });
});
```

- [x] **Step 2: 테스트 실패 확인**

```bash
pnpm test:unit -- tests/unit/career-events.test.js
```
Expected: FAIL — `detailTokens` undefined.

- [x] **Step 3: career-events.js 수정 — calcOrdinaryWage 호출로 항목별 차액 산출**

`packages/profile/src/career-events.js` 상단에 import 추가:
```javascript
import { CALC } from '@snuhmate/calculators';
```

`generateSeedEvents` 의 자동승격 chain 부분 교체:
```javascript
// 1. 자동승격 체인 — 항목별 차액을 calcOrdinaryWage 로 정확히 계산
let cursorYM = hireYM;
let prevGrade = promo[0].from;
promo.forEach((step) => {
  cursorYM = _addYears(cursorYM, step.years);
  // 동일 호봉(year=1) 가정으로 grade 만 바꿔 차액 산출
  const wagePrev = CALC.calcOrdinaryWage(jobType, prevGrade, 1, {});
  const wageNext = CALC.calcOrdinaryWage(jobType, step.to, 1, {});
  let detailTokens = null;
  if (wagePrev && wageNext) {
    const dBase = (wageNext.breakdown['기준기본급'] || 0) - (wagePrev.breakdown['기준기본급'] || 0);
    const dAbil = (wageNext.breakdown['능력급'] || 0) - (wagePrev.breakdown['능력급'] || 0);
    const dBonus = (wageNext.breakdown['상여금'] || 0) - (wagePrev.breakdown['상여금'] || 0);
    detailTokens = [
      { text: '기준기본급 ' }, { bold: _fmtSign(dBase) }, { text: '/월 · 능력급 ' },
      { bold: _fmtSign(dAbil) }, { text: '/월 · 상여금 ' }, { bold: _fmtSign(dBonus) }, { text: '/월' },
    ];
  }
  events.push({
    id: _genId('seed_'), category: 'promotion',
    title: `${step.from} → ${step.to} 자동승격`,
    sub: `${step.from}등급 자동승격 연수 ${step.years}년 도달 (제20조)`,
    dateFrom: cursorYM,
    amount: `+₩${step.monthly.toLocaleString()} /월`,
    detailTokens,
    badge: { text: `${step.years}년 만에`, tone: 'indigo' },
    autoSeed: true,
  });
  prevGrade = step.to;
});
```

`_fmtSign` helper 추가 (파일 상단 utility 영역):
```javascript
function _fmtSign(n) {
  const v = Math.round(n || 0);
  if (v === 0) return '₩0';
  return `${v > 0 ? '+' : '−'}₩${Math.abs(v).toLocaleString()}`;
}
```

- [x] **Step 4: 테스트 통과 + 기존 472 회귀 없음 확인**

```bash
pnpm test:unit
```
Expected: PASS, 473+ tests.

- [x] **Step 5: Commit**

```bash
git add packages/profile/src/career-events.js tests/unit/career-events.test.js
git commit -m "feat(career): 자동승격 시드에 기본급·능력급·상여금 항목별 차액 첨부"
```

---

## Task 3: 다음 승급 강조 카드 + 항목별 detailTokens 렌더 (Fix #2-B)

**Files:**
- Modify: `apps/web/src/client/profile-tab.js` — `_careerBuildEventEl`, `_careerHeroStat`
- Modify: `apps/web/src/styles/globals.css` — `.career-next-promo-card` 추가

- [x] **Step 1: detailTokens 렌더 로직을 `_careerBuildEventEl` 에 추가**

`apps/web/src/client/profile-tab.js` 의 `_careerBuildEventEl` 안에서 `card.appendChild(amt)` 다음 줄 아래에 추가:
```javascript
if (Array.isArray(ev.detailTokens) && ev.detailTokens.length) {
  const dg = document.createElement('div');
  dg.className = 'career-event-detail-grid';
  ev.detailTokens.forEach((tok) => {
    if (tok.bold != null) {
      const b = document.createElement('b');
      b.textContent = tok.bold;
      dg.appendChild(b);
    } else if (tok.text != null) {
      dg.appendChild(document.createTextNode(tok.text));
    }
  });
  card.appendChild(dg);
}
```

- [x] **Step 2: globals.css 에 detail-grid + 다음 승급 카드 스타일 추가**

`apps/web/src/styles/globals.css` 의 `.career-event-amount` 정의 다음 줄에 추가:
```css
.career-event-detail-grid {
  margin-top: 6px; padding: 6px 8px;
  background: rgba(0,0,0,0.03); border-radius: 6px;
  font-size: var(--text-caption); color: var(--text-primary); line-height: 1.5;
}
.career-event-detail-grid b {
  font-family: "Space Grotesk","Inter",sans-serif;
  color: var(--accent-indigo); font-weight: 700;
}
.career-next-promo-card {
  margin-top: 10px; padding: 10px 12px;
  border: 2px solid var(--accent-indigo);
  border-radius: 10px; background: #ffffff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.career-next-promo-card .label {
  font-size: var(--text-caption); font-weight: 700;
  letter-spacing: 0.06em; color: var(--accent-indigo);
}
.career-next-promo-card .title {
  font-size: var(--text-body-normal); font-weight: 700;
  margin: 2px 0; color: var(--text-primary);
}
.career-next-promo-card .breakdown {
  font-size: var(--text-caption); color: var(--text-muted);
  line-height: 1.5; margin-top: 4px;
}
.career-next-promo-card .breakdown b {
  font-family: "Space Grotesk","Inter",sans-serif;
  color: var(--accent-indigo); font-weight: 700;
}
```

- [x] **Step 3: `_careerHeroStat` 끝에 다음 승급 카드 삽입**

`_careerHeroStat` 의 마지막 `wrap.appendChild(meta)` 다음에 추가:
```javascript
if (nextPromo) {
  const card = document.createElement('div');
  card.className = 'career-next-promo-card';
  const lbl = document.createElement('div');
  lbl.className = 'label';
  lbl.textContent = '다음 자동승격';
  card.appendChild(lbl);
  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = `${nextPromo.dateFrom.replace('-', '.')} · ${nextPromo.title}`;
  card.appendChild(title);
  if (nextPromo.amount) {
    const amt = document.createElement('div');
    amt.className = 'breakdown';
    amt.style.fontWeight = '700';
    amt.style.color = 'var(--accent-indigo)';
    amt.textContent = nextPromo.amount;
    card.appendChild(amt);
  }
  if (Array.isArray(nextPromo.detailTokens) && nextPromo.detailTokens.length) {
    const bd = document.createElement('div');
    bd.className = 'breakdown';
    nextPromo.detailTokens.forEach((tok) => {
      if (tok.bold != null) {
        const b = document.createElement('b'); b.textContent = tok.bold; bd.appendChild(b);
      } else if (tok.text != null) bd.appendChild(document.createTextNode(tok.text));
    });
    card.appendChild(bd);
  }
  wrap.appendChild(card);
}
```

- [x] **Step 4: build + 시각 확인**

```bash
pnpm --filter @snuhmate/web build
```
Expected: build OK.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/client/profile-tab.js apps/web/src/styles/globals.css
git commit -m "feat(career): hero stat 에 다음 승급 카드 + 항목별 차액 노출"
```

---

## Task 4: LEAVE 모듈 실데이터 동적 주입 (Fix #3)

**Files:**
- Modify: `apps/web/src/client/profile-tab.js` — render 시 LEAVE 호출
- Test: `tests/unit/career-events-leave-sync.test.js`

- [x] **Step 1: 신규 테스트 파일**

`tests/unit/career-events-leave-sync.test.js`:
```javascript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
});
beforeEach(() => { localStorage.clear(); });

describe('career timeline leave 카테고리 — LEAVE 모듈 실데이터', () => {
  it('LEAVE_연차_사용량_있으면_올해_사용일수_이벤트가_나타난다', async () => {
    const { LEAVE } = await import('@snuhmate/profile/leave');
    LEAVE.addRecord({
      type: 'annual', startDate: '2026-04-10', endDate: '2026-04-12', days: 3, salaryImpact: 0,
    });
    // computeDynamicLeaveEvents 가 올해 사용량을 동적 이벤트로 반환하는지 검증
    const { computeDynamicLeaveEvents } = await import('@snuhmate/profile/career-events');
    const profile = { hireDate: '2015-06-01', jobType: '간호직' };
    const dynEvents = computeDynamicLeaveEvents(profile, new Date('2026-05-15'));
    const usedToday = dynEvents.find((e) => /사용/.test(e.title));
    expect(usedToday).toBeTruthy();
    expect(usedToday.sub).toMatch(/3일/);
  });
});
```

- [x] **Step 2: 테스트 실패 확인**

```bash
pnpm test:unit -- tests/unit/career-events-leave-sync.test.js
```
Expected: FAIL — `computeDynamicLeaveEvents` undefined.

- [x] **Step 3: career-events.js 에 동적 leave helper export**

`packages/profile/src/career-events.js` 끝에 추가:
```javascript
import { LEAVE } from './leave.js';
import { CALC as CALC_LEAVE } from '@snuhmate/calculators';

export function computeDynamicLeaveEvents(profile, now = new Date()) {
  if (!profile?.hireDate) return [];
  const events = [];
  const year = now.getFullYear();
  const parsed = PROFILE.parseDate(profile.hireDate);
  const annual = parsed ? CALC_LEAVE.calcAnnualLeave(new Date(parsed), now) : null;
  const totalAnnual = annual?.totalLeave || 15;
  let summary = [];
  try { summary = LEAVE.calcQuotaSummary(year, totalAnnual) || []; } catch {}
  const annualEntry = summary.find((q) => q.id === 'annual' || q.label === '연차');
  if (annualEntry) {
    events.push({
      id: `dyn-leave-${year}`, category: 'leave',
      title: `${year}년 연차 사용 ${annualEntry.used}일 / 잔여 ${annualEntry.remaining}일`,
      sub: `${year}년 발생 ${totalAnnual}일 — 사용 ${annualEntry.used}일 (제36조)`,
      dateFrom: `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      badge: { text: '올해', tone: 'rose' },
      dynamic: true,
    });
  }
  return events;
}
```

- [x] **Step 4: profile-tab.js — renderCareerTimeline 가 dynamic 합치도록 수정**

`renderCareerTimeline` 시작 부분 수정:
```javascript
const events = CAREER.loadEvents();
let dynamicLeave = [];
try {
  const mod = await import('@snuhmate/profile/career-events');
  dynamicLeave = mod.computeDynamicLeaveEvents ? mod.computeDynamicLeaveEvents(PROFILE.load(), new Date()) : [];
} catch {}
const allEvents = [...events, ...dynamicLeave];
const filtered = allEvents
  .filter((ev) => _careerCurrentFilter === 'all' || ev.category === _careerCurrentFilter)
  ...
```

함수 signature 를 async 로 변경. 호출자도 async 처리:
```javascript
async function renderCareerTimeline() { ... }
```

`_careerCurrentFilter` 클릭 핸들러도 `await`. window 노출도 그대로 유지.

- [x] **Step 5: LEAVE 변경 시 자동 재렌더 구독**

`_initCareerTimelineHandlers` 끝에 추가:
```javascript
window.addEventListener('leaveRecordsChanged', () => renderCareerTimeline());
```

- [x] **Step 6: 테스트 통과 + 시각 확인**

```bash
pnpm test:unit
pnpm --filter @snuhmate/web build
```

- [x] **Step 7: Commit**

```bash
git add packages/profile/src/career-events.js apps/web/src/client/profile-tab.js tests/unit/career-events-leave-sync.test.js
git commit -m "feat(career): LEAVE 모듈 실데이터 동적 주입 + 변경 이벤트 자동 재렌더"
```

---

## Task 5: snuhmate_career_events Firestore 동기화 등록 (Fix #4-A)

**Files:**
- Modify: `apps/web/src/firebase/key-registry.js`
- Create: `apps/web/src/firebase/sync/career-events-sync.js`
- Modify: `packages/profile/src/career-events.js` — saveEvents 시 write-through

- [x] **Step 1: key-registry.js 에 등록**

`apps/web/src/firebase/key-registry.js` 의 `'snuhmate_work_history'` 항목 다음에 추가:
```javascript
'snuhmate_career_events': {
  scope: 'user',
  encrypted: true,
  collection: 'careerEvents',
  syncable: true,
  category: 'identity',
},
```

- [x] **Step 2: career-events-sync.js 생성**

`apps/web/src/firebase/sync/career-events-sync.js`:
```javascript
// career-events-sync.js — Firestore write-through + read for snuhmate_career_events
import { encryptObject, decryptObject } from '../crypto.js';

export async function writeAllCareerEvents(dbOrNull, uid, events) {
  if (!uid) return;
  try {
    const fbInit = await import('../firebase-init.js');
    const cfg = (await import('../../client/config.js')).firebaseConfig;
    const fb = await fbInit.initFirebase(cfg);
    const db = dbOrNull || fb.db;
    if (!db || !fb.firestoreMod) return;
    const { doc, setDoc } = fb.firestoreMod;
    const enc = await encryptObject(events, uid);
    await setDoc(doc(db, 'users', uid, 'careerEvents', 'all'), {
      data: enc, updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[career-events-sync] write 실패 (무해)', e?.message || e);
  }
}

export async function fetchAllCareerEvents(dbOrNull, uid) {
  if (!uid) return null;
  try {
    const fbInit = await import('../firebase-init.js');
    const cfg = (await import('../../client/config.js')).firebaseConfig;
    const fb = await fbInit.initFirebase(cfg);
    const db = dbOrNull || fb.db;
    if (!db || !fb.firestoreMod) return null;
    const { doc, getDoc } = fb.firestoreMod;
    const snap = await getDoc(doc(db, 'users', uid, 'careerEvents', 'all'));
    if (!snap.exists()) return null;
    const enc = snap.data()?.data;
    if (!enc) return null;
    return await decryptObject(enc, uid);
  } catch (e) {
    console.warn('[career-events-sync] fetch 실패 (무해)', e?.message || e);
    return null;
  }
}
```

- [x] **Step 3: career-events.js saveEvents 에 write-through hook**

`saveEvents` 함수 끝에 추가:
```javascript
// Firebase 로그인 시 Firestore write-through
if (typeof window !== 'undefined' && window.__firebaseUid) {
  import('/src/firebase/sync/career-events-sync.js').then((m) =>
    m.writeAllCareerEvents(null, window.__firebaseUid, events)
  ).catch((err) => console.warn('[career] cloud sync 실패 (무해)', err?.message || err));
}
```

- [x] **Step 4: hydrate.js 에 careerEvents 추가** (Firestore → localStorage)

`apps/web/src/firebase/hydrate.js` 의 hydrate 함수에 `snuhmate_career_events` 분기 추가:
```javascript
// 다른 카테고리 hydrate 와 동일 패턴 따름
try {
  const mod = await import('./sync/career-events-sync.js');
  const remote = await mod.fetchAllCareerEvents(db, uid);
  if (remote && Array.isArray(remote)) {
    localStorage.setItem(`snuhmate_career_events_uid_${uid}`, JSON.stringify(remote));
    result.ok.push('careerEvents');
  }
} catch (e) { result.failed.push('careerEvents'); }
```

(정확한 hydrate 분기 패턴은 동일 파일의 work-history hydrate 코드 참조)

- [x] **Step 5: build + lint**

```bash
pnpm lint
pnpm --filter @snuhmate/web build
```

- [x] **Step 6: Commit**

```bash
git add apps/web/src/firebase/key-registry.js apps/web/src/firebase/sync/career-events-sync.js apps/web/src/firebase/hydrate.js packages/profile/src/career-events.js
git commit -m "feat(career): Firestore 동기화 등록 + write-through + hydrate"
```

---

## Task 6: 게스트→로그인 마이그레이션 다이얼로그에 career_events 추가 (Fix #4-B)

**Files:**
- Modify: `apps/web/src/firebase/migration-dialog.js`

- [x] **Step 1: migration-dialog.js 의 카테고리 정의에 추가**

해당 파일에서 `MIGRATABLE_CATEGORIES` 또는 동등한 enum 을 찾아 추가:
```javascript
{
  id: 'careerEvents',
  label: '커리어 타임라인',
  guestKey: 'snuhmate_career_events_guest',
  uidKeyPattern: (uid) => `snuhmate_career_events_uid_${uid}`,
  recommended: true,
}
```

- [x] **Step 2: captureGuestMigrationSnapshot 에도 포함되는지 확인**

같은 파일에서 snapshot 캡처 함수가 위 정의를 자동으로 순회하는지 검증. 만약 hard-coded 면 같은 패턴으로 하나 추가.

- [x] **Step 3: 수동 검증 (Playwright)**

```bash
# dev server 가 떠 있다고 가정
```
시나리오:
1. 게스트 모드에서 커리어 이벤트 1건 추가
2. 로그인 (Firebase 로그인 트리거)
3. 마이그레이션 다이얼로그 노출 → "커리어 타임라인" 카테고리가 선택 가능 상태인지 확인

- [x] **Step 4: Commit**

```bash
git add apps/web/src/firebase/migration-dialog.js
git commit -m "feat(career): 게스트→로그인 마이그레이션 다이얼로그에 career_events 추가"
```

---

## Task 7: 통합 검증 + Playwright smoke

**Files:** (검증만, 코드 변경 없음)

- [x] **Step 1: 전체 테스트 + lint + build**

```bash
pnpm lint && pnpm check && pnpm test:unit && pnpm --filter @snuhmate/web build
```
Expected:
- lint: 0 errors
- check: 0 errors
- unit: 472+ tests pass (target: 484+ with 신규 11건)
- build: complete

- [x] **Step 2: Playwright — 4가지 시각 확인**

스크립트 (수동 실행):
1. `/app?tab=profile` → 근무 책갈피 전환
2. **현재 진행 근무처 검증**: 근무처 필터 → "핵의학과" 가 과거 요약이 아닌 현재 카드(border emerald, "지금" pulse) 로 표시
3. **다음 승급 카드 검증**: hero stat 아래 "다음 자동승격 · 2026.06 · J2 → J3 자동승격" 카드 노출. 항목별 breakdown "기준기본급 +₩343,000 /월 · 능력급 +₩116,300 /월 · 상여금 +₩XX /월" 표시
4. **연차 동적 주입**: 연차·휴가 필터 → "2026년 연차 사용 N일 / 잔여 M일" 동적 카드 노출 (LEAVE 탭에서 추가한 사용량 반영)
5. **로그인 동기화**: localStorage 의 `snuhmate_career_events_guest` → 로그인 후 `snuhmate_career_events_uid_{uid}` 로 마이그레이션, Firestore 쓰기 발생 확인 (network 탭)

- [x] **Step 3: Commit + push**

```bash
git push origin main
```

---

## Self-Review Notes

- Spec 4건 모두 task 매핑됨 (Fix #1 → Task 1 / Fix #2 → Task 2-3 / Fix #3 → Task 4 / Fix #4 → Task 5-6)
- 신규 함수 시그니처 일관성: `_careerEventStatus(ev, now)`, `computeDynamicLeaveEvents(profile, now)`, `generateSeedEvents(profile)`, `writeAllCareerEvents(db, uid, events)`, `fetchAllCareerEvents(db, uid)` — 모두 명시
- Task 4 의 async render 변경은 cascade 영향 큼 — 호출 사이트 (`initProfileTab`, `switchProfileSection`, filter 클릭 핸들러, `careerEventsChanged` 이벤트 리스너) 모두 await 적용 필요. 누락 시 Promise 가 dangling 되어 race 발생.
- Task 5 의 hydrate 분기는 정확한 hydrate.js 패턴이 파일 구조에 따라 다름 — 같은 파일의 work-history hydrate 블록을 그대로 카피해 키만 바꾸는 것이 안전.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run `/autoplan` for full review pipeline, or individual reviews above.
