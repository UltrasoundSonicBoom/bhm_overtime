// ============================================
// 병원 HR 종합 시스템 - 앱 로직
// ============================================

// ── 프로필 필드 매핑 ──
const PROFILE_FIELDS = {
  name: 'pfName',
  gender: 'pfGender',
  jobType: 'pfJobType',
  grade: 'pfGrade',
  year: 'pfYear',
  hireDate: 'pfHireDate',
  adjustPay: 'pfAdjust',
  upgradeAdjustPay: 'pfUpgradeAdjust',
  hasMilitary: 'pfMilitary',
  militaryMonths: 'pfMilitaryMonths',
  hasSeniority: 'pfSeniority',
  hasSpouse: 'pfSpouse',
  numChildren: 'pfChildren',
  otherFamily: 'pfOtherFamily',
  specialPay: 'pfSpecial',
  positionPay: 'pfPosition',
  workSupportPay: 'pfWorkSupport'
};

// ── 탭 전환 ──
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

    // 탭 전환 시 프로필 자동 반영
    const tabName = tab.dataset.tab;
    if (tabName === 'payroll') applyProfileToPayroll();
    if (tabName === 'overtime') { applyProfileToOvertime(); initOvertimeTab(); }
    if (tabName === 'leave') { applyProfileToLeave(); initLeaveTab(); }
    if (tabName === 'career') applyProfileToCareer();
  });
});

// ── 접이식(collapsible) 토글 ──
function toggleCollapsible(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  // 토글 헤더 아이콘 업데이트
  const header = el.previousElementSibling;
  if (header && header.classList.contains('collapsible-header')) {
    const span = header.querySelector('span');
    if (span) span.textContent = span.textContent.replace(/[▸▼]/, isOpen ? '▸' : '▼');
  }
}

// ── 직종 드롭다운 동적 생성 ──
function populateJobTypeDropdowns() {
  const selectIds = ['pfJobType', 'psJobType', 'wJobType', 'prJobType'];
  selectIds.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    Object.entries(DATA.jobTypes).forEach(([key, info]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      sel.appendChild(opt);
    });
  });
}

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', () => {
  populateJobTypeDropdowns();
  updateProfileGrades();
  updateGrades();
  updatePromoGrades();
  updatePayrollGrades();
  renderCeremonyTable();
  renderLeaveTable();
  renderQuickTags();

  // 현재 날짜로 시뮬레이션 연도/월 설정
  const now = new Date();
  const yearSel = document.getElementById('psSimYear');
  const monthSel = document.getElementById('psSimMonth');
  const curYear = String(now.getFullYear());
  const curMonth = String(now.getMonth() + 1);
  if ([...yearSel.options].some(o => o.value === curYear)) yearSel.value = curYear;
  if ([...monthSel.options].some(o => o.value === curMonth)) monthSel.value = curMonth;

  // 군복무수당 토글
  document.getElementById('pfMilitary').addEventListener('change', (e) => {
    document.getElementById('pfMilitaryMonthsGroup').style.display = e.target.checked ? 'block' : 'none';
  });

  // 입사일 → 근속연수 표시 (텍스트 입력 지원)
  document.getElementById('pfHireDate').addEventListener('input', (e) => {
    const parsed = PROFILE.parseDate(e.target.value);
    if (parsed) {
      const years = PROFILE.calcServiceYears(parsed);
      document.getElementById('pfServiceDisplay').textContent = `→ ${parsed} (근속 ${years}년)`;
    } else if (e.target.value.length > 0) {
      document.getElementById('pfServiceDisplay').textContent = '※ YYYY-MM-DD, YYYYMMDD, YYYY.MM.DD 형식';
    } else {
      document.getElementById('pfServiceDisplay').textContent = '';
    }
  });

  // 저장된 프로필 불러오기
  const saved = PROFILE.load();
  if (saved) {
    PROFILE.applyToForm(saved, PROFILE_FIELDS);
    updateProfileSummary(saved);
    document.getElementById('profileStatus').textContent = '저장됨 ✓';
    document.getElementById('profileStatus').className = 'badge emerald';
  }

  // 급여 시뮬레이터: 연도/월 변경 시 자동 업데이트
  document.getElementById('psSimYear').addEventListener('change', () => autoFillMonth());
  document.getElementById('psSimMonth').addEventListener('change', () => autoFillMonth());

  // 초기 로드 시 현재 선택된 연도/월로 자동설정
  autoFillMonth();

  // 시간외·온콜 탭 초기화
  initOvertimeTab();

  // 휴가 관리 탭 초기화
  initLeaveTab();
});

// ═══════════ 📌 프로필 관리 ═══════════
function updateProfileGrades() {
  const jobType = document.getElementById('pfJobType').value;
  const gradeSelect = document.getElementById('pfGrade');
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

function saveProfile() {
  const data = PROFILE.collectFromForm(PROFILE_FIELDS);
  const profile = PROFILE.save(data);
  updateProfileSummary(profile);
  document.getElementById('profileStatus').textContent = '저장됨 ✓';
  document.getElementById('profileStatus').className = 'badge emerald';
}

function clearProfile() {
  PROFILE.clear();
  // 폼 초기화
  Object.values(PROFILE_FIELDS).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = false;
    else if (el.type === 'number') el.value = 0;
    else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  document.getElementById('pfMilitaryMonthsGroup').style.display = 'none';
  document.getElementById('pfServiceDisplay').textContent = '';
  document.getElementById('profileStatus').textContent = '미저장';
  document.getElementById('profileStatus').className = 'badge amber';
  document.getElementById('profileSummary').innerHTML = `
        <div class="card-title"><span class="icon emerald">📊</span> 내 급여 요약</div>
        <p style="color:var(--text-muted)">좌측에서 정보를 입력하고 [저장하기]를 눌러주세요.</p>
    `;
}

function updateProfileSummary(profile) {
  const wage = PROFILE.calcWage(profile);
  if (!wage) return;

  const serviceYears = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
  const table = DATA.payTables[CALC.resolvePayTable(profile.jobType)];
  const gradeLabel = table ? (table.gradeLabels[profile.grade] || profile.grade) : profile.grade;

  let html = `
    <div class="card-title"><span class="icon emerald">📊</span> 내 급여 요약</div>
    ${profile.name ? `<p style="font-weight:600; font-size:16px; margin-bottom:8px;">👤 ${profile.name}</p>` : ''}
    <div class="result-row"><span class="key">직종/등급</span><span class="val">${profile.jobType} ${profile.grade} ${profile.year}년차</span></div>
    ${serviceYears > 0 ? `<div class="result-row"><span class="key">근속연수</span><span class="val">${serviceYears}년</span></div>` : ''}
    <hr class="divider">
    <div class="result-box">
      <div class="result-label">월 통상임금</div>
      <div class="result-total">${CALC.formatCurrency(wage.monthlyWage)}</div>
      <div class="result-label" style="margin-top:8px;">시급 (÷209시간)</div>
      <div class="result-total green">${CALC.formatCurrency(wage.hourlyRate)}</div>
    </div>
    <hr class="divider">
    <div class="card-title" style="font-size:14px;"><span class="icon indigo">📝</span> 통상임금 내역</div>
    `;

  Object.entries(wage.breakdown).forEach(([key, val]) => {
    if (val > 0) {
      html += `<div class="result-row"><span class="key">${key}</span><span class="val">${CALC.formatCurrency(val)}</span></div>`;
    }
  });

  html += `<div class="warning-box" style="margin-top:12px;">💡 이 시급이 시간외·온콜 탭에 자동 반영됩니다.</div>`;
  document.getElementById('profileSummary').innerHTML = html;
}

// ═══════════ 프로필 → 각 탭 자동 반영 ═══════════
function applyProfileToOvertime() {
  const profile = PROFILE.load();
  if (!profile) return;
  const wage = PROFILE.calcWage(profile);
  if (!wage) return;
  document.getElementById('otHourly').value = wage.hourlyRate;
  const display = document.getElementById('otHourlyDisplay');
  if (display) display.textContent = '₩' + wage.hourlyRate.toLocaleString();
  const hint = document.getElementById('otHourlyHint');
  if (hint) hint.textContent = `📌 내 정보 자동반영 (통상임금: ${CALC.formatCurrency(wage.monthlyWage)})`;
}

function applyProfileToPayroll() {
  const profile = PROFILE.load();
  const banner = document.getElementById('psProfileBanner');
  const manualSection = document.getElementById('psManualSection');

  if (profile) {
    banner.style.display = 'block';
    banner.innerHTML = `📌 <strong>${profile.name || '내 정보'}</strong> 프로필이 적용됩니다. (${profile.jobType} ${profile.grade} ${profile.year}년차)`;
    manualSection.style.display = 'none';
  } else {
    banner.style.display = 'none';
    manualSection.style.display = 'block';
  }
}

function applyProfileToLeave() {
  const profile = PROFILE.load();
  if (!profile) return;
  if (profile.hireDate) {
    const hireDateEl = document.getElementById('lvHireDate');
    if (hireDateEl) hireDateEl.value = profile.hireDate;
    // 연차 자동 산정
    const parsed = PROFILE.parseDate(profile.hireDate);
    if (parsed) {
      const result = CALC.calcAnnualLeave(parsed);
      if (result) lvTotalAnnual = result.총연차;
    }
  }
  const wage = PROFILE.calcWage(profile);
  if (wage) {
    const plWageEl = document.getElementById('plWage');
    if (plWageEl) plWageEl.value = wage.monthlyWage;
  }
}

function applyProfileToCareer() {
  const profile = PROFILE.load();
  if (!profile) return;
  if (profile.jobType) {
    document.getElementById('prJobType').value = profile.jobType;
    updatePromoGrades();
  }
  if (profile.grade) document.getElementById('prGrade').value = profile.grade;
  if (profile.hireDate) document.getElementById('prHireDate').value = profile.hireDate;
}

// ═══════════ 직급 목록 업데이트 ═══════════
function updateGrades() {
  const jobType = document.getElementById('wJobType').value;
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

function updatePromoGrades() {
  const jobType = document.getElementById('prJobType').value;
  const gradeSelect = document.getElementById('prGrade');
  const table = DATA.payTables[CALC.resolvePayTable(jobType)];
  if (!gradeSelect || !table) return;
  gradeSelect.innerHTML = '';
  Object.keys(table.autoPromotion).forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    gradeSelect.appendChild(opt);
  });
}

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
  const hasSpouse = document.getElementById('wSpouse').checked;
  const numChildren = parseInt(document.getElementById('wChildren').value) || 0;
  const otherFamily = parseInt(document.getElementById('wOtherFamily').value) || 0;

  const familyResult = CALC.calcFamilyAllowance(hasSpouse, numChildren, otherFamily);

  const result = CALC.calcOrdinaryWage(jobType, grade, year, {
    hasMilitary,
    hasSeniority,
    seniorityYears: hasSeniority ? serviceYears : 0,
    longServiceYears: serviceYears,
    specialPayAmount: specialPay,
    adjustPay,
    familyAllowance: familyResult.월수당
  });

  if (!result) return;

  // 시급 자동 반영
  document.getElementById('otHourly').value = result.hourlyRate;
  const otDisplay = document.getElementById('otHourlyDisplay');
  if (otDisplay) otDisplay.textContent = '₩' + result.hourlyRate.toLocaleString();
  const otHint = document.getElementById('otHourlyHint');
  if (otHint) otHint.textContent = `통상임금 기준 (${CALC.formatCurrency(result.monthlyWage)})`;

  let html = `
    <div class="result-box">
      <div class="result-label">시급 (÷209시간)</div>
      <div class="result-total green">${CALC.formatCurrency(result.hourlyRate)}</div>
      <div class="result-label" style="margin-top:4px; font-size:12px;">통상임금: ${CALC.formatCurrency(result.monthlyWage)}</div>
    </div>
    `;
  Object.entries(result.breakdown).forEach(([key, val]) => {
    if (val > 0) {
      html += `<div class="result-row"><span class="key">${key}</span><span class="val">${CALC.formatCurrency(val)}</span></div>`;
    }
  });
  html += `<div class="warning-box">💡 시급이 위 시간외·온콜 필드에 자동 반영되었습니다.</div>`;
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
    <div class="result-row"><span class="key">야간근무수당 (${r.detail.nightHours}h × ${isExtN ? '200%' : '150%'})</span><span class="val accent">${CALC.formatCurrency(r.야간근무수당)}</span></div>
    <div class="result-row"><span class="key">휴일근무수당 (${r.detail.holidayHours}h × 150%)</span><span class="val accent">${CALC.formatCurrency(r.휴일근무수당)}</span></div>
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
    infoEl.innerHTML = `<span style="color:var(--accent-rose)">❌ 로드 실패: ${e.message}</span>`;
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
        <span style="font-weight:400;font-size:11px;color:var(--text-muted);">(근무 ${workDayCount}일 / 휴일 ${dayOffCount}일)</span>
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
      hasSpouse: profile.hasSpouse,
      numChildren: parseInt(profile.numChildren) || 0,
      otherFamily: parseInt(profile.otherFamily) || 0,
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
      hasSpouse: document.getElementById('psSpouse')?.checked || false,
      numChildren: 0, otherFamily: 0,
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
    <div class="card-title" style="font-size:14px;"><span class="icon indigo">💰</span> 지급내역</div>
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
    <div class="card-title" style="font-size:14px;"><span class="icon rose">📝</span> 공제내역</div>
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
  const r = CALC.calcNightShiftBonus(count);

  let html = `
    <div class="result-box ${r.초과경고 ? '' : 'success'}">
      <div class="result-label">야간근무가산금 (${r.횟수}회)</div>
      <div class="result-total ${r.초과경고 ? '' : 'green'}">${CALC.formatCurrency(r.야간근무가산금)}</div>
    </div>
    <div class="result-row"><span class="key">리커버리데이 (7일+ 야간)</span><span class="val accent">${r.리커버리데이}일</span></div>
    <div class="result-row"><span class="key">누적 리커버리데이 (15일당)</span><span class="val accent">${r.누적리커버리데이}일</span></div>
  `;

  if (r.초과경고) {
    html += `<div class="warning-box">${r.초과경고}</div>`;
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
    document.getElementById('promoResult').innerHTML = `<div class="warning-box">${r.message}</div>`;
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
  const avgPay = parseInt(document.getElementById('svAvgPay').value) || 0;
  const years = parseInt(document.getElementById('svYears').value) || 0;

  if (avgPay === 0) {
    document.getElementById('severanceResult').innerHTML = '<div class="warning-box">⚠️ 월 평균임금을 입력하세요.</div>';
    return;
  }

  const r = CALC.calcSeverancePay(avgPay, years);

  document.getElementById('severanceResult').innerHTML = `
    <div class="result-box success">
      <div class="result-label">예상 퇴직수당</div>
      <div class="result-total green">${CALC.formatCurrency(r.퇴직금)}</div>
      <div class="result-row"><span class="key">산식</span><span class="val">${r.산식 || '-'}</span></div>
      <div class="result-row"><span class="key">적용 계수</span><span class="val accent">${r.적용계수}</span></div>
      <div class="result-row"><span class="key">비고</span><span class="val">${r.note}</span></div>
    </div>
  `;
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
      items.forEach(item => {
        addChatMessage(item.q, 'user');
        setTimeout(() => {
          addChatMessage(item.a, 'bot', item.ref);
        }, 200);
      });
    };
    container.appendChild(tag);
  });
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
      <td style="font-size:12px;color:var(--text-muted)">${c.extra || ''}</td>
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
      <td style="font-size:12px">${l.pay}</td>
    </tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;
}

function addChatMessage(text, type, ref = null) {
  const container = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = `chat-msg ${type}`;
  msg.innerHTML = text;
  if (ref) {
    msg.innerHTML += `<span class="ref">📌 ${ref}</span>`;
  }
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function searchFAQ(query) {
  query = query.toLowerCase().trim();
  if (!query) return [];

  const scored = DATA.faq.map(item => {
    let score = 0;
    const qLower = item.q.toLowerCase();
    const aLower = item.a.toLowerCase();
    const catLower = item.category.toLowerCase();

    if (query.includes(catLower) || catLower.includes(query)) score += 5;

    const qWords = query.split(/\s+/);
    qWords.forEach(w => {
      if (qLower.includes(w)) score += 3;
      if (aLower.includes(w)) score += 1;
    });

    const aliases = {
      '온콜': ['on-call', '호출', '대기'],
      '연차': ['휴가', '연가', '연차'],
      '야간': ['밤번', 'night', '밤'],
      '급여': ['월급', '봉급', '급료', '임금'],
      '퇴직': ['퇴사', '이직'],
      '승진': ['승격', '진급', '승급'],
      '출산': ['임신', '육아'],
      '수당': ['보조', '지원'],
      '감면': ['할인', '진료비']
    };

    Object.entries(aliases).forEach(([key, words]) => {
      if (query.includes(key) || words.some(w => query.includes(w))) {
        if (qLower.includes(key) || aLower.includes(key)) score += 4;
      }
    });

    return { ...item, score };
  });

  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

document.getElementById('chatSend').addEventListener('click', handleChat);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleChat();
});

function handleChat() {
  const input = document.getElementById('chatInput');
  const query = input.value.trim();
  if (!query) return;

  addChatMessage(query, 'user');
  input.value = '';

  const results = searchFAQ(query);

  setTimeout(() => {
    if (results.length === 0) {
      addChatMessage(
        '죄송합니다, 해당 질문에 대한 답변을 찾지 못했습니다. 😅<br>' +
        '아래 카테고리 태그를 클릭하시거나, 더 구체적인 키워드로 검색해보세요.<br>' +
        '<small style="color:var(--text-muted)">예: "온콜", "연차", "야간근무", "가족수당", "승진"</small>',
        'bot'
      );
    } else {
      results.forEach((r, i) => {
        setTimeout(() => {
          addChatMessage(r.a, 'bot', r.ref);
        }, i * 300);
      });
    }
  }, 400);
}

// ═══════════ ⏰ 시간외·온콜 관리 ═══════════

// 현재 선택된 날짜 상태
let otSelectedDate = null;
let otHolidayMap = {};
let otInitialized = false;

// 초기화
function initOvertimeTab() {
  const now = new Date();
  const yearSel = document.getElementById('otYear');
  const monthSel = document.getElementById('otMonth');
  if (yearSel) yearSel.value = String(now.getFullYear());
  if (monthSel) monthSel.value = String(now.getMonth() + 1);

  // 프로필에서 시급 자동 반영
  const profile = PROFILE.load();
  if (profile) {
    const wage = PROFILE.calcWage(profile);
    if (wage) {
      document.getElementById('otHourly').value = wage.hourlyRate;
      document.getElementById('otHourlyDisplay').textContent = '₩' + wage.hourlyRate.toLocaleString();
      document.getElementById('otHourlyHint').textContent = `📌 내 정보 자동반영`;
    }
  }

  // 연도/월 변경 이벤트 (최초 1회만)
  if (!otInitialized) {
    document.getElementById('otYear').addEventListener('change', () => refreshOtCalendar());
    document.getElementById('otMonth').addEventListener('change', () => refreshOtCalendar());
    otInitialized = true;
  }

  refreshOtCalendar();
}

// 캘린더 새로고침
async function refreshOtCalendar() {
  const year = parseInt(document.getElementById('otYear').value);
  const month = parseInt(document.getElementById('otMonth').value);

  // 배지 업데이트
  document.getElementById('otMonthBadge').textContent = `${year}년 ${month}월`;

  // 공휴일 데이터 가져오기
  let workInfo;
  try {
    workInfo = await HOLIDAYS.calcWorkDays(year, month);
  } catch {
    workInfo = { holidays: [], anniversaries: [] };
  }

  // 공휴일 맵 구축
  otHolidayMap = {};
  (workInfo.holidays || []).forEach(h => {
    otHolidayMap[h.day] = h.name;
  });

  // 기록 가져오기
  const records = OVERTIME.getMonthRecords(year, month);

  // 날짜별 기록 그룹
  const recordsByDay = {};
  records.forEach(r => {
    const day = parseInt(r.date.split('-')[2]);
    if (!recordsByDay[day]) recordsByDay[day] = [];
    recordsByDay[day].push(r);
  });

  renderOtCalendar(year, month, recordsByDay);
  renderOtRecordList(records);
  renderOtStats(year, month);

  // 패널 닫기
  closeOtPanel();
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
  let html = '<div class="ot-cal"><div class="ot-cal-header">📅 ' + year + '년 ' + month + '월</div>';
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

    // 기록 도트
    let dotsHtml = '<div class="ot-cal-dots">';
    const dotTypes = [...new Set(dayRecords.map(r => r.type))];
    dotTypes.forEach(t => {
      dotsHtml += `<div class="ot-cal-dot ${t}"></div>`;
    });
    dotsHtml += '</div>';

    html += `<div class="${cls}"${titleAttr} onclick="onOtDateClick(${year},${month},${d})">${d}${dotsHtml}</div>`;
  }

  html += '</div>'; // grid

  // 범례
  html += `<div class="ot-cal-legend">
    <span><i class="dot" style="background:var(--accent-amber)"></i>시간외</span>
    <span><i class="dot" style="background:var(--accent-cyan)"></i>온콜대기</span>
    <span><i class="dot" style="background:var(--accent-indigo)"></i>온콜출근</span>
    <span><i class="dot" style="background:var(--accent-rose)"></i>공휴일</span>
    <span><i class="dot" style="background:var(--accent-emerald)"></i>오늘</span>
  </div>`;

  html += '</div>'; // ot-cal
  container.innerHTML = html;
}

// 날짜 클릭
function onOtDateClick(year, month, day) {
  otSelectedDate = { year, month, day };

  // 캘린더 선택 표시 업데이트
  document.querySelectorAll('.ot-cal-day').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dow = new Date(year, month - 1, day).getDay();
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  const isHoliday = !!otHolidayMap[day];

  let dateLabel = `${month}월 ${day}일 (${dowNames[dow]})`;
  if (isHoliday) dateLabel += ` 🔴 ${otHolidayMap[day]}`;
  if (dow === 0 || dow === 6) dateLabel += ' 🔵 주말';

  document.getElementById('otPanelDate').textContent = dateLabel;
  document.getElementById('otInputPanel').style.display = 'block';
  document.getElementById('otInputPanel').dataset.date = dateStr;
  document.getElementById('otInputPanel').dataset.isHoliday = isHoliday ? '1' : '0';

  // 초기화
  document.getElementById('otEditId').value = '';
  document.getElementById('otDeleteBtn').style.display = 'none';
  document.getElementById('otSaveBtn').textContent = '💾 저장';
  document.getElementById('otMemo').value = '';
  document.querySelector('input[name="otType"][value="overtime"]').checked = true;
  onOtTypeChange();
  previewOtCalc();

  // 해당 날짜 기존 기록 표시
  const existing = OVERTIME.getDateRecords(year, month, day);
  if (existing.length > 0) {
    let existingHtml = '<div style="margin-top:8px; padding:8px; background:rgba(245,158,11,0.06); border-radius:6px; font-size:12px;">';
    existingHtml += `<strong style="color:var(--accent-amber)">📋 기존 기록 (${existing.length}건)</strong>`;
    existing.forEach(r => {
      existingHtml += `<div style="margin-top:4px; cursor:pointer; padding:4px; border-radius:4px;" 
        onclick="editOtRecord('${r.id}')" 
        onmouseover="this.style.background='rgba(99,102,241,0.1)'" 
        onmouseout="this.style.background='transparent'">
        <span class="ot-record-type ${r.type}" style="font-size:10px">${OVERTIME.typeLabel(r.type)}</span>
        ${r.startTime ? r.startTime + '~' + r.endTime : '종일'}
        ${r.totalHours ? r.totalHours + 'h' : ''}
        <strong style="color:var(--accent-emerald)">₩${(r.estimatedPay || 0).toLocaleString()}</strong>
      </div>`;
    });
    existingHtml += '</div>';
    document.getElementById('otPreview').insertAdjacentHTML('afterend', existingHtml);
  }
}

// 패널 닫기
function closeOtPanel() {
  document.getElementById('otInputPanel').style.display = 'none';
  otSelectedDate = null;
  document.querySelectorAll('.ot-cal-day').forEach(el => el.classList.remove('selected'));
}

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

// 실시간 미리보기
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
    preview.innerHTML = `
      <div class="preview-row"><span>온콜 대기수당</span><span class="val">₩${DATA.allowances.onCallStandby.toLocaleString()}</span></div>
      <div class="preview-total"><span>예상 수당</span><span>₩${DATA.allowances.onCallStandby.toLocaleString()}</span></div>`;
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

  let html = `<div class="preview-row"><span>총 근무시간</span><span class="val">${tempBreakdown.totalHours}h</span></div>`;

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
    html += `<div class="preview-row"><span>휴일 ${tempBreakdown.holiday}h × 150%</span><span class="val">${(tempBreakdown.holiday * hourlyRate * 1.5).toLocaleString()}원</span></div>`;
  }
  if (tempBreakdown.holidayNight > 0) {
    html += `<div class="preview-row"><span>휴일야간 ${tempBreakdown.holidayNight}h × 200%</span><span class="val">${(tempBreakdown.holidayNight * hourlyRate * 2.0).toLocaleString()}원</span></div>`;
  }
  if (type === 'oncall_callout') {
    html += `<div class="preview-row"><span>온콜교통비</span><span class="val">₩${DATA.allowances.onCallTransport.toLocaleString()}</span></div>`;
    html += `<div class="preview-row"><span>온콜대기수당</span><span class="val">₩${DATA.allowances.onCallStandby.toLocaleString()}</span></div>`;
  }

  html += `<div class="preview-total"><span>예상 수당</span><span>₩${pay.toLocaleString()}</span></div>`;

  preview.innerHTML = html;
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

  if (type !== 'oncall_standby' && (!startTime || !endTime)) {
    alert('시작/종료 시간을 입력하세요.');
    return;
  }

  if (hourlyRate === 0 && type !== 'oncall_standby') {
    alert('시급이 설정되지 않았습니다. 시급 계산기를 이용하거나 내 정보를 저장해주세요.');
    return;
  }

  if (editId) {
    OVERTIME.updateRecordFull(editId, dateStr, startTime, endTime, type, hourlyRate, isHoliday, memo);
  } else {
    OVERTIME.createRecord(dateStr, startTime, endTime, type, hourlyRate, isHoliday, memo);
  }

  refreshOtCalendar();
}

// 기록 수정 모드
function editOtRecord(id) {
  const all = OVERTIME._loadAll();
  let record = null;
  for (const records of Object.values(all)) {
    record = records.find(r => r.id === id);
    if (record) break;
  }
  if (!record) return;

  // 해당 날짜로 패널 열기
  const [y, m, d] = record.date.split('-').map(Number);
  otSelectedDate = { year: y, month: m, day: d };

  document.getElementById('otInputPanel').style.display = 'block';
  document.getElementById('otInputPanel').dataset.date = record.date;
  document.getElementById('otInputPanel').dataset.isHoliday = record.isHoliday ? '1' : '0';

  const dow = new Date(y, m - 1, d).getDay();
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  let dateLabel = `${m}월 ${d}일 (${dowNames[dow]}) — 수정`;
  document.getElementById('otPanelDate').textContent = dateLabel;

  // 필드 채우기
  document.querySelector(`input[name="otType"][value="${record.type}"]`).checked = true;
  onOtTypeChange();

  if (record.startTime) document.getElementById('otStartTime').value = record.startTime;
  if (record.endTime) document.getElementById('otEndTime').value = record.endTime;
  document.getElementById('otMemo').value = record.memo || '';

  // 수정 모드 표시
  document.getElementById('otEditId').value = id;
  document.getElementById('otDeleteBtn').style.display = 'block';
  document.getElementById('otSaveBtn').textContent = '✏️ 수정';

  previewOtCalc();
}

// 삭제
function deleteOtRecord() {
  const id = document.getElementById('otEditId').value;
  if (!id) return;
  if (!confirm('이 기록을 삭제하시겠습니까?')) return;

  OVERTIME.deleteRecord(id);
  refreshOtCalendar();
}

// 월간 통계 렌더링
function renderOtStats(year, month) {
  const stats = OVERTIME.calcMonthlyStats(year, month);

  document.getElementById('otStatHours').textContent = stats.overtimeHours.toFixed(1) + 'h';
  document.getElementById('otStatStandby').textContent = stats.oncallStandbyDays + '일';
  document.getElementById('otStatCallout').textContent = stats.oncallCalloutCount + '회';
  document.getElementById('otStatPay').textContent = '₩' + stats.totalPay.toLocaleString();
  document.getElementById('otRecordCount').textContent = stats.recordCount + '건';
}

// 기록 목록 렌더링
function renderOtRecordList(records) {
  const container = document.getElementById('otRecordList');
  if (!container) return;

  if (records.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:24px;">캘린더에서 날짜를 클릭하여 기록을 추가하세요.</p>';
    return;
  }

  // 날짜순 정렬
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  let html = '';
  let totalPay = 0;

  sorted.forEach(r => {
    const day = parseInt(r.date.split('-')[2]);
    const dow = new Date(r.date).getDay();
    const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
    const timeStr = r.startTime && r.endTime ? `${r.startTime}~${r.endTime}` : '종일';
    const hoursStr = r.totalHours ? `${r.totalHours}h` : '';
    totalPay += r.estimatedPay || 0;

    html += `<div class="ot-record-item" onclick="editOtRecord('${r.id}')">
      <div class="ot-record-date">${day}<br><span style="font-size:10px;color:var(--text-muted)">${dowNames[dow]}</span></div>
      <span class="ot-record-type ${r.type}">${OVERTIME.typeLabel(r.type)}</span>
      <div class="ot-record-info">${timeStr} ${hoursStr}${r.memo ? '<br><span style="color:var(--text-muted)">' + r.memo + '</span>' : ''}</div>
      <div class="ot-record-pay">₩${(r.estimatedPay || 0).toLocaleString()}</div>
    </div>`;
  });

  html += `<div class="ot-record-summary">
    <span>합계 (${sorted.length}건)</span>
    <span>₩${totalPay.toLocaleString()}</span>
  </div>`;

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

// ═══════════ 📅 휴가 관리 ═══════════

let lvSelectedDate = null;
let lvHolidayMap = {};
let lvTotalAnnual = 0;
let lvInitialized = false;

function initLeaveTab() {
  const now = new Date();
  const yearSel = document.getElementById('lvYear');
  const monthSel = document.getElementById('lvMonth');
  if (yearSel) yearSel.value = String(now.getFullYear());
  if (monthSel) monthSel.value = String(now.getMonth() + 1);

  // 프로필에서 연차 자동 산정
  const profile = PROFILE.load();
  if (profile && profile.hireDate) {
    const parsed = PROFILE.parseDate(profile.hireDate);
    if (parsed) {
      const result = CALC.calcAnnualLeave(parsed);
      if (result) lvTotalAnnual = result.총연차;
    }
  }

  // 유형 select 동적 생성
  populateLvTypeSelect();

  // 연도/월 변경 이벤트 (최초 1회만)
  if (!lvInitialized) {
    document.getElementById('lvYear').addEventListener('change', () => refreshLvCalendar());
    document.getElementById('lvMonth').addEventListener('change', () => refreshLvCalendar());
    document.getElementById('lvStartDate').addEventListener('change', previewLvCalc);
    document.getElementById('lvEndDate').addEventListener('change', previewLvCalc);
    lvInitialized = true;
  }

  refreshLvCalendar();
}

// 유형 select 동적 생성 (성별 필터 + optgroup)
function populateLvTypeSelect() {
  const sel = document.getElementById('lvType');
  if (!sel) return;
  sel.innerHTML = '';

  const profile = PROFILE.load();
  const gender = profile ? profile.gender : '';
  const groups = LEAVE.getGroupedTypes(gender);

  groups.forEach(group => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    group.items.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      const paidIcon = t.isPaid ? '🟢' : '🔴';
      let label = `${paidIcon} ${t.label}`;
      if (t.halfDay) label += ' (0.5일)';
      if (t.quota !== null) label += ` [${t.quota}일]`;
      opt.textContent = label;
      optgroup.appendChild(opt);
    });
    sel.appendChild(optgroup);
  });
}

async function refreshLvCalendar() {
  const year = parseInt(document.getElementById('lvYear').value);
  const month = parseInt(document.getElementById('lvMonth').value);

  document.getElementById('lvMonthBadge').textContent = `${year}년 ${month}월`;

  // 공휴일 데이터
  let workInfo;
  try { workInfo = await HOLIDAYS.calcWorkDays(year, month); }
  catch { workInfo = { holidays: [], anniversaries: [] }; }

  lvHolidayMap = {};
  (workInfo.holidays || []).forEach(h => { lvHolidayMap[h.day] = h.name; });

  // 기록
  const monthRecords = LEAVE.getMonthRecords(year, month);
  const recordsByDay = {};
  monthRecords.forEach(r => {
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getMonth() + 1 === month && cur.getFullYear() === year) {
        const d = cur.getDate();
        if (!recordsByDay[d]) recordsByDay[d] = [];
        recordsByDay[d].push(r);
      }
      cur.setDate(cur.getDate() + 1);
    }
  });

  renderLvCalendar(year, month, recordsByDay);
  renderLvRecordList(year);
  renderLvStats(year);
  renderLvQuotaTable(year);
  closeLvPanel();
}

function renderLvCalendar(year, month, recordsByDay) {
  const container = document.getElementById('lvCalendar');
  if (!container) return;

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const today = new Date();
  const isCurrentMonth = (today.getFullYear() === year && (today.getMonth() + 1) === month);
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const dowLabels = ['일', '월', '화', '수', '목', '금', '토'];
  let html = '<div class="ot-cal"><div class="ot-cal-header" style="background:rgba(16,185,129,0.08); color:var(--accent-emerald)">📅 ' + year + '년 ' + month + '월</div>';
  html += '<div class="ot-cal-grid">';

  dowLabels.forEach((d, i) => {
    const cls = i === 0 ? 'sun' : (i === 6 ? 'sat' : '');
    html += `<div class="ot-cal-dow ${cls}">${d}</div>`;
  });

  for (let i = 0; i < firstDow; i++) html += '<div class="ot-cal-day empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const isWknd = (dow === 0 || dow === 6);
    const isHoliday = !!lvHolidayMap[d];
    const isToday = (d === todayDay);
    const isSelected = lvSelectedDate && lvSelectedDate.day === d;
    const dayRecords = recordsByDay[d] || [];

    let cls = 'ot-cal-day';
    if (isHoliday) cls += ' holiday';
    else if (isWknd) cls += ' weekend';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';

    let dotsHtml = '<div class="ot-cal-dots">';
    const dotTypes = [...new Set(dayRecords.map(r => r.type))];
    dotTypes.forEach(t => {
      const typeInfo = LEAVE.getTypeById(t);
      const catClass = typeInfo ? typeInfo.category : t;
      dotsHtml += `<div class="lv-cal-dot ${catClass}"></div>`;
    });
    dotsHtml += '</div>';

    html += `<div class="${cls}" onclick="onLvDateClick(${year},${month},${d})">${d}${dotsHtml}</div>`;
  }

  html += '</div>';
  html += `<div class="ot-cal-legend">
    <span><i class="dot" style="background:var(--accent-emerald)"></i>법정</span>
    <span><i class="dot" style="background:var(--accent-rose)"></i>건강</span>
    <span><i class="dot" style="background:var(--accent-amber)"></i>청원</span>
    <span><i class="dot" style="background:var(--accent-violet)"></i>교육</span>
    <span><i class="dot" style="background:var(--accent-cyan)"></i>출산</span>
  </div>`;
  html += '</div>';
  container.innerHTML = html;
}

function onLvDateClick(year, month, day) {
  lvSelectedDate = { year, month, day };
  document.querySelectorAll('#lvCalendar .ot-cal-day').forEach(el => el.classList.remove('selected'));
  if (event && event.currentTarget) event.currentTarget.classList.add('selected');

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dow = new Date(year, month - 1, day).getDay();
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];

  let dateLabel = `${month}월 ${day}일 (${dowNames[dow]})`;
  if (lvHolidayMap[day]) dateLabel += ` 🔴 ${lvHolidayMap[day]}`;

  document.getElementById('lvPanelDate').textContent = dateLabel;
  document.getElementById('lvInputPanel').style.display = 'block';
  document.getElementById('lvStartDate').value = dateStr;
  document.getElementById('lvEndDate').value = dateStr;
  document.getElementById('lvEditId').value = '';
  document.getElementById('lvDeleteBtn').style.display = 'none';
  document.getElementById('lvSaveBtn').textContent = '💾 저장';
  document.getElementById('lvMemo').value = '';
  document.getElementById('lvType').value = 'annual';

  onLvTypeChange();
  previewLvCalc();

  // 기존 기록 표시
  const existing = LEAVE.getDateRecords(dateStr);
  if (existing.length > 0) {
    const container = document.getElementById('lvPreview');
    let extra = '<div style="margin-top:8px; padding:8px; background:rgba(16,185,129,0.06); border-radius:6px; font-size:12px;">';
    extra += `<strong style="color:var(--accent-emerald)">📋 기존 기록 (${existing.length}건)</strong>`;
    existing.forEach(r => {
      const typeInfo = LEAVE.getTypeById(r.type);
      extra += `<div style="margin-top:4px; cursor:pointer; padding:4px; border-radius:4px;" 
        onclick="editLvRecord('${r.id}')"
        onmouseover="this.style.background='rgba(99,102,241,0.1)'"
        onmouseout="this.style.background='transparent'">
        <span class="lv-record-type ${r.isPaid ? 'paid' : 'unpaid'}" style="font-size:10px">${typeInfo ? typeInfo.label : r.type}</span>
        ${r.startDate === r.endDate ? '' : r.startDate + '~' + r.endDate}
        ${r.days}일
        ${r.salaryImpact ? '<strong style="color:var(--accent-rose)">-₩' + Math.abs(r.salaryImpact).toLocaleString() + '</strong>' : ''}
      </div>`;
    });
    extra += '</div>';
    container.insertAdjacentHTML('afterend', extra);
  }
}

function closeLvPanel() {
  document.getElementById('lvInputPanel').style.display = 'none';
  lvSelectedDate = null;
  document.querySelectorAll('#lvCalendar .ot-cal-day').forEach(el => el.classList.remove('selected'));
}

function onLvTypeChange() {
  const type = document.getElementById('lvType').value;
  const typeInfo = LEAVE.getTypeById(type);

  // 청원/경조 상세정보 표시
  const ceremonyPanel = document.getElementById('lvCeremonyInfo');
  if (typeInfo && typeInfo.ceremonyDays !== undefined) {
    document.getElementById('lvCeremonyDays').innerHTML = `<strong>휴가일수:</strong> ${typeInfo.ceremonyDays}일`;
    document.getElementById('lvCeremonyPay').innerHTML = typeInfo.ceremonyPay > 0
      ? `<strong>경조비:</strong> ₩${typeInfo.ceremonyPay.toLocaleString()}`
      : `<strong>경조비:</strong> 없음`;
    document.getElementById('lvCeremonyDocs').innerHTML = typeInfo.docs
      ? `<strong>구비서류:</strong> ${typeInfo.docs}`
      : '';
    document.getElementById('lvCeremonyExtra').innerHTML = typeInfo.extra
      ? `💡 ${typeInfo.extra}`
      : '';
    ceremonyPanel.style.display = 'block';
  } else {
    ceremonyPanel.style.display = 'none';
  }

  // 유형 참고사항
  const noteEl = document.getElementById('lvTypeNote');
  if (typeInfo && (typeInfo.note || typeInfo.ref)) {
    let noteHtml = '';
    if (typeInfo.note) noteHtml += `📝 ${typeInfo.note}`;
    if (typeInfo.ref) noteHtml += `${typeInfo.note ? '<br>' : ''}📖 근거: ${typeInfo.ref}`;
    noteEl.innerHTML = noteHtml;
    noteEl.style.display = 'block';
  } else {
    noteEl.style.display = 'none';
  }

  // 한도 현황 뱃지
  const quotaBadge = document.getElementById('lvQuotaBadge');
  const year = parseInt(document.getElementById('lvYear').value);
  if (typeInfo && typeInfo.quota !== null && !typeInfo.usesAnnual) {
    const records = LEAVE.getYearRecords(year);
    const used = records.filter(r => r.type === type).reduce((sum, r) => sum + (r.days || 0), 0);
    const remain = typeInfo.quota - used;
    const color = remain <= 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)';
    quotaBadge.innerHTML = `<div style="padding:6px 10px; border-radius:6px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); font-size:12px;">
      📊 <strong>${typeInfo.label}</strong> 한도: ${typeInfo.quota}일 | 사용: ${used}일 | <span style="color:${color}; font-weight:700;">잔여: ${remain}일</span>
      ${remain <= 0 ? '<br><span style="color:var(--accent-rose)">⚠️ 한도 초과!</span>' : ''}
    </div>`;
    quotaBadge.style.display = 'block';
  } else if (typeInfo && typeInfo.usesAnnual) {
    const summary = LEAVE.calcAnnualSummary(year, lvTotalAnnual);
    quotaBadge.innerHTML = `<div style="padding:6px 10px; border-radius:6px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); font-size:12px;">
      📅 연차 한도: ${lvTotalAnnual}일 | 사용: ${summary.usedAnnual}일 | <span style="color:var(--accent-emerald); font-weight:700;">잔여: ${summary.remainingAnnual}일</span>
    </div>`;
    quotaBadge.style.display = 'block';
  } else {
    quotaBadge.style.display = 'none';
  }

  previewLvCalc();
}

function previewLvCalc() {
  const preview = document.getElementById('lvPreview');
  const type = document.getElementById('lvType').value;
  const typeInfo = LEAVE.getTypeById(type);
  if (!typeInfo) { preview.innerHTML = ''; return; }

  const startStr = document.getElementById('lvStartDate').value;
  const endStr = document.getElementById('lvEndDate').value;
  if (!startStr || !endStr) { preview.innerHTML = ''; return; }

  let days;
  if (typeInfo.halfDay) {
    days = 0.5;
  } else if (typeInfo.ceremonyDays) {
    days = typeInfo.ceremonyDays;
  } else {
    days = LEAVE._calcBusinessDays(startStr, endStr);
  }

  let html = `<div class="preview-row"><span>유형</span><span class="val">${typeInfo.label}</span></div>`;
  html += `<div class="preview-row"><span>일수</span><span class="val">${days}일</span></div>`;

  if (typeInfo.usesAnnual) {
    const summary = LEAVE.calcAnnualSummary(parseInt(startStr.split('-')[0]), lvTotalAnnual);
    const remain = summary.remainingAnnual;
    html += `<div class="preview-row"><span>연차 차감</span><span class="val" style="color:var(--accent-amber)">-${days}일</span></div>`;
    html += `<div class="preview-row"><span>잔여 연차</span><span class="val">${remain}일 → ${remain - days}일</span></div>`;
  }

  // 급여 공제 미리보기
  if (typeInfo.deductType === 'basePay') {
    const profile = PROFILE.load();
    const wage = profile ? PROFILE.calcWage(profile) : null;
    const monthlyBasePay = wage ? (wage.breakdown ? wage.breakdown.basePay / 12 : 0) : 0;
    const deduction = monthlyBasePay / 30 * days;
    html += `<div class="preview-row"><span>급여 차감</span><span class="val" style="color:var(--accent-rose)">-₩${Math.round(deduction).toLocaleString()}</span></div>`;
    html += `<div class="preview-row"><span>공제기준</span><span class="val" style="font-size:10px; color:var(--text-muted)">기본급 일액 (보수규정 제7조)</span></div>`;
  } else if (typeInfo.deductType === 'ordinary') {
    const profile = PROFILE.load();
    const wage = profile ? PROFILE.calcWage(profile) : null;
    const hourlyRate = wage ? wage.hourlyRate : 0;
    const deduction = hourlyRate * 8 * days;
    html += `<div class="preview-row"><span>급여 차감</span><span class="val" style="color:var(--accent-rose)">-₩${Math.round(deduction).toLocaleString()}</span></div>`;
    html += `<div class="preview-row"><span>공제기준</span><span class="val" style="font-size:10px; color:var(--text-muted)">통상임금 1/30 (보수규정 제7조②)</span></div>`;
  } else {
    html += `<div class="preview-row"><span>급여 차감</span><span class="val" style="color:var(--accent-emerald)">₩0 (유급)</span></div>`;
  }

  preview.innerHTML = html;
}

function saveLvRecord() {
  const type = document.getElementById('lvType').value;
  const startDate = document.getElementById('lvStartDate').value;
  const endDate = document.getElementById('lvEndDate').value;
  const memo = document.getElementById('lvMemo').value;
  const editId = document.getElementById('lvEditId').value;

  if (!startDate || !endDate) { alert('시작일/종료일을 선택하세요.'); return; }
  if (new Date(endDate) < new Date(startDate)) { alert('종료일이 시작일보다 이전입니다.'); return; }

  const typeInfo = LEAVE.getTypeById(type);
  const profile = PROFILE.load();
  const wage = profile ? PROFILE.calcWage(profile) : null;
  const hourlyRate = wage ? wage.hourlyRate : 0;
  const monthlyBasePay = wage && wage.breakdown ? wage.breakdown.basePay / 12 : 0;

  let days;
  if (typeInfo && typeInfo.halfDay) {
    days = 0.5;
  } else if (typeInfo && typeInfo.ceremonyDays) {
    days = typeInfo.ceremonyDays;
  } else {
    days = LEAVE._calcBusinessDays(startDate, endDate);
  }

  const record = { type, startDate, endDate, days, memo, hourlyRate, monthlyBasePay };

  if (editId) {
    LEAVE.updateRecord(editId, record);
  } else {
    LEAVE.addRecord(record);
  }

  refreshLvCalendar();
}

function editLvRecord(id) {
  const all = LEAVE._loadAll();
  let record = null;
  for (const records of Object.values(all)) {
    record = records.find(r => r.id === id);
    if (record) break;
  }
  if (!record) return;

  document.getElementById('lvInputPanel').style.display = 'block';
  document.getElementById('lvType').value = record.type;
  document.getElementById('lvStartDate').value = record.startDate;
  document.getElementById('lvEndDate').value = record.endDate;
  document.getElementById('lvMemo').value = record.memo || '';
  document.getElementById('lvEditId').value = id;
  document.getElementById('lvDeleteBtn').style.display = 'block';
  document.getElementById('lvSaveBtn').textContent = '✏️ 수정';

  const [y, m, d] = record.startDate.split('-').map(Number);
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dow = new Date(y, m - 1, d).getDay();
  document.getElementById('lvPanelDate').textContent = `${m}월 ${d}일 (${dowNames[dow]}) — 수정`;

  onLvTypeChange();
  previewLvCalc();
}

function deleteLvRecord() {
  const id = document.getElementById('lvEditId').value;
  if (!id) return;
  if (!confirm('이 휴가 기록을 삭제하시겠습니까?')) return;
  LEAVE.deleteRecord(id);
  refreshLvCalendar();
}

function renderLvStats(year) {
  const summary = LEAVE.calcAnnualSummary(year, lvTotalAnnual);

  document.getElementById('lvStatTotal').textContent = summary.totalAnnual + '일';
  document.getElementById('lvStatUsed').textContent = summary.usedAnnual + '일';
  document.getElementById('lvStatRemain').textContent = summary.remainingAnnual + '일';
  document.getElementById('lvStatDeduction').textContent = summary.totalDeduction > 0 ? '-₩' + summary.totalDeduction.toLocaleString() : '₩0';
  document.getElementById('lvUsagePercent').textContent = summary.usagePercent + '%';
  document.getElementById('lvProgressFill').style.width = summary.usagePercent + '%';
  document.getElementById('lvRecordCount').textContent = summary.recordCount + '건';
}

function renderLvQuotaTable(year) {
  const container = document.getElementById('lvQuotaTable');
  if (!container) return;

  const quotas = LEAVE.calcQuotaSummary(year, lvTotalAnnual);
  if (quotas.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:12px;">프로필 저장 후 확인 가능</p>';
    return;
  }

  let html = '<div style="display:grid; gap:6px;">';
  quotas.forEach(q => {
    const pct = q.quota > 0 ? Math.min(100, Math.round((q.used / q.quota) * 100)) : 0;
    const barColor = q.overQuota ? 'var(--accent-rose)' : 'var(--gradient-primary)';
    html += `<div style="padding:8px 10px; border-radius:6px; background:var(--bg-glass); border:1px solid var(--border-glass);">
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
        <span style="font-weight:600;">${q.label}</span>
        <span style="color:${q.overQuota ? 'var(--accent-rose)' : 'var(--text-secondary)'}; font-weight:600;">
          ${q.used}/${q.quota}일 ${q.overQuota ? '⚠️' : ''}
        </span>
      </div>
      <div class="lv-progress-bar" style="height:5px;">
        <div class="lv-progress-fill" style="width:${pct}%; background:${barColor}"></div>
      </div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderLvRecordList(year) {
  const container = document.getElementById('lvRecordList');
  if (!container) return;

  const records = LEAVE.getYearRecords(year);
  if (records.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:24px;">캘린더에서 날짜를 클릭하여 휴가를 등록하세요.</p>';
    return;
  }

  const sorted = [...records].sort((a, b) => a.startDate.localeCompare(b.startDate));
  let html = '';

  sorted.forEach(r => {
    const typeInfo = LEAVE.getTypeById(r.type);
    const dateDisplay = r.startDate === r.endDate
      ? r.startDate.substring(5)
      : r.startDate.substring(5) + ' ~ ' + r.endDate.substring(5);

    html += `<div class="lv-record-item" onclick="editLvRecord('${r.id}')">
      <span class="lv-record-type ${r.isPaid ? 'paid' : 'unpaid'}">${typeInfo ? typeInfo.label : r.type}</span>
      <div style="flex:1; font-size:12px; color:var(--text-secondary)">
        ${dateDisplay} (${r.days}일)
        ${r.memo ? '<br><span style="color:var(--text-muted)">' + r.memo + '</span>' : ''}
      </div>
      <div style="font-size:12px; font-weight:700; color:${r.salaryImpact ? 'var(--accent-rose)' : 'var(--accent-emerald)'}">
        ${r.salaryImpact ? '-₩' + Math.abs(r.salaryImpact).toLocaleString() : '유급'}
      </div>
    </div>`;
  });

  container.innerHTML = html;
}

function exportLvData() {
  const json = LEAVE.exportData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leave_records_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  document.getElementById('lvExportMsg').textContent = '✅ 내보내기 완료';
}

function importLvData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = LEAVE.importData(e.target.result);
    document.getElementById('lvExportMsg').textContent = result.message;
    if (result.success) refreshLvCalendar();
  };
  reader.readAsText(file);
  event.target.value = '';
}
