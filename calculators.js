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

    calcOrdinaryWage(jobType, grade, year, extras = {}) {
        const payTableName = this.resolvePayTable(jobType);
        const table = DATA.payTables[payTableName];
        if (!table) return null;

        const yearIdx = Math.max(0, Math.min(7, year - 1));
        const annualBase = table.basePay[grade]?.[yearIdx] || 0;
        const annualAbility = table.abilityPay[grade] || 0;
        const annualBonus = table.bonus[grade] || 0;
        const annualFamily = table.familySupport[grade] || 0;

        const monthlyBase = Math.round(annualBase / 12);
        const monthlyAbility = Math.round(annualAbility / 12);
        const monthlyBonus = Math.round(annualBonus / 12);
        const monthlyFamilyPaid = Math.round(annualFamily / 11); // 실지급: 11개월 균등분배
        const monthlyFamilyOrdinary = Math.round(annualFamily / 12); // 통상임금 산입: 연÷12

        // 조정급 (통상임금 계산 순서상 먼저 설정)
        const adjustPay = extras.adjustPay || 0;

        // 근속가산기본급: (기준기본급 + 조정급/2) × 근속가산율
        let seniorityBasePay = 0;
        if (extras.hasSeniority && extras.seniorityYears) {
            const rate = DATA.seniorityRates.find(r => extras.seniorityYears >= r.min && extras.seniorityYears < r.max);
            seniorityBasePay = rate ? Math.round((monthlyBase + adjustPay / 2) * rate.rate) : 0;
        }

        // 군복무수당: 월할 계산 지원 (기본 24개월, 개인별 복무기간에 따라 조정)
        let militaryPay = 0;
        if (extras.hasMilitary) {
            const militaryMonths = extras.militaryMonths || 24;
            militaryPay = Math.round(DATA.allowances.militaryService * Math.floor(militaryMonths) / 24);
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
        const familyAllowance = extras.familyAllowance || 0;

        // 명절지원비 (연 4회): (기준기본급 + 근속가산기본급 + 조정급/2) × 50%
        const holidayBonusPerTime = Math.round((monthlyBase + seniorityBasePay + adjustPay / 2) * 0.5);
        const monthlyHolidayBonus = Math.round((holidayBonusPerTime * 4) / 12);

        const breakdown = {
            '기준기본급': monthlyBase,
            '근속가산기본급': seniorityBasePay,
            '군복무수당': militaryPay,
            '능력급': monthlyAbility,
            '상여금': monthlyBonus,
            '가계지원비(통상)': monthlyFamilyOrdinary,
            '조정급': adjustPay,
            '승급조정급': upgradeAdjustPay,
            '장기근속수당': longServicePay,
            '별정수당': specialPay,
            '직책급': positionPay,
            '업무보조비': workSupportPay,
            '급식보조비': DATA.allowances.mealSubsidy,
            '교통보조비': DATA.allowances.transportSubsidy,
            '가족수당': familyAllowance,
            '명절지원비(월할)': monthlyHolidayBonus,
            '자기계발별정수당': DATA.allowances.selfDevAllowance,
            '별정수당5': DATA.allowances.specialPay5
            // '리프레시지원비': DATA.allowances.refreshBenefit // 병원 급여명세서 실물 대조 결과 통상임금에서 제외된 것으로 확인됨
        };

        const monthlyWage = Object.values(breakdown).reduce((a, b) => a + b, 0);
        const hourlyRate = Math.round(monthlyWage / DATA.allowances.weeklyHours);

        // 실지급 참고용 (가계지원비 11개월 지급분)
        const monthlyFamilyDisplay = monthlyFamilyPaid;
        // 명절지원비 실지급 (해당 월에만 지급)
        const holidayBonusActual = holidayBonusPerTime;

        return {
            monthlyWage, hourlyRate, breakdown,
            displayInfo: {
                monthlyFamilyPaid: monthlyFamilyDisplay,
                monthlyFamilyOrdinary,
                holidayBonusPerTime: holidayBonusActual,
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
        const holidayPay = Math.round(hourlyRate * rates.holiday * holidayHours);
        const total = extPay + nightPay + holidayPay;

        return {
            연장근무수당: extPay,
            야간근무수당: nightPay,
            휴일근무수당: holidayPay,
            합계: total,
            detail: { extHours, nightHours, holidayHours, hourlyRate }
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
        const diffYears = Math.floor(diffDays / 365);
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
     * @param {boolean} hasSpouse
     * @param {number} numChildren
     * @param {number} otherFamily
     * @returns {object}
     */
    calcFamilyAllowance(hasSpouse = false, numChildren = 0, otherFamily = 0) {
        const fa = DATA.familyAllowance;
        let total = 0;
        const breakdown = {};

        if (hasSpouse) {
            breakdown['배우자'] = fa.spouse;
            total += fa.spouse;
        }

        let childTotal = 0;
        for (let i = 1; i <= numChildren; i++) {
            let amt = 0;
            if (i === 1) amt = fa.child1;
            else if (i === 2) amt = fa.child2;
            else amt = fa.child3Plus;
            childTotal += amt;
            breakdown[`${i}째 자녀`] = amt;
        }
        total += childTotal;

        const maxOther = Math.max(0, fa.maxFamilyMembers - (hasSpouse ? 1 : 0) - numChildren);
        const actualOther = Math.min(otherFamily, maxOther);
        if (actualOther > 0) {
            breakdown['기타 가족'] = fa.generalFamily * actualOther;
            total += fa.generalFamily * actualOther;
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
     * 야간근무 가산금 계산 (교대근무자 전용)
     * @param {number} nightShiftCount - 야간근무 횟수
     * @returns {object}
     */
    calcNightShiftBonus(nightShiftCount) {
        const bonus = nightShiftCount * DATA.allowances.nightShiftBonus;
        const recoveryDays = nightShiftCount >= 7 ? 1 : 0;
        const accRecovery = Math.floor(nightShiftCount / 15);

        return {
            야간근무가산금: bonus,
            횟수: nightShiftCount,
            리커버리데이: recoveryDays,
            누적리커버리데이: accRecovery,
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

            if (i <= 6) {
                pay = monthlyWage;
                cap = 2500000;
                explanation = `${i}개월차: 통상임금 100% (상한 250만원)`;
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
            hasSpouse = false, numChildren = 0, otherFamily = 0,
            specialPay = 0, positionPay = 0, workSupportPay = 0,
            workDays = 22, isHolidayMonth = false, isFamilySupportMonth = true,
            overtimeHours = 0, nightHours = 0, holidayWorkHours = 0,
            nightShiftCount = 0, isExtendedNight = false
        } = params;

        // 1. 가족수당 계산
        const familyResult = this.calcFamilyAllowance(hasSpouse, numChildren, otherFamily);
        const familyAllowance = familyResult.월수당;

        // 2. 통상임금 계산
        const wage = this.calcOrdinaryWage(jobType, grade, year, {
            hasMilitary, militaryMonths,
            hasSeniority, seniorityYears,
            longServiceYears,
            specialPayAmount: specialPay,
            adjustPay, upgradeAdjustPay,
            positionPay, workSupportPay,
            familyAllowance
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
            '가족수당': familyAllowance,
            '별정수당': specialPay,
            '직책급': positionPay,
            '업무보조비': workSupportPay
        };

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
    }
};
