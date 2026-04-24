# Plan L Tier 4: Regulation → Calculator/UI 커버리지 감사

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `data/full_union_regulation_2026.md` (+ `2026_handbook.pdf`) 의 **수치/공식이 있는 모든 조항**을 `calculators.js` + `DATA_STATIC` + UI 탭과 매핑해 **구현 유무 + 누락 리스트**를 산출한다.

**Architecture:**
- **코드 변경 0** — 오직 `docs/architecture/regulation-coverage-audit.md` (신규) 생성.
- 감사 방식: 장(Chapter) 별로 수치/공식 조항 추출 → grep 으로 `calculators.js` 함수명 + `DATA_STATIC` 필드 + HTML onclick 핸들러 역참조 → 매핑 테이블.
- 각 행 상태: **✅ 구현** / **🟡 부분** (예: DATA 에 값은 있으나 UI 노출 없음) / **❌ 누락** / **N/A** (계산 불필요 조항).
- 최종 우선순위 (사용자 가치 기준) 로 정렬해 **Plan M (누락 계산기 구현)** 의 입력으로 사용.

**Tech Stack:** Markdown + grep + 수동 매핑. 새 의존성 0.

**Branch:** `docs/plan-l-tier4-audit` (worktree)

---

## 배경

Plan K (full_union 복원) 완료로 3,145줄 / 95조 / 364 합의 확보. **읽을 수 있는 canonical 원문이 처음 생김**. 이 원문을 계산기·UI 와 대조하면 "앱이 제공 못 하는 규정 기반 기능" 이 드러난다.

이미 눈으로 발견한 후보 (plan 근거):

| 조항 | 규정 요지 | 현재 구현 의심 |
|------|-----------|---------------|
| 제38조(2) 유산/사산 주수별 | 주수별 유급휴가 일수 (90/60/30/10/5일) | 계산기 없음 |
| 제41조 청원휴가 | 결혼·출산·사망 일수표 | UI 렌더 없음 |
| 제42조 장기재직휴가 | 10~19년 5일, 20년+ 7일 (2026 시행) | 값만 Plan F 에서 정정, UI 없음 |
| 제49조 명절지원비 | 설·추석·5월·7월 (기본급+조정급/2)의 50% | `calcHolidayBonus` 불명 |
| 제58조 복지포인트 | 기본 400P + 근속 10P/년 + 가족 | `calcWelfarePoints` 불명 |
| 임금피크제 | 보수 60%, 운영기능직 최저임금 120% 보호 | `calcWagePeak` 불명 |
| 제67조 진료비감면 | 본인·배우자 100%·50% + 부모·자녀 50% | 시뮬레이터 없음 |

이 외에 **전수 감사로 숨은 누락** 다수 발견 예상.

---

## 파일 구조

### 생성

- `docs/architecture/regulation-coverage-audit.md` — 전수 감사 결과 + 우선순위 + Plan M 후보

### 수정

- 없음 (**코드 변경 금지**)

### 산출 테이블 구조 (audit 문서 내부)

모든 행은 다음 컬럼을 가진다:

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|

- **조항**: `제XX조` 또는 `제XX조의Y` 또는 `<YYYY.MM>` 합의 이름
- **수치/공식**: 규정에 명시된 숫자/산식 (e.g., `시간외 150%`, `15일 + 2년마다 1일 가산 (상한 25일)`)
- **현재 구현**: `CALC.함수명` 또는 `DATA.경로` 또는 `❌`
- **UI 탭**: `index.html#tab-overtime` 등 또는 `❌`
- **상태**: ✅ 구현 / 🟡 부분 / ❌ 누락 / `N/A`
- **우선순위**: High / Medium / Low (빈도·영향 기준)

---

## Task 1: 워크트리 + baseline

**Files:** 없음 (인프라)

- [ ] **Step 1: 워크트리**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git worktree add .worktrees/plan-l-tier4 -b docs/plan-l-tier4-audit
cd .worktrees/plan-l-tier4
mkdir -p docs/architecture
```

- [ ] **Step 2: baseline 확인**

```bash
wc -l data/full_union_regulation_2026.md
grep -cE "^\*\*제[0-9]+조" data/full_union_regulation_2026.md
```

Expected: 3,145줄 / 95조. 다르면 STOP + main 재확인.

- [ ] **Step 3: 기존 calculators.js 함수 + DATA 키 snapshot**

```bash
grep -nE "^    (calc|resolve|format|verify)[A-Z]" calculators.js > /tmp/audit-calc-functions.txt
grep -nE "^  [a-z][a-zA-Z]*:" data.js > /tmp/audit-data-keys.txt
grep -rn "onclick=\"" --include="*.html" --include="tabs/*.html" . | grep -v worktrees > /tmp/audit-onclick-handlers.txt
```

세 파일은 매핑 근거 자료. 이후 Task 에서 grep 할 때 기준.

- [ ] **Step 4: baseline 태그**

```bash
git tag baseline-plan-l-tier4
```

---

## Task 2: 감사 문서 뼈대 생성 + 소개 섹션

**Files:**
- Create: `docs/architecture/regulation-coverage-audit.md`

- [ ] **Step 1: 파일 생성 + 헤더/목차**

```markdown
# Regulation → Calculator/UI Coverage Audit

> 작성일: 2026-04-24 (Plan L Tier 4)
> 소스: `data/full_union_regulation_2026.md` (2025.10.23 단협 전문 전사), `data/2026_handbook.pdf` (canonical PDF)
> 목적: 규정의 모든 수치/공식 항목을 calculators.js + DATA_STATIC + UI 와 대조해 **구현 유무 + 누락 리스트** 산출.

## 범례

- **상태 컬럼**:
  - ✅ **구현** — 계산기 + UI 노출 있음
  - 🟡 **부분** — DATA 또는 계산은 있으나 UI 노출/사용자 발견 경로 없음
  - ❌ **누락** — 계산기·UI 둘 다 없음
  - `N/A` — 수치 없는 서술적 조항 (계산 불필요)
- **우선순위**:
  - **High** — 모든 조합원이 자주 사용 (시간외, 연차, 급여, 퇴직금)
  - **Medium** — 조건부 사용 (휴직, 가족수당 변경, 특별휴가)
  - **Low** — 드물게 사용 (경조금 계산, 보건직 특수 항목)

## 목차

1. [제3장 인사](#제3장-인사)
2. [제4장 근로시간](#제4장-근로시간)
3. [제5장 임금 및 퇴직금](#제5장-임금-및-퇴직금)
4. [제6장 복리후생 및 교육훈련](#제6장-복리후생-및-교육훈련)
5. [제7장 안전보건 재해보상](#제7장-안전보건-재해보상)
6. [제8~10장](#제8-10장)
7. [별도 합의사항](#별도-합의사항)
8. [별첨](#별첨)
9. [요약 — 누락 리스트 (Plan M 입력)](#요약--누락-리스트)
10. [Plan M 초안 — 우선순위별 구현 후보](#plan-m-초안)

```

- [ ] **Step 2: 커밋**

```bash
git add docs/architecture/regulation-coverage-audit.md
git commit -m "docs(audit): 커버리지 감사 문서 뼈대 + 목차 (Plan L T4 Task 2)"
```

---

## Task 3: 제3장 + 제4장 감사 섹션 (Subagent A 가능)

**Files:**
- Modify: `docs/architecture/regulation-coverage-audit.md` — 제3장 / 제4장 섹션 append

- [ ] **Step 1: 제3장 인사 수치 항목 추출**

full_union.md 의 `## 제3장 인사` ~ `## 제4장 근로시간` 범위에서 수치/공식 또는 구조적 규칙이 있는 조항만 골라낸다 (서술 조항은 `N/A` 표시).

```bash
awk '/^## 제3장/,/^## 제4장/' data/full_union_regulation_2026.md | grep -nE "제[0-9]+조|일수|시간|[0-9]+%|[0-9]+,[0-9]+원|개월" | head -40
```

결과에서 각 수치 항목 → audit 테이블 행 생성.

**예상 항목 (감사 대상):**
- 제18조(인사원칙) (12)(13): 배치전환 교육일수 (동일계열 3일, 이종계열 6일, 중환자실 14일)
- 제19조(조건부기간): 조건부 3개월
- 제20조(승진): 4급 이하 T/O 1개월 내
- 제24조(정년): 만 60세
- 제26조(휴직): 8개 사유
- 제28조(휴직자 대우): 70% / 80% / 100% 지급률 구간
- 제31조(취업규칙): 노조 동의 기준
- 제31조의2 (폭행·폭언·성희롱): 특별휴가 2일

- [ ] **Step 2: 각 항목을 calculators.js + DATA + UI 에 매핑**

각 항목마다:

```bash
# 계산기 매핑 (예: 배치전환 교육)
grep -n "배치전환\|transferEducation\|onboarding" calculators.js

# DATA 필드
grep -nA3 "transferEducation\|배치전환\|jobTransfer" data.js

# UI 노출
grep -rn "배치전환" --include="*.html" --include="tabs/*.html" .
```

결과에 따라 ✅/🟡/❌ 판정.

- [ ] **Step 3: 제3장 섹션 append**

`docs/architecture/regulation-coverage-audit.md` 에 `## 제3장 인사` 헤더 + 테이블 추가:

```markdown
## 제3장 인사

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|
| 제18조(12) 배치전환 교육 | 간호직 동일계열/이종계열/중환자실 이동 시 교육일수 | 3일 / 6일 / 14일 | ❌ | ❌ | ❌ 누락 | Low |
| 제19조(조건부기간) | 조건부 기간 3개월 | 3개월 | ❌ | ❌ | N/A (HR 내부) | N/A |
| 제20조(승진) | 4급 이하 T/O 발령 기한 | 1개월 내 | ❌ | ❌ | N/A (HR 내부) | N/A |
| 제24조(정년) | 정년 연령 | 만 60세 | PROFILE 연관 추정 | ❌ | 🟡 부분 | Low |
| 제28조(휴직자 대우)(2) | 질병/공상 휴직 중 지급률 | (기본급+능력급+조정급+상여금)×70% | `CALC.calcParentalLeavePay` 부분? | ❌ | 🟡 부분 | Medium |
| 제28조(5) 육아휴직 | 1~6개월 100% (상한), 7~12개월 80% | 100% / 80% | ❌ | ❌ | ❌ 누락 | **High** |
| 제31조의2 특별휴가 | 폭행·폭언 피해 시 | 2일 이내 | ❌ | ❌ | ❌ 누락 | Low |
```

숫자 전부 실제 handbook/full_union 기반으로 기재. 매핑 불확실 시 `?` 표시 + 각주.

- [ ] **Step 4: 제4장 근로시간 동일 작업**

제4장 섹션도 동일 템플릿. **수치/공식이 많은 구간** 이므로 신중히:

**예상 항목:**
- 제32조(근로조건) (1): 1일 8시간, 주 40시간 → 시급 계산의 209 근거
- 제32조 (2)-1 간호직 야간근무 & 리커버리데이: 월 ≤6일, ≤7일 1일, 누적 15일 × 1일
- 제32조 (2)-2 시설직 누적 리커버리: 20일 × 1일 (Plan F #6 구현 완료)
- 제32조 (6) 법정공휴일 50% 가산
- 제32조 (9) 온콜 교통비 1회 5만원
- 제33조(휴게시간): 정오 1시간
- 제34조(연장근로): 1일 2h / 주 10h / 주 12h 한도, 150%, 통상근무자 연장→야간 200%, 시급=통상×1/209, 15분 단위
- 제35조(유급휴일): 주휴 + 공휴일 + 근로자의 날 + 개원기념일 + 조합설립일 (09~13 근무)
- 제36조(연차): 1년 8할 출근 → 15일, 2년 +1 최대 25일
- 제36조(4) 연차보전수당: 통상임금 × 150% × 차분/23
- 제37조(생리휴가): 월 1회 무급 (기본급 일액 9/10 공제)
- 제38조(산전후): 90일 / 쌍둥이 120일
- 제38조(2) 유산/사산: 주수별 90/60/30/10/5일
- 제38조(3)(4) 임신 중 근로제한, 정기검진 월 1일
- 제39조(수유시간): 1일 2회 × 30분
- 제40조(특별휴가): 재해 3일, 정년 전 공로연수 1년
- 제41조(청원휴가): 일수표 7개
- 제42조(기타 유급휴일): 예비군/민방위/법원/헌혈
- `<2021.11>` 가족돌봄휴가: 연 2일 (자녀 2명 이상/장애 3일)
- `<2025.10>` 장기재직휴가: 10~20년 5일, 20년+ 7일

제4장 섹션을 audit 문서에 append.

- [ ] **Step 5: 커밋**

```bash
git add docs/architecture/regulation-coverage-audit.md
git commit -m "docs(audit): 제3~4장 커버리지 감사 (Plan L T4 Task 3)

수치·공식 조항별 계산기/DATA/UI 매핑.
제4장 근로시간이 핵심 — 시간외·휴가·청원·유산/사산 등."
```

---

## Task 4: 제5장 + 제6장 감사 섹션 (Subagent B 가능)

**Files:**
- Modify: `docs/architecture/regulation-coverage-audit.md` — 제5장 / 제6장 섹션 append

- [ ] **Step 1: 제5장 임금·퇴직금 수치 항목 추출**

```bash
awk '/^## 제5장/,/^## 제6장/' data/full_union_regulation_2026.md | grep -nE "[0-9]+%|[0-9]+,[0-9]+|개월분|일수|급률" | head -40
```

**예상 항목:**
- 제43조(임금 정의 및 구성): 통상임금 16개 구성요소
- 제44조(통상임금 정의): 기본급/상여금/각종수당
- 제45조(임금인상): 1월 협약 기준
- 제45조(2005.09): 단시간근무자 인상률 ≥ 정규직
- 제45조(2015.11) 임금피크제: 공로연수 1년 + 보수 60%
- 제45조(2021.11): 운영기능직 최저임금 120% 보호
- 제45조(2022.12): 2024년부터 공로연수 미부여 & 100% 지급 선택 옵션
- 제46조(정기승급): 매년 입사 익월 1호봉
- 제46조(2005.09) 운영기능직 한계호봉 8호봉
- 제47조(연장·야간·휴일 가산율): 150%/200%
- 제48조(임금지급): 매월 17일
- 제49조(가족수당): 배우자 40k / 가족 20k / 자녀 30k·70k·110k / 최대 5인
- 제50조(장기근속수당): 5/6/8/10만원 + 21년+ 1만 가산, 25년+ 3만 가산
- 제51조(상여금): 3직군 27직급 연간 테이블
- 제52조(퇴직금): 1년 이상 근속 1개월분, 지급률 1~30년
- 제52조(4) 사학연금 2016.03 이후 가입 분리
- 제53조(퇴직수당): 5구간 (10/35/45/50/60%)
- 제54조(공제금): 조합비·기부금
- 제55조(비상시 지불): 배우자/본인/직계·자녀/결혼/휴직·퇴직·해고
- 제56조(임금인하 금지)
- 제57조(휴업수당): 평균임금 100%

각 항목 매핑:

```bash
grep -n "calcOrdinaryWage\|calcSeverance\|calcLongService\|calcFamily\|calcWagePeak\|calcHolidayBonus\|calcMealPay" calculators.js
grep -rn "familyAllowance\|severancePay\|longServicePay\|seniorityRates" data.js | head
```

- [ ] **Step 2: 제5장 섹션 append**

테이블 형식 유지. **우선순위는 높게** — 급여 계산이 앱의 핵심 기능.

- [ ] **Step 3: 제6장 복리후생 수치 항목 추출 + 매핑**

**예상 항목:**
- 제58조(1) 가계지원비 직급별 테이블
- 제58조(1)-1 맞춤형 복지제도: 기본 400P + 근속 10P/년 최대 30만원 + 가족 포인트
- 제58조(2) 학비 지원 (국가공무원 동일)
- 제58조(3) 급식보조비 15만원 (⚠️ handbook 은 12만원 — Plan K 발견 drift)
- 제58조(4) 교통보조비
- 제59조(식사): 야간근무/예비군 조기출근/보라매 밤번
- 제61조(간호사 기숙사)
- 제62조(어린이집)
- 제63조(경조금): 8개 항목 (30만/10만/100만 등)
- 제63조의2 신규간호사 교육 8주 (중환자실 10주), 80% 초임 지급, 프리셉터 20만원
- `<2017.12>` 복지포인트 자녀 16세+ 7년간 120만원/년

- [ ] **Step 4: 제6장 섹션 append**

- [ ] **Step 5: 커밋**

```bash
git add docs/architecture/regulation-coverage-audit.md
git commit -m "docs(audit): 제5~6장 커버리지 감사 (Plan L T4 Task 4)

- 제5장: 가족수당/장기근속/상여/퇴직금/퇴직수당 등 급여 핵심
- 제6장: 복지포인트/가계지원비/경조금/신규교육

급식보조비 drift (handbook 12만 vs data.js 15만) 명시."
```

---

## Task 5: 제7~10장 + 별도합의 + 별첨 감사 (Subagent C 가능)

**Files:**
- Modify: `docs/architecture/regulation-coverage-audit.md` — 제7~10장, 별도합의, 별첨 섹션 append

- [ ] **Step 1: 제7장 안전보건 수치 항목**

**예상 항목:**
- 제64조(병원안전보건위): 노사 각 5명
- 제64조의2 근골격계 예방: 월 1일 공가, 체력증진센터 주중 07:30~20:00
- 제64조의3 안전보건교육: 연 4시간, 신규 8시간
- 제65조 건강진단: 주기별 검사항목 (HIV/VDRL/콜레스테롤/유방촬영/대장/위)
- 제67조 진료비감면: 본인+배우자 선택 100% 외 50% / 부모+자녀 50%
- 제70조 요양보상 / 제71조 휴업보상 (업무상 6개월 유급, 이후 70%) / 제72조 장해 / 제73조 유족 (1300일) + 장례 (120일) / 제74조 지급시기 (10일 내)

- [ ] **Step 2: 제8~10장**

대부분 절차 규정 (N/A) 이지만 몇 가지:
- 제75조 교섭요구 5일 내 응답
- 제86조 협약 유효기간 (1년, 자동 연장)
- 제92조 시행시기

- [ ] **Step 3: 별도합의 — 주요 수치**

인력충원, 임금 인상률, 복지 포인트 증가율 등. 대부분 시계열적 — "과거 특정 연도 합의" 라 현재 적용 여부 확인 필요.

- [ ] **Step 4: 별첨**

- 2025년 보수표 전체 (DATA_STATIC.payTables 대조)
- 청원휴가·경조금 일람표
- 휴직제도 (육아/질병/가족돌봄 등 10종)
- 리프레시지원비 사용가능 항목

- [ ] **Step 5: 섹션 append + 커밋**

```bash
git add docs/architecture/regulation-coverage-audit.md
git commit -m "docs(audit): 제7~10장 + 별도합의 + 별첨 커버리지 감사 (Plan L T4 Task 5)

- 안전보건: 진료비감면/요양보상/장해보상 수치 테이블
- 별첨: 2025 보수표·청원휴가·휴직제도·리프레시"
```

---

## Task 6: 요약 — 누락 리스트 + 우선순위 + Plan M 초안

**Files:**
- Modify: `docs/architecture/regulation-coverage-audit.md` — 요약 섹션 추가

- [ ] **Step 1: 전체 통계 집계**

```bash
grep -cE "^\|.*✅" docs/architecture/regulation-coverage-audit.md
grep -cE "^\|.*🟡" docs/architecture/regulation-coverage-audit.md
grep -cE "^\|.*❌ 누락" docs/architecture/regulation-coverage-audit.md
grep -cE "^\|.*N/A" docs/architecture/regulation-coverage-audit.md
```

결과를 요약 섹션 도입부에 기재:

```markdown
## 요약 — 누락 리스트

**전체 감사 행:** {총 수}
- ✅ 완전 구현: {n}
- 🟡 부분 구현: {m}
- ❌ 누락: {k}
- N/A (수치 없음): {j}

**커버리지:** {(n + m) / (n + m + k) * 100}% (부분 포함)
**실질 커버리지:** {n / (n + m + k) * 100}% (완전 구현만)
```

- [ ] **Step 2: ❌ 누락 전체 리스트**

테이블:

```markdown
### ❌ 누락 항목 (구현 대상)

| # | 조항 | 요지 | 우선순위 | 예상 공수 | 의존성 |
|---|------|------|---------|----------|-------|
| 1 | 제38조(2) 유산/사산 주수별 | 28주+ 90일 / 22~27 60일 / 16~21 30일 / 12~15 10일 / ≤11 5일 | Medium | 1h | DATA 추가 + Q&A 카드 |
| 2 | 제41조 청원휴가 일람 UI | 결혼 5/자녀결혼 1/출산 10/사망 5·3/입양 20 | Medium | 2h | DATA 추가 + 정보 탭 카드 |
| 3 | 제42조 장기재직휴가 | 10-19년 5일 / 20년+ 7일 | Medium | 1h | FAQ 카드 |
| 4 | 제49조 명절지원비 | 설·추석·5월·7월 × (기본급+조정급/2)×50% | **High** | 3h | `calcHolidayBonus` 신규 + 급여 예상 반영 |
| 5 | 제50조(25년+ 3만 가산) | 장기근속수당 25년 이상 +3만 | Medium | 0.5h | longServicePay 배열 확장 (이미 있음 확인 필요) |
| 6 | 제58조(1)-1 복지포인트 | 400P + 근속 10P/년(최대 30만) + 가족(배우자100/자녀100/셋째+200/기타5×4인) | Medium | 2h | `calcWelfarePoints` 신규 + info 탭 |
| 7 | 임금피크제 | 보수 60% (운영기능직 최저임금 120% 보호) | Low | 2h | `calcWagePeak` + 급여 예상 토글 |
| 8 | 제67조 진료비감면 시뮬 | 50%/100% 감면 시 금액 계산 | Low | 2h | `calcMedicalDiscount` + info 탭 |
| 9 | 제63조의2 신규 교육 수당 | 첫 4주 80% 지급 + 프리셉터 20만원 | Low | 1h | FAQ 카드 |
| 10 | 제28조(5) 육아휴직 | 1~6개월 통상임금 100% (상한) / 7~12개월 80% | **High** | 2h | `calcParentalLeavePay` 개선 또는 신규 |
```

- [ ] **Step 3: 🟡 부분 구현 항목 — 완성 TODO**

"DATA 값은 있는데 UI 노출 없음" 유형을 따로 정리. 추가 작업량 적음.

- [ ] **Step 4: Plan M 초안 섹션**

```markdown
## Plan M 초안 — 우선순위별 구현 후보

### Phase 1 (High 우선순위, 즉시 가치)
- [ ] 제49조 명절지원비 — `calcHolidayBonus` 신규 + 급여 예상에 자동 포함 (3h)
- [ ] 제28조 육아휴직 급여 — `calcParentalLeavePay` 정확화 + UI (2h)

### Phase 2 (Medium)
- [ ] 제42조 장기재직휴가 — 정보 탭에 카드 + 잔여 일수 표시 (1h)
- [ ] 제41조 청원휴가 일람 — 정보 탭 카드 (2h)
- [ ] 제58조 복지포인트 — `calcWelfarePoints` + 계산 결과 카드 (2h)
- [ ] 제38조 유산/사산 주수별 — Q&A 카드 (1h)

### Phase 3 (Low — 범위 확장)
- [ ] 임금피크제
- [ ] 진료비감면 시뮬레이터
- [ ] 신규 교육 수당

예상 총 공수: **Phase 1 = 5h, Phase 2 = 6h, Phase 3 = 5h**
```

- [ ] **Step 5: 커밋**

```bash
git add docs/architecture/regulation-coverage-audit.md
git commit -m "docs(audit): 요약 + 누락 리스트 + Plan M 초안 (Plan L T4 Task 6)

- 커버리지 통계 (✅/🟡/❌/N/A)
- ❌ 누락 우선순위별 테이블
- Plan M Phase 1-3 (High/Medium/Low) 분류 + 공수 추정"
```

---

## Task 7: 최종 검증 + main merge

**Files:** 없음 (인프라)

- [ ] **Step 1: audit 문서 품질 체크**

```bash
# 섹션 헤더 완성도 (1~10 + 요약 + Plan M = 총 10개 이상)
grep -cE "^## " docs/architecture/regulation-coverage-audit.md

# 테이블 행 수 (수치 조항 30+ 예상)
grep -cE "^\| " docs/architecture/regulation-coverage-audit.md

# 상태 아이콘
grep -cE "✅|🟡|❌|N/A" docs/architecture/regulation-coverage-audit.md
```

- [ ] **Step 2: README 링크 추가**

`docs/architecture/README.md` 문서 목록 표 마지막에:

```markdown
| 7 | [regulation-coverage-audit.md](./regulation-coverage-audit.md) | Plan L T4 — 규정 → 계산기/UI 커버리지 감사 (❌ 누락 X건 + Plan M 초안) |
```

- [ ] **Step 3: 테스트 (변화 없어야)**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime/.worktrees/plan-l-tier4
npm install 2>&1 | tail -3
npm test 2>&1 | tail -5
```

Expected: 66 passed + 0 skipped / 3 smoke passed. 코드 변경 0 이므로 변화 없음.

- [ ] **Step 4: main merge + push**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git checkout main
git merge --no-ff docs/plan-l-tier4-audit -m "Merge Plan L T4 — 규정 커버리지 감사 + Plan M 초안"
git worktree remove .worktrees/plan-l-tier4
git branch -d docs/plan-l-tier4-audit
git push origin main
```

---

## Self-Review

**1. Spec 커버리지:**
- 제1~10장 + 별도합의 + 별첨 전체 감사 ✅ (Task 3, 4, 5)
- 누락 리스트 + 우선순위 ✅ (Task 6)
- Plan M 초안 ✅ (Task 6 Step 4)
- 코드 변경 0 ✅ (문서만)
- README 링크 ✅ (Task 7 Step 2)

**2. Placeholder 없음:**
- 각 Task 는 실제 grep 명령 + 예상 항목 리스트 포함.
- "X 개" 같은 추정은 Task 6 Step 1 의 실제 grep 결과로 치환하도록 명시.

**3. Type consistency:**
- 테이블 컬럼 (조항/요약/공식/구현/UI/상태/우선순위) 모든 Task 에서 동일.
- 상태 아이콘 (✅/🟡/❌/N/A) 모든 Task 에서 동일.

---

## 리스크 및 완화

| 리스크 | 완화 |
|-------|------|
| 규정 해석의 주관성 (예: "이 조항에 계산 공식이 있나?") | 수치(숫자/%/일수/개월) 포함 여부로 객관 판정. 불명확 시 `?` + 각주 |
| calculators.js 의 숨은 구현 간과 (grep 오탐/누락) | 함수명·DATA 키 두 경로 모두 grep. 의심 시 Read 로 코드 확인 |
| 별도합의 — 과거 합의가 현재도 유효한지 불명 | "현재 반영 상태 불명" 표시 + Plan M 대상에서 제외 가능 |
| 보수표 27직급 × 8호봉 전체 감사 부담 | Plan L Tier 2/3 범위. Tier 4 에서는 "보수표 구조 일치" 수준만 |
| handbook 과 full_union.md 불일치 (Plan K 발견 120k vs 150k 등) | 확인 즉시 `known-issues.md` 에 drift 로 기록 (수정은 Plan L Tier 1) |

---

## 예상 작업량

- Task 1 (인프라): 10분
- Task 2 (뼈대): 15분
- Task 3 (제3~4장): 45분 (가장 큰 섹션, 제4장 휴가 조항 많음)
- Task 4 (제5~6장): 45분 (급여·복지 핵심)
- Task 5 (제7~10장 + 별도합의 + 별첨): 45분
- Task 6 (요약 + Plan M 초안): 30분
- Task 7 (merge): 10분

**총 약 3.5시간**. Subagent 병렬화 시 Task 3/4/5 를 동시에 돌리면 2시간 내 가능.

---

## 후속 (Plan L T4 이후)

- **Plan M Phase 1** (High 우선순위 계산기 신규 구현): 명절지원비 + 육아휴직 급여. 5h.
- **Plan L Tier 1** (단가·율 값 전수 대조): 수치 drift 전수 정정 필요 시 진행.
- **Plan J** (자동화): full_union ↔ registry 자동 링크 스크립트.

Plan L T4 가 Plan M 의 **입력 문서** 이므로 먼저 완료 필수.
