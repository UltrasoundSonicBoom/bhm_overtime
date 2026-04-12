# SPEC: 규정 및 계산식 단일화 (Regulation Data Unification)

> Version: 1.0 | Date: 2026-04-12 | Status: Active  
> 선행 문서: `tasks/plan-regulation-unification.md` (이슈 목록 원본)  
> 실행 순서: Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

---

## 1. Objective

`data.js`, `calculators.js`, `retirement-engine.js`에 중복·불일치 상태로 존재하는 규정 데이터와 계산 공식을 **단일 진실 출처(Single Source of Truth)** 기반으로 통일한다.

**목표 아키텍처:**
```
regulation-constants.js   ← 신규: 순수 규정 상수 (조항 주석 포함)
  ↓
data.js (DATA_STATIC)     ← 기존: regulation-constants 참조 또는 동기화
  ↓
calculators.js (CALC)     ← 기존: DATA만 참조 (변경 최소화)
retirement-engine.js      ← 수정: DATA 참조 전환
```

---

## 2. TDD 전략

### 공통 원칙
- **Red → Green → Refactor**: 각 Phase마다 실패하는 테스트를 먼저 작성 → 코드 수정으로 통과 → 정리
- **테스트 파일**: `tests/calc-regression.js` (Phase 0에서 생성)
- **실행 방법**: `node tests/calc-regression.js`
- **Phase 완료 기준**: 해당 Phase의 모든 테스트 PASS

### Phase별 테스트 전략

| Phase | 테스트 유형 | 검증 방법 |
|-------|------------|----------|
| 0 | 감사 문서 생성 검증 | `docs/regulation-audit-2026.md` 파일 존재 + 항목 수 확인 |
| 1 | regulation-constants.js 구조 검증 | 조항 주석 포함 여부, 모든 필수 상수 존재 |
| 2 | 버그 수정 단위 테스트 | BUG-01~11 각각 수치 검증 |
| 3 | 회귀 테스트 20+ 시나리오 | 실제 직원 케이스 기반 계산값 비교 |
| 4 | 표시 텍스트 일관성 | 특정 문자열 존재/부재 검증 |
| 5 | 데드코드 정리 검증 | archive 이동 확인 |
| 6 | Admin UI 통합 테스트 | Playwright 화면 스냅샷 |
| 7 | 역계산 검증 정확도 | 명세서 PDF vs CALC 오차 ≤ 1% |
| 8 | AI 인사이트 집계 | 이상 탐지 케이스 검증 |
| 9 | 간호사 규정 시나리오 | 프리셉터/리커버리 계산 |
| 10 | 퇴직금 강화 | 3개월 평균임금 정확도 |

---

## 3. Phase별 상세 스펙

---

### Phase 0: 전수 감사 문서화

**목표**: `hospital_guidelines_2026.md` vs 코드 전수 비교 → 감사 보고서 생성

**입력 파일**:
- `data/hospital_guidelines_2026.md` (규정 원문)
- `data.js` L1~550 (정적 데이터)
- `calculators.js` L1~250 (계산 엔진)
- `retirement-engine.js` L1~150 (퇴직금 엔진)

**출력 파일**: `docs/regulation-audit-2026.md`

**TDD 테스트** (`tests/phase0-audit.js`):
```js
// FAIL: 감사 보고서 파일이 없음 → Phase 0 완료 후 PASS
assert(fs.existsSync('docs/regulation-audit-2026.md'))
// FAIL: 알려진 11개 이슈가 문서에 기록되어야 함
assert(audit.includes('BUG-01') && audit.includes('BUG-11'))
// FAIL: 각 이슈에 조항 번호가 있어야 함
assert(audit.match(/제\d+조/g).length >= 10)
```

**검증 (Phase 완료 시)**:
- `docs/regulation-audit-2026.md` HTML 뷰어로 브라우저 오픈
- 이슈 목록 시각적 확인

**완료 기준**:
- [ ] 감사 보고서 11개 이슈 이상 포함
- [ ] 각 이슈: 파일:위치, 현재값, 올바른값, 조항 근거
- [ ] phase0-audit.js PASS

---

### Phase 1: regulation-constants.js 생성

**목표**: 모든 규정 상수를 조항 주석과 함께 단일 파일로 추출

**출력 파일**: `regulation-constants.js`

**포함 항목**:
- 장기근속수당 (ADDITIVE 구조, 제50조)
- 야간수당 배율 (제47조: 2.0)
- 통상임금 구성 항목 (제43조)
- hourlyRate 기준 시간 (제32조: 209h)
- 리프레시지원비 (별도합의 2024.11: 30,000원/월)
- 퇴직수당 요율 (제52~57조)

**TDD 테스트** (`tests/phase1-constants.js`):
```js
const RC = require('../regulation-constants.js')
// 각 상수에 조항 주석이 있어야 함
assert(RC.LONG_SERVICE_PAY._ref === '제50조')
assert(RC.NIGHT_ALLOWANCE_MULTIPLIER === 2.0)
assert(RC.ORDINARY_WAGE_HOURS === 209)
assert(RC.REFRESH_BENEFIT_MONTHLY === 30000)
```

**완료 기준**:
- [ ] 30개 이상 상수 + 조항 주석
- [ ] phase1-constants.js PASS

---

### Phase 2: 버그 수정 6종

**목표**: BUG-01~05 + ARCH-01,03 수정

| ID | 파일:위치 | 변경 내용 |
|----|-----------|----------|
| BUG-01 | `calculators.js` L89 | 리프레시지원비 주석 해제 + 통상임금 반영 |
| BUG-02/03 | `data.js` L173~182 | TIER→ADDITIVE 구조 변경, 25년+ 140,000원 |
| ARCH-01 | `retirement-engine.js` L10~37 | SEV_PAY/SEV_MULTI → DATA 참조 |
| ARCH-03 | `calculators.js` L94 | `Math.round` → `Math.floor` (요확인 후 적용) |
| BUG-04 | `calculators.js` L193 | 윤년 보정 연수 계산 |

**TDD 테스트** (`tests/phase2-bugfix.js`):
```js
// BUG-01: S1 5호봉 통상임금 30,000원 증가 확인
const before = CALC.calcOrdinaryWage('사무직','S1',5,{})
// BUG-02: 25년 장기근속 140,000원
assert(calcLongService(25) === 140000)
// BUG-03: 20년=100,000 / 21년=110,000 / 25년=140,000 (ADDITIVE)
assert(calcLongService(20) === 100000)
assert(calcLongService(21) === 110000)
// BUG-04: 윤년 포함 3년차 연차일수 정확성
assert(calcLeave(hireDate='2020-01-01', today='2023-01-01') === 16)
```

**완료 기준**:
- [ ] phase2-bugfix.js 전체 PASS
- [ ] before/after 수치 기록 파일 (`docs/bugfix-impact-2026.md`)

---

### Phase 3: 회귀 검증 도구

**목표**: 실제 직원 케이스 20개 이상으로 계산 회귀 테스트

**출력 파일**: `tests/calc-regression.js`

**시나리오 구성**:
- M1 5호봉 일반직 (군복무 없음, 25년 근속)
- S1 3호봉 일반직 (군복무 24개월, 10년 근속)  
- A1 1호봉 운영기능직
- 윤년 입사자 연차 계산 (2000-03-01 입사)
- 연장근로 40h 시나리오
- 야간수당 계산 (3교대, 10회/월)

**완료 기준**:
- [ ] 20개 시나리오 모두 PASS
- [ ] 의도된 변경 목록 (`docs/intentional-changes.md`)

---

### Phase 4: 표시 일관성 수정

**목표**: UI 텍스트 ↔ 계산 로직 불일치 해소

| ID | 파일:위치 | 수정 내용 |
|----|-----------|----------|
| DISPLAY-01 | `app.js` L2158 | "1·2·9월" → "1·9월(설/추석 제외)" |
| DISPLAY-02 | `data.js` L435 | FAQ 가계지원비 미지급월 통일 |
| DISPLAY-03 | `data.js` L393 | FAQ ref "제47조" → "제34조, 제47조" |
| DISPLAY-04 | `data.js` L449,L515 | 육아휴직 급여 상한액 표기 통일 |

**TDD 테스트** (`tests/phase4-display.js`):
```js
// app.js 텍스트 검증
assert(!appJs.includes('1·2·9월'))
assert(appJs.includes('1·9월'))
// data.js FAQ ref 검증
const faqEntry = DATA.faqs.find(f => f.id === 'overtime')
assert(faqEntry.ref.includes('제34조'))
```

**완료 기준**:
- [ ] phase4-display.js PASS
- [ ] 브라우저에서 FAQ/앱 텍스트 시각 확인

---

### Phase 5: 데드코드 정리

**목표**: 미연결 프로토타입 파일 아카이브

**작업**:
- `data/PayrollEngine.js` → `data/archive/PayrollEngine.legacy.js`
- `data/hospital_rule_master_2026.json` → `data/archive/`

**TDD 테스트** (`tests/phase5-cleanup.js`):
```js
assert(!fs.existsSync('data/PayrollEngine.js'))
assert(fs.existsSync('data/archive/PayrollEngine.legacy.js'))
// 어떤 실행 파일도 PayrollEngine을 import하지 않음
const appJs = fs.readFileSync('app.js', 'utf8')
assert(!appJs.includes('PayrollEngine'))
```

---

### Phase 6: Union Regulation Admin UI

**목표**: 비개발자가 단일 화면에서 프론트/백엔드 양쪽 규정을 갱신

**파일**: `admin/union_regulation_admin.html`

**기능**:
- 규정 상수 목록 표시 (조항 번호 + 현재값)
- 값 수정 → DB 저장 → data.js fallback 업데이트 프리뷰
- nurse_regulation.json 동기화 상태 표시

**TDD**: Playwright 스냅샷 검증

---

### Phase 7: 역계산 검증

**목표**: 명세서 PDF 파싱 결과 vs CALC 계산값 비교

**태스크**:
- R13: `verifyPayslip(parsedData, calcResult)` 함수
- R14: 검증 결과 UI (오차 표시)

**허용 오차**: ≤ 1% 또는 ≤ 500원

---

### Phase 8: AI 인사이트

**목표**: 다중 명세서 이상 탐지 + AI 리포트

**태스크**:
- R15: 집계 엔진 (월별 추이, 항목별 이상 탐지)
- R16: 대시보드 UI

---

### Phase 9: 간호사 규정 CALC 통합

**목표**: 프리셉터/프라임팀/리커버리데이/40세 야간 제외 구현

**태스크**: R17-19

---

### Phase 10: 퇴직금 강화

**목표**: 3개월 평균임금, DATA 참조, 운영기능직 보호

**태스크**: R20-23

---

## 4. 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 런타임 | Node.js (CommonJS) | 기존 data.js, calculators.js 방식 유지 |
| 테스트 | 자체 assert + node 실행 | 외부 의존성 없음 |
| E2E 시각화 | Playwright (headless=false) | Phase별 브라우저 자동 오픈 |
| 문서 형식 | Markdown | 브라우저 프리뷰 가능 |

---

## 5. 경계 (Boundaries)

**항상 할 것**:
- 각 상수에 규정 조항 번호 주석 (`// 제N조`)
- Phase 완료 전 테스트 PASS 확인
- before/after 수치 기록

**먼저 확인할 것**:
- `ARCH-03` (hourlyRate 버림 정책): 계산값 감소 가능 → 적용 전 수치 보고 후 결정
- Phase 6+ 범위 변경: DB 없이 UI만 구현할지 확인

**절대 하지 않을 것**:
- 기존 DATA 객체 구조 변경 (fallback 역할 유지)
- 테스트 없이 계산 로직 변경
- 브라우저 확인 없이 Phase 완료 선언

---

## 6. 시각화 전략 (Phase별 검증)

각 Phase 완료 시 다음 중 하나 실행:

```bash
# 옵션 A: Playwright 자동 스냅샷 (비대화형, 권한 전체 허용)
npx playwright test tests/visual/phaseN.spec.js --headed

# 옵션 B: 브라우저 자동 오픈 (macOS)
open http://localhost:3000/index.html
open docs/regulation-audit-2026.md
```

**Phase 0**: `docs/regulation-audit-2026.md` 브라우저 오픈  
**Phase 1**: `regulation-constants.js` 항목 수 + 조항 주석 스냅샷  
**Phase 2**: 계산기 화면에서 장기근속/리프레시 수치 확인  
**Phase 3**: 회귀 테스트 결과 리포트 HTML 생성  
**Phase 4+**: 앱 화면 스냅샷 비교  
