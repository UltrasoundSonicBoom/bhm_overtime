# Phase 4-A: 명세서 시계열 → 근무이력 자동 시드 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 명세서 시간순 정렬 + 부서 변경 segment 검출 → 근무이력 자동 시드. 사용자 수동 항목 0회 손실.

**Architecture:** salary-parser.js (신규 함수 2개 + normalizeDept) + work-history.js (source 필드 + UI 배지) + profile-tab.js (트리거 통합). Vite/ESM 번들 변경 0. window.X 호환층 일관 노출 (Phase 3-F 학습).

**Tech Stack:** ES Module + Vitest jsdom + Playwright e2e.

**SPEC:** [docs/superpowers/specs/2026-04-27-phase4-A-payslip-timeline.md]

---

## File Structure

```
salary-parser.js                                 ← _buildSegmentsFromPayslips / rebuildWorkHistoryFromPayslips / normalizeDept 신규
work-history.js                                  ← source 필드 migration + 배지 + 알림 배너 + empty CTA
profile-tab.js                                   ← _seedFirstWorkFromProfile soft-deprecate (source='auto' 마킹) + 폴백 유지
tests/unit/work-history-migration.test.js        ← 신규 — Task 1 schema migration
tests/unit/rebuild-work-history.test.js          ← 신규 — 7 TDD 시나리오 (jsdom)
public/tabs/tab-profile.html                     ← Empty CTA 버튼 + 알림 배너 컨테이너
```

---

## Task 1: schema migration + source 필드 + 기본 회귀 가드

**Files:**
- Modify: `work-history.js` (record load 시 migration + save 시 source 보존)
- Create: `tests/unit/work-history-migration.test.js`

- [ ] **Step 1.1: 실패 테스트 작성**

`tests/unit/work-history-migration.test.js`:

```js
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
});

beforeEach(() => { localStorage.clear(); });

describe('work-history migration: source 필드', () => {
  it('기존 record (source 없음) → load 시 source="user" 기본값', async () => {
    const oldRec = { id: 'a1', workplace: 'X', dept: 'A', from: '2020-01', to: '', role: '', desc: '', rotations: [], updatedAt: 'now' };
    localStorage.setItem('bhm_work_history', JSON.stringify([oldRec]));
    await import('../../work-history.js');
    const loaded = window._loadWorkHistory();
    expect(loaded[0].source).toBe('user');
  });

  it('save 시 source 필드 보존 (auto/user 양쪽)', async () => {
    await import('../../work-history.js');
    const records = [
      { id: 'a1', workplace: 'X', dept: 'A', from: '2020-01', to: '', role: '', desc: '', rotations: [], source: 'auto', updatedAt: 'now' },
      { id: 'b1', workplace: 'X', dept: 'B', from: '2021-01', to: '', role: '', desc: '', rotations: [], source: 'user', updatedAt: 'now' },
    ];
    window._saveWorkHistory(records);
    const reloaded = window._loadWorkHistory();
    expect(reloaded[0].source).toBe('auto');
    expect(reloaded[1].source).toBe('user');
  });
});
```

- [ ] **Step 1.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/work-history-migration.test.js
```

Expected: FAIL — source 필드 없음.

- [ ] **Step 1.3: work-history.js migration 추가**

`work-history.js` 의 기존 workplace/dept 분리 마이그레이션 직후:

```js
// Phase 4-A: source 필드 migration — 기존 record 는 'user' 기본값 (보호)
records.forEach(r => { if (!r.source) r.source = 'user'; });
```

- [ ] **Step 1.4: 테스트 PASS + 회귀 0**

```bash
npm run test:unit
```

Expected: 신규 2 PASS + 기존 161 회귀 0.

- [ ] **Step 1.5: 커밋**

```bash
git add work-history.js tests/unit/work-history-migration.test.js
git commit -m "feat(phase4-A-1): work-history record source 필드 + migration"
```

---

## Task 2: _buildSegmentsFromPayslips + normalizeDept

**Files:**
- Modify: `salary-parser.js`
- Create: `tests/unit/rebuild-work-history.test.js` (시나리오 1, 2, 3, 7)

- [ ] **Step 2.1: 실패 테스트 작성**

`tests/unit/rebuild-work-history.test.js`:

```js
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
});

beforeEach(() => { localStorage.clear(); });

function seedPayslip(year, month, dept, jobType, payGrade) {
  const yyyymm = year + '_' + String(month).padStart(2, '0');
  const key = 'salaryParser_payslip_' + yyyymm;
  localStorage.setItem(key, JSON.stringify({
    payPeriod: year + '-' + String(month).padStart(2, '0'),
    employeeInfo: { department: dept, jobType, payGrade, hireDate: '2020-03-01', name: '홍길동', employeeNumber: '12345' },
    salaryItems: [{ name: '본봉', amount: 3000000 }],
  }));
}

describe('_buildSegmentsFromPayslips', () => {
  it('시나리오 1: 동일 부서 3개월 → 1 segment', async () => {
    seedPayslip(2026, 2, '간호본부', '간호', 'J3-5');
    seedPayslip(2026, 3, '간호본부', '간호', 'J3-5');
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips();
    expect(segs.length).toBe(1);
    expect(segs[0].dept).toBe('간호본부');
  });

  it('시나리오 2: 4월 dept-A / 3월 dept-A / 2월 dept-B → 2 segments', async () => {
    seedPayslip(2026, 2, '내과', '간호', 'J3-3');
    seedPayslip(2026, 3, '간호본부', '간호', 'J3-4');
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips();
    expect(segs.length).toBe(2);
    expect(segs[0].dept).toBe('내과');
    expect(segs[1].dept).toBe('간호본부');
  });

  it('시나리오 3: profile.hireDate < 첫 명세서 → segments[0].from = hireDate', async () => {
    seedPayslip(2024, 1, '간호본부', '간호', 'J3-1');
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips({ hireDate: '2020-03-01' });
    expect(segs[0].from).toBe('2020-03-01');
  });

  it('시나리오 7: payGrade J2-3 → J3-1 동일 부서 → 1 segment', async () => {
    seedPayslip(2026, 2, '간호본부', '간호', 'J2-3');
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-1');
    await import('../../salary-parser.js');
    const segs = window.SALARY_PARSER._buildSegmentsFromPayslips();
    expect(segs.length).toBe(1);
  });
});
```

- [ ] **Step 2.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/rebuild-work-history.test.js
```

- [ ] **Step 2.3: salary-parser.js 신규 함수 + window 노출**

부서 정규화:

```js
const DEPT_ALIAS = {
  '간호본부': '간호본부', '간호부': '간호본부',
};
function normalizeDept(dept) {
  if (!dept) return '';
  const trimmed = String(dept).trim().normalize('NFKC');
  return DEPT_ALIAS[trimmed] || trimmed;
}
```

Type whitelist:
```js
const PAYSLIP_TYPE_WHITELIST = new Set(['payslip', '월급', undefined, null, '']);
```

Segment builder:
```js
function _buildSegmentsFromPayslips(profile) {
  profile = profile || {};
  const inv = listSavedMonths();
  const now = new Date();
  const curYM = now.getFullYear() * 100 + (now.getMonth() + 1);
  const payslips = inv
    .map(m => Object.assign({}, m, { data: loadMonthlyData(m.year, m.month, m.type) }))
    .filter(m => m.data && m.data.employeeInfo && m.data.employeeInfo.department)
    .filter(m => PAYSLIP_TYPE_WHITELIST.has(m.type) || !m.type)
    .filter(m => (m.year * 100 + m.month) <= curYM)
    .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));

  const segments = [];
  let cur = null;
  for (const p of payslips) {
    const dept = p.data.employeeInfo.department;
    const deptKey = normalizeDept(dept);
    const fromYMD = p.year + '-' + String(p.month).padStart(2, '0') + '-01';
    if (!cur || cur.deptKey !== deptKey) {
      if (cur) segments.push(cur);
      cur = {
        deptKey, dept, from: fromYMD, to: '',
        jobType: p.data.employeeInfo.jobType || '',
        payslips: [p],
      };
    } else {
      cur.payslips.push(p);
    }
  }
  if (cur) segments.push(cur);

  if (profile.hireDate && segments.length > 0 && profile.hireDate < segments[0].from) {
    segments[0].from = profile.hireDate;
  }

  for (let i = 0; i < segments.length - 1; i++) {
    const next = segments[i + 1];
    const parts = next.from.split('-').map(Number);
    const prevMonth = new Date(parts[0], parts[1] - 1, 0);
    segments[i].to = prevMonth.getFullYear() + '-'
      + String(prevMonth.getMonth() + 1).padStart(2, '0') + '-'
      + String(prevMonth.getDate()).padStart(2, '0');
  }

  return segments;
}
```

`SALARY_PARSER` return 객체에 추가:
```js
return {
  // ... 기존 ...
  _buildSegmentsFromPayslips,
  normalizeDept,
};
```

- [ ] **Step 2.4: 테스트 PASS**

```bash
npm run test:unit
```

Expected: 6 PASS + 회귀 0.

- [ ] **Step 2.5: 커밋**

```bash
git add salary-parser.js tests/unit/rebuild-work-history.test.js
git commit -m "feat(phase4-A-2): _buildSegmentsFromPayslips + normalizeDept (TDD 시나리오 1/2/3/7)"
```

---

## Task 3: rebuildWorkHistoryFromPayslips + 보호 정책

**Files:**
- Modify: `salary-parser.js`
- Modify: `tests/unit/rebuild-work-history.test.js` (시나리오 4, 5)

- [ ] **Step 3.1: 시나리오 4, 5 추가**

```js
describe('rebuildWorkHistoryFromPayslips: 보호 정책', () => {
  it('시나리오 4: user record 1개 + 명세서 변경 → mode=banner', async () => {
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const result = window.SALARY_PARSER.rebuildWorkHistoryFromPayslips({
      profile: { hireDate: '2020-03-01' },
      existing: [{ id: 'u1', workplace: 'X', dept: 'A', from: '2020-03-01', to: '', source: 'user', rotations: [], role: '', desc: '', updatedAt: 'now' }],
      hospital: '서울대학교병원',
    });
    expect(result.mode).toBe('banner');
    expect(result.existing.length).toBe(1);
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it('시나리오 5: 모든 source=auto → mode=replace', async () => {
    seedPayslip(2026, 4, '간호본부', '간호', 'J3-5');
    await import('../../salary-parser.js');
    const result = window.SALARY_PARSER.rebuildWorkHistoryFromPayslips({
      profile: { hireDate: '2020-03-01' },
      existing: [{ id: 'a1', workplace: 'X', dept: 'A', from: '2020-03-01', to: '', source: 'auto', rotations: [], role: '', desc: '', updatedAt: 'now' }],
      hospital: '서울대학교병원',
    });
    expect(result.mode).toBe('replace');
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.records[0].source).toBe('auto');
  });
});
```

- [ ] **Step 3.2: salary-parser.js rebuildWorkHistoryFromPayslips**

```js
function rebuildWorkHistoryFromPayslips(opts) {
  opts = opts || {};
  const profile = opts.profile || {};
  const existing = opts.existing || [];
  const hospital = opts.hospital || '서울대학교병원';

  const segments = _buildSegmentsFromPayslips(profile);

  if (segments.length === 0) {
    return { mode: 'empty', segments: [], existing };
  }

  const hasUserRecord = existing.some(r => (r.source || 'user') === 'user');
  if (hasUserRecord) {
    return { mode: 'banner', segments, existing };
  }

  const records = segments.map((s, i) => ({
    id: Date.now().toString(36) + '_' + i + '_auto',
    workplace: hospital,
    dept: s.dept,
    from: s.from,
    to: s.to,
    role: s.jobType || '',
    desc: '명세서 자동',
    rotations: [],
    source: 'auto',
    updatedAt: new Date().toISOString(),
  }));
  return { mode: 'replace', records, segments, existing };
}
```

`SALARY_PARSER` export 추가.

- [ ] **Step 3.3: 테스트 + 회귀**

```bash
npm run test:unit
```

- [ ] **Step 3.4: 커밋**

```bash
git add salary-parser.js tests/unit/rebuild-work-history.test.js
git commit -m "feat(phase4-A-3): rebuildWorkHistoryFromPayslips 보호 정책 (시나리오 4/5)"
```

---

## Task 4: 폴백 + applyStableItemsToProfile 트리거 통합

**Files:**
- Modify: `salary-parser.js`
- Modify: `profile-tab.js`
- Modify: `tests/unit/rebuild-work-history.test.js` (시나리오 6)

- [ ] **Step 4.1: 시나리오 6 추가**

```js
describe('폴백: 명세서 0개', () => {
  it('시나리오 6: 명세서 0개 → mode=empty', async () => {
    await import('../../salary-parser.js');
    const result = window.SALARY_PARSER.rebuildWorkHistoryFromPayslips({
      profile: { hireDate: '2020-03-01', department: '간호본부', jobType: '간호' },
      existing: [],
    });
    expect(result.mode).toBe('empty');
  });
});
```

- [ ] **Step 4.2: applyStableItemsToProfile 끝부분 자동 호출 추가**

PROFILE.save() 직후:

```js
try {
  const existing = (typeof window !== 'undefined' && window._loadWorkHistory)
    ? window._loadWorkHistory() : [];
  const result = rebuildWorkHistoryFromPayslips({
    profile, existing, hospital: profile.hospital || '서울대학교병원',
  });
  if (result.mode === 'replace' && typeof window._saveWorkHistory === 'function') {
    window._saveWorkHistory(result.records);
    if (typeof window.renderWorkHistory === 'function') window.renderWorkHistory();
  } else if (result.mode === 'banner' && typeof window._showWorkHistoryUpdateBanner === 'function') {
    window._showWorkHistoryUpdateBanner(result.segments);
  }
} catch (e) { console.warn('[Phase 4-A] rebuild work history failed:', e); }
```

- [ ] **Step 4.3: profile-tab.js _seedFirstWorkFromProfile 의 시드에 source='auto' + rotations:[] 마킹**

```js
return {
  id: Date.now().toString(36) + '_seed',
  workplace: hospital,
  dept: dept,
  from: fromMonth,
  to: '',
  role: jobType,
  desc: '',
  rotations: [],
  source: 'auto',
  updatedAt: new Date().toISOString()
};
```

- [ ] **Step 4.4: 테스트 + 회귀**

```bash
npm run test:unit && npm run test:integration
```

- [ ] **Step 4.5: 커밋**

```bash
git add salary-parser.js profile-tab.js tests/unit/rebuild-work-history.test.js
git commit -m "feat(phase4-A-4): applyStableItemsToProfile 트리거 + _seedFirstWorkFromProfile source='auto'"
```

---

## Task 5: UI 배지 + 알림 배너 + Empty CTA + Playwright e2e

**Files:**
- Modify: `work-history.js`
- Modify: `public/tabs/tab-profile.html`

- [ ] **Step 5.1: work-history.js _renderItem 에 배지 추가**

source='auto' 시 헤더에 배지 element 추가 (createElement 패턴 — innerHTML 우회):

```js
if (item.source === 'auto') {
  const badge = document.createElement('span');
  badge.style.cssText = 'font-size:0.65rem; padding:2px 6px; background:rgba(99,102,241,.12); color:var(--accent-indigo); border-radius:8px; margin-left:6px;';
  badge.textContent = '🤖 명세서 자동';
  headerEl.appendChild(badge);
}
```

(정확한 위치는 _renderItem 의 dept 헤더 근처 — 기존 markup 패턴 참고)

- [ ] **Step 5.2: 알림 배너 함수 추가**

```js
function _showWorkHistoryUpdateBanner(segments) {
  const container = document.getElementById('workHistoryBanner');
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:10px 14px; background:rgba(245,158,11,.1); border-radius:8px; display:flex; gap:8px; align-items:center;';
  const msg = document.createElement('span');
  msg.textContent = '📋 명세서에서 부서 이동 ' + segments.length + '건 감지.';
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.style.fontSize = '0.8rem';
  btn.dataset.action = 'rebuildWorkHistoryFromPayslips';
  btn.textContent = '명세서로 재구성';
  wrap.appendChild(msg);
  wrap.appendChild(btn);
  container.appendChild(wrap);
  container.style.display = 'block';
}
window._showWorkHistoryUpdateBanner = _showWorkHistoryUpdateBanner;
```

- [ ] **Step 5.3: 강제 재구성 함수 + 위임 등록**

```js
function rebuildWorkHistoryFromPayslipsForceReplace() {
  const profile = window.PROFILE && window.PROFILE.load ? window.PROFILE.load() : {};
  const result = window.SALARY_PARSER.rebuildWorkHistoryFromPayslips({
    profile, existing: [], hospital: profile.hospital || '서울대학교병원',
  });
  if (result.mode === 'replace') {
    _saveWorkHistory(result.records);
    renderWorkHistory();
    const banner = document.getElementById('workHistoryBanner');
    if (banner) banner.style.display = 'none';
  }
}
window.rebuildWorkHistoryFromPayslipsForceReplace = rebuildWorkHistoryFromPayslipsForceReplace;

import { registerActions } from './shared-utils.js';
registerActions({
  rebuildWorkHistoryFromPayslips: () => rebuildWorkHistoryFromPayslipsForceReplace(),
});
```

- [ ] **Step 5.4: tab-profile.html 컨테이너 추가**

근무이력 list 직전:
```html
<div id="workHistoryBanner" style="display:none; margin-bottom:12px;"></div>
```

Empty CTA 버튼 (renderWorkHistory 안 empty 분기에서 표시):
```html
<button class="btn btn-primary" data-action="rebuildWorkHistoryFromPayslips" id="workHistoryEmptyCTA"
  style="margin-top:12px;">📋 명세서로 근무이력 재구성</button>
```

- [ ] **Step 5.5: 빌드 + Playwright e2e**

```bash
npm run build
npm run preview &
sleep 4
```

Playwright MCP 시뮬레이션:
- localStorage `salaryParser_payslip_2026_02` / `_03` / `_04` mock 시드 (dept-B / A / A)
- `salaryParser_payslip_index` 시드
- info 탭 → 근무이력 list 검증: 2 cards + 🤖 배지

- [ ] **Step 5.6: 커밋**

```bash
git add work-history.js public/tabs/tab-profile.html
git commit -m "feat(phase4-A-5): UI 배지 + 알림 배너 + Empty CTA + Playwright e2e"
```

---

## Task 6: 통합 검증 + main 머지

- [ ] **Step 6.1: 회귀 종합 검증**

```bash
npm run test:unit         # 168 passed (161 + 7 신규)
npm run test:integration  # 37 passed
npm run check:regulation  # 0 issue
npm run check:paytable    # drift 0/297
npm run build             # 빌드 성공
```

- [ ] **Step 6.2: main 머지 + push**

```bash
git checkout main
git merge --ff-only feat/phase4-A-payslip-timeline
git push origin main
git worktree remove ../bhm_overtime-phase4-A
git branch -d feat/phase4-A-payslip-timeline
```

---

## Self-Review

- [ ] 7 TDD 시나리오 모두 PASS
- [ ] 회귀 0 (161+37 → 168+37)
- [ ] source='user' 보호 정책 — 자동 덮어쓰기 0
- [ ] 모듈화 (Vite) 영향 0 (entry/번들 변경 없음)
- [ ] window.X 호환층 일관 노출
- [ ] localStorage 키 변경 0
- [ ] Playwright e2e 콘솔 에러 0

---

## 산출물

- `salary-parser.js`: `_buildSegmentsFromPayslips`, `rebuildWorkHistoryFromPayslips`, `normalizeDept`
- `work-history.js`: source 필드 + 배지 + 배너 + CTA
- `profile-tab.js`: 시드 source='auto' 마킹
- `tests/unit/work-history-migration.test.js` (2 케이스)
- `tests/unit/rebuild-work-history.test.js` (7 시나리오)
- `public/tabs/tab-profile.html`: 배너 컨테이너 + CTA
