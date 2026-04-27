// ============================================
// 병원 HR 종합 시스템 - 급여 계산 모듈
// ============================================
import { CALC } from './calculators.js';
import { DATA } from './data.js';
import { PROFILE } from './profile.js';
import { OVERTIME } from './overtime.js';
import { LEAVE } from './leave.js';

export const PAYROLL = {
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
      desc: '이번 달 자동 불러오기 · 15분 단위',
      hasInput: true,
      // 이번 달 OVERTIME 기록에서 연장/야간/휴일 합계 추출
      _getThisMonthStats() {
        try {
          var now = new Date();
          if (typeof OVERTIME === 'undefined') return null;
          var stats = OVERTIME.calcMonthlyStats(now.getFullYear(), now.getMonth() + 1);
          if (!stats || stats.recordCount === 0) return null;
          // 월 전체 records에서 breakdown 합산
          var records = OVERTIME.getMonthRecords(now.getFullYear(), now.getMonth() + 1);
          var ext = 0, ngt = 0, hol = 0, holNgt = 0;
          records.forEach(function(r) {
            if (!r.breakdown) return;
            ext += r.breakdown.extended || 0;
            ngt += r.breakdown.night || 0;
            hol += r.breakdown.holiday || 0;
            holNgt += r.breakdown.holidayNight || 0;
          });
          // 명세서 보충분 가산
          var supp = stats && stats.payslipSupplement;
          if (supp) {
            ext += supp.extended || 0;
            ngt += supp.night || 0;
            hol += supp.holiday || 0;
          }
          var round15 = function(h) { return Math.floor(h * 4) / 4; };
          return { ext: round15(ext), ngt: round15(ngt), hol: round15(hol), holNgt: round15(holNgt), hasData: true, hasSupplement: !!supp };
        } catch(e) { return null; }
      },
      calc(profile, wage, inputs) {
        var ext = inputs.extHours || 0;
        var ngt = inputs.nightHours || 0;
        var hol = inputs.holHours || 0;
        var holNgt = inputs.holNightHours || 0;
        var rate = wage.hourlyRate;
        var rates = DATA.allowances.overtimeRates;
        // 15분 단위 절삭
        var round15 = function(h) { return Math.floor(h * 4) / 4; };
        ext = round15(ext); ngt = round15(ngt); hol = round15(hol); holNgt = round15(holNgt);

        var extPay = Math.round(rate * rates.extended * ext);
        var ngtPay = Math.round(rate * rates.night * ngt);
        var holBase = Math.min(hol, 8);
        var holOver = Math.max(hol - 8, 0);
        var holPay = Math.round(rate * rates.holiday * holBase) + Math.round(rate * rates.holidayOver8 * holOver);
        var holNgtPay = Math.round(rate * rates.holidayNight * holNgt);
        var total = extPay + ngtPay + holPay + holNgtPay;

        var fmtH = function(h) {
          if (h === 0) return '0분';
          var hrs = Math.floor(h);
          var mins = Math.round((h - hrs) * 60);
          if (hrs === 0) return mins + '분';
          if (mins === 0) return hrs + '시간';
          return hrs + '시간 ' + mins + '분';
        };

        var details = [{ key: '통상시급 (월급÷209h)', val: CALC.formatCurrency(rate) }];
        if (ext > 0) details.push({ key: '연장 ' + fmtH(ext) + ' × ' + CALC.formatNumber(rate) + ' × 150%', val: CALC.formatCurrency(extPay) });
        if (ngt > 0) details.push({ key: '야간 ' + fmtH(ngt) + ' × ' + CALC.formatNumber(rate) + ' × 200%', val: CALC.formatCurrency(ngtPay) });
        if (hol > 0) {
          if (holOver > 0) details.push({ key: '휴일 ' + fmtH(holBase) + '×150% + ' + fmtH(holOver) + '×200%', val: CALC.formatCurrency(holPay) });
          else details.push({ key: '휴일 ' + fmtH(hol) + ' × ' + CALC.formatNumber(rate) + ' × 150%', val: CALC.formatCurrency(holPay) });
        }
        if (holNgt > 0) details.push({ key: '휴일야간 ' + fmtH(holNgt) + ' × ' + CALC.formatNumber(rate) + ' × 200%', val: CALC.formatCurrency(holNgtPay) });
        if (total === 0) details.push({ key: '안내', val: '근무 시간을 입력하면 계산됩니다' });
        else details.push({ key: '수당 합계', val: CALC.formatCurrency(total) });
        details.push({ key: '기준', val: '취업규칙 제34조·제47조 / 15분 단위 절삭' });

        return { value: total > 0 ? CALC.formatCurrency(total) : '0원', label: '시간외근무 수당 합계', details: details };
      },
      renderInput() {
        var ms = this._getThisMonthStats();
        var ext = ms ? ms.ext : 1, ngt = ms ? ms.ngt : 0, hol = ms ? ms.hol : 0, holNgt = ms ? ms.holNgt : 0;
        var autoTag = ms && ms.hasData
          ? '<span class="ot-auto-badge">이번 달 자동 반영' + (ms.hasSupplement ? ' + 명세서 보충' : '') + '</span>'
          : '<span class="ot-auto-badge ot-auto-manual">직접 입력 (기본 연장 1h)</span>';
        var makeStepInput = function(id, val, max) {
          return '<div class="ot-step-wrap">'
            + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="' + id + '" data-payroll-delta="-0.25" data-payroll-section="overtimeCalc">−</button>'
            + '<input type="number" id="' + id + '" value="' + val + '" min="0" max="' + max + '" step="0.25"'
            + ' data-input-action="payrollRecalc" data-payroll-section="overtimeCalc">'
            + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="' + id + '" data-payroll-delta="0.25" data-payroll-section="overtimeCalc">+</button>'
            + '</div>';
        };
        return '<div class="ot-input-header">' + autoTag + '</div>'
          + '<div class="ot-input-grid">'
          + '<div class="ot-input-item"><div class="ot-input-label">연장근무</div>' + makeStepInput('qaExtHours', ext, 100) + '<div class="ot-input-hint">× 150%</div></div>'
          + '<div class="ot-input-item"><div class="ot-input-label">야간근무</div>' + makeStepInput('qaNightHours', ngt, 100) + '<div class="ot-input-hint">× 200%</div></div>'
          + '<div class="ot-input-item"><div class="ot-input-label">휴일근무</div>' + makeStepInput('qaHolHours', hol, 24) + '<div class="ot-input-hint">8h 이내 150%</div></div>'
          + '<div class="ot-input-item"><div class="ot-input-label">휴일야간</div>' + makeStepInput('qaHolNightHours', holNgt, 24) + '<div class="ot-input-hint">× 200%</div></div>'
          + '</div>'
          + '<div class="ot-unit-hint">15분(0.25h) 단위 · +/− 버튼 또는 직접 입력</div>';
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
        const r = CALC.calcNightShiftBonus(count, prevCumulative, profile && profile.jobType);
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
          + '<div class="ot-step-wrap">'
          + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaNightCount" data-payroll-delta="-1" data-payroll-section="nightShift">−</button>'
          + '<input type="number" id="qaNightCount" value="7" min="0" max="15" step="1" data-input-action="payrollRecalc" data-payroll-section="nightShift">'
          + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaNightCount" data-payroll-delta="1" data-payroll-section="nightShift">+</button>'
          + '</div>'
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
        return '<div style="margin-top:12px;">'
          + '<div class="ot-input-grid" style="margin-bottom:8px;">'
          + '<div class="ot-input-item"><div class="ot-input-label">대기 일수</div>'
          + '<div class="ot-step-wrap"><button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaOncallStandby" data-payroll-delta="-1" data-payroll-section="oncall">−</button>'
          + '<input type="number" id="qaOncallStandby" value="1" min="0" max="7" step="1" data-input-action="payrollRecalc" data-payroll-section="oncall">'
          + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaOncallStandby" data-payroll-delta="1" data-payroll-section="oncall">+</button></div></div>'
          + '<div class="ot-input-item"><div class="ot-input-label">출근 횟수</div>'
          + '<div class="ot-step-wrap"><button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaOncallCallouts" data-payroll-delta="-1" data-payroll-section="oncall">−</button>'
          + '<input type="number" id="qaOncallCallouts" value="1" min="0" max="7" step="1" data-input-action="payrollRecalc" data-payroll-section="oncall">'
          + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaOncallCallouts" data-payroll-delta="1" data-payroll-section="oncall">+</button></div></div>'
          + '<div class="ot-input-item"><div class="ot-input-label">실 근무시간</div>'
          + '<div class="ot-step-wrap"><button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaOncallHours" data-payroll-delta="-0.25" data-payroll-section="oncall">−</button>'
          + '<input type="number" id="qaOncallHours" value="2" min="0" max="12" step="0.25" data-input-action="payrollRecalc" data-payroll-section="oncall">'
          + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaOncallHours" data-payroll-delta="0.25" data-payroll-section="oncall">+</button></div>'
          + '<div class="ot-input-hint">15분 단위</div></div>'
          + '<div class="ot-input-item"><div class="ot-input-label">야간 포함</div>'
          + '<select id="qaOncallNight" data-input-action="payrollRecalc" data-payroll-section="oncall" style="padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:var(--text-body-normal);background:var(--bg-card);width:100%;">'
          + '<option value="0">아니오 (150%)</option>'
          + '<option value="1">예 (200%)</option>'
          + '</select></div>'
          + '</div>'
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
      shouldShow(profile) {
        // 임상 직종에만 해당 (의사직·간호직·의료기사직·약무직·보건직)
        if (!profile) return false;
        var clinical = ['의사직', '간호직', '의료기사직', '약무직', '보건직'];
        return clinical.indexOf(profile.jobType) !== -1;
      },
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
          + '<div class="ot-step-wrap">'
          + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaDutyCount" data-payroll-delta="-1" data-payroll-section="dutyPay">−</button>'
          + '<input type="number" id="qaDutyCount" value="1" min="1" max="10" step="1" data-input-action="payrollRecalc" data-payroll-section="dutyPay">'
          + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaDutyCount" data-payroll-delta="1" data-payroll-section="dutyPay">+</button>'
          + '</div>'
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
      shouldShow(profile) {
        if (!profile) return false;
        return (parseInt(profile.numFamily) || 0) + (parseInt(profile.numChildren) || 0) > 0;
      },
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
          + '<input type="number" id="qaUnusedDays" value="' + remaining + '" min="0" max="30" step="0.5" data-input-action="payrollRecalc" data-payroll-section="unusedLeave">'
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
          + '<input type="number" id="qaParentalMonths" value="12" min="1" max="18" data-input-action="payrollRecalc" data-payroll-section="parentalLeave">'
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
      desc: '현재 vs 목표 등급 항목별 비교',
      hasInput: true,
      calc(profile, wage, inputs) {
        var table = DATA.payTables[CALC.resolvePayTable(profile.jobType)];
        if (!table) return { value: '해당없음', label: '보수표 없음', details: [] };

        // 목표 등급: 입력값 우선, 없으면 autoPromotion 다음 등급, 없으면 grades 배열에서 한 단계 위
        var nextGrade = inputs.targetGrade || null;
        if (!nextGrade && table.autoPromotion && table.autoPromotion[profile.grade]) {
          nextGrade = table.autoPromotion[profile.grade].next;
        }
        if (!nextGrade) {
          // grades 배열에서 현재보다 위 등급 자동 선택
          var grades = table.grades || [];
          var idx = grades.indexOf(profile.grade);
          if (idx > 0) nextGrade = grades[idx - 1]; // grades가 높은 순이면 -1
          else if (idx < grades.length - 1) nextGrade = grades[idx + 1];
        }
        if (!nextGrade || nextGrade === profile.grade) {
          return { value: '해당없음', label: '승진 대상 등급 없음 — 목표 등급을 선택하세요', details: [] };
        }

        var serviceYears = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
        var hasSeniority = profile.hireDate ? new Date(PROFILE.parseDate(profile.hireDate)) < new Date('2016-02-01') : false;
        var nextWage = CALC.calcOrdinaryWage(profile.jobType, nextGrade, 1, {
          hasMilitary: profile.hasMilitary, militaryMonths: profile.militaryMonths || 24,
          hasSeniority: hasSeniority, seniorityYears: hasSeniority ? serviceYears : 0,
          longServiceYears: serviceYears,
          adjustPay: parseInt(profile.adjustPay) || 0,
          upgradeAdjustPay: 0  // 승진 후 새 등급에서는 승급조정급 0 처리
        });
        if (!nextWage) return { value: '계산 불가', label: '', details: [] };

        var diff = nextWage.monthlyWage - wage.monthlyWage;
        var currentLabel = table.gradeLabels?.[profile.grade] || profile.grade;
        var nextLabel = table.gradeLabels?.[nextGrade] || nextGrade;

        // 항목별 차이 분석
        var itemDiffs = [];
        var allKeys = new Set([...Object.keys(wage.breakdown), ...Object.keys(nextWage.breakdown)]);
        allKeys.forEach(function(k) {
          var cur = wage.breakdown[k] || 0;
          var nxt = nextWage.breakdown[k] || 0;
          var d = nxt - cur;
          if (d !== 0) itemDiffs.push({ key: k, diff: d, cur: cur, nxt: nxt });
        });
        itemDiffs.sort(function(a, b) { return Math.abs(b.diff) - Math.abs(a.diff); });

        var details = [
          { key: '현재 ' + currentLabel + ' (호봉 ' + profile.year + ')', val: CALC.formatCurrency(wage.monthlyWage) },
          { key: '승진 후 ' + nextLabel + ' (호봉 1)', val: CALC.formatCurrency(nextWage.monthlyWage) },
          { key: '월 차액', val: (diff > 0 ? '+' : '') + CALC.formatCurrency(diff) },
          { key: '연 차액', val: (diff > 0 ? '+' : '') + CALC.formatCurrency(diff * 12) },
          { key: '─ 항목별 변화 ─', val: '' },
        ];
        itemDiffs.forEach(function(i) {
          details.push({ key: i.key, val: CALC.formatCurrency(i.cur) + ' → ' + CALC.formatCurrency(i.nxt) + ' (' + (i.diff > 0 ? '+' : '') + CALC.formatCurrency(i.diff) + ')' });
        });
        if (profile.adjustPay > 0) details.push({ key: '※ 조정급', val: '승진 시 통상 소멸·재산정 검토 필요' });

        return {
          value: (diff > 0 ? '+' : '') + CALC.formatCurrency(diff) + '/월',
          label: currentLabel + ' → ' + nextLabel + ' 승진 시 월급 변화',
          details: details
        };
      },
      renderInput() {
        var profile = PROFILE.load();
        if (!profile) return '';
        var table = DATA.payTables[CALC.resolvePayTable(profile.jobType)];
        if (!table) return '';
        var grades = table.grades || [];
        var curIdx = grades.indexOf(profile.grade);
        // 현재보다 위 등급만 선택지로 제공 (grades 배열이 높은순이면 앞쪽)
        var options = grades.filter(function(g) { return g !== profile.grade; });
        // autoPromotion이 있으면 해당 등급을 기본 선택
        var defaultNext = (table.autoPromotion && table.autoPromotion[profile.grade]) ? table.autoPromotion[profile.grade].next : (options[0] || '');
        var sel = '<select id="qaTargetGrade" data-input-action="payrollRecalc" data-payroll-section="promotionDiff" data-input-action="payrollRecalc" data-payroll-section="promotionDiff" style="width:100%;padding:10px 14px;border:2px solid var(--border);border-radius:10px;font-size:var(--text-body-normal);background:var(--bg-card);color:var(--text-primary);font-weight:700;">';
        options.forEach(function(g) {
          var label = (table.gradeLabels && table.gradeLabels[g]) ? g + ' · ' + table.gradeLabels[g] : g;
          sel += '<option value="' + g + '"' + (g === defaultNext ? ' selected' : '') + '>' + label + '</option>';
        });
        sel += '</select>';
        return '<div class="form-group" style="margin-top:12px;"><label>목표 등급 선택</label>' + sel + '</div>';
      },
      getInputs() {
        var el = document.getElementById('qaTargetGrade');
        return { targetGrade: el ? el.value : null };
      }
    },
    {
      id: 'promotionDate', category: 'career',
      icon: '📊', title: '몇 년도에 승진?',
      desc: '직급·호봉·시작일 직접 수정 가능',
      hasInput: true,
      calc(profile, wage, inputs) {
        // inputs 또는 profile에서 직급·호봉·시작일 결정
        var useGrade = (inputs && inputs.grade) || profile.grade;
        var useYear  = (inputs && inputs.year  != null) ? inputs.year  : (profile.year || 1);

        // 직급 시작일 결정: inputs 우선 → _getGradeStartDate
        var gradeStartDate, gradeStartSource;
        if (inputs && inputs.gradeStart) {
          var ps = PROFILE.parseDate(inputs.gradeStart);
          if (ps) { gradeStartDate = new Date(ps); gradeStartSource = '직접 입력'; }
        }
        if (!gradeStartDate) {
          var gs = PAYROLL._getGradeStartDate(Object.assign({}, profile, { grade: useGrade, year: useYear }));
          gradeStartDate = gs.date;
          gradeStartSource = gs.source;
        }
        if (!gradeStartDate) return { value: '입사일 필요', label: '프로필에 입사일을 입력하세요', details: [] };

        var table = DATA.payTables[CALC.resolvePayTable(profile.jobType)];
        var gl = function(g) { return (table && table.gradeLabels && table.gradeLabels[g]) || g; };
        var gradeLabel = gl(useGrade);

        // 노조협의 보정 정보 (표시용)
        var rawAdj = profile.unionStepAdjust;
        var unionAdj = (rawAdj !== '' && rawAdj !== null && rawAdj !== undefined)
          ? (parseInt(rawAdj) || 0)
          : CALC.calcUnionStepAdjust(useGrade);
        var unionAdjLabel = unionAdj > 0
          ? '+' + unionAdj + '호봉 보정 적용 (노조협의)'
          : (rawAdj === '0' ? '해당 없음 (수동 지정)' : '해당 없음');

        // ── 승진연한 결정 (autoPromotion 우선, 없으면 추정) ──
        var PROMO_FALLBACK = {
          S1: { years: 8,  next: 'S2', isEstimate: true },
          S2: { years: 8,  next: 'S3', isEstimate: true },
          S3: { years: null, next: 'M1', isSelection: true },
          M1: { years: null, next: 'M2', isSelection: true },
          M2: { years: null, next: 'M3', isSelection: true },
          M3: { years: null, next: null,  isSelection: true },
          C1: { years: 7,  next: 'C2', isEstimate: true },
          C2: { years: 7,  next: 'C3', isEstimate: true },
          C3: { years: null, next: 'L1', isSelection: true },
          L1: { years: null, next: 'L2', isSelection: true },
          L2: { years: null, next: 'L3', isSelection: true },
        };
        var promo = (table && table.autoPromotion && table.autoPromotion[useGrade]) || PROMO_FALLBACK[useGrade];
        var nextGrade = promo ? promo.next : null;
        var nextLabel = nextGrade ? gl(nextGrade) : '상위 직급';

        // 심사승진 또는 최상위 등급
        if (!promo || promo.isSelection || !promo.years) {
          return {
            value: nextGrade ? '심사승진' : '최상위',
            label: nextGrade ? gradeLabel + ' → ' + nextLabel + ' · 심사 대상' : gradeLabel + ' · 최상위 직급',
            details: [
              { key: '현재 직급·호봉', val: gradeLabel + ' ' + useYear + '호봉' },
              { key: '직급 시작일', val: gradeStartDate.toISOString().split('T')[0] + ' (' + gradeStartSource + ')' },
              { key: '승진 방식', val: '심사승진 (자동승격 미적용)' }
            ]
          };
        }

        // ── 날짜 계산 ──
        var promoYears = promo.years;
        var targetDate = new Date(gradeStartDate);
        targetDate.setFullYear(targetDate.getFullYear() + promoYears);
        var now = new Date();
        var totalMs = targetDate - gradeStartDate;
        var elapsedMs = Math.max(0, now - gradeStartDate);
        var progressRatio = Math.min(1, elapsedMs / totalMs);
        var elapsedYears = elapsedMs / (1000 * 60 * 60 * 24 * 365.25);
        var remaining = Math.max(0, Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)));
        var isPast = remaining === 0;

        // ── 바 차트 HTML 생성 ──
        var startYear = gradeStartDate.getFullYear();
        var startMonth = gradeStartDate.getMonth();
        var cells = '';
        var labelRow = '';

        for (var ci = 0; ci < promoYears; ci++) {
          var cellStart = ci / promoYears;
          var cellEnd   = (ci + 1) / promoYears;
          // 그라디에이션 색상: indigo(239°) → violet(262°) → blue-cyan(200°)
          var t = promoYears > 1 ? ci / (promoYears - 1) : 0;
          var hue = t < 0.5 ? Math.round(239 + t * 2 * 23) : Math.round(262 - (t - 0.5) * 2 * 62);
          var color = 'hsl(' + hue + ',74%,58%)';
          var cellStyle, cellClass;

          if (isPast || progressRatio >= cellEnd) {
            cellStyle = 'background:' + color;
            cellClass = 'promo-bar-cell pbc-filled';
          } else if (progressRatio > cellStart) {
            var partialPct = Math.round(((progressRatio - cellStart) * promoYears) * 100);
            cellStyle = 'background:linear-gradient(to right,' + color + ' ' + partialPct + '%,var(--pbc-empty) ' + partialPct + '%)';
            cellClass = 'promo-bar-cell pbc-partial';
          } else {
            cellStyle = '';
            cellClass = 'promo-bar-cell pbc-empty';
          }

          var nowDot = (!isPast && progressRatio > cellStart && progressRatio < cellEnd)
            ? '<div class="pbc-now-dot"></div>' : '';
          cells += '<div class="' + cellClass + '" style="' + cellStyle + '">' + nowDot + '</div>';

          // 년도 라벨: 각 셀 시작에 해당 연도
          var cellYear = startYear + ci + (startMonth > 0 ? 1 : 0);
          if (ci === 0) cellYear = startYear;
          labelRow += '<span>' + (startYear + ci) + '</span>';
        }
        // 마지막 라벨 = 목표 연도
        labelRow += '<span style="color:var(--accent-indigo);font-weight:700;">' + targetDate.getFullYear() + '</span>';

        var elapsedYStr = Math.floor(elapsedYears) + '년 ' + Math.round((elapsedYears % 1) * 12) + '개월';
        var noteText = isPast
          ? '🎉 자동승격 도래! 인사팀에 문의하세요'
          : elapsedYStr + ' 경과 · D-' + remaining + ' · ' + targetDate.getFullYear() + '년 ' + (targetDate.getMonth() + 1) + '월 승격 예상';

        var chartHTML = '<div class="promo-bar-wrap">'
          + (promo.isEstimate ? '<div class="promo-bar-est-tag">추정값 · 공식 연한 미확정</div>' : '')
          + '<div class="promo-bar-header"><span class="promo-bar-from">' + gradeLabel + '</span>'
          + '<span class="promo-bar-arrow">→</span>'
          + '<span class="promo-bar-to">' + nextLabel + '</span>'
          + '<span class="promo-bar-yr">' + promoYears + '년</span></div>'
          + '<div class="promo-bar-row">' + cells + '</div>'
          + '<div class="promo-bar-labels">' + labelRow + '</div>'
          + '<div class="promo-bar-note' + (isPast ? ' pbn-done' : '') + '">' + noteText + '</div>'
          + '</div>';

        return {
          value: isPast ? '이미 도래!' : targetDate.getFullYear() + '년',
          label: gradeLabel + ' → ' + nextLabel + ' · D-' + remaining + (promo.isEstimate ? ' (추정)' : ''),
          chartHTML: chartHTML,
          details: [
            { key: '직급 시작일', val: gradeStartDate.toISOString().split('T')[0] + ' (' + gradeStartSource + ')' },
            { key: '소요 연수',   val: promoYears + '년' + (promo.isEstimate ? ' (추정)' : '') },
            { key: '예상 승격일', val: targetDate.toISOString().split('T')[0] },
            { key: '남은 일수',   val: isPast ? '이미 도래' : remaining + '일' },
            { key: '노조협의 보정', val: unionAdjLabel }
          ]
        };
      },
      renderInput() {
        var profile = PROFILE.load();
        if (!profile) return '';
        var table = DATA.payTables[CALC.resolvePayTable(profile.jobType)];
        var grades = table ? (table.grades || []) : [];
        var gradeStart = PAYROLL._getGradeStartDate(profile);
        var startDateStr = gradeStart.date ? gradeStart.date.toISOString().split('T')[0] : '';

        var gradeOptions = '';
        grades.forEach(function(g) {
          var label = (table && table.gradeLabels && table.gradeLabels[g]) ? g + ' · ' + table.gradeLabels[g] : g;
          gradeOptions += '<option value="' + g + '"' + (g === profile.grade ? ' selected' : '') + '>' + label + '</option>';
        });

        return '<div style="margin-top:12px;">'
          + '<div style="font-size:11px;color:var(--accent-indigo);font-weight:700;margin-bottom:10px;padding:6px 10px;background:rgba(99,102,241,0.07);border-radius:8px;">아래 값을 수정하면 예상 승격일이 재계산됩니다 · 저장 시 내 정보에 반영</div>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
          + '<div class="form-group"><label>현재 직급</label>'
          + '<select id="qaPromoGrade" data-input-action="payrollRecalc" data-payroll-section="promotionDate" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:var(--text-body-normal);background:var(--bg-card);">'
          + gradeOptions + '</select></div>'
          + '<div class="form-group"><label>현재 호봉</label>'
          + '<div class="ot-step-wrap">'
          + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaPromoYear" data-payroll-delta="-1" data-payroll-section="promotionDate">−</button>'
          + '<input type="number" id="qaPromoYear" value="' + (profile.year || 1) + '" min="1" max="40" step="1" data-input-action="payrollRecalc" data-payroll-section="promotionDate">'
          + '<button type="button" class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="qaPromoYear" data-payroll-delta="1" data-payroll-section="promotionDate">+</button>'
          + '</div></div>'
          + '</div>'
          + '<div class="form-group"><label>최근 승진일 <span style="font-weight:400;color:var(--text-muted);">(직급 시작일 · ' + gradeStart.source + ')</span></label>'
          + '<input type="date" id="qaPromoStartDate" value="' + startDateStr + '" data-input-action="payrollRecalc" data-payroll-section="promotionDate" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:var(--text-body-normal);background:var(--bg-card);">'
          + '</div>'
          + '<button type="button" data-action="payrollSavePromoData" style="width:100%;padding:10px;background:var(--accent-indigo);color:#fff;border:2px solid var(--accent-indigo);border-radius:10px;font-weight:700;cursor:pointer;font-size:var(--text-body-normal);">내 정보에 저장 →</button>'
          + '</div>';
      },
      getInputs() {
        return {
          grade: document.getElementById('qaPromoGrade')?.value || null,
          year: parseInt(document.getElementById('qaPromoYear')?.value) || null,
          gradeStart: document.getElementById('qaPromoStartDate')?.value || null
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
          var tag = h.isPromotion ? ' 🎉 승진' : (h.isUnionEvent ? ' 🤝 ' + (h.unionReason || '노조협의') : (h.isYearUp ? ' ↑호봉' : ''));
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
      desc: '상·하반기 분리 · 사용처 안내',
      calc(profile, wage) {
        var years = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
        var serviceBonus = Math.min(years * 10, 300);
        var totalAnnual = 700 + serviceBonus; // 연간 기본+근속
        // 상반기: 연간의 절반 지급 (350P + 근속 절반)
        var first = Math.round(totalAnnual / 2);
        var second = totalAnnual - first;
        var annualWon = totalAnnual * 1000;
        return {
          value: totalAnnual + 'P',
          label: CALC.formatCurrency(annualWon) + ' 상당 (연간)',
          details: [
            { key: '상반기 지급 (1월)', val: first + 'P = ' + CALC.formatCurrency(first * 1000) },
            { key: '하반기 지급 (7월)', val: second + 'P = ' + CALC.formatCurrency(second * 1000) },
            { key: '기본', val: '700P' },
            { key: '근속 가산', val: serviceBonus + 'P (' + years + '년 × 10P, 최대 300P)' },
            { key: '─ 별도 포인트 ─', val: '' },
            { key: '가족포인트', val: '별도 지급' },
            { key: '자녀학자금', val: '1,200P' },
            { key: '─ 주요 사용처 ─', val: '' },
            { key: '🏋️ 헬스장·스포츠', val: '복지몰 신청 (연간 한도 내)' },
            { key: '📚 도서·자기계발', val: '복지몰 신청 (연간 한도 내)' },
            { key: '🎬 문화·여가', val: '복지몰 신청 (영화관, 공연 등)' },
            { key: '🏨 숙박·여행', val: '복지몰 신청 (콘도·호텔 등)' },
            { key: '🛒 생활용품·쇼핑', val: '복지몰 신청' },
            { key: '1P = 1,000원', val: '사내 복지몰(삼성화재 복지몰)에서 사용' }
          ]
        };
      }
    },
    {
      id: 'selfDevAllowance', category: 'welfare',
      icon: '📚', title: '자기개발별정수당',
      desc: '월 40,000원 · 통상임금 포함',
      calc(profile, wage) {
        var monthly = DATA.allowances.selfDevAllowance || 40000;
        var annual = monthly * 12;
        var special5 = DATA.allowances.specialPay5 || 35000;
        return {
          value: CALC.formatCurrency(monthly) + '/월',
          label: '연간 ' + CALC.formatCurrency(annual) + ' · 통상임금 포함 항목',
          details: [
            { key: '월 지급액', val: CALC.formatCurrency(monthly) },
            { key: '연간 합계', val: CALC.formatCurrency(annual) },
            { key: '별정수당5 (별도)', val: CALC.formatCurrency(special5) + '/월' },
            { key: '리프레시지원비', val: CALC.formatCurrency(DATA.allowances.refreshBenefit || 30000) + '/월 (2026.01~)' },
            { key: '성격', val: '통상임금 포함 → 시간외수당 산정 기준에 반영됨' },
            { key: '참고', val: '사용 용도 제한 없음 (복지몰 외 현금성)' }
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
      var unionEvents = (typeof DATA !== 'undefined' && DATA.unionStepEvents) ? DATA.unionStepEvents : [];
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

        // 노조협의 이벤트 여부 확인 (일치 월 + 해당 직급)
        var isUnionEvent = false;
        var unionReason = '';
        if (isYearUp) {
          unionEvents.forEach(function(e) {
            if (!e.grades || e.grades.indexOf(grade) === -1) return;
            var parts = (e.date || '').split('-');
            if (parseInt(parts[0]) === m.year && parseInt(parts[1]) === m.month) {
              isUnionEvent = true;
              unionReason = e.reason || '노조협의';
            }
          });
        }

        // 변화가 있거나 첫 항목이면 기록
        if (prevGrade === null || isPromotion || isYearUp) {
          result.push({ year: m.year, month: m.month, grade: grade, step: step,
            isPromotion: isPromotion, isYearUp: isYearUp,
            isUnionEvent: isUnionEvent, unionReason: unionReason });
        }
        prevGrade = grade;
        prevStep = step;
      });
    } catch(e) {}
    return result;
  },

  // ── 현재 직급 시작일 추정 ──
  // 우선순위: 0) 사용자 직접 입력(promotionDate)  1) 명세서에서 현재 grade 호봉=1 최초 등장월  2) 호봉으로 역산  3) 입사일
  _getGradeStartDate(profile) {
    var fallbackDate = null;
    if (profile.hireDate) {
      var p = PROFILE.parseDate(profile.hireDate);
      if (p) fallbackDate = new Date(p);
    }

    // Method 0: 사용자가 직접 저장한 직급 시작일 (info 탭 '최근 승진일' 필드)
    if (profile.promotionDate) {
      var pd = PROFILE.parseDate(profile.promotionDate);
      if (pd) return { date: new Date(pd), source: '직접 입력' };
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

    // Method 2: 호봉(year)으로 역산 — 노조협의 보정 후 역산
    if (profile.year && profile.year > 1) {
      // unionStepAdjust: ''|null|undefined → 자동, '0' → 0, '1' → 1 ...
      var rawAdj = profile.unionStepAdjust;
      var unionAdj = (rawAdj !== '' && rawAdj !== null && rawAdj !== undefined)
        ? (parseInt(rawAdj) || 0)
        : CALC.calcUnionStepAdjust(profile.grade);
      var naturalYear = Math.max(1, profile.year - unionAdj);
      var d = new Date();
      d.setFullYear(d.getFullYear() - (naturalYear - 1));
      var src = unionAdj > 0
        ? '호봉 역산 (추정, 노조협의 +' + unionAdj + '호봉 보정)'
        : '호봉 역산 (추정)';
      return { date: d, source: src };
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
        + '<a data-action="switchToProfileTab">내 정보 설정 \u2192</a>'
        + '</div>';
    }

    // 명세서 vs 앱 비교 배너 (업로드된 명세서가 있을 때)
    if (profile && wage) {
      var payslipCompare = this._buildPayslipCompare(profile, wage);
      if (payslipCompare) html += payslipCompare;
    }

    // 카테고리별 렌더링
    this.categories.forEach(function(cat) {
      var catCards = self.cards.filter(function(c) {
        if (c.category !== cat.id) return false;
        // shouldShow가 있으면 프로필 기준으로 표시 여부 결정
        if (c.shouldShow) return c.shouldShow(profile);
        return true;
      });
      if (catCards.length === 0) return;

      html += '<div class="qa-category">';
      html += '<div class="qa-category-title">' + cat.icon + '&nbsp; ' + cat.label + '</div>';
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

        html += '<div class="qa-card ' + (isExpanded ? 'expanded' : '') + '" id="qa-' + card.id + '" data-action="payrollToggle" data-card-id="' + card.id + '">';

        // ── 헤더 ──
        html += '<div class="qa-card-header">';
        html += '<span class="qa-card-icon">' + card.icon + '</span>';
        html += '<div style="flex:1;min-width:0;">';
        html += '<div class="qa-card-title">' + card.title + '</div>';
        html += '<div class="qa-card-desc">' + card.desc + '</div>';
        html += '</div>';
        // 접힌 상태: 우측 화살표
        if (!isExpanded) {
          html += '<div style="margin-left:6px;color:var(--text-muted);font-size:14px;flex-shrink:0;">›</div>';
        } else {
          html += '<div style="margin-left:6px;color:var(--accent-indigo);font-size:14px;flex-shrink:0;">✕</div>';
        }
        html += '</div>';

        // 접힌 상태: 계산값 미리보기 (큰 숫자, Toss 스타일)
        if (!isExpanded && result && result.value) {
          html += '<div class="qa-card-preview">' + result.value + '</div>';
        }

        // 확장 본문
        if (isExpanded) {
          html += '<div class="qa-card-body" data-stop-propagation>';
          if (!profile || !wage) {
            html += '<p style="color:var(--accent-amber);font-size:13px;font-weight:600;">내 정보를 먼저 저장해주세요. <a data-action="switchToProfileTab" style="color:var(--accent-indigo);cursor:pointer;text-decoration:underline;">내 정보 설정 →</a></p>';
          } else if (result) {
            if (card.renderInput) html += card.renderInput();
            // 결과 영역: id 부여해서 부분 업데이트 가능하게
            html += '<div id="qa-result-' + card.id + '">';
            html += PAYROLL._buildResultHTML(result);
            html += '</div>';
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

  // 승진일/직급/호봉을 내 정보(profile)에 저장
  _savePromoData() {
    var gradeEl = document.getElementById('qaPromoGrade');
    var yearEl  = document.getElementById('qaPromoYear');
    var startEl = document.getElementById('qaPromoStartDate');
    var profile = PROFILE.load();
    if (!profile) return;
    var updates = {};
    if (gradeEl && gradeEl.value) updates.grade = gradeEl.value;
    if (yearEl  && yearEl.value)  updates.year  = parseInt(yearEl.value) || profile.year;
    if (startEl && startEl.value) updates.promotionDate = startEl.value;
    PROFILE.save(Object.assign({}, profile, updates));
    // 내 정보 탭 폼 즉시 반영 (applyToForm이 가능하면)
    if (typeof PROFILE_FIELDS !== 'undefined' && typeof PROFILE !== 'undefined') {
      PROFILE.applyToForm(PROFILE.load(), PROFILE_FIELDS);
    }
    // 저장 완료 피드백
    var btn = document.querySelector('[data-action="payrollSavePromoData"]');
    if (btn) {
      var orig = btn.textContent;
      btn.textContent = '저장 완료 ✓';
      btn.style.background = 'var(--accent-green, #22c55e)';
      setTimeout(function() {
        if (btn) { btn.textContent = orig; btn.style.background = ''; }
      }, 1500);
    }
    PAYROLL.recalc('promotionDate');
  },

  // 결과 영역 HTML 생성 (init에서 호출)
  _buildResultHTML(result) {
    if (!result) return '';
    var html = '<div class="qa-card-result">';
    html += '<div class="result-value">' + result.value + '</div>';
    html += '<div class="result-label">' + result.label + '</div>';
    // 차트 (promotionDate 등 커스텀 시각화)
    if (result.chartHTML) html += result.chartHTML;
    if (result.details && result.details.length) {
      html += '<div style="margin-top:10px;">';
      result.details.forEach(function(d) {
        html += '<div class="result-row"><span class="key">' + d.key + '</span><span class="val">' + d.val + '</span></div>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  // +/− 버튼용 스텝 조절 (cardId 파라미터 추가, min/max 준수)
  _otStep(id, delta, cardId) {
    var el = document.getElementById(id);
    if (!el) return;
    var val = Math.round(((parseFloat(el.value) || 0) + delta) * 4) / 4;
    var minV = parseFloat(el.getAttribute('min'));
    var maxV = parseFloat(el.getAttribute('max'));
    if (!isNaN(minV)) val = Math.max(minV, val);
    if (!isNaN(maxV)) val = Math.min(maxV, val);
    el.value = val;
    PAYROLL.recalc(cardId || 'overtimeCalc');
  },

  toggle(cardId) {
    this.expandedCard = this.expandedCard === cardId ? null : cardId;
    this.init();
  },

  // 입력값 보존 방식으로 재계산: init() 전후 입력값 스냅샷/복원
  recalc(cardId) {
    var snapshot = {};
    var els = document.querySelectorAll('#qaCardsContainer input, #qaCardsContainer select');
    els.forEach(function(el) { if (el.id) snapshot[el.id] = el.value; });
    this.init();
    Object.keys(snapshot).forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = snapshot[id];
    });
  }
};

// 호환층 — IIFE 모듈 / regulation-views.js 가 window.PAYROLL 참조 (Phase 3-F 검토 후 제거)
if (typeof window !== 'undefined') {
  window.PAYROLL = PAYROLL;
}

// Phase 3-B: PAYROLL inline onclick / oninput → data-action 위임 등록
import { registerActions, registerInputActions } from './shared-utils.js';

registerActions({
  payrollOtStep: (el) => PAYROLL._otStep(
    el.dataset.payrollId,
    parseFloat(el.dataset.payrollDelta),
    el.dataset.payrollSection,
  ),
  // qa-card 토글: 자식 .qa-card-body 안 click 은 무시 (input/select/+- 버튼이 카드를 닫지 않게)
  payrollToggle: (el, e) => {
    if (e.target.closest && e.target.closest('.qa-card-body')) return;
    PAYROLL.toggle(el.dataset.cardId);
  },
  payrollSavePromoData: () => PAYROLL._savePromoData(),
  // switchToProfileTab — profile-tab.js 가 노출 (window.switchToProfileTab)
  switchToProfileTab: () => window.switchToProfileTab && window.switchToProfileTab(),
});

registerInputActions({
  payrollRecalc: (el) => PAYROLL.recalc(el.dataset.payrollSection),
});

// ot-step-btn 의 mousedown preventDefault — focus 이동 방지 (기존 onmousedown 대체)
if (typeof document !== 'undefined') {
  document.addEventListener('mousedown', (e) => {
    if (e.target.classList && e.target.classList.contains('ot-step-btn')) {
      e.preventDefault();
    }
  });
}
