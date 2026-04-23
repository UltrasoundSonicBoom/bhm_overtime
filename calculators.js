// ============================================
// 병원 HR 종합 시스템 - 계산기 모듈
// ============================================

const CALC = {
    /**
     * 통상임금 계산
     * @param {string} jobType - 세분화 직종 또는 보수표 이름
     * @param {string} grade - 등급 코드
     * @param {number} year - 호봉 (1~8)
     * @param {object} extras - { hasMilitary, militaryMonths, hasSeniority, seniorityYears, longServiceYears, hasSpecialPay, specialPayAmount, adjustPay, upgradeAdjustPay, positionPay, workSupportPay, familyAllowance }
     * @returns {object} { monthlyWage, hourlyRate, breakdown }
     */
    // 직종 → 보수표 매핑 헬퍼
    resolvePayTable(jobType) {
        // jobTypes 매핑이 있으면 해당 보수표를, 없으면 직접 보수표 이름으로 간주
        const mapping = DATA.jobTypes[jobType];
        return mapping ? mapping.payTable : jobType;
    },

    /**
     * ruleSet 객체에서 특정 dot-path 값을 꺼낸다.
     * ruleSet이 없으면 undefined를 반환하여 호출자가 DATA fallback을 사용하게 한다.
     * @param {object|null} ruleSet - { category: { key: value } } 형식 (DB resolve 결과)
     * @param {string} category - 최상위 카테고리 (e.g. "wage_tables_2025")
     * @param {string} dotPath - 하위 경로 (e.g. "general_J_grade.J3.base_salary_by_year")
     */
    _getRuleValue(ruleSet, category, dotPath) {
        if (!ruleSet || !ruleSet[category]) return undefined;
        const parts = dotPath.split('.');
        let cur = ruleSet[category];
        for (const p of parts) {
            if (cur == null || typeof cur !== 'object') return undefined;
            cur = cur[p];
        }
        return cur;
    },

    calcOrdinaryWage(jobType, grade, year, extras = {}, ruleSet = null) {
        const payTableName = this.resolvePayTable(jobType);
        // ruleSet이 있으면 ruleSet에서 보수표 데이터를 우선 조회하고, 없으면 DATA fallback
        const table = DATA.payTables[payTableName];
        if (!table) return null;

        const yearIdx = Math.max(0, Math.min(7, year - 1));

        // ruleSet 주입: wage_tables_2025 카테고리에서 grade별 기본급 배열 조회
        // ruleSet 구조: { wage_tables_2025: { [payTableKey]: { [grade]: { base_salary_by_year: [...] } } } }
        const rsWageTable = this._getRuleValue(ruleSet, 'wage_tables_2025', payTableName);
        const rsGrade = rsWageTable ? rsWageTable[grade] : null;

        const annualBase = (rsGrade?.base_salary_by_year?.[yearIdx]) ?? table.basePay[grade]?.[yearIdx] ?? 0;
        const annualAbility = (rsGrade?.ability_pay) ?? table.abilityPay[grade] ?? 0;
        const annualBonus = (rsGrade?.bonus) ?? table.bonus[grade] ?? 0;
        const annualFamily = (rsGrade?.family_support) ?? table.familySupport[grade] ?? 0;

        const monthlyBase = Math.round(annualBase / 12);
        const monthlyAbility = Math.round(annualAbility / 12);
        const monthlyBonus = Math.round(annualBonus / 12);
        const monthlyFamilyPaid = Math.round(annualFamily / 11); // 가계지원비: 연간÷11개월 (병원 지급 기준)

        // 조정급 (통상임금 계산 순서상 먼저 설정)
        const adjustPay = extras.adjustPay || 0;

        // 근속가산기본급: (기준기본급 + 조정급/2) × 근속가산율 (제46조: 2016.02.29 이전 입사자 한정)
        let seniorityBasePay = 0;
        if (extras.hasSeniority && extras.seniorityYears) {
            const rate = DATA.seniorityRates.find(r => extras.seniorityYears >= r.min && extras.seniorityYears < r.max);
            seniorityBasePay = rate ? Math.floor((monthlyBase + adjustPay / 2) * rate.rate) : 0;
        }

        // ruleSet에서 고정수당 값 조회 (없으면 DATA fallback)
        const rsAllowances = this._getRuleValue(ruleSet, 'wage_structure_and_allowances', 'fixed_allowances') || {};

        // 군복무수당: 월할 계산 지원 (기본 24개월, 개인별 복무기간에 따라 조정)
        let militaryPay = 0;
        if (extras.hasMilitary) {
            const militaryMonths = extras.militaryMonths || 24;
            const militaryBase = rsAllowances.military_service?.amount ?? DATA.allowances.militaryService;
            militaryPay = Math.round(militaryBase * Math.floor(militaryMonths) / 24);
        }

        let longServicePay = 0;
        if (extras.longServiceYears) {
            const ls = DATA.longServicePay.find(l => extras.longServiceYears >= l.min && extras.longServiceYears < l.max);
            longServicePay = ls ? ls.amount : 0;
        }

        const specialPay = extras.specialPayAmount || 0;
        const upgradeAdjustPay = extras.upgradeAdjustPay || 0;
        const positionPay = extras.positionPay || 0;
        const workSupportPay = extras.workSupportPay || 0;
        // 가족수당은 통상임금 산정 제외 (보수규정 제44조 2항 미포함)

        const mealSubsidy = rsAllowances.meal_subsidy ?? DATA.allowances.mealSubsidy;
        const transportSubsidy = rsAllowances.transportation_subsidy ?? DATA.allowances.transportSubsidy;
        const trainingAllowance = rsAllowances.training_monthly ?? DATA.allowances.selfDevAllowance;
        const refreshBenefit = rsAllowances.refresh_support_yearly != null
            ? Math.round(rsAllowances.refresh_support_yearly / 12)
            : DATA.allowances.refreshBenefit;

        // 명절지원비 (연 4회): (기준기본급 + 조정급/2) × 50% (제48조: 설·추석·5월·7월)
        const holidayBonusPerTime = Math.round((monthlyBase + adjustPay / 2) * 0.5);
        const monthlyHolidayBonus = Math.round((holidayBonusPerTime * 4) / 12);

        const breakdown = {
            '기준기본급': monthlyBase,
            '근속가산기본급': seniorityBasePay,
            '군복무수당': militaryPay,
            '능력급': monthlyAbility,
            '상여금': monthlyBonus,
            '가계지원비': monthlyFamilyPaid,
            '조정급': adjustPay,
            '승급조정급': upgradeAdjustPay,
            '장기근속수당': longServicePay,
            '별정수당': specialPay,
            '직책급': positionPay,
            '업무보조비': workSupportPay,
            '급식보조비': mealSubsidy,
            '교통보조비': transportSubsidy,
            // ※ 가족수당은 통상임금에 포함되지 않음 (보수규정 제44조 2항)
            '명절지원비(월할)': monthlyHolidayBonus,
            '교육훈련비': trainingAllowance,      // 제43조 (구: 자기계발별정수당)
            '별정수당5': DATA.allowances.specialPay5,
            '리프레시지원비': refreshBenefit      // 별도합의 2024.11: 2026.01~통상임금 산입
        };

        const monthlyWage = Object.values(breakdown).reduce((a, b) => a + b, 0);
        const weeklyHours = extras.weeklyHours || DATA.allowances.weeklyHours;
        const hourlyRate = Math.round(monthlyWage / weeklyHours);

        return {
            monthlyWage, hourlyRate, breakdown,
            displayInfo: {
                holidayBonusPerTime,
                holidayBonusMonths: '설·추석·5월·7월'
            }
        };
    },

    /**
     * 시간외수당 계산
     * @param {number} hourlyRate - 시급
     * @param {number} extHours - 연장근무 시간
     * @param {number} nightHours - 야간근무 시간 (22:00~06:00)
     * @param {number} holidayHours - 휴일근무 시간
     * @param {boolean} isExtendedNight - 통상근무자가 연장→야간 여부
     * @returns {object}
     */
    calcOvertimePay(hourlyRate, extHours = 0, nightHours = 0, holidayHours = 0, isExtendedNight = false) {
        const rates = DATA.allowances.overtimeRates;

        // 15분 단위 절삭
        const roundTo15 = (h) => Math.floor(h * 4) / 4;
        extHours = roundTo15(extHours);
        nightHours = roundTo15(nightHours);
        holidayHours = roundTo15(holidayHours);

        const nightRate = isExtendedNight ? rates.extendedNight : rates.night;

        const extPay = Math.round(hourlyRate * rates.extended * extHours);
        const nightPay = Math.round(hourlyRate * nightRate * nightHours);

        // 휴일근무: 8시간 이내 150%, 8시간 초과 200% (제34조)
        const holidayBase = Math.min(holidayHours, 8);
        const holidayOver = Math.max(holidayHours - 8, 0);
        const holidayPay = Math.round(hourlyRate * rates.holiday * holidayBase)
                         + Math.round(hourlyRate * rates.holidayOver8 * holidayOver);

        const total = extPay + nightPay + holidayPay;

        return {
            연장근무수당: extPay,
            야간근무수당: nightPay,
            휴일근무수당: holidayPay,
            합계: total,
            detail: { extHours, nightHours, holidayHours, holidayBase, holidayOver, hourlyRate }
        };
    },

    /**
     * 온콜 수당 계산
     * @param {number} hourlyRate - 시급
     * @param {number} standbyDays - 대기 일수 (호출 안 됨)
     * @param {number} callOuts - 실제 출근 횟수
     * @param {number} workHours - 실 근무시간 (출근 당)
     * @param {boolean} includesNight - 야간 포함 여부
     * @returns {object}
     */
    calcOnCallPay(hourlyRate, standbyDays = 0, callOuts = 0, workHours = 0, includesNight = false) {
        const totalStandbyDays = standbyDays; // 온콜 출근 시 대기수당과는 중복되지 않으므로 출근 횟수는 대기일수에서 분리
        const standbyPay = totalStandbyDays * DATA.allowances.onCallStandby;
        const transportPay = callOuts * DATA.allowances.onCallTransport;

        // 실 근무시간 + 출퇴근 2시간
        const totalWorkHours = workHours + DATA.allowances.onCallCommuteHours;
        const rate = includesNight ? DATA.allowances.overtimeRates.extendedNight : DATA.allowances.overtimeRates.extended;
        const overtimePay = Math.round(hourlyRate * rate * totalWorkHours * callOuts);

        return {
            온콜대기수당: standbyPay,
            온콜교통비: transportPay,
            시간외근무수당: overtimePay,
            합계: standbyPay + transportPay + overtimePay,
            detail: { totalStandbyDays, callOuts, totalWorkHoursPerCall: totalWorkHours, hourlyRate, rate }
        };
    },

    /**
     * 연차 계산
     * @param {Date} hireDate - 입사일
     * @param {Date} calcDate - 기준일
     * @returns {object}
     */
    calcAnnualLeave(hireDate, calcDate = new Date()) {
        const diffMs = calcDate - hireDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        // BUG-04 수정: 윤년 보정 — 날짜 기반 정확한 연수 계산 (제36조)
        // Math.floor(diffDays/365) 대신 실제 연도 차이 기반 계산
        let diffYears = calcDate.getFullYear() - hireDate.getFullYear();
        const m = calcDate.getMonth() - hireDate.getMonth();
        if (m < 0 || (m === 0 && calcDate.getDate() < hireDate.getDate())) diffYears--;
        const diffMonths = Math.floor(diffDays / 30);

        let totalLeave = 0;
        let explanation = '';

        if (diffYears < 1) {
            totalLeave = Math.min(diffMonths, DATA.annualLeave.maxUnderOne);
            explanation = `입사 ${diffMonths}개월차: 월 1일씩 ${totalLeave}일`;
        } else {
            totalLeave = DATA.annualLeave.baseLeave;
            if (diffYears >= 3) {
                const extra = Math.floor((diffYears - 1) / 2);
                totalLeave = Math.min(totalLeave + extra, DATA.annualLeave.maxLeave);
            }
            explanation = `입사 ${diffYears}년차: ${totalLeave}일`;
        }

        return { totalLeave, diffYears, diffMonths, explanation };
    },

    /**
     * 장기근속수당 계산
     * @param {number} years - 근속연수
     * @returns {object}
     */
    calcLongServicePay(years) {
        const ls = DATA.longServicePay.find(l => years >= l.min && years < l.max);
        return {
            근속연수: years,
            월수당: ls ? ls.amount : 0,
            구간: ls ? `${ls.min}~${ls.max}년` : '해당없음'
        };
    },

    /**
     * 가족수당 계산
     * 첫 번째 가족 (= 배우자 등 주치) : 40,000원
     * 추가 가족 1인당 : 20,000원
     * 자녀 : 첫째 30,000원 / 둘째 70,000원 / 셋째이상 110,000원
     * 전체 가족 수 최대 5인
     * @param {number} numFamily - 전체 가족 수 (자녀 제외)
     * @param {number} numChildren - 자녀 수
     * @returns {object}
     */
    calcFamilyAllowance(numFamily = 0, numChildren = 0) {
        const fa = DATA.familyAllowance;
        let total = 0;
        const breakdown = {};

        // 가족 수당: 첫 번째 = 40,000원, 추가 1인당 20,000원, 최대 5인
        const cappedFamily = Math.min(numFamily, fa.maxFamilyMembers);
        if (cappedFamily >= 1) {
            breakdown['첫 번째 가족'] = fa.spouse; // 40,000
            total += fa.spouse;
        }
        if (cappedFamily >= 2) {
            const extra = cappedFamily - 1;
            breakdown[`추가 가족 ${extra}인`] = fa.generalFamily * extra; // 20,000 × n
            total += fa.generalFamily * extra;
        }

        // 자녀 수당: 1째 30,000 / 2째 20,000 / 3째이상 10,000
        for (let i = 1; i <= numChildren; i++) {
            let amt = 0;
            if (i === 1) amt = fa.child1;
            else if (i === 2) amt = fa.child2;
            else amt = fa.child3Plus;
            breakdown[`${i}째 자녀`] = amt;
            total += amt;
        }

        return { 월수당: total, breakdown };
    },

    /**
     * 퇴직금 시뮬레이터 (2015.6.30 이전 입사자)
     * @param {number} avgMonthlyPay - 월 평균임금
     * @param {number} years - 근속년수
     * @returns {object}
     */
    calcSeverancePay(avgMonthlyPay, years) {
        const sp = DATA.severancePay.find(s => years >= s.min);
        if (!sp) return { 퇴직금: 0, 적용계수: 0, note: '근속 1년 미만 해당없음' };

        const amount = Math.round(avgMonthlyPay * years * sp.rate);
        return {
            퇴직금: amount,
            적용계수: `${sp.rate * 100}%`,
            산식: `${avgMonthlyPay.toLocaleString()}원 × ${years}년 × ${sp.rate * 100}%`,
            note: `재직기간 ${sp.min}년 이상 기준 (2015.6.30 이전 입사자)`
        };
    },

    /**
     * 퇴직금 통합 계산 (2001.08.31 이전 입사자 누진배수 + 2015.06.30 이전 퇴직수당 포함)
     * 법정 퇴직금 공식: 1일 평균임금 × 30 × (총 근속일수 / 365)
     * @param {number} avgMonthlyPay - 월 평균임금 (= 1일 평균임금 × 30)
     * @param {number} totalYearsInt - 총 근속연수 (정수, 누진배수/퇴직수당 구간 판정용)
     * @param {string} hireDateStr - 입사일 문자열 (YYYY-MM-DD)
     * @returns {object}
     */
    calcSeveranceFullPay(avgMonthlyPay, totalYearsInt, hireDateStr) {
        const hireDate = hireDateStr ? new Date(hireDateStr) : null;

        // 정밀 근속연수 계산 (일 단위)
        let preciseYears = totalYearsInt;
        let totalDays = 0;
        if (hireDate && !isNaN(hireDate)) {
            const now = new Date();
            totalDays = Math.floor((now - hireDate) / (1000 * 60 * 60 * 24));
            preciseYears = totalDays / 365;
        }

        if (preciseYears < 1) return { 퇴직금: 0, note: '근속 1년 미만 해당없음' };

        const cutoff2001 = new Date('2001-08-31');
        const cutoff2015 = new Date('2015-06-30');

        // 기본 퇴직금: 월 평균임금 × (총 근속일수 / 365)
        let baseSeverance = Math.round(avgMonthlyPay * preciseYears);
        const yearsDisplay = totalDays > 0
            ? `${Math.floor(preciseYears)}년 ${Math.floor((preciseYears % 1) * 12)}개월`
            : `${totalYearsInt}년`;
        let method = `법정 퇴직금 (평균임금 × ${yearsDisplay})`;

        // 2001.08.31 이전 입사자: 누진배수 적용 (정수 연수로 구간 판정)
        if (hireDate && hireDate <= cutoff2001) {
            const row = DATA.severanceMultipliersPre2001.find(r => totalYearsInt >= r.min);
            if (row) {
                baseSeverance = Math.round(avgMonthlyPay * row.multiplier);
                method = `누진배수 적용 (×${row.multiplier}, 2001년 이전 입사자)`;
            }
        }

        // 2015.06.30 이전 입사자: 퇴직수당 가산 (정수 연수로 구간 판정, 정밀 연수로 금액 계산)
        let addon = 0;
        let addonNote = '해당없음';
        if (hireDate && hireDate <= cutoff2015) {
            const sp = DATA.severancePay.find(s => totalYearsInt >= s.min);
            if (sp) {
                addon = Math.round(avgMonthlyPay * preciseYears * sp.rate);
                addonNote = `퇴직수당 ${sp.rate * 100}% 가산 (2015년 이전 입사자)`;
            }
        }

        const total = baseSeverance + addon;
        return {
            퇴직금: total,
            기본퇴직금: baseSeverance,
            퇴직수당: addon,
            산정방법: method,
            퇴직수당비고: addonNote,
            근속기간: yearsDisplay,
            산식: addon > 0
                ? `기본 ${baseSeverance.toLocaleString()}원 + 수당 ${addon.toLocaleString()}원`
                : `${baseSeverance.toLocaleString()}원 (${method})`,
            note: `근속 ${yearsDisplay} 기준`
        };
    },

    /**
     * 노조협의 특별 호봉 보정값 계산
     * profile.unionStepAdjust 가 '' / null / undefined 일 때 자동 계산 값으로 사용.
     * @param {string} grade - 현재 직급 코드 ('J1', 'S1' 등)
     * @param {Date} [refDate] - 기준일 (기본: 오늘). 이 날짜 이전 이벤트만 포함.
     * @returns {number} 해당 직급에 적용된 누적 노조협의 호봉 합계
     */
    calcUnionStepAdjust(grade, refDate) {
        var ref = refDate || new Date();
        var total = 0;
        var events = (typeof DATA !== 'undefined' && DATA.unionStepEvents) ? DATA.unionStepEvents : [];
        events.forEach(function(e) {
            if (!e.grades || e.grades.indexOf(grade) === -1) return;
            var parts = (e.date || '').split('-');
            var eventDate = new Date(parseInt(parts[0]), parseInt(parts[1] || 1) - 1, 1);
            if (eventDate <= ref) total += (e.stepDelta || 0);
        });
        return total;
    },

    /**
     * 승진 시뮬레이터
     * @param {string} jobType
     * @param {string} currentGrade
     * @param {Date} hireDate
     * @returns {object}
     */
    calcPromotionDate(jobType, currentGrade, hireDate) {
        const table = DATA.payTables[this.resolvePayTable(jobType)];
        if (!table || !table.autoPromotion[currentGrade]) {
            return { message: '해당 등급에 대한 자동승격 정보가 없습니다.' };
        }

        const promo = table.autoPromotion[currentGrade];
        const promoDate = new Date(hireDate);
        promoDate.setFullYear(promoDate.getFullYear() + promo.years);

        const now = new Date();
        const remaining = Math.max(0, Math.ceil((promoDate - now) / (1000 * 60 * 60 * 24)));

        return {
            현재등급: currentGrade,
            다음등급: promo.next,
            소요연수: `${promo.years}년`,
            예상승격일: promoDate.toISOString().split('T')[0],
            남은일수: remaining,
            label: table.gradeLabels[currentGrade] + ' → ' + table.gradeLabels[promo.next]
        };
    },

    /**
     * 야간근무 가산금 및 리커버리 데이 계산 (교대근무자 전용)
     * @param {number} nightShiftCount - 당월 야간근무 횟수
     * @param {number} prevCumulative - 이전 누적 미지급 야간횟수 (profile.nightShiftsUnrewarded, 기본 0)
     * @returns {object} { 야간근무가산금, 횟수, 리커버리데이, 누적리커버리데이(잔여), 초과경고 }
     */
    calcNightShiftBonus(nightShiftCount, prevCumulative = 0) {
        const bonus = nightShiftCount * DATA.allowances.nightShiftBonus;
        const rd = DATA.recoveryDay;

        let recoveryDaysEarned = 0;
        let newCumulative = prevCumulative + nightShiftCount;

        // 당월 7일 이상: 즉시 1일 부여, 누적에서 7일 차감
        if (nightShiftCount >= rd.monthlyTrigger) {
            recoveryDaysEarned += 1;
            newCumulative -= rd.monthlyTrigger;
        }

        // 누적 15일 도달 시 1일 추가 부여
        if (newCumulative >= rd.nurseCumulativeTrigger) {
            recoveryDaysEarned += 1;
            newCumulative -= rd.nurseCumulativeTrigger;
        }

        return {
            야간근무가산금: bonus,
            횟수: nightShiftCount,
            리커버리데이: recoveryDaysEarned,
            누적리커버리데이: newCumulative,  // 이월 잔여 누적 횟수
            초과경고: nightShiftCount > 9 ? '⚠️ 월 9일 초과! 시간외수당 처리 필요' : ''
        };
    },

    /**
     * 육아휴직 급여 시뮬레이션
     * @param {number} monthlyWage - 월 통상임금
     * @param {number} months - 휴직 개월수
     * @returns {object}
     */
    calcParentalLeavePay(monthlyWage, months) {
        const result = [];
        let total = 0;

        for (let i = 1; i <= months; i++) {
            let pay = 0;
            let cap = 0;
            let explanation = '';

            if (i <= 3) {
                pay = monthlyWage;
                cap = 2500000;
                explanation = `${i}개월차: 통상임금 100% (상한 250만원)`;
            } else if (i <= 6) {
                pay = monthlyWage;
                cap = 2000000;
                explanation = `${i}개월차: 통상임금 100% (상한 200만원)`;
            } else if (i <= 12) {
                pay = Math.round(monthlyWage * 0.8);
                cap = 1600000;
                explanation = `${i}개월차: 통상임금 80% (상한 160만원)`;
            } else {
                pay = 0;
                explanation = `${i}개월차: 법정 기간 초과 (무급)`;
            }

            const actualPay = Math.min(pay, cap);
            result.push({ month: i, pay: actualPay, explanation });
            total += actualPay;
        }

        return { monthly: result, total, months };
    },

    /**
     * 평균임금 자동 계산 (퇴직금 산정 기준)
     * 공식: (퇴직 전 3개월 통상임금 + 시간외/온콜 수당 합계) / 해당 기간 역일수
     * @param {number} monthlyWage - 월 통상임금
     * @param {number} [monthsBack=3] - 소급 개월 수
     * @returns {object} { dailyAvgWage, monthlyAvgWage, totalOtPay, totalCalendarDays, breakdown }
     */
    calcAverageWage(monthlyWage, monthsBack = 3) {
        const now = new Date();
        let totalOtPay = 0;
        let totalCalendarDays = 0;
        const breakdown = [];

        for (let i = 1; i <= monthsBack; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const daysInMonth = new Date(y, m, 0).getDate();

            const stats = OVERTIME.calcMonthlyStats(y, m);
            const suppPay = stats.payslipSupplement ? stats.payslipSupplement.pay : 0;
            const otPay = (stats.totalPay || 0) + suppPay;
            totalOtPay += otPay;
            totalCalendarDays += daysInMonth;

            breakdown.push({
                label: `${y}-${String(m).padStart(2, '0')}`,
                daysInMonth,
                monthlyWage,
                otPay
            });
        }

        const totalWage = monthlyWage * monthsBack + totalOtPay;
        const dailyAvgWage = Math.round(totalWage / totalCalendarDays);
        const monthlyAvgWage = dailyAvgWage * 30;

        return {
            dailyAvgWage,
            monthlyAvgWage,
            totalOtPay,
            totalCalendarDays,
            monthsBack,
            breakdown
        };
    },

    // ── 유틸리티 ──
    formatNumber(n) {
        return n.toLocaleString('ko-KR');
    },

    formatCurrency(n) {
        return n.toLocaleString('ko-KR') + '원';
    },

    /**
     * 급여 시뮬레이터
     * @param {object} params - 급여 계산 파라미터
     * @returns {object} { 지급내역, 공제내역, 급여총액, 공제총액, 실지급액 }
     */
    calcPayrollSimulation(params) {
        const {
            jobType, grade, year, adjustPay = 0, upgradeAdjustPay = 0,
            hasMilitary = false, militaryMonths = 24,
            hasSeniority = false, seniorityYears = 0,
            longServiceYears = 0,
            numFamily = 0, numChildren = 0, childrenUnder6Pay = 0,
            specialPay = 0, positionPay = 0, workSupportPay = 0,
            workDays = 22, isHolidayMonth = false, isFamilySupportMonth = true,
            overtimeHours = 0, nightHours = 0, holidayWorkHours = 0,
            nightShiftCount = 0, isExtendedNight = false
        } = params;

        // 1. 가족수당 계산
        const familyResult = this.calcFamilyAllowance(numFamily, numChildren);
        const familyAllowance = familyResult.월수당;

        // 2. 통상임금 계산 (가족수당 제외 — 보수규정 제44조 2항 미포함)
        const wage = this.calcOrdinaryWage(jobType, grade, year, {
            hasMilitary, militaryMonths,
            hasSeniority, seniorityYears,
            longServiceYears,
            specialPayAmount: specialPay,
            adjustPay, upgradeAdjustPay,
            positionPay, workSupportPay
            // familyAllowance: 통상임금 산정에서 제외
        });

        if (!wage) return null;

        // 3. 지급내역 구성
        const table = DATA.payTables[this.resolvePayTable(jobType)];
        const yearIdx = Math.max(0, Math.min(7, year - 1));
        const annualFamily = table.familySupport[grade] || 0;
        const monthlyFamilyPaid = Math.round(annualFamily / 11);

        const 지급내역 = {
            '기준기본급': wage.breakdown['기준기본급'],
            '근속가산기본급': wage.breakdown['근속가산기본급'],
            '능력급': wage.breakdown['능력급'],
            '상여금': wage.breakdown['상여금'],
            '조정급': adjustPay,
            '승급조정급': upgradeAdjustPay,
            '군복무수당': wage.breakdown['군복무수당'],
            '급식보조비': DATA.allowances.mealSubsidy,
            '교통보조비': DATA.allowances.transportSubsidy,
            '장기근속수당': wage.breakdown['장기근속수당'],
            '별정수당': specialPay,
            '직책급': positionPay,
            '업무보조비': workSupportPay
        };
        // 가족수당은 통상임금에 포함되지 않는 별도 지급 항목 (명세서 항목명과 일치시킴)
        if (familyAllowance > 0) 지급내역['가족수당'] = familyAllowance;
        if (childrenUnder6Pay > 0) 지급내역['6세이하자녀수당'] = childrenUnder6Pay;

        // 가계지원비: 11개월 지급 (3,4,5,6,7,8,10,11,12 + 설/추석월)
        if (isFamilySupportMonth) {
            지급내역['가계지원비'] = monthlyFamilyPaid;
        }

        // 명절지원비: 설·추석·5월·7월
        if (isHolidayMonth) {
            지급내역['명절지원비'] = wage.displayInfo.holidayBonusPerTime;
        }

        // 시간외수당
        if (overtimeHours > 0 || nightHours > 0 || holidayWorkHours > 0) {
            const ot = this.calcOvertimePay(wage.hourlyRate, overtimeHours, nightHours, holidayWorkHours, isExtendedNight);
            if (ot.연장근무수당 > 0) 지급내역['시간외수당'] = ot.연장근무수당;
            if (ot.야간근무수당 > 0) 지급내역['야간수당'] = ot.야간근무수당;
            if (ot.휴일근무수당 > 0) 지급내역['휴일수당'] = ot.휴일근무수당;
        }

        // 야간근무가산금
        if (nightShiftCount > 0) {
            const nb = this.calcNightShiftBonus(nightShiftCount);
            지급내역['야간근무가산금'] = nb.야간근무가산금;
        }

        const 급여총액 = Object.values(지급내역).reduce((a, b) => a + b, 0);

        // 4. 공제내역 (4대보험 + 세금)
        const deductions = DATA.deductions || {};
        const healthIns = Math.round(급여총액 * (deductions.nationalHealth || 0.03545));
        const longTermCare = Math.round(healthIns * (deductions.longTermCare || 0.1295));
        const pension = Math.round(급여총액 * (deductions.nationalPension || 0.045));
        const employment = Math.round(급여총액 * (deductions.employmentInsurance || 0.009));
        const mealDeduction = workDays * (deductions.mealDeduction || 3000);

        const 공제내역 = {
            '국민건강보험': healthIns,
            '장기요양보험': longTermCare,
            '국민연금': pension,
            '고용보험': employment,
            '식대공제': mealDeduction
        };

        // 소득세 (간이세액표 기반 근사)
        const taxableIncome = 급여총액 - pension - healthIns - longTermCare - employment;
        let incomeTax = 0;
        if (taxableIncome > 10000000) incomeTax = Math.round(taxableIncome * 0.15);
        else if (taxableIncome > 5000000) incomeTax = Math.round(taxableIncome * 0.10);
        else if (taxableIncome > 3000000) incomeTax = Math.round(taxableIncome * 0.06);
        else incomeTax = Math.round(taxableIncome * 0.03);

        공제내역['소득세(근사)'] = incomeTax;
        공제내역['주민세(근사)'] = Math.round(incomeTax * 0.1);

        const 공제총액 = Object.values(공제내역).reduce((a, b) => a + b, 0);
        const 실지급액 = 급여총액 - 공제총액;

        return {
            통상임금: wage.monthlyWage,
            시급: wage.hourlyRate,
            지급내역,
            공제내역,
            급여총액,
            공제총액,
            실지급액,
            가족수당상세: familyResult.breakdown,
            통상임금상세: wage.breakdown
        };
    },

    /**
     * 명세서 파싱값 vs CALC 계산값 역계산 검증
     * @param {object} parsedData  - { items:[{name,amount}], totalGross }
     * @param {object} calcResult  - { items:[{name,amount}], totalGross }
     * @param {object} options     - { tolerance:0.01, absThreshold:500 }
     * @returns {{ matched:boolean, discrepancies:[{item,expected,actual,diffPct}] }}
     */
    verifyPayslip(parsedData, calcResult, options) {
        const tolerance = (options && options.tolerance) !== undefined ? options.tolerance : 0.01;
        const absThreshold = (options && options.absThreshold) !== undefined ? options.absThreshold : 500;
        const discrepancies = [];

        // 항목별 비교
        const parsedItems = (parsedData && parsedData.items) || [];
        const calcItems = (calcResult && calcResult.items) || [];

        for (const parsedItem of parsedItems) {
            const calcItem = calcItems.find(c => c.name === parsedItem.name);
            if (!calcItem) {
                discrepancies.push({
                    item: parsedItem.name,
                    expected: null,
                    actual: parsedItem.amount,
                    diffPct: 1
                });
                continue;
            }
            const diff = Math.abs(parsedItem.amount - calcItem.amount);
            const diffPct = calcItem.amount > 0 ? diff / calcItem.amount : (diff > 0 ? 1 : 0);
            if (diffPct > tolerance && diff > absThreshold) {
                discrepancies.push({
                    item: parsedItem.name,
                    expected: calcItem.amount,
                    actual: parsedItem.amount,
                    diffPct
                });
            }
        }

        // 총액 비교
        const parsedGross = parsedData && parsedData.totalGross;
        const calcGross = calcResult && calcResult.totalGross;
        if (parsedGross !== undefined && calcGross !== undefined) {
            const diff = Math.abs(parsedGross - calcGross);
            const diffPct = calcGross > 0 ? diff / calcGross : (diff > 0 ? 1 : 0);
            if (diffPct > tolerance && diff > absThreshold) {
                discrepancies.push({
                    item: '총액(totalGross)',
                    expected: calcGross,
                    actual: parsedGross,
                    diffPct
                });
            }
        }

        return { matched: discrepancies.length === 0, discrepancies };
    },

    /**
     * 간호사 전용 수당 계산
     * @param {object} profile - { preceptorWeeks, primeTeamDays }
     *   preceptorWeeks: 프리셉터 담당 주수 (2주 단위로 200,000원)
     *   primeTeamDays:  프라임팀(예비인력) 대체근무 일수 (20,000원/일)
     * @returns {{ preceptorPay, primeTeamPay, total }}
     * 근거: 제63조의2 (프리셉터), 제32조 부속합의 (프라임팀)
     */
    calcNursePay({ preceptorWeeks = 0, primeTeamDays = 0 } = {}) {
        const PRECEPTOR_PER_2WEEKS = 200000; // 제63조의2
        const PRIME_TEAM_DAILY = 20000;      // 제32조 부속합의
        const preceptorPay = Math.floor(preceptorWeeks / 2) * PRECEPTOR_PER_2WEEKS;
        const primeTeamPay = primeTeamDays * PRIME_TEAM_DAILY;
        return { preceptorPay, primeTeamPay, total: preceptorPay + primeTeamPay };
    },

    /**
     * 간호사 스케줄 규정 준수 검사
     * @param {object} schedule - { nightShifts, age, pattern:string[] }
     *   nightShifts: 월간 야간근무 횟수
     *   age:         간호사 나이
     *   pattern:     근무 패턴 배열 (예: ['N','OFF','D'])
     * @returns {{ recoveryDays, warnings:[{type, message}] }}
     * 근거: 제32조 부속합의 (리커버리데이), 제32조 (40세 야간 제외)
     */
    checkNurseScheduleRules({ nightShifts = 0, age = 0, pattern = [] } = {}) {
        const warnings = [];

        // 리커버리데이: 야간 7회 초과 시 초과분만큼 발생 (제32조 부속합의)
        const recoveryDays = nightShifts > 7 ? nightShifts - 7 : 0;

        // 40세 이상 야간근무 제외 원칙 (제32조 부속합의 — 간호부 교대근무자)
        if (age >= 40 && nightShifts > 0) {
            warnings.push({
                type: 'age_night_exclusion',
                message: '40세 이상 야간근무 제외 원칙 적용 대상 (제32조 부속합의)'
            });
        }

        // N-OFF-D 금지 패턴 탐지 (야간 직후 비번 없이 주간 출근 금지)
        const patternStr = pattern.join('-');
        if (/N-OFF-D/.test(patternStr)) {
            warnings.push({
                type: 'forbidden_pattern',
                message: 'N-OFF-D 금지 패턴: 야간 후 비번 없이 주간 출근 불가'
            });
        }

        return { recoveryDays, warnings };
    }
};

// Node (Vitest) 환경에서 require 가능하도록 CommonJS export.
// 브라우저는 global const CALC만 사용 (변경 없음).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CALC };
}
