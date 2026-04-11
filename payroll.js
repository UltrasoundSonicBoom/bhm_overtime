// ============================================
// 병원 HR 종합 시스템 - 급여 계산 모듈
// ============================================

const PAYROLL = {
  // ── 카테고리 정의 ──
  categories: [
    { id: 'overtime', label: '시간외·수당', icon: '⏰' },
    { id: 'deduction', label: '공제·보험', icon: '📋' },
    { id: 'leave', label: '휴가·휴직', icon: '📅' },
    { id: 'career', label: '승진·근속', icon: '📈' },
    { id: 'welfare', label: '복지·감면', icon: '🎁' },
  ],

  cards: [
    // ═══════════ 시간외·수당 ═══════════

    // ── 시간외근무 종합 계산기 ──
    {
      id: 'overtimeCalc', category: 'overtime',
      icon: '⏰', title: '시간외근무 수당 계산',
      desc: '연장·야간·휴일 통합 계산',
      hasInput: true,
      calc(profile, wage, inputs) {
        const ext = inputs.extHours || 0;
        const ngt = inputs.nightHours || 0;
        const hol = inputs.holHours || 0;
        const holNgt = inputs.holNightHours || 0;
        const rate = wage.hourlyRate;
        const rates = DATA.allowances.overtimeRates;

        const extPay = Math.round(rate * rates.extended * ext);
        const ngtPay = Math.round(rate * rates.night * ngt);
        const holBase = Math.min(hol, 8);
        const holOver = Math.max(hol - 8, 0);
        const holPay = Math.round(rate * rates.holiday * holBase)
                     + Math.round(rate * rates.holidayOver8 * holOver);
        const holNgtPay = Math.round(rate * rates.holidayNight * holNgt);
        const total = extPay + ngtPay + holPay + holNgtPay;

        const details = [
          { key: '통상시급 (월급÷209h)', val: CALC.formatCurrency(rate) },
        ];
        if (ext > 0) details.push({ key: '연장 ' + ext + 'h \u00d7 ' + CALC.formatNumber(rate) + ' \u00d7 150%', val: CALC.formatCurrency(extPay) });
        if (ngt > 0) details.push({ key: '야간 ' + ngt + 'h \u00d7 ' + CALC.formatNumber(rate) + ' \u00d7 200%', val: CALC.formatCurrency(ngtPay) });
        if (hol > 0) {
          if (holOver > 0) {
            details.push({ key: '휴일 ' + holBase + 'h \u00d7 150% + ' + holOver + 'h \u00d7 200%', val: CALC.formatCurrency(holPay) });
          } else {
            details.push({ key: '휴일 ' + hol + 'h \u00d7 ' + CALC.formatNumber(rate) + ' \u00d7 150%', val: CALC.formatCurrency(holPay) });
          }
        }
        if (holNgt > 0) details.push({ key: '휴일야간 ' + holNgt + 'h \u00d7 ' + CALC.formatNumber(rate) + ' \u00d7 200%', val: CALC.formatCurrency(holNgtPay) });
        details.push({ key: '합계', val: CALC.formatCurrency(total) });
        details.push({ key: '산정 기준', val: '취업규칙 제34조, 제47조 / 15분 단위 절삭' });

        return { value: CALC.formatCurrency(total), label: '시간외근무 수당 합계', details };
      },
      renderInput() {
        return '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px;">'
          + '<div class="form-group"><label>연장근무 (h)</label>'
          + '<input type="number" id="qaExtHours" value="1" min="0" max="100" step="0.25" onchange="PAYROLL.recalc(\'overtimeCalc\')"></div>'
          + '<div class="form-group"><label>야간근무 (h)</label>'
          + '<input type="number" id="qaNightHours" value="0" min="0" max="100" step="0.25" onchange="PAYROLL.recalc(\'overtimeCalc\')"></div>'
          + '<div class="form-group"><label>휴일근무 (h)</label>'
          + '<input type="number" id="qaHolHours" value="0" min="0" max="24" step="0.25" onchange="PAYROLL.recalc(\'overtimeCalc\')"></div>'
          + '<div class="form-group"><label>휴일야간 (h)</label>'
          + '<input type="number" id="qaHolNightHours" value="0" min="0" max="24" step="0.25" onchange="PAYROLL.recalc(\'overtimeCalc\')"></div>'
          + '</div>';
      },
      getInputs() {
        return {
          extHours: parseFloat(document.getElementById('qaExtHours')?.value) || 0,
          nightHours: parseFloat(document.getElementById('qaNightHours')?.value) || 0,
          holHours: parseFloat(document.getElementById('qaHolHours')?.value) || 0,
          holNightHours: parseFloat(document.getElementById('qaHolNightHours')?.value) || 0
        };
      }
    },

    // ── 야간근무 가산금 + 리커버리데이 ──
    {
      id: 'nightShift', category: 'overtime',
      icon: '🌙', title: '야간근무 가산금',
      desc: '회당 1만원 + 리커버리데이 발생',
      hasInput: true,
      calc(profile, wage, inputs) {
        const count = inputs.count || 7;
        const prevCumulative = (profile && profile.nightShiftsUnrewarded != null)
          ? profile.nightShiftsUnrewarded : 0;
        const r = CALC.calcNightShiftBonus(count, prevCumulative);
        const details = [
          { key: '야간근무 횟수', val: count + '회' },
          { key: '가산금 (' + count + '회 \u00d7 ' + CALC.formatNumber(DATA.allowances.nightShiftBonus) + ')', val: CALC.formatCurrency(r.야간근무가산금) },
          { key: '리커버리데이', val: r.리커버리데이 > 0 ? r.리커버리데이 + '일 발생' : '해당없음 (7회 미만)' },
          { key: '이월 누적', val: prevCumulative + '회 \u2192 정산 후 ' + r.누적리커버리데이 + '회' },
          { key: '기준', val: '당월 7일\u2191 \u2192 1일, 누적 ' + DATA.recoveryDay.nurseCumulativeTrigger + '일\u2191 \u2192 1일 추가' },
        ];
        if (r.초과경고) details.push({ key: '\u26a0\ufe0f 경고', val: r.초과경고 });
        return {
          value: CALC.formatCurrency(r.야간근무가산금),
          label: '야간 ' + count + '회 가산금' + (r.리커버리데이 > 0 ? ' + 리커버리 ' + r.리커버리데이 + '일' : ''),
          details
        };
      },
      renderInput() {
        return '<div class="form-group" style="margin-top:12px;">'
          + '<label>이번 달 야간근무 횟수</label>'
          + '<input type="number" id="qaNightCount" value="7" min="0" max="15" onchange="PAYROLL.recalc(\'nightShift\')">'
          + '</div>';
      },
      getInputs() {
        var el = document.getElementById('qaNightCount');
        return { count: el ? parseInt(el.value) || 7 : 7 };
      }
    },

    // ── 온콜 수당 종합 ──
    {
      id: 'oncall', category: 'overtime',
      icon: '📞', title: '온콜 수당 계산',
      desc: '대기수당 + 교통비 + 시간외 통합',
      hasInput: true,
      calc(profile, wage, inputs) {
        const standby = inputs.standby || 1;
        const callouts = inputs.callouts || 1;
        const hours = inputs.hours || 2;
        const isNight = inputs.isNight || false;
        const r = CALC.calcOnCallPay(wage.hourlyRate, standby, callouts, hours, isNight);
        const commuteH = DATA.allowances.onCallCommuteHours;
        const rateLabel = isNight ? '200%' : '150%';
        return {
          value: CALC.formatCurrency(r.합계),
          label: '온콜 대기' + standby + '일 + 출근' + callouts + '회',
          details: [
            { key: '대기수당 (' + standby + '일 \u00d7 ' + CALC.formatNumber(DATA.allowances.onCallStandby) + ')', val: CALC.formatCurrency(r.온콜대기수당) },
            { key: '교통비 (' + callouts + '회 \u00d7 ' + CALC.formatNumber(DATA.allowances.onCallTransport) + ')', val: CALC.formatCurrency(r.온콜교통비) },
            { key: '시간외 (근무' + hours + 'h+출퇴근' + commuteH + 'h)\u00d7' + rateLabel + '\u00d7' + callouts + '회', val: CALC.formatCurrency(r.시간외근무수당) },
            { key: '합계', val: CALC.formatCurrency(r.합계) },
            { key: '야간 포함 여부', val: isNight ? '예 (22:00~06:00 \u2192 200%)' : '아니오 (주간 \u2192 150%)' },
          ]
        };
      },
      renderInput() {
        return '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px;">'
          + '<div class="form-group"><label>대기 일수</label>'
          + '<input type="number" id="qaOncallStandby" value="1" min="0" max="7" onchange="PAYROLL.recalc(\'oncall\')"></div>'
          + '<div class="form-group"><label>출근 횟수</label>'
          + '<input type="number" id="qaOncallCallouts" value="1" min="0" max="7" onchange="PAYROLL.recalc(\'oncall\')"></div>'
          + '<div class="form-group"><label>실 근무시간</label>'
          + '<input type="number" id="qaOncallHours" value="2" min="0" max="12" onchange="PAYROLL.recalc(\'oncall\')"></div>'
          + '<div class="form-group"><label style="font-size:12px;">야간 포함</label>'
          + '<select id="qaOncallNight" onchange="PAYROLL.recalc(\'oncall\')" style="padding:8px; border:1.5px solid var(--border); border-radius:8px; font-size:var(--text-body-normal); background:var(--bg-card);">'
          + '<option value="0">아니오 (150%)</option>'
          + '<option value="1">예 (200%)</option>'
          + '</select></div>'
          + '</div>';
      },
      getInputs() {
        return {
          standby: parseInt(document.getElementById('qaOncallStandby')?.value) || 1,
          callouts: parseInt(document.getElementById('qaOncallCallouts')?.value) || 1,
          hours: parseInt(document.getElementById('qaOncallHours')?.value) || 2,
          isNight: document.getElementById('qaOncallNight')?.value === '1'
        };
      }
    },

    // ── 일직/숙직비 ──
    {
      id: 'dutyPay', category: 'overtime',
      icon: '🛏️', title: '일직/숙직비',
      desc: '일당 5만원 \u00d7 횟수',
      hasInput: true,
      calc(profile, wage, inputs) {
        const count = inputs.count || 1;
        const perDay = DATA.allowances.dutyAllowance;
        const total = perDay * count;
        return {
          value: CALC.formatCurrency(total),
          label: '일직/숙직 ' + count + '회 수당',
          details: [
            { key: '일당', val: CALC.formatCurrency(perDay) },
            { key: '횟수', val: count + '회' },
            { key: '합계', val: CALC.formatCurrency(total) }
          ]
        };
      },
      renderInput() {
        return '<div class="form-group" style="margin-top:12px;">'
          + '<label>이번 달 일직/숙직 횟수</label>'
          + '<input type="number" id="qaDutyCount" value="1" min="1" max="10" onchange="PAYROLL.recalc(\'dutyPay\')">'
          + '</div>';
      },
      getInputs() {
        var el = document.getElementById('qaDutyCount');
        return { count: el ? parseInt(el.value) || 1 : 1 };
      }
    },

    // ── 가족수당 ──
    {
      id: 'familyAllowance', category: 'overtime',
      icon: '👨‍👩‍👧', title: '가족수당',
      desc: '배우자·자녀·6세이하 별도',
      calc(profile, wage) {
        const r = CALC.calcFamilyAllowance(
          parseInt(profile.numFamily) || 0,
          parseInt(profile.numChildren) || 0
        );
        const under6Pay = parseInt(profile.childrenUnder6Pay) || 0;
        const fa = DATA.familyAllowance;
        const details = [];
        if (Object.keys(r.breakdown).length > 0) {
          Object.entries(r.breakdown).forEach(function(entry) {
            details.push({ key: entry[0], val: CALC.formatCurrency(entry[1]) });
          });
        }
        if (under6Pay > 0) {
          details.push({ key: '6세이하자녀수당', val: CALC.formatCurrency(under6Pay) });
        }
        details.push({ key: '기준', val: '배우자 ' + CALC.formatNumber(fa.spouse) + ', 자녀1 ' + CALC.formatNumber(fa.child1) + ', 자녀2 ' + CALC.formatNumber(fa.child2) + ', 자녀3+ ' + CALC.formatNumber(fa.child3Plus) });
        return {
          value: CALC.formatCurrency(r.월수당 + under6Pay),
          label: '월 가족수당 (비통상임금)',
          details: details.length > 1 ? details : [{ key: '해당', val: '없음 (가족정보 미입력)' }]
        };
      }
    },

    // ═══════════ 공제·보험 ═══════════

    // ── 4대보험 + 세금 공제 시뮬레이션 ──
    {
      id: 'deductionCalc', category: 'deduction',
      icon: '🏛️', title: '4대보험·세금 공제',
      desc: '급여총액 기준 공제 시뮬레이션',
      calc(profile, wage) {
        var grossPay = wage.monthlyWage;
        var ded = DATA.deductions || {};
        var healthIns = Math.round(grossPay * (ded.nationalHealth || 0.03545));
        var longTermCare = Math.round(healthIns * (ded.longTermCare || 0.1295));
        var pension = Math.round(grossPay * (ded.nationalPension || 0.045));
        var employment = Math.round(grossPay * (ded.employmentInsurance || 0.009));
        var mealDed = 22 * (ded.mealDeduction || 3000);
        var insTotal = healthIns + longTermCare + pension + employment;

        // 소득세 근사
        var taxableIncome = grossPay - pension - healthIns - longTermCare - employment;
        var incomeTax = 0;
        if (taxableIncome > 10000000) incomeTax = Math.round(taxableIncome * 0.15);
        else if (taxableIncome > 5000000) incomeTax = Math.round(taxableIncome * 0.10);
        else if (taxableIncome > 3000000) incomeTax = Math.round(taxableIncome * 0.06);
        else incomeTax = Math.round(taxableIncome * 0.03);
        var residentTax = Math.round(incomeTax * 0.1);
        var totalDed = insTotal + mealDed + incomeTax + residentTax;

        return {
          value: CALC.formatCurrency(totalDed),
          label: '통상임금 ' + CALC.formatCurrency(grossPay) + ' 기준 예상 공제',
          details: [
            { key: '국민건강보험 (3.545%)', val: CALC.formatCurrency(healthIns) },
            { key: '장기요양보험 (건보\u00d712.95%)', val: CALC.formatCurrency(longTermCare) },
            { key: '국민연금 (4.5%)', val: CALC.formatCurrency(pension) },
            { key: '고용보험 (0.9%)', val: CALC.formatCurrency(employment) },
            { key: '4대보험 소계', val: CALC.formatCurrency(insTotal) },
            { key: '식대공제 (22일\u00d73,000)', val: CALC.formatCurrency(mealDed) },
            { key: '소득세 (근사)', val: CALC.formatCurrency(incomeTax) },
            { key: '주민세 (소득세\u00d710%)', val: CALC.formatCurrency(residentTax) },
            { key: '공제 합계', val: CALC.formatCurrency(totalDed) },
            { key: '참고', val: '사학연금부담금·노조비 등 개인별 공제 미반영' },
          ]
        };
      }
    },

    // ── 무급휴가 공제액 ──
    {
      id: 'unpaidLeave', category: 'deduction',
      icon: '📋', title: '무급휴가 1일 공제액',
      desc: '통상임금 월액 \u00f7 30',
      calc(profile, wage) {
        var dailyOrdinary = Math.round(wage.monthlyWage / 30);
        var dailyBasePay = Math.round((wage.breakdown['기준기본급'] || 0) / 30);
        return {
          value: CALC.formatCurrency(dailyOrdinary),
          label: '무급휴가 1일 공제액 (통상임금 기준)',
          details: [
            { key: '통상임금 월액', val: CALC.formatCurrency(wage.monthlyWage) },
            { key: '통상임금 일액 (\u00f730)', val: CALC.formatCurrency(dailyOrdinary) },
            { key: '기본급 일액 (\u00f730)', val: CALC.formatCurrency(dailyBasePay) + ' \u2190 생리휴가 기준' },
            { key: '근거', val: '보수규정 제7조\u2461' }
          ]
        };
      }
    },

    // ═══════════ 휴가·휴직 ═══════════
    {
      id: 'annualLeave', category: 'leave',
      icon: '🏖️', title: '내 연차 몇 일?',
      desc: '발생·사용·잔여 연차 현황',
      calc(profile, wage) {
        if (!profile.hireDate) return { value: '입사일 필요', label: '프로필에 입사일을 입력하세요', details: [] };
        var parsed = PROFILE.parseDate(profile.hireDate);
        if (!parsed) return { value: '입사일 오류', label: '', details: [] };
        var r = CALC.calcAnnualLeave(new Date(parsed));
        var details = [
          { key: '입사일', val: parsed },
          { key: '근속', val: r.diffYears >= 1 ? r.diffYears + '년차' : r.diffMonths + '개월' },
          { key: '발생 연차', val: r.totalLeave + '일' },
        ];
        // LEAVE 모듈에서 사용/잔여 연차 연동
        if (typeof LEAVE !== 'undefined') {
          var year = new Date().getFullYear();
          var summary = LEAVE.calcAnnualSummary(year, r.totalLeave);
          details.push({ key: '사용 연차', val: summary.usedAnnual + '일' });
          details.push({ key: '잔여 연차', val: Math.max(0, summary.remainingAnnual) + '일' });
          if (summary.timeLeaveHours > 0) {
            details.push({ key: '시간차 포함', val: summary.timeLeaveHours + 'h (' + summary.timeLeaveDays + '일)' });
          }
        }
        details.push({ key: '근거', val: '보수규정 제36조' });
        var remaining = typeof LEAVE !== 'undefined'
          ? Math.max(0, LEAVE.calcAnnualSummary(new Date().getFullYear(), r.totalLeave).remainingAnnual)
          : r.totalLeave;
        return {
          value: r.totalLeave + '일 (잔여 ' + remaining + '일)',
          label: r.explanation,
          details: details
        };
      }
    },
    {
      id: 'unusedLeave', category: 'leave',
      icon: '💰', title: '미사용 연차 보상금',
      desc: '시급 × 8h × 잔여연차(자동계산)',
      hasInput: true,
      _calcRemaining(profile) {
        // 발생연차 - 사용연차 = 잔여연차 (LEAVE 모듈 연동)
        try {
          if (!profile || !profile.hireDate) return { total: 0, used: 0, remaining: 0 };
          var parsed = PROFILE.parseDate(profile.hireDate);
          if (!parsed) return { total: 0, used: 0, remaining: 0 };
          var r = CALC.calcAnnualLeave(new Date(parsed));
          var year = new Date().getFullYear();
          if (typeof LEAVE !== 'undefined') {
            var summary = LEAVE.calcAnnualSummary(year, r.totalLeave);
            return {
              total: r.totalLeave,
              used: summary.usedAnnual,
              remaining: Math.max(0, summary.remainingAnnual)
            };
          }
          return { total: r.totalLeave, used: 0, remaining: r.totalLeave };
        } catch(e) { return { total: 0, used: 0, remaining: 0 }; }
      },
      calc(profile, wage, inputs) {
        var lr = this._calcRemaining(profile);
        var days = inputs.days != null ? inputs.days : lr.remaining;
        if (days === 0 && lr.remaining === 0) days = 1; // fallback
        var daily = Math.round(wage.hourlyRate * 8);
        var total = daily * days;
        var details = [];
        if (lr.total > 0) {
          details.push({ key: '발생 연차', val: lr.total + '일' });
          details.push({ key: '사용 연차', val: lr.used + '일' });
          details.push({ key: '잔여 연차', val: lr.remaining + '일 (자동 계산)' });
        }
        details.push({ key: '시급', val: CALC.formatCurrency(wage.hourlyRate) });
        details.push({ key: '1일 금액 (시급×8h)', val: CALC.formatCurrency(daily) });
        details.push({ key: '보상 일수', val: days + '일' });
        details.push({ key: '합계', val: CALC.formatNumber(daily) + ' × ' + days + '일 = ' + CALC.formatCurrency(total) });
        return {
          value: CALC.formatCurrency(total),
          label: '미사용 연차 ' + days + '일 보상금',
          details: details
        };
      },
      renderInput() {
        var remaining = 0;
        try {
          var p = PROFILE.load();
          if (p) remaining = this._calcRemaining(p).remaining;
        } catch(e) {}
        return '<div class="form-group" style="margin-top:12px;">'
          + '<label>잔여 연차 일수 <span style="color:var(--text-muted);font-size:11px;">(자동계산 · 수정 가능)</span></label>'
          + '<input type="number" id="qaUnusedDays" value="' + remaining + '" min="0" max="30" step="0.5" onchange="PAYROLL.recalc(\'unusedLeave\')">'
          + '</div>';
      },
      getInputs() {
        var el = document.getElementById('qaUnusedDays');
        if (el) return { days: parseFloat(el.value) || 0 };
        // 입력 DOM 없으면 자동계산값 반환
        try {
          var p = PROFILE.load();
          if (p) return { days: this._calcRemaining(p).remaining };
        } catch(e) {}
        return { days: null };
      }
    },
    {
      id: 'parentalLeave', category: 'leave',
      icon: '👶', title: '육아휴직 급여',
      desc: '월별 급여 + 상한선 시뮬레이션',
      hasInput: true,
      calc(profile, wage, inputs) {
        var months = inputs.months || 12;
        var r = CALC.calcParentalLeavePay(wage.monthlyWage, months);
        var details = [
          { key: '월 통상임금', val: CALC.formatCurrency(wage.monthlyWage) },
          { key: '기준', val: '1~3개월: 100%(상한250만), 4~6: 100%(200만), 7~12: 80%(160만), 13+: 무급' },
        ];
        r.monthly.forEach(function(m) {
          details.push({
            key: m.month + '개월차',
            val: m.pay > 0 ? CALC.formatCurrency(m.pay) : '무급'
          });
        });
        details.push({ key: '총 예상 급여', val: CALC.formatCurrency(r.total) });
        return {
          value: CALC.formatCurrency(r.total),
          label: '육아휴직 ' + months + '개월 총 예상 급여',
          details: details
        };
      },
      renderInput() {
        return '<div class="form-group" style="margin-top:12px;">'
          + '<label>육아휴직 개월수</label>'
          + '<input type="number" id="qaParentalMonths" value="12" min="1" max="18" onchange="PAYROLL.recalc(\'parentalLeave\')">'
          + '</div>';
      },
      getInputs() {
        var el = document.getElementById('qaParentalMonths');
        return { months: el ? parseInt(el.value) || 12 : 12 };
      }
    },

    // ═══════════ 승진·근속 ═══════════
    {
      id: 'promotionDiff', category: 'career',
      icon: '📈', title: '승진하면 얼마나 올라?',
      desc: '현재 vs 다음 등급 통상임금 비교',
      calc(profile, wage) {
        var table = DATA.payTables[CALC.resolvePayTable(profile.jobType)];
        if (!table || !table.autoPromotion[profile.grade]) {
          return { value: '해당없음', label: '자동승격 정보 없음', details: [] };
        }
        var nextGrade = table.autoPromotion[profile.grade].next;
        var nextWage = CALC.calcOrdinaryWage(profile.jobType, nextGrade, 1, {
          hasMilitary: profile.hasMilitary, militaryMonths: profile.militaryMonths || 24,
          hasSeniority: profile.hasSeniority,
          seniorityYears: profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0,
          adjustPay: parseInt(profile.adjustPay) || 0
        });
        if (!nextWage) return { value: '계산 불가', label: '', details: [] };
        var diff = nextWage.monthlyWage - wage.monthlyWage;
        var currentLabel = table.gradeLabels?.[profile.grade] || profile.grade;
        var nextLabel = table.gradeLabels?.[nextGrade] || nextGrade;
        return {
          value: (diff > 0 ? '+' : '') + CALC.formatCurrency(diff),
          label: currentLabel + ' \u2192 ' + nextLabel + ' 월급 차이',
          details: [
            { key: '현재 (' + currentLabel + ')', val: CALC.formatCurrency(wage.monthlyWage) },
            { key: '승진 후 (' + nextLabel + ')', val: CALC.formatCurrency(nextWage.monthlyWage) },
            { key: '월 차액', val: (diff > 0 ? '+' : '') + CALC.formatCurrency(diff) },
            { key: '연 차액', val: (diff > 0 ? '+' : '') + CALC.formatCurrency(diff * 12) }
          ]
        };
      }
    },
    {
      id: 'promotionDate', category: 'career',
      icon: '📊', title: '몇 년도에 승진?',
      desc: '직급 시작일 기준 자동승격 예상일',
      calc(profile, wage) {
        if (!profile.hireDate) return { value: '입사일 필요', label: '프로필에 입사일을 입력하세요', details: [] };
        var parsed = PROFILE.parseDate(profile.hireDate);
        if (!parsed) return { value: '입사일 오류', label: '', details: [] };

        // 직급 시작일 = 명세서 이력에서 호봉1 최초 등장 월 → 없으면 호봉으로 역산 → 없으면 입사일
        var gradeStart = PAYROLL._getGradeStartDate(profile);
        var gradeStartSource = gradeStart.source;
        var gradeStartDate = gradeStart.date;

        var r = CALC.calcPromotionDate(profile.jobType, profile.grade, gradeStartDate);
        if (r.message) return { value: '해당없음', label: r.message, details: [] };
        var isPast = r.남은일수 === 0;
        return {
          value: isPast ? '이미 도래' : 'D-' + r.남은일수,
          label: r.label,
          details: [
            { key: '현재 직급 시작일', val: gradeStartDate.toISOString().split('T')[0] + ' (' + gradeStartSource + ')' },
            { key: '소요 연수', val: r.소요연수 },
            { key: '예상 승격일', val: r.예상승격일 },
            { key: '남은 일수', val: isPast ? '이미 도래' : r.남은일수 + '일' }
          ]
        };
      }
    },
    {
      id: 'longService', category: 'career',
      icon: '🏅', title: '장기근속수당',
      desc: '근속연수 기반 월 수당',
      calc(profile, wage) {
        var years = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
        var r = CALC.calcLongServicePay(years);
        var tiers = DATA.longServicePay.filter(function(t) { return t.amount > 0; }).map(function(t) {
          return t.min + '~' + (t.max === 99 ? '' : t.max) + '년: ' + CALC.formatNumber(t.amount) + '원';
        }).join(', ');
        return {
          value: r.월수당 > 0 ? CALC.formatCurrency(r.월수당) : '해당없음',
          label: r.월수당 > 0 ? '근속 ' + years + '년 (' + r.구간 + ')' : '근속 ' + years + '년 (5년 미만 해당없음)',
          details: [
            { key: '근속연수', val: years + '년' },
            { key: '적용 구간', val: r.구간 },
            { key: '월 수당', val: r.월수당 > 0 ? CALC.formatCurrency(r.월수당) : '0원' },
            { key: '구간표', val: tiers }
          ]
        };
      }
    },
    {
      id: 'severance', category: 'career',
      icon: '🏦', title: '퇴직금 시뮬레이션',
      desc: '최근 3개월 평균임금 기준',
      calc(profile, wage) {
        var years = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
        var avg = CALC.calcAverageWage(wage.monthlyWage, 3);
        var r = CALC.calcSeveranceFullPay(avg.monthlyAvgWage, years, profile.hireDate || null);
        var hasOt = avg.totalOtPay > 0;
        return {
          value: r.퇴직금 > 0 ? CALC.formatCurrency(r.퇴직금) : '해당없음',
          label: r.퇴직금 > 0 ? '근속 ' + (r.근속기간 || years + '년') + ' 기준 예상 퇴직금' : (r.note || '근속 1년 미만'),
          details: [
            { key: '월 통상임금', val: CALC.formatCurrency(wage.monthlyWage) },
            { key: '시간외 수당 (3개월)', val: CALC.formatCurrency(avg.totalOtPay) + (hasOt ? '' : ' (없음)') },
            { key: '월 평균임금 (\u00d730)', val: CALC.formatCurrency(avg.monthlyAvgWage) + (hasOt ? ' \u2191시간외 반영' : '') },
            { key: '근속기간', val: r.근속기간 || years + '년' },
            { key: '기본 퇴직금', val: CALC.formatCurrency(r.기본퇴직금 || 0) },
            { key: '퇴직수당', val: r.퇴직수당 > 0 ? CALC.formatCurrency(r.퇴직수당) : '해당없음' },
            { key: '산식', val: r.산식 || '-' }
          ]
        };
      }
    },

    // ═══════════ 복지·감면 ═══════════
    {
      id: 'medicalDiscount', category: 'welfare',
      icon: '🏥', title: '진료비 감면 혜택',
      desc: '본인·배우자·가족별 감면율',
      calc(profile, wage) {
        var md = DATA.medicalDiscount;
        return {
          value: '최대 100%',
          label: '본인 선택진료비 100% 감면',
          details: [
            { key: '본인 접수비', val: md.self.registration + '% 감면' },
            { key: '본인 보험/비보험', val: md.self.insurance + '% 감면' },
            { key: '본인 선택진료비', val: md.self.selectDoctor + '% 감면' },
            { key: '배우자 보험/비보험', val: md.spouse.insurance + '% 감면' },
            { key: '가족 보험/비보험', val: md.family.insurance + '% 감면' },
            { key: '적용병원', val: '본원·보라매·분당·치과병원' }
          ]
        };
      }
    },
    {
      id: 'gradeHistory', category: 'career',
      icon: '🗂️', title: '직급·호봉 이력',
      desc: '명세서 기반 승진·호봉 변경 자동 감지',
      calc(profile, wage) {
        var history = PAYROLL._buildGradeHistory();
        if (history.length === 0) {
          return {
            value: '명세서 없음',
            label: '급여명세서를 업로드하면 이력이 자동 생성됩니다',
            details: [{ key: '안내', val: '명세서 탭에서 PDF를 업로드하세요' }]
          };
        }
        var latest = history[history.length - 1];
        var promotions = history.filter(function(h) { return h.isPromotion; });
        var details = history.map(function(h) {
          var tag = h.isPromotion ? ' 🎉 승진' : (h.isYearUp ? ' ↑호봉' : '');
          return { key: h.year + '년 ' + h.month + '월', val: h.grade + '-' + h.step + tag };
        });
        details.push({ key: '총 승진', val: promotions.length + '회' });
        details.push({ key: '현재', val: latest.grade + '-' + latest.step + ' (' + latest.year + '년 ' + latest.month + '월 명세서 기준)' });
        return {
          value: latest.grade + '-' + latest.step,
          label: '최근 명세서 기준 직급 · 총 ' + promotions.length + '회 승진',
          details: details
        };
      }
    },

    {
      id: 'welfarePoint', category: 'welfare',
      icon: '🎫', title: '내 복지포인트',
      desc: '근속연수 기반 (1P=1,000원)',
      calc(profile, wage) {
        var years = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
        var base = 700;
        var serviceBonus = Math.min(years * 10, 300);
        var total = base + serviceBonus;
        return {
          value: total.toLocaleString() + 'P',
          label: CALC.formatCurrency(total * 1000) + ' 상당',
          details: [
            { key: '기본', val: '700P' },
            { key: '근속 가산', val: serviceBonus + 'P (' + years + '년 \u00d7 10P, 최대 300P)' },
            { key: '합계', val: total + 'P = ' + CALC.formatCurrency(total * 1000) },
            { key: '참고', val: '가족포인트·자녀학자금(1,200P) 별도' }
          ]
        };
      }
    },
  ],

  expandedCard: null,

  // ── 명세서 이력에서 직급(grade)-호봉(step) 변화 타임라인 생성 ──
  _buildGradeHistory() {
    var result = [];
    if (typeof SALARY_PARSER === 'undefined') return result;
    try {
      var months = SALARY_PARSER.listSavedMonths();
      // 날짜 오름차순 정렬
      months.sort(function(a, b) { return (a.year * 12 + a.month) - (b.year * 12 + b.month); });
      var prevGrade = null, prevStep = null;
      months.forEach(function(m) {
        var data = SALARY_PARSER.loadMonthlyData(m.year, m.month, m.type);
        if (!data) return;
        var pg = (data.employeeInfo && data.employeeInfo.payGrade) || (data.metadata && data.metadata.payGrade);
        if (!pg) return;
        var gm = pg.match(/([A-Za-z]+\d+)\s*-\s*(\d+)/);
        if (!gm) return;
        var grade = gm[1].toUpperCase();
        var step = parseInt(gm[2]) || 1;
        var isPromotion = prevGrade !== null && grade !== prevGrade;
        var isYearUp = prevStep !== null && !isPromotion && step !== prevStep;
        // 변화가 있거나 첫 항목이면 기록
        if (prevGrade === null || isPromotion || isYearUp) {
          result.push({ year: m.year, month: m.month, grade: grade, step: step, isPromotion: isPromotion, isYearUp: isYearUp });
        }
        prevGrade = grade;
        prevStep = step;
      });
    } catch(e) {}
    return result;
  },

  // ── 현재 직급 시작일 추정 ──
  // 우선순위: 1) 명세서에서 현재 grade 호봉=1 최초 등장월  2) 호봉으로 역산  3) 입사일
  _getGradeStartDate(profile) {
    var fallbackDate = null;
    if (profile.hireDate) {
      var p = PROFILE.parseDate(profile.hireDate);
      if (p) fallbackDate = new Date(p);
    }

    // Method 1: 명세서 이력에서 현재 grade + step=1 최초 등장 월
    if (typeof SALARY_PARSER !== 'undefined') {
      try {
        var months = SALARY_PARSER.listSavedMonths();
        months.sort(function(a, b) { return (a.year * 12 + a.month) - (b.year * 12 + b.month); });
        for (var i = 0; i < months.length; i++) {
          var m = months[i];
          var data = SALARY_PARSER.loadMonthlyData(m.year, m.month, m.type);
          if (!data) continue;
          var pg = (data.employeeInfo && data.employeeInfo.payGrade) || (data.metadata && data.metadata.payGrade);
          if (!pg) continue;
          var gm = pg.match(/([A-Za-z]+\d+)\s*-\s*(\d+)/);
          if (!gm) continue;
          var grade = gm[1].toUpperCase();
          var step = parseInt(gm[2]) || 1;
          if (grade === profile.grade && step === 1) {
            return { date: new Date(m.year, m.month - 1, 1), source: '명세서 자동감지' };
          }
        }
      } catch(e) {}
    }

    // Method 2: 호봉(year)으로 역산 — 호봉=N이면 약 N-1년 전에 직급 시작
    if (profile.year && profile.year > 1) {
      var d = new Date();
      d.setFullYear(d.getFullYear() - (profile.year - 1));
      return { date: d, source: '호봉 역산 (추정)' };
    }

    // Method 3: 입사일 fallback
    return { date: fallbackDate || new Date(), source: '입사일 기준' };
  },

  init() {
    var container = document.getElementById('qaCardsContainer');
    if (!container) return;

    var profile = PROFILE.load();
    var wage = profile ? PROFILE.calcWage(profile) : null;
    var self = this;

    var html = '';

    // 프로필 미저장 경고
    if (!profile) {
      html += '<div class="qa-profile-warning">'
        + '내 정보를 먼저 저장하면 자동 계산됩니다. '
        + '<a onclick="switchToProfileTab()">내 정보 설정 \u2192</a>'
        + '</div>';
    }

    // 명세서 vs 앱 비교 배너 (업로드된 명세서가 있을 때)
    if (profile && wage) {
      var payslipCompare = this._buildPayslipCompare(profile, wage);
      if (payslipCompare) html += payslipCompare;
    }

    // 카테고리별 렌더링
    this.categories.forEach(function(cat) {
      var catCards = self.cards.filter(function(c) { return c.category === cat.id; });
      if (catCards.length === 0) return;

      html += '<div class="qa-category">';
      html += '<div class="qa-category-title">' + cat.icon + ' ' + cat.label + '</div>';
      html += '<div class="qa-cards-grid">';

      catCards.forEach(function(card) {
        var isExpanded = self.expandedCard === card.id;
        var result = null;
        if (profile && wage) {
          try {
            var inputs = card.getInputs ? card.getInputs() : {};
            result = card.calc(profile, wage, inputs);
          } catch (e) { result = null; }
        }

        html += '<div class="qa-card ' + (isExpanded ? 'expanded' : '') + '" id="qa-' + card.id + '" onclick="PAYROLL.toggle(\'' + card.id + '\')">';
        html += '<div class="qa-card-header">';
        html += '<span class="qa-card-icon">' + card.icon + '</span>';
        html += '<div style="flex:1; min-width:0;">';
        html += '<div class="qa-card-title">' + card.title + '</div>';
        html += '<div class="qa-card-desc">' + card.desc + '</div>';
        html += '</div>';

        // 미리보기 값 (접힌 상태)
        if (!isExpanded && result && result.value) {
          html += '<div style="margin-left:auto; text-align:right; flex-shrink:0;">';
          html += '<div style="font-size:var(--text-body-large); font-weight:700; color:var(--accent-emerald);">' + result.value + '</div>';
          html += '</div>';
        }
        html += '</div>';

        // 확장 본문
        if (isExpanded) {
          html += '<div class="qa-card-body" onclick="event.stopPropagation()">';
          if (!profile || !wage) {
            html += '<p style="color:var(--accent-amber);">내 정보를 먼저 저장해주세요. <a onclick="switchToProfileTab()" style="color:var(--accent-indigo); cursor:pointer; text-decoration:underline;">내 정보 설정 \u2192</a></p>';
          } else if (result) {
            if (card.renderInput) html += card.renderInput();
            html += '<div class="qa-card-result">';
            html += '<div class="result-value">' + result.value + '</div>';
            html += '<div class="result-label">' + result.label + '</div>';
            html += '</div>';
            if (result.details && result.details.length > 0) {
              result.details.forEach(function(d) {
                html += '<div class="result-row"><span class="key">' + d.key + '</span><span class="val">' + d.val + '</span></div>';
              });
            }
          }
          html += '</div>';
        }
        html += '</div>';
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
  },

  // ── 명세서 vs 앱 비교 배너 ──
  _buildPayslipCompare(profile, wage) {
    // 최근 업로드된 명세서 찾기
    var now = new Date();
    var found = null;
    for (var i = 0; i < 3; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = 'salary_' + d.getFullYear() + '_' + (d.getMonth() + 1);
      var raw = localStorage.getItem(key);
      if (raw) {
        try {
          found = { data: JSON.parse(raw), year: d.getFullYear(), month: d.getMonth() + 1 };
          break;
        } catch (e) { /* skip */ }
      }
    }
    if (!found || !found.data.summary) return null;

    var actual = found.data.summary;
    var est = (typeof calcMonthEstimate === 'function') ? calcMonthEstimate(found.year, found.month) : null;
    if (!est) return null;

    var appGross = est.result.급여총액;
    var appNet = est.result.실지급액;
    var realGross = actual.grossPay || 0;
    var realNet = actual.netPay || 0;

    if (realGross === 0) return null;

    var grossDiff = appGross - realGross;
    var netDiff = appNet - realNet;
    var grossPct = realGross > 0 ? Math.abs(Math.round((grossDiff / realGross) * 100)) : 0;

    var matchClass = grossPct <= 3 ? 'success' : (grossPct <= 10 ? 'warning' : 'error');
    var matchLabel = grossPct <= 3 ? '거의 일치' : (grossPct <= 10 ? '차이 있음' : '크게 다름');

    var html = '<div class="qa-compare-banner ' + matchClass + '">';
    html += '<div class="qa-compare-title">' + found.year + '년 ' + found.month + '월 명세서 vs 앱 계산</div>';
    html += '<div class="qa-compare-grid">';
    html += '<div><span class="qa-compare-label">급여총액</span><span class="qa-compare-real">' + CALC.formatCurrency(realGross) + '</span><span class="qa-compare-diff">' + (grossDiff >= 0 ? '+' : '') + CALC.formatCurrency(grossDiff) + '</span></div>';
    html += '<div><span class="qa-compare-label">실지급액</span><span class="qa-compare-real">' + CALC.formatCurrency(realNet) + '</span><span class="qa-compare-diff">' + (netDiff >= 0 ? '+' : '') + CALC.formatCurrency(netDiff) + '</span></div>';
    html += '</div>';
    html += '<div class="qa-compare-status ' + matchClass + '">' + matchLabel + ' (차이 ' + grossPct + '%)</div>';
    html += '</div>';
    return html;
  },

  toggle(cardId) {
    this.expandedCard = this.expandedCard === cardId ? null : cardId;
    this.init();
  },

  recalc(cardId) {
    this.init();
  }
};
