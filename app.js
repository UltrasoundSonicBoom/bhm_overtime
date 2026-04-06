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

    const tabName = tab.dataset.tab;
    if (tabName === 'payroll') { applyProfileToPayroll(); if (typeof PAYROLL !== 'undefined') PAYROLL.init(); }
    if (tabName === 'overtime') { applyProfileToOvertime(); initOvertimeTab(); }
    if (tabName === 'leave') { applyProfileToLeave(); initLeaveTab(); }
    if (tabName === 'reference') renderWikiToc();
    if (tabName === 'profile') initProfileTab();
  });
});

// ── 서브탭 전환 ──
document.querySelectorAll('.sub-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('sub-' + tab.dataset.subtab).classList.add('active');
  });
});

// ── 개인정보 탭 초기화 ──
function initProfileTab() {
  const saved = PROFILE.load();
  if (saved) {
    updateProfileSummary(saved);
  }
}

// ── 개인정보 탭으로 전환 ──
function switchToProfileTab() {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const profileTab = document.querySelector('.nav-tab[data-tab="profile"]');
  if (profileTab) profileTab.classList.add('active');
  document.getElementById('tab-profile').classList.add('active');
  initProfileTab();
}

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
  const selectIds = ['pfJobType', 'psJobType', 'wJobType'];
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

  // 입사일 → 근속연수 표시 + 근속가산기본급 자동 감지 (2016.2 이전 입사자)
  document.getElementById('pfHireDate').addEventListener('input', (e) => {
    const parsed = PROFILE.parseDate(e.target.value);
    if (parsed) {
      const years = PROFILE.calcServiceYears(parsed);
      document.getElementById('pfServiceDisplay').textContent = `→ ${parsed} (근속 ${years}년)`;
      const hireDate = new Date(parsed);
      const seniorityThreshold = new Date('2016-02-01');
      document.getElementById('pfSeniority').checked = hireDate < seniorityThreshold;
    } else if (e.target.value.length > 0) {
      document.getElementById('pfServiceDisplay').textContent = '※ YYYY-MM-DD, YYYYMMDD, YYYY.MM.DD 형식';
    } else {
      document.getElementById('pfServiceDisplay').textContent = '';
      document.getElementById('pfSeniority').checked = false;
    }
  });

  // 저장된 프로필 불러오기
  const saved = PROFILE.load();
  if (saved) {
    PROFILE.applyToForm(saved, PROFILE_FIELDS);
    updateProfileSummary(saved);
    const profileStatusEl = document.getElementById('profileStatus');
    if (profileStatusEl) {
      profileStatusEl.textContent = '저장됨 ✓';
      profileStatusEl.className = 'badge emerald';
    }
    // 데이터가 있으면 입력 폼 접기
    const pfInput = document.getElementById('pfInputFields');
    if (pfInput) {
      pfInput.style.display = 'none';
      const label = document.getElementById('pfInputToggleLabel');
      if (label) label.textContent = '▸ 내 정보 입력/수정';
    }
  } else {
    // 데이터 없으면 열어두기
    const pfInput = document.getElementById('pfInputFields');
    if (pfInput) {
      pfInput.style.display = 'block';
      const label = document.getElementById('pfInputToggleLabel');
      if (label) label.textContent = '▼ 내 정보 입력/수정';
    }
  }

  // 급여 시뮬레이터: 연도/월 변경 시 자동 업데이트
  document.getElementById('psSimYear').addEventListener('change', () => autoFillMonth());
  document.getElementById('psSimMonth').addEventListener('change', () => autoFillMonth());

  // 초기 로드 시 현재 선택된 연도/월로 자동설정
  autoFillMonth();

  // v1 대시보드: 시간외·온콜 전용 초기화
  function activateV1DefaultTab() {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    const otTab = document.querySelector('.nav-tab[data-tab="overtime"]');
    const otContent = document.getElementById('tab-overtime');
    
    if (otTab) otTab.classList.add('active');
    if (otContent) otContent.classList.add('active');
    
    applyProfileToOvertime();
    initOvertimeTab();
    initLeaveTab();
  }
  activateV1DefaultTab();

  // ── [URL 파라미터 듀얼 모드 감지] ──
  const urlParams = new URLSearchParams(window.location.search);
  window.isFamilyMode = urlParams.get('mode') === 'family';

  const authContainer = document.getElementById('authContainer');
  const backupSection = document.getElementById('localBackupSection');
  
  if (!window.isFamilyMode) {
      if (authContainer) authContainer.style.display = 'none';
      if (backupSection) backupSection.style.display = 'block';
  } else {
      if (authContainer) authContainer.style.display = 'flex';
      if (backupSection) backupSection.style.display = 'none'; // 가족 모드에서는 백업 UI 숨김 (원하면 유지 가능하지만 클라우드가 있으므로 숨김)
  }

  // ── [Supabase Cloud Sync Callback] ──
  window.syncCloudData = function(cloudData) {
    if (!cloudData) return;
    let changed = false;
    if (cloudData.profile) {
      localStorage.setItem(PROFILE.STORAGE_KEY, JSON.stringify(cloudData.profile));
      changed = true;
    }
    if (cloudData.overtime && cloudData.overtime.length > 0) {
      const otMap = {};
      cloudData.overtime.forEach(r => {
        const d = new Date(r.date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2, '0')}`;
        if (!otMap[key]) otMap[key] = [];
        otMap[key].push(r);
      });
      localStorage.setItem(OVERTIME.STORAGE_KEY, JSON.stringify(otMap));
      changed = true;
    }

    // 휴가 데이터 동기화
    if (cloudData.leave && cloudData.leave.length > 0) {
      const lvMap = {};
      cloudData.leave.forEach(r => {
        // 시간차 데이터 복구: hours가 있으면 type을 time_leave로 강제 설정
        if (r.hours && r.hours > 0 && r.type !== 'time_leave') {
          console.warn('[syncCloudData] 시간차 type 복구:', r.id, r.type, '→ time_leave');
          r.type = 'time_leave';
        }
        const year = r.startDate.split('-')[0];
        if (!lvMap[year]) lvMap[year] = [];
        lvMap[year].push(r);
      });
      localStorage.setItem(LEAVE.STORAGE_KEY, JSON.stringify(lvMap));
      changed = true;
    }

    if (changed) {
      console.log("Cloud data synced, refreshing UI...");
      const profile = PROFILE.load();
      if (profile) {
        PROFILE.applyToForm(profile, PROFILE_FIELDS);
        updateProfileSummary(profile);
        const profileStatusEl = document.getElementById('profileStatus');
        if (profileStatusEl) {
          profileStatusEl.textContent = '저장됨 ✓';
          profileStatusEl.className = 'badge emerald';
        }
      }
      if (typeof applyProfileToOvertime === 'function') applyProfileToOvertime();
      if (typeof initOvertimeTab === 'function') initOvertimeTab();
      
      const toast = document.getElementById('otToast');
      if (toast) {
        toast.textContent = "클라우드 데이터와 동기화되었습니다. ✅";
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
      }
    }
  };
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
  // 저장 후 입력 폼 접기
  const pfInput = document.getElementById('pfInputFields');
  if (pfInput) pfInput.style.display = 'none';
  const label = document.getElementById('pfInputToggleLabel');
  if (label) label.textContent = '▸ 내 정보 입력/수정';
  // Q&A 카드 갱신
  if (typeof PAYROLL !== 'undefined') PAYROLL.init();
  // 휴가 연차 한도 갱신
  if (typeof applyProfileToLeave === 'function') applyProfileToLeave();
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
  // 초기화 후 입력 폼 열기
  const pfInput = document.getElementById('pfInputFields');
  if (pfInput) pfInput.style.display = 'block';
  const label = document.getElementById('pfInputToggleLabel');
  if (label) label.textContent = '▼ 내 정보 입력/수정';
  document.getElementById('profileSummary').innerHTML = `
        <div class="card-title" style="font-size:var(--text-body-large);"><span class="icon indigo">📝</span> 통상임금 내역</div>
        <p style="color:var(--text-muted)">정보를 입력하고 [저장하기]를 눌러주세요.</p>
    `;
  // Q&A 카드 갱신
  if (typeof PAYROLL !== 'undefined') PAYROLL.init();
}

// ═══════════ 데이터 백업 및 복구 ═══════════
function downloadBackup() {
    const data = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        profile: localStorage.getItem(PROFILE.STORAGE_KEY),
        overtime: localStorage.getItem(OVERTIME.STORAGE_KEY),
        leave: localStorage.getItem(LEAVE.STORAGE_KEY)
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const yyyymmdd = new Date().toISOString().split('T')[0];
    a.download = `snuh_backup_${yyyymmdd}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const toast = document.getElementById('otToast');
    if (toast) {
        toast.textContent = "백업 파일이 안전하게 다운로드되었습니다. 📥";
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    } else {
        alert("백업 파일이 다운로드되었습니다.");
    }
}

async function uploadBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.profile) localStorage.setItem(PROFILE.STORAGE_KEY, data.profile);
        if (data.overtime) localStorage.setItem(OVERTIME.STORAGE_KEY, data.overtime);
        if (data.leave) localStorage.setItem(LEAVE.STORAGE_KEY, data.leave);
        
        alert("데이터가 성공적으로 복원되었습니다! 앱을 새로고침합니다.");
        window.location.reload();
    } catch (e) {
        alert("복원 실패: 올바른 백업 파일이 아닙니다.");
    } finally {
        event.target.value = '';
    }
}

function updateProfileSummary(profile) {
  const wage = PROFILE.calcWage(profile);
  if (!wage) return;

  const serviceYears = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
  const table = DATA.payTables[CALC.resolvePayTable(profile.jobType)];
  const gradeLabel = table ? (table.gradeLabels[profile.grade] || profile.grade) : profile.grade;

  let html = `
    <div class="card-title" style="font-size:var(--text-body-large);"><span class="icon indigo">📝</span> 통상임금 내역</div>
    `;

  Object.entries(wage.breakdown).forEach(([key, val]) => {
    if (val > 0) {
      html += `<div class="result-row"><span class="key">${key}</span><span class="val">${CALC.formatCurrency(val)}</span></div>`;
    }
  });

  const gradeDisplay = `${profile.jobType} ${gradeLabel}(${profile.grade}) ${profile.year}년차${serviceYears > 0 ? ` · 근속 ${serviceYears}년` : ''}`;
  html += `
    <div class="result-row" style="border-top:2px solid var(--border); margin-top:8px; padding-top:8px; font-weight:600;">
      <span class="key">현재 직급/호봉</span><span class="val" style="color:var(--text-muted); font-size:var(--text-body-normal);">${gradeDisplay}</span>
    </div>
    <div class="result-row" style="font-weight:700;">
      <span class="key">월 통상임금</span><span class="val" style="color:var(--accent-indigo);">${CALC.formatCurrency(wage.monthlyWage)}</span>
    </div>
    <div class="result-row" style="font-weight:700;">
      <span class="key">시급 (÷209시간)</span><span class="val" style="color:var(--accent-emerald);">${CALC.formatCurrency(wage.hourlyRate)}</span>
    </div>
    ${!profile.adjustPay ? '<div class="warning-box" style="margin-top:8px; border-color:var(--accent-amber);">⚠️ 조정급 미입력 시 근속가산기본급·명절지원비가 과소 계산됩니다. 내 정보에서 조정급을 입력해주세요.</div>' : ''}
    <div class="warning-box" style="margin-top:8px;">💡 이 시급이 시간외·온콜 탭에 자동 반영됩니다.</div>`;
  document.getElementById('profileSummary').innerHTML = html;
}

// ═══════════ 프로필 → 각 탭 자동 반영 ═══════════
function applyProfileToOvertime() {
  const profile = PROFILE.load();
  if (!profile) return;
  const wage = PROFILE.calcWage(profile);
  if (!wage) return;
  document.getElementById('otHourly').value = wage.hourlyRate;
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
    
    // 입사일이 있으면 배너 숨김
    const infoNote = document.getElementById('lvAnnualInfoNote');
    if (infoNote) infoNote.style.display = 'none';

    // 연차 자동 산정
    const parsed = PROFILE.parseDate(profile.hireDate);
    if (parsed) {
      const result = CALC.calcAnnualLeave(parsed);
      if (result) lvTotalAnnual = result.totalLeave;
    }
  } else {
    const infoNote = document.getElementById('lvAnnualInfoNote');
    if (infoNote) infoNote.style.display = 'flex';
  }
  const wage = PROFILE.calcWage(profile);
  if (wage) {
    const plWageEl = document.getElementById('plWage');
    if (plWageEl) plWageEl.value = wage.monthlyWage;
  }
}

// applyProfileToCareer — 제거됨 (승진·퇴직은 Q&A 카드로 이동)

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
  const prevCumulative = (profile && profile.nightShiftsUnrewarded) ? profile.nightShiftsUnrewarded : 0;
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
  msg.innerHTML = text;
  if (ref) {
    msg.innerHTML += `<span class="ref">📌 ${ref}</span>`;
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
  } catch(e) {}

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
  } catch(e) {}
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

  // 초기화
  document.getElementById('otEditId').value = '';
  document.getElementById('otDeleteBtn').style.display = 'none';
  document.getElementById('otSaveBtn').textContent = '💾 저장';
  document.getElementById('otSaveBtn').disabled = false;
  document.getElementById('otMemo').value = '';
  document.querySelector('input[name="otType"][value="overtime"]').checked = true;
  onOtTypeChange();
  previewOtCalc();

  // 해당 날짜 기존 기록 표시 (전용 컨테이너 사용 → 중복 방지)
  const existingContainer = document.getElementById('otExistingRecords');
  existingContainer.innerHTML = '';
  const existing = OVERTIME.getDateRecords(year, month, day);
  if (existing.length > 0) {
    let existingHtml = '<div style="margin-top:8px; padding:8px; background:rgba(244,63,94,0.06); border-radius:6px; font-size:var(--text-body-normal);">';
    existingHtml += `<strong style="color:var(--accent-rose)">📋 기존 기록 (${existing.length}건)</strong>`;
    existing.forEach(r => {
      existingHtml += `<div style="margin-top:4px; padding:4px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;"
        onmouseover="this.style.background='rgba(99,102,241,0.1)'"
        onmouseout="this.style.background='transparent'">
        <div>
          <span class="ot-record-type ${r.type}" style="font-size:var(--text-label-small)">${OVERTIME.typeLabel(r.type)}</span>
          ${r.startTime ? r.startTime + '~' + r.endTime : '종일'}
          ${r.totalHours ? r.totalHours + 'h' : ''}
          <strong style="color:var(--accent-emerald)">₩${(r.estimatedPay || 0).toLocaleString()}</strong>
        </div>
        <div style="display:flex; gap:4px; flex-shrink:0;">
          <button onclick="editOtRecord('${r.id}')" style="background:var(--accent-indigo); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;">EDIT</button>
          <button onclick="deleteOtRecord('${r.id}')" style="background:var(--accent-rose); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;">DELETE</button>
        </div>
      </div>`;
    });
    existingHtml += '</div>';
    existingHtml += '</div>';
    existingContainer.innerHTML = existingHtml;
  }

  // 바텀 시트 열기 (모바일 대응)
  openOtBottomSheet();
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
  document.getElementById('otSaveBtn').textContent = '저장하기';
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
    html += `<div class="preview-row"><span>휴일 ${tempBreakdown.holiday}h × 150%</span><span class="val">${(tempBreakdown.holiday * hourlyRate * 1.5).toLocaleString()}원</span></div>`;
  }
  if (tempBreakdown.holidayNight > 0) {
    html += `<div class="preview-row"><span>휴일야간 ${tempBreakdown.holidayNight}h × 200%</span><span class="val">${(tempBreakdown.holidayNight * hourlyRate * 2.0).toLocaleString()}원</span></div>`;
  }
  if (type === 'oncall_callout') {
    html += `<div class="preview-row"><span>온콜교통비</span><span class="val">₩${DATA.allowances.onCallTransport.toLocaleString()}</span></div>`;
  }

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

  if (editId) {
    OVERTIME.updateRecordFull(editId, dateStr, startTime, endTime, type, hourlyRate, isHoliday, memo);
  } else {
    OVERTIME.createRecord(dateStr, startTime, endTime, type, hourlyRate, isHoliday, memo);
  }

  refreshOtCalendar();
  closeOtBottomSheet();
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

  const dateStr = document.getElementById('otInputPanel').dataset.date;
  
  OVERTIME.deleteRecord(id);
  
  // 패널 초기화 및 UI 갱신
  resetOtPanel();
  document.getElementById('otInputPanel').dataset.date = dateStr; // 유지
  if (dateStr) {
    const [y, m, d] = dateStr.split('-');
    onOtDateClick(parseInt(y), parseInt(m), parseInt(d));
  }
  
  refreshOtCalendar();
}

// 월간 대시보드 렌더링 (수당 금액 중심)
function renderOtDashboard(year, month) {
  const stats = OVERTIME.calcMonthlyStats(year, month);

  const container = document.getElementById('otDashboard');
  if (container) {
    const detailItems = [
      { label: '온콜출근', value: stats.oncallCalloutCount + '회', cls: 'indigo' },
      { label: '시간외', value: stats.overtimeHours.toFixed(1) + 'h', cls: 'rose' },
      { label: '온콜대기', value: stats.oncallStandbyDays + '일', cls: 'cyan' },
    ];
    const detailsHtml = detailItems
      .filter(i => parseFloat(i.value) > 0)
      .map(item => `<div class="ot-dash-item">${item.label} <span class="ot-dash-value ${item.cls}">${item.value}</span></div>`)
      .join('');

    container.innerHTML = `
      <div class="ot-dash-main">
        <div class="ot-dash-label">💰 ${month}월 예상 수당</div>
        <div class="ot-dash-pay">₩${stats.totalPay.toLocaleString()}</div>
      </div>
      <div class="ot-dash-details">${detailsHtml || '<span style="color:var(--text-muted); font-size:var(--text-body-normal);">기록 없음</span>'}</div>`;
  }

  const countEl = document.getElementById('otRecordCount');
  if (countEl) countEl.textContent = stats.recordCount + '건';

  const monthEl = document.getElementById('otRecordMonth');
  if (monthEl) monthEl.textContent = month;
}

// 하위 호환
function renderOtStats(year, month) { renderOtDashboard(year, month); }

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

  // 통계 그리드 (4칸)
  html += `<div class="lv-stats-grid">
    <div class="lv-stat-card"><div class="lv-stat-num">${totalHours.toFixed(1)}</div><div class="lv-stat-label">총 시간</div></div>
    <div class="lv-stat-card"><div class="lv-stat-num" style="color:var(--accent-rose)">${byType.overtime.count}</div><div class="lv-stat-label">시간외</div></div>
    <div class="lv-stat-card"><div class="lv-stat-num" style="color:var(--accent-cyan)">${byType.oncall_standby.count + byType.oncall_callout.count}</div><div class="lv-stat-label">온콜</div></div>
    <div class="lv-stat-card"><div class="lv-stat-num" style="color:var(--accent-emerald); font-size:var(--text-title-large);">₩${totalPay.toLocaleString()}</div><div class="lv-stat-label">예상수당</div></div>
  </div>`;

  // 유형별 분포
  const typeEntries = Object.entries(byType).filter(([, v]) => v.count > 0);
  if (typeEntries.length > 0) {
    const colors = { overtime: 'var(--accent-rose)', oncall_standby: 'var(--accent-cyan)', oncall_callout: 'var(--accent-indigo)' };
    html += '<div style="margin:12px 0 8px; font-size:var(--text-body-normal); font-weight:600; color:var(--text-muted);">유형별 분포</div>';
    html += '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px;">';
    typeEntries.forEach(([type, data]) => {
      const hoursStr = data.hours > 0 ? ` (${data.hours.toFixed(1)}h)` : '';
      html += `<span style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:12px; font-size:var(--text-body-normal); background:var(--bg-glass); border:1px solid var(--border-glass);">
        <i style="width:6px;height:6px;border-radius:50%;background:${colors[type]};display:inline-block;"></i>
        ${OVERTIME.typeLabel(type)} <strong>${data.count}건</strong>${hoursStr} ₩${data.pay.toLocaleString()}
      </span>`;
    });
    html += '</div>';
  }

  // 상세 기록 (접이식)
  html += `<div>
    <div class="collapsible-header" onclick="toggleCollapsible('otRecordDetail')">
      <span style="display:flex; align-items:center; gap:8px;"><span class="toggle-icon">▸</span> 상세 기록 (${sorted.length}건)</span>
    </div>
    <div class="collapsible-body" id="otRecordDetail" style="display:none; max-height:400px; overflow-y:auto;">`;

  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  sorted.forEach(r => {
    const day = parseInt(r.date.split('-')[2]);
    const dow = new Date(r.date).getDay();
    const timeStr = r.startTime && r.endTime ? `${r.startTime}~${r.endTime}` : '종일';
    const hoursStr = r.totalHours ? `${r.totalHours}h` : '';

    html += `<div class="ot-record-item" onclick="editOtRecord('${r.id}')">
      <div class="ot-record-date">${day}<br><span style="font-size:var(--text-label-small);color:var(--text-muted)">${dowNames[dow]}</span></div>
      <span class="ot-record-type ${r.type}">${OVERTIME.typeLabel(r.type)}</span>
      <div class="ot-record-info">${timeStr} ${hoursStr}${r.memo ? '<br><span style="color:var(--text-muted)">' + r.memo + '</span>' : ''}</div>
      <div class="ot-record-pay">₩${(r.estimatedPay || 0).toLocaleString()}</div>
    </div>`;
  });

  html += '</div></div>';

  // 합계
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
let lvCurrentYear = new Date().getFullYear();
let lvCurrentMonth = new Date().getMonth() + 1;
let lvInitialized = false;

// 월 이동
function lvNavMonth(delta) {
  lvCurrentMonth += delta;
  if (lvCurrentMonth > 12) { lvCurrentMonth = 1; lvCurrentYear++; }
  if (lvCurrentMonth < 1) { lvCurrentMonth = 12; lvCurrentYear--; }
  refreshLvCalendar();
}

function lvGoToday() {
  const now = new Date();
  lvCurrentYear = now.getFullYear();
  lvCurrentMonth = now.getMonth() + 1;
  refreshLvCalendar();
}

function initLeaveTab() {
  const now = new Date();
  lvCurrentYear = now.getFullYear();
  lvCurrentMonth = now.getMonth() + 1;

  // 프로필에서 연차 자동 산정
  const profile = PROFILE.load();
  if (profile && profile.hireDate) {
    const parsed = PROFILE.parseDate(profile.hireDate);
    if (parsed) {
      const result = CALC.calcAnnualLeave(parsed);
      if (result) lvTotalAnnual = result.totalLeave;
    }
  }

  // 유형 select 동적 생성
  populateLvTypeSelect();

  // 날짜 변경 이벤트 (최초 1회만)
  if (!lvInitialized) {
    document.getElementById('lvStartDate').addEventListener('change', previewLvCalc);
    document.getElementById('lvEndDate').addEventListener('change', previewLvCalc);
    lvInitialized = true;
  }

  // 기존 기록 마이그레이션 (유형 규정 변경 감지 → 재계산)
  LEAVE.migrateRecords();

  refreshLvCalendar();
}

// ── 대시보드 렌더링 ──
function renderLvDashboard(year) {
  const container = document.getElementById('lvDashboard');
  if (!container) return;

  const records = LEAVE.getYearRecords(year);
  const usage = {};
  records.forEach(r => {
    if (!usage[r.type]) usage[r.type] = 0;
    usage[r.type] += (r.days || 0);
  });

  // 시간차 시간 합산
  let timeLeaveHours = 0;
  records.forEach(r => { if (r.type === 'time_leave') timeLeaveHours += (r.hours || 0); });

  const annualUsed = (usage['annual'] || 0) + (usage['time_leave'] || 0);
  const eduTraining = usage['edu_training'] || 0;
  const eduMandatory = usage['edu_mandatory'] || 0;
  const checkup = usage['checkup'] || 0;
  const blood = usage['blood_donation'] || 0;

  const items = [
    { label: '연차', used: annualUsed, total: lvTotalAnnual || '?', key: true },
    { label: '시간차', used: timeLeaveHours, total: null, suffix: 'h', show: timeLeaveHours > 0 },
    { label: '교육연수', used: eduTraining, total: 3 },
    { label: '필수교육', used: eduMandatory, total: 3 },
    { label: '검진휴가', used: checkup, total: 1 },
    { label: '헌혈휴가', used: blood, total: 1 },
  ];

  let html = '';
  items.forEach(item => {
    if (item.show === false) return;
    if (item.suffix) {
      html += `<div class="lv-dash-item">${item.label} <span class="lv-dash-value">${item.used}${item.suffix}</span></div>`;
      return;
    }
    const remain = typeof item.total === 'number' ? item.total - item.used : null;
    let cls = 'lv-dash-value';
    if (remain !== null && remain <= 0) cls += ' over';
    else if (remain !== null && remain <= Math.ceil((typeof item.total === 'number' ? item.total : 0) * 0.2)) cls += ' warning';
    html += `<div class="lv-dash-item">${item.label}(<span class="${cls}">${item.used}/${item.total}</span>)</div>`;
  });

  container.innerHTML = html;
}

// 카테고리별 아이콘 매핑
const LV_CAT_ICONS = {
  legal: '🏖️', health: '🏥', education: '📚',
  family: '👪', ceremony: '🎗️', maternity: '🤱',
  special: '🔷', other: '⬜'
};

// 유형 select 동적 생성 (성별 필터 + optgroup)
function populateLvTypeSelect() {
  const container = document.getElementById('lvTypeSelectContainer');
  if (!container) return;
  container.innerHTML = '';

  const profile = PROFILE.load();
  const gender = profile ? profile.gender : '';
  const groups = LEAVE.getGroupedTypes(gender);

  groups.forEach(group => {
    const groupDiv = document.createElement('div');
    groupDiv.style.marginBottom = '6px';
    
    const titleDiv = document.createElement('div');
    titleDiv.style.fontSize = 'var(--text-label-small)';
    titleDiv.style.fontWeight = '700';
    titleDiv.style.color = 'var(--text-muted)';
    titleDiv.style.padding = '4px 8px';
    titleDiv.textContent = group.label;
    groupDiv.appendChild(titleDiv);

    group.items.forEach(t => {
      const icon = LV_CAT_ICONS[t.category] || '📋';
      const paidTag = t.isPaid ? '' : ' [무급]';
      let label = `${icon} ${t.label}${paidTag}`;
      if (t.isTimeBased) label += ' (시간단위)';
      if (t.quota !== null) label += ` [${t.quota}일]`;

      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.style.justifyContent = 'flex-start';
      btn.style.marginBottom = '4px';
      btn.style.padding = '12px 14px';
      btn.style.background = 'var(--bg-glass)';
      btn.style.border = '1.5px solid var(--border-active)';
      btn.style.borderRadius = 'var(--radius-sm)';
      btn.style.color = 'var(--text-primary)';
      btn.style.fontSize = 'var(--text-body-large)';
      btn.style.fontWeight = '600';
      btn.onclick = () => selectLvType(t.id, label);
      btn.textContent = label;
      
      btn.onmouseover = () => btn.style.background = 'var(--bg-glass-hover)';
      btn.onmouseout = () => btn.style.background = 'var(--bg-glass)';

      groupDiv.appendChild(btn);
    });
    container.appendChild(groupDiv);
  });
}

function openLvTypeBottomSheet() {
  document.getElementById('lvTypeSelectOverlay').classList.add('show');
  document.getElementById('lvTypeSelectSheet').classList.add('show');
}

function closeLvTypeBottomSheet() {
  document.getElementById('lvTypeSelectOverlay').classList.remove('show');
  document.getElementById('lvTypeSelectSheet').classList.remove('show');
}

function selectLvType(id, label) {
  const lvTypeInput = document.getElementById('lvType');
  const btnText = document.getElementById('lvTypeBtnText');
  if (lvTypeInput && btnText) {
    lvTypeInput.value = id;
    btnText.textContent = label;
    onLvTypeChange();
  }
  closeLvTypeBottomSheet();
}

function updateLvTypeBtnText(id) {
  const typeInfo = LEAVE.getTypeById(id);
  if (!typeInfo) return;
  const icon = LV_CAT_ICONS[typeInfo.category] || '📋';
  const paidTag = typeInfo.isPaid ? '' : ' [무급]';
  let label = `${icon} ${typeInfo.label}${paidTag}`;
  if (typeInfo.isTimeBased) label += ' (시간단위)';
  if (typeInfo.quota !== null) label += ` [${typeInfo.quota}일]`;
  const btnText = document.getElementById('lvTypeBtnText');
  if (btnText) btnText.textContent = label;
}

async function refreshLvCalendar() {
  const year = lvCurrentYear;
  const month = lvCurrentMonth;

  // 1. 빠른 렌더링을 위해 캐시된 기록만 먼저 표시
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
  resetLvPanel();

  // 2. 공휴일 데이터 백그라운드 로드
  let workInfo;
  try { workInfo = await HOLIDAYS.calcWorkDays(year, month); }
  catch { workInfo = { holidays: [], anniversaries: [] }; }

  lvHolidayMap = {};
  (workInfo.holidays || []).forEach(h => { lvHolidayMap[h.day] = h.name; });

  // 3. 공휴일 데이터가 준비되면 다시 렌더링
  renderLvCalendar(year, month, recordsByDay);
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
  let html = '<div class="ot-cal"><div class="ot-cal-header" style="background:rgba(16,185,129,0.08); color:var(--accent-emerald)">'
    + '<button class="cal-nav-btn" onclick="lvNavMonth(-1)">◀</button>'
    + '<span class="cal-nav-title" onclick="lvGoToday()">' + year + '년 ' + month + '월</span>'
    + '<button class="cal-nav-btn" onclick="lvNavMonth(1)">▶</button>'
    + '</div>';
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

    // 휴가 유형 텍스트 표시 (점 대신 유형명)
    let dotsHtml = '<div style="display:flex; flex-direction:column; gap:1px; margin-top:1px;">';
    const uniqueTypes = [...new Set(dayRecords.map(r => r.type))];
    uniqueTypes.forEach(t => {
      const typeInfo = LEAVE.getTypeById(t);
      const label = typeInfo ? typeInfo.label : t;
      // 3글자까지만 표시 (모바일 공간 절약)
      const shortLabel = label.length > 3 ? label.substring(0, 3) : label;
      const catColors = {
        legal: 'rgba(16,185,129,0.15)',
        health: 'rgba(244,63,94,0.12)',
        education: 'rgba(139,92,246,0.12)',
        family: 'rgba(99,102,241,0.12)',
        ceremony: 'rgba(245,158,11,0.12)',
        maternity: 'rgba(6,182,212,0.12)',
        special: 'rgba(99,102,241,0.12)',
      };
      const bg = catColors[typeInfo?.category] || 'rgba(99,102,241,0.1)';
      dotsHtml += `<span class="cal-badge" style="background:${bg}; color:#1a1a1a;">${shortLabel}</span>`;
    });
    dotsHtml += '</div>';

    html += `<div class="${cls}" data-day="${d}" onclick="onLvDateClick(${year},${month},${d})">${d}${dotsHtml}</div>`;
  }

  html += '</div>';
  html += `<div class="ot-cal-legend">
    <span><span class="cal-badge" style="background:rgba(16,185,129,0.15); color:#1a1a1a; padding:2px 6px;">법정</span></span>
    <span><span class="cal-badge" style="background:rgba(244,63,94,0.12); color:#1a1a1a; padding:2px 6px;">건강</span></span>
    <span><span class="cal-badge" style="background:rgba(245,158,11,0.12); color:#1a1a1a; padding:2px 6px;">청원</span></span>
    <span><span class="cal-badge" style="background:rgba(139,92,246,0.12); color:#1a1a1a; padding:2px 6px;">교육</span></span>
    <span><span class="cal-badge" style="background:rgba(6,182,212,0.12); color:#1a1a1a; padding:2px 6px;">출산</span></span>
  </div>`;
  html += '</div>';
  container.innerHTML = html;
}

function onLvDateClick(year, month, day) {
  lvSelectedDate = { year, month, day };
  document.querySelectorAll('#lvCalendar .ot-cal-day').forEach(el => el.classList.remove('selected'));
  const targetCell = document.querySelector(`#lvCalendar .ot-cal-day[data-day="${day}"]`);
  if (targetCell) targetCell.classList.add('selected');

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dow = new Date(year, month - 1, day).getDay();
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];

  let dateLabel = `${month}월 ${day}일 (${dowNames[dow]})`;
  if (lvHolidayMap[day]) dateLabel += ` 🔴 ${lvHolidayMap[day]}`;

  document.getElementById('lvPanelDate').textContent = dateLabel;
  document.getElementById('lvStartDate').value = dateStr;
  document.getElementById('lvEndDate').value = dateStr;
  document.getElementById('lvEditId').value = '';
  document.getElementById('lvDeleteBtn').style.display = 'none';
  document.getElementById('lvSaveBtn').textContent = '💾 저장';
  document.getElementById('lvMemo').value = '';
  document.getElementById('lvType').value = 'annual';
  updateLvTypeBtnText('annual');

  onLvTypeChange();
  previewLvCalc();

  // 기존 기록 표시
  const existingContainer = document.getElementById('lvExistingRecords');
  existingContainer.innerHTML = '';
  const existing = LEAVE.getDateRecords(dateStr);
  if (existing.length > 0) {
    let extra = '<div style="margin-top:8px; padding:8px; background:rgba(16,185,129,0.06); border-radius:6px; font-size:var(--text-body-large);">';
    extra += `<strong style="color:var(--accent-emerald)">📋 기존 기록 (${existing.length}건)</strong>`;
    existing.forEach(r => {
      const typeInfo = LEAVE.getTypeById(r.type);
      const timeInfo = r.type === 'time_leave' && r.hours ? ` (${r.hours}h)` : '';
      extra += `<div style="margin-top:4px; padding:4px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;"
        onmouseover="this.style.background='rgba(99,102,241,0.1)'"
        onmouseout="this.style.background='transparent'">
        <div>
          <span class="lv-record-type ${r.isPaid ? 'paid' : 'unpaid'}" style="font-size:var(--text-body-normal)">${typeInfo ? typeInfo.label : r.type}</span>
          ${r.startDate === r.endDate ? '' : r.startDate + '~' + r.endDate}
          ${(r.days || 0).toFixed(1)}일${timeInfo}
          ${r.salaryImpact ? '<strong style="color:var(--accent-rose)">-₩' + Math.abs(r.salaryImpact).toLocaleString() + '</strong>' : ''}
        </div>
        <div style="display:flex; gap:4px; flex-shrink:0;">
          <button onclick="editLvRecord('${r.id}')" style="background:var(--accent-indigo); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;">EDIT</button>
          <button onclick="deleteLvRecord('${r.id}')" style="background:var(--accent-rose); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;">DELETE</button>
        </div>
      </div>`;
    });
    extra += '</div>';
    existingContainer.innerHTML = extra;
  }

  // 바텀시트 열기
  openLvBottomSheet();
}

// ── 휴가 바텀시트 컨트롤 ──
function openLvBottomSheet() {
  const overlay = document.getElementById('lvInputOverlay');
  const sheet = document.getElementById('lvInputSheet');
  if (overlay && sheet) {
    overlay.classList.add('show');
    sheet.classList.add('show');
  }
}

function closeLvBottomSheet() {
  const overlay = document.getElementById('lvInputOverlay');
  const sheet = document.getElementById('lvInputSheet');
  if (overlay && sheet) {
    overlay.classList.remove('show');
    sheet.classList.remove('show');
  }
}

function resetLvPanel() {
  lvSelectedDate = null;
  document.querySelectorAll('#lvCalendar .ot-cal-day').forEach(el => el.classList.remove('selected'));
  document.getElementById('lvPanelDate').textContent = '날짜를 선택하세요';
  document.getElementById('lvEditId').value = '';
  document.getElementById('lvDeleteBtn').style.display = 'none';
  document.getElementById('lvSaveBtn').textContent = '💾 저장';
  document.getElementById('lvMemo').value = '';
  document.getElementById('lvExistingRecords').innerHTML = '';
  document.getElementById('lvPreview').innerHTML = '';

  // 오늘 날짜 기본 설정
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  document.getElementById('lvStartDate').value = todayStr;
  document.getElementById('lvEndDate').value = todayStr;
  document.getElementById('lvType').value = 'annual';
  updateLvTypeBtnText('annual');
  onLvTypeChange();

  // 바텀시트 닫기
  closeLvBottomSheet();
}

// 하위 호환
function closeLvPanel() { resetLvPanel(); }

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

  // 한도 현황 뱃지
  const quotaBadge = document.getElementById('lvQuotaBadge');
  const year = lvCurrentYear;
  if (typeInfo && typeInfo.quota !== null && !typeInfo.usesAnnual) {
    const records = LEAVE.getYearRecords(year);
    const usedRaw = records.filter(r => r.type === type).reduce((sum, r) => sum + (r.days || 0), 0);
    const used = Math.round(usedRaw * 10) / 10;
    const remain = Math.round((typeInfo.quota - usedRaw) * 10) / 10;
    const color = remain <= 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)';
    const refNote = typeInfo.ref ? `<br><span style="color:var(--text-muted); font-size:var(--text-body-normal);">📖 ${typeInfo.ref}</span>` : '';
    quotaBadge.innerHTML = `<div style="padding:6px 10px; border-radius:6px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); font-size:var(--text-body-normal);">
      📊 <strong>${typeInfo.label}</strong> 한도: ${typeInfo.quota}일 | 사용: ${used}일 | <span style="color:${color}; font-weight:700;">잔여: ${remain}일</span>
      ${remain <= 0 ? '<br><span style="color:var(--accent-rose)">⚠️ 한도 초과!</span>' : ''}${refNote}
    </div>`;
    quotaBadge.style.display = 'block';
  } else if (typeInfo && typeInfo.usesAnnual) {
    if (lvTotalAnnual > 0) {
      const summary = LEAVE.calcAnnualSummary(year, lvTotalAnnual);
      quotaBadge.innerHTML = `<div style="padding:6px 10px; border-radius:6px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); font-size:var(--text-body-normal);">
        📅 연차 한도: ${lvTotalAnnual}일 | 사용: ${summary.usedAnnual}일 | <span style="color:var(--accent-emerald); font-weight:700;">잔여: ${summary.remainingAnnual}일</span>
      </div>`;
    } else {
      quotaBadge.innerHTML = `<div style="padding:6px 10px; border-radius:6px; background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.2); font-size:var(--text-body-normal); color:var(--text-primary); font-weight:600;">
        ⚠️ 프로필에서 입사일을 설정하면 연차 한도가 자동 계산됩니다.
      </div>`;
    }
    quotaBadge.style.display = 'block';
  } else {
    quotaBadge.style.display = 'none';
  }

  // 시간차 선택 시 시간 입력 표시 및 날짜 필드 숨김
  const timeArea = document.getElementById('lvTimeInputArea');
  const dateArea = document.getElementById('lvDateFields');
  if (typeInfo && typeInfo.isTimeBased) {
    timeArea.style.display = 'block';
    if (dateArea) dateArea.style.display = 'none';
    calcLvTimeHours();
  } else {
    timeArea.style.display = 'none';
    if (dateArea) dateArea.style.display = '';
    document.getElementById('lvTimeCalcResult').textContent = '';
  }

  previewLvCalc();
}

// 시간차 시간 계산
function calcLvTimeHours() {
  const startTime = document.getElementById('lvStartTime').value;
  const endTime = document.getElementById('lvEndTime').value;
  if (!startTime || !endTime) return;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let hours = (eh + em / 60) - (sh + sm / 60);
  if (hours < 0) hours += 24;
  // 점심시간 1시간 제외 (4시간 이상일 때)
  if (hours >= 4) hours -= 1;
  hours = Math.max(0, hours);

  const days = Math.round(hours / 8 * 10) / 10;
  const resultEl = document.getElementById('lvTimeCalcResult');
  resultEl.innerHTML = `${hours.toFixed(1)}시간 = <strong>${days.toFixed(1)}일</strong> 차감 (8시간 = 1일)`;

  previewLvCalc();
}

// 시간차 타입일 때 시간/일수 반환
function getLvTimeInfo() {
  const type = document.getElementById('lvType').value;
  const typeInfo = LEAVE.getTypeById(type);
  if (!typeInfo || !typeInfo.isTimeBased) return null;

  const startTime = document.getElementById('lvStartTime').value;
  const endTime = document.getElementById('lvEndTime').value;
  if (!startTime || !endTime) return null;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let hours = (eh + em / 60) - (sh + sm / 60);
  if (hours < 0) hours += 24;
  if (hours >= 4) hours -= 1;
  hours = Math.max(0, hours);
  const days = Math.round(hours / 8 * 10) / 10;

  return { hours: Math.round(hours * 10) / 10, days, startTime, endTime };
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
  const timeInfo = getLvTimeInfo();
  if (timeInfo !== null) {
    days = timeInfo.days;
  } else if (typeInfo.ceremonyDays) {
    days = typeInfo.ceremonyDays;
  } else {
    days = LEAVE._calcBusinessDays(startStr, endStr, { calendarDays: type === 'sick' });
  }

  // 소수점 1자리로 반올림
  const daysRound = Math.round(days * 10) / 10;
  let html = `<div class="preview-row"><span>일수</span><span class="val">${daysRound}일</span></div>`;

  if (typeInfo.usesAnnual) {
    if (lvTotalAnnual > 0) {
      const summary = LEAVE.calcAnnualSummary(parseInt(startStr.split('-')[0]), lvTotalAnnual);
      const remain = summary.remainingAnnual;
      const newRemain = Math.round((remain - daysRound) * 10) / 10;
      html += `<div class="preview-row"><span>연차 차감</span><span class="val" style="color:var(--accent-amber)">-${daysRound}일</span></div>`;
      html += `<div class="preview-row"><span>잔여 연차</span><span class="val">${remain}일 → ${newRemain}일</span></div>`;
    } else {
      html += `<div class="preview-row"><span>연차 차감</span><span class="val" style="color:var(--accent-amber)">-${daysRound}일</span></div>`;
      html += `<div class="preview-row"><span>잔여 연차</span><span class="val" style="color:var(--text-muted)">프로필 입사일 설정 필요</span></div>`;
    }
  }

  // 급여 공제 미리보기
  if (typeInfo.deductType === 'basePay' || typeInfo.deductType === 'ordinary') {
    const profile = PROFILE.load();
    const wage = profile ? PROFILE.calcWage(profile) : null;
    let deduction = 0;
    let basisLabel = '';
    let dailyAmount = 0;

    if (typeInfo.deductType === 'basePay') {
      // 생리휴가: 기본급 월액 / 30 × 일수
      const monthlyBasePay = wage && wage.breakdown ? (wage.breakdown['기준기본급'] || 0) : 0;
      dailyAmount = Math.round(monthlyBasePay / 30);
      deduction = dailyAmount * days;
      basisLabel = `기본급 일액 ${CALC.formatCurrency(dailyAmount)} (보수규정 제7조)`;
    } else {
      // 무급: 통상임금 월액 / 30 × 일수
      const monthlyWage = wage ? wage.monthlyWage : 0;
      dailyAmount = Math.round(monthlyWage / 30);
      deduction = dailyAmount * days;
      basisLabel = `통상임금 일액 ${CALC.formatCurrency(dailyAmount)} (보수규정 제7조②)`;
    }

    if (deduction > 0) {
      html += `<div class="preview-row"><span>급여 차감</span><span class="val" style="color:var(--accent-rose)">-₩${Math.round(deduction).toLocaleString()}</span></div>`;
      html += `<div class="preview-row"><span>공제기준</span><span class="val" style="font-size:var(--text-label-small); color:var(--text-muted)">${basisLabel}</span></div>`;
    } else {
      html += `<div class="preview-row"><span>급여 차감</span><span class="val" style="color:var(--accent-amber)">⚠️ 프로필 저장 후 자동 계산</span></div>`;
    }
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
  const monthlyBasePay = wage && wage.breakdown ? (wage.breakdown['기준기본급'] || 0) : 0;

  let days;
  let hours = null;
  let startTimeVal = null;
  let endTimeVal = null;
  const timeInfo = getLvTimeInfo();
  if (timeInfo !== null) {
    days = timeInfo.days;
    hours = timeInfo.hours;
    startTimeVal = timeInfo.startTime;
    endTimeVal = timeInfo.endTime;
  } else if (typeInfo && typeInfo.ceremonyDays) {
    days = typeInfo.ceremonyDays;
  } else {
    days = LEAVE._calcBusinessDays(startDate, endDate, { calendarDays: type === 'sick' });
  }

  const record = { type, startDate, endDate, days, memo, hourlyRate, monthlyBasePay };
  if (hours !== null) {
    record.hours = hours;
    record.startTime = startTimeVal;
    record.endTime = endTimeVal;
  }

  if (editId) {
    LEAVE.updateRecord(editId, record);
  } else {
    LEAVE.addRecord(record);
  }

  refreshLvCalendar();
  closeLvBottomSheet();
}

function editLvRecord(id) {
  const all = LEAVE._loadAll();
  let record = null;
  for (const records of Object.values(all)) {
    record = records.find(r => r.id === id);
    if (record) break;
  }
  if (!record) return;

  document.getElementById('lvType').value = record.type;
  updateLvTypeBtnText(record.type);
  document.getElementById('lvStartDate').value = record.startDate;
  document.getElementById('lvEndDate').value = record.endDate;
  document.getElementById('lvMemo').value = record.memo || '';
  document.getElementById('lvEditId').value = id;
  document.getElementById('lvDeleteBtn').style.display = 'block';
  document.getElementById('lvSaveBtn').textContent = '✏️ 수정';

  // 시간차 편집 시 시간 복원
  if (record.type === 'time_leave' && record.startTime && record.endTime) {
    document.getElementById('lvStartTime').value = record.startTime;
    document.getElementById('lvEndTime').value = record.endTime;
  }

  const [y, m, d] = record.startDate.split('-').map(Number);
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dow = new Date(y, m - 1, d).getDay();
  document.getElementById('lvPanelDate').textContent = `${m}월 ${d}일 (${dowNames[dow]}) — 수정`;

  onLvTypeChange();
  previewLvCalc();

  // 바텀시트 열기
  openLvBottomSheet();
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
  const el = document.getElementById('lvRecordCount');
  if (el) el.textContent = summary.recordCount + '건';
}

function renderLvQuotaTable(year) {
  const container = document.getElementById('lvQuotaTable');
  if (!container) return;

  const quotas = LEAVE.calcQuotaSummary(year, lvTotalAnnual);
  if (quotas.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:12px;">프로필 저장 후 확인 가능</p>';
    return;
  }

  // 컴팩트 2열 그리드 (미니 프로그레스 바 포함)
  let html = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">';
  quotas.forEach(q => {
    let pct = 0;
    let remainText = '-';
    let quotaText = '-';
    
    if (q.quota !== null) {
        pct = q.quota > 0 ? Math.min(100, Math.round((q.used / q.quota) * 100)) : 0;
        remainText = `${q.remaining}일`;
        quotaText = `${q.quota}일`;
    } else {
        pct = 100; // 한도 없는 경우 막대를 꽉 채우거나 마음대로
        remainText = `제한없음`;
    }

    const barColor = q.overQuota ? 'var(--accent-rose)' : 'var(--accent-emerald)';
    const remainColor = q.overQuota ? 'var(--accent-rose)' : (q.quota !== null ? 'var(--accent-emerald)' : 'var(--text-muted)');
    
    html += `<div style="padding:8px 10px; border-radius:8px; background:var(--bg-glass); border:1px solid var(--border-glass);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-weight:600; font-size:var(--text-body-large);">${q.label}</span>
        <span style="font-size:var(--text-body-normal); font-weight:700; color:${remainColor};">${remainText}</span>
      </div>
      <div class="lv-progress-bar" style="height:4px; margin-bottom:3px; display:${q.quota !== null ? 'block' : 'none'};">
        <div class="lv-progress-fill" style="width:${pct}%; background:${barColor}"></div>
      </div>
      <div style="font-size:var(--text-body-normal); color:var(--text-muted);">${q.used}${q.quota !== null ? '/' + quotaText : '일'} 사용 ${q.overQuota ? '⚠️' : ''}</div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderLvRecordList(year) {
  const container = document.getElementById('lvRecordList');
  if (!container) return;

  // 연도 표시 업데이트
  const yearEl = document.getElementById('lvRecordYear');
  if (yearEl) yearEl.textContent = year;

  const records = LEAVE.getYearRecords(year);
  if (records.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:24px;">캘린더에서 날짜를 클릭하여 휴가를 등록하세요.</p>';
    return;
  }

  const sorted = [...records].sort((a, b) => a.startDate.localeCompare(b.startDate));

  // ── 통계 계산 ──
  let totalDays = 0, paidDays = 0, unpaidDays = 0, totalDeduction = 0;
  const byCategory = {};
  const byMonth = {};

  sorted.forEach(r => {
    const days = r.days || 0;
    totalDays += days;
    if (r.isPaid) paidDays += days; else unpaidDays += days;
    if (r.salaryImpact) totalDeduction += Math.abs(r.salaryImpact);

    const typeInfo = LEAVE.getTypeById(r.type);
    const cat = typeInfo ? typeInfo.label : r.type;
    byCategory[cat] = (byCategory[cat] || 0) + days;

    const m = parseInt(r.startDate.split('-')[1]);
    byMonth[m] = (byMonth[m] || 0) + days;
  });

  let html = '';

  // ── 요약 카드 ──
  const round1 = v => (Math.round(v * 10) / 10).toFixed(1);
  html += `<div class="lv-stats-grid">
    <div class="lv-stat-card">
      <div class="lv-stat-num">${round1(totalDays)}</div>
      <div class="lv-stat-label">총 사용일</div>
    </div>
    <div class="lv-stat-card">
      <div class="lv-stat-num" style="color:var(--accent-emerald)">${round1(paidDays)}</div>
      <div class="lv-stat-label">유급</div>
    </div>
    <div class="lv-stat-card">
      <div class="lv-stat-num" style="color:var(--accent-rose)">${round1(unpaidDays)}</div>
      <div class="lv-stat-label">무급</div>
    </div>
    <div class="lv-stat-card">
      <div class="lv-stat-num" style="color:var(--accent-rose)">${totalDeduction > 0 ? '-₩' + totalDeduction.toLocaleString() : '₩0'}</div>
      <div class="lv-stat-label">급여 차감</div>
    </div>
  </div>`;

  // ── 월별 히트맵 바 ──
  const maxMonthDays = Math.max(...Object.values(byMonth), 1);
  html += '<div style="margin:12px 0 8px; font-size:var(--text-body-normal); font-weight:600; color:var(--text-muted);">월별 사용</div>';
  html += '<div class="lv-month-bars">';
  for (let m = 1; m <= 12; m++) {
    const d = byMonth[m] || 0;
    const pct = Math.round((d / maxMonthDays) * 100);
    const isCurrentMonth = (m === lvCurrentMonth && year === lvCurrentYear);
    html += `<div class="lv-month-bar${isCurrentMonth ? ' current' : ''}">
      <div class="lv-month-bar-fill" style="height:${Math.max(pct, d > 0 ? 8 : 0)}%"></div>
      <span class="lv-month-bar-label">${m}월</span>
      ${d > 0 ? `<span class="lv-month-bar-val">${round1(d)}</span>` : ''}
    </div>`;
  }
  html += '</div>';

  // ── 유형별 분포 ──
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (catEntries.length > 0) {
    html += '<div style="margin:12px 0 6px; font-size:var(--text-body-normal); font-weight:600; color:var(--text-muted);">유형별 분포</div>';
    html += '<div style="display:flex; flex-wrap:wrap; gap:4px;">';
    const colors = ['var(--accent-indigo)', 'var(--accent-emerald)', 'var(--accent-amber)', 'var(--accent-rose)', 'var(--accent-cyan)', 'var(--accent-violet)'];
    catEntries.forEach(([cat, days], i) => {
      html += `<span style="display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:12px; font-size:var(--text-body-normal); background:rgba(99,102,241,0.08); border:1px solid var(--border-glass);">
        <i style="width:6px;height:6px;border-radius:50%;background:${colors[i % colors.length]};display:inline-block;"></i>
        ${cat} <strong>${days}일</strong>
      </span>`;
    });
    html += '</div>';
  }

  // ── 상세 기록 (최근순, 접이식) ──
  html += `<div style="margin-top:12px;">
    <div class="collapsible-header" onclick="toggleCollapsible('lvRecordDetail')">
      <span style="display:flex; align-items:center; gap:8px;"><span class="toggle-icon">▸</span> 상세 기록 (${sorted.length}건)</span>
    </div>
    <div class="collapsible-body" id="lvRecordDetail" style="display:none; max-height:300px; overflow-y:auto;">`;

  sorted.forEach(r => {
    const typeInfo = LEAVE.getTypeById(r.type);
    const dateDisplay = r.startDate === r.endDate
      ? r.startDate.substring(5)
      : r.startDate.substring(5) + ' ~ ' + r.endDate.substring(5);
    let timeDisplay = '';
    if (r.type === 'time_leave' && r.hours) {
      timeDisplay = ` ${r.startTime || ''}~${r.endTime || ''} (${(r.hours || 0).toFixed(1)}h)`;
    } else {
      timeDisplay = ` ${(r.days || 0).toFixed(1)}일`;
    }
    html += `<div class="lv-record-item" onclick="editLvRecord('${r.id}')">
      <span class="lv-record-type ${r.isPaid ? 'paid' : 'unpaid'}">${typeInfo ? typeInfo.label : r.type}</span>
      <div style="flex:1; font-size:var(--text-body-normal); color:var(--text-secondary)">
        ${dateDisplay}${timeDisplay}
        ${r.memo ? ' <span style="color:var(--text-muted)">' + r.memo + '</span>' : ''}
      </div>
      <div style="font-size:var(--text-body-normal); font-weight:700; color:${r.salaryImpact ? 'var(--accent-rose)' : 'var(--accent-emerald)'}">
        ${r.salaryImpact ? '-₩' + Math.abs(r.salaryImpact).toLocaleString() : '유급'}
      </div>
    </div>`;
  });
  html += '</div></div>';

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
  const _msg = document.getElementById('lvExportMsg'); if (_msg) _msg.textContent = '✅ 내보내기 완료';
}

function importLvData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = LEAVE.importData(e.target.result);
    const _msg = document.getElementById('lvExportMsg'); if (_msg) _msg.textContent = result.message;
    if (result.success) refreshLvCalendar();
  };
  reader.readAsText(file);
  event.target.value = '';
}
