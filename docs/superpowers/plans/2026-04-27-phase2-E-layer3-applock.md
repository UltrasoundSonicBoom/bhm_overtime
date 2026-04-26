# Phase 2-E: Layer 3 — AppLock ESM 전환

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AppLock 모듈 (PIN + WebAuthn 생체인증, 642줄) 을 ESM 으로 전환. 의존성 0 — 가장 격리된 모듈.

**Architecture:** 현재 `window.AppLock = (function () { ... })()` IIFE 구조. 단순히 `export const AppLock = (function () {...})();` + `window.AppLock = AppLock` 호환층으로 변환. **자동 트리거 (auto-lock on load)** 동작 보존이 핵심.

**Tech Stack:** ES Module, Vitest 4.x, Vite 5.x.

**SPEC:** `docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md` §2 Layer 3

---

## File Structure

```
appLock.js                  ← export const AppLock + window.AppLock 호환층
tests/unit/foundation.test.js  ← AppLock 케이스 추가
tests/unit/applock.test.js  ← 신규 — PIN setup/verify round-trip 단위 테스트 (선택)
```

---

## Task 0: worktree + baseline

- [ ] **Step 0.1: worktree**

```bash
git worktree add -b feat/phase2-E-layer3 ../bhm_overtime-phase2-E
cd ../bhm_overtime-phase2-E
```

- [ ] **Step 0.2: baseline**

```bash
npm run test:unit  # 163 passed (Phase 2-D 후)
```

- [ ] **Step 0.3: AppLock localStorage 키 인벤토리**

```bash
grep -n "localStorage\." appLock.js | sort -u > /tmp/applock-keys-before.txt
cat /tmp/applock-keys-before.txt
```

> AppLock 의 PIN 해시 / 시도 카운트 / 생체 등록 상태 등 키 보존 검증용.

---

## Task 1: appLock.js → ESM

**Files:**
- Modify: `appLock.js`
- Modify: `tests/unit/foundation.test.js`

- [ ] **Step 1.1: 실패 테스트 추가**

`tests/unit/foundation.test.js`:

```js
describe('Layer 3 — AppLock ESM exports', () => {
  it('appLock.js: import { AppLock } 동작', async () => {
    // jsdom / node 환경에서 window mock
    if (typeof window === 'undefined') globalThis.window = globalThis;
    const { AppLock } = await import('../../appLock.js');
    expect(AppLock).toBeDefined();
    expect(typeof AppLock.setupPin).toBe('function');
    expect(typeof AppLock.verifyPin).toBe('function');
    expect(typeof AppLock.isEnabled).toBe('function');
    expect(AppLock.BiometricLock).toBeDefined();
  });
});
```

> **vitest 환경 주의**: 현재 vitest 는 jsdom 환경 미설정 (node 만). `appLock.js` 안 `if (typeof window !== 'undefined')` 가드가 있다면 import 자체는 OK. 위 테스트는 import 만 검증.

- [ ] **Step 1.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/foundation.test.js -t "AppLock"
```

Expected: FAIL — `AppLock is not defined`.

- [ ] **Step 1.3: appLock.js 변환**

`appLock.js` 의 IIFE 패턴 변환:

```js
// Before:
//   window.AppLock = (function () {
//     // ...
//     return { setupPin, verifyPin, ... };
//   })();

// After:
const AppLock = (function () {
  // ... 기존 IIFE 본문 그대로
  return {
    setupPin,
    verifyPin,
    changePin,
    disablePin,
    isEnabled,
    isUnlocked,
    unlock,
    lock,
    checkAndPrompt,
    resetViaReauth,
    _showPinSetupModal,
    BiometricLock,
  };
})();

export { AppLock };

// 호환층 — index.html 안 inline script + 다른 IIFE 모듈이 window.AppLock 참조
if (typeof window !== 'undefined') {
  window.AppLock = AppLock;
}

// 자동 트리거 (auto-lock on load) 보존
// 기존 _autoTrigger IIFE 가 있다면 그대로 유지 — ESM 모듈이 로드되면 자동 실행됨
```

> **자동 트리거 검증**: 기존에 `defer script ordering` 문제로 추가한 `_autoTrigger` IIFE 패턴이 ESM 환경에서도 동일하게 동작 (모듈은 한 번 평가될 때 모든 top-level 코드 실행).

- [ ] **Step 1.4: 테스트 PASS**

```bash
npx vitest run tests/unit/foundation.test.js -t "AppLock"
npm run test:unit                                          # 164 passed
```

- [ ] **Step 1.5: 브라우저 검증 — PIN setup → verify round-trip**

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP — **AppLock 핵심 시나리오**:

1. localStorage clear → http://localhost:5173 접속
2. 설정 탭 → PIN 설정 토글 ON → PIN 입력 (예: 1234) → 설정 완료 토스트 확인
3. 페이지 reload → **자동 잠금 화면 표시** (auto-trigger 동작)
4. PIN 입력 → 잠금 해제 + 홈 탭 표시
5. 콘솔 에러 0 확인

```bash
kill $DEV_PID
```

- [ ] **Step 1.6: 생체 인증 (WebAuthn) 검증 — 가능한 환경에서**

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP (가상 WebAuthn 미지원 시 manual 검증):
- 설정 탭 → PIN 설정 후 → 생체 인증 등록
- BiometricLock.register / verify 동작 확인

> Playwright headless 에서 WebAuthn 시뮬레이션 어려움. 사용자 manual 검증으로 대체 가능.

```bash
kill $DEV_PID
```

- [ ] **Step 1.7: localStorage 키 보존 검증**

```bash
grep -n "localStorage\." appLock.js | sort -u > /tmp/applock-keys-after.txt
diff /tmp/applock-keys-before.txt /tmp/applock-keys-after.txt
```

Expected: diff 0 (PIN 해시 키, 생체 등록 키 등 보존).

- [ ] **Step 1.8: 커밋**

```bash
git add appLock.js tests/unit/foundation.test.js
git commit -m "feat(phase2-E): appLock.js → ESM exports

- IIFE 패턴 보존 (자동 트리거 + BiometricLock 클래스)
- export { AppLock } + window.AppLock 호환층 (inline script 의존)
- localStorage 키 변경 0
- foundation.test.js AppLock 케이스 PASS
- PIN setup/verify round-trip 회귀 0"
```

---

## Task 2: settings-ui.js / shared-layout.js 안 AppLock 참조 검증

**Files:** 검증만 (이 단계엔 변경 0)

> **이유**: settings-ui.js / shared-layout.js 는 아직 IIFE. `window.AppLock` 참조가 호환층으로 동작하는지 검증.

- [ ] **Step 2.1: AppLock 참조 인벤토리**

```bash
grep -rn "AppLock\." --include='*.js' --include='*.html' | grep -v node_modules | grep -v dist | sort -u
```

Expected: 모든 참조가 `window.AppLock.X()` 또는 `AppLock.X()` 형태. ESM 호환층으로 모두 동작.

- [ ] **Step 2.2: index.html 안 inline script 검증**

```bash
grep -n "AppLock" index.html
```

Expected: `<script>(function () { try { var s = JSON.parse(...); if (s.pinEnabled) { document.documentElement.style.visibility = 'hidden'; } } catch (e) { } })();</script>` (FOUC 방지) — AppLock 참조 0 (settings 직접 읽음). OK.

- [ ] **Step 2.3: 다른 페이지 (regulation.html / retirement.html) 에서도 AppLock 동작 검증**

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP:
- localStorage 에 PIN 등록된 상태에서
- http://localhost:5173/regulation.html 직접 접속 → 잠금 화면 표시
- http://localhost:5173/retirement.html → 잠금 화면 표시

```bash
kill $DEV_PID
```

- [ ] **Step 2.4: 커밋 (검증 메모, 코드 변경 0)**

```bash
git commit --allow-empty -m "test(phase2-E): AppLock 호환층 검증

- 모든 IIFE/inline 참조 (window.AppLock.X) 정상 동작
- 9 HTML 모두 잠금 화면 표시 정상"
```

---

## Task 3: PR + 머지

- [ ] **Step 3.1: 통합 테스트**

```bash
npm run build
npm run preview &
PREVIEW_PID=$!
sleep 3
```

Playwright MCP — CLAUDE.md 필수 체크리스트 + AppLock:
- 9 핵심 화면 정상
- PIN 설정 → reload → PIN 입력 → 잠금 해제
- 콘솔 에러 0건

```bash
kill $PREVIEW_PID
```

- [ ] **Step 3.2: PR**

```bash
git push -u origin feat/phase2-E-layer3
gh pr create --title "Phase 2-E: Layer 3 AppLock ESM 전환" --body "$(cat <<'EOF'
## Summary
- appLock.js → ESM (export { AppLock } + window.AppLock 호환층)
- 자동 트리거 + BiometricLock 클래스 보존
- localStorage 키 변경 0

## Test plan
- [x] 164 unit tests passed
- [x] PIN setup / verify / lock round-trip 회귀 0
- [x] 9 HTML 잠금 화면 표시 정상
- [x] Playwright 콘솔 에러 0
- [ ] Vercel preview 배포 검증 (PIN 설정 사용자 손실 0)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3.3: Vercel preview 검증**

PR Vercel preview URL → PIN setup/verify round-trip + 잠금 해제 동작 확인.

- [ ] **Step 3.4: 머지**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git worktree remove ../bhm_overtime-phase2-E
```

---

## Self-Review Checklist

- [ ] appLock.js: `export { AppLock }` + `window.AppLock` 호환층
- [ ] BiometricLock 클래스 export 보존
- [ ] 자동 트리거 (auto-lock on load) 보존
- [ ] localStorage 키 변경 0
- [ ] 164 unit tests passed
- [ ] 9 HTML 잠금 동작 정상
- [ ] PIN round-trip 회귀 0

---

## 다음 단계

Phase 2-F: Layer 4 UI (9개 탭/UI 모듈, 가장 큰 단계 — 8-12h). DOM 조작 + 이벤트 + 99개 inline onclick 호환성 보존.
