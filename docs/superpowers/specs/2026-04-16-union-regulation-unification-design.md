# Union Regulation Unification Design

**Date:** 2026-04-16
**Workspace:** `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2`
**Primary raw source:** `/Users/momo/Documents/GitHub/bhm_overtime/data/union_regulation_2026.json`
**Reference normalized source:** `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/content/policies/2026/nurse_regulation.json`

## Goal

`union_regulation_2026.json`을 이 앱의 규정 기준본으로 정리하고, 여기서 **재생성 가능한 파생 파일** `union_regulation_cal_2026.json`을 만들어 급여 파서, 계산기, 규정 탭, FAQ, 검증 로직이 모두 같은 변수와 같은 계산식을 사용하도록 통일한다.

## Problem Statement

현재 규정과 계산 관련 데이터는 여러 파일에 분산되어 있고, 서로 다른 시점/목적의 표현이 섞여 있다.

- 원문 규정에 가까운 데이터:
  - `/Users/momo/Documents/GitHub/bhm_overtime/data/union_regulation_2026.json`
- 정규화/시뮬레이션에 강한 구조:
  - `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/content/policies/2026/nurse_regulation.json`
  - `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/hospital_rule_master_2026.json`
- 런타임 계산/표시에 쓰이는 코드:
  - `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/calculators.js`
  - `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/regulation-constants.js`
  - `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data.js`
  - `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/app.js`
  - `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/regulation.js`
  - `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/salary-parser.js`

이 상태에서는 같은 항목이 파일마다 다른 이름, 다른 계산식, 다른 설명으로 존재할 수 있다.

예:

- `직책수당` / `직책급`
- `승급호봉분` / `승급조정급`
- `자기계발별정수당` / `교육훈련비`
- `명절지원비` / `명절지원비(월할)`
- `국민건강` / `건강보험` / `국민건강보험`
- `장기요양` / `장기요양보험`

또한 실제 급여명세서 표면 항목은 공백, 줄바꿈, 괄호, 축약, 셀 분리 때문에 같은 항목이라도 문자열이 계속 달라진다.

예:

- `급식보조비`
- `급식 보조비`
- `급식\n보조비`
- `급 식 보 조 비`
- `별정수당 (직무)`
- `별정수당(직무)`

즉, 지금 필요한 것은 “한 파일만 정답”이 아니라, **raw 규정 -> 계산 가능한 정규화 규정 -> 코드 소비자**로 이어지는 파이프라인이다.

## Final Direction

### 1. Raw source는 `union_regulation_2026.json`

`union_regulation_2026.json`은 원문 규정을 최대한 충실하게 담는 **raw corpus**다.

역할:

- 원문/조항/표/히스토리 보존
- 규정 검색/RAG/근거 추적
- 파생 규정 생성의 입력

이 파일은 사람이 직접 관리할 수 있고, 페이지/조항/표/부속합의를 더 정교하게 다듬을 수 있어야 한다.

### 2. `union_regulation_cal_2026.json`은 재생성 가능한 normalized rule graph

`union_regulation_cal_2026.json`은 `union_regulation_2026.json`에서 **생성되는 파생 파일**이다.

역할:

- 계산식
- 월별 지급 조건
- 통상임금 포함 여부
- 고정수당/보수표/경조/휴가/퇴직/연차 규칙
- 영문 `variable_key` 기반 canonical graph
- payslip alias / regulation alias / display label 연결

이 파일은 사람이 직접 손으로 수시로 만지는 기준본이 아니라, 생성기와 검증기로 다시 만들 수 있어야 한다.

### 3. `nurse_regulation.json`은 구조화 방식의 참고본

`nurse_regulation.json`은 “간호사 전용의 다른 규정”이 아니라, **같은 규정을 잘게 구조화한 참고본**이다.

이 파일에서 가져와야 하는 것은:

- 좋은 정규화 형식
- 잘게 쪼갠 계산 노드
- 시나리오 검증 친화적인 JSON 구조
- `page_refs`, `formula`, `condition`, `tiers`, `payment_months` 같은 설계 패턴

하지만 최종 canonical source 이름과 파생 경로는 `union` 기준으로 통일한다.

## Source Hierarchy

최종 우선순위는 아래와 같다.

1. **실제 최신 규정 반영본**으로 관리되는 `union_regulation_2026.json`
2. 실제 급여명세서 표면 항목
3. 최신 규정 이미지와 수기 확인값
4. `nurse_regulation.json`의 구조화 형식
5. 기존 `data.js`, `regulation-constants.js`, `calculators.js`, `app.js`, `regulation.js`

즉, 앱 코드는 `union_regulation_cal_2026.json`을 기준으로 바뀌어야 하고, 기존 하드코딩 상수는 그 결과와 일치해야 한다.

## Canonical Schema

### Core item node

모든 급여/공제/정산/근무기록 항목은 영어 snake_case `variable_key`를 갖는다.

```json
{
  "variable_key": "meal_subsidy",
  "category": "earning",
  "display_name_ko": "급식보조비",
  "canonical_name_ko": "급식보조비",
  "payslip_aliases_ko": [
    "급식보조비",
    "급식 보조비",
    "급 식 보 조 비",
    "급식\n보조비"
  ],
  "regulation_aliases_ko": [
    "급식보조비"
  ],
  "calc_role": {
    "included_in_ordinary_wage": true,
    "included_in_average_wage": true,
    "included_in_gross_pay": true
  },
  "value_rule": {
    "type": "fixed_amount",
    "amount": 150000
  },
  "refs": [
    {
      "source": "union_regulation_2026",
      "article": "별표",
      "page_hint": 96
    }
  ]
}
```

### Formula node

```json
{
  "formula_key": "holiday_bonus_event",
  "target_variable_key": "holiday_bonus_event",
  "type": "formula",
  "expression": "(base_salary + adjust_pay * 0.5) * 0.5",
  "payment_months": [
    "lunar_new_year_month",
    "chuseok_month",
    5,
    7
  ],
  "refs": [
    {
      "source": "union_regulation_2026",
      "article": "별표"
    }
  ]
}
```

### Wage table node

```json
{
  "wage_table_key": "general_j_grade",
  "group_name_ko": "일반직",
  "grade_nodes": {
    "J3": {
      "base_salary_by_year": [32379600, 32697600, 33019200, 33340800, 33666000, 33988800, 34318800, 34652400],
      "ability_pay": 8965200,
      "bonus": 1880400,
      "family_support": 10237460
    }
  },
  "refs": [
    {
      "source": "union_regulation_2026",
      "page_hint": 96
    }
  ]
}
```

## Label Normalization Design

### Principle

문자열은 화면에 보이는 원문 그대로 보존하되, **매칭은 정규화된 compact label** 기준으로 한다.

즉:

- 원문: 그대로 저장
- 표준명: 사람이 읽는 canonical Korean
- 내부 식별: English `variable_key`
- 비교/복구: normalized compact label

### Normalization rules

#### 1. whitespace-insensitive match

아래는 모두 같은 항목으로 본다.

- `급식보조비`
- `급식 보조비`
- `급 식 보 조 비`
- `급식\n보조비`

적용 규칙:

- 모든 공백 제거
- 줄바꿈 제거
- 연속 공백을 한 번에 제거

#### 2. punctuation-insensitive match

아래는 같은 항목으로 본다.

- `별정수당(직무)`
- `별정수당 (직무)`
- `별정수당（직무）`

적용 규칙:

- 괄호의 full-width / ASCII normalize
- 괄호 안팎 공백 제거

#### 3. OCR / cell split tolerant match

아래도 같은 항목으로 본다.

- `장기요양(정산)`
- `장 기 요 양 ( 정 산 )`
- `장기\n요양(정산)`

적용 규칙:

- compact label 생성
- Hangul/Jamo spacing loss 허용
- 숫자/괄호/한글 토큰을 붙여 비교

#### 4. exact meaning guard

공백만 없앤다고 무조건 같은 뜻으로 합치면 안 된다.

예:

- `명절지원비`와 `명절지원비(월할)`은 서로 다른 노드다
- `별정수당5`와 `별정수당(직무)`는 서로 다른 노드다

따라서:

- compact match
- alias dictionary
- category
- duplicate guard

를 동시에 통과해야 repair가 적용된다.

## `union_regulation_cal_2026.json` Generation Pipeline

### Input

- `/Users/momo/Documents/GitHub/bhm_overtime/data/union_regulation_2026.json`
- 필요한 경우 supplement metadata:
  - 실제 급여명세서 alias 목록
  - 최신 이미지로 확인한 표면 항목

### Output

- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/union_regulation_cal_2026.json`

### Generation steps

1. 원문 조항/표 스캔
2. 보수표 추출
3. 고정수당 추출
4. 통상임금 구성 항목 추출
5. 조건부 지급 규칙 추출
6. 연차/연차보전/퇴직/경조/휴직/온콜/야간 규칙 추출
7. payslip alias dictionary 병합
8. English `variable_key` 부여
9. formula graph 생성
10. refs/page/article 메타데이터 부착
11. schema validation
12. 기존 런타임 상수와 diff report 생성

### Generator policy

- 생성기는 deterministic 해야 한다
- 생성 결과는 항상 raw source로 다시 만들 수 있어야 한다
- 수동 patch가 필요하면 raw source 혹은 명시적인 supplement 파일을 고친다
- generated file은 직접 사람이 메인 기준으로 수정하지 않는다

## Canonical Variable Strategy

모든 내부 식별자는 영어 snake_case를 사용한다.

예:

- `base_salary`
- `seniority_base_salary`
- `military_service_pay`
- `ability_pay`
- `bonus_monthly`
- `family_support_pay`
- `adjust_pay`
- `upgrade_adjust_pay`
- `long_service_pay`
- `special_duty_pay`
- `position_pay`
- `work_support_pay`
- `meal_subsidy`
- `transport_subsidy`
- `holiday_bonus_event`
- `holiday_bonus_monthly_accrual`
- `training_allowance`
- `income_tax`
- `income_tax_settlement`
- `overtime_hours`
- `holiday_work_hours`
- `night_shift_bonus_count`
- `net_pay`

한국어는 다음 용도로만 둔다.

- 화면 표시
- 규정 원문 ref
- 급여명세서 alias
- 검색 질의 응답

## Consumer Model

### Important clarification

코드 소비자를 “다른 규정 파일을 각각 읽는 구조”로 분리하면 안 된다.

분리는 다음 의미로만 한다.

- **하나의 canonical graph를 공유**
- 각 파일은 필요한 projection만 사용

즉, **분리된 truth source**가 아니라 **분리된 read model**이다.

### Runtime projections

#### 1. Parser projection

`salary-parser.js`는 아래만 사용한다.

- `payslip_aliases_ko`
- `display_name_ko`
- `variable_key`
- `category`
- `calc_role`
- repair rule metadata

#### 2. Calculator projection

`calculators.js`는 아래만 사용한다.

- wage tables
- fixed amounts
- formulas
- month gates
- inclusion flags

#### 3. Regulation / FAQ projection

`regulation.js`, `data.js`, `app.js`는 아래를 사용한다.

- article refs
- readable formula summary
- FAQ explanation template
- display labels

#### 4. Constants projection

`regulation-constants.js`는 장기적으로 generated constants facade가 된다.

즉:

- 직접 숫자를 손으로 많이 적는 파일이 아니라
- canonical rule graph에서 자주 쓰는 값만 export하는 thin adapter로 바뀐다

## Unified Validation Model

모든 규칙은 검증 가능한 형태여야 한다.

### Value validations

- `meal_subsidy = 150000`
- `transport_subsidy = 150000`
- `military_service_pay = 45000`
- `night_shift_bonus_per_shift = 10000`

### Formula validations

- `holiday_bonus_event = (base_salary + adjust_pay * 0.5) * 0.5`
- `seniority_base_salary = (base_salary + adjust_pay * 0.5) * seniority_rate`
- `annual_leave_compensation = average_wage * coefficient`
- `annual_leave_preservation_allowance = ordinary_wage * 1.5 * coefficient`

### Inclusion validations

- 통상임금 포함 여부
- 평균임금 포함 여부
- 총지급 포함 여부
- 공제/정산 분리 여부

### Label validations

- regulation alias -> canonical item
- payslip alias -> canonical item
- compact label -> canonical item

## Files To Create

- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/union_regulation_cal_2026.json`
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/union_regulation_aliases_2026.json`
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/scripts/build-union-regulation-cal.mjs`
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/test-union-regulation-cal.mjs`

## Files To Update

- `/Users/momo/Documents/GitHub/bhm_overtime/data/union_regulation_2026.json`
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/regulation-constants.js`
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/calculators.js`
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/salary-parser.js`
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data.js`
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/app.js`
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/regulation.js`
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/payroll.js`

## Rollout Order

1. `union_regulation_2026.json` raw quality 정리
2. generator와 `union_regulation_cal_2026.json` 생성
3. alias/compact label schema 완성
4. parser를 canonical graph 기반으로 전환
5. calculators와 regulation-constants를 canonical graph 기반으로 전환
6. data.js / app.js / regulation.js 설명과 FAQ를 canonical graph에 맞춰 정리
7. fixture + smoke + diff 검증

## Resolved Decisions

- `급식 보조비` 같은 공백/줄바꿈/괄호 차이는 모두 같은 항목으로 매칭해야 한다
- `union_regulation_2026.json`에서 재생성 가능한 파생 파일로 간다
- English `variable_key`를 내부 기준으로 쓴다
- consumer는 truth source를 나누는 방식이 아니라, canonical graph의 projection을 읽는 방식으로 정리한다

