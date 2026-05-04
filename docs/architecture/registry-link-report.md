# Registry Link Report

> 자동 생성: `scripts/check-regulation-link.cjs`
> 생성 시각: 2026-05-04T11:06:49.800Z
> 입력: `data/calc-registry.json` (24 data_values) ↔ `data/full_union_regulation_2026.md`

## 요약

| 상태 | 개수 | 비율 |
|------|------|------|
| ✅ 일치 | 24 | 100% |
| 🟡 불명확 | 0 | 0% |
| ❌ 미일치 | 0 | 0% |
| **총** | **24** | — |

## 항목별 검증

| 상태 | path | article | expected | evidence | note |
|------|------|---------|----------|----------|------|
| ✅ | `allowances.overtimeRates.extended` | 각종 수당의 종류 | 1.5 | 150% | 본문 evidence 값 일치 (150%) |
| ✅ | `allowances.overtimeRates.night` | 각종 수당의 종류 | 2 | 200% | 본문 evidence 값 일치 (200%) |
| ✅ | `allowances.overtimeRates.extendedNight` | 각종 수당의 종류 | 2 | 200% | 본문 evidence 값 일치 (200%) |
| ✅ | `allowances.overtimeRates.holiday` | 각종 수당의 종류 | 1.5 | 150% | 본문 evidence 값 일치 (150%) |
| ✅ | `allowances.overtimeRates.holidayOver8` | 각종 수당의 종류 | 2 | 200% | 본문 evidence 값 일치 (200%) |
| ✅ | `allowances.overtimeRates.publicHoliday` | 제32조(6) | 0.5 | - | 본문 expected 값 일치 (50%) |
| ✅ | `allowances.specialPay5` | <2025.10> 임금체계 개선에 관한 사항 | 35,000 | 35,000원 | 본문 evidence 값 일치 (35,000원) |
| ✅ | `allowances.onCallStandby` | <2021.11> 온콜대기수당에 관한 사항 | 10,000 | 10,000원, 1만원 | 본문 evidence 값 일치 (10,000원) |
| ✅ | `allowances.onCallTransport` | 제32조 온콜 부속합의 | 50,000 | - | 본문 expected 값 일치 (5만) |
| ✅ | `allowances.onCallCommuteHours` | 제32조 온콜 부속합의 | 2 | - | 본문 expected 값 일치 (2) |
| ✅ | `allowances.nightShiftBonus` | <2015.05> 교대근무자 야간근무가산금에 관한 사항 | 10,000 | 1만원, 10,000원 | 본문 evidence 값 일치 (1만원) |
| ✅ | `recoveryDay.nurseCumulativeTrigger` | 제32조 (2)-1 | 15 | - | 본문 expected 값 일치 (15) |
| ✅ | `recoveryDay.otherCumulativeTrigger` | 제32조 (2)-2 | 20 | - | 본문 expected 값 일치 (20) |
| ✅ | `allowances.mealSubsidy` | 각종 수당의 종류 | 150,000 | 150,000원 | 본문 evidence 값 일치 (150,000원) |
| ✅ | `allowances.transportSubsidy` | 각종 수당의 종류 | 150,000 | 150,000원 | 본문 evidence 값 일치 (150,000원) |
| ✅ | `allowances.refreshBenefit` | <2025.10> 재충전 및 역량 강화 지원에 관한 사항 | 30,000 | 36만원 | 본문 evidence 값 일치 (36만원) |
| ✅ | `annualLeave.baseLeave` | 제36조 | 15 | - | 본문 expected 값 일치 (15) |
| ✅ | `annualLeave.maxLeave` | 제36조 | 25 | - | 본문 expected 값 일치 (25) |
| ✅ | `familyAllowance.spouse` | 각종 수당의 종류 | 40,000 | 40,000원 | 본문 evidence 값 일치 (40,000원) |
| ✅ | `familyAllowance.generalFamily` | 각종 수당의 종류 | 20,000 | 20,000원 | 본문 evidence 값 일치 (20,000원) |
| ✅ | `familyAllowance.child1` | 각종 수당의 종류 | 30,000 | 첫째 30,000원 | 본문 evidence 값 일치 (첫째 30,000원) |
| ✅ | `familyAllowance.child2` | 각종 수당의 종류 | 70,000 | 둘째 70,000원 | 본문 evidence 값 일치 (둘째 70,000원) |
| ✅ | `familyAllowance.child3Plus` | 각종 수당의 종류 | 110,000 | 110,000원 | 본문 evidence 값 일치 (110,000원) |
| ✅ | `familyAllowance.maxFamilyMembers` | 각종 수당의 종류 | 5 | 5인 이내 | 본문 evidence 값 일치 (5인 이내) |

## 해석

- **✅ 일치**: full_union 본문에서 해당 조항 발견 + expected 값 그대로 등장 → SoT 일치.
- **✅ evidence 일치**: `expected` 는 런타임 계산값, `evidence` 는 원문 표기값이다. 예: 계산값 1.5 ↔ 원문 150%, 월 30,000원 ↔ 원문 연 36만원.
- **🟡 불명확**: 조항 발견되었으나 expected/evidence 값이 본문에 직접 등장 안 함. 별첨 일람표에만 기재되었거나 article 참조가 넓을 가능성. **수동 확인 필요.**
- **❌ 미일치**: 조항 헤더 자체 검출 실패. 조항 번호 오타 / 별도합의 태그 형식 차이 / regulation 미반영. **즉시 수정 필요.**

## 후속

- 🟡 항목은 별첨 섹션 수동 확인 후 정상 처리 또는 calc-registry.json article 필드 정정.
- ❌ 항목은 regulation 본문에 해당 조항 추가 또는 article 필드 오기 정정.
- 단협 개정 시 본 스크립트를 재실행해 drift 자동 감지: `pnpm check:regulation`
