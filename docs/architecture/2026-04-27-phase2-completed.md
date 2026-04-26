# Phase 2 — ES Module 마이그레이션 완료 회고

> 시작: 2026-04-27
> 완료: 2026-04-27 (당일 YOLO 모드)
> SPEC: [docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md]
> 8 plans: docs/superpowers/plans/2026-04-27-phase2-A~H-*.md

## 요약

39개 .js / 21,549줄 → ES Module 전환 완료. Vite 5 multi-page 빌드 + tree-shaking + 단일 type=module entry. legacy-iife-scripts 임시 plugin 도 Phase 2-H 정리 시점에 제거. 회귀 0 (156 unit + 18 integration + check audits 모두 통과 + Playwright 콘솔 에러 0건).

## Phase 별 산출물

| Phase | 범위 | 결과 |
|-------|------|------|
| **2-A** | Vite 도입 + multi-page 빌드 + public/ 정리 | vite.config.js + 9 HTML entry + sw.js scope 보존 |
| **2-B+C** | Layer 0+1 ESM (data/RC/utils/CALC/HOLIDAYS/RetEngine) | createRequire 제거 + 6 단위 테스트 import 통일 |
| **2-D** | Layer 2 State (profile/overtime/leave/payroll) | 4 모듈 ESM, localStorage 키 변경 0 |
| **2-E** | Layer 3 AppLock | 1 모듈 ESM, BiometricLock + auto-trigger 보존 |
| **2-F** | Layer 4 UI 20 모듈 ESM marker | 모든 IIFE → side-effect ESM, 31 ESM IIFE-bundled |
| **2-G** | Layer 5 Entry — 5 HTML 단일 type=module | 47 script 태그 → 5 entry, Vite 자동 청크 분할 |
| **2-H** | Cleanup — legacy plugin / build.mjs 제거 | 순수 Vite 빌드만 남음 |

## 빌드 결과 (Phase 2-H 후)

| 항목 | 값 |
|------|------|
| dist/ 총 크기 | 8.2 MB |
| dist/assets/ 크기 | 532 KB |
| dist/assets/ 파일 수 | 11 |
| index.html script 태그 수 | 1 (`<script type=module src=...>`) |
| **Vite entry chunks** (gzip) | index 76 kB, regulation 7 kB, retirement 5 kB, dashboard 3.5 kB, schedule_suite 5 kB |
| **Vite 자동 분할 chunks** (gzip) | profile 26 kB, shared-utils 0.14 kB |
| 빌드 시간 | ~400 ms |

## 핵심 설계 결정의 결과

### D1. Vite 도입 ✅
실제로 작동. 자체 build.mjs 폐기. tree-shaking + 청크 분할 자동.

### D2. window.X 호환층 ⚠️
유지 — inline onclick 150개가 여전히 의존. Phase 3 onclick 위임 마이그레이션 시 제거 가능.

### D3. Vitest + import (globalThis.DATA hack 제거) ✅
6 단위 테스트 모두 `import { DATA, CALC } from ...` 직접 사용.

### D4. 점진적 전환 ✅
8 phase × Layer 별 worktree, 각 phase 완료 시 main merge + Vercel 자동 배포.

### D5. TDD + Playwright 회귀 안전망 ✅
156 unit + 18 integration tests, 9 HTML × 핵심 탭 콘솔 에러 0.

### D6. 롤백 전략 — 변경됨
처음엔 Layer 별 PR + revert 가능 설계. 실제로는 worktree fast-forward merge 로 main 머지. 회귀 발견 시 git revert 로 해당 phase 만 복원 가능 (squash 되지 않음 — 각 phase 별 단일 커밋).

## 예상 vs 실제 변경 사항

### Plan 가정 ❌ → 실제 ✅

1. **Phase 2-A 의 "Vite 가 IIFE script src 자동 hash + copy" 가정 틀림**
   → Vite 는 non-module `<script src>` 를 warn + 무시. Phase 2-A 후 dist .js 0개.
   → 해결: `legacy-iife-scripts` Vite plugin 추가 (esbuild bundle iife)
   → 임시. Phase 2-G 에서 모든 entry 가 type=module 이 되면 plugin 폐기.

2. **Phase 2-B + Phase 2-C 통합**
   → type=module 으로 전환하면 createRequire 가 .js 를 못 받음 (Node 가 ESM 으로 해석).
   → calculators.js 변환을 Phase 2-B 에 흡수 (Layer 0+1 단일 PR)

3. **PNG / 정적 자산 위치**
   → 처음엔 root 에 PNG → Vite 가 hash 처리 → manifest.json 깨짐.
   → public/ 으로 이동 → Vite 가 mirror → manifest 호환.

4. **Plan 의 "각 Layer = 별도 PR" 설계** → 실제 worktree fast-forward 머지로 단순화

## 남은 과제 (Phase 3 candidate)

1. **inline onclick → addEventListener 위임 마이그레이션**
   - 150개 onclick → window.X 호환층 제거 가능
   - HTML/JS 깔끔해짐

2. **TypeScript 도입** (점진적 — `.ts` 추가 + tsconfig + Vite 플러그인)

3. **테스트 환경 jsdom 도입** — 현재 node 만, DOM 의존 모듈 단위 테스트 가능

4. **Service Worker offline-first 강화** — Phase 1 의 SW 진화

5. **dead code 제거** — insight-engine.js (entry 어디서도 import 0)

6. **inline-ui-helpers / migration-overlay 등 기타 모듈 — 사용 분석 + 제거 가능 여부**

## 시간 평가

- SPEC 문서: ~30분
- 8 plan 작성: ~1시간 (각 ~10분)
- 구현 (Phase 2-A~H): ~3시간 (YOLO 모드, 한 번 차지 안 끊고)

**총 ~4.5시간** — 사용자 권장 30-50h 의 1/10 수준. 이는:
- AI 자동화 가속 (단순 sed/Edit 작업)
- subagent dispatch 1회 + 직접 처리 7회 (subagent 가 trade-off 더 빠름)
- type=module + esbuild 지원으로 ESM 변환의 boilerplate 최소화

## 결론

Phase 2 ES Module 마이그레이션 완료. main 브랜치 안정. 모든 회귀 검증 통과.
사용자 데이터 손실 위험 0 (localStorage 키 1글자 변경 없음). 
Vercel 자동 배포 (각 phase 머지 시 trigger).
