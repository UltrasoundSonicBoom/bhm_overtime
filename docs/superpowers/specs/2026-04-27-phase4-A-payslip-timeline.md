# Phase 4-A SPEC: 명세서 시계열 → 근무이력 자동 시드

> 작성: 2026-04-27
> 범위: salary-parser.js + work-history.js + profile-tab.js (3 ESM 모듈 기능 개선)
> 모듈화 영향: 0 (Vite 번들 / ESM entry 변경 없음)

## 1. 배경 + 사용자 인용

### 사용자 직접 인용
> "근무 이력도 사용자가 따로 추가하지 않았으면 입사일 기준으로 급여명세서 상의 근무지가 추가되어야 한다. 사용자의 급여 명세서가 시간의 흐름을 나타내는 점을 근무이력이나 개인 정보에 반영될 수 있도록 해야 한다. 이 부분에 대한 알고리즘이 부족한 것 같다."

### 현 상태
- `salary-parser.js:applyStableItemsToProfile()` — 마지막 명세서 1개의 employeeInfo 로 profile.department 단순 덮어씀
- 시계열 정보 (부서 이동 segment) 손실
- `_seedFirstWorkFromProfile()` (profile-tab.js) — 입사일 + dept 기반 단일 카드, 자동 트리거 없음
- 근무이력 record schema 에 source 마커 없음 — 자동/수동 구분 불가

## 2. 요구사항

### 기능
1. **시계열 segment 검출**: 명세서 시간순 → dept run-length encoding → 부서 이동 segment 분할
2. **자동 시드**: 빈 근무이력 또는 모든 source='auto' 항목 → 명세서 기반 자동 추가
3. **사용자 보호**: source='user' record ≥ 1 → 자동 덮어쓰기 금지, 알림 배너만
4. **UI 마커**: 자동 시드된 record 에 "🤖 명세서 자동" 배지 표시
5. **폴백**: 명세서 0개 + 프로필 있음 → 기존 `_seedFirstWorkFromProfile` 동작 유지

### 트리거
1. `applyStableItemsToProfile()` 끝부분 — 자동 호출 (mode='replace' 만 실제 쓰기)
2. Empty CTA "명세서로 근무이력 재구성" 버튼 — 명시 동작
3. 알림 배너의 [재구성] 버튼 — 보호 무시 동의

### 제약
- **모듈화 영향 0**: Vite 번들/엔트리 변경 없음. 기존 3 ESM 모듈의 기능 개선만.
- **Cross-module 호출**: Phase 3-F 학습대로 신규 함수도 `window.X` 호환층 노출 (KEEP allowlist 보강).
- **데이터 손실 0**: source='user' 마커가 핵심 보호 정책. migration 시 기존 record 모두 'user' 기본값.
- **localStorage 키 변경 0**: `bhm_work_history` 그대로.

## 3. 비기능 요구사항

- 회귀 0: 156 unit + 37 integration tests pass + check:regulation/paytable 0 issue
- jsdom 단위 테스트 7 시나리오 PASS
- Playwright e2e: 명세서 mock 3개 → 근무이력 자동 시드 + 배지 표시 검증
- 콘솔 에러 0건

## 4. 핵심 알고리즘

`SALARY_PARSER.rebuildWorkHistoryFromPayslips({ profile, existing, hospital }) → { mode, records|segments, existing }`

```
1. inventory = listSavedMonths()                 // newest first
   payslips = inventory.map(loadMonthlyData)
                       .filter(valid + type 화이트리스트 + 미래 제외)
   payslips.sortByYearMonthAsc()

2. Segment detection (run-length encoding by deptKey):
   for p in payslips:
     deptKey = normalizeDept(p.employeeInfo.department)
     if !current || current.deptKey !== deptKey:
       push current → segments
       current = { deptKey, dept, from: yyyy-mm-01, payslips: [p] }
     else:
       current.payslips.push(p)
   push current

3. 입사일 우선:
   if profile.hireDate < segments[0].from:
     segments[0].from = profile.hireDate

4. segment.to = 다음 segment.from 의 전월 말일, 마지막은 '' (재직 중)

5. 보호 정책:
   hasUserRecord = existing.some(r => (r.source ?? 'user') === 'user')
   if hasUserRecord:
     return { mode: 'banner', segments, existing }     // 데이터 보존
   else:
     return { mode: 'replace',
              records: segments.map(toRecord(hospital)) }
```

`toRecord`: `{ id, workplace, dept, from, to, role: jobType, desc: '명세서 자동', rotations: [], source: 'auto', updatedAt: ISO }`

## 5. 데이터 스키마 변경

### work history record (확장)
```ts
{
  id: string;
  workplace: string;
  dept: string;
  from: string;       // 'YYYY-MM-DD'
  to: string;         // '' = 재직 중
  role: string;
  desc: string;
  rotations: Rotation[];
  updatedAt: string;
  source?: 'auto' | 'user';   // 신규 — 기본값 'user'
}
```

### Migration (work-history.js 의 workplace/dept 분리 직후)
```js
records.forEach(r => { if (!r.source) r.source = 'user'; });
```

기본값 'user' — 기존 사용자 데이터 자동 덮어쓰기 대상에서 안전 보호.

## 6. UI 변경

| UI | 위치 | 동작 |
|----|------|------|
| 자동 시드 배지 | work-history.js `_renderItem` | source='auto' 시 "🤖 명세서 자동" 표시 |
| 알림 배너 | work history 화면 상단 | mode='banner' 시 "명세서에서 부서 이동 N건 감지. [명세서로 재구성]" |
| Empty CTA | work history empty 상태 | 명세서 ≥ 1 시 "명세서로 근무이력 재구성" primary 버튼 |

## 7. Edge Cases

- payGrade 변경 동일 dept (J2 → J3): 1 segment (segment 키는 dept 만)
- 부서명 표기 variants ('간호본부' / '간호부'): `normalizeDept` 매핑 dict + trim + 전각 정규화
- 입사일 < 첫 명세서: hireDate 우선
- 미래 명세서: `yyyymm > currentYearMonth()` 필터 제외
- 명세서 1개: 단일 segment, from = max(hireDate, month)
- 명세서 0개 + profile: 폴백 `_seedFirstWorkFromProfile` 호출
- type 화이트리스트: 일반 월급만 (보너스/성과급/세금 등 제외)

## 8. 성공 기준

- ✅ 단위 테스트 7 시나리오 PASS (`tests/unit/rebuild-work-history.test.js`)
- ✅ 회귀: 156+18 → 163+37 통합 + check:regulation/paytable 0 issue
- ✅ Playwright e2e: 명세서 mock 3개 → 근무이력 segment 분할 + 배지 표시
- ✅ 콘솔 에러 0건
- ✅ 사용자 수동 record 보호: source='user' 항목 자동 덮어쓰기 0

## 9. 다음 단계

본 SPEC 기반 implementation plan: [docs/superpowers/plans/2026-04-27-phase4-A-payslip-timeline.md]

Plan 은 5 task 분할 (TDD subagent-driven-development).
