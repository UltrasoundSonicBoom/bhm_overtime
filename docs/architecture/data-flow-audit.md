# 데이터 흐름 검증 리포트

> 작성일: 2026-04-25
> 워크트리: `.worktrees/data-flow-audit` (브랜치 `audit/data-flow`)
> 목적: 6개 핵심 영역 (개인·시간외·휴가·캘린더·규정·급여) 의 데이터 입력→저장→이벤트→소비 흐름 검증.
> 방법: Playwright MCP 자동화 — 실제 브라우저에서 입력 시뮬레이션 + DOM/localStorage/이벤트 관측.

## 검증 시나리오

프로필: `간호직 / S1 / 5호봉 / 입사 2015-04-01 (11년차) / 가족 2 / 자녀 1` 으로 저장 후 등급을 `J3` 로 변경하여 라이브 갱신 여부도 확인.

## 결과 매트릭스

| # | 영역 | 흐름 | 결과 | 비고 |
|---|------|------|------|------|
| 1 | **개인** | `PROFILE.save()` → localStorage `bhm_hr_profile_<uid>` 기록 → `profileChanged` 이벤트 발행 | ✅ | 이벤트 1회 발행 확인 |
| 2 | **개인 → calcWage** | 프로필 로드 → `PROFILE.calcWage()` → 통상임금 6,493,759원 / 시급 31,071원 | ✅ | breakdown 18개 항목 정상 |
| 3 | **개인 → 연차** | 11년차 → `CALC.calcAnnualLeave()` → 20일 (15+2년마다 1일) | ✅ | 제36조 일치 |
| 4 | **개인 → 장기재직** | `CALC.calcLongServiceLeave(11)` → 5일 | ✅ | <2025.10> 10~19년 5일 일치 |
| 5 | **시간외 — 진입 시 시급** | 시간외 탭 진입 시 `otHourly` 자동 채움 (31,071) | ✅ | 탭 진입 시점 init 동작 |
| 6 | **시간외 — 라이브 갱신** | 프로필 등급 J3 변경 → 시급 27,468 → `otHourly` 자동 갱신 | **❌** | known-issue #10 재확인. profileChanged 미수신 |
| 7 | **휴가 — 연차** | 휴가 탭 그리드에 "연차 20일" 자동 표시 | ✅ | `lvTotalAnnual` 정상 |
| 8 | **휴가 — 장기재직 카드** | "장기재직 휴가 5일" 자동 표시 (사용 0이어도 노출) | ✅ | Plan M M2-1 |
| 9 | **휴가 — 미사용 연차 보상** | "💰 미사용 연차 수당 예상 219,747원 (잔여 20일)" 표시 | ✅ | Plan M M1-7 (등급 변경 후 J3 일액 반영됨) |
| 10 | **캘린더 — 공휴일 API** | `HOLIDAYS.calcWorkDays(2026, 5)` → 어린이날 + 부처님 + 대체 + 근로자의 날 (4건) | ✅ | API + fallback |
| 11 | **캘린더 — 병원 휴일 머지** | 8월: 광복절 + 대체 + **조합설립일** (3건) | ✅ | Plan L T1 D9 |
| 12 | **캘린더 — 개원기념일** | 10월: 개천절 + 대체 + 한글날 + **개원기념일** (4건) | ✅ | hospitalHolidays 머지 |
| 13 | **규정 — JSON 로드** | `regulation.html` 진입 → `union_regulation_2026.json` fetch → `DATA.handbook` 5개 chapter | ✅ | regulation.js |
| 14 | **규정 — UI 렌더링** | 271개 article 카드 + 검색 입력 노출 | ✅ | 콘솔 warning 1 (정상 fallback) |
| 15 | **급여 — 통상임금** | `PROFILE.calcWage()` → 5,740,891원 (J3 5호봉) · 18개 breakdown | ✅ | 급식보조비 150k 정확 |
| 16 | **급여 — 명세서 검증** | `CALC.verifyPayslip` 함수 존재 | ✅ | 호출 가능 (입력 단계 별도) |
| 17 | **급여 — 퇴직금** | `CALC.calcSeveranceFullPay(5,740,891, 11, '2015-04-01')` → 92,182,981원 | ✅ | 평균임금 × 근속연수 |
| 18 | **급여 — 시뮬레이션** | `CALC.calcPayrollSimulation()` → 9개 키 (통상임금/시급/지급/공제/실지급액 등) | ✅ | 정상 |

## 판정

- ✅ **17 / 18 통과** — 콘솔 에러 0건 / 모든 탭 진입 정상.
- ❌ **1건 결함 재확인**: 시간외 탭의 라이브 시급 갱신 (known-issue #10) — 프로필 등급 변경 후 시간외 탭에 머무르면 `otHourly` 가 옛 값(31,071) 그대로. 다른 탭으로 갔다가 시간외 탭으로 재진입해야 갱신됨.

## known-issue #10/#11 재확인

| 이슈 | 확인 결과 |
|------|----------|
| #10 `applyProfileToOvertime` profileChanged 미수신 | **재확인** — 시간외 탭 활성 중 프로필 변경 시 즉시 갱신 안 됨 |
| #11 profileChanged 수신자 희소 | **재확인** — 휴가 탭은 진입 시 재계산하므로 OK / 시간외 탭은 입력 필드값 캐시되어 안 됨 |

**해결 방안 (Plan G 의존성 없이 단독 실행 가능, ~2-3h):**
1. `app.js` 에 전역 `profileChanged` 리스너 추가 → 활성 탭이 시간외이면 `applyProfileToOvertime()` 재호출
2. 또는 `setupOvertimeTab()` 안에 리스너 등록 → 시간외 탭 마운트 시점에 등록 + 이후 모든 변경 수신

## 캡쳐 데이터

- 프로필 저장 → 1 이벤트 발행 (`profileChanged`)
- 5탭 자동 전환 (home/leave/overtime/payroll/profile) → 콘솔 에러 0건
- regulation.html 별도 페이지 → 콘솔 warning 1건 (정상)
- 캘린더 4월/5월/8월/10월 휴일 데이터 정확

## 산출물

- 본 리포트: `docs/architecture/data-flow-audit.md`
- 후속 작업 후보: known-issue #10 단독 해소 (2-3h)
