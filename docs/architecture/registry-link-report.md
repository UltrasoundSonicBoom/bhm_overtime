# Registry Link Report

> 자동 생성: `scripts/check-regulation-link.js`
> 생성 시각: 2026-04-27T05:28:18.104Z
> 입력: `data/calc-registry.json` (24 data_values) ↔ `data/full_union_regulation_2026.md`

## 요약

| 상태 | 개수 | 비율 |
|------|------|------|
| ✅ 일치 | 10 | 42% |
| 🟡 불명확 | 14 | 58% |
| ❌ 미일치 | 0 | 0% |
| **총** | **24** | — |

## 항목별 검증

| 상태 | path | article | expected | note |
|------|------|---------|----------|------|
| 🟡 | `allowances.overtimeRates.extended` | 제34조 | 1.5 | 조항 본문 발견되었으나 expected=1.5 미검출 (별첨 가능성 / 단위 불일치) |
| ✅ | `allowances.overtimeRates.night` | 제34조 | 2 | 본문 expected 값 일치 |
| ✅ | `allowances.overtimeRates.extendedNight` | 제34조 | 2 | 본문 expected 값 일치 |
| 🟡 | `allowances.overtimeRates.holiday` | 제34조 | 1.5 | 조항 본문 발견되었으나 expected=1.5 미검출 (별첨 가능성 / 단위 불일치) |
| ✅ | `allowances.overtimeRates.holidayOver8` | 제34조 | 2 | 본문 expected 값 일치 |
| ✅ | `allowances.overtimeRates.publicHoliday` | 제32조(6) | 0.5 | 본문 expected 값 일치 |
| 🟡 | `allowances.specialPay5` | <2025.10> | 35,000 | 조항 본문 발견되었으나 expected=35000 미검출 (별첨 가능성 / 단위 불일치) |
| 🟡 | `allowances.onCallStandby` | 제32조 온콜 부속합의 | 10,000 | 조항 본문 발견되었으나 expected=10000 미검출 (별첨 가능성 / 단위 불일치) |
| ✅ | `allowances.onCallTransport` | 제32조 온콜 부속합의 | 50,000 | 본문 expected 값 일치 |
| ✅ | `allowances.onCallCommuteHours` | 제32조 온콜 부속합의 | 2 | 본문 expected 값 일치 |
| 🟡 | `allowances.nightShiftBonus` | 제32조 야간 부속합의 | 10,000 | 조항 본문 발견되었으나 expected=10000 미검출 (별첨 가능성 / 단위 불일치) |
| ✅ | `recoveryDay.nurseCumulativeTrigger` | 제32조 (2)-1 | 15 | 본문 expected 값 일치 |
| ✅ | `recoveryDay.otherCumulativeTrigger` | 제32조 (2)-2 | 20 | 본문 expected 값 일치 |
| 🟡 | `allowances.mealSubsidy` | 제48조 | 150,000 | 조항 본문 발견되었으나 expected=150000 미검출 (별첨 가능성 / 단위 불일치) |
| 🟡 | `allowances.transportSubsidy` | 제48조 | 150,000 | 조항 본문 발견되었으나 expected=150000 미검출 (별첨 가능성 / 단위 불일치) |
| 🟡 | `allowances.refreshBenefit` | 제48조 | 30,000 | 조항 본문 발견되었으나 expected=30000 미검출 (별첨 가능성 / 단위 불일치) |
| ✅ | `annualLeave.baseLeave` | 제36조 | 15 | 본문 expected 값 일치 |
| ✅ | `annualLeave.maxLeave` | 제36조 | 25 | 본문 expected 값 일치 |
| 🟡 | `familyAllowance.spouse` | 제48조 | 40,000 | 조항 본문 발견되었으나 expected=40000 미검출 (별첨 가능성 / 단위 불일치) |
| 🟡 | `familyAllowance.generalFamily` | 제48조 | 20,000 | 조항 본문 발견되었으나 expected=20000 미검출 (별첨 가능성 / 단위 불일치) |
| 🟡 | `familyAllowance.child1` | 제48조 | 30,000 | 조항 본문 발견되었으나 expected=30000 미검출 (별첨 가능성 / 단위 불일치) |
| 🟡 | `familyAllowance.child2` | 제48조 | 70,000 | 조항 본문 발견되었으나 expected=70000 미검출 (별첨 가능성 / 단위 불일치) |
| 🟡 | `familyAllowance.child3Plus` | 제48조 | 110,000 | 조항 본문 발견되었으나 expected=110000 미검출 (별첨 가능성 / 단위 불일치) |
| 🟡 | `familyAllowance.maxFamilyMembers` | 제48조 | 5 | 조항 본문 발견되었으나 expected=5 미검출 (별첨 가능성 / 단위 불일치) |

## 해석

- **✅ 일치**: full_union 본문에서 해당 조항 발견 + expected 값 그대로 등장 → SoT 일치.
- **🟡 불명확**: 조항 발견되었으나 expected 값이 본문에 직접 등장 안 함. 별첨 일람표에만 기재되었거나 (예: 별첨 보수표), 단위 표기 차이 (예: "15만원" vs "150,000") 가능. **수동 확인 필요.**
- **❌ 미일치**: 조항 헤더 자체 검출 실패. 조항 번호 오타 / 별도합의 태그 형식 차이 / regulation 미반영. **즉시 수정 필요.**

## 후속

- 🟡 항목은 별첨 섹션 수동 확인 후 정상 처리 또는 calc-registry.json article 필드 정정.
- ❌ 항목은 regulation 본문에 해당 조항 추가 또는 article 필드 오기 정정.
- 단협 개정 시 본 스크립트를 재실행해 drift 자동 감지: `npm run check:regulation`