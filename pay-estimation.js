// pay-estimation.js — 급여 계산 + 예상액

// ═══════════ 🧾 급여 시뮬레이터 ═══════════
function calculatePayroll() {
  const profile = PROFILE.load();
  let params;

  if (profile) {
    const serviceYears = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
    params = {
      jobType: profile.jobType,
      grade: profile.grade,
      year: parseInt(profile.year),
      adjustPay: parseInt(profile.adjustPay) || 0,
      upgradeAdjustPay: parseInt(profile.upgradeAdjustPay) || 0,
      hasMilitary: profile.hasMilitary,
      militaryMonths: parseInt(profile.militaryMonths) || 24,
      hasSeniority: profile.hasSeniority,
      seniorityYears: profile.hasSeniority ? serviceYears : 0,
      longServiceYears: serviceYears,
      numFamily: parseInt(profile.numFamily) || 0,
      numChildren: parseInt(profile.numChildren) || 0,
      childrenUnder6Pay: parseInt(profile.childrenUnder6Pay) || 0,
      specialPay: parseInt(profile.specialPay) || 0,
      positionPay: parseInt(profile.positionPay) || 0,
      workSupportPay: parseInt(profile.workSupportPay) || 0,
    };
  } else {
    // 수동 입력
    const serviceYears = parseInt(document.getElementById('psServiceYears')?.value) || 0;
    params = {
      jobType: document.getElementById('psJobType').value,
      grade: document.getElementById('psGrade').value,
      year: parseInt(document.getElementById('psYear').value),
      adjustPay: parseInt(document.getElementById('psAdjust')?.value) || 0,
      hasMilitary: document.getElementById('psMilitary')?.checked || false,
      militaryMonths: 24,
      hasSeniority: document.getElementById('psSeniority')?.checked || false,
      seniorityYears: document.getElementById('psSeniority')?.checked ? serviceYears : 0,
      longServiceYears: serviceYears,
      numFamily: 0, numChildren: 0, childrenUnder6Pay: 0,
    };
  }

  // 월별 변동사항
  params.workDays = parseInt(document.getElementById('psWorkDays').value) || 22;
  params.isHolidayMonth = document.getElementById('psHolidayMonth').checked;
  // 가계지원비 미지급월 여부 (autoFillMonth에서 설정한 값 사용)
  const familySkipData = document.getElementById('psHolidayMonth').dataset.familySkip;
  params.isFamilySupportMonth = familySkipData !== '1';  // '1'이면 skip, 그 외는 지급
  params.overtimeHours = parseFloat(document.getElementById('psOvertime').value) || 0;
  params.nightHours = parseFloat(document.getElementById('psNight').value) || 0;
  params.holidayWorkHours = parseFloat(document.getElementById('psHoliday').value) || 0;
  params.nightShiftCount = parseInt(document.getElementById('psNightShiftCount').value) || 0;

  const r = CALC.calcPayrollSimulation(params);
  if (!r) {
    document.getElementById('payrollResult').innerHTML = '<div class="warning-box">⚠️ 계산 오류: 직종/등급을 확인해주세요.</div>';
    return;
  }

  let html = `
    <div class="card-title"><span class="icon emerald">📊</span> 시뮬레이션 결과</div>
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card">
        <div class="stat-value" style="color:var(--accent-indigo)">${CALC.formatCurrency(r.급여총액)}</div>
        <div class="stat-label">급여총액</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--accent-rose)">${CALC.formatCurrency(r.공제총액)}</div>
        <div class="stat-label">공제총액</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--accent-emerald)">${CALC.formatCurrency(r.실지급액)}</div>
        <div class="stat-label">실지급액</div>
      </div>
    </div>

    <div class="result-box">
      <div class="result-label">통상임금 (시급 ${CALC.formatCurrency(r.시급)})</div>
      <div class="result-total">${CALC.formatCurrency(r.통상임금)}</div>
    </div>

    <hr class="divider">
    <div class="card-title" style="font-size:var(--text-body-large);"><span class="icon indigo">💰</span> 지급내역</div>
    `;

  Object.entries(r.지급내역).forEach(([key, val]) => {
    if (val > 0) {
      html += `<div class="result-row"><span class="key">${key}</span><span class="val accent">${CALC.formatCurrency(val)}</span></div>`;
    }
  });

  html += `
    <div class="result-row" style="font-weight:700; border-top:2px solid var(--border); padding-top:8px; margin-top:8px;">
      <span class="key">지급 합계</span>
      <span class="val">${CALC.formatCurrency(r.급여총액)}</span>
    </div>

    <hr class="divider">
    <div class="card-title" style="font-size:var(--text-body-large);"><span class="icon rose">📝</span> 공제내역</div>
    `;

  Object.entries(r.공제내역).forEach(([key, val]) => {
    if (val > 0) {
      html += `<div class="result-row"><span class="key">${key}</span><span class="val" style="color:var(--accent-rose)">${CALC.formatCurrency(val)}</span></div>`;
    }
  });

  html += `
    <div class="result-row" style="font-weight:700; border-top:2px solid var(--border); padding-top:8px; margin-top:8px;">
      <span class="key">공제 합계</span>
      <span class="val" style="color:var(--accent-rose)">${CALC.formatCurrency(r.공제총액)}</span>
    </div>

    <div class="warning-box">💡 소득세·주민세는 간이세액표 기반 <strong>근사치</strong>입니다.<br>
    사학연금부담금, 노동조합비 등 개인별 공제는 미반영.</div>
    `;

  document.getElementById('payrollResult').innerHTML = html;
}

// ═══════════ 💰 급여 예상 (명세서 스타일 카드뷰) ═══════════

// 현재 선택된 예상 월 (전역)
let payEstYear = new Date().getFullYear();
let payEstMonth = new Date().getMonth() + 1;

// 월별 특이사항 판별
function getMonthFlags(year, month) {
  const flags = {
    isFamilySupportMonth: true,
    isHolidayBonus: false,
    isPerformanceBonus: false,
    isYearEndAdj: false,
    isResidentTaxExtra: false,
    tags: []
  };

  const familySkipMonths = [1, 2, 9];
  if (familySkipMonths.includes(month)) {
    flags.isFamilySupportMonth = false;
    flags.tags.push('가계지원비 미지급월');
  }

  if (month === 1 || month === 2) { flags.isHolidayBonus = true; flags.isFamilySupportMonth = true; flags.tags.push('설 명절지원비'); }
  if (month === 9) { flags.isHolidayBonus = true; flags.isFamilySupportMonth = true; flags.tags.push('추석 명절지원비'); }
  if (month === 5) { flags.isHolidayBonus = true; flags.tags.push('5월 명절지원비'); }
  if (month === 8) { flags.isPerformanceBonus = true; flags.tags.push('성과급 50%'); }
  if (month === 11) { flags.isPerformanceBonus = true; flags.tags.push('성과급 50%'); }
  if (month === 2) { flags.isYearEndAdj = true; flags.tags.push('연말정산'); }
  if (month === 6) { flags.isResidentTaxExtra = true; flags.tags.push('주민세 정기분'); }

  return flags;
}

// 단월 시뮬레이션 (시간외·휴가 실시간 반영)
function calcMonthEstimate(year, month) {
  const profile = PROFILE.load();
  if (!profile) return null;

  const serviceYears = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
  const flags = getMonthFlags(year, month);
  const otStats = OVERTIME.calcMonthlyStats(year, month);

  // 시간외 기록에서 연장/야간/휴일 시간 분리
  const otRecords = OVERTIME.getMonthRecords(year, month);
  let extHours = 0, nightHours = 0, holHours = 0;
  otRecords.forEach(r => {
    if (r.type === 'overtime' || r.type === 'oncall_callout') {
      extHours += r.breakdown?.extended || 0;
      nightHours += r.breakdown?.night || 0;
      holHours += (r.breakdown?.holiday || 0) + (r.breakdown?.holidayNight || 0);
    }
  });

  const params = {
    jobType: profile.jobType,
    grade: profile.grade,
    year: parseInt(profile.year),
    adjustPay: parseInt(profile.adjustPay) || 0,
    upgradeAdjustPay: parseInt(profile.upgradeAdjustPay) || 0,
    hasMilitary: profile.hasMilitary,
    militaryMonths: parseInt(profile.militaryMonths) || 24,
    hasSeniority: profile.hasSeniority,
    seniorityYears: profile.hasSeniority ? serviceYears : 0,
    longServiceYears: serviceYears,
    numFamily: parseInt(profile.numFamily) || 0,
    numChildren: parseInt(profile.numChildren) || 0,
    childrenUnder6Pay: parseInt(profile.childrenUnder6Pay) || 0,
    specialPay: parseInt(profile.specialPay) || 0,
    positionPay: parseInt(profile.positionPay) || 0,
    workSupportPay: parseInt(profile.workSupportPay) || 0,
    workDays: 22,
    isHolidayMonth: flags.isHolidayBonus,
    isFamilySupportMonth: flags.isFamilySupportMonth,
    overtimeHours: extHours,
    nightHours: nightHours,
    holidayWorkHours: holHours,
    nightShiftCount: otStats.nightShiftCount || 0,
  };

  const r = CALC.calcPayrollSimulation(params);
  if (!r) return null;

  const oncallPay = otStats.byType.oncall_standby.pay + otStats.byType.oncall_callout.pay;

  // 온콜 수당을 지급내역에 추가
  if (otStats.byType.oncall_standby.pay > 0) {
    r.지급내역['온콜대기수당'] = otStats.byType.oncall_standby.pay;
  }
  if (otStats.byType.oncall_callout.pay > 0) {
    r.지급내역['온콜출근수당'] = otStats.byType.oncall_callout.pay;
  }

  r.급여총액 += oncallPay;
  r.실지급액 += oncallPay;

  return { result: r, flags, otStats };
}

// 12개월 시뮬레이션 (연간 요약용)
function calcYearlyEstimate(year) {
  const results = [];
  for (let m = 1; m <= 12; m++) {
    const est = calcMonthEstimate(year, m);
    if (!est) continue;
    results.push({
      month: m,
      gross: est.result.급여총액,
      deductions: est.result.공제총액,
      net: est.result.실지급액,
      flags: est.flags,
      otPay: est.otStats.totalPay
    });
  }
  return results;
}

// 금액 포맷
function fmtW(n) { return '₩' + Math.round(n).toLocaleString(); }

// ── 실제 급여 데이터 감지 ──
// 해당 월에 실제 급여명세서가 업로드되어 있으면 반환, 없으면 null
function getActualPayrollData(year, month) {
  if (typeof SALARY_PARSER === 'undefined') return null;
  const data = SALARY_PARSER.loadMonthlyData(year, month, '급여');
  if (!data) return null;
  const s = data.summary;
  if (!s || (s.netPay <= 0 && s.grossPay <= 0)) return null;
  return data;
}

// ── 예상 vs 실제 지급내역 비교 ──
// estimatedItems: {항목명: 금액} (r.지급내역)
// actualItems: [{name, amount}] (data.salaryItems)
// 반환: [{name, estimated, actual, diff, isNew, isMissing, reason}]
function buildPayComparison(estimatedItems, actualItems, year, month, flags) {
  const estMap = {};
  for (const [name, amount] of Object.entries(estimatedItems)) {
    if (amount > 0) estMap[name] = amount;
  }
  const actMap = {};
  (actualItems || []).forEach(item => {
    if (item.amount > 0) actMap[item.name] = item.amount;
  });

  const allNames = new Set([...Object.keys(estMap), ...Object.keys(actMap)]);
  const rows = [];

  allNames.forEach(name => {
    const estimated = estMap[name] ?? 0;
    const actual = actMap[name] ?? 0;
    const diff = actual - estimated;
    const isNew = estimated === 0 && actual > 0;
    const isMissing = actual === 0 && estimated > 0;
    rows.push({
      name,
      estimated,
      actual,
      diff,
      isNew,
      isMissing,
      reason: getComparisonReason(name, diff, year, month, flags, isNew, isMissing),
    });
  });

  // 정렬: 실제 있는 항목 먼저, 그 다음 미지급 항목, 금액 큰 순
  rows.sort((a, b) => {
    if (a.isMissing !== b.isMissing) return a.isMissing ? 1 : -1;
    return b.actual - a.actual;
  });

  return rows;
}

// ── 차이 발생 이유 추론 ──
function getComparisonReason(name, diff, year, month, flags, isNew, isMissing) {
  if (isNew) {
    if (/정산/.test(name)) return '연간 정산 항목 (연 1회 지급)';
    if (/성과급|인센티브/.test(name)) return '성과급 지급월 (8·11월)';
    if (/명절|설|추석/.test(name)) return '명절 지원비 지급월';
    if (/법정공휴일수당/.test(name)) return '해당 월 법정공휴일 근무 발생';
    if (/대체근무|야간근무가산/.test(name)) return '대체·야간 근무 발생';
    return '프로필 미반영 항목 — 내 정보에서 확인해주세요';
  }
  if (isMissing) {
    if (/가계지원비/.test(name) && [1,2,9].includes(month)) return '가계지원비 미지급월 (단, 설·추석월 제외)';
    if (/명절/.test(name)) return '명절 지원비 미지급월';
    if (/성과급/.test(name)) return '성과급 미지급월';
    if (/시간외|야간|휴일/.test(name)) return '해당 월 시간외 근무 없음';
    return '해당 월 미지급 — 예상에만 포함된 항목';
  }
  if (Math.abs(diff) < 1000) return '';
  if (/기본|기준기본|기준급/.test(name)) return '호봉·승급 또는 임금협상 반영';
  if (/근속/.test(name)) return '근속 연수 기준 변동';
  if (/정근/.test(name)) return '정근수당: 근속 6개월 단위 변동';
  if (/시간외|시간외수당/.test(name)) return '실제 시간외 근무 시간 차이';
  if (/소득세|주민세/.test(name)) return '간이세액표 기반 근사치 — 실제와 차이 있을 수 있음';
  if (/건강보험|장기요양|국민연금|고용보험/.test(name)) return '보험료율 또는 정산 반영';
  if (diff > 0) return '실제가 예상보다 높음';
  return '실제가 예상보다 낮음';
}

// 히어로 카드 + 월 선택 슬라이더 렌더링
// (모든 동적 값은 fmtW(숫자) 또는 escapeHtml()을 통해 처리됩니다)
function renderPayEstHero() {
  const el = document.getElementById('payEstHero');
  if (!el) return;

  const profile = PROFILE.load();
  if (!profile) {
    el.innerHTML = `<div class="card" style="text-align:center; padding:28px;">
      <div style="font-size:var(--text-title-large); margin-bottom:8px; font-weight:800;">급여 예상</div>
      <p style="color:var(--text-muted);">내 정보를 저장하면 월별 예상 급여가 자동 계산됩니다.</p>
      <button class="btn btn-primary" onclick="switchToProfileTab()" style="margin-top:12px;">내 정보 입력하기</button>
    </div>`;
    return;
  }

  const est = calcMonthEstimate(payEstYear, payEstMonth);
  if (!est) { el.innerHTML = ''; return; }
  const r = est.result;
  const flags = est.flags;
  const otStats = est.otStats;

  // 실제 데이터 확인
  const actualData = getActualPayrollData(payEstYear, payEstMonth);
  const hasActual = !!actualData;

  // 특이사항 태그
  let tagsHtml = '';
  if (flags.tags.length > 0) {
    tagsHtml = flags.tags.map(t => `<span class="pe-tag">${escapeHtml(t)}</span>`).join('');
  }
  if (otStats.totalPay > 0) {
    tagsHtml += `<span class="pe-tag ot">시간외·온콜 ${fmtW(otStats.totalPay)} 반영</span>`;
  }

  if (hasActual) {
    // ── 실제 데이터 모드 ──
    const actNet = actualData.summary.netPay;
    const actGross = actualData.summary.grossPay;
    const actDed = actualData.summary.totalDeduction;
    const netDiff = actNet - r.실지급액;
    const netDiffSign = netDiff >= 0 ? '+' : '';
    const netDiffClass = netDiff > 0 ? 'pe-hero-cmp-up' : netDiff < 0 ? 'pe-hero-cmp-down' : 'pe-hero-cmp-zero';

    el.innerHTML = `
      <div class="pe-month-slider">
        <button class="pe-nav-btn" onclick="changePayEstMonth(-1)">◀</button>
        <span class="pe-month-label">${payEstYear}년 ${payEstMonth}월 실제</span>
        <button class="pe-nav-btn" onclick="changePayEstMonth(1)">▶</button>
      </div>
      <div class="pe-hero-card pe-hero-actual">
        <div class="pe-hero-net-label">실지급액</div>
        <div class="pe-hero-net">${fmtW(actNet)}</div>
        <div class="pe-hero-summary">
          <span class="pe-hero-gross">지급 ${fmtW(actGross)}</span>
          <span class="pe-hero-sep">—</span>
          <span class="pe-hero-ded">공제 ${fmtW(actDed)}</span>
        </div>
        <div class="pe-hero-cmp-row">
          <span class="pe-hero-cmp-label">예상 대비</span>
          <span class="${netDiffClass}">${netDiffSign}${fmtW(netDiff)}</span>
          <span class="pe-hero-cmp-est">예상 ${fmtW(r.실지급액)}</span>
        </div>
        ${tagsHtml ? `<div class="pe-tags">${tagsHtml}</div>` : ''}
      </div>`;
  } else {
    // ── 예상 모드 (기존) ──
    el.innerHTML = `
      <div class="pe-month-slider">
        <button class="pe-nav-btn" onclick="changePayEstMonth(-1)">◀</button>
        <span class="pe-month-label">${payEstYear}년 ${payEstMonth}월 예상</span>
        <button class="pe-nav-btn" onclick="changePayEstMonth(1)">▶</button>
      </div>
      <div class="pe-hero-card">
        <div class="pe-hero-net-label">예상 실수령액</div>
        <div class="pe-hero-net">${fmtW(r.실지급액)}</div>
        <div class="pe-hero-summary">
          <span class="pe-hero-gross">지급 ${fmtW(r.급여총액)}</span>
          <span class="pe-hero-sep">—</span>
          <span class="pe-hero-ded">공제 ${fmtW(r.공제총액)}</span>
        </div>
        ${tagsHtml ? `<div class="pe-tags">${tagsHtml}</div>` : ''}
      </div>`;
  }
}

// 월 변경
function changePayEstMonth(delta) {
  payEstMonth += delta;
  if (payEstMonth > 12) { payEstMonth = 1; payEstYear++; }
  if (payEstMonth < 1) { payEstMonth = 12; payEstYear--; }
  renderPayEstHero();
  renderPayEstDetail();
}

// 상세 명세서 스타일 카드 렌더링
function renderPayEstDetail() {
  const el = document.getElementById('payEstTimeline');
  if (!el) return;

  const profile = PROFILE.load();
  if (!profile) { el.innerHTML = ''; return; }

  const est = calcMonthEstimate(payEstYear, payEstMonth);
  if (!est) { el.innerHTML = ''; return; }
  const r = est.result;
  const otStats = est.otStats;

  // 실제 데이터 확인
  const actualData = getActualPayrollData(payEstYear, payEstMonth);
  const hasActual = !!actualData;

  let payRows = '';
  let dedRows = '';

  if (hasActual) {
    // ── 비교 모드: 2층 행 (실제 + 예상 차이) ──
    const payComparison = buildPayComparison(
      r.지급내역, actualData.salaryItems, payEstYear, payEstMonth, est.flags
    );
    const dedComparison = buildPayComparison(
      r.공제내역, actualData.deductionItems, payEstYear, payEstMonth, est.flags
    );

    payComparison.forEach(item => {
      payRows += buildCompareRow(item, false);
    });
    dedComparison.forEach(item => {
      dedRows += buildCompareRow(item, true);
    });
  } else {
    // ── 예상 모드 (기존) ──
    for (const [name, amount] of Object.entries(r.지급내역)) {
      if (amount <= 0) continue;
      payRows += `
        <div class="pe-item-row">
          <div class="pe-item-name">${escapeHtml(name)}</div>
          <div class="pe-item-amount">${fmtW(amount)}</div>
        </div>`;
    }
    for (const [name, amount] of Object.entries(r.공제내역)) {
      if (amount <= 0) continue;
      dedRows += `
        <div class="pe-item-row">
          <div class="pe-item-name">${escapeHtml(name)}</div>
          <div class="pe-item-amount ded">${fmtW(amount)}</div>
        </div>`;
    }
  }

  // ── 시간외·온콜 상세 내역 (기록이 있을 때) ──
  let otSummary = '';
  if (otStats.recordCount > 0) {
    const records = OVERTIME.getMonthRecords(payEstYear, payEstMonth);
    const hourlyRate = r.시급 || 0;
    const rates = DATA.allowances.overtimeRates;

    let totalExt = 0, totalNgt = 0, totalHol = 0, totalHolNgt = 0;
    records.forEach(rec => {
      if (rec.type === 'overtime' || rec.type === 'oncall_callout') {
        totalExt += rec.breakdown?.extended || 0;
        totalNgt += rec.breakdown?.night || 0;
        totalHol += rec.breakdown?.holiday || 0;
        totalHolNgt += rec.breakdown?.holidayNight || 0;
      }
    });

    const extPay = Math.round(totalExt * hourlyRate * rates.extended);
    const ngtPay = Math.round(totalNgt * hourlyRate * rates.night);
    const holBasePay = Math.round(Math.min(totalHol, 8) * hourlyRate * rates.holiday);
    const holOverPay = Math.round(Math.max(totalHol - 8, 0) * hourlyRate * rates.holidayOver8);
    const holPay = holBasePay + holOverPay;
    const holNgtPay = Math.round(totalHolNgt * hourlyRate * rates.holidayNight);
    const standbyPay = otStats.byType.oncall_standby.pay;
    const transportPay = otStats.byType.oncall_callout.count * DATA.allowances.onCallTransport;

    let otRows = '';
    if (otStats.byType.overtime.count > 0) {
      otRows += `<div class="pe-ot-category-title">시간외근무 ${otStats.byType.overtime.count}건</div>`;
    }
    if (totalExt > 0) {
      otRows += `<div class="pe-item-row"><div class="pe-item-name">연장 ${totalExt.toFixed(1)}h × ${fmtW(hourlyRate)} × 150%</div><div class="pe-item-amount">${fmtW(extPay)}</div></div>`;
    }
    if (totalNgt > 0) {
      otRows += `<div class="pe-item-row"><div class="pe-item-name">야간 ${totalNgt.toFixed(1)}h × ${fmtW(hourlyRate)} × 200%</div><div class="pe-item-amount">${fmtW(ngtPay)}</div></div>`;
    }
    if (totalHol > 0) {
      otRows += `<div class="pe-item-row"><div class="pe-item-name">휴일 ${totalHol.toFixed(1)}h × ${fmtW(hourlyRate)} × 150~200%</div><div class="pe-item-amount">${fmtW(holPay)}</div></div>`;
    }
    if (totalHolNgt > 0) {
      otRows += `<div class="pe-item-row"><div class="pe-item-name">휴일야간 ${totalHolNgt.toFixed(1)}h × ${fmtW(hourlyRate)} × 200%</div><div class="pe-item-amount">${fmtW(holNgtPay)}</div></div>`;
    }
    if (otStats.byType.oncall_standby.count > 0) {
      otRows += `<div class="pe-ot-category-title">온콜대기 ${otStats.byType.oncall_standby.count}일</div>`;
      otRows += `<div class="pe-item-row"><div class="pe-item-name">대기수당 ${otStats.byType.oncall_standby.count}일 × ${fmtW(DATA.allowances.onCallStandby)}</div><div class="pe-item-amount">${fmtW(standbyPay)}</div></div>`;
    }
    if (otStats.byType.oncall_callout.count > 0) {
      otRows += `<div class="pe-ot-category-title">온콜출근 ${otStats.byType.oncall_callout.count}건</div>`;
      otRows += `<div class="pe-item-row"><div class="pe-item-name">교통비 ${otStats.byType.oncall_callout.count}건 × ${fmtW(DATA.allowances.onCallTransport)}</div><div class="pe-item-amount">${fmtW(transportPay)}</div></div>`;
    }

    otSummary = `
      <div class="pe-section-card pe-ot-summary">
        <div class="pe-section-title">시간외·온콜 반영 내역</div>
        ${otRows}
        <div class="pe-item-row pe-total-row">
          <div class="pe-item-name">시간외·온콜 합계</div>
          <div class="pe-item-amount">${fmtW(otStats.totalPay)}</div>
        </div>
      </div>`;
  }

  // ── 연간 미니 요약 ──
  const yearly = calcYearlyEstimate(payEstYear);
  let yearSummary = '';
  if (yearly && yearly.length > 0) {
    const totalNet = yearly.reduce((a, rr) => a + rr.net, 0);
    const avgNet = Math.round(totalNet / yearly.length);
    const maxR = yearly.reduce((a, b) => a.net > b.net ? a : b);
    const minR = yearly.reduce((a, b) => a.net < b.net ? a : b);

    yearSummary = `
      <div class="pe-section-card pe-year-summary">
        <div class="pe-section-title">${payEstYear}년 연간 요약</div>
        <div class="pe-year-grid">
          <div class="pe-year-item">
            <div class="pe-year-label">연간 합계</div>
            <div class="pe-year-value">${fmtW(totalNet)}</div>
          </div>
          <div class="pe-year-item">
            <div class="pe-year-label">월평균</div>
            <div class="pe-year-value">${fmtW(avgNet)}</div>
          </div>
          <div class="pe-year-item">
            <div class="pe-year-label">최고 (${maxR.month}월)</div>
            <div class="pe-year-value">${fmtW(maxR.net)}</div>
          </div>
          <div class="pe-year-item">
            <div class="pe-year-label">최저 (${minR.month}월)</div>
            <div class="pe-year-value">${fmtW(minR.net)}</div>
          </div>
        </div>
        <div class="pe-year-bars">
          ${yearly.map(yr => {
            const pct = Math.round((yr.net / maxR.net) * 100);
            const isCur = yr.month === payEstMonth;
            return `<div class="pe-bar-col ${isCur ? 'cur' : ''}" onclick="payEstMonth=${yr.month};initPayEstimate();" title="${yr.month}월: ${fmtW(yr.net)}">
              <div class="pe-bar" style="height:${pct}%"></div>
              <span class="pe-bar-label">${yr.month}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // ── 지급/공제 책갈피 토글 현재 상태 유지 ──
  const curToggle = el.querySelector('.pe-detail-toggle .active');
  const activeView = curToggle ? curToggle.dataset.view : 'pay';

  // 실제 데이터 있을 때 합계 소스: 실제, 없으면 예상
  const grossTotal = hasActual ? actualData.summary.grossPay : r.급여총액;
  const dedTotal = hasActual ? actualData.summary.totalDeduction : r.공제총액;
  const payLabel = hasActual ? '지급 내역' : '예상 지급 내역';
  const dedLabel = hasActual ? '공제 내역' : '예상 공제 내역';

  el.innerHTML = `
    <div class="pe-section-card">
      <nav class="pe-detail-toggle">
        <button class="pe-toggle-btn ${activeView === 'pay' ? 'active' : ''}" data-view="pay">${payLabel}</button>
        <button class="pe-toggle-btn ${activeView === 'ded' ? 'active' : ''}" data-view="ded">${dedLabel}</button>
      </nav>
      <div class="pe-detail-pane ${activeView === 'pay' ? 'active' : ''}" id="peDetailPay">
        ${payRows}
        <div class="pe-item-row pe-total-row">
          <div class="pe-item-name">지급 합계</div>
          <div class="pe-item-amount">${fmtW(grossTotal)}</div>
        </div>
      </div>
      <div class="pe-detail-pane ${activeView === 'ded' ? 'active' : ''}" id="peDetailDed">
        ${dedRows}
        <div class="pe-item-row pe-total-row">
          <div class="pe-item-name">공제 합계</div>
          <div class="pe-item-amount ded">${fmtW(dedTotal)}</div>
        </div>
        ${!hasActual ? `<div class="pe-ded-note">소득세·주민세는 간이세액표 기반 근사치입니다.<br>사학연금부담금, 노동조합비 등 개인별 공제는 미반영.</div>` : ''}
      </div>
    </div>
    ${otSummary}
    ${yearSummary}`;

  // ── 토글 이벤트 바인딩 ──
  el.querySelectorAll('.pe-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.pe-toggle-btn').forEach(b => b.classList.remove('active'));
      el.querySelectorAll('.pe-detail-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      el.querySelector('#peDetail' + (btn.dataset.view === 'pay' ? 'Pay' : 'Ded')).classList.add('active');
    });
  });
}

// ── 비교 행 렌더링 (2층: 실제금액 + 예상/차이) ──
// item: {name, estimated, actual, diff, isNew, isMissing, reason}
// isDeduction: 공제 항목이면 true (빨간 색상)
function buildCompareRow(item, isDeduction) {
  const { name, estimated, actual, diff, isNew, isMissing, reason } = item;

  // 미지급 항목: 예상에만 있음
  if (isMissing) {
    return `
      <div class="pe-item-row pe-cmp-row pe-cmp-missing">
        <div class="pe-cmp-left">
          <span class="pe-item-name pe-cmp-name-muted">${escapeHtml(name)}</span>
          <span class="pe-cmp-badge pe-cmp-badge-missing">미지급</span>
        </div>
        <div class="pe-cmp-right">
          <span class="pe-cmp-actual pe-cmp-muted">—</span>
          <span class="pe-cmp-meta">예상 ${fmtW(estimated)}</span>
          ${reason ? `<span class="pe-cmp-reason">${escapeHtml(reason)}</span>` : ''}
        </div>
      </div>`;
  }

  const diffSign = diff >= 0 ? '+' : '';
  const diffClass = diff > 0 ? 'pe-cmp-up' : diff < 0 ? 'pe-cmp-down' : 'pe-cmp-zero';
  const amountClass = isDeduction ? 'pe-item-amount ded' : 'pe-item-amount';
  const hasDiff = Math.abs(diff) >= 1000;

  // 신규 항목: 실제에만 있음
  if (isNew) {
    return `
      <div class="pe-item-row pe-cmp-row pe-cmp-new">
        <div class="pe-cmp-left">
          <span class="pe-item-name">${escapeHtml(name)}</span>
          <span class="pe-cmp-badge pe-cmp-badge-new">신규</span>
        </div>
        <div class="pe-cmp-right">
          <span class="${amountClass}">${fmtW(actual)}</span>
          ${reason ? `<span class="pe-cmp-reason">${escapeHtml(reason)}</span>` : ''}
        </div>
      </div>`;
  }

  // 공통 항목: 실제 + 차이
  return `
    <div class="pe-item-row pe-cmp-row">
      <div class="pe-cmp-left">
        <span class="pe-item-name">${escapeHtml(name)}</span>
      </div>
      <div class="pe-cmp-right">
        <span class="${amountClass}">${fmtW(actual)}</span>
        ${hasDiff
          ? `<span class="pe-cmp-diff ${diffClass}">${diffSign}${fmtW(diff)}</span>
             <span class="pe-cmp-meta">예상 ${fmtW(estimated)}</span>`
          : `<span class="pe-cmp-zero-mark">예상일치</span>`
        }
        ${reason && hasDiff ? `<span class="pe-cmp-reason">${escapeHtml(reason)}</span>` : ''}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════
// ██ PayrollImprovementAgent
// 실제 급여 데이터 업로드 시 자동 호출:
//  1. 비교 데이터 누적 저장 (payroll_compare_history)
//  2. 프로필 자동 보정 (안정적 항목 + 실제값으로 업데이트)
// ══════════════════════════════════════════════
const PayrollImprovementAgent = (() => {
  'use strict';

  const HISTORY_KEY = 'payroll_compare_history';

  function load() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
  }

  function save(data) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
  }

  // 비교 데이터 누적 저장
  function record(year, month, estimated, actual) {
    const items = buildPayComparison(
      estimated.지급내역 || {}, actual.salaryItems || [], year, month,
      getMonthFlags(year, month)
    );
    const dedItems = buildPayComparison(
      estimated.공제내역 || {}, actual.deductionItems || [], year, month,
      getMonthFlags(year, month)
    );

    const history = load();
    // 같은 월 데이터는 덮어쓰기
    const idx = history.findIndex(h => h.year === year && h.month === month);
    const entry = {
      year, month,
      savedAt: new Date().toISOString(),
      netDiff: (actual.summary?.netPay || 0) - (estimated.실지급액 || 0),
      grossDiff: (actual.summary?.grossPay || 0) - (estimated.급여총액 || 0),
      items: items.map(i => ({ name: i.name, estimated: i.estimated, actual: i.actual, diff: i.diff })),
      dedItems: dedItems.map(i => ({ name: i.name, estimated: i.estimated, actual: i.actual, diff: i.diff })),
    };
    if (idx >= 0) history[idx] = entry; else history.unshift(entry);
    // 최근 24개월만 보관
    save(history.slice(0, 24));
    return entry;
  }

  // 프로필 자동 보정
  // 실제 명세서에서 확인된 항목 → 프로필 필드에 반영
  // 반환: {changed: bool, applied: [{name, from, to}]}
  function applyToProfile(year, month) {
    const actual = typeof SALARY_PARSER !== 'undefined'
      ? SALARY_PARSER.loadMonthlyData(year, month, '급여')
      : null;
    if (!actual) return { changed: false, applied: [] };

    const profile = PROFILE.load() || {};
    const applied = [];

    // SALARY_PARSER의 기존 안정 항목 반영 로직 위임
    const base = SALARY_PARSER.applyStableItemsToProfile(actual);
    if (base.changed) {
      base.applied.forEach(a => applied.push({ name: a.name, note: a.note }));
    }

    // 추가: 실제 명세서에서 예상과 차이 나는 항목 중 프로필 보정 가능한 것
    const payMap = {};
    (actual.salaryItems || []).forEach(i => { payMap[i.name] = i.amount; });

    // 조정급 계열 (adjustPay)
    const adjNames = ['조정급', '승급조정급', '조정수당'];
    for (const n of adjNames) {
      if (payMap[n] && payMap[n] > 0 && payMap[n] !== (parseInt(profile.adjustPay) || 0)) {
        applied.push({ name: n, from: profile.adjustPay, to: payMap[n] });
        profile.adjustPay = payMap[n];
      }
    }

    // 직책수당 (positionPay)
    const poNames = ['직책수당', '직책급'];
    for (const n of poNames) {
      if (payMap[n] && payMap[n] > 0 && payMap[n] !== (parseInt(profile.positionPay) || 0)) {
        applied.push({ name: n, from: profile.positionPay, to: payMap[n] });
        profile.positionPay = payMap[n];
        break;
      }
    }

    // 업무보조비 (workSupportPay)
    if (payMap['업무보조비'] && payMap['업무보조비'] > 0 && payMap['업무보조비'] !== (parseInt(profile.workSupportPay) || 0)) {
      applied.push({ name: '업무보조비', from: profile.workSupportPay, to: payMap['업무보조비'] });
      profile.workSupportPay = payMap['업무보조비'];
    }

    if (applied.length > 0) {
      PROFILE.save(profile);
      if (typeof PROFILE.applyToForm === 'function' && typeof PROFILE_FIELDS !== 'undefined') {
        PROFILE.applyToForm(profile, PROFILE_FIELDS);
      }
    }

    return { changed: applied.length > 0, applied };
  }

  // 실제 데이터 업로드 완료 시 호출 (salary-parser.js의 저장 후 hook)
  // year, month 에 해당하는 실제+예상 데이터를 비교·저장·보정
  function runOnActualUpload(year, month) {
    const actual = typeof SALARY_PARSER !== 'undefined'
      ? SALARY_PARSER.loadMonthlyData(year, month, '급여')
      : null;
    if (!actual) return;

    const est = calcMonthEstimate(year, month);
    if (!est) return;

    record(year, month, est.result, actual);
    const result = applyToProfile(year, month);
    return result;
  }

  return { record, applyToProfile, runOnActualUpload, load };
})();

// 지급 항목별 계산 근거 설명
function getItemDesc(name, year, month, est) {
  const flags = est.flags;
  if (name === '가계지원비') return '연간 11개월 균등 지급 (1·9월 미지급, 단 설/추석 해당 월은 지급)';
  if (name === '명절지원비') {
    if (month === 1 || month === 2) return '설 명절지원비 — 기준기본급 기준';
    if (month === 9) return '추석 명절지원비 — 기준기본급 기준';
    if (month === 5) return '5월 명절지원비';
    return '';
  }
  if (name === '시간외수당') return `연장근무 시간 × 통상시급 × 1.5`;
  if (name === '야간수당') return `야간근무(22~06시) × 통상시급 × 2.0`;
  if (name === '휴일수당') return `휴일근무 시간 × 통상시급 × 1.5~2.0`;
  if (name === '온콜대기수당') return `온콜대기 ${est.otStats.byType.oncall_standby.count}일 × 대기수당`;
  if (name === '온콜출근수당') return `온콜출근 ${est.otStats.byType.oncall_callout.count}건 (실근무+출퇴근 인정)`;
  if (name === '야간근무가산금') return `야간근무 ${est.otStats.nightShiftCount}회 × 가산금`;
  if (name === '급식보조비') return '비과세 한도 내 지급';
  if (name === '교통보조비') return '비과세 한도 내 지급';
  if (name === '장기근속수당') return '근속연수 기준 정액';
  if (name === '군복무수당') return '군복무 개월수 기준 산정';
  return '';
}

// 공제 항목별 설명
function getDeductionDesc(name, r) {
  if (name === '국민건강보험') return `급여총액 × 3.545%`;
  if (name === '장기요양보험') return `건강보험료 × 12.95%`;
  if (name === '국민연금') return `급여총액 × 4.5%`;
  if (name === '고용보험') return `급여총액 × 0.9%`;
  if (name === '식대공제') return `근무일수 × 3,000원`;
  if (name.includes('소득세')) return `간이세액표 기준 근사치`;
  if (name.includes('주민세')) return `소득세 × 10%`;
  return '';
}

// 급여 예상 탭 초기화
function initPayEstimate() {
  renderPayEstHero();
  renderPayEstDetail();
}
