# Phase 2-H: Cleanup — 자체 build.mjs 제거 + 회귀 검증 + 문서화

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 2 종료 단계. 자체 `scripts/build.mjs` 제거, IIFE 잔재 정리, 호환층 정리 검토, 회귀 전체 검증, CLAUDE.md / docs 갱신.

**Architecture:** Phase 2-A~G 가 모두 안정적으로 main 머지된 후 (1주+ 프로덕션 가동) 진행. 더 이상 필요 없는 백업 (build:legacy) 제거. window.X 호환층은 **유지** (inline onclick 보존을 위해 — Phase 3 onclick 위임 마이그레이션 시 제거).

**Tech Stack:** Vite 5.x, ES Module, Vitest 4.x.

**SPEC:** `docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md` §8 Phase 2-H, §3 D2 (호환층 유지)

---

## File Structure

```
scripts/build.mjs           ← 제거
package.json                ← scripts.build:legacy 제거
docs/
  CLAUDE.md (root)          ← Vite + ESM 컨벤션 갱신
  superpowers/specs/2026-04-27-phase2-modularization-spec.md  ← 완료 표시
  superpowers/plans/2026-04-27-phase2-*.md                     ← 완료 표시
docs/architecture/2026-04-27-phase2-completed.md  ← 신규 — 마이그레이션 회고
tests/integration/legacy-build-removed.test.js     ← 신규 — build.mjs 제거 검증
README.md                   ← 빌드 명령 갱신 (npm run build = vite build)
```

---

## Task 0: Phase 2-A~G 안정화 확인 (전제조건)

**Files:** none (검증만)

> **이 task 는 7+일간 프로덕션 가동 후 실행** — 회귀 0 확인 필수.

- [ ] **Step 0.1: main 브랜치 최신화**

```bash
git checkout main && git pull
```

- [ ] **Step 0.2: Phase 2-A~G 머지 확인**

```bash
git log --oneline | grep -E 'phase2-[A-G]' | head -10
```

Expected: A, B, C, D, E, F, G 7개 커밋(squash) 모두 보임.

- [ ] **Step 0.3: 프로덕션 회귀 확인**

- 사용자 보고 회귀 0건 (Phase 2-G 머지 후 7+일)
- Vercel 프로덕션 콘솔 에러 0
- localStorage 사용자 데이터 손실 보고 0건

> 만약 회귀 발견 시 Phase 2-H 진입 보류 — 해당 Layer 만 hotfix.

- [ ] **Step 0.4: worktree 생성**

```bash
git worktree add -b feat/phase2-H-cleanup ../bhm_overtime-phase2-H
cd ../bhm_overtime-phase2-H
```

---

## Task 1: scripts/build.mjs 제거

**Files:**
- Delete: `scripts/build.mjs`
- Modify: `package.json` (scripts.build:legacy 제거)
- Create: `tests/integration/legacy-build-removed.test.js`

- [ ] **Step 1.1: 실패 테스트 작성**

`tests/integration/legacy-build-removed.test.js`:

```js
// Phase 2-H 진입 기준: 자체 build.mjs 제거됨
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('Legacy build removed (Phase 2-H)', () => {
  it('scripts/build.mjs 가 없다', () => {
    expect(existsSync(join(ROOT, 'scripts/build.mjs'))).toBe(false);
  });

  it('package.json 에 build:legacy 스크립트 없다', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['build:legacy']).toBeUndefined();
  });

  it('build 스크립트는 vite build', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.build).toBe('vite build');
  });
});
```

- [ ] **Step 1.2: 테스트 실패 확인**

```bash
npx vitest run tests/integration/legacy-build-removed.test.js
```

Expected: FAIL — build.mjs 존재 + build:legacy 스크립트 존재.

- [ ] **Step 1.3: 파일 + 스크립트 제거**

```bash
git rm scripts/build.mjs
```

`package.json` 에서 `build:legacy` 제거:

```json
{
  "scripts": {
    "build": "vite build",
    // "build:legacy": "node scripts/build.mjs",  ← 제거
    "dev": "vite",
    "preview": "vite preview",
    ...
  }
}
```

- [ ] **Step 1.4: 테스트 PASS + 빌드 검증**

```bash
npx vitest run tests/integration/legacy-build-removed.test.js  # PASS
npm run build  # vite build 정상
```

- [ ] **Step 1.5: 커밋**

```bash
git add scripts package.json tests/integration/legacy-build-removed.test.js
git commit -m "feat(phase2-H): scripts/build.mjs 제거 — Vite 단일 빌드 확정

- scripts/build.mjs (50줄 자체 빌드) 삭제
- package.json scripts.build:legacy 제거
- legacy-build-removed.test.js: 회귀 방지"
```

---

## Task 2: IIFE 잔재 정리 (선택 — 검토 후 결정)

**Files:** 검토 (코드 변경 0 또는 일부 정리)

> **목표**: ESM 화 후에도 남은 IIFE/setTimeout 부트스트랩 검토. 안전한 것만 정리.

- [ ] **Step 2.1: IIFE 패턴 인벤토리**

```bash
grep -n '(function ()\s*{' *.js | grep -v node_modules | grep -v dist
grep -n 'setTimeout(.*\(\)' *.js | grep -v node_modules | grep -v dist | head -20
```

- [ ] **Step 2.2: AppLock 자동 트리거 검토**

`appLock.js` 안 `_autoTrigger` IIFE 가 ESM 환경에서도 필요한가?

ESM 모듈은 import 시 한 번 평가됨 → IIFE 없이 top-level await/call 가능.

```js
// Before:
const AppLock = (function () { ... return {...}; })();
// _autoTrigger IIFE
(function _autoTrigger() {
  if (typeof window !== 'undefined' && window.AppLock?.isEnabled?.()) {
    setTimeout(() => window.AppLock.checkAndPrompt(), 0);
  }
})();

// After (ESM — IIFE 불필요):
export const AppLock = (() => { ... return {...}; })();
if (typeof window !== 'undefined') {
  window.AppLock = AppLock;
}
// 부트스트랩은 entry (app.js / regulation.js) 에서 명시 호출
```

`app.js` / 다른 entry 안:
```js
import { AppLock } from './appLock.js';
// ... 다른 import
if (AppLock.isEnabled()) {
  AppLock.checkAndPrompt();
}
```

- [ ] **Step 2.3: data.js 부트스트랩 검토**

```js
// Before (data.js 내부):
if (typeof window !== 'undefined') {
  setTimeout(loadDataFromAPI, 10000);
}

// After (entry 에서 명시):
// app.js / regulation.js / retirement.js 에서:
import { loadDataFromAPI } from './data.js';
setTimeout(loadDataFromAPI, 10000);
```

> **선택 사항**. 현재 동작 그대로 두어도 무방 (Phase 3 reorganize 에서 처리).

- [ ] **Step 2.4: 정리 적용 (선택)**

위 검토 결과에 따라 일부 모듈 정리. 변경 시:

```bash
npm run test:unit  # 188 passed 유지
npm run build
npm run preview &
sleep 3
```

Playwright MCP 로 회귀 확인.

- [ ] **Step 2.5: 커밋 (변경 있을 시)**

```bash
git add -p  # 부분 커밋 검토
git commit -m "refactor(phase2-H): IIFE 잔재 정리 — entry 에서 명시 부트스트랩

- AppLock _autoTrigger IIFE → entry 에서 명시 호출
- data.js setTimeout(loadDataFromAPI) → entry 에서 명시
- ESM import 시점에 부트스트랩 자동 (IIFE 불필요)"
```

---

## Task 3: window.X 호환층 인벤토리 + 정리 정책 결정

**Files:** 검토 (정책 문서)
- Create: `docs/architecture/2026-04-27-window-compat-policy.md`

> **목적**: window.X 호환층은 inline onclick 위해 유지. Phase 3 (onclick 위임 마이그레이션) 까지 보존. 정책 명문화.

- [ ] **Step 3.1: 현재 window.X 노출 인벤토리**

```bash
grep -rhoE 'window\.[a-zA-Z_][a-zA-Z0-9_]*\s*=' --include='*.js' . | grep -v node_modules | grep -v dist | sort -u > /tmp/window-exposes-final.txt
wc -l /tmp/window-exposes-final.txt
cat /tmp/window-exposes-final.txt
```

- [ ] **Step 3.2: 인벤토리 분류**

각 노출을 카테고리로:
1. **inline onclick 의존** — 보존 필요
2. **다른 module 의존** — Phase 2 가 끝났으니 import 으로 변환 가능 (제거 candidate)
3. **debug / 콘솔 도움** — 보존 (개발 편의)

- [ ] **Step 3.3: 정책 문서 작성**

`docs/architecture/2026-04-27-window-compat-policy.md`:

```markdown
# window.X 호환층 정책 (Phase 2 종료 시점)

## 보존 (inline onclick 의존)

다음 함수들은 HTML 안 inline onclick 에서 호출되므로 `window.X = X` 노출 보존:

- window.switchTab
- window.PROFILE.* (profile-tab onclick)
- window.PAYROLL._otStep, window.PAYROLL.recalc
- ... (전체 인벤토리는 /tmp/window-exposes-final.txt 참조)

## 제거 candidate (Phase 3)

다음은 Phase 3 (onclick 위임 마이그레이션) 시점에 제거 가능:

- window.AppLock — entry 에서 import 으로 대체 가능
- window.HOLIDAYS — Layer 4 모듈이 import 로 받음
- ...

## 유지 (debug 편의)

- window.DATA, window.RC — 콘솔에서 확인용 (보존)

## Phase 3 진입 시점

inline onclick 150개 → addEventListener 위임 마이그레이션 후 카테고리 1 제거.
```

- [ ] **Step 3.4: 커밋**

```bash
git add docs/architecture/2026-04-27-window-compat-policy.md
git commit -m "docs(phase2-H): window.X 호환층 정책 명문화

- 보존 (inline onclick 의존) / 제거 candidate (Phase 3) / 유지 (debug) 분류
- 인벤토리 /tmp/window-exposes-final.txt"
```

---

## Task 4: 빌드 결과 측정 + 회귀 비교

**Files:** 검증만 (메모)

- [ ] **Step 4.1: 최종 빌드**

```bash
npm run build
```

- [ ] **Step 4.2: 측정**

```bash
ls dist/assets/ | wc -l       # 자산 파일 수
du -sh dist/                  # 총 크기
du -sh dist/assets/           # 자산 크기
ls -lh dist/assets/ | sort -k5 -h | tail -10  # 가장 큰 chunk 10개
```

- [ ] **Step 4.3: gzip 크기 측정 (Vite 자동 출력)**

`npm run build` 출력 확인:
```
dist/assets/index-[hash].js   XXX KB │ gzip: YYY KB
```

- [ ] **Step 4.4: SPEC §7 성공 지표 검증**

| 지표 | 목표 | 실제 |
|------|------|------|
| `npm test` | 153+ passed | (측정값) |
| `check:regulation` | 0 issue | (측정값) |
| `check:paytable` drift | 0 / 297 | (측정값) |
| 9 HTML 200 | 9/9 | (측정값) |
| 콘솔 에러 0 | 0건 | (측정값) |
| 6 핵심 탭 동작 | 6/6 | (측정값) |
| 99~150 onclick 동작 | 100% | (측정값) |
| gzip 크기 30%↓ (vs Phase 2-A baseline) | 30%↓ | (측정값) |
| FCP < 1.5s mobile | <1.5s | (측정값) |

- [ ] **Step 4.5: 회귀 회고 문서**

`docs/architecture/2026-04-27-phase2-completed.md`:

```markdown
# Phase 2 ES Module 마이그레이션 — 완료 회고 (2026-04-27 ~ MM-DD)

## 요약
- 39개 .js / 21,549줄 → ESM 전환 완료
- 9 HTML 의 47 script → 9 entry (1 type=module/HTML)
- Vite 5 multi-page 빌드 + tree-shaking + minify
- 150 inline onclick 100% 보존 (window.X 호환층)
- 회귀 0 (153+ unit tests + Playwright + audit)

## 측정 결과
(Task 4.2~4.4 표 복붙)

## 알게 된 점
- ...

## 남은 과제 (Phase 3)
- inline onclick → addEventListener 위임 마이그레이션
- window.X 호환층 카테고리 1 제거
- TypeScript 도입 검토
```

- [ ] **Step 4.6: 커밋**

```bash
git add docs/architecture/2026-04-27-phase2-completed.md
git commit -m "docs(phase2-H): Phase 2 마이그레이션 완료 회고

- 39 .js → ESM, 47 script → 9 entry
- 측정 결과 (gzip / FCP / 빌드 크기)
- 회귀 0 검증
- Phase 3 남은 과제"
```

---

## Task 5: CLAUDE.md / README 갱신

**Files:**
- Modify: `CLAUDE.md` (root)
- Modify: `README.md`

- [ ] **Step 5.1: CLAUDE.md 갱신**

빌드 / 테스트 / 모듈 컨벤션 섹션 갱신:

```markdown
## 빌드 시스템 (Phase 2 후)

- Vite 5 multi-page 빌드: `npm run build`
- 9 HTML entry → dist/ 출력
- ESM `import`/`export` 패턴 — 모든 .js
- `window.X` 호환층은 inline onclick 위해 유지 (Phase 3 까지)

## 모듈 컨벤션

- Layer 0 (Foundation): data, regulation-constants, shared-utils
- Layer 1 (Domain): calculators, holidays, retirement-engine
- Layer 2 (State): profile, overtime, leave, payroll
- Layer 3 (Auth): appLock
- Layer 4 (UI): shared-layout, tab-loader, *-tab.js, ...
- Layer 5 (Entry): app.js, regulation.js, retirement.js, dashboard.js, schedule_suite.js

순환 의존 금지 — Layer N 은 < N 만 import.
```

- [ ] **Step 5.2: README.md 빌드 명령 갱신**

```markdown
## 개발

```bash
npm install
npm run dev          # localhost:5173
npm run build        # dist/ 빌드
npm run preview      # 빌드 결과 확인
npm run test:unit    # Vitest
npm run test:smoke   # Playwright
```
```

- [ ] **Step 5.3: 커밋**

```bash
git add CLAUDE.md README.md
git commit -m "docs(phase2-H): CLAUDE.md / README 갱신 — Vite + ESM 컨벤션"
```

---

## Task 6: Phase 2 SPEC + plans 완료 표시

**Files:**
- Modify: `docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md`
- Modify: `docs/superpowers/plans/2026-04-27-phase2-A-vite-setup.md` ~ `phase2-H-cleanup.md`

- [ ] **Step 6.1: spec 마지막에 완료 섹션 추가**

```markdown
## 10. 완료 (YYYY-MM-DD)

Phase 2-A~H 모두 main 머지. 회고: docs/architecture/2026-04-27-phase2-completed.md
```

- [ ] **Step 6.2: 각 plan 헤더에 완료 표시**

각 plan 파일 헤더 위에:

```markdown
> **Status:** ✅ Completed YYYY-MM-DD
```

- [ ] **Step 6.3: 커밋**

```bash
git add docs/superpowers/
git commit -m "docs(phase2-H): SPEC + 8 plan 완료 표시"
```

---

## Task 7: 통합 검증 + Playwright 최종 스모크

- [ ] **Step 7.1: 전체 테스트**

```bash
npm run test:unit
npx vitest run tests/integration/
npm run check:regulation
npm run check:paytable
```

Expected: 모두 PASS / 0 issue.

- [ ] **Step 7.2: Playwright 전체 9 화면 + onclick + AppLock + localStorage round-trip**

```bash
npm run build
npm run preview &
sleep 3
```

Playwright MCP — **CLAUDE.md 필수 체크리스트 + 추가 항목**:

- [ ] 9 HTML 모두 콘솔 에러 0
- [ ] 모든 inline onclick 동작 (150개)
- [ ] AppLock PIN setup → reload → unlock
- [ ] localStorage round-trip (profile / leave / overtime / payroll)
- [ ] FCP < 1.5s (Lighthouse)
- [ ] Service Worker 동작 (cache-first / network-first)

- [ ] **Step 7.3: 커밋 (검증 메모)**

```bash
git commit --allow-empty -m "test(phase2-H): Phase 2 최종 검증 — 회귀 0

- 188 unit + 통합 테스트 PASS
- 9 HTML × 150 onclick × 핵심 체크리스트 콘솔 에러 0
- AppLock + localStorage round-trip 회귀 0
- FCP / gzip / Service Worker 동작 정상"
```

---

## Task 8: PR + 머지

- [ ] **Step 8.1: PR**

```bash
git push -u origin feat/phase2-H-cleanup
gh pr create --title "Phase 2-H: Cleanup — build.mjs 제거 + 회고 + 정책" --body "$(cat <<'EOF'
## Summary
- scripts/build.mjs (50줄 자체 빌드) 제거 — Vite 단일 빌드 확정
- IIFE 잔재 검토 + entry 명시 부트스트랩 (선택 적용)
- window.X 호환층 정책 명문화 (Phase 3 candidate 분류)
- CLAUDE.md / README 갱신 (Vite + ESM 컨벤션)
- Phase 2 회고 + SPEC/plans 완료 표시

## Test plan
- [x] 188 unit + 통합 테스트 PASS
- [x] 9 HTML × 150 onclick × 핵심 체크리스트 콘솔 에러 0
- [x] AppLock + localStorage round-trip 회귀 0
- [x] FCP / gzip 측정 (목표 30%↓ 확인)
- [ ] Vercel preview 검증

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 8.2: Vercel preview 검증**

PR Vercel preview URL → 9 화면 + onclick + AppLock + FCP 측정.

- [ ] **Step 8.3: 머지**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git worktree remove ../bhm_overtime-phase2-H
```

---

## Self-Review Checklist

- [ ] scripts/build.mjs 제거됨
- [ ] package.json scripts.build:legacy 제거
- [ ] window.X 호환층 정책 문서화
- [ ] Phase 2 완료 회고 문서
- [ ] CLAUDE.md / README 빌드 컨벤션 갱신
- [ ] 8 plan + spec 완료 표시
- [ ] SPEC §7 성공 지표 모두 충족 (gzip 30%↓ / FCP <1.5s / 회귀 0)
- [ ] Phase 3 (onclick 위임 + TS) 진입 가능

---

## Phase 2 완료

Phase 2 ES Module 마이그레이션 완료. 다음 단계 (Phase 3) 후보:

1. **inline onclick → addEventListener 위임** (window.X 호환층 카테고리 1 제거)
2. **TypeScript 도입** (점진적 — `.ts` 파일 추가 + tsconfig + Vite TS 플러그인)
3. **테스트 환경 jsdom 도입** (현재 node 만 — DOM 의존 모듈 단위 테스트 가능)
4. **Service Worker offline-first 강화** (Phase 1 에서 도입한 SW 의 다음 진화)
5. **Auth 백엔드 도입** (Supabase 외 — 현재 보류, 사용자 결정)

각 Phase 3 후보는 별도 SPEC + plan 작성 (Phase 2 와 동일 방식 — TDD + 점진 + 호환층).
