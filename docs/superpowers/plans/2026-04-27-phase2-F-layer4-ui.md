# Phase 2-F: Layer 4 — UI / DOM 모듈 ESM 전환

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 18개 UI/DOM 모듈 (~10,000줄) 을 ESM 으로 전환. **150개 inline onclick 호환성 보존이 핵심**. Layer 5 (entry) 직전이므로 가장 큰 위험.

**Architecture:** UI 모듈은 Layer 0~3 의존 + DOM 조작. inline onclick (`onclick="switchTab('home')"` 등) 은 `window.X` 에 노출되어야 동작 → 모든 onclick 핸들러 함수에 `window.fn = fn` 호환층 필수. 18개를 5개 그룹으로 나눠 점진적 전환.

**Tech Stack:** ES Module, Vitest 4.x, Vite 5.x.

**SPEC:** `docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md` §2 Layer 4, §3 D2 (onclick 호환층), §6 위험

---

## File Structure (변환 대상 모듈 — 18개)

| 그룹 | 모듈 | 크기 | 설명 |
|------|------|------|------|
| **G1: 기반 UI** | shared-layout.js | 215 | header/footer 공통 렌더 |
|  | tab-loader.js | 80 | 탭 fragment lazy load |
|  | utils-lazy.js | 33 | 게으른 로드 헬퍼 |
|  | sentry.js | 98 | 에러 리포팅 |
|  | config.js | 14 | 환경 설정 |
| **G2: 작은 UI** | settings-ui.js | 102 | 설정 탭 |
|  | inline-ui-helpers.js | 73 | onclick 헬퍼 |
|  | share-utils.js | 114 | 공유 유틸 |
|  | migration-overlay.js | 58 | 마이그레이션 오버레이 |
|  | orphan-recovery.js | 125 | 데이터 복구 |
|  | insight-engine.js | 126 | 인사이트 |
|  | job-templates.js | 323 | 직업 템플릿 |
| **G3: 중간 UI** | salary-parser.js | 1,413 | 급여명세서 파서 |
|  | resume.js | 448 | 이력서 |
|  | work-history.js | 738 | 근로이력 |
|  | retirement.js | 395 | 퇴직금 페이지 (entry 부분 제외) |
| **G4: 큰 탭 UI** | profile-tab.js | 940 | 개인정보 탭 |
|  | leave-tab.js | 1,165 | 휴가 탭 |
|  | payslip-tab.js | 808 | 급여명세서 탭 |
|  | pay-estimation.js | 873 | 급여 예상 |
|  | payroll-views.js | 985 | 급여 탭 렌더 |
| **G5: 페이지 entry-인접** | regulation.js | 1,144 | 규정 페이지 (UI 부분만 — entry 는 Phase 2-G) |
|  | dashboard.js | 288 | dashboard.html |
|  | schedule_suite.js | 506 | schedule_suite.html |

> **app.js (3,876줄)** 와 entry 진입점은 Phase 2-G.

---

## 호환층 원칙 (모든 모듈 공통)

```js
// Before:
const _renderHeader = () => { ... };
window.renderHeader = _renderHeader;  // 또는 onclick 에서 직접 참조

// After:
export function renderHeader() { ... }

if (typeof window !== 'undefined') {
  window.renderHeader = renderHeader;  // 호환층
}
```

**inline onclick 호환층 — 150개 보존**:

```bash
# onclick 안에서 호출되는 모든 함수 인벤토리 추출
grep -rho 'onclick="[a-zA-Z_]*' --include='*.html' --include='*.js' . | sort -u > /tmp/onclick-funcs.txt
```

각 함수가 어떤 모듈에 있는지 매핑 → 그 모듈에서 `window.fn = fn` 노출 보장.

---

## Task 0: worktree + onclick 인벤토리

- [ ] **Step 0.1: worktree**

```bash
git worktree add -b feat/phase2-F-layer4 ../bhm_overtime-phase2-F
cd ../bhm_overtime-phase2-F
```

- [ ] **Step 0.2: onclick 인벤토리 작성**

```bash
grep -rhoE 'onclick="[a-zA-Z_][a-zA-Z0-9_.]*' --include='*.html' --include='*.js' . | grep -v node_modules | grep -v dist | sed 's/onclick="//' | sort -u > /tmp/onclick-funcs.txt
wc -l /tmp/onclick-funcs.txt
cat /tmp/onclick-funcs.txt
```

> 모든 inline onclick 함수 인벤토리 — Phase 2-F 종료 시점까지 모두 `window.X` 로 노출되어 있어야 함.

- [ ] **Step 0.3: 현재 window 노출 인벤토리**

```bash
grep -rhoE 'window\.[a-zA-Z_][a-zA-Z0-9_]*' --include='*.js' . | grep -v node_modules | grep -v dist | sort -u > /tmp/window-exposes-before.txt
wc -l /tmp/window-exposes-before.txt
```

- [ ] **Step 0.4: baseline**

```bash
npm run test:unit  # 164 passed (Phase 2-E 후)
```

---

## Task 1: G1 — 기반 UI 5개 모듈

**Files:**
- Modify: `shared-layout.js`, `tab-loader.js`, `utils-lazy.js`, `sentry.js`, `config.js`

> **이 그룹은 다른 모듈의 의존**. 가장 먼저 변환.

- [ ] **Step 1.1: 실패 통합 테스트 추가**

`tests/unit/foundation.test.js` 에 케이스 추가:

```js
describe('Layer 4 G1 — 기반 UI ESM exports', () => {
  it('shared-layout.js: import 동작', async () => {
    const mod = await import('../../shared-layout.js');
    // shared-layout 의 주요 export (renderHeader 등) 확인
    expect(mod).toBeDefined();
  });
  it('tab-loader.js: import 동작', async () => {
    const mod = await import('../../tab-loader.js');
    expect(mod).toBeDefined();
  });
  it('utils-lazy.js: import 동작', async () => {
    const mod = await import('../../utils-lazy.js');
    expect(mod).toBeDefined();
  });
  it('sentry.js: import 동작', async () => {
    const mod = await import('../../sentry.js');
    expect(mod).toBeDefined();
  });
  it('config.js: import 동작', async () => {
    const mod = await import('../../config.js');
    expect(mod).toBeDefined();
  });
});
```

- [ ] **Step 1.2: 5개 모듈 변환**

각 모듈에 다음 패턴 적용:

```js
// 모듈 시작 부분
import { /* 필요한 Layer 0~3 모듈 */ } from './X.js';

// 기존 본문 그대로 (const X = {...} 또는 function 선언)

// 모듈 끝
export { /* 노출할 심볼 */ };

if (typeof window !== 'undefined') {
  // 기존 window.X 노출 모두 보존
  window.X = X;
  // ...
}
```

**구체 변환**:

`shared-layout.js`:
- 기존 IIFE / window.X 패턴 → ESM. `import { AppLock } from './appLock.js'` (사용 시).
- 기존 `<script>` 태그 로드 순서 의존 제거.

`tab-loader.js`:
- 기존 prefetchTabs / loadTab 함수 → export.
- `window.loadTab` / `window.prefetchTabs` 호환층 보존 (app.js IIFE 가 사용).

`utils-lazy.js`, `sentry.js`, `config.js`:
- 단순 IIFE → export 변환.

- [ ] **Step 1.3: 테스트 PASS**

```bash
npx vitest run tests/unit/foundation.test.js -t "G1"
npm run test:unit  # 169 passed (5 추가)
```

- [ ] **Step 1.4: 브라우저 검증**

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP:
- 9 HTML 모두 접속 → header/footer 렌더 정상
- 탭 전환 동작 (tab-loader)
- 콘솔 에러 0

```bash
kill $DEV_PID
```

- [ ] **Step 1.5: 커밋**

```bash
git add shared-layout.js tab-loader.js utils-lazy.js sentry.js config.js tests/unit/foundation.test.js
git commit -m "feat(phase2-F): G1 기반 UI 5개 모듈 ESM 전환

- shared-layout / tab-loader / utils-lazy / sentry / config → export
- window.X 호환층 보존 (다른 IIFE 모듈 사용)
- foundation.test.js G1 5/5 PASS
- 9 HTML header/footer + 탭 전환 동작"
```

---

## Task 2: G2 — 작은 UI 7개 모듈

**Files:**
- Modify: `settings-ui.js`, `inline-ui-helpers.js`, `share-utils.js`, `migration-overlay.js`, `orphan-recovery.js`, `insight-engine.js`, `job-templates.js`

- [ ] **Step 2.1: 실패 테스트 (7개 import 검증)**

`tests/unit/foundation.test.js` G2 describe 추가, 7개 모듈 import 검증.

- [ ] **Step 2.2: 7개 모듈 변환**

각 모듈에 동일 패턴 적용:
- import { 의존 모듈 } from './X.js'
- export { 심볼 }
- window.X = X 호환층 (onclick 의존성 보존)

**특별 주의**:
- `inline-ui-helpers.js`: 이름 그대로 onclick 헬퍼 — **모든 함수 window 노출 필수**.
- `settings-ui.js`: `window.loadSettings` 가 undefined 였던 과거 버그 — `import { loadSettings } from '...'` 로 직접 import.

- [ ] **Step 2.3: 테스트 PASS + 브라우저 검증**

```bash
npm run test:unit  # 176 passed (G1 5 + G2 7)
```

```bash
npm run dev &
sleep 3
```

Playwright MCP:
- 설정 탭 → AppLock 토스트 동작
- 마이그레이션 오버레이 표시
- onclick 핸들러 동작 (inline-ui-helpers)
- 콘솔 에러 0

- [ ] **Step 2.4: 커밋**

```bash
git add settings-ui.js inline-ui-helpers.js share-utils.js migration-overlay.js orphan-recovery.js insight-engine.js job-templates.js tests/unit/foundation.test.js
git commit -m "feat(phase2-F): G2 작은 UI 7개 모듈 ESM 전환

- settings-ui / inline-ui-helpers / share-utils / migration-overlay / orphan-recovery / insight-engine / job-templates → export
- inline-ui-helpers: 모든 onclick 함수 window 노출 보존
- settings-ui: window.loadSettings → import { loadSettings }
- 콘솔 에러 0, 설정/마이그레이션 동작"
```

---

## Task 3: G3 — 중간 UI 4개 모듈

**Files:**
- Modify: `salary-parser.js`, `resume.js`, `work-history.js`, `retirement.js`

- [ ] **Step 3.1: 실패 테스트 추가**

`tests/unit/foundation.test.js` G3 4개.

- [ ] **Step 3.2: 4개 모듈 변환**

특히 `salary-parser.js` (1,413줄) — 가장 큰 모듈. PDF/이미지 파싱 로직 포함. import 추가 + export + window.X 호환층 패턴 동일.

`retirement.js`: UI 부분만 (entry 는 Phase 2-G). `import { RetirementEngine } from './retirement-engine.js'`.

`work-history.js`: localStorage 키 보존 검증 (이력 데이터).

- [ ] **Step 3.3: 테스트 + 브라우저 검증**

```bash
npm run test:unit  # 180 passed (G1+G2+G3 16)
```

Playwright MCP:
- 급여 탭 → 명세서 업로드 + 파싱 (salary-parser)
- 개인정보 탭 → 이력서 입력 (resume)
- 근로이력 입력 (work-history)
- retirement.html → 시뮬레이션
- 콘솔 에러 0

- [ ] **Step 3.4: 커밋**

```bash
git add salary-parser.js resume.js work-history.js retirement.js tests/unit/foundation.test.js
git commit -m "feat(phase2-F): G3 중간 UI 4개 모듈 ESM 전환

- salary-parser / resume / work-history / retirement → export
- import 그래프: salary-parser → CALC, resume/work-history → PROFILE, retirement → RetirementEngine
- 명세서 파싱 + 이력서 입력 + 퇴직금 시뮬레이션 콘솔 에러 0"
```

---

## Task 4: G4 — 큰 탭 UI 5개 모듈 (가장 위험)

**Files:**
- Modify: `profile-tab.js`, `leave-tab.js`, `payslip-tab.js`, `pay-estimation.js`, `payroll-views.js`

> **이 그룹이 가장 많은 inline onclick 보유** — 신중히 진행.

- [ ] **Step 4.1: 실패 테스트 추가**

`tests/unit/foundation.test.js` G4 5개 import 검증.

- [ ] **Step 4.2: 모듈별 변환 + onclick 보존**

각 모듈에 onclick 함수 인벤토리:

```bash
# profile-tab.js 안에서 정의 + onclick 에서 호출되는 함수
grep -E 'function [a-zA-Z_]+\(|^const [a-zA-Z_]+ =' profile-tab.js
grep -rho 'onclick="[a-zA-Z_]*' index.html public/tabs/profile-tab.html 2>/dev/null | sort -u
```

각 onclick 함수는 반드시 `window.fn = fn` 노출.

**변환 패턴**:
```js
import { PROFILE } from './profile.js';
import { CALC } from './calculators.js';

export function _renderProfileForm() { ... }
export function _saveProfile() { ... }
// ...

if (typeof window !== 'undefined') {
  window._renderProfileForm = _renderProfileForm;
  window._saveProfile = _saveProfile;
  // ... 모든 onclick 의존 함수
}
```

- [ ] **Step 4.3: 테스트 + 브라우저 전체 검증 — 핵심**

```bash
npm run test:unit  # 185 passed
```

```bash
npm run dev &
sleep 3
```

Playwright MCP — **CLAUDE.md 필수 체크리스트 + onclick 동작**:

- [ ] 홈 탭 요약 카드
- [ ] 급여 탭 3 서브탭 (계산/명세서/퇴직금) — payroll-views + payslip-tab
- [ ] 시간외 탭 시급 경고 + +/- 버튼 (inline onclick)
- [ ] 휴가 탭 연차 + 추가/삭제 버튼 (inline onclick)
- [ ] 개인정보 탭 저장/불러오기 (profile-tab)
- [ ] 급여 예상 (pay-estimation)
- [ ] 콘솔 에러 0건

- [ ] **Step 4.4: onclick 인벤토리 검증**

```bash
# Phase 2-F 시작 시 작성한 onclick 인벤토리 모두 window 노출됐는지
grep -rhoE 'window\.[a-zA-Z_][a-zA-Z0-9_]*' --include='*.js' . | grep -v node_modules | grep -v dist | sort -u > /tmp/window-exposes-after-G4.txt
diff /tmp/window-exposes-before.txt /tmp/window-exposes-after-G4.txt | grep '^<'
# Expected: 누락된 window.X 노출 0
```

각 onclick 함수가 window 에 있는지 검증:
```bash
while IFS= read -r fn; do
  if ! grep -q "window\.${fn} = ${fn}" *.js; then
    echo "MISSING: window.${fn}"
  fi
done < /tmp/onclick-funcs.txt
```

Expected: MISSING 0건.

- [ ] **Step 4.5: 커밋**

```bash
git add profile-tab.js leave-tab.js payslip-tab.js pay-estimation.js payroll-views.js tests/unit/foundation.test.js
git commit -m "feat(phase2-F): G4 큰 탭 UI 5개 모듈 ESM 전환 — onclick 호환층 보존

- profile-tab / leave-tab / payslip-tab / pay-estimation / payroll-views → export
- 모든 onclick 의존 함수 window.fn = fn 노출 (150개 inline onclick 100%)
- import 그래프: 모든 Layer 0~3 모듈
- CLAUDE.md 필수 체크리스트 9 항목 콘솔 에러 0
- onclick 인벤토리 누락 0 검증"
```

---

## Task 5: G5 — 페이지 entry-인접 3개 모듈

**Files:**
- Modify: `regulation.js` (UI 부분), `dashboard.js`, `schedule_suite.js`

> regulation.js / dashboard.js / schedule_suite.js 의 entry 진입점 부분은 Phase 2-G. 여기선 UI 함수만 export.

- [ ] **Step 5.1: 실패 테스트 + 변환**

`regulation.js` (1,144줄):
- `import { RC } from './regulation-constants.js'` (이미 Phase 2-B 에서 RC 호환층 존재)
- export 함수들
- window.X 호환층

`dashboard.js`, `schedule_suite.js`: 동일 패턴.

- [ ] **Step 5.2: 페이지별 스모크**

```bash
npm run dev &
sleep 3
```

Playwright MCP:
- regulation.html → 본문 렌더 + placeholder 사라짐 + 콘솔 에러 0
- dashboard.html → 콘솔 에러 0
- schedule_suite.html → 콘솔 에러 0

- [ ] **Step 5.3: 커밋**

```bash
git add regulation.js dashboard.js schedule_suite.js tests/unit/foundation.test.js
git commit -m "feat(phase2-F): G5 페이지 인접 3개 모듈 ESM 전환

- regulation.js (UI) / dashboard.js / schedule_suite.js → export
- entry 진입점 부분은 Phase 2-G 유보
- regulation/dashboard/schedule_suite 페이지 콘솔 에러 0"
```

---

## Task 6: 통합 검증 + Playwright 전체 스모크

- [ ] **Step 6.1: 단위 테스트 + audit**

```bash
npm run test:unit  # 188 passed (Phase 2-F 추가 24)
npm run check:regulation
npm run check:paytable
```

- [ ] **Step 6.2: Vite production 빌드**

```bash
npm run build
ls dist/assets/ | wc -l   # hash 자산 개수 비교
du -sh dist/              # 크기 비교 (gzip 효과)
```

- [ ] **Step 6.3: Playwright 전체 9 화면 + onclick 동작**

```bash
npm run preview &
sleep 3
```

Playwright MCP — **모든 9 HTML × 모든 inline onclick × CLAUDE.md 체크리스트**:

- [ ] index.html 9 탭 전체
- [ ] regulation.html 본문 + onclick (6개)
- [ ] retirement.html 시뮬레이션
- [ ] dashboard.html
- [ ] onboarding.html (1 onclick)
- [ ] terms.html, privacy.html, tutorial.html, schedule_suite.html
- [ ] 콘솔 에러 0건 (9개 모두)

- [ ] **Step 6.4: 커밋 (검증 메모)**

```bash
git commit --allow-empty -m "test(phase2-F): Layer 4 ESM 전환 검증 — 18 모듈 + 150 onclick

- 188 unit tests passed
- 9 HTML × 모든 onclick 동작 콘솔 에러 0
- onclick 인벤토리 누락 0
- check:regulation / check:paytable 0 issue"
```

---

## Task 7: PR + 머지

- [ ] **Step 7.1: PR**

```bash
git push -u origin feat/phase2-F-layer4
gh pr create --title "Phase 2-F: Layer 4 UI 18개 모듈 ESM 전환" --body "$(cat <<'EOF'
## Summary
- 18 UI 모듈 → ESM (~10,000줄)
- 5 그룹 점진 전환 (G1 기반 → G2 작은 UI → G3 중간 → G4 큰 탭 → G5 페이지)
- 150 inline onclick 100% window 호환층 보존

## Test plan
- [x] 188 unit tests passed
- [x] 9 HTML × 모든 onclick 콘솔 에러 0
- [x] onclick 인벤토리 누락 0 (자동 grep 검증)
- [x] check:regulation / check:paytable 0 issue
- [ ] Vercel preview 배포 검증 (9 화면 + onclick)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 7.2: Vercel preview 검증**

PR Vercel preview URL → 9 화면 × 핵심 onclick 동작 확인.

- [ ] **Step 7.3: 머지**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git worktree remove ../bhm_overtime-phase2-F
```

---

## Self-Review Checklist

- [ ] 18 UI 모듈: ESM `import` + `export` + `window.X` 호환층
- [ ] 150 inline onclick 모두 window 노출 (자동 grep 검증)
- [ ] 9 HTML 콘솔 에러 0
- [ ] CLAUDE.md 필수 체크리스트 9 항목 통과
- [ ] localStorage round-trip 회귀 0
- [ ] 188 unit tests passed
- [ ] foundation.test.js Layer 0+1+2+3+4 = ~28/28 PASS

---

## 다음 단계

Phase 2-G: Layer 5 Entry (app.js / regulation.js entry / retirement.js entry). 진입점 모듈을 ESM 으로 + HTML script 태그를 `type="module"` 로 전환.
