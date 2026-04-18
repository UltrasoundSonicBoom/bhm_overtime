// ============================================
// 병원 HR 종합 시스템 - 앱 로직
// ============================================

// ── HTML 이스케이프 (XSS 방지) ──
// innerHTML에 사용자 입력값을 삽입할 때 반드시 이 함수를 거칠 것
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── 프로필 필드 매핑 ──
const PROFILE_FIELDS = {
  name: 'pfName',
  employeeNumber: 'pfEmployeeNumber',
  gender: 'pfGender',
  jobType: 'pfJobType',
  department: 'pfDepartment',
  grade: 'pfGrade',
  year: 'pfYear',
  birthDate: 'pfBirthDate',
  hireDate: 'pfHireDate',
  adjustPay: 'pfAdjust',
  upgradeAdjustPay: 'pfUpgradeAdjust',
  hasMilitary: 'pfMilitary',
  militaryMonths: 'pfMilitaryMonths',
  hasSeniority: 'pfSeniority',
  numFamily: 'pfFamily',
  numChildren: 'pfChildren',
  childrenUnder6Pay: 'pfChildrenUnder6Pay',
  specialPay: 'pfSpecial',
  positionPay: 'pfPosition',
  workSupportPay: 'pfWorkSupport',
  weeklyHours: 'pfWeeklyHours',
  promotionDate: 'pfPromotionDate',
  unionStepAdjust: 'pfUnionStepAdjust'
};

function getCaptureParams() {
  return new URLSearchParams(window.location.search);
}

// ── 홈 탭 기간 상태 ──
var _homePeriod = 'month'; // 'month' | 'year'

function switchHomePeriod(period) {
  _homePeriod = period;
  document.querySelectorAll('.home-period-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.period === period);
  });
  initHomeTab();
}
window.switchHomePeriod = switchHomePeriod;

// ── 홈 탭 ──
function initHomeTab() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // 프로필에서 totalAnnual 계산 (leave 뷰 공통)
  const profile = PROFILE.load();
  let totalAnnual = 0;
  if (profile && profile.hireDate) {
    const parsed = PROFILE.parseDate(profile.hireDate);
    if (parsed) {
      const result = CALC.calcAnnualLeave(new Date(parsed));
      if (result) totalAnnual = result.totalLeave;
    }
  }

  if (_homePeriod === 'month') {
    _renderHomeOtMonth(year, month);
    _renderHomeLeaveMonth(year, month, totalAnnual);
  } else {
    _renderHomeOtYear(year);
    _renderHomeLeaveYear(year, totalAnnual);
  }

  loadNotice();
  loadChangelog();
  // 프로필 미저장 힌트 배너
  const homeNudge = document.getElementById('homeProfileNudge');
  if (homeNudge) homeNudge.style.display = (!profile || !profile.jobType) ? 'block' : 'none';
}
window.initHomeTab = initHomeTab;

// 월 시간외 렌더
function _renderHomeOtMonth(year, month) {
  const otStats = OVERTIME.calcMonthlyStats(year, month);
  const supp = otStats.payslipSupplement;
  const otBody = document.getElementById('homeOtBody');
  const otStatsEl = document.getElementById('homeOtStats');

  const effectiveOtHours = otStats.byType.overtime.hours + (supp ? supp.totalHours : 0);
  const effectivePay = otStats.totalPay + (supp ? supp.pay : 0);
  const hasData = otStats.recordCount > 0 || supp;

  if (hasData) {
    while (otStatsEl.firstChild) otStatsEl.removeChild(otStatsEl.firstChild);

    const period = document.createElement('div');
    period.className = 'home-stat-period';
    period.textContent = month + '월 현황';
    otStatsEl.appendChild(period);

    const addRow = (label, value, cls) => {
      const row = document.createElement('div');
      row.className = 'home-stat-row';
      const lbl = document.createElement('span');
      lbl.className = 'home-stat-label';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.className = 'home-stat-value' + (cls ? ' ' + cls : '');
      val.textContent = value;
      row.appendChild(lbl);
      row.appendChild(val);
      otStatsEl.appendChild(row);
    };

    if (effectiveOtHours > 0) addRow('시간외', effectiveOtHours + '시간');
    if (otStats.byType.oncall_standby.count > 0) addRow('온콜 대기', otStats.byType.oncall_standby.count + '일');
    if (otStats.byType.oncall_callout.count > 0) addRow('온콜 출동', otStats.byType.oncall_callout.count + '회');
    if (effectivePay > 0) addRow('예상 수당', '\u20A9' + effectivePay.toLocaleString(), 'amber');

    otBody.style.display = '';
  } else {
    otBody.style.display = 'none';
  }
}

// 연간 시간외 렌더
function _renderHomeOtYear(year) {
  const s = OVERTIME.calcYearlyStats(year);
  const otBody = document.getElementById('homeOtBody');
  const otStatsEl = document.getElementById('homeOtStats');

  if (s.recordCount > 0) {
    const oncallCount = s.totalOncallStandbyCount + s.totalOncallCalloutCount;
    const lines = ['<div class="home-stat-period">' + year + '년 합계</div>'];
    if (s.totalOvertimeHours > 0) {
      lines.push('<div class="home-stat-row"><span class="home-stat-label">시간외</span><span class="home-stat-value">' + s.totalOvertimeHours + '시간</span></div>');
    }
    if (oncallCount > 0) {
      lines.push('<div class="home-stat-row"><span class="home-stat-label">온콜</span><span class="home-stat-value">' + oncallCount + '회 / ' + s.totalOncallHours + '시간</span></div>');
    }
    if (s.totalPay > 0) {
      lines.push('<div class="home-stat-row"><span class="home-stat-label">예상 수당</span><span class="home-stat-value amber">₩' + s.totalPay.toLocaleString() + '</span></div>');
    }
    otStatsEl.innerHTML = lines.join('');
    otBody.style.display = '';
  } else {
    otBody.style.display = 'none';
  }
}

// 월 연차 렌더
function _renderHomeLeaveMonth(year, month, totalAnnual) {
  const leaveBody = document.getElementById('homeLeaveBody');
  const leaveStatsEl = document.getElementById('homeLeaveStats');

  if (totalAnnual > 0) {
    const summary = LEAVE.calcMonthlySummary(year, month);
    const pct = totalAnnual > 0 ? Math.round((summary.annualUsed / totalAnnual) * 100) : 0;
    leaveStatsEl.innerHTML =
      '<div class="home-stat-period">' + month + '월 현황</div>' +
      '<div class="home-stat-row"><span class="home-stat-label">연차</span><span class="home-stat-value emerald">' + summary.annualUsed + ' / ' + totalAnnual + '일</span></div>' +
      '<div class="home-progress-wrap"><div class="home-progress-bar" style="width:' + pct + '%"></div></div>';
    leaveBody.style.display = '';
  } else {
    leaveBody.style.display = 'none';
  }
}

// 연간 연차 렌더
function _renderHomeLeaveYear(year, totalAnnual) {
  const leaveBody = document.getElementById('homeLeaveBody');
  const leaveStatsEl = document.getElementById('homeLeaveStats');

  if (totalAnnual > 0) {
    const summary = LEAVE.calcAnnualSummary(year, totalAnnual);
    const pct = summary.usagePercent;
    const remaining = totalAnnual - summary.usedAnnual;
    leaveStatsEl.innerHTML =
      '<div class="home-stat-period">' + year + '년 합계</div>' +
      '<div class="home-stat-row"><span class="home-stat-label">연차</span><span class="home-stat-value emerald">' + summary.usedAnnual + ' / ' + summary.totalAnnual + '일</span></div>' +
      '<div class="home-stat-row"><span class="home-stat-label">잔여</span><span class="home-stat-value">' + remaining + '일</span></div>' +
      '<div class="home-progress-wrap"><div class="home-progress-bar" style="width:' + pct + '%"></div></div>';
    leaveBody.style.display = '';
  } else {
    leaveBody.style.display = 'none';
  }
}

// ── Newsboard 탭 전환 ──
function switchNewsTab(tab) {
  document.querySelectorAll('.newsboard-tab').forEach(t => t.classList.toggle('active', t.dataset.newstab === tab));
  document.getElementById('newsNoticePanel').classList.toggle('active', tab === 'notice');
  document.getElementById('newsChangelogPanel').classList.toggle('active', tab === 'changelog');
  // 본문 상단 테두리 색상 연동
  const body = document.querySelector('.newsboard-body');
  if (body) {
    body.style.borderTopColor = tab === 'changelog'
      ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)';
  }
}

// ── Notice: fetch & parse notice.md (pager 형식) ──
let _noticeItems = null;
let _noticeIdx = 0;

function parseNotice(md) {
  const blocks = md.split(/^## /m).filter(b => b.trim());
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!/^\d{4}\.\d{2}\.\d{2}/.test(lines[0])) continue;
    return lines.slice(1)
      .map(l => l.replace(/^- /, '').trim())
      .filter(l => l.length > 0 && !l.startsWith('<!--'));
  }
  return [];
}

function renderNoticePager(items) {
  if (!items || !items.length) return;
  const content = document.getElementById('noticeContent');
  const nav = document.getElementById('noticeNav');
  const indicator = document.getElementById('noticeIndicator');
  if (!content) return;

  _noticeIdx = Math.max(0, Math.min(_noticeIdx, items.length - 1));
  content.innerHTML = `<div style="font-size:var(--text-body-normal); color:var(--text-secondary); line-height:1.5;">${items[_noticeIdx]}</div>`;

  if (items.length > 1 && nav && indicator) {
    nav.style.display = 'flex';
    indicator.textContent = `${_noticeIdx + 1} / ${items.length}`;
  }
}

function noticePage(dir) {
  if (!_noticeItems || !_noticeItems.length) return;
  _noticeIdx = (_noticeIdx + dir + _noticeItems.length) % _noticeItems.length;
  renderNoticePager(_noticeItems);
}

const NOTICE_FALLBACK = [
  'SNUH 메이트는 모바일 전용입니다<br>(보안을 위해서도 핸드폰에서 기록해주세요)',
  '에러, 개선, 요청사항 등은 피드백 탭에서 입력해주세요!',
  '내 정보 탭에서 직급/호봉을 입력하면 시급이 자동 계산됩니다.'
];

function loadNotice() {
  if (_noticeItems) { renderNoticePager(_noticeItems); return; }
  fetch('./notice.md?v=' + Date.now())
    .then(r => r.ok ? r.text() : '')
    .then(md => {
      _noticeItems = parseNotice(md);
      if (!_noticeItems || _noticeItems.length === 0) _noticeItems = NOTICE_FALLBACK;
      renderNoticePager(_noticeItems);
    })
    .catch(() => {
      _noticeItems = NOTICE_FALLBACK;
      renderNoticePager(_noticeItems);
    });
}

// ── Changelog: fetch & parse CHANGELOG.md ──
let _changelogEntries = null;
let _changelogIdx = 0;

function parseChangelog(md) {
  const entries = [];
  const blocks = md.split(/^## /m).filter(b => b.trim());
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const header = lines[0];
    const match = header.match(/^(\d{4}\.\d{2}\.\d{2})\s*[—–-]\s*(.+)/);
    if (!match) continue;
    const items = lines.slice(1)
      .map(l => l.replace(/^- /, '').trim())
      .filter(l => l.length > 0);
    entries.push({ date: match[1], title: match[2], items });
  }
  return entries.slice(0, 3);
}

function renderChangelogPage() {
  const el = document.getElementById('changelogContent');
  const indicator = document.getElementById('changelogIndicator');
  const prevBtn = document.getElementById('changelogPrev');
  const nextBtn = document.getElementById('changelogNext');
  if (!_changelogEntries || !_changelogEntries.length || !el) return;

  const e = _changelogEntries[_changelogIdx];
  el.innerHTML = `
    <div class="home-changelog-date">${e.date}</div>
    <div class="home-changelog-title">${e.title}</div>
    <ul class="home-changelog-list">${e.items.map(i => `<li>${i}</li>`).join('')}</ul>
  `;
  indicator.textContent = `${_changelogIdx + 1} / ${_changelogEntries.length}`;
  prevBtn.disabled = _changelogIdx === 0;
  nextBtn.disabled = _changelogIdx === _changelogEntries.length - 1;
}

function changelogPage(dir) {
  if (!_changelogEntries) return;
  _changelogIdx = Math.max(0, Math.min(_changelogEntries.length - 1, _changelogIdx + dir));
  renderChangelogPage();
}
window.changelogPage = changelogPage;

function loadChangelog() {
  if (_changelogEntries) { renderChangelogPage(); return; }
  fetch('./CHANGELOG.md?v=' + Date.now())
    .then(r => r.ok ? r.text() : '')
    .then(md => {
      _changelogEntries = parseChangelog(md);
      _changelogIdx = 0;
      renderChangelogPage();
    })
    .catch(() => {
      const el = document.getElementById('changelogContent');
      if (el) el.innerHTML = '<span style="color:var(--text-muted);">업데이트 내역을 불러올 수 없습니다.</span>';
    });
}


// ── 탭 전환 ──
function switchTab(tabName) {
  if (!tabName) return false;

  const targetContent = document.getElementById('tab-' + tabName);
  if (!targetContent) return false;

  const targetTab = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);

  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  if (targetTab) targetTab.classList.add('active');
  targetContent.classList.add('active');

  if (tabName === 'home') initHomeTab();
  if (tabName === 'payroll') { applyProfileToPayroll(); initPayrollTab(); }
  if (tabName === 'overtime') {
    const savedCTA = document.getElementById('profileSavedCTA');
    if (savedCTA) savedCTA.style.display = 'none';
    applyProfileToOvertime(); initOvertimeTab();
  }
  if (tabName === 'leave') { applyProfileToLeave(); initLeaveTab(); }
  if (tabName === 'reference') renderWikiToc();
  if (tabName === 'profile') initProfileTab();
  if (tabName === 'settings') { if (typeof updateAppLockUI === 'function') updateAppLockUI(); }

  return true;
}

window.switchTab = switchTab;

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    switchTab(tab.dataset.tab);
  });
});

// ── 서브탭 전환 (payroll 탭 — 책갈피 탭) ──
document.querySelectorAll('#tab-payroll .pay-bookmark-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#tab-payroll .pay-bookmark-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#tab-payroll .sub-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('sub-' + tab.dataset.subtab).classList.add('active');
    const name = tab.dataset.subtab;
    // 퇴직금 탭이면 상단 급여 탭을 접힘 처리
    const payrollSubTabs = document.getElementById('payrollSubTabs');
    if (name === 'pay-retirement') payrollSubTabs.classList.add('retracted');
    else payrollSubTabs.classList.remove('retracted');
    if (name === 'pay-payslip') renderPayPayslip();
    if (name === 'pay-calc') { initPayEstimate(); if (typeof PAYROLL !== 'undefined') PAYROLL.init(); }
    if (name === 'pay-qa') { if (typeof PAYROLL !== 'undefined') PAYROLL.init(); }
    if (name === 'pay-retirement') initRetirementTab();
  });
});

// ═══════════ 직급 목록 업데이트 ═══════════
function updateGrades() {
  const jobEl = document.getElementById('wJobType');
  if (!jobEl) return;
  const jobType = jobEl.value;
  const gradeSelect = document.getElementById('wGrade');
  const table = DATA.payTables[CALC.resolvePayTable(jobType)];
  if (!gradeSelect || !table) return;
  gradeSelect.innerHTML = '';
  table.grades.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    gradeSelect.appendChild(opt);
  });
}

// updatePromoGrades — 제거됨 (승진 기능은 Q&A 카드로 이동)

function updatePayrollGrades() {
  const el = document.getElementById('psJobType');
  if (!el) return;
  const jobType = el.value;
  const gradeSelect = document.getElementById('psGrade');
  const table = DATA.payTables[CALC.resolvePayTable(jobType)];
  if (!gradeSelect || !table) return;
  gradeSelect.innerHTML = '';
  table.grades.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    gradeSelect.appendChild(opt);
  });
}

// ═══════════ ⏰ 시급 계산 (통상임금 → 시급) ═══════════
function calculateWage() {
  const jobType = document.getElementById('wJobType').value;
  const grade = document.getElementById('wGrade').value;
  const year = parseInt(document.getElementById('wYear').value);
  const serviceYears = parseInt(document.getElementById('wServiceYears').value) || 0;
  const hasMilitary = document.getElementById('wMilitary').checked;
  const hasSeniority = document.getElementById('wSeniority').checked;
  const adjustPay = parseInt(document.getElementById('wAdjust').value) || 0;
  const specialPay = parseInt(document.getElementById('wSpecial').value) || 0;
  const numFamily = parseInt(document.getElementById('wFamily')?.value) || 0;
  const numChildren = parseInt(document.getElementById('wChildren').value) || 0;
  const childrenUnder6Pay = parseInt(document.getElementById('wChildrenUnder6Pay')?.value) || 0;

  const familyResult = CALC.calcFamilyAllowance(numFamily, numChildren);

  // 가족수당은 통상임금 계산에서 제외 (보수규정 제44조 2항)
  const result = CALC.calcOrdinaryWage(jobType, grade, year, {
    hasMilitary,
    hasSeniority,
    seniorityYears: hasSeniority ? serviceYears : 0,
    longServiceYears: serviceYears,
    specialPayAmount: specialPay,
    adjustPay,
    // familyAllowance 제외
  });

  if (!result) return;

  // 시급 자동 반영
  document.getElementById('otHourly').value = result.hourlyRate;
  const otHint = document.getElementById('otHourlyHint');
  if (otHint) otHint.textContent = `통상임금 기준 (${CALC.formatCurrency(result.monthlyWage)})`;

  let html = `
    <div class="result-box">
      <div class="result-label">시급 (÷209시간)</div>
      <div class="result-total green">${CALC.formatCurrency(result.hourlyRate)}</div>
      <div class="result-label" style="margin-top:4px; font-size:var(--text-body-normal);">통상임금: ${CALC.formatCurrency(result.monthlyWage)}</div>
    </div>
    `;
  Object.entries(result.breakdown).forEach(([key, val]) => {
    if (val > 0) {
      html += `<div class="result-row"><span class="key">${key}</span><span class="val">${CALC.formatCurrency(val)}</span></div>`;
    }
  });
  html += `<div class="warning-box" style="border-color:var(--accent-emerald);">💡 가족수당은 통상임금에 포함되지 않아 시급 계산에서 제외됩니다. (보수규정 제44조) 시급은 위 시간외·온콜 필드에 자동 반영되었습니다.</div>`;
  document.getElementById('wageCalcResult').innerHTML = html;
}

// ═══════════ ⏰ 시간외수당 ═══════════
function calculateOvertime() {
  const hourly = parseInt(document.getElementById('otHourly').value) || 0;
  const extH = parseFloat(document.getElementById('otExtHours').value) || 0;
  const nightH = parseFloat(document.getElementById('otNightHours').value) || 0;
  const holidayH = parseFloat(document.getElementById('otHolidayHours').value) || 0;
  const isExtN = document.getElementById('otExtNight').checked;

  if (hourly === 0) {
    document.getElementById('overtimeResult').innerHTML = `
      <div class="card-title"><span class="icon emerald">📊</span> 시간외수당 결과</div>
      <div class="warning-box">⚠️ 시급을 먼저 입력하세요. 위의 [통상임금으로 시급 계산하기]를 펼쳐보세요.</div>
    `;
    return;
  }

  const r = CALC.calcOvertimePay(hourly, extH, nightH, holidayH, isExtN);

  document.getElementById('overtimeResult').innerHTML = `
    <div class="card-title"><span class="icon emerald">📊</span> 시간외수당 결과</div>
    <div class="result-box">
      <div class="result-label">시간외수당 합계</div>
      <div class="result-total">${CALC.formatCurrency(r.합계)}</div>
    </div>
    <div class="result-row"><span class="key">연장근무수당 (${r.detail.extHours}h × ${hourly.toLocaleString()}원 × 150%)</span><span class="val accent">${CALC.formatCurrency(r.연장근무수당)}</span></div>
    <div class="result-row"><span class="key">야간근무수당 (${r.detail.nightHours}h × 200%)</span><span class="val accent">${CALC.formatCurrency(r.야간근무수당)}</span></div>
    <div class="result-row"><span class="key">휴일근무수당 (${r.detail.holidayBase}h×150%${r.detail.holidayOver > 0 ? ' + ' + r.detail.holidayOver + 'h×200%' : ''})</span><span class="val accent">${CALC.formatCurrency(r.휴일근무수당)}</span></div>
    <div class="result-row"><span class="key">적용 시급</span><span class="val">${CALC.formatCurrency(hourly)}</span></div>
  `;
}

// ═══════════ 📞 온콜수당 ═══════════
function calculateOnCall() {
  const hourly = parseInt(document.getElementById('otHourly').value) || 0;
  const standby = parseInt(document.getElementById('ocStandby').value) || 0;
  const callOuts = parseInt(document.getElementById('ocCallOuts').value) || 0;
  const workH = parseFloat(document.getElementById('ocWorkHours').value) || 0;
  const includesNight = document.getElementById('ocNight').checked;

  if (hourly === 0) {
    document.getElementById('oncallResult').innerHTML = `
      <div class="card-title"><span class="icon emerald">📊</span> 온콜수당 결과</div>
      <div class="warning-box">⚠️ 시급을 먼저 입력하세요.</div>
    `;
    return;
  }

  const r = CALC.calcOnCallPay(hourly, standby, callOuts, workH, includesNight);

  document.getElementById('oncallResult').innerHTML = `
    <div class="card-title"><span class="icon emerald">📊</span> 온콜수당 결과</div>
    <div class="result-box">
      <div class="result-label">온콜 수당 합계</div>
      <div class="result-total">${CALC.formatCurrency(r.합계)}</div>
    </div>
    <div class="result-row"><span class="key">온콜대기수당 (${r.detail.totalStandbyDays}일 × ₩10,000)</span><span class="val accent">${CALC.formatCurrency(r.온콜대기수당)}</span></div>
    <div class="result-row"><span class="key">온콜교통비 (${r.detail.callOuts}회 × ₩50,000)</span><span class="val accent">${CALC.formatCurrency(r.온콜교통비)}</span></div>
    <div class="result-row"><span class="key">시간외근무수당 (${r.detail.callOuts}회 × ${r.detail.totalWorkHoursPerCall}h × ${includesNight ? '200%' : '150%'})</span><span class="val accent">${CALC.formatCurrency(r.시간외근무수당)}</span></div>
    <hr class="divider">
    <div class="result-row"><span class="key">실 근무시간/회</span><span class="val">${workH}h + 출퇴근 2h = ${r.detail.totalWorkHoursPerCall}h</span></div>
    <div class="result-row"><span class="key">적용 시급</span><span class="val">${CALC.formatCurrency(hourly)}</span></div>
  `;
}

// ═══════════ 📅 자동 월별 설정 (공휴일 API 연동) ═══════════
async function autoFillMonth() {
  const year = parseInt(document.getElementById('psSimYear').value);
  const month = parseInt(document.getElementById('psSimMonth').value);
  const infoEl = document.getElementById('psHolidayInfo');

  infoEl.innerHTML = '⏳ 공휴일 데이터 로드 중...';

  try {
    // 근무일수 계산
    const workInfo = await HOLIDAYS.calcWorkDays(year, month);
    // 보수규정에 따라 근무일수 기본값 = 해당 월의 마지막 일자(역일수)
    document.getElementById('psWorkDays').value = workInfo.totalDays;

    // 명절지원비 해당월 확인 (설·추석·5월·7월)
    const isHolidayMonth = await HOLIDAYS.isHolidayBonusMonth(year, month);
    document.getElementById('psHolidayMonth').checked = isHolidayMonth;

    // 가계지원비 미지급월 확인 (API 연동)
    const isFamilySkip = await HOLIDAYS.isFamilySupportSkipMonth(year, month);
    // 숨겨진 상태값 저장 (calculatePayroll에서 사용)
    document.getElementById('psHolidayMonth').dataset.familySkip = isFamilySkip ? '1' : '0';

    // 공휴일 목록 표시
    let holidayList = '';
    if (workInfo.holidays.length > 0) {
      holidayList = workInfo.holidays.map(h =>
        `<span style="color:var(--accent-rose)">${h.day}일(${h.dayOfWeek})</span> ${h.name}`
      ).join(', ');
    }

    // 기념일 목록 표시
    let anniversaryList = '';
    if (workInfo.anniversaries && workInfo.anniversaries.length > 0) {
      anniversaryList = workInfo.anniversaries.map(a =>
        `<span style="color:var(--accent-amber)">${a.day}일(${a.dayOfWeek})</span> ${a.name}`
      ).join(', ');
    }

    infoEl.innerHTML = `
            <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:8px; padding:10px; margin-top:4px;">
                <strong style="color:var(--accent-emerald)">📅 ${year}년 ${month}월</strong><br>
                <span>📊 근무일수(식대): <strong>${workInfo.totalDays}일</strong> (해당월 역일수) | 실근무일: ${workInfo.workDays}일 (평일 ${workInfo.weekdays} - 공휴일 ${workInfo.holidaysOnWeekday})</span><br>
                ${isHolidayMonth ? '<span style="color:var(--accent-indigo)">🎉 명절지원비 해당월</span><br>' : ''}
                ${isFamilySkip ? '<span style="color:var(--accent-rose)">⚠️ 가계지원비 미지급월</span><br>' : '<span style="color:var(--accent-emerald)">✅ 가계지원비 지급월</span><br>'}
                ${holidayList ? `<span>🚩 공휴일: ${holidayList}</span><br>` : '<span>공휴일 없음</span><br>'}
                ${anniversaryList ? `<span>📌 기념일: ${anniversaryList}</span>` : ''}
            </div>
        `;

    // 미니 캘린더 렌더링
    await renderMiniCalendar(year, month, workInfo);

  } catch (e) {
    infoEl.textContent = '';
    const errSpan = document.createElement('span');
    errSpan.style.color = 'var(--accent-rose)';
    errSpan.textContent = '\u274C \ub85c\ub4dc \uc2e4\ud328: ' + (e.message || 'Unknown error');
    infoEl.appendChild(errSpan);
  }
}

// ═══════════ 📅 미니 캘린더 렌더링 ═══════════
async function renderMiniCalendar(year, month, workInfo) {
  const container = document.getElementById('psMiniCalendar');
  if (!container) return;

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=일, 6=토

  // 공휴일·기념일 날짜 맵
  const holidayMap = {};
  (workInfo.holidays || []).forEach(h => {
    if (!holidayMap[h.day]) holidayMap[h.day] = [];
    holidayMap[h.day].push(h.name);
  });

  const anniversaryMap = {};
  (workInfo.anniversaries || []).forEach(a => {
    if (!anniversaryMap[a.day]) anniversaryMap[a.day] = [];
    anniversaryMap[a.day].push(a.name);
  });

  // 오늘 날짜
  const today = new Date();
  const isCurrentMonth = (today.getFullYear() === year && (today.getMonth() + 1) === month);
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  // 요일 헤더
  const dowLabels = ['일', '월', '화', '수', '목', '금', '토'];
  let gridHTML = dowLabels.map((d, i) => {
    const cls = i === 0 ? 'sun' : (i === 6 ? 'sat' : '');
    return `<div class="mini-cal-dow ${cls}">${d}</div>`;
  }).join('');

  // 빈 셀 (1일 이전)
  for (let i = 0; i < firstDow; i++) {
    gridHTML += '<div class="mini-cal-day empty"></div>';
  }

  // 날짜 셀
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const isWknd = (dow === 0 || dow === 6);
    const isHoliday = !!holidayMap[d];
    const isAnniv = !!anniversaryMap[d];
    const isToday = (d === todayDay);

    let cls = 'mini-cal-day';
    let tooltipParts = [];

    if (isHoliday) {
      cls += ' holiday';
      tooltipParts.push(holidayMap[d].join(', '));
    } else if (isWknd) {
      cls += ' weekend';
    }

    if (isAnniv) {
      if (!isHoliday) cls += ' anniversary';
      tooltipParts.push(anniversaryMap[d].join(', '));
    }

    if (isToday) cls += ' today';

    const titleAttr = tooltipParts.length > 0 ? ` title="${tooltipParts.join(' / ')}"` : '';
    gridHTML += `<div class="${cls}"${titleAttr}>${d}</div>`;
  }

  // 워크데이·공휴일 카운트
  let workDayCount = 0;
  let dayOffCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === 0 || dow === 6 || holidayMap[d]) {
      dayOffCount++;
    } else {
      workDayCount++;
    }
  }

  container.innerHTML = `
    <div class="mini-cal">
      <div class="mini-cal-header">
        📅 ${year}년 ${month}월 달력
        <span style="font-weight:400;font-size:var(--text-body-normal);color:var(--text-muted);">(근무 ${workDayCount}일 / 휴일 ${dayOffCount}일)</span>
      </div>
      <div class="mini-cal-grid">${gridHTML}</div>
      <div class="mini-cal-legend">
        <span><i class="dot holiday"></i>공휴일</span>
        <span><i class="dot weekend"></i>주말</span>
        <span><i class="dot anniversary"></i>기념일</span>
        <span><i class="dot workday"></i>오늘</span>
      </div>
    </div>
  `;
}


// ═══════════ 💼 퇴직금 계산기 (임베드) ═══════════

// data.js severanceMultipliersPre2001 과 동기화 (2001.08.31 이전 입사자 누진배수)
// 16~19, 21~24, 26~29년은 5년 마일스톤 사이를 선형 보간
var RET_RATES = [
  [1,1.0],[2,2.0],[3,3.5],[4,5.5],[5,7.5],[6,9.1],[7,10.7],[8,12.3],[9,13.9],
  [10,15.5],[11,17.2],[12,18.9],[13,20.6],[14,22.3],[15,24.0],[16,25.8],[17,27.6],
  [18,29.4],[19,31.2],[20,33.0],[21,34.9],[22,36.8],[23,38.7],[24,40.6],[25,42.5],
  [26,44.5],[27,46.5],[28,48.5],[29,50.5],[30,52.5]
];
var RET_SEVERANCE_RATES = [
  [1,5,0.10],[5,10,0.35],[10,15,0.45],[15,20,0.50],[20,999,0.60]
];

function retGetRateForYears(years) {
  var floored = Math.floor(years);
  if (floored < 1) return 0;
  for (var i = 0; i < RET_RATES.length; i++) {
    if (RET_RATES[i][0] === floored) return RET_RATES[i][1];
  }
  return RET_RATES[RET_RATES.length - 1][1] + (floored - 30) * 2.5;
}

function retGetSeveranceRate(years) {
  var floored = Math.floor(years);
  for (var i = 0; i < RET_SEVERANCE_RATES.length; i++) {
    var r = RET_SEVERANCE_RATES[i];
    if (floored >= r[0] && floored < r[1]) return r[2];
  }
  return 0;
}

function retFmt(n) { return Math.round(n).toLocaleString('ko-KR') + '원'; }

// ── 퇴직금 D-day / 빠른 날짜 헬퍼 ──
var _retPeakDate = null, _retPeakEndDate = null, _retLegalRetireDate = null;

function retFmtDate(d) {
  return d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0');
}
function retToInputDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function retUpdateQuickDates() {
  var birthVal = document.getElementById('retBirthDate').value;
  var hireVal  = document.getElementById('retHireDate') ? document.getElementById('retHireDate').value : '';
  var now = new Date();
  _retPeakDate = null; _retPeakEndDate = null; _retLegalRetireDate = null;

  if (birthVal) {
    var birth = new Date(birthVal);
    _retPeakDate = new Date(birth); _retPeakDate.setFullYear(birth.getFullYear() + 60);
    _retPeakEndDate = new Date(birth); _retPeakEndDate.setFullYear(birth.getFullYear() + 61);
    _retLegalRetireDate = _retPeakDate;

    var ddayGrid = document.getElementById('retDdayGrid');
    ddayGrid.style.display = 'grid';
    var dPeak   = Math.ceil((_retPeakDate - now) / 86400000);
    var dRetire = Math.ceil((_retPeakEndDate - now) / 86400000);
    document.getElementById('retDdayPeak').textContent   = dPeak > 0   ? 'D-' + dPeak.toLocaleString('ko-KR')   + ' (' + _retPeakDate.getFullYear()    + ')' : '도달';
    document.getElementById('retDdayRetire').textContent = dRetire > 0 ? 'D-' + dRetire.toLocaleString('ko-KR') + ' (' + _retPeakEndDate.getFullYear() + ')' : '도달';

    document.getElementById('retQuickDates').style.display = 'grid';
    document.getElementById('retBtnPeakDate').textContent    = '법정 정년 · 임금피크 시작 (' + retFmtDate(_retPeakDate) + ')';
    document.getElementById('retBtnPeakEndDate').textContent = '임금피크 연장 만료 (' + retFmtDate(_retPeakEndDate) + ')';

    var yearsUntilPeak = (_retPeakDate - now) / (365.25 * 86400000);
    document.getElementById('retPeakOptSection').style.display = yearsUntilPeak < 6 ? 'block' : 'none';
  } else {
    document.getElementById('retDdayGrid').style.display = 'none';
    document.getElementById('retQuickDates').style.display = hireVal ? 'grid' : 'none';
    document.getElementById('retPeakOptSection').style.display = 'none';
  }
}
function retSetRetireDate(type) {
  var d;
  if (type === 'now') d = new Date();
  else if (type === 'peak')    d = _retPeakDate;
  else if (type === 'peakEnd') d = _retPeakEndDate;
  if (!d) return;
  document.getElementById('retRetireDate').value = retToInputDate(d);
  // active 상태 표시
  var idMap = { now: 'retBtnNow', peak: 'retBtnPeakDate', peakEnd: 'retBtnPeakEndDate' };
  document.querySelectorAll('.ret-quick-btn').forEach(function(b) { b.classList.remove('active'); });
  var activeId = idMap[type];
  if (activeId) { var el = document.getElementById(activeId); if (el) el.classList.add('active'); }
}
function retToggleRateCard() {
  var card = document.getElementById('retRateCard');
  var chev = document.getElementById('retRateChevron');
  if (!card) return;
  var collapsed = card.classList.toggle('collapsed');
  if (chev) chev.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
}
function retSelectPeakOpt(label) {
  document.querySelectorAll('.ret-peak-opt').forEach(function(el){ el.classList.remove('selected'); });
  label.classList.add('selected');
  var radio = label.querySelector('input[type=radio]');
  if (radio) radio.checked = true;
}

// ── 퇴직금 계산 (CALC 위임 + 임금피크 통합) ──
function _retComputeSeverance(effectiveWage, preciseYears, hireDateVal) {
  if (typeof CALC !== 'undefined' && CALC.calcSeveranceFullPay) {
    return CALC.calcSeveranceFullPay(effectiveWage, Math.floor(preciseYears), hireDateVal);
  }
  // 로컬 fallback
  var rate = retGetRateForYears(preciseYears);
  var base = Math.round(effectiveWage * rate);
  var addon = 0;
  if (hireDateVal && new Date(hireDateVal) <= new Date('2015-06-30')) {
    addon = Math.round(effectiveWage * Math.floor(preciseYears) * retGetSeveranceRate(preciseYears));
  }
  return {
    퇴직금: base + addon, 기본퇴직금: base, 퇴직수당: addon,
    산정방법: rate + '개월',
    근속기간: Math.floor(preciseYears) + '년 ' + Math.floor((preciseYears % 1) * 12) + '개월'
  };
}

function calcRetirementEmbedded() {
  var wage = parseFloat(document.getElementById('retAvgWage').value) || 0;
  var hireDateVal   = document.getElementById('retHireDate').value;
  var retireDateVal = document.getElementById('retRetireDate').value;
  if (!wage || !hireDateVal || !retireDateVal) {
    alert('월 평균임금, 입사일, 퇴직일을 모두 입력해 주세요.'); return;
  }
  var hire = new Date(hireDateVal), retire = new Date(retireDateVal);
  if (retire <= hire) { alert('퇴직일이 입사일보다 늦어야 합니다.'); return; }

  var totalYears = (retire - hire) / (1000 * 60 * 60 * 24 * 365.25);
  var peakOpt = (document.querySelector('input[name="retPeakOpt"]:checked') || {}).value || 'none';

  document.getElementById('retPre2001Warning').style.display =
    hire < new Date('2001-08-31') ? 'block' : 'none';
  document.getElementById('retSeveranceCheckRow').style.display =
    hire <= new Date('2015-06-30') ? 'flex' : 'none';

  var effectiveWage = wage;
  var peakLabel = '';
  if (peakOpt === 'A') { effectiveWage = Math.round(wage * 0.6); peakLabel = '옵션 A (60% 적용)'; }
  if (peakOpt === 'B') { peakLabel = '옵션 B (100% 유지)'; }

  var r = _retComputeSeverance(effectiveWage, totalYears, hireDateVal);
  var peakIncome = peakOpt === 'A' ? Math.round(wage * 0.6 * 12) : (peakOpt === 'B' ? Math.round(wage * 12) : 0);
  var totalPackage = r.퇴직금 + peakIncome;

  // 결과 표시 시 근속연수표 자동 접기
  var rateCard = document.getElementById('retRateCard');
  if (rateCard && !rateCard.classList.contains('collapsed')) {
    rateCard.classList.add('collapsed');
    var chev = document.getElementById('retRateChevron');
    if (chev) chev.style.transform = 'rotate(180deg)';
  }

  var resultDiv = document.getElementById('retCalcResult');
  resultDiv.style.display = 'block';
  document.getElementById('retCalcResultLabel').textContent =
    peakOpt !== 'none' ? '퇴직 패키지 총액 (임금피크 수령 포함)' : '예상 퇴직금';
  document.getElementById('retCalcResultTotal').textContent = retFmt(peakOpt !== 'none' ? totalPackage : r.퇴직금);

  var breakdown = document.getElementById('retCalcResultBreakdown');
  while (breakdown.firstChild) breakdown.removeChild(breakdown.firstChild);
  function addRow(label, value, isTotal) {
    var div = document.createElement('div');
    div.className = 'ret-result-row' + (isTotal ? ' total' : '');
    var s1 = document.createElement('span'); s1.textContent = label;
    var s2 = document.createElement('span'); s2.style.fontWeight = '600'; s2.textContent = value;
    div.appendChild(s1); div.appendChild(s2); breakdown.appendChild(div);
  }
  addRow('근속연수', r.근속기간 || (Math.floor(totalYears) + '년'), false);
  addRow('월 평균임금 (입력)', retFmt(wage), false);
  if (peakOpt !== 'none') addRow('임금피크 옵션', peakLabel, false);
  if (peakOpt === 'A')    addRow('퇴직 기준 평균임금 (60%)', retFmt(effectiveWage), false);
  addRow('산정방법', r.산정방법 || '-', false);
  addRow('기본 퇴직금', retFmt(r.기본퇴직금 || 0), false);
  if (r.퇴직수당 > 0) addRow('퇴직수당', retFmt(r.퇴직수당), false);
  addRow('퇴직금 소계', retFmt(r.퇴직금), false);
  if (peakOpt !== 'none') {
    addRow('임금피크 기간 수령 (1년)', retFmt(peakIncome), false);
    addRow('퇴직 패키지 합계', retFmt(totalPackage), true);
  } else {
    addRow('합계', retFmt(r.퇴직금), true);
  }

  // ── AI 제안: 퇴직수당 요율 상향 구간 임박 알림 ──
  var aiBox = document.getElementById('retAiSuggestion');
  if (aiBox) {
    aiBox.style.display = 'none';
    aiBox.innerHTML = '';
    var SEV_THRESHOLDS = [
      { years: 20, rate: 0.60 }, { years: 15, rate: 0.50 },
      { years: 10, rate: 0.45 }, { years:  5, rate: 0.35 }
    ];
    var isPre2015 = hire <= new Date('2015-06-30');
    if (isPre2015) {
      var curFloor = Math.floor(totalYears);
      var next = SEV_THRESHOLDS.find(function(t) { return t.years > curFloor; });
      if (next) {
        // 다음 임계일: 입사일 + next.years년 (역일수 기준)
        var nextDate = new Date(hire.getFullYear() + next.years, hire.getMonth(), hire.getDate());
        var daysToNext = Math.ceil((nextDate - retire) / 86400000);
        var monthsToNext = Math.round(daysToNext / 30.5);
        if (daysToNext > 0 && monthsToNext <= 12) {
          // 다음 임계 시점 퇴직금 계산
          var nextPrecise = (nextDate - hire) / (365.25 * 86400000);
          var nextBase    = Math.round(wage * nextPrecise);
          var nextAddon   = Math.round(wage * nextPrecise * next.rate);
          var nextTotal   = nextBase + nextAddon;
          var curTotal    = r.퇴직금;
          var diff        = nextTotal - curTotal;
          var prevRate    = SEV_THRESHOLDS.find(function(t) { return t.years <= curFloor; });
          var prevRatePct = prevRate ? Math.round(prevRate.rate * 100) : 0;
          var nextRatePct = Math.round(next.rate * 100);
          var timeLabel   = monthsToNext <= 1 ? '약 1개월' : '약 ' + monthsToNext + '개월';
          var dateLabel   = nextDate.getFullYear() + '년 ' + (nextDate.getMonth()+1) + '월 ' + nextDate.getDate() + '일';

          var card = document.createElement('div');
          card.className = 'ret-ai-card';
          card.innerHTML =
            '<div class="ret-ai-badge">🤖 AI 제안 &nbsp;⚡ 퇴직수당 요율 상향 구간 임박</div>' +
            '<div class="ret-ai-headline">' + timeLabel + '만 더 근무하면<br>' +
              '퇴직수당 요율 <span style="opacity:.7;text-decoration:line-through;">' + prevRatePct + '%</span> → <span style="color:#86efac;">' + nextRatePct + '%</span> 상향됩니다</div>' +
            '<div class="ret-ai-sub">근속 ' + next.years + '년 도달 시점 (' + dateLabel + ') 이후 퇴직 시 적용</div>' +
            '<div class="ret-ai-compare">' +
              '<div class="ret-ai-compare-row"><span>현재 퇴직금 (' + retFmt(wage) + ' × ' + totalYears.toFixed(2) + '년)</span><span>' + retFmt(curTotal) + '</span></div>' +
              '<div class="ret-ai-compare-row highlight"><span>' + timeLabel + ' 후 퇴직 시</span><span class="ret-ai-gain">+' + retFmt(diff) + ' 추가</span></div>' +
              '<div class="ret-ai-compare-row" style="font-weight:600;opacity:.85;"><span>예상 퇴직금 합계</span><span>' + retFmt(nextTotal) + '</span></div>' +
            '</div>' +
            '<div class="ret-ai-target-date">📅 근속 ' + next.years + '년 도달일: <strong>' + dateLabel + '</strong></div>';
          aiBox.appendChild(card);
          aiBox.style.display = 'block';
        }
      }
    }
  }
}

// ── 임금피크 타임라인 시각화 ──
function renderRetSimTimeline(hire, peakDate, peakEndDate) {
  var el = document.getElementById('retSimTimeline');
  if (!el) return;
  if (!hire || !peakDate || !peakEndDate) { el.style.display = 'none'; return; }

  var hireStr    = hire.getFullYear() + '.' + String(hire.getMonth()+1).padStart(2,'0');
  var peakStr    = retFmtDate(peakDate);
  var peakEndStr = retFmtDate(peakEndDate);
  var normalYrs  = Math.floor((peakDate - hire) / (365.25 * 86400000));

  // 비율: 시각적으로 임금피크 구간이 최소 18% 확보되도록
  var totalMs  = peakEndDate - hire;
  var normalMs = peakDate   - hire;
  var rawPct   = normalMs / totalMs * 100;
  var normalPct = Math.min(rawPct, 82);   // 임금피크 최소 18%
  var peakPct   = 100 - normalPct;

  el.innerHTML =
    '<div class="ret-card-title" style="margin-bottom:10px;">📅 임금피크 타임라인</div>' +

    // ── 1. 전체 경력 바 ──
    '<div class="ret-tl-section">' +
      '<div class="ret-tl-section-label">전체 경력 · 입사 후 ' + normalYrs + '년</div>' +
      '<div class="ret-tl-macro-bar">' +
        '<div class="ret-tl-seg ret-tl-seg-normal" style="width:' + normalPct + '%">' +
          '<span class="ret-tl-seg-text">정상 근무 (' + normalYrs + '년)</span>' +
        '</div>' +
        '<div class="ret-tl-seg ret-tl-seg-peak" style="width:' + peakPct + '%">' +
          '<span class="ret-tl-seg-text">임금피크</span>' +
        '</div>' +
      '</div>' +
      '<div class="ret-tl-macro-labels">' +
        '<span>입사 ' + hireStr + '</span>' +
        '<span>법정 정년 ' + peakStr + '</span>' +
        '<span>' + peakEndStr + '</span>' +
      '</div>' +
    '</div>' +

    // ── 2. 임금피크 기간 시나리오 ──
    '<div class="ret-tl-divider"></div>' +
    '<div class="ret-tl-section-label" style="margin-bottom:8px;">임금피크 기간 선택 — 만 60세(법정 정년) 이후 1년</div>' +

    '<div class="ret-tl-sc-wrap">' +
      // 날짜 헤더
      '<div class="ret-tl-sc-header">' +
        '<div class="ret-tl-sc-label-col"></div>' +
        '<div class="ret-tl-sc-bar-col">' +
          '<span class="ret-tl-sc-date" style="left:0">만 60세<br>' + peakStr + '</span>' +
          '<span class="ret-tl-sc-date" style="right:0; text-align:right;">만 61세<br>' + peakEndStr + '</span>' +
        '</div>' +
      '</div>' +

      // 법정 퇴직 (해당없음)
      '<div class="ret-tl-sc-row">' +
        '<div class="ret-tl-sc-label-col">' +
          '<div class="ret-tl-sc-badge">법정퇴직</div>' +
          '<div class="ret-tl-sc-sublabel">해당없음</div>' +
        '</div>' +
        '<div class="ret-tl-sc-bar-col">' +
          '<div class="ret-tl-bar-none">' +
            '<span class="ret-tl-bar-marker">⬆ 즉시 퇴직</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // 옵션 A — 공로연수
      '<div class="ret-tl-sc-row">' +
        '<div class="ret-tl-sc-label-col">' +
          '<div class="ret-tl-sc-badge sc-a">옵션 A</div>' +
          '<div class="ret-tl-sc-sublabel">공로연수</div>' +
        '</div>' +
        '<div class="ret-tl-sc-bar-col">' +
          '<div class="ret-tl-bar-a">' +
            '<span class="ret-tl-bar-inner">미근무 · 급여 60% 수령</span>' +
          '</div>' +
          '<span class="ret-tl-bar-exit">⬆ 만 61세 퇴직</span>' +
        '</div>' +
      '</div>' +

      // 옵션 B — 계속근무
      '<div class="ret-tl-sc-row">' +
        '<div class="ret-tl-sc-label-col">' +
          '<div class="ret-tl-sc-badge sc-b">옵션 B ★</div>' +
          '<div class="ret-tl-sc-sublabel">계속근무</div>' +
        '</div>' +
        '<div class="ret-tl-sc-bar-col">' +
          '<div class="ret-tl-bar-b">' +
            '<span class="ret-tl-bar-inner">계속 근무 · 급여 100% 유지</span>' +
          '</div>' +
          '<span class="ret-tl-bar-exit winner">⬆ 만 61세 퇴직</span>' +
        '</div>' +
      '</div>' +

    '</div>' +

    // ── 3. 용어 설명 ──
    '<div class="ret-tl-legend">' +
      '<div class="ret-tl-legend-row"><span class="ret-tl-dot-a"></span><strong>공로연수 (옵션 A)</strong> — 근로 제공 없이 기준임금의 60%를 1년간 수령. 이 기간이 퇴직 직전 평균임금 계산에 포함되어 <em>퇴직금이 줄어듭니다</em>.</div>' +
      '<div class="ret-tl-legend-row"><span class="ret-tl-dot-b"></span><strong>계속근무 (옵션 B)</strong> — 1년 추가 근무 + 기준임금 100% 유지. 근속연수 1년 추가 적용 → <em>퇴직금 기준 최고</em>.</div>' +
      '<div class="ret-tl-legend-row"><span class="ret-tl-dot-n"></span><strong>법정퇴직 (해당없음)</strong> — 임금피크 미신청. 만 60세에 즉시 퇴직. 임금피크 기간 수령 없음.</div>' +
    '</div>';

  el.style.display = 'block';
}

// ── 3-시나리오 비교 (Tab 2) ──
function calcScenarioEmbedded(silent) {
  var wage     = parseFloat(document.getElementById('retScWage').value) || 0;
  var hireVal  = document.getElementById('retScHireDate').value;
  var birthVal = document.getElementById('retScBirthDate').value;
  if (!wage || !hireVal) {
    if (!silent) alert('퇴직금 탭에서 월 평균임금과 입사일을 먼저 입력해 주세요.');
    return;
  }

  var hire  = new Date(hireVal);
  var now   = new Date();
  var birth = birthVal ? new Date(birthVal) : null;
  var peakDate = birth ? new Date(birth.getFullYear()+60, birth.getMonth(), birth.getDate()) : null;
  var peakEnd  = birth ? new Date(birth.getFullYear()+61, birth.getMonth(), birth.getDate()) : null;
  var oneYearLater = new Date(now.getFullYear()+1, now.getMonth(), now.getDate());

  // 타임라인 렌더
  renderRetSimTimeline(hire, peakDate, peakEnd);

  var scenarios = [
    { label:'지금 바로 퇴직', badge:'시나리오 1', retireDate: now,     wageMulti:1.0, peakIncome:0,
      desc:'임금피크 전 퇴직. 기준임금 그대로 퇴직금 산정.' },
    { label:'옵션 A — 공로연수 후 퇴직', badge:'시나리오 2', retireDate: peakEnd||oneYearLater, wageMulti:0.6, peakIncome: wage*0.6*12,
      desc:'1년 공로연수(60%) 후 퇴직. 퇴직금 기준임금도 60% 적용.' },
    { label:'옵션 B — 계속근무 후 퇴직', badge:'시나리오 3', retireDate: peakEnd||oneYearLater, wageMulti:1.0, peakIncome: wage*1.0*12,
      desc:'1년 계속근무(100%) 후 퇴직. 퇴직금 기준임금 유지.' }
  ];

  var results = scenarios.map(function(sc) {
    var years = Math.max(0, (sc.retireDate - hire) / (365.25 * 86400000));
    var eff   = Math.round(wage * sc.wageMulti);
    var r     = _retComputeSeverance(eff, years, hireVal);
    return { sc: sc, r: r, years: years, eff: eff, total: r.퇴직금 + sc.peakIncome };
  });

  var bestIdx = 0;
  results.forEach(function(res, i){ if (res.total > results[bestIdx].total) bestIdx = i; });

  var container = document.getElementById('retScenarioResult');
  container.style.display = 'block';
  while (container.firstChild) container.removeChild(container.firstChild);

  var maxTotal = Math.max.apply(null, results.map(function(r){ return r.total; }));
  var bestResult = results[bestIdx];
  var diffFromBest0 = bestResult.total - results[0].total;

  // ── AI 분석 요약 카드 (상단 큰 카드) ──
  var summaryCard = document.createElement('div');
  summaryCard.className = 'ret-ai-card ret-sc-summary';
  var scenarioLabels = ['지금 퇴직', '옵션 A (공로연수)', '옵션 B (계속근무)'];
  var gainText = diffFromBest0 > 0
    ? '지금 퇴직보다 <span style="color:#86efac;font-weight:800;">' + retFmt(diffFromBest0) + ' 더</span> 받을 수 있습니다'
    : '현재 시점이 최적입니다';
  summaryCard.innerHTML =
    '<div class="ret-ai-badge">🤖 AI 시나리오 분석 &nbsp;·&nbsp; 3가지 비교</div>' +
    '<div class="ret-ai-headline">최적 선택: <span style="color:#86efac;">' + bestResult.sc.label + '</span><br>' + gainText + '</div>' +
    '<div class="ret-ai-sub">' + bestResult.sc.desc + '</div>' +
    // 막대 차트
    '<div class="ret-sc-bars">' +
    results.map(function(res, i) {
      var pct = maxTotal > 0 ? Math.round(res.total / maxTotal * 100) : 0;
      var isWinner = i === bestIdx;
      return '<div class="ret-sc-bar-row">' +
        '<div class="ret-sc-bar-label">' + scenarioLabels[i] + '</div>' +
        '<div class="ret-sc-bar-track">' +
          '<div class="ret-sc-bar-fill' + (isWinner ? ' winner' : '') + '" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<div class="ret-sc-bar-val' + (isWinner ? ' winner' : '') + '">' + retFmt(res.total) + (isWinner ? ' ✓' : '') + '</div>' +
      '</div>';
    }).join('') +
    '</div>' +
    '<div class="ret-ai-target-date">📅 퇴직 예정일: <strong>' +
      (peakEnd ? retFmtDate(peakEnd) + ' (만 61세 기준)' : '입력된 날짜 기준') +
    '</strong></div>';
  container.appendChild(summaryCard);

  // ── 시나리오별 세부 카드 ──
  results.forEach(function(res, i) {
    var card = document.createElement('div');
    var isWinner = i === bestIdx;
    card.className = 'ret-card ret-sc-detail' + (isWinner ? ' ret-sc-winner' : '');

    var header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;';
    var badgeColors = ['#e0e7ff', '#fef3c7', '#d1fae5'];
    header.innerHTML =
      '<div>' +
        '<span style="font-size:11px; font-weight:700; padding:2px 7px; border-radius:4px; margin-right:6px; background:' + badgeColors[i] + '; color:#1a1a1a;">' + res.sc.badge + '</span>' +
        '<span style="font-weight:700; font-size:var(--text-body-large);">' + res.sc.label + '</span>' +
      '</div>' +
      (isWinner ? '<span style="font-size:11px; font-weight:700; color:#059669; border:1.5px solid #059669; border-radius:4px; padding:2px 6px;">✓ 최고 총액</span>' : '');
    card.appendChild(header);

    var desc = document.createElement('div');
    desc.style.cssText = 'font-size:11px; color:var(--text-muted); margin-bottom:8px;';
    desc.textContent = res.sc.desc;
    card.appendChild(desc);

    function scRow(label, val, hi) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(26,26,26,0.07); font-size:var(--text-body-normal);';
      var l = document.createElement('span'); l.style.color = 'var(--text-secondary)'; l.textContent = label;
      var v = document.createElement('span'); v.style.cssText = 'font-weight:' + (hi?'700':'600') + '; color:' + (hi?'#059669':'inherit') + ';'; v.textContent = val;
      row.appendChild(l); row.appendChild(v); card.appendChild(row);
    }
    scRow('근속', Math.floor(res.years) + '년', false);
    scRow('기준 평균임금', retFmt(res.eff), false);
    scRow('퇴직금', retFmt(res.r.퇴직금), false);
    if (res.sc.peakIncome > 0) scRow('임금피크 1년 수령', retFmt(res.sc.peakIncome), false);
    scRow('패키지 합계', retFmt(res.total), isWinner);

    container.appendChild(card);
  });
}

// 퇴직금 탭 초기화 (자동 프로필 로드 + 지급률표 빌드)
var _retInitDone = false;
function initRetirementTab() {
  // 지급률 테이블은 한 번만 빌드
  var tbody = document.getElementById('retRateTableBody');
  if (tbody && !tbody.hasChildNodes()) {
    var half = Math.ceil(RET_RATES.length / 2);
    function makeCell(text, bold) {
      var td = document.createElement('td');
      td.style.padding = '7px 8px'; td.style.textAlign = 'center';
      if (bold) td.style.fontWeight = '700';
      td.textContent = text; return td;
    }
    for (var i = 0; i < half; i++) {
      var tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(26,26,26,0.08)';
      var left = RET_RATES[i], right = RET_RATES[i + half] || null;
      tr.appendChild(makeCell(left[0] + '년', false));
      tr.appendChild(makeCell(left[1] + '월', true));
      tr.appendChild(makeCell(right ? right[0] + '년' : '', false));
      tr.appendChild(makeCell(right ? right[1] + '월' : '', right != null));
      tbody.appendChild(tr);
    }
  }

  // 내부 탭 스위칭
  var retTabs = document.getElementById('retTabs');
  if (retTabs && !retTabs.dataset.wired) {
    retTabs.dataset.wired = '1';
    var accent = document.getElementById('retTabAccent');
    retTabs.addEventListener('click', function(e) {
      var btn = e.target.closest('.ret-bookmark-tab');
      if (!btn) return;
      var tab = btn.dataset.tab;
      document.querySelectorAll('#retTabs .ret-bookmark-tab').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('#sub-pay-retirement .ret-panel').forEach(function(p) { p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('ret-panel-' + tab).classList.add('active');
      if (accent) accent.className = 'ret-tab-accent ' + tab;
      // Tab 2로 전환 시 Tab 1 입력값 자동 복사
      if (tab === 'peak') {
        var w = document.getElementById('retAvgWage').value;
        var h = document.getElementById('retHireDate').value;
        var b = document.getElementById('retBirthDate').value;
        var scW = document.getElementById('retScWage');
        var scH = document.getElementById('retScHireDate');
        var scB = document.getElementById('retScBirthDate');
        if (w && !scW.value) scW.value = w;
        if (h && !scH.value) scH.value = h;
        if (b && !scB.value) scB.value = b;
        // 타임라인 즉시 표시
        if (scH.value && scB.value) {
          var _hire  = new Date(scH.value);
          var _birth = new Date(scB.value);
          var _peak  = new Date(_birth.getFullYear()+60, _birth.getMonth(), _birth.getDate());
          var _peakE = new Date(_birth.getFullYear()+61, _birth.getMonth(), _birth.getDate());
          renderRetSimTimeline(_hire, _peak, _peakE);
        }
        // 자동 계산 or 안내 메시지
        if (scW.value && scH.value) {
          calcScenarioEmbedded(true);
        } else {
          var r = document.getElementById('retScenarioResult');
          r.style.display = 'block';
          r.innerHTML = '<div class="ret-info-box" style="margin:0 0 4px;">💡 <strong>퇴직금</strong> 탭에서 월 평균임금·입사일·생년월일을 입력하면 시나리오가 자동으로 표시됩니다.</div>';
        }
      }
    });
  }

  // 프로필 자동 로드
  if (_retInitDone) return;
  _retInitDone = true;
  if (typeof PROFILE === 'undefined') return;
  var profile = PROFILE.load();
  if (!profile) return;
  if (profile.hireDate) {
    var hireDateInput = document.getElementById('retHireDate');
    if (hireDateInput && !hireDateInput.value) {
      var parsed = profile.hireDate.replace(/\./g, '-').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, function(_, y, m, d) {
        return y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
      });
      hireDateInput.value = parsed;
    }
  }
  if (typeof CALC === 'undefined') return;
  var wageResult = PROFILE.calcWage ? PROFILE.calcWage(profile) : null;
  if (!wageResult) return;
  var monthlyWage = wageResult.monthlyWage;
  var avg = null;
  try { avg = CALC.calcAverageWage(monthlyWage, 3); } catch(e) {}
  var avgWageToUse = avg ? avg.monthlyAvgWage : monthlyWage;
  var wageInput = document.getElementById('retAvgWage');
  if (wageInput && !wageInput.value) wageInput.value = avgWageToUse;
  var banner = document.getElementById('retAutoLoadBanner');
  var detail = document.getElementById('retAutoLoadDetail');
  var srcLabel = document.getElementById('retWageSourceLabel');
  if (banner && detail) {
    banner.style.display = 'block';
    var lines = ['통상임금: ' + monthlyWage.toLocaleString('ko-KR') + '원'];
    if (avg && avg.totalOtPay > 0) {
      lines.push('시간외 수당 (최근 3개월): +' + avg.totalOtPay.toLocaleString('ko-KR') + '원');
      lines.push('월 평균임금 (↑OT 반영): ' + avgWageToUse.toLocaleString('ko-KR') + '원');
    } else {
      lines.push('월 평균임금: ' + avgWageToUse.toLocaleString('ko-KR') + '원');
    }
    if (profile.hireDate) lines.push('입사일: ' + profile.hireDate);
    detail.textContent = lines.join(' | ');
    if (srcLabel) srcLabel.textContent = avg && avg.totalOtPay > 0 ? '✓ 자동계산 (통상임금 + OT 반영)' : '✓ 자동계산 (통상임금 기준)';
  }
  // 입사일 채워졌으니 빠른 날짜 버튼 업데이트
  retUpdateQuickDates();

  // E4: 퇴직 타임라인 렌더
  _renderRetirementTimeline(profile, avgWageToUse);
}

function _renderRetirementTimeline(profile, avgWage) {
  var container = document.getElementById('retirementTimelineContent');
  if (!container) return;

  var hasProfile = profile && profile.hireDate && avgWage > 0;
  while (container.firstChild) container.removeChild(container.firstChild);

  if (!hasProfile) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.padding = '24px 0';
    var emptyMsg = document.createElement('p');
    emptyMsg.textContent = '입사일과 급여 정보를 먼저 입력해주세요.';
    emptyMsg.style.cssText = 'color:var(--text-muted);font-size:var(--text-body-normal);';
    var emptyBtn = document.createElement('button');
    emptyBtn.textContent = '개인정보 탭으로 →';
    emptyBtn.className = 'btn btn-primary';
    emptyBtn.style.marginTop = '10px';
    emptyBtn.onclick = function() { switchTab('info'); };
    empty.appendChild(emptyMsg);
    empty.appendChild(emptyBtn);
    container.appendChild(empty);
    return;
  }

  var hireDateStr = profile.hireDate.replace(/\./g, '-').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, function(_, y, m, d) {
    return y + '-' + m.padStart(2,'0') + '-' + d.padStart(2,'0');
  });
  var now = new Date();
  var results = [];

  for (var i = 0; i < 12; i++) {
    var retYear = now.getFullYear();
    var retMonth = now.getMonth() + i;
    if (retMonth >= 12) { retYear += Math.floor(retMonth / 12); retMonth = retMonth % 12; }
    var retDate = new Date(retYear, retMonth + 1, 0); // last day of month

    var retDateStr = retDate.getFullYear() + '-' +
      String(retDate.getMonth() + 1).padStart(2,'0') + '-' +
      String(retDate.getDate()).padStart(2,'0');

    var ret = null;
    try {
      ret = typeof CALC !== 'undefined' ? CALC.calcRetirement({
        avgWage: avgWage,
        hireDate: hireDateStr,
        retireDate: retDateStr
      }) : null;
    } catch(e) {}

    results.push({
      year: retYear,
      month: retMonth + 1,
      label: (retMonth + 1) + '월',
      amount: ret ? (ret.total || ret.severancePay || 0) : 0,
      isCurrentMonth: i === 0
    });
  }

  var validAmounts = results.map(function(r) { return r.amount; }).filter(function(a) { return a > 0; });
  if (validAmounts.length === 0) {
    var errMsg = document.createElement('p');
    errMsg.textContent = '퇴직금 계산 정보가 부족합니다.';
    errMsg.style.cssText = 'color:var(--text-muted);padding:16px 0;text-align:center;';
    container.appendChild(errMsg);
    return;
  }
  var maxAmt = Math.max.apply(null, validAmounts);
  var minAmt = Math.min.apply(null, validAmounts);
  var maxIdx = results.findIndex(function(r) { return r.amount === maxAmt; });
  var minIdx = results.findIndex(function(r) { return r.amount === minAmt; });

  // Summary chips
  var chipRow = document.createElement('div');
  chipRow.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;';
  function makeChip(text, bg, color) {
    var chip = document.createElement('span');
    chip.textContent = text;
    chip.style.cssText = 'padding:4px 12px;border-radius:20px;font-size:var(--text-body-small);font-weight:600;background:' + bg + ';color:' + color + ';';
    return chip;
  }
  chipRow.appendChild(makeChip('★ 최고 ' + results[maxIdx].label + ': ' + Math.round(maxAmt / 10000) + '만원', 'rgba(245,158,11,0.12)', 'var(--accent-amber,#f59e0b)'));
  chipRow.appendChild(makeChip('▼ 최저 ' + results[minIdx].label + ': ' + Math.round(minAmt / 10000) + '만원', 'rgba(244,63,94,0.08)', 'var(--accent-rose,#f43f5e)'));
  container.appendChild(chipRow);

  // 12-month grid
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px;';

  results.forEach(function(r, idx) {
    var cell = document.createElement('div');
    var isMax = idx === maxIdx, isMin = idx === minIdx, isCur = r.isCurrentMonth;
    var borderColor = isMax ? 'var(--accent-amber,#f59e0b)' : isMin ? 'var(--accent-rose,#f43f5e)' : isCur ? 'var(--accent-indigo,#6366f1)' : 'var(--border-glass,rgba(0,0,0,0.1))';
    cell.style.cssText = 'padding:10px;border-radius:10px;border:2px solid ' + borderColor + ';text-align:center;' +
      (isMax ? 'background:rgba(245,158,11,0.06);' : isMin ? 'background:rgba(244,63,94,0.04);' : '');

    var monthLabel = document.createElement('div');
    monthLabel.textContent = (isMax ? '★ ' : '') + r.year + '년 ' + r.label;
    monthLabel.style.cssText = 'font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;' + (isMax ? 'font-weight:600;' : '');

    var amtLabel = document.createElement('div');
    amtLabel.textContent = r.amount > 0 ? Math.round(r.amount / 10000) + '만원' : '—';
    amtLabel.style.cssText = 'font-size:var(--text-body-normal);font-weight:' + (isMax ? '700' : '500') + ';' +
      'color:' + (isMax ? 'var(--accent-amber,#f59e0b)' : isMin ? 'var(--accent-rose,#f43f5e)' : 'var(--text-primary)') + ';';

    cell.appendChild(monthLabel);
    cell.appendChild(amtLabel);
    grid.appendChild(cell);
  });
  container.appendChild(grid);

  var note = document.createElement('p');
  note.textContent = '연금·세금 제외 계산 (v2에서 추가 예정)';
  note.style.cssText = 'font-size:0.72rem;color:var(--text-muted);margin-top:10px;text-align:center;';
  container.appendChild(note);
}

// ═══════════ 📅 연차 계산 ═══════════
function calculateLeave() {
  const raw = document.getElementById('lvHireDate').value;
  const parsed = PROFILE.parseDate(raw);
  if (!parsed) {
    document.getElementById('leaveResult').innerHTML = '<div class="warning-box">⚠️ 입사일을 입력하세요. (예: 2006-07-05)</div>';
    return;
  }

  const r = CALC.calcAnnualLeave(new Date(parsed));

  document.getElementById('leaveResult').innerHTML = `
    <div class="result-box success">
      <div class="result-label">연차 일수</div>
      <div class="result-total green">${r.totalLeave}일</div>
      <div class="result-row"><span class="key">근속</span><span class="val">${r.diffYears}년 ${r.diffMonths % 12}개월</span></div>
      <div class="result-row"><span class="key">산정 근거</span><span class="val">${r.explanation}</span></div>
    </div>
  `;
}

// ═══════════ 👶 육아휴직 급여 ═══════════
function calculateParentalLeave() {
  const wage = parseInt(document.getElementById('plWage').value) || 0;
  const months = parseInt(document.getElementById('plMonths').value) || 12;

  if (wage === 0) {
    document.getElementById('parentalResult').innerHTML = '<div class="warning-box">⚠️ 월 통상임금을 입력하세요.</div>';
    return;
  }

  const r = CALC.calcParentalLeavePay(wage, months);
  let html = `
    <div class="result-box success">
      <div class="result-label">총 예상 급여</div>
      <div class="result-total green">${CALC.formatCurrency(r.total)}</div>
    </div>
  `;

  r.monthly.forEach(m => {
    html += `<div class="result-row">
      <span class="key">${m.month}개월차</span>
      <span class="val ${m.pay > 0 ? 'accent' : ''}">${m.pay > 0 ? CALC.formatCurrency(m.pay) : '무급'}</span>
    </div>`;
  });

  document.getElementById('parentalResult').innerHTML = html;
}

// ═══════════ 💵 가족수당 ═══════════
function calculateFamily() {
  const spouse = document.getElementById('faSpouse').checked;
  const children = parseInt(document.getElementById('faChildren').value) || 0;
  const other = parseInt(document.getElementById('faOther').value) || 0;

  const r = CALC.calcFamilyAllowance(spouse, children, other);

  let html = `
    <div class="result-box success">
      <div class="result-label">월 가족수당</div>
      <div class="result-total green">${CALC.formatCurrency(r.월수당)}</div>
    </div>
  `;
  Object.entries(r.breakdown).forEach(([key, val]) => {
    html += `<div class="result-row"><span class="key">${key}</span><span class="val accent">${CALC.formatCurrency(val)}</span></div>`;
  });

  document.getElementById('familyResult').innerHTML = html;
}

// ═══════════ 🏅 장기근속수당 ═══════════
function calculateLongService() {
  const years = parseInt(document.getElementById('lsYears').value) || 0;
  const r = CALC.calcLongServicePay(years);

  document.getElementById('longServiceResult').innerHTML = `
    <div class="result-box ${r.월수당 > 0 ? 'success' : ''}">
      <div class="result-label">월 장기근속수당</div>
      <div class="result-total ${r.월수당 > 0 ? 'green' : ''}">${r.월수당 > 0 ? CALC.formatCurrency(r.월수당) : '해당없음 (5년 미만)'}</div>
      <div class="result-row"><span class="key">근속연수</span><span class="val">${r.근속연수}년</span></div>
      <div class="result-row"><span class="key">적용 구간</span><span class="val">${r.구간}</span></div>
    </div>
  `;
}

// ═══════════ 🌙 야간근무가산금 ═══════════
function calculateNightBonus() {
  const count = parseInt(document.getElementById('nsCount').value) || 0;
  const profile = PROFILE.load();
  const prevCumulative = (profile && profile.nightShiftsUnrewarded != null)
    ? profile.nightShiftsUnrewarded : 0;
  const r = CALC.calcNightShiftBonus(count, prevCumulative);

  let html = `
    <div class="result-box ${r.초과경고 ? '' : 'success'}">
      <div class="result-label">야간근무가산금 (${r.횟수}회)</div>
      <div class="result-total ${r.초과경고 ? '' : 'green'}">${CALC.formatCurrency(r.야간근무가산금)}</div>
    </div>
    <div class="result-row"><span class="key">이번 달 리커버리데이 획득</span><span class="val accent">${r.리커버리데이}일</span></div>
    <div class="result-row"><span class="key">정산 후 잔여 누적 야간횟수</span><span class="val accent">${r.누적리커버리데이}회 (이월)</span></div>
  `;

  if (r.초과경고) {
    html += `<div class="warning-box">${r.초과경고}</div>`;
  }

  // 이월 누적 횟수를 profile에 저장 — 다음 달 calculateNightBonus() 호출 시 자동 반영
  if (profile) {
    PROFILE.save({ ...profile, nightShiftsUnrewarded: r.누적리커버리데이 });
    html += `<div class="info-note-banner" style="margin-top:8px;">💾 이월 횟수 (${r.누적리커버리데이}회) 저장됨 — 다음 달 계산 시 자동 반영됩니다.</div>`;
  } else {
    html += `<div class="warning-box" style="margin-top:8px;">⚠️ 개인정보 탭에서 프로필을 저장하면 이월 횟수가 자동으로 기억됩니다.</div>`;
  }

  document.getElementById('nightBonusResult').innerHTML = html;
}

// ═══════════ 📊 승진 시뮬레이터 ═══════════
function calculatePromotion() {
  const jobType = document.getElementById('prJobType').value;
  const grade = document.getElementById('prGrade').value;
  const raw = document.getElementById('prHireDate').value;
  const parsed = PROFILE.parseDate(raw);

  if (!parsed) {
    document.getElementById('promoResult').innerHTML = '<div class="warning-box">⚠️ 입사일을 입력하세요. (예: 2006-07-05)</div>';
    return;
  }

  const r = CALC.calcPromotionDate(jobType, grade, new Date(parsed));

  if (r.message) {
    const warnBox = document.createElement('div');
    warnBox.className = 'warning-box';
    warnBox.textContent = r.message;
    const promoEl = document.getElementById('promoResult');
    promoEl.textContent = '';
    promoEl.appendChild(warnBox);
    return;
  }

  const isPast = r.남은일수 === 0;

  document.getElementById('promoResult').innerHTML = `
    <div class="result-box ${isPast ? 'success' : ''}">
      <div class="result-label">승격 경로</div>
      <div class="result-total ${isPast ? 'green' : ''}">${r.label}</div>
      <div class="result-row"><span class="key">소요 연수</span><span class="val">${r.소요연수}</span></div>
      <div class="result-row"><span class="key">예상 승격일</span><span class="val accent">${r.예상승격일}</span></div>
      <div class="result-row"><span class="key">남은 일수</span><span class="val">${isPast ? '✅ 이미 도래' : r.남은일수 + '일'}</span></div>
    </div>
  `;
}

// ═══════════ 🏦 퇴직금 시뮬레이터 ═══════════
function calculateSeverance() {
  const avgPay = parseInt(document.getElementById('svAvgPay')?.value) || 0;
  const years = parseInt(document.getElementById('svYears')?.value) || 0;
  const hireDateStr = document.getElementById('svHireDate')?.value || null;

  if (avgPay === 0) {
    document.getElementById('severanceResult').innerHTML = '<div class="warning-box">⚠️ 월 평균임금을 입력하세요.</div>';
    return;
  }

  const r = CALC.calcSeveranceFullPay(avgPay, years, hireDateStr);

  document.getElementById('severanceResult').innerHTML = `
    <div class="result-box success">
      <div class="result-label">예상 퇴직금</div>
      <div class="result-total green">${CALC.formatCurrency(r.퇴직금)}</div>
      <div class="result-row"><span class="key">근속기간</span><span class="val">${r.근속기간 || years + '년'}</span></div>
      <div class="result-row"><span class="key">기본 퇴직금</span><span class="val">${CALC.formatCurrency(r.기본퇴직금 || 0)}</span></div>
      <div class="result-row"><span class="key">퇴직수당</span><span class="val">${r.퇴직수당 > 0 ? CALC.formatCurrency(r.퇴직수당) : '해당없음'}</span></div>
      <div class="result-row"><span class="key">산식</span><span class="val">${r.산식 || '-'}</span></div>
      <div class="result-row"><span class="key">비고</span><span class="val">${r.퇴직수당비고 || '해당없음'}</span></div>
    </div>
  `;
}

// ═══════════ 📖 규정 위키 ═══════════
function renderWikiToc() {
  const toc = document.getElementById('wikiToc');
  if (!toc || !DATA.handbook) return;
  let html = '';
  DATA.handbook.forEach((section, idx) => {
    const count = section.articles.length;
    html += `<div class="wiki-toc-item" onclick="showWikiCategory(${idx})" style="
      padding:10px 12px; margin-bottom:4px; border-radius:6px; cursor:pointer;
      display:flex; align-items:center; justify-content:space-between;
      transition:background 0.2s;
    " onmouseover="this.style.background='rgba(99,102,241,0.1)'" onmouseout="this.style.background='transparent'">
      <span>${section.icon} ${section.category}</span>
      <span class="badge" style="font-size:var(--text-label-small);">${count}</span>
    </div>`;
  });
  toc.innerHTML = html;
}

function showWikiCategory(categoryIdx) {
  const section = DATA.handbook[categoryIdx];
  if (!section) return;
  const container = document.getElementById('wikiContent');

  let html = `<div class="card">
    <div class="card-title" style="font-size:var(--text-title-large);">
      <span>${section.icon}</span> ${section.category}
      <span class="badge indigo">${section.articles.length}개 항목</span>
    </div>`;

  section.articles.forEach((article, i) => {
    const bodyHtml = article.body.replace(/\n/g, '<br>').replace(/• /g, '<span style="color:var(--accent-indigo)">•</span> ');
    html += `<div class="wiki-article" style="
      margin-bottom:12px; padding:12px 14px; border-radius:8px;
      border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02);
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <strong style="font-size:var(--text-body-large); color:var(--text-primary);">${article.title}</strong>
        <span style="font-size:var(--text-label-small); padding:2px 8px; border-radius:4px; background:rgba(99,102,241,0.1); color:var(--accent-indigo);">📌 ${article.ref}</span>
      </div>
      <div style="font-size:var(--text-body-large); line-height:1.7; color:var(--text-secondary);">${bodyHtml}</div>
    </div>`;
  });

  html += '</div>';
  container.innerHTML = html;

  // 목차 활성 표시
  document.querySelectorAll('.wiki-toc-item').forEach((el, i) => {
    el.style.background = i === categoryIdx ? 'rgba(99,102,241,0.12)' : 'transparent';
    el.style.borderLeft = i === categoryIdx ? '3px solid var(--accent-indigo)' : '3px solid transparent';
  });
}

function searchHandbook() {
  const query = document.getElementById('wikiSearch').value.trim().toLowerCase();
  const countEl = document.getElementById('wikiSearchCount');
  const container = document.getElementById('wikiContent');

  if (!query) {
    countEl.style.display = 'none';
    container.innerHTML = `<div class="card" style="text-align:center; padding:40px 20px; color:var(--text-muted);">
      <div style="font-size:var(--text-amount-huge); margin-bottom:12px;">📖</div>
      좌측 목차에서 카테고리를 선택하거나,<br>상단 검색창에 키워드를 입력하세요.
    </div>`;
    // 목차 활성 초기화
    document.querySelectorAll('.wiki-toc-item').forEach(el => {
      el.style.background = 'transparent';
      el.style.borderLeft = '3px solid transparent';
    });
    return;
  }

  let results = [];
  DATA.handbook.forEach(section => {
    section.articles.forEach(article => {
      const inTitle = article.title.toLowerCase().includes(query);
      const inBody = article.body.toLowerCase().includes(query);
      const inRef = article.ref.toLowerCase().includes(query);
      if (inTitle || inBody || inRef) {
        results.push({ ...article, categoryIcon: section.icon, category: section.category });
      }
    });
  });

  countEl.textContent = `${results.length}개 결과`;
  countEl.style.display = 'block';

  if (results.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:30px; color:var(--text-muted);">
      검색 결과가 없습니다. 다른 키워드로 검색해보세요.
    </div>`;
    return;
  }

  const highlightRe = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  let html = '';
  results.forEach(article => {
    let bodyHtml = article.body.replace(/\n/g, '<br>').replace(/• /g, '<span style="color:var(--accent-indigo)">•</span> ');
    bodyHtml = bodyHtml.replace(highlightRe, '<mark style="background:rgba(251,191,36,0.3); color:var(--text-primary); padding:0 2px; border-radius:2px;">$1</mark>');
    const titleHtml = article.title.replace(highlightRe, '<mark style="background:rgba(251,191,36,0.3); color:var(--text-primary); padding:0 2px; border-radius:2px;">$1</mark>');

    html += `<div class="card" style="margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <strong style="font-size:var(--text-body-large);">${article.categoryIcon} ${titleHtml}</strong>
        <span style="font-size:var(--text-label-small); padding:2px 8px; border-radius:4px; background:rgba(99,102,241,0.1); color:var(--accent-indigo);">📌 ${article.ref}</span>
      </div>
      <div style="font-size:var(--text-label-small); color:var(--text-muted); margin-bottom:6px;">${article.category}</div>
      <div style="font-size:var(--text-body-large); line-height:1.7; color:var(--text-secondary);">${bodyHtml}</div>
    </div>`;
  });
  container.innerHTML = html;
}

function clearWikiSearch() {
  document.getElementById('wikiSearch').value = '';
  searchHandbook();
}

// ═══════════ 💬 챗봇 ═══════════
function renderQuickTags() {
  const categories = [...new Set(DATA.faq.map(f => f.category))];
  const container = document.getElementById('quickTags');
  if (!container) return;
  categories.forEach(cat => {
    const tag = document.createElement('button');
    tag.className = 'quick-tag';
    tag.textContent = cat;
    tag.onclick = () => {
      const items = DATA.faq.filter(f => f.category === cat);
      // 카테고리명을 사용자 메시지로 표시
      addChatMessage(`📂 ${cat}`, 'user');
      // 질문 목록을 선택 가능한 버튼으로 표시
      setTimeout(() => {
        let btnHtml = `<strong>${cat}</strong> 관련 질문을 선택하세요:<br><div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">`;
        items.forEach((item, idx) => {
          btnHtml += `<button class="chat-q-btn" onclick="answerFaqItem('${cat}', ${idx})" style="
            text-align:left; padding:8px 12px; border-radius:6px; cursor:pointer;
            background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2);
            color:var(--text-primary); font-size:var(--text-body-large); transition:background 0.2s;
          " onmouseover="this.style.background='rgba(99,102,241,0.2)'" onmouseout="this.style.background='rgba(99,102,241,0.08)'">${item.q}</button>`;
        });
        btnHtml += '</div>';
        addChatMessage(btnHtml, 'bot');
      }, 300);
    };
    container.appendChild(tag);
  });
}

function answerFaqItem(category, idx) {
  const items = DATA.faq.filter(f => f.category === category);
  const item = items[idx];
  if (!item) return;
  addChatMessage(item.q, 'user');
  setTimeout(() => {
    // FAQ 답변 + 핸드북 원문 보강
    const result = searchChat(item.q);
    let html = `<div style="margin-bottom:6px;">${item.a}</div>`;
    if (result && result.handbook.length > 0) {
      html += renderHandbookSource(result.handbook);
    }
    addChatMessage(html, 'bot', item.ref);
  }, 300);
}

function renderCeremonyTable() {
  const table = document.getElementById('ceremonyTable');
  if (!table) return;
  let html = '<thead><tr><th>사유</th><th>휴가</th><th class="amount">경조비</th><th>사학연금</th><th>비고</th></tr></thead><tbody>';
  DATA.ceremonies.forEach(c => {
    html += `<tr>
      <td>${c.type}</td>
      <td>${typeof c.leave === 'number' ? c.leave + '일' : c.leave}</td>
      <td class="amount">${c.hospitalPay ? c.hospitalPay.toLocaleString() + '원' : '-'}</td>
      <td>${c.pensionPay || '-'}</td>
      <td style="font-size:var(--text-body-normal);color:var(--text-muted)">${c.extra || ''}</td>
    </tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;
}

function renderLeaveTable() {
  const table = document.getElementById('leaveTable');
  if (!table) return;
  let html = '<thead><tr><th>유형</th><th>조건</th><th>기간</th><th>근속산입</th><th>급여</th></tr></thead><tbody>';
  DATA.leaveOfAbsence.forEach(l => {
    html += `<tr>
      <td style="font-weight:600">${l.type}</td>
      <td>${l.condition}</td>
      <td>${l.period}</td>
      <td>${l.tenure ? '<span class="badge emerald">✓</span>' : '<span class="badge rose">✗</span>'}</td>
      <td style="font-size:var(--text-body-normal)">${l.pay}</td>
    </tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;
}

function addChatMessage(text, type, ref = null) {
  const container = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = `chat-msg ${type}`;
  if (type === 'user') {
    msg.textContent = text;
  } else {
    msg.insertAdjacentHTML('beforeend', text);
  }
  if (ref) {
    const refSpan = document.createElement('span');
    refSpan.className = 'ref';
    refSpan.textContent = '\uD83D\uDCCC ' + ref;
    msg.appendChild(refSpan);
  }
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

// ── 챗봇 별칭(alias) 사전 ──
const CHAT_ALIASES = {
  '온콜': ['on-call', '호출', '대기', '콜'],
  '연차': ['연가', '연차', '쉬는날', '몇일'],
  '야간': ['밤번', 'night', '밤', '나이트'],
  '급여': ['월급', '봉급', '급료', '임금', '페이'],
  '퇴직': ['퇴사', '이직', '그만'],
  '승진': ['승격', '진급', '승급'],
  '출산': ['임신', '육아', '아기', '아이'],
  '수당': ['보조', '지원', '얼마'],
  '감면': ['할인', '진료비', '병원비'],
  '경조': ['돌아가', '사망', '장례', '조문', '결혼', '입양', '화환', '조의', '장의', '부의', '축의'],
  '할머니': ['조부모', '외조부모', '할아버지', '외할머니', '외할아버지'],
  '형제': ['형', '오빠', '언니', '누나', '동생', '자매', '남매'],
  '부모': ['아버지', '어머니', '아빠', '엄마', '시어머니', '시아버지', '장인', '장모'],
  '자녀': ['아들', '딸', '아이', '자식'],
  '검진': ['건강검진', '검사'],
  '헌혈': ['피', '혈액'],
  '교육': ['연수', '학회', '방사선', '보수교육'],
  '돌봄': ['간병', '가족돌봄', '간호'],
  '복지': ['포인트', '복지포인트', '어린이집'],
  '통상임금': ['시급', '임금', '통상'],
  '호봉': ['승급', '연봉']
};

// ── 쿼리→카테고리 직접 매핑 (단일 키워드 → 핸드북 카테고리) ──
const CHAT_CATEGORY_MAP = {
  '연차': '연차·휴가', '휴가': '연차·휴가', '연가': '연차·휴가', '쉬는날': '연차·휴가',
  '온콜': '온콜', '호출': '온콜', '대기수당': '온콜',
  '야간': '근로시간', '밤번': '근로시간', '리커버리': '근로시간',
  '경조': '청원·경조', '결혼': '청원·경조', '사망': '청원·경조', '돌아가': '청원·경조', '장례': '청원·경조',
  '수당': '임금·수당', '급여': '임금·수당', '월급': '임금·수당', '통상임금': '임금·수당', '가족수당': '임금·수당',
  '승진': '승진', '승격': '승진', '호봉': '승진',
  '휴직': '휴직', '육아휴직': '휴직', '질병휴직': '휴직',
  '출산': '연차·휴가', '임신': '연차·휴가',
  '복지': '복지', '감면': '복지', '진료비': '복지', '어린이집': '복지', '복지포인트': '복지',
  '근로시간': '근로시간', '근무시간': '근로시간', '시간외': '근로시간'
};

/**
 * 챗봇 검색: FAQ에서 가장 정확한 1건 + 핸드북 원문으로 보강
 */
function searchChat(query) {
  query = query.toLowerCase().trim();
  if (!query) return null;

  const qWords = query.split(/\s+/);

  // ── 1) 쿼리에서 핵심 카테고리 추론 ──
  let mappedCategory = null;
  for (const word of qWords) {
    if (CHAT_CATEGORY_MAP[word]) { mappedCategory = CHAT_CATEGORY_MAP[word]; break; }
  }
  // alias를 통한 카테고리 추론
  if (!mappedCategory) {
    for (const [key, words] of Object.entries(CHAT_ALIASES)) {
      if (query.includes(key) || words.some(w => query.includes(w))) {
        if (CHAT_CATEGORY_MAP[key]) { mappedCategory = CHAT_CATEGORY_MAP[key]; break; }
      }
    }
  }

  // ── 2) FAQ 점수 계산 (가장 정확한 1건만) ──
  const scored = DATA.faq.map(item => {
    let score = 0;
    const qLower = item.q.toLowerCase();
    const aLower = item.a.toLowerCase();

    // 질문에 직접 매칭 (가장 높은 가중치)
    qWords.forEach(w => {
      if (qLower.includes(w)) score += 5;
      if (aLower.includes(w)) score += 1;
    });

    // alias 가산
    Object.entries(CHAT_ALIASES).forEach(([key, words]) => {
      const queryHasKey = query.includes(key) || words.some(w => query.includes(w));
      if (queryHasKey && (qLower.includes(key) || aLower.includes(key))) score += 3;
    });

    // 매핑된 카테고리가 있으면 같은 카테고리 FAQ에 보너스
    // 단, 카테고리가 넓은 경우(휴가) 질문 직접매칭 안되면 보너스 줄이기
    if (mappedCategory) {
      const catSection = DATA.handbook.find(h => h.category === mappedCategory);
      if (catSection && item.category === catSection.category) {
        score += 2;
      } else if (item.category === mappedCategory) {
        score += 2;
      }
    }

    return { ...item, score };
  });

  const best = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score)[0];

  // ── 3) 핸드북에서 원문 찾기 ──
  let handbookArticles = [];
  // 핸드북 카테고리 직접 매칭
  if (mappedCategory) {
    const section = DATA.handbook.find(h => h.category === mappedCategory);
    if (section) {
      // 카테고리 내에서 관련 article 필터링
      const articleScores = section.articles.map(art => {
        let s = 0;
        const tLower = art.title.toLowerCase();
        const bLower = art.body.toLowerCase();
        qWords.forEach(w => { if (tLower.includes(w)) s += 5; if (bLower.includes(w)) s += 1; });
        Object.entries(CHAT_ALIASES).forEach(([key, words]) => {
          if (query.includes(key) || words.some(w => query.includes(w))) {
            if (tLower.includes(key) || bLower.includes(key)) s += 3;
          }
        });
        return { ...art, score: s };
      });
      // 점수 높은 순 정렬, 최소 1건 보장
      const sorted = articleScores.sort((a, b) => b.score - a.score);
      // 질문이 구체적이면 (2단어 이상) 가장 관련있는 것만, 아니면 전체
      if (qWords.length >= 2 && sorted[0] && sorted[0].score > 0) {
        handbookArticles = sorted.filter(a => a.score > 0).slice(0, 2);
      } else {
        handbookArticles = sorted; // 카테고리 전체
      }
    }
  }

  // 핸드북 매칭 실패 시 FAQ 카테고리로 재시도
  if (handbookArticles.length === 0 && best) {
    // FAQ의 카테고리 → 핸드북 카테고리 매핑
    const faqCatMap = {
      '근로시간': '근로시간', '온콜': '온콜', '야간근무': '근로시간',
      '휴가': '연차·휴가', '경조': '청원·경조', '수당': '임금·수당',
      '휴직': '휴직', '승진': '승진', '복지': '복지'
    };
    const hbCat = faqCatMap[best.category];
    if (hbCat) {
      const section = DATA.handbook.find(h => h.category === hbCat);
      if (section) {
        // best FAQ의 ref와 매칭되는 article 우선
        const matched = section.articles.filter(a => best.ref && a.ref.includes(best.ref.split(',')[0].trim()));
        handbookArticles = matched.length > 0 ? matched.slice(0, 2) : [section.articles[0]];
      }
    }
  }

  if (!best && handbookArticles.length === 0) return null;

  return { faq: best || null, handbook: handbookArticles };
}

/**
 * 핸드북 원문을 HTML 블록으로 렌더
 */
function renderHandbookSource(articles) {
  if (!articles || articles.length === 0) return '';
  let html = '<div style="margin-top:10px; padding:10px 12px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); border-radius:8px; font-size:var(--text-body-normal);">';
  html += '<div style="font-weight:600; color:var(--accent-indigo); margin-bottom:6px;">📖 규정 원문</div>';
  articles.forEach((art, i) => {
    if (i > 0) html += '<hr style="border:none; border-top:1px solid rgba(99,102,241,0.1); margin:8px 0;">';
    html += `<div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${art.title} <span style="font-weight:400; color:var(--accent-indigo); font-size:var(--text-body-normal);">${art.ref}</span></div>`;
    html += `<div style="color:var(--text-secondary); white-space:pre-line; line-height:1.6;">${art.body}</div>`;
  });
  html += '</div>';
  return html;
}

if (document.getElementById('chatSend')) {
  document.getElementById('chatSend').addEventListener('click', handleChat);
}
if (document.getElementById('chatInput')) {
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChat();
  });
}

function handleChat() {
  const input = document.getElementById('chatInput');
  const query = input.value.trim();
  if (!query) return;

  addChatMessage(query, 'user');
  input.value = '';

  const result = searchChat(query);

  setTimeout(() => {
    if (!result) {
      addChatMessage(
        '해당 질문에 대한 답변을 찾지 못했습니다. 😅<br>' +
        '<small style="color:var(--text-muted)">더 구체적인 키워드로 검색해보세요. 예: "온콜", "연차", "야간", "가족수당", "승진"</small>',
        'bot'
      );
      return;
    }

    // 핸드북 카테고리 전체를 보여주는 경우 (단일 키워드 검색)
    if (result.handbook.length > 1 && !result.faq) {
      // 핸드북 원문만으로 답변
      let html = renderHandbookSource(result.handbook);
      addChatMessage(html, 'bot');
    } else {
      // FAQ 답변 + 핸드북 원문 보강
      let html = '';
      if (result.faq) {
        html += `<div style="margin-bottom:6px;">${result.faq.a}</div>`;
      }
      html += renderHandbookSource(result.handbook);
      const ref = result.faq ? result.faq.ref : (result.handbook[0] ? result.handbook[0].ref : null);
      addChatMessage(html, 'bot', ref);
    }
  }, 400);
}

// ═══════════ ⏰ 시간외·온콜 관리 ═══════════

// 현재 선택된 날짜 상태
let otSelectedDate = null;
let otHolidayMap = {};
let otCurrentYear = new Date().getFullYear();
let otCurrentMonth = new Date().getMonth() + 1;

// 월 이동
function otNavMonth(delta) {
  otCurrentMonth += delta;
  if (otCurrentMonth > 12) { otCurrentMonth = 1; otCurrentYear++; }
  if (otCurrentMonth < 1) { otCurrentMonth = 12; otCurrentYear--; }
  refreshOtCalendar();
}

function otGoToday() {
  const now = new Date();
  otCurrentYear = now.getFullYear();
  otCurrentMonth = now.getMonth() + 1;
  refreshOtCalendar();
}

// 초기화
function initOvertimeTab() {
  const now = new Date();
  otCurrentYear = now.getFullYear();
  otCurrentMonth = now.getMonth() + 1;

  const hourlyInput = document.getElementById('otHourly');
  const hint = document.getElementById('otHourlyHint');

  // 1순위: 프로필에서 시급 자동 반영
  const profile = PROFILE.load();
  if (profile) {
    const wage = PROFILE.calcWage(profile);
    if (wage && wage.hourlyRate > 0) {
      hourlyInput.value = wage.hourlyRate;
      hint.textContent = '📌 내 정보 자동반영';
    }
  }

  if (!hourlyInput.value || parseInt(hourlyInput.value) === 0) {
    // 2순위: 수동 저장된 시급 불러오기
    const saved = localStorage.getItem(window.getUserStorageKey ? window.getUserStorageKey('otManualHourly') : 'otManualHourly');
    if (saved && parseInt(saved) > 0) {
      hourlyInput.value = saved;
      hint.textContent = '✏️ 수동 입력값';
    } else {
      hint.textContent = '⬅ 시급을 입력하세요';
    }
  }

  refreshOtCalendar();
  _renderOvertimeAlertBanner(otCurrentYear, otCurrentMonth);
}

function _renderOvertimeAlertBanner(year, month) {
  var containerId = 'otAlertBannerWrap';
  var existing = document.getElementById(containerId);
  if (existing) existing.parentNode.removeChild(existing);

  var stats = OVERTIME.calcMonthlyStats(year, month);
  var supp = stats.payslipSupplement;
  var extHours = (stats.overtimeHours || 0) + (supp ? supp.totalHours : 0);

  var WARNING_H = 40, CRITICAL_H = 48, LIMIT_H = 52;
  var level = extHours >= CRITICAL_H ? 'critical' : extHours >= WARNING_H ? 'warning' : null;
  if (!level) return;

  var today = new Date().toISOString().slice(0, 10);
  var dismissKey = 'overtimeAlertDismissed_' + year + '-' + String(month).padStart(2, '0');
  if (localStorage.getItem(dismissKey) === today) return;

  var remaining = LIMIT_H - extHours;
  var pct = Math.round((extHours / LIMIT_H) * 100);

  var wrap = document.createElement('div');
  wrap.id = containerId;
  wrap.style.cssText = 'margin-bottom:12px;';

  var banner = document.createElement('div');
  var isWarning = level === 'warning';
  banner.style.cssText = [
    'display:flex;align-items:center;justify-content:space-between;gap:8px;',
    'padding:12px 14px;border-radius:10px;',
    isWarning
      ? 'background:rgba(245,158,11,0.08);border:2px solid var(--accent-amber,#f59e0b);'
      : 'background:rgba(244,63,94,0.08);border:2px solid var(--accent-rose,#f43f5e);font-weight:600;',
  ].join('');

  var msg = document.createElement('span');
  msg.style.cssText = 'font-size:var(--text-body-small,0.8rem);flex:1;line-height:1.4;';
  msg.textContent = isWarning
    ? '⚠️ 연장근로 ' + extHours + '시간 / 월 ' + LIMIT_H + '시간 한도까지 ' + remaining + '시간 남았습니다'
    : '🔴 연장근로 한도 근접! ' + extHours + '시간 / ' + LIMIT_H + '시간 (' + pct + '%) — 추가 시간외 신청 전 팀장 확인 필요';

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', '알림 닫기');
  closeBtn.style.cssText = [
    'min-width:44px;min-height:44px;padding:0;border:none;background:none;cursor:pointer;',
    'font-size:1.2rem;line-height:1;',
    isWarning ? 'color:var(--accent-amber,#f59e0b);' : 'color:var(--accent-rose,#f43f5e);',
  ].join('');
  closeBtn.onclick = function () {
    localStorage.setItem(dismissKey, today);
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  };

  banner.appendChild(msg);
  banner.appendChild(closeBtn);
  wrap.appendChild(banner);

  var tabEl = document.getElementById('tab-overtime');
  if (tabEl && tabEl.firstChild) {
    tabEl.insertBefore(wrap, tabEl.firstChild);
  } else if (tabEl) {
    tabEl.appendChild(wrap);
  }
}

// 오늘 날짜 자동 선택 (사용자 요청: 초기 로드 시 입력창 자동 팝업 방지를 위해 기능 비활성화)
function autoSelectToday() {
  // onOtDateClick()을 자동 호출하면 입력창(BottomSheet)이 즉시 열려 불편하다는 피드백에 따라 무효화합니다.
}

// 퀵액션 버튼 예상 수당 표시
function updateQuickActionPrices() {
  const hourlyRate = parseInt(document.getElementById('otHourly').value) || 0;
  if (hourlyRate === 0) return;

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dow = now.getDay();
  const isHoliday = !!otHolidayMap[now.getDate()];
  const isWeekendOrHoliday = dow === 0 || dow === 6 || isHoliday;

  // 시간외 2h
  try {
    const start2 = isWeekendOrHoliday ? '09:00' : '18:00';
    const end2 = isWeekendOrHoliday ? '11:00' : '20:00';
    const bd2 = OVERTIME.calcTimeBreakdown(dateStr, start2, end2, 'overtime', isHoliday);
    const pay2 = OVERTIME.calcEstimatedPay(bd2, hourlyRate, 'overtime');
    const el2 = document.getElementById('otQuick2hPay');
    if (el2) el2.textContent = '₩' + pay2.toLocaleString();
  } catch (e) { }

  // 온콜대기
  const elStandby = document.getElementById('otQuickStandbyPay');
  if (elStandby) elStandby.textContent = '₩' + DATA.allowances.onCallStandby.toLocaleString();

  // 온콜출근 (기본 2h 기준 예상)
  try {
    const bdc = OVERTIME.calcTimeBreakdown(dateStr, '00:00', '02:00', 'oncall_callout', isHoliday);
    let tempBd = { ...bdc };
    tempBd.extended += DATA.allowances.onCallCommuteHours;
    tempBd.totalHours += DATA.allowances.onCallCommuteHours;
    const payC = OVERTIME.calcEstimatedPay(tempBd, hourlyRate, 'oncall_callout');
    const elC = document.getElementById('otQuickCalloutPay');
    if (elC) elC.textContent = '₩' + payC.toLocaleString();
  } catch (e) { }
}

// ⚡ 퀵 기록: 1-click 저장 (시간외/온콜대기 전용)
function quickOtRecord(type, hours) {
  const hourlyRate = parseInt(document.getElementById('otHourly').value) || 0;

  if (hourlyRate === 0 && type !== 'oncall_standby') {
    showOtToast('⚠️ 시급을 먼저 설정해주세요', 'warning');
    return;
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dow = now.getDay();
  const isHoliday = !!otHolidayMap[now.getDate()];
  const isWeekendOrHoliday = dow === 0 || dow === 6 || isHoliday;

  let startTime = '', endTime = '';

  if (type === 'oncall_standby') {
    startTime = '';
    endTime = '';
  } else {
    // 시간외: 평일 18시, 주말/휴일 09시 시작
    const baseHour = isWeekendOrHoliday ? 9 : 18;
    startTime = `${String(baseHour).padStart(2, '0')}:00`;
    const endHour = baseHour + hours;
    endTime = `${String(endHour % 24).padStart(2, '0')}:00`;
  }

  OVERTIME.createRecord(dateStr, startTime, endTime, type, hourlyRate, isHoliday, '');

  const lastRecords = OVERTIME.getDateRecords(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const lastRecord = lastRecords[lastRecords.length - 1];
  const pay = lastRecord ? lastRecord.estimatedPay || 0 : 0;
  showOtToast(`✅ 저장 완료 — ₩${pay.toLocaleString()}`);

  refreshOtCalendar().then(() => {
    autoSelectToday();
    updateQuickActionPrices();
  });
}

// 🚗 온콜출근 퀵액션: 시간입력 모달 열기
function quickOtCallout() {
  const hourlyRate = parseInt(document.getElementById('otHourly').value) || 0;
  if (hourlyRate === 0) {
    showOtToast('⚠️ 시급을 먼저 설정해주세요', 'warning');
    return;
  }
  const modal = document.getElementById('otCalloutModal');
  modal.style.display = 'block';
  document.getElementById('otCalloutStart').value = '';
  document.getElementById('otCalloutEnd').value = '';
  document.getElementById('otCalloutMemo').value = '';
  document.getElementById('otCalloutPreview').innerHTML = '<span style="color:var(--text-muted)">출근/퇴근 시간을 입력하세요</span>';
}

// 온콜출근 모달 닫기
function closeCalloutModal() {
  document.getElementById('otCalloutModal').style.display = 'none';
}

// 온콜출근 미리보기 (시간+분 표시)
function previewCalloutCalc() {
  const preview = document.getElementById('otCalloutPreview');
  const startTime = document.getElementById('otCalloutStart').value;
  const endTime = document.getElementById('otCalloutEnd').value;
  const hourlyRate = parseInt(document.getElementById('otHourly').value) || 0;

  if (!startTime || !endTime) {
    preview.innerHTML = '<span style="color:var(--text-muted)">출근/퇴근 시간을 입력하세요</span>';
    return;
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isHoliday = !!otHolidayMap[now.getDate()];

  const breakdown = OVERTIME.calcTimeBreakdown(dateStr, startTime, endTime, 'oncall_callout', isHoliday);
  let tempBreakdown = { ...breakdown };
  tempBreakdown.extended += DATA.allowances.onCallCommuteHours;
  tempBreakdown.totalHours += DATA.allowances.onCallCommuteHours;

  const pay = OVERTIME.calcEstimatedPay(tempBreakdown, hourlyRate, 'oncall_callout');

  // 시간+분 계산
  const totalMinutes = Math.round(tempBreakdown.totalHours * 60);
  const dispH = Math.floor(totalMinutes / 60);
  const dispM = totalMinutes % 60;
  const durationStr = dispM > 0 ? `${dispH}시간 ${dispM}분` : `${dispH}시간`;

  let html = `<div class="preview-total" style="border:none; margin:0 0 8px 0; padding:0 0 8px 0; border-bottom:1px solid rgba(16,185,129,0.15);">
    <span>💰 예상 수당</span>
    <span style="font-size:var(--text-title-large);">₩${pay.toLocaleString()}</span>
  </div>`;
  html += `<div class="preview-row"><span>근무시간</span><span class="val" style="color:var(--accent-emerald)">${durationStr} (${startTime}~${endTime})</span></div>`;
  if (breakdown.extended > 0) {
    html += `<div class="preview-row"><span>연장 ${breakdown.extended}h + 이동 ${DATA.allowances.onCallCommuteHours}h × 150%</span><span class="val">${(tempBreakdown.extended * hourlyRate * 1.5).toLocaleString()}원</span></div>`;
  }
  if (tempBreakdown.night > 0) {
    html += `<div class="preview-row"><span>야간 ${tempBreakdown.night}h × 200%</span><span class="val">${(tempBreakdown.night * hourlyRate * 2.0).toLocaleString()}원</span></div>`;
  }
  html += `<div class="preview-row"><span>온콜교통비</span><span class="val">₩${DATA.allowances.onCallTransport.toLocaleString()}</span></div>`;

  preview.innerHTML = html;
}

// 온콜출근 저장
function saveCalloutRecord() {
  const startTime = document.getElementById('otCalloutStart').value;
  const endTime = document.getElementById('otCalloutEnd').value;
  const memo = document.getElementById('otCalloutMemo').value;
  const hourlyRate = parseInt(document.getElementById('otHourly').value) || 0;

  if (!startTime || !endTime) {
    showOtToast('⚠️ 출근/퇴근 시간을 입력하세요', 'warning');
    return;
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isHoliday = !!otHolidayMap[now.getDate()];

  OVERTIME.createRecord(dateStr, startTime, endTime, 'oncall_callout', hourlyRate, isHoliday, memo);

  const lastRecords = OVERTIME.getDateRecords(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const lastRecord = lastRecords[lastRecords.length - 1];
  const pay = lastRecord ? lastRecord.estimatedPay || 0 : 0;

  // 시간+분 계산
  const totalH = lastRecord ? lastRecord.totalHours || 0 : 0;
  const totalMin = Math.round(totalH * 60);
  const dH = Math.floor(totalMin / 60);
  const dM = totalMin % 60;
  const durStr = dM > 0 ? `${dH}h${dM}m` : `${dH}h`;

  closeCalloutModal();
  showOtToast(`✅ 온콜출근 ${durStr} — ₩${pay.toLocaleString()}`);

  refreshOtCalendar().then(() => {
    autoSelectToday();
    updateQuickActionPrices();
  });
}

// 시간 프리셋 적용
function applyOtTimePreset(hours) {
  // 프리셋 버튼 활성화 표시
  document.querySelectorAll('.ot-preset-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');

  // 직접 입력 숨기기
  const customRow = document.getElementById('otCustomTimeRow');
  const customBtn = document.getElementById('otCustomTimeBtn');
  customRow.style.display = 'none';
  customBtn.classList.remove('active');

  // 날짜 정보로 시작시간 결정
  const dateStr = document.getElementById('otInputPanel').dataset?.date;
  const isHoliday = document.getElementById('otInputPanel').dataset?.isHoliday === '1';
  let baseHour = 18; // 평일 기본

  if (dateStr) {
    const dow = new Date(dateStr).getDay();
    if (dow === 0 || dow === 6 || isHoliday) {
      baseHour = 9; // 주말/공휴일
    }
  }

  const startH = String(baseHour).padStart(2, '0');
  const endH = String((baseHour + hours) % 24).padStart(2, '0');

  document.getElementById('otStartTime').value = `${startH}:00`;
  document.getElementById('otEndTime').value = `${endH}:00`;

  previewOtCalc();
}

// 직접 시간 입력 토글
function toggleOtCustomTime() {
  const customRow = document.getElementById('otCustomTimeRow');
  const customBtn = document.getElementById('otCustomTimeBtn');
  const isShowing = customRow.style.display !== 'none';

  if (isShowing) {
    customRow.style.display = 'none';
    customBtn.classList.remove('active');
  } else {
    customRow.style.display = 'grid';
    customBtn.classList.add('active');
    // 다른 프리셋 비활성화
    document.querySelectorAll('.ot-preset-btn:not(.custom)').forEach(btn => btn.classList.remove('active'));
  }
}

// 토스트 알림
function showOtToast(message, type = 'success') {
  const toast = document.getElementById('otToast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(16, 185, 129, 0.95)';
  toast.style.display = 'block';
  // Force reflow for animation
  toast.offsetHeight;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.style.display = 'none'; }, 400);
  }, 2500);
}

// 시급 수동 입력 시 저장
// ── 시간외 도움말 토글 ──
function toggleOtHelp() {
  const content = document.getElementById('otHelpContent');
  const arrow = document.getElementById('otHelpArrow');
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function toggleOtHelpDetail(el, e) {
  e.stopPropagation();
  el.classList.toggle('open');
}

function onOtHourlyInput() {
  const val = parseInt(document.getElementById('otHourly').value) || 0;
  const hint = document.getElementById('otHourlyHint');

  // 프로필 연결 여부 확인
  const profile = PROFILE.load();
  const hasProfileWage = profile && PROFILE.calcWage(profile)?.hourlyRate > 0;

  if (!hasProfileWage) {
    localStorage.setItem(window.getUserStorageKey ? window.getUserStorageKey('otManualHourly') : 'otManualHourly', val.toString());
    hint.textContent = val > 0 ? '✏️ 수동 입력값 (자동저장)' : '⬅ 시급을 입력하세요';
  }

  previewOtCalc();
}

// 캘린더 새로고침
async function refreshOtCalendar() {
  const year = otCurrentYear;
  const month = otCurrentMonth;

  // 1. 빠른 렌더링을 위해 캐시된 기록만 먼저 표시 (공휴일 API 로딩 대기 방지)
  const records = OVERTIME.getMonthRecords(year, month) || [];
  const recordsByDay = {};
  records.forEach(r => {
    const day = parseInt(r.date.split('-')[2]);
    if (!recordsByDay[day]) recordsByDay[day] = [];
    recordsByDay[day].push(r);
  });

  // 기본 달력 틀과 기존 기록을 먼저 그림
  renderOtCalendar(year, month, recordsByDay);
  renderOtRecordList(records);
  renderOtDashboard(year, month);
  renderOtVerification(year, month);
  resetOtPanel();

  // 2. 공휴일 데이터 (휴가 캘린더와 동일 패턴) 백그라운드 로드
  let workInfo;
  try { workInfo = await HOLIDAYS.calcWorkDays(year, month); }
  catch { workInfo = { holidays: [], anniversaries: [] }; }

  otHolidayMap = {};
  (workInfo.holidays || []).forEach(h => { otHolidayMap[h.day] = h.name; });

  // 3. 공휴일 데이터가 준비되면 다시 렌더링 (깜빡임 없이 속성만 추가됨)
  renderOtCalendar(year, month, recordsByDay);
  renderOtDashboard(year, month); // 대시보드도 공휴일 영향을 받을 수 있으므로 재렌더링
  renderOtVerification(year, month);
  autoSelectToday();
}

// 캘린더 렌더링
function renderOtCalendar(year, month, recordsByDay) {
  const container = document.getElementById('otCalendar');
  if (!container) return;

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();

  const today = new Date();
  const isCurrentMonth = (today.getFullYear() === year && (today.getMonth() + 1) === month);
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const dowLabels = ['일', '월', '화', '수', '목', '금', '토'];
  let html = '<div class="ot-cal"><div class="ot-cal-header">'
    + '<button class="cal-nav-btn" onclick="otNavMonth(-1)">◀</button>'
    + '<span class="cal-nav-title" onclick="otGoToday()">' + year + '년 ' + month + '월</span>'
    + '<button class="cal-nav-btn" onclick="otNavMonth(1)">▶</button>'
    + '</div>';
  html += '<div class="ot-cal-grid">';

  // 요일 헤더
  dowLabels.forEach((d, i) => {
    const cls = i === 0 ? 'sun' : (i === 6 ? 'sat' : '');
    html += `<div class="ot-cal-dow ${cls}">${d}</div>`;
  });

  // 빈 셀
  for (let i = 0; i < firstDow; i++) {
    html += '<div class="ot-cal-day empty"></div>';
  }

  // 날짜 셀
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const isWknd = (dow === 0 || dow === 6);
    const isHoliday = !!otHolidayMap[d];
    const isToday = (d === todayDay);
    const isSelected = otSelectedDate && otSelectedDate.day === d;
    const dayRecords = recordsByDay[d] || [];

    let cls = 'ot-cal-day';
    if (isHoliday) cls += ' holiday';
    else if (isWknd) cls += ' weekend';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const titleParts = [];
    if (isHoliday) titleParts.push(otHolidayMap[d]);
    if (dayRecords.length > 0) titleParts.push(dayRecords.length + '건 기록');

    const titleAttr = titleParts.length > 0 ? ` title="${titleParts.join(' / ')}"` : '';

    // 기록 뱃지 + 누적금액
    let dotsHtml = '<div style="display:flex; flex-direction:column; gap:1px; margin-top:1px;">';
    if (isHoliday) {
      const hName = otHolidayMap[d];
      const hShort = hName.length > 3 ? hName.substring(0, 3) : hName;
      dotsHtml += `<span class="cal-badge" style="background:rgba(244,63,94,0.15); color:var(--accent-rose); font-weight:600;">${hShort}</span>`;
    }
    let dayTotalPay = 0;
    dayRecords.forEach(r => {
      dayTotalPay += r.estimatedPay || 0;
      if (r.type === 'oncall_standby') {
        dotsHtml += `<span class="cal-badge" style="background:rgba(6,182,212,0.15); color:#1a1a1a;">📞대기</span>`;
      } else if (r.type === 'oncall_callout') {
        dotsHtml += `<span class="cal-badge" style="background:rgba(99,102,241,0.15); color:#1a1a1a;">🚗${r.totalHours}h</span>`;
      } else if (r.type === 'overtime') {
        dotsHtml += `<span class="cal-badge" style="background:rgba(244,63,94,0.15); color:#1a1a1a;">⏰${r.totalHours}h</span>`;
      }
    });
    // 누적금액 표시 (1만원 이상이면 만원 단위)
    if (dayTotalPay > 0) {
      const payStr = dayTotalPay >= 10000
        ? Math.round(dayTotalPay / 10000) + '만'
        : '₩' + dayTotalPay.toLocaleString();
      dotsHtml += `<span class="cal-badge" style="color:var(--accent-emerald); font-weight:700; font-size:var(--text-label-small);">${payStr}</span>`;
    }
    dotsHtml += '</div>';

    html += `<div class="${cls}"${titleAttr} data-day="${d}" onclick="onOtDateClick(${year},${month},${d})">${d}${dotsHtml}</div>`;
  }

  html += '</div>'; // grid

  // 범례
  html += `<div class="ot-cal-legend" style="margin-top:16px;">
    <span><span class="cal-badge" style="background:rgba(244,63,94,0.15); color:#1a1a1a; padding:2px 6px;">⏰ 시간외</span></span>
    <span><span class="cal-badge" style="background:rgba(6,182,212,0.15); color:#1a1a1a; padding:2px 6px;">📞 대기</span></span>
    <span><span class="cal-badge" style="background:rgba(99,102,241,0.15); color:#1a1a1a; padding:2px 6px;">🚗 출근</span></span>
    <span><i class="dot" style="background:var(--accent-rose)"></i>공휴일</span>
  </div>`;

  html += '</div>'; // ot-cal
  container.innerHTML = html;
}

// 날짜 클릭
function onOtDateClick(year, month, day) {
  otSelectedDate = { year, month, day };

  // 캘린더 선택 표시 업데이트
  document.querySelectorAll('.ot-cal-day').forEach(el => el.classList.remove('selected'));
  const targetCell = document.querySelector(`#otCalendar .ot-cal-day[data-day="${day}"]`);
  if (targetCell) targetCell.classList.add('selected');

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dow = new Date(year, month - 1, day).getDay();
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  const isHoliday = !!otHolidayMap[day];

  let dateLabel = `${month}월 ${day}일 (${dowNames[dow]})`;
  if (isHoliday) dateLabel += ` 🔴 ${otHolidayMap[day]}`;
  if (dow === 0 || dow === 6) dateLabel += ' 🔵 주말';

  document.getElementById('otPanelDate').textContent = dateLabel;
  document.getElementById('otInputPanel').dataset.date = dateStr;
  document.getElementById('otInputPanel').dataset.isHoliday = isHoliday ? '1' : '0';

  // 해당 날짜 기존 기록 로드
  const existing = OVERTIME.getDateRecords(year, month, day);

  // 기존 기록 탭 렌더링 (선택형)
  renderOtRecordTabs(existing, dateStr);

  // 기존 기록이 없으면 → 신규 입력 모드 초기화
  // 기존 기록이 있으면 → 탭 선택을 기다림 (폼은 대기 상태)
  if (existing.length === 0) {
    // 신규 입력 모드
    document.getElementById('otEditId').value = '';
    document.getElementById('otDeleteBtn').style.display = 'none';
    document.getElementById('otSaveBtn').textContent = '저장';
    document.getElementById('otSaveBtn').disabled = false;
    document.getElementById('otMemo').value = '';
    document.querySelector('input[name="otType"][value="overtime"]').checked = true;
    onOtTypeChange();
    previewOtCalc();
  } else {
    // 기존 기록 있음 → 폼을 "대기" 상태로 (저장 버튼 숨기고 설명 표시)
    document.getElementById('otEditId').value = '';
    document.getElementById('otDeleteBtn').style.display = 'none';
    document.getElementById('otSaveBtn').textContent = '저장';
    document.getElementById('otSaveBtn').disabled = true;
    document.getElementById('otMemo').value = '';
    document.querySelector('input[name="otType"][value="overtime"]').checked = true;
    onOtTypeChange();
    previewOtCalc();
  }

  // 바텀 시트 열기 (모바일 대응)
  openOtBottomSheet();
}

// 기존 기록 탭 렌더링 (선택형 — 클릭 시 폼 로드)
function renderOtRecordTabs(existing, dateStr) {
  const existingContainer = document.getElementById('otExistingRecords');
  if (!existing || existing.length === 0) {
    existingContainer.innerHTML = '';
    return;
  }

  let html = `<div style="margin-bottom:16px;">`;
  html += `<div style="font-size:var(--text-body-normal); font-weight:700; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">`;
  html += `<span>📋</span> 이 날의 기록 — 선택하면 수정/삭제할 수 있어요</div>`;

  existing.forEach(r => {
    const timeStr = r.startTime ? `${r.startTime}~${r.endTime}` : '종일';
    const hoursStr = r.totalHours ? ` (${r.totalHours}h)` : '';
    html += `
      <div id="ot-tab-${r.id}"
        onclick="selectOtRecordTab('${r.id}')"
        style="
          padding:12px 14px;
          margin-bottom:8px;
          border-radius:10px;
          border:2px solid var(--border-glass);
          background:var(--bg-glass);
          cursor:pointer;
          display:flex;
          justify-content:space-between;
          align-items:center;
          transition:all 0.18s;
        "
        onmouseover="if(!this.classList.contains('ot-tab-selected')){ this.style.borderColor='rgba(99,102,241,0.35)'; this.style.background='rgba(99,102,241,0.04)'; }"
        onmouseout="if(!this.classList.contains('ot-tab-selected')){ this.style.borderColor='var(--border-glass)'; this.style.background='var(--bg-glass)'; }"
      >
        <div style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="ot-record-type ${r.type}">${OVERTIME.typeLabel(r.type)}</span>
            <span style="font-weight:600; font-size:13px; color:var(--text-secondary);">${timeStr}${hoursStr}</span>
          </div>
          <strong style="color:var(--accent-emerald); font-size:14px;">₩${(r.estimatedPay || 0).toLocaleString()}</strong>
        </div>
        <span data-hint style="color:var(--text-muted); font-size:12px; flex-shrink:0;">탭해서 선택 ›</span>
      </div>`;
  });

  // 새 기록 추가 탭
  html += `
    <div id="ot-tab-new"
      onclick="selectOtNewTab('${dateStr}')"
      style="
        padding:12px 14px;
        margin-bottom:4px;
        border-radius:10px;
        border:2px dashed var(--border-glass);
        background:transparent;
        cursor:pointer;
        display:flex;
        align-items:center;
        gap:8px;
        color:var(--text-muted);
        font-weight:600;
        font-size:var(--text-body-large);
        transition:all 0.18s;
      "
      onmouseover="this.style.borderColor='rgba(16,185,129,0.4)'; this.style.color='var(--accent-emerald)';"
      onmouseout="this.style.borderColor='var(--border-glass)'; this.style.color='var(--text-muted)';"
    >
      <span>＋</span> 새 기록 추가하기
    </div>`;

  html += '</div>';
  existingContainer.innerHTML = html;
}

// 기존 기록 탭 선택 → 수정 모드로 폼 로드
function selectOtRecordTab(id) {
  const selectedTab = document.getElementById(`ot-tab-${id}`);
  const isAlreadySelected = selectedTab && selectedTab.classList.contains('ot-tab-selected');

  // 모든 탭 선택 해제
  document.querySelectorAll('#otExistingRecords [id^="ot-tab-"]').forEach(el => {
    el.classList.remove('ot-tab-selected');
    el.style.borderColor = 'var(--border-glass)';
    el.style.background = 'var(--bg-glass)';
    const hint = el.querySelector('[data-hint]');
    if (hint) hint.textContent = '탭해서 선택 ›';
  });

  if (isAlreadySelected) {
    // 이미 선택된 탭 재클릭 → 선택 취소, 신규 입력 모드로
    document.getElementById('otEditId').value = '';
    document.getElementById('otDeleteBtn').style.display = 'none';
    document.getElementById('otSaveBtn').textContent = '저장';
    document.getElementById('otSaveBtn').disabled = true;
    document.getElementById('otMemo').value = '';
    document.querySelector('input[name="otType"][value="overtime"]').checked = true;
    onOtTypeChange();
    previewOtCalc();
    return;
  }

  // 새 탭 선택 하이라이트
  if (selectedTab) {
    selectedTab.classList.add('ot-tab-selected');
    selectedTab.style.borderColor = 'var(--accent-indigo)';
    selectedTab.style.background = 'rgba(99,102,241,0.07)';
    const hint = selectedTab.querySelector('[data-hint]');
    if (hint) hint.textContent = '선택됨 ✓';
  }
  // 폼에 기록 로드
  editOtRecord(id);
}

// 새 기록 추가 탭 선택 → 신규 입력 모드
function selectOtNewTab(dateStr) {
  // 탭 하이라이트
  document.querySelectorAll('#otExistingRecords [id^="ot-tab-"]').forEach(el => {
    el.classList.remove('ot-tab-selected');
    el.style.borderColor = 'var(--border-glass)';
    el.style.background = 'var(--bg-glass)';
    const hint = el.querySelector('[data-hint]');
    if (hint) hint.textContent = '탭해서 선택 ›';
  });
  const newTab = document.getElementById('ot-tab-new');
  if (newTab) {
    newTab.classList.add('ot-tab-selected');
    newTab.style.borderColor = 'rgba(16,185,129,0.5)';
    newTab.style.color = 'var(--accent-emerald)';
  }

  // 신규 입력 모드로 폼 초기화
  const isHoliday = document.getElementById('otInputPanel').dataset.isHoliday === '1';
  document.getElementById('otEditId').value = '';
  document.getElementById('otDeleteBtn').style.display = 'none';
  document.getElementById('otSaveBtn').textContent = '저장';
  document.getElementById('otSaveBtn').disabled = false;
  document.getElementById('otMemo').value = '';
  document.querySelector('input[name="otType"][value="overtime"]').checked = true;
  onOtTypeChange();
  previewOtCalc();
}

// ── 바텀 시트 컨트롤 ──
function openOtBottomSheet() {
  const overlay = document.getElementById('otInputOverlay');
  const panel = document.getElementById('otInputPanel');
  if (overlay && panel) {
    overlay.classList.add('show');
    panel.classList.add('show');
  }
}

function closeOtBottomSheet() {
  const overlay = document.getElementById('otInputOverlay');
  const panel = document.getElementById('otInputPanel');
  if (overlay && panel) {
    overlay.classList.remove('show');
    panel.classList.remove('show');
  }
  // Also close leave bottom sheet if open
  closeLvBottomSheet();
}

// 패널 초기화 (항상 표시 유지, 필드만 리셋)
function resetOtPanel() {
  otSelectedDate = null;
  document.querySelectorAll('.ot-cal-day').forEach(el => el.classList.remove('selected'));
  document.getElementById('otPanelDate').textContent = '날짜를 선택하세요';
  document.getElementById('otEditId').value = '';
  document.getElementById('otDeleteBtn').style.display = 'none';
  document.getElementById('otSaveBtn').textContent = '저장';
  document.getElementById('otSaveBtn').disabled = true;
  document.getElementById('otMemo').value = '';
  document.getElementById('otExistingRecords').innerHTML = '';
  document.getElementById('otPreview').innerHTML = '';
  document.getElementById('otInputPanel').dataset.date = '';
  document.getElementById('otInputPanel').dataset.isHoliday = '0';
}

// 하위 호환
function closeOtPanel() { resetOtPanel(); }

// 유형 변경
function onOtTypeChange() {
  const type = document.querySelector('input[name="otType"]:checked').value;
  const timeFields = document.getElementById('otTimeFields');

  if (type === 'oncall_standby') {
    timeFields.style.display = 'none';
  } else {
    timeFields.style.display = 'block';
  }

  previewOtCalc();
}

// 실시간 미리보기 (수당 금액 강조)
function previewOtCalc() {
  const preview = document.getElementById('otPreview');
  const type = document.querySelector('input[name="otType"]:checked')?.value;
  const hourlyRate = parseInt(document.getElementById('otHourly').value) || 0;
  const dateStr = document.getElementById('otInputPanel').dataset?.date;
  const isHoliday = document.getElementById('otInputPanel').dataset?.isHoliday === '1';

  if (!type || !dateStr) {
    preview.innerHTML = '';
    return;
  }

  if (type === 'oncall_standby') {
    const pay = DATA.allowances.onCallStandby;
    preview.innerHTML = `
      <div class="preview-total" style="border:none; margin:0; padding:0;">
        <span>💰 예상 수당</span>
        <span style="font-size:var(--text-title-large);">₩${pay.toLocaleString()}</span>
      </div>
      <div class="preview-row"><span>온콜 대기수당</span><span class="val">₩${pay.toLocaleString()}</span></div>`;
    return;
  }

  const startTime = document.getElementById('otStartTime').value;
  const endTime = document.getElementById('otEndTime').value;

  if (!startTime || !endTime) {
    preview.innerHTML = '<span style="color:var(--text-muted)">시작/종료 시간을 입력하세요</span>';
    return;
  }

  const breakdown = OVERTIME.calcTimeBreakdown(dateStr, startTime, endTime, type, isHoliday);
  let tempBreakdown = { ...breakdown };

  // 온콜 출근 시 출퇴근 2시간
  if (type === 'oncall_callout') {
    tempBreakdown.extended += DATA.allowances.onCallCommuteHours;
    tempBreakdown.totalHours += DATA.allowances.onCallCommuteHours;
  }

  const pay = OVERTIME.calcEstimatedPay(tempBreakdown, hourlyRate, type);

  // 수당 금액을 크게 맨 위에 표시
  let html = `<div class="preview-total" style="border:none; margin:0 0 8px 0; padding:0 0 8px 0; border-bottom:1px solid rgba(16,185,129,0.15);">
    <span>💰 예상 수당</span>
    <span style="font-size:var(--text-title-large);">₩${pay.toLocaleString()}</span>
  </div>`;

  html += `<div class="preview-row"><span>총 근무시간</span><span class="val">${tempBreakdown.totalHours}h</span></div>`;

  if (tempBreakdown.extended > 0) {
    const label = type === 'oncall_callout' ?
      `연장 ${breakdown.extended}h + 이동 ${DATA.allowances.onCallCommuteHours}h` :
      `연장 ${tempBreakdown.extended}h`;
    html += `<div class="preview-row"><span>${label} × 150%</span><span class="val">${(tempBreakdown.extended * hourlyRate * 1.5).toLocaleString()}원</span></div>`;
  }
  if (tempBreakdown.night > 0) {
    html += `<div class="preview-row"><span>야간 ${tempBreakdown.night}h × 200%</span><span class="val">${(tempBreakdown.night * hourlyRate * 2.0).toLocaleString()}원</span></div>`;
  }
  if (tempBreakdown.holiday > 0) {
    const holBase = Math.min(tempBreakdown.holiday, 8);
    const holOver = Math.max(tempBreakdown.holiday - 8, 0);
    const holPay = Math.round(holBase * hourlyRate * 1.5) + Math.round(holOver * hourlyRate * 2.0);
    const holLabel = holOver > 0 ? `휴일 ${holBase}h×150% + ${holOver}h×200%` : `휴일 ${holBase}h × 150%`;
    html += `<div class="preview-row"><span>${holLabel}</span><span class="val">${holPay.toLocaleString()}원</span></div>`;
  }
  if (tempBreakdown.holidayNight > 0) {
    html += `<div class="preview-row"><span>휴일야간 ${tempBreakdown.holidayNight}h × 200%</span><span class="val">${(tempBreakdown.holidayNight * hourlyRate * 2.0).toLocaleString()}원</span></div>`;
  }
  if (type === 'oncall_callout') {
    html += `<div class="preview-row"><span>온콜교통비</span><span class="val">₩${DATA.allowances.onCallTransport.toLocaleString()}</span></div>`;
  }

  preview.innerHTML = html;
}

// ── 시간외 중복 검사 헬퍼 ──
function checkOtOverlap(dateStr, startTime, endTime, type, excludeId) {
  const parseMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const epochMin = (dStr) => {
    const [y, mo, d] = dStr.split('-').map(Number);
    return Math.floor(new Date(y, mo - 1, d).getTime() / 60000);
  };

  // 규칙 1: 온콜출근 ↔ 온콜대기 같은 날 공존 불가
  if (type === 'oncall_callout' || type === 'oncall_standby') {
    const [y, m, d] = dateStr.split('-').map(Number);
    const sameDayRecords = OVERTIME.getDateRecords(y, m, d).filter(r => r.id !== excludeId);
    const conflictType = type === 'oncall_callout' ? 'oncall_standby' : 'oncall_callout';
    if (sameDayRecords.some(r => r.type === conflictType)) {
      return `같은 날에 온콜출근과 온콜대기를 함께 등록할 수 없습니다.`;
    }
  }

  // 규칙 2: 시간 겹침 검사 (온콜대기는 시간 없으므로 제외)
  if (type === 'oncall_standby' || !startTime || !endTime) return null;

  const baseMin = epochMin(dateStr);
  const newS = baseMin + parseMin(startTime);
  const newE = parseMin(endTime) <= parseMin(startTime)
    ? baseMin + parseMin(endTime) + 1440   // 자정 넘김 → 익일로
    : baseMin + parseMin(endTime);

  // 당일, 전날, 익일 기록 검사 (자정 넘김 대응)
  const [y, m, d] = dateStr.split('-').map(Number);
  const checkDates = [-1, 0, 1].map(offset => {
    const dt = new Date(y, m - 1, d + offset);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  });

  for (const dStr of checkDates) {
    const [cy, cm, cd] = dStr.split('-').map(Number);
    const records = OVERTIME.getDateRecords(cy, cm, cd).filter(r => r.id !== excludeId);
    for (const r of records) {
      if (r.type === 'oncall_standby' || !r.startTime || !r.endTime) continue;
      const rBase = epochMin(r.date);
      const rS = rBase + parseMin(r.startTime);
      const rE = parseMin(r.endTime) <= parseMin(r.startTime)
        ? rBase + parseMin(r.endTime) + 1440
        : rBase + parseMin(r.endTime);
      if (newS < rE && newE > rS) {
        return `입력한 시간(${startTime}~${endTime})이 기존 기록(${OVERTIME.typeLabel(r.type)} ${r.startTime}~${r.endTime}, ${r.date})과 겹칩니다.`;
      }
    }
  }

  return null;
}

// 저장
function saveOtRecord() {
  const type = document.querySelector('input[name="otType"]:checked').value;
  const dateStr = document.getElementById('otInputPanel').dataset.date;
  const isHoliday = document.getElementById('otInputPanel').dataset.isHoliday === '1';
  const hourlyRate = parseInt(document.getElementById('otHourly').value) || 0;
  const memo = document.getElementById('otMemo').value;
  const editId = document.getElementById('otEditId').value;

  let startTime = document.getElementById('otStartTime').value;
  let endTime = document.getElementById('otEndTime').value;

  if (!dateStr) {
    alert('날짜를 먼저 선택해주세요.');
    return;
  }

  if (type !== 'oncall_standby' && (!startTime || !endTime)) {
    alert('시작/종료 시간을 입력하세요.');
    return;
  }

  if (hourlyRate === 0 && type !== 'oncall_standby') {
    alert('시급이 설정되지 않았습니다. 시급 계산기를 이용하거나 내 정보를 저장해주세요.');
    return;
  }

  // 중복 검사
  const overlapError = checkOtOverlap(dateStr, startTime, endTime, type, editId);
  if (overlapError) {
    alert(overlapError);
    return;
  }

  if (editId) {
    OVERTIME.updateRecordFull(editId, dateStr, startTime, endTime, type, hourlyRate, isHoliday, memo);
  } else {
    OVERTIME.createRecord(dateStr, startTime, endTime, type, hourlyRate, isHoliday, memo);
  }

  refreshOtCalendar();
  closeOtBottomSheet();
}

// 기록 수정 모드 (탭에서 선택하거나 하단 기록 목록에서 호출)
function editOtRecord(id) {
  const all = OVERTIME._loadAll();
  let record = null;
  for (const records of Object.values(all)) {
    record = records.find(r => r.id === id);
    if (record) break;
  }
  if (!record) return;

  // 해당 날짜로 패널 열기 (탭에서 이미 열려 있으면 그대로 유지)
  const [y, m, d] = record.date.split('-').map(Number);
  otSelectedDate = { year: y, month: m, day: d };

  document.getElementById('otInputPanel').dataset.date = record.date;
  document.getElementById('otInputPanel').dataset.isHoliday = record.isHoliday ? '1' : '0';

  const dow = new Date(y, m - 1, d).getDay();
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  let dateLabel = `${m}월 ${d}일 (${dowNames[dow]})`;
  if (!!otHolidayMap[d]) dateLabel += ` 🔴 ${otHolidayMap[d]}`;
  if (dow === 0 || dow === 6) dateLabel += ' 🔵 주말';
  document.getElementById('otPanelDate').textContent = dateLabel;

  // 필드 채우기
  document.querySelector(`input[name="otType"][value="${record.type}"]`).checked = true;
  onOtTypeChange();

  if (record.startTime) document.getElementById('otStartTime').value = record.startTime;
  if (record.endTime) document.getElementById('otEndTime').value = record.endTime;
  document.getElementById('otMemo').value = record.memo || '';

  // 수정 모드 표시 — otEditId에 id 박아넣고, 삭제 버튼 onclick에도 id를 직접 전달
  document.getElementById('otEditId').value = id;
  const deleteBtn = document.getElementById('otDeleteBtn');
  deleteBtn.style.display = 'block';
  deleteBtn.setAttribute('onclick', `deleteOtRecord('${id}')`);
  document.getElementById('otSaveBtn').disabled = false;
  document.getElementById('otSaveBtn').textContent = '수정';

  previewOtCalc();
}

// 삭제 (id를 직접 받거나, 수정 모드의 otEditId에서 읽음)
function deleteOtRecord(id) {
  const targetId = id || document.getElementById('otEditId').value;
  if (!targetId) {
    console.warn('[deleteOtRecord] targetId가 비어있음');
    return;
  }

  const dateStr = document.getElementById('otInputPanel').dataset.date;
  console.log('[deleteOtRecord] 삭제 시작 id:', targetId, 'dateStr:', dateStr);

  // confirm 없이 즉시 삭제 (confirm이 환경에 따라 블록될 수 있음)
  OVERTIME.deleteRecord(targetId);
  console.log('[deleteOtRecord] OVERTIME.deleteRecord 완료');

  // 바텀시트 닫기
  closeOtBottomSheet();

  // 캘린더 및 기록 목록 전체 갱신
  refreshOtCalendar();
}

// 월간 대시보드 렌더링 (수당 금액 중심)
function renderOtDashboard(year, month) {
  const stats = OVERTIME.calcMonthlyStats(year, month);
  const supp = stats.payslipSupplement;

  const effectiveOtHours = stats.overtimeHours + (supp ? supp.totalHours : 0);
  const effectivePay = stats.totalPay + (supp ? supp.pay : 0);

  const container = document.getElementById('otDashboard');
  if (container) {
    while (container.firstChild) container.removeChild(container.firstChild);

    // 메인 수당
    const mainDiv = document.createElement('div');
    mainDiv.className = 'ot-dash-main';
    const labelDiv = document.createElement('div');
    labelDiv.className = 'ot-dash-label';
    labelDiv.textContent = '\uD83D\uDCB0 ' + month + '월 예상 수당';
    const payDiv = document.createElement('div');
    payDiv.className = 'ot-dash-pay';
    payDiv.textContent = '\u20A9' + effectivePay.toLocaleString();
    mainDiv.appendChild(labelDiv);
    mainDiv.appendChild(payDiv);
    if (supp) {
      const suppNote = document.createElement('div');
      suppNote.style.cssText = 'font-size:var(--text-body-small); color:var(--accent-indigo); margin-top:4px;';
      suppNote.textContent = '명세서 보충 +' + supp.totalHours.toFixed(1) + 'h 포함';
      mainDiv.appendChild(suppNote);
    }
    container.appendChild(mainDiv);

    // 상세 항목
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'ot-dash-details';
    const detailItems = [
      { label: '시간외', value: effectiveOtHours.toFixed(1) + 'h', cls: 'rose' },
      { label: '온콜출근', value: stats.byType.oncall_callout.hours.toFixed(1) + 'h', cls: 'indigo' },
      { label: '온콜대기', value: stats.oncallStandbyDays + '일', cls: 'cyan' },
    ];
    const visibleItems = detailItems.filter(i => parseFloat(i.value) > 0);
    if (visibleItems.length > 0) {
      visibleItems.forEach(item => {
        const el = document.createElement('div');
        el.className = 'ot-dash-item';
        el.textContent = item.label + ' ';
        const valSpan = document.createElement('span');
        valSpan.className = 'ot-dash-value ' + item.cls;
        valSpan.textContent = item.value;
        el.appendChild(valSpan);
        detailsDiv.appendChild(el);
      });
    } else {
      const emptySpan = document.createElement('span');
      emptySpan.style.cssText = 'color:var(--text-muted); font-size:var(--text-body-normal);';
      emptySpan.textContent = '기록 없음';
      detailsDiv.appendChild(emptySpan);
    }
    container.appendChild(detailsDiv);
  }

  const countEl = document.getElementById('otRecordCount');
  if (countEl) countEl.textContent = stats.recordCount + '건';

  const monthEl = document.getElementById('otRecordMonth');
  if (monthEl) monthEl.textContent = month;
}

// ── 명세서 자동 보충 카드 렌더링 ──
function renderOtVerification(year, month) {
  const card = document.getElementById('otVerifyCard');
  const content = document.getElementById('otVerifyContent');
  const titleEl = document.getElementById('otVerifyTitle');
  const badge = document.getElementById('otVerifyBadge');
  if (!card || !content) return;

  const result = OVERTIME.crossVerify(year, month);

  if (!result) {
    card.style.display = 'none';
    return;
  }

  card.style.display = '';
  const fmt = n => n != null ? n.toLocaleString() + '원' : '-';

  // 보충 항목: 명세서 > 내 기록 (diff < -0.25 → 내가 덜 기록)
  const supplements = result.items.filter(i => i.diffHours < -0.25);
  const hasSupplement = supplements.length > 0;

  titleEl.textContent = month + '월 명세서 자동 보충';
  if (hasSupplement) {
    badge.textContent = supplements.length + '건 보충';
    badge.className = 'badge indigo';
  } else if (result.hasManualRecords) {
    badge.textContent = '✅ 일치';
    badge.className = 'badge emerald';
  } else {
    badge.textContent = '';
    badge.className = 'badge';
  }

  content.textContent = '';

  // ── 보충 안내 메시지 ──
  if (hasSupplement) {
    const msgBox = document.createElement('div');
    msgBox.style.cssText = 'margin-bottom:14px; padding:14px 16px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.18); border-radius:10px; line-height:1.7;';
    const headline = document.createElement('div');
    headline.style.cssText = 'font-weight:600; font-size:var(--text-body-normal); color:var(--text-primary);';
    headline.textContent = '직접 입력 못하신 부분을 명세서에서 확인했어요';
    msgBox.appendChild(headline);
    const detail = document.createElement('div');
    detail.style.cssText = 'margin-top:6px; font-size:var(--text-body-small); color:var(--text-secondary);';
    const parts = supplements.map(s => s.label + ' ' + Math.abs(s.diffHours).toFixed(1) + '시간');
    detail.textContent = parts.join(', ') + ' 보충';
    msgBox.appendChild(detail);
    content.appendChild(msgBox);
  } else if (result.hasManualRecords) {
    const okBox = document.createElement('div');
    okBox.style.cssText = 'margin-bottom:14px; padding:14px 16px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.18); border-radius:10px; font-size:var(--text-body-normal); color:var(--text-primary);';
    okBox.textContent = '직접 기록하신 내용과 명세서가 일치해요.';
    content.appendChild(okBox);
  }

  // ── 비교 테이블 ──
  const table = document.createElement('table');
  table.style.cssText = 'width:100%; border-collapse:collapse; font-size:var(--text-body-normal);';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.style.cssText = 'background:var(--bg-hover); color:var(--text-muted);';
  ['항목', '직접 기록', '명세서', '보충'].forEach((t, i) => {
    const th = document.createElement('th');
    th.style.cssText = 'padding:8px 6px;' + (i > 0 ? ' text-align:right;' : ' text-align:left;');
    th.textContent = t;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  result.items.forEach(item => {
    if (item.manualHours === 0 && item.payslipHours === 0) return;
    const diff = item.diffHours; // manual - payslip

    let statusText, statusColor;
    if (Math.abs(diff) < 0.25) {
      statusText = '✅';
      statusColor = 'var(--accent-emerald)';
    } else if (diff < 0) {
      // 명세서가 더 많음 → 보충
      statusText = '+' + Math.abs(diff).toFixed(1) + 'h';
      statusColor = 'var(--accent-indigo)';
    } else {
      // 내가 더 많이 기록 → 추가 기록 (중립)
      statusText = '+' + diff.toFixed(1) + 'h 직접';
      statusColor = 'var(--text-muted)';
    }

    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.style.padding = '7px 6px'; td1.textContent = item.label;
    const td2 = document.createElement('td'); td2.style.cssText = 'padding:7px 6px; text-align:right;'; td2.textContent = item.manualHours.toFixed(1) + 'h';
    const td3 = document.createElement('td'); td3.style.cssText = 'padding:7px 6px; text-align:right;'; td3.textContent = item.payslipHours.toFixed(1) + 'h';
    const td4 = document.createElement('td'); td4.style.cssText = 'padding:7px 6px; text-align:right; font-weight:600; color:' + statusColor + ';'; td4.textContent = statusText;
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
    tbody.appendChild(tr);
  });

  // 온콜 행
  const addOncallRow = (label, count, unit) => {
    if (count <= 0) return;
    const tr = document.createElement('tr');
    tr.style.color = 'var(--text-muted)';
    const td1 = document.createElement('td'); td1.style.padding = '7px 6px'; td1.textContent = label;
    const td2 = document.createElement('td'); td2.style.cssText = 'padding:7px 6px; text-align:right;'; td2.textContent = count + unit;
    const td3 = document.createElement('td'); td3.style.cssText = 'padding:7px 6px; text-align:right; font-size:var(--text-body-small);'; td3.textContent = '-';
    const td4 = document.createElement('td'); td4.style.cssText = 'padding:7px 6px; text-align:right; font-size:var(--text-body-small);'; td4.textContent = '';
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
    tbody.appendChild(tr);
  };
  addOncallRow('온콜출근', result.oncall.callout, '회');
  addOncallRow('온콜대기', result.oncall.standby, '일');

  // 수당 합계 행
  if (result.summary.totalManualPay > 0 || result.summary.totalPayslipPay > 0) {
    const payDiff = result.summary.diff; // manual - payslip
    let payStatusText, payStatusColor;
    if (Math.abs(payDiff) < 1000) {
      payStatusText = '✅';
      payStatusColor = 'var(--accent-emerald)';
    } else if (payDiff < 0) {
      // 명세서가 더 많음 → 보충분
      payStatusText = '+' + Math.abs(payDiff).toLocaleString() + '원';
      payStatusColor = 'var(--accent-indigo)';
    } else {
      payStatusText = '+' + payDiff.toLocaleString() + '원 직접';
      payStatusColor = 'var(--text-muted)';
    }
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-top:2px solid var(--border-glass); font-weight:700;';
    const td1 = document.createElement('td'); td1.style.padding = '8px 6px'; td1.textContent = '수당 합계';
    const td2 = document.createElement('td'); td2.style.cssText = 'padding:8px 6px; text-align:right;'; td2.textContent = fmt(result.summary.totalManualPay);
    const td3 = document.createElement('td'); td3.style.cssText = 'padding:8px 6px; text-align:right;'; td3.textContent = fmt(result.summary.totalPayslipPay);
    const td4 = document.createElement('td'); td4.style.cssText = 'padding:8px 6px; text-align:right; color:' + payStatusColor + ';'; td4.textContent = payStatusText;
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  content.appendChild(table);

  // 수동 기록 없을 때 안내
  if (!result.hasManualRecords) {
    const guide = document.createElement('div');
    guide.style.cssText = 'margin-top:12px; padding:14px 16px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.18); border-radius:10px; font-size:var(--text-body-normal); color:var(--text-secondary); text-align:center; line-height:1.6;';
    const p1 = document.createElement('p');
    p1.textContent = '명세서 기준으로 이번 달 수당 내역을 정리했어요.';
    guide.appendChild(p1);
    const p2 = document.createElement('p');
    p2.style.cssText = 'font-size:var(--text-body-small); margin-top:4px; color:var(--text-muted);';
    p2.textContent = '직접 기록을 추가하면 더 정확하게 비교할 수 있어요.';
    guide.appendChild(p2);
    content.appendChild(guide);
  }

  // 시급 정보
  if (result.hourlyRate > 0) {
    const rateEl = document.createElement('div');
    rateEl.style.cssText = 'margin-top:8px; font-size:var(--text-body-small); color:var(--text-muted); text-align:right;';
    rateEl.textContent = '기준 시급: ' + fmt(result.hourlyRate);
    content.appendChild(rateEl);
  }
}

function toggleOtVerifyDetail() {
  const content = document.getElementById('otVerifyContent');
  const arrow = document.getElementById('otVerifyArrow');
  if (!content) return;
  const isHidden = content.style.display === 'none';
  content.style.display = isHidden ? '' : 'none';
  if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : '';
}

// 하위 호환
function renderOtStats(year, month) { renderOtDashboard(year, month); }

// 통계 카드 클릭 → 해당 그룹 열기 + 스크롤
function scrollToOtGroup(type) {
  const groupEl = document.getElementById('otGroup_' + type);
  if (!groupEl) return;
  const wrapper = groupEl.closest('.ot-group');
  if (wrapper && !wrapper.classList.contains('open')) {
    wrapper.classList.add('open');
  }
  wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 기록 목록 렌더링 (통계그리드 + 유형분포 + 접이식 상세기록)
function renderOtRecordList(records) {
  const container = document.getElementById('otRecordList');
  if (!container) return;

  if (records.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:24px;">캘린더에서 날짜를 클릭하여 기록을 추가하세요.</p>';
    return;
  }

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // 통계 계산
  let totalHours = 0, totalPay = 0;
  const byType = {
    overtime: { count: 0, hours: 0, pay: 0 },
    oncall_standby: { count: 0, hours: 0, pay: 0 },
    oncall_callout: { count: 0, hours: 0, pay: 0 }
  };

  sorted.forEach(r => {
    totalHours += r.totalHours || 0;
    totalPay += r.estimatedPay || 0;
    const t = byType[r.type];
    if (t) {
      t.count++;
      t.hours += r.totalHours || 0;
      t.pay += r.estimatedPay || 0;
    }
  });

  let html = '';

  // 통계 그리드 (4칸) — 시간외 시간은 순수 시간외만 (온콜 제외)
  const pureOvertimeHours = byType.overtime.hours;
  const oncallHours = byType.oncall_callout.hours;
  html += `<div class="lv-stats-grid">
    <div class="lv-stat-card" onclick="scrollToOtGroup('overtime')" style="cursor:pointer"><div class="lv-stat-num" style="color:var(--accent-rose)">${pureOvertimeHours.toFixed(1)}h</div><div class="lv-stat-label">시간외</div></div>
    <div class="lv-stat-card" onclick="scrollToOtGroup('oncall_callout')" style="cursor:pointer"><div class="lv-stat-num" style="color:var(--accent-indigo)">${oncallHours.toFixed(1)}h</div><div class="lv-stat-label">온콜출근</div></div>
    <div class="lv-stat-card" onclick="scrollToOtGroup('oncall_standby')" style="cursor:pointer"><div class="lv-stat-num" style="color:var(--accent-cyan)">${byType.oncall_standby.count}일</div><div class="lv-stat-label">온콜대기</div></div>
    <div class="lv-stat-card"><div class="lv-stat-num" style="color:var(--accent-emerald); font-size:var(--text-title-large);">₩${totalPay.toLocaleString()}</div><div class="lv-stat-label">예상수당</div></div>
  </div>`;

  // 상세 기록 — 카테고리별 그룹, 접힌 토글, 데이터 있는 것만 표시
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  const typeOrder = ['overtime', 'oncall_standby', 'oncall_callout'];
  const typeColors = { overtime: 'var(--accent-rose)', oncall_standby: 'var(--accent-cyan)', oncall_callout: 'var(--accent-indigo)' };

  const grouped = {};
  sorted.forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  typeOrder.forEach(type => {
    const items = grouped[type];
    if (!items || items.length === 0) return;
    const typeData = byType[type];
    const label = OVERTIME.typeLabel(type);
    const groupId = 'otGroup_' + type;

    const defaultOpen = type === 'overtime' ? ' open' : '';
    html += `<div class="ot-group${defaultOpen}" onclick="this.classList.toggle('open')">
      <div class="ot-group-header" style="--group-color:${typeColors[type]}">
        <span class="ot-group-chevron">▸</span>
        <span class="ot-group-label">${label}</span>
        <span class="ot-group-summary">${typeData.count}건 · ${typeData.hours.toFixed(1)}h</span>
        <span class="ot-group-pay">₩${typeData.pay.toLocaleString()}</span>
      </div>
      <div class="ot-group-body" id="${groupId}">`;

    items.forEach(r => {
      const day = parseInt(r.date.split('-')[2]);
      const dow = new Date(r.date).getDay();
      const timeStr = r.startTime && r.endTime ? `${r.startTime}~${r.endTime}` : '';
      const bd = r.breakdown || {};
      const rate = r.hourlyRate || 0;
      const rates = DATA.allowances.overtimeRates;

      // 세부 내역 행 생성
      const details = [];

      if (type === 'oncall_standby') {
        details.push({ label: '대기수당', value: `₩${DATA.allowances.onCallStandby.toLocaleString()}` });
      } else {
        // 실제 근무시간 (온콜은 출퇴근 제외한 순수 근무)
        if (timeStr) {
          const workHours = type === 'oncall_callout'
            ? (r.totalHours - 2) : r.totalHours;
          details.push({ label: '실제근무', value: `${timeStr} (${workHours}h)`, cls: 'dim' });
        }

        // 온콜 출퇴근 안내
        if (type === 'oncall_callout') {
          const startMin = OVERTIME._parseTime(r.startTime);
          let endMin = OVERTIME._parseTime(r.endTime);
          if (endMin <= startMin) endMin += 1440;
          const fmt = (m) => { const mm = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(mm/60)).padStart(2,'0')}:${String(mm%60).padStart(2,'0')}`; };
          details.push({ label: '출퇴근 인정', value: `${fmt(startMin-60)}~${r.startTime} + ${r.endTime}~${fmt(endMin+60)} (2h)`, cls: 'dim' });
        }

        // 연장/야간/휴일 breakdown + 금액
        if (bd.extended > 0) {
          const pay = Math.round(bd.extended * rate * rates.extended);
          details.push({ label: `연장 ${bd.extended}h × ${(rates.extended*100).toFixed(0)}%`, value: `₩${pay.toLocaleString()}` });
        }
        if (bd.night > 0) {
          const pay = Math.round(bd.night * rate * rates.night);
          details.push({ label: `야간 ${bd.night}h × ${(rates.night*100).toFixed(0)}%`, value: `₩${pay.toLocaleString()}` });
        }
        if (bd.holiday > 0) {
          const holBase = Math.min(bd.holiday, 8);
          const holOver = Math.max(bd.holiday - 8, 0);
          const pay = Math.round(holBase * rate * rates.holiday + holOver * rate * rates.holidayOver8);
          const rateLabel = holOver > 0 ? `${(rates.holiday*100).toFixed(0)}%/${(rates.holidayOver8*100).toFixed(0)}%` : `${(rates.holiday*100).toFixed(0)}%`;
          details.push({ label: `휴일 ${bd.holiday}h × ${rateLabel}`, value: `₩${pay.toLocaleString()}` });
        }
        if (bd.holidayNight > 0) {
          const pay = Math.round(bd.holidayNight * rate * rates.holidayNight);
          details.push({ label: `휴일야간 ${bd.holidayNight}h × ${(rates.holidayNight*100).toFixed(0)}%`, value: `₩${pay.toLocaleString()}` });
        }

        // 온콜 교통비
        if (type === 'oncall_callout') {
          details.push({ label: '온콜교통비', value: `₩${DATA.allowances.onCallTransport.toLocaleString()}` });
        }
      }

      const detailHtml = details.map(d =>
        `<div class="ot-row-line ${d.cls || ''}"><span>${d.label}</span><span>${d.value}</span></div>`
      ).join('');

      html += `<div class="ot-record-row" onclick="event.stopPropagation(); editOtRecord('${r.id}')">
        <div class="ot-row-head">
          <span class="ot-row-date">${day} ${dowNames[dow]}</span>
          <span class="ot-row-pay">₩${(r.estimatedPay || 0).toLocaleString()}</span>
        </div>
        <div class="ot-row-breakdown">${detailHtml}</div>
      </div>`;
    });

    html += '</div></div>';
  });

  // Trusted internal OVERTIME data — no user-supplied HTML
  container.innerHTML = html;
}

// JSON 내보내기
function exportOtData() {
  const json = OVERTIME.exportData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `overtime_records_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  document.getElementById('otExportMsg').textContent = '✅ 내보내기 완료';
}

// JSON 가져오기
function importOtData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = OVERTIME.importData(e.target.result);
    document.getElementById('otExportMsg').textContent = result.message;
    if (result.success) refreshOtCalendar();
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset file input
}


// ═══════════ 💰 급여 명세서 파서 ═══════════

function handlePayslipDrop(event) {
  event.preventDefault();
  event.currentTarget.style.borderColor = 'var(--border-glass)';
  const file = event.dataTransfer.files[0];
  if (file) handlePayslipUpload(file);
}

function _isImageFile(file) {
  return /\.(jpg|jpeg|png|bmp|webp|heic|heif)$/i.test(file.name) || file.type.startsWith('image/');
}

// ── 공통 헬퍼: 파싱된 급여명세서의 employeeInfo 를 PROFILE 에 merge 저장 ──
function _applyPayslipEmployeeInfo(parsed) {
  const info = (parsed && parsed.employeeInfo) || {};
  const patch = {};
  if (info.name) patch.name = info.name;
  if (info.hireDate) patch.hireDate = info.hireDate;
  if (info.department) patch.department = info.department;
  if (info.employeeNumber) patch.employeeNumber = String(info.employeeNumber).trim();

  if (info.jobType) {
    const jobTypeMap = { '간호': '간호직', '보건': '보건직', '약무': '약무직', '의료기사': '의료기사직', '의사': '의사직', '사무': '사무직', '기능': '기능직', '시설': '시설직', '환경미화': '환경미화직', '지원': '지원직' };
    for (const [keyword, jt] of Object.entries(jobTypeMap)) {
      if (info.jobType.includes(keyword)) { patch.jobType = jt; break; }
    }
  }

  if (info.payGrade) {
    const gm = info.payGrade.match(/([A-Za-z]\d+)\s*-\s*(\d+)/);
    if (gm) {
      patch.grade = gm[1].toUpperCase();
      patch.year = parseInt(gm[2]) || 1;
    }
  }

  if (Object.keys(patch).length > 0) PROFILE.save(patch);
  return patch;
}

/// ── 명세서 → 시간외 탭 교차 검증 데이터 전파 ──
function _propagatePayslipToOvertime(parsed, ym) {
  if (typeof OVERTIME === 'undefined') return;

  const ymKey = `${ym.year}-${String(ym.month).padStart(2, '0')}`;

  // workStats 추출
  const workStats = (parsed.workStats || []).map(s => ({ name: s.name, value: s.value }));

  // 시간외 관련 수당 금액 추출
  const otPatterns = [
    /시간외수당|시간외근무수당/, /야간수당|야간근무수당|야간근무가산/,
    /휴일수당|휴일근무수당/, /당직비|숙직비/, /야간근무가산금/,
    /대체근무가산금/, /통상야간/,
  ];
  const overtimeItems = [];
  (parsed.salaryItems || []).forEach(item => {
    if (otPatterns.some(p => p.test(item.name)) && item.amount > 0) {
      overtimeItems.push({ name: item.name, amount: item.amount });
    }
  });

  // 시급 계산 (프로필 기반)
  let hourlyRate = 0;
  if (typeof PROFILE !== 'undefined' && typeof CALC !== 'undefined') {
    const profile = PROFILE.load();
    if (profile && profile.jobType && profile.grade) {
      const serviceYears = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
      const wage = CALC.calcOrdinaryWage(
        profile.jobType, profile.grade, parseInt(profile.year) || 1,
        {
          hasMilitary: profile.hasMilitary, hasSeniority: profile.hasSeniority,
          seniorityYears: profile.hasSeniority ? serviceYears : 0,
          longServiceYears: serviceYears,
          adjustPay: parseInt(profile.adjustPay) || 0,
          upgradeAdjustPay: parseInt(profile.upgradeAdjustPay) || 0,
          specialPayAmount: parseInt(profile.specialPay) || 0,
          positionPay: parseInt(profile.positionPay) || 0,
          workSupportPay: parseInt(profile.workSupportPay) || 0,
        }
      );
      if (wage) hourlyRate = wage.hourlyRate;
    }
  }

  OVERTIME.savePayslipData(ymKey, { workStats, overtimeItems, hourlyRate });
  console.log(`[Overtime] 명세서 데이터 전파 완료: ${ymKey}, workStats ${workStats.length}건, 수당항목 ${overtimeItems.length}건`);
}

// ── 공통 헬퍼: info 탭의 자동갱신 배너 표시 + 급여탭 링크 숨김 ──
function _showAutoSyncBanner(ym) {
  const banner = document.getElementById('pfAutoSyncBanner');
  const text = document.getElementById('pfAutoSyncText');
  const link = document.getElementById('pfPayslipLink');
  if (!banner) return;
  if (text && ym && ym.year && ym.month) {
    const typeStr = ym.type && ym.type !== '급여' ? ` (${ym.type})` : '';
    text.textContent = `${ym.year}년 ${ym.month}월${typeStr} 명세서 기준 자동 갱신됨`;
  }
  banner.style.display = 'flex';
  if (link) link.style.display = 'none';
}

async function handlePayslipUpload(file) {
  if (!file) return;
  const resultEl = document.getElementById('payslipResult');
  const isImage = _isImageFile(file);

  if (isImage) {
    resultEl.textContent = '';
    const box = document.createElement('div');
    box.className = 'warning-box';
    box.style.textAlign = 'center';
    box.textContent = '📷 사진에서 텍스트 인식 중...';
    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'margin-top:8px;background:var(--border-glass);border-radius:8px;height:8px;overflow:hidden;';
    const bar = document.createElement('div');
    bar.id = 'payslipOcrBar';
    bar.style.cssText = 'width:0%;height:100%;background:var(--accent-indigo);transition:width 0.3s;';
    barWrap.appendChild(bar);
    box.appendChild(barWrap);
    const pctEl = document.createElement('small');
    pctEl.id = 'payslipOcrPct';
    pctEl.style.color = 'var(--text-muted)';
    pctEl.textContent = '0%';
    box.appendChild(pctEl);
    resultEl.appendChild(box);
  } else {
    resultEl.textContent = '';
    const box = document.createElement('div');
    box.className = 'warning-box';
    box.style.textAlign = 'center';
    box.textContent = '⏳ 파일 분석 중...';
    resultEl.appendChild(box);
  }

  try {
    const onProgress = isImage ? pct => {
      const b = document.getElementById('payslipOcrBar');
      const t = document.getElementById('payslipOcrPct');
      if (b) b.style.width = pct + '%';
      if (t) t.textContent = pct + '%';
    } : undefined;

    const parsed = await SALARY_PARSER.parseFile(file, onProgress);
    const ym = SALARY_PARSER.parsePeriodYearMonth(parsed);
    if (!ym) throw new Error('급여 기간을 인식하지 못했습니다. 파일을 확인해주세요.');

    SALARY_PARSER.saveMonthlyData(ym.year, ym.month, parsed, ym.type);
    // employeeInfo (이름/직종/직급/호봉/부서/입사일/사번) merge 저장
    const infoPatch = _applyPayslipEmployeeInfo(parsed);
    const stableRes = SALARY_PARSER.applyStableItemsToProfile(parsed);
    const profileUpdated = (stableRes && stableRes.changed) || Object.keys(infoPatch).length > 0;

    // 자동 검증 (콘솔에 결과 출력)
    if (typeof SALARY_TEST !== 'undefined') {
      SALARY_TEST.postParseValidation(parsed);
      SALARY_TEST.validateStorage(parsed, ym);
      SALARY_TEST.validateProfileApply(parsed, stableRes);
    }

    // info 탭 폼/토글 상태 동기화 (사용자가 info 탭으로 돌아오면 즉시 최신 상태)
    const updated = PROFILE.load();
    if (updated) {
      if (typeof PROFILE_FIELDS !== 'undefined') PROFILE.applyToForm(updated, PROFILE_FIELDS);
      if (typeof updateProfileGrades === 'function') updateProfileGrades();
      _collapseBasicFieldsWithPreview(updated);
      const statusBadge = document.getElementById('profileStatus');
      if (statusBadge) {
        statusBadge.textContent = '저장됨 ✓';
        statusBadge.className = 'badge emerald';
      }
      const titleName = document.getElementById('pfTitleName');
      if (titleName && updated.name) titleName.textContent = `${updated.name}님 정보`;
    }
    _showAutoSyncBanner(ym);

    renderPayslip(parsed, ym, profileUpdated, stableRes);
    renderVerification(parsed);

    // ── 시간외 탭 교차 검증용 데이터 전파 ──
    _propagatePayslipToOvertime(parsed, ym);

    // 급여명세서 관리 뷰 갱신 (업로드한 월 선택)
    const mgmtContainer = document.getElementById('payslipMgmtView');
    if (mgmtContainer) mgmtContainer.dataset.activeMonth = `${ym.year}_${ym.month}_${ym.type || '급여'}`;
    renderPayslipMgmt();
  } catch (e) {
    resultEl.textContent = '';
    const errBox = document.createElement('div');
    errBox.className = 'warning-box';
    errBox.style.borderColor = 'var(--accent-rose)';
    errBox.textContent = '❌ 오류: ' + e.message;
    resultEl.appendChild(errBox);
    console.error('[PayslipParser]', e);
  }
}

// ── 프로필 탭에서 급여명세서로 자동입력 ──
async function handleProfilePayslipUpload(file) {
  if (!file) return;
  const progressEl = document.getElementById('pfPayslipProgress');
  const isImage = _isImageFile(file);

  progressEl.style.display = 'block';
  progressEl.textContent = '';

  if (isImage) {
    const msg = document.createElement('div');
    msg.style.cssText = 'color:var(--text-muted);font-size:var(--text-body-small);';
    msg.textContent = '📷 사진에서 텍스트 인식 중...';
    progressEl.appendChild(msg);
    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'margin-top:6px;background:var(--border-glass);border-radius:8px;height:6px;overflow:hidden;';
    const bar = document.createElement('div');
    bar.id = 'pfOcrBar';
    bar.style.cssText = 'width:0%;height:100%;background:var(--accent-indigo);transition:width 0.3s;';
    barWrap.appendChild(bar);
    progressEl.appendChild(barWrap);
    const pctEl = document.createElement('small');
    pctEl.id = 'pfOcrPct';
    pctEl.style.color = 'var(--text-muted)';
    pctEl.textContent = '0%';
    progressEl.appendChild(pctEl);
  } else {
    const msg = document.createElement('div');
    msg.style.cssText = 'color:var(--text-muted);font-size:var(--text-body-small);';
    msg.textContent = '⏳ 파일 분석 중...';
    progressEl.appendChild(msg);
  }

  try {
    const onProgress = isImage ? pct => {
      const b = document.getElementById('pfOcrBar');
      const t = document.getElementById('pfOcrPct');
      if (b) b.style.width = pct + '%';
      if (t) t.textContent = pct + '%';
    } : undefined;

    // [1단계] 업로드 직전에 현재 폼 값을 localStorage에 선저장
    //  — 생년월일/성별 등 "폼에 입력만 하고 저장 버튼 안 누른" 값 보존용
    //  — PROFILE.save는 이제 기존값 merge 방식이므로 안전
    if (typeof PROFILE.collectFromForm === 'function') {
      try { PROFILE.save(PROFILE.collectFromForm(PROFILE_FIELDS)); } catch (e) { console.warn('form 선저장 실패', e); }
    }

    const parsed = await SALARY_PARSER.parseFile(file, onProgress);
    const info = parsed.employeeInfo || {};

    // [2단계] 파싱된 개인정보 부분만 merge 저장
    //  — PROFILE.save의 기존값 보존 덕에 department/hireDate/jobType 등만 선택적으로 업데이트
    const patch = {};
    if (info.name) patch.name = info.name;
    if (info.hireDate) patch.hireDate = info.hireDate;
    if (info.department) patch.department = info.department;
    if (info.employeeNumber) patch.employeeNumber = String(info.employeeNumber).trim();

    // 직종 매핑
    if (info.jobType) {
      const jobTypeMap = { '간호': '간호직', '보건': '보건직', '약무': '약무직', '의료기사': '의료기사직', '의사': '의사직', '사무': '사무직', '기능': '기능직', '시설': '시설직', '환경미화': '환경미화직', '지원': '지원직' };
      for (const [keyword, jt] of Object.entries(jobTypeMap)) {
        if (info.jobType.includes(keyword)) { patch.jobType = jt; break; }
      }
    }

    // 호봉 파싱 (예: "S3-4", "S1 - 03" → grade="S3", year=4)
    if (info.payGrade) {
      const gm = info.payGrade.match(/([A-Za-z]\d+)\s*-\s*(\d+)/);
      if (gm) {
        patch.grade = gm[1].toUpperCase();
        patch.year = parseInt(gm[2]) || 1;
      }
    }

    // 개인정보 patch 저장 (기존 생년월일 등은 save 내부 merge로 유지)
    PROFILE.save(patch);

    // 안정적 급여 항목 (조정급, 직책수당 등) + 가족수당도 반영
    // ※ applyStableItemsToProfile이 내부적으로 PROFILE.load() → 수정 → save()하므로
    //    반드시 위의 save() 이후에 호출해야 조정급 등이 덮어씌워지지 않음
    const stableResult = SALARY_PARSER.applyStableItemsToProfile(parsed);

    // 반영 후 최신 프로필 다시 로드 (stableItems가 반영된 버전)
    const updatedProfile = PROFILE.load() || profile;

    // 폼에 반영 (stableItems 포함된 최신 프로필)
    if (typeof PROFILE_FIELDS !== 'undefined') {
      PROFILE.applyToForm(updatedProfile, PROFILE_FIELDS);
    }
    if (typeof updateProfileGrades === 'function') updateProfileGrades();

    // 개별 필드 직접 세팅
    const fieldSets = [
      ['pfName', updatedProfile.name], ['pfEmployeeNumber', updatedProfile.employeeNumber],
      ['pfHireDate', updatedProfile.hireDate],
      ['pfJobType', updatedProfile.jobType], ['pfGrade', updatedProfile.grade],
      ['pfYear', updatedProfile.year],
      ['pfAdjustPay', updatedProfile.adjustPay],
      ['pfUpgradeAdjustPay', updatedProfile.upgradeAdjustPay],
      ['pfPositionPay', updatedProfile.positionPay],
      ['pfWorkSupportPay', updatedProfile.workSupportPay],
      ['pfSpecialPay', updatedProfile.specialPay],
    ];
    fieldSets.forEach(([id, val]) => {
      if (val !== undefined && val !== null) { const el = document.getElementById(id); if (el) el.value = val; }
    });

    // 성공 메시지
    const applied = [];
    if (info.name) applied.push('이름: ' + info.name);
    if (info.jobType) applied.push('직종: ' + info.jobType);
    if (info.payGrade) applied.push('직급: ' + info.payGrade);
    if (info.hireDate) applied.push('입사일: ' + info.hireDate);
    parsed.salaryItems.forEach(item => {
      if (['조정급','승급조정급','승급호봉분','직책수당','직책급','업무보조비','별정수당(직무)'].includes(item.name) && item.amount > 0) {
        applied.push(item.name + ': ' + item.amount.toLocaleString() + '원');
      }
    });
    // 가족수당 자동 반영 결과
    if (stableResult && stableResult.applied) {
      stableResult.applied.forEach(a => {
        applied.push(a.name + ': ' + a.amount.toLocaleString() + '원' + (a.note ? ` (${a.note})` : ''));
      });
    }

    progressEl.textContent = '';
    const successBox = document.createElement('div');
    successBox.className = 'warning-box';
    successBox.style.cssText = 'border-color:var(--accent-emerald);margin:0;';
    const titleEl = document.createElement('div');
    titleEl.textContent = '✅ 급여명세서에서 자동 입력 완료!';
    successBox.appendChild(titleEl);

    // 파싱 결과 요약
    const statLine = document.createElement('div');
    statLine.style.cssText = 'margin-top:6px;font-size:var(--text-body-small);color:var(--text-primary);font-weight:600;';
    const salCnt = parsed.salaryItems ? parsed.salaryItems.length : 0;
    const dedCnt = parsed.deductionItems ? parsed.deductionItems.length : 0;
    const periodStr = parsed.metadata?.payPeriod || '기간 미인식';
    statLine.textContent = `${periodStr} | 지급 ${salCnt}건 · 공제 ${dedCnt}건 인식`;
    successBox.appendChild(statLine);

    if (applied.length > 0) {
      const details = document.createElement('div');
      details.style.cssText = 'margin-top:6px;font-size:var(--text-body-small);color:var(--text-muted);';
      details.textContent = applied.join(' / ');
      successBox.appendChild(details);
    }

    if (salCnt === 0 && dedCnt === 0) {
      const warnEl = document.createElement('div');
      warnEl.style.cssText = 'margin-top:6px;font-size:var(--text-body-small);color:var(--accent-rose);';
      warnEl.textContent = '⚠️ 급여 항목을 인식하지 못했습니다. 파일 형식을 확인해주세요.';
      successBox.appendChild(warnEl);
    }

    const hint = document.createElement('div');
    hint.style.cssText = 'margin-top:6px;font-size:var(--text-body-small);color:var(--text-muted);';
    hint.textContent = '아래 내용을 확인하고 저장 버튼을 눌러주세요.';
    successBox.appendChild(hint);
    progressEl.appendChild(successBox);

    // 급여명세서 탭에도 데이터 저장 (기간 인식 실패 시 현재 월 기준 저장)
    let ym = SALARY_PARSER.parsePeriodYearMonth(parsed);
    if (!ym) {
      const now = new Date();
      ym = { year: now.getFullYear(), month: now.getMonth() + 1 };
      console.warn('[PayslipUpload] 기간 인식 실패 — 현재 월로 저장:', ym);
    }
    SALARY_PARSER.saveMonthlyData(ym.year, ym.month, parsed, ym.type);

    // 업로드로 부서/입사일이 새로 들어왔으면 근무이력 자동 시드 다시 시도
    // (이전에 시드 조건 불충족으로 비어 있던 상태면 플래그 해제해서 재시드 허용)
    try {
      var _wh = JSON.parse(localStorage.getItem('bhm_work_history') || '[]');
      if (!Array.isArray(_wh) || _wh.length === 0) localStorage.removeItem('bhm_work_history_seeded');
      if (typeof renderWorkHistory === 'function') renderWorkHistory();
    } catch (e) {}

  } catch (e) {
    progressEl.textContent = '';
    const errBox = document.createElement('div');
    errBox.className = 'warning-box';
    errBox.style.cssText = 'border-color:var(--accent-rose);margin:0;';
    errBox.textContent = '❌ ' + e.message;
    progressEl.appendChild(errBox);
    console.error('[ProfilePayslipUpload]', e);
  }
}

