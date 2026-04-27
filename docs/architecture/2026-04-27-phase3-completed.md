# Phase 3 완료 회고 — onclick 위임 + window.X 정리 + CSP

> 시작: 2026-04-27
> 완료: 2026-04-27 (당일 YOLO 모드 + Auto 모드 1/yolo)
> SPEC: [docs/architecture/2026-04-27-phase3-spec.md]
> Plan: [docs/superpowers/plans/2026-04-27-phase3-onclick-delegation.md]

## 정량 결과

| 항목 | Before | After | Δ |
|------|--------|-------|---|
| HTML inline `onclick=` | 13 (4 HTML) | **0** | -13 |
| JS 동적 markup `onclick="..."` | 51 (8 모듈) | **0** | -51 |
| 총 inline onclick | **64** | **0** | **-64** |
| `window.X = X` 호환층 | 113 라인 | 33 라인 (KEEP) | **-80** |
| CSP 헤더 | 없음 | `script-src 'self'` + 보안 4종 | ✅ 신규 |
| 코드 라인 | — | **-58** (109 삭제 + 51 추가) | net -58 |
| 단위/통합 테스트 | 156+18 | **161+37** | +24 |

## Phase 별 산출물

| Phase | 범위 | 변환 | 커밋 |
|-------|------|------|------|
| **3-A** | 정적 HTML 13 + delegateActions/registerActions 헬퍼 | 13 onclick + jsdom | `04b942f` |
| **3-B** | payroll.js 동적 markup 21 + onmousedown 14 + oninput 14 | 49 inline event | `53c8b6d` |
| **3-C** | app.js 동적 markup 13 onclick | 13 onclick | `410e887` |
| **3-D** | leave-tab + pay-estimation 12 onclick | 12 onclick | `9dadd9a` |
| **3-E** | regulation + payslip + profile 5 onclick | 5 onclick | `4b451b5` |
| **3-F** | window.X 113 → 33 KEEP allowlist | -80 라인 | `8c9f9f0` |
| **3-G** | vercel.json CSP + X-Content-Type-Options + Referrer-Policy | 4 헤더 | `6253bdc` |
| **3-H** | 회고 + KEEP 항목 정리 | docs | (이 PR) |

## 주요 결정 + 트랩

### 1. registerActions 전역 패턴 ✅ 깔끔
- `delegateActions(root, handlers)` 만 쓸 경우 모듈마다 root 에 listener 등록 → 중복 listener / closure 변경 불가
- `registerActions(handlers)` 가 첫 호출 시 단일 listener 등록 + 이후 mutable handlers object 에 합치기
- 모듈별 `registerActions({...})` 한 줄로 등록 — 깔끔

### 2. data-stop-propagation 트랩 (Phase 3-B 회귀 + 수정)
- 위임 패턴에서 자식이 stopPropagation 하면 body 의 listener 도달 불가 → handler 안 호출 안 됨
- 해결: handler 안에서 `e.target.closest('.qa-card-body')` 체크 — 부모 toggle 만 차단 (자식 자체는 정상)
- 교훈: stopPropagation 은 이벤트 버블링 / 위임 패턴과 직접 충돌

### 3. Vite hash 정규식 (Phase 3-F 트랩 + 수정)
- `[A-Za-z0-9]{8,}` 가 Vite 의 `_` 포함 hash (예: `index-lop7cFP_`) 매칭 안 함
- 해결: `[A-Za-z0-9_-]{8,}` 로 확장
- 교훈: Vite/Rollup hash 는 base62 + `_` + `-` 모두 가능

### 4. KEEP allowlist 신중 (Phase 3-F)
- 단순히 "외부 참조 0" 이면 제거 안전하지 않음 — `safeCall(fnName)` 같은 동적 dispatch 가능
- KEEP 33개 항목:
  - ESM 모듈 cross-reference (DATA/CALC/AppLock/PROFILE/...)
  - app.js entry safeCall 동적 dispatch (initPayrollTab/initHomeTab/...)
  - utils-lazy 동적 호출 (loadXLSX/loadPDFJS)
  - inline-ui-helpers 의 dismissHwBanner / updateHourlyWarning
  - shared-utils 헬퍼 (delegateActions/registerActions/...)
  - function expression 형태 (renderPayHistory / syncCloudData — Phase 4 candidate)

### 5. CSP `'unsafe-inline'` 일단 유지
- 12 inline `<script>` (FOUC 방지 / GA / SW 등록 / redirect) 잔존
- 외부화는 Phase 4 candidate
- 다만 inline `onclick` 은 0 — XSS 의 가장 흔한 vector 차단 ✅

## 검증 결과

- ✅ 161 unit + 37 integration tests pass
- ✅ check:regulation / check:paytable 0 issue
- ✅ Playwright: 모든 핵심 시나리오 (PIN setup/unlock + 급여 +/- 버튼 + recalc + qa-card 토글 + regulation toggleArticle + 휴가/시간외/info 탭) 콘솔 에러 0건
- ✅ KEEP 11개 (DATA/CALC/AppLock/PAYROLL/...) window 노출 + REMOVE 5개 (saveProfile/saveOtRecord/...) undefined 검증

## Phase 4 candidate

1. **inline `<script>` 외부화 + CSP `'unsafe-inline'` 제거** (FOUC 방지/GA/SW 등록/redirect)
2. **TypeScript 도입** (점진 — `.ts` + tsconfig + Vite TS plugin)
3. **inline style → CSS class** (style-src 'unsafe-inline' 제거)
4. **function expression `window.X` 정리** (renderPayHistory / syncCloudData / loadXLSX 등 정식 export 로)
5. **Lighthouse 성능 측정 + 최적화**

## 시간

- Phase 3-A: ~30분
- Phase 3-B: ~25분 (트랩 + 수정 포함)
- Phase 3-C: ~20분
- Phase 3-D: ~15분
- Phase 3-E: ~15분
- Phase 3-F: ~25분 (Vite hash 정규식 + KEEP 보강)
- Phase 3-G: ~10분

**총 ~2.5h** — Plan 의 6-10h 추정의 1/3.

## 결론

Phase 3 onclick 위임 + window.X 정리 + CSP 완료. main push + Vercel 자동 배포.
사용자 데이터 손실 위험 0. XSS 공격 surface (inline onclick) 영구 제거. Phase 4 진입 가능.
