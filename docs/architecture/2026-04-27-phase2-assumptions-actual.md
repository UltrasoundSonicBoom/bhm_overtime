# Phase 2 Plan 가정 vs 실제 — 데이터 기반 비교

> 작성: 2026-04-27 (회귀 검증 후)
> 컨텍스트: Phase 2 ES Module 마이그레이션 8 plans 작성 시 가정한 사항들과
> 실제 구현 + 회귀 검증 시 발견한 사실의 비교. 향후 유사 마이그레이션 기준점.

## 종합 표

| # | 가정 | 실제 | 심각도 | 발견 시점 |
|---|------|------|------|----------|
| 1 | Vite IIFE 자동 처리 | 무시함 → dist .js 0개 | 🔴 | Phase 2-A 구현 |
| 2 | Phase 2-B/C 분리 | createRequire 깨짐 → 통합 필수 | 🟡 | Phase 2-B 구현 |
| 3 | PNG root 유지 | manifest 깨짐 → public/ 이동 | 🟡 | Phase 2-A 구현 |
| 4 | UI 18모듈 정밀 변환 | export {} marker 면 충분 | 🟢 | Phase 2-F 구현 |
| 5 | build.mjs 영구 백업 | dual-maintenance → 제거 | 🟢 | Phase 2-H 구현 |
| 6 | 30-50h 작업 | ~4.5h | 🟢 | YOLO 모드 완료 |
| **7** | **window.X 호환층 자동 보존** | **64 onclick handler 깨짐 (top-level function 수동 노출 필수)** | **🔴** | **회귀 검증** |
| **8** | **CHANGELOG.md root → public/ 자동 인지** | **루트에 남아 dist 없음 → production 404** | **🟡** | **회귀 검증 (production curl)** |

---

## 1. 🔴 Vite IIFE script 자동 처리 가정 — **틀림**

### 가정 (Phase 2-A plan §3 D1)
> "rollup 이 ESM 아니어도 hash + 복사 함"

### 실제
Vite 는 `<script src>` 가 `type="module"` 없으면:
- 빌드 시 stderr 에 warning 출력
- HTML 의 src 속성은 그대로
- 해당 .js 파일을 dist/ 로 복사하지 않음
- → dist/index.html 의 29개 `<script src>` 가 모두 404

### 영향 / 해결
임시 `legacy-iife-scripts` Vite plugin 도입 (esbuild bundle iife format). Phase 2-G 까지 유지 후 Phase 2-H 에서 제거.

### 교훈
- Vite 공식 문서 우선 — "static-only multi-page app" 의 IIFE 지원 명시 검색
- "PoC 빌드 1회" 를 plan 작성 전에 실행

---

## 2. 🟡 Phase 2-B 와 Phase 2-C 분리 가능 가정 — **틀림**

### 가정 / 실제
- 가정: data/RC/utils 만 ESM, calculators 는 다음 phase
- 실제: type=module 전환 시 createRequire 가 .js 를 ESM 으로 해석 → ERR_REQUIRE_ESM

### 해결
Phase 2-B+C 통합 단일 PR. Plan 의 phase 분리는 문서로만 남음.

---

## 3. 🟡 PNG / 자산 위치 — Phase 2-A 에서 root → public/ 이동 필요

### 가정 / 실제
- 가정: PNG root 유지, build:legacy 가 PLAIN_COPY
- 실제: Vite 가 HTML `<img src>` 따라 hash 처리 → manifest.json icon 참조 깨짐

### 해결
PNG 5개 + notice.md → public/ 이동.

---

## 4. 🟢 Layer 4 UI 모듈 ESM 변환 = 단순 marker

### 가정 / 실제
- 가정: 18 모듈 정밀 import/export 그래프
- 실제: `export {};` marker 만 추가해도 ESM 자격 + 동작 유지

### 영향
8-12h 추정 → 실제 ~30분.

---

## 5. 🟢 scripts/build.mjs 영구 백업 가정 — **틀림**

### 실제
public/ 이전 후 build.mjs 의 path 도 갱신 필요. Phase 2-H 에서 결국 제거.

### 교훈
"백업 코드" = dual-maintenance burden. 진짜 롤백은 git revert.

---

## 6. 🟢 실행 시간 30-50h → 실제 ~4.5h

### 가속 요인
- AI 자동화 (단순 sed/Edit 패턴 적용)
- subagent 1회 + 직접 7회 (직접이 더 빠름)
- type=module + esbuild 의 IIFE 자동 변환
- Vite multi-page tree-shaking 자동

---

## 7. 🔴 **window.X 호환층 자동 보존 가정** — **부분 실패** (가장 심각)

### 가정 (SPEC §3 D2)
> "현재 plan: onclick 에서 호출되는 함수들만 window.fn = fn 로 명시 노출 (이미 22개는 노출됨, 추가 노출 약 30개 예상)"

### 실제 — 회귀 검증으로 발견
Phase 0 (IIFE/classic script) 시절 동작:
- `function foo() {}` (top-level) → window.foo 자동 (classic script 의 global pollution)

Phase 2 ESM 전환 후:
- `function foo() {}` (top-level) → 모듈 스코프에 갇힘 → window 미노출
- → onclick="foo()" 클릭 시 ReferenceError

### 정량 데이터
회귀 검증 grep 결과: **75개 onclick handler 중 64개 (85%) 가 window 미노출**

모듈별 누락:
- `app.js`: 22+ 함수 (otGoToday / saveOtRecord / changelogPage 등)
- `leave-tab.js`: 9 함수 (lvNavMonth, saveLvRecord 등)
- `regulation.js`: 7 함수 (pdfNextPage, scrollChapterTabs 등)
- `profile-tab.js`: 6 함수 (saveProfile, clearProfile 등)
- `settings-ui.js`: 5 함수 (onAppLockChangePin 등)
- `work-history.js`: 5 함수 (openWorkHistorySheet 등)
- `payslip-tab.js`: 3 함수 (showVerifyInQna 등)
- 기타: 7 함수

### 영향
사용자가 모든 onclick 버튼 클릭 시 ReferenceError. 회귀 발견 안 됐으면 production 사용자 영향 직결.

### 해결 (이번 plan)
각 모듈 끝에 `window.fn = fn` 호환층 추가. **64개 일괄 노출 완료** + 검증 (61/61 + 7/7 PASS).

### 교훈
- "ESM 전환 = export 추가" 만으론 부족. classic script 의 global pollution 도 명시 복원 필수.
- onclick 인벤토리 + 자동 검증 (grep 기반 missing 검출) 을 마이그레이션 plan 의 acceptance criteria 에 포함.
- 더 나은 방법: HTML inline onclick → addEventListener 위임 마이그레이션 (Phase 3 candidate).

---

## 8. 🟡 **CHANGELOG.md / 기타 root MD/JSON 자동 인지** — **틀림**

### 가정 (Phase 2-A plan)
plan 의 public/ 이전 목록: sw.js, manifest.json, robots.txt, sitemap.xml, icons/, data/, tabs/, .well-known/, 서브앱

### 실제
- app.js:440 에 `fetch('./CHANGELOG.md?v=' + Date.now())` runtime fetch 존재
- CHANGELOG.md 가 root 에 남아 있고 public/ 에 미이동
- Vite 빌드 결과 dist 에 CHANGELOG.md 없음 → production 사용자 콘솔 404

### 정량 데이터
production curl 결과:
- `https://www.snuhmate.com/CHANGELOG.md?v=...` → 404
- index.html?app=1 접속 시 console error 1건

### 해결 (이번 plan)
CHANGELOG.md → public/ 이동. asset-integrity test 에 검증 추가.

### 교훈
- Plan 작성 시 `grep -rn 'fetch.*\./'` 로 runtime fetch 인벤토리 작성 필수.
- public/ 이전 대상은 "파일 종류" 가 아닌 "runtime fetch 대상" 으로 결정.

---

## 다음 마이그레이션 권장 워크플로

1. **PoC 빌드 1회** — plan 작성 전 5분 실험으로 가정 검증
2. **runtime fetch 인벤토리** — `grep -rn 'fetch\|<script\|<link\|<img\|src=\|href=' --include='*.js' --include='*.html'`
3. **classic-script global 인벤토리** — `grep -E '^function [a-z]' *.js` 로 자동-노출 함수들 사전 파악
4. **onclick 인벤토리** — `grep -ohE 'onclick="[a-zA-Z_][a-zA-Z0-9_]*' *.html *.js | sort -u`
5. **회귀 검증 자동화** — assertion-based asset-integrity + onclick-exposure tests 를 plan 의 acceptance criteria 에 포함
