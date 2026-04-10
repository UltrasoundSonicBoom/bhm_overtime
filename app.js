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
  numFamily: 'pfFamily',
  numChildren: 'pfChildren',
  childrenUnder6Pay: 'pfChildrenUnder6Pay',
  specialPay: 'pfSpecial',
  positionPay: 'pfPosition',
  workSupportPay: 'pfWorkSupport',
  weeklyHours: 'pfWeeklyHours',
  promotionDate: 'pfPromotionDate'
};

function getCaptureParams() {
  return new URLSearchParams(window.location.search);
}

// ── 홈 탭 ──
function initHomeTab() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // ── 시간외/온콜 요약 ──
  const otStats = OVERTIME.calcMonthlyStats(year, month);
  const otBody = document.getElementById('homeOtBody');
  const otStatsEl = document.getElementById('homeOtStats');

  if (otStats.recordCount > 0) {
    const lines = [];
    if (otStats.byType.overtime.count > 0) {
      lines.push(`<div class="home-stat-row"><span class="home-stat-label">시간외</span><span class="home-stat-value">${otStats.byType.overtime.hours}시간</span></div>`);
    }
    if (otStats.byType.oncall_standby.count > 0) {
      lines.push(`<div class="home-stat-row"><span class="home-stat-label">온콜 대기</span><span class="home-stat-value">${otStats.byType.oncall_standby.count}일</span></div>`);
    }
    if (otStats.byType.oncall_callout.count > 0) {
      lines.push(`<div class="home-stat-row"><span class="home-stat-label">온콜 출동</span><span class="home-stat-value">${otStats.byType.oncall_callout.count}회</span></div>`);
    }
    if (otStats.totalPay > 0) {
      lines.push(`<div class="home-stat-row"><span class="home-stat-label">예상 수당</span><span class="home-stat-value amber">₩${otStats.totalPay.toLocaleString()}</span></div>`);
    }
    otStatsEl.innerHTML = lines.join('');
    otBody.style.display = '';
  } else {
    otBody.style.display = 'none';
  }

  // ── 휴가 요약 ──
  const profile = PROFILE.load();
  const leaveBody = document.getElementById('homeLeaveBody');
  const leaveStatsEl = document.getElementById('homeLeaveStats');

  let totalAnnual = 0;
  if (profile && profile.hireDate) {
    const parsed = PROFILE.parseDate(profile.hireDate);
    if (parsed) {
      const result = CALC.calcAnnualLeave(new Date(parsed));
      if (result) totalAnnual = result.totalLeave;
    }
  }

  if (totalAnnual > 0) {
    const summary = LEAVE.calcAnnualSummary(year, totalAnnual);
    const pct = summary.usagePercent;
    const otNote = summary.otEarnedDays > 0 ? ` (시간외 ${summary.otEarnedDays}일 회복)` : '';
    leaveStatsEl.innerHTML = `
      <div class="home-stat-row"><span class="home-stat-label">연차</span><span class="home-stat-value emerald">${summary.effectiveUsed} / ${summary.totalAnnual}일${otNote}</span></div>
      <div class="home-progress-wrap"><div class="home-progress-bar" style="width:${pct}%"></div></div>
    `;
    leaveBody.style.display = '';
  } else {
    leaveBody.style.display = 'none';
  }


  // ── 공지사항 (notice.md에서 로드) ──
  loadNotice();

  // ── 업데이트 내역 (CHANGELOG.md에서 로드) ──
  loadChangelog();
}
window.initHomeTab = initHomeTab;

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
  if (tabName === 'overtime') { applyProfileToOvertime(); initOvertimeTab(); }
  if (tabName === 'leave') { applyProfileToLeave(); initLeaveTab(); }
  if (tabName === 'reference') renderWikiToc();
  if (tabName === 'profile') initProfileTab();

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
    if (name === 'pay-payslip') renderPayPayslip();
    if (name === 'pay-calc') { initPayEstimate(); if (typeof PAYROLL !== 'undefined') PAYROLL.init(); }
    if (name === 'pay-qa') { if (typeof PAYROLL !== 'undefined') PAYROLL.init(); }
  });
});

// ── 개인정보 탭 초기화 ──
function initProfileTab() {
  const saved = PROFILE.load();
  if (saved) {
    updateProfileSummary(saved);
    updateProfileTitle(saved.name);
  } else {
    updateProfileTitle('');
  }
}

function updateProfileTitle(name) {
  const titleEl = document.getElementById('pfTitleName');
  if (!titleEl) return;
  if (name && name.trim()) {
    titleEl.textContent = `${name.trim()}님 정보`;
  } else {
    titleEl.textContent = '내 정보';
  }
}

// ── 개인정보 탭으로 전환 ──
function switchToProfileTab() {
  switchTab('profile');
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
    // 기본값 설정 (간호직)
    sel.value = '간호직';
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

  // 입사일 → 근속연수 표시 + 근속가산기본급 자동 감지 (2016.2 이전 입사자) + 호봉 자동 제안
  document.getElementById('pfHireDate').addEventListener('input', (e) => {
    const parsed = PROFILE.parseDate(e.target.value);
    if (parsed) {
      const years = PROFILE.calcServiceYears(parsed);
      document.getElementById('pfServiceDisplay').textContent = `→ ${parsed} (근속 ${years}년)`;
      const hireDate = new Date(parsed);
      const seniorityThreshold = new Date('2016-02-01');
      document.getElementById('pfSeniority').checked = hireDate < seniorityThreshold;
      // 호봉 자동 제안
      _suggestYear(parsed);
    } else if (e.target.value.length > 0) {
      document.getElementById('pfServiceDisplay').textContent = '※ YYYY-MM-DD, YYYYMMDD, YYYY.MM.DD 형식';
    } else {
      document.getElementById('pfServiceDisplay').textContent = '';
      document.getElementById('pfSeniority').checked = false;
      const hint = document.getElementById('pfYearHint');
      if (hint) hint.textContent = '';
    }
  });

  // 직급 변경 시 호봉 재제안
  document.getElementById('pfGrade').addEventListener('change', () => {
    const hireDate = PROFILE.parseDate(document.getElementById('pfHireDate').value);
    if (hireDate) _suggestYear(hireDate);
  });

  // 저장된 프로필 불러오기
  const saved = PROFILE.load();
  if (saved) {
    PROFILE.applyToForm(saved, PROFILE_FIELDS);
    updateFamilyUI(); // 가족/자녀 수 기반 UI 표시
    updateProfileSummary(saved);
    updateProfileTitle(saved.name);
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

  // 초기 기본 탭 (휴가 탭 우선)
  function activateV1DefaultTab() {
    applyProfileToOvertime();
    initOvertimeTab();
    initLeaveTab();

    const params = getCaptureParams();
    const requestedTab = params.get('tab');
    if (!switchTab(requestedTab || 'home')) {
      switchTab('home');
    }
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
  window.syncCloudData = function (cloudData) {
    if (!cloudData) return;

    // ✅ 수정: 클라우드 조회 실패 시 로컬 데이터를 건드리지 않고 경고만 표시
    if (cloudData._fetchFailed) {
      console.warn('[syncCloudData] 클라우드 조회 실패 — 로컬 데이터 보존');
      const toast = document.getElementById('otToast');
      if (toast) {
        toast.textContent = '⚠️ 클라우드 연결 실패 — 로컬 데이터로 계속합니다.';
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 4000);
      }
      return;
    }

    // ── [Guest → 로그인 유저 마이그레이션] ──
    // 로컬 모드(비로그인)에서 입력한 _guest 키 데이터를 로그인 직후 사용자 키로 이전.
    // 클라우드에 이미 데이터가 있으면 클라우드 우선, guest 데이터는 폐기.
    // 어느 쪽이든 로그인 후에는 _guest 키를 삭제해 공용 기기 개인정보 방치를 방지.
    const GUEST_KEYS = {
      profile: 'bhm_hr_profile_guest',
      overtime: 'overtimeRecords_guest',
      leave: 'leaveRecords_guest',
      manual: 'otManualHourly_guest'
    };
    const rawGuestProfile = localStorage.getItem(GUEST_KEYS.profile);
    const rawGuestOt = localStorage.getItem(GUEST_KEYS.overtime);
    const rawGuestLeave = localStorage.getItem(GUEST_KEYS.leave);
    const rawGuestManual = localStorage.getItem(GUEST_KEYS.manual);
    let migrated = false;

    if (rawGuestProfile || rawGuestOt || rawGuestLeave) {
      console.log('[syncCloudData] Guest 데이터 감지 → 마이그레이션 시작');

      // 프로필: 클라우드에 없을 때만 이전
      if (!cloudData.profile && rawGuestProfile) {
        localStorage.setItem(PROFILE.STORAGE_KEY, rawGuestProfile);
        try {
          const pf = JSON.parse(rawGuestProfile);
          pf.id = window.SupabaseUser.id;
          window.SupabaseSync.pushCloudData('profiles', pf);
        } catch (e) { console.warn('[migrate] profile push 실패', e); }
        migrated = true;
      }

      // 시간외: 클라우드 레코드가 없을 때만 이전
      if (!(cloudData.overtime && cloudData.overtime.length > 0) && rawGuestOt) {
        localStorage.setItem(OVERTIME.STORAGE_KEY, rawGuestOt);
        try {
          const otMap = JSON.parse(rawGuestOt);
          Object.values(otMap).flat().forEach(r =>
            window.SupabaseSync.pushCloudData('overtime_records', { ...r })
          );
        } catch (e) { console.warn('[migrate] overtime push 실패', e); }
        migrated = true;
      }

      // 휴가: 클라우드 레코드가 없을 때만 이전
      if (!(cloudData.leave && cloudData.leave.length > 0) && rawGuestLeave) {
        localStorage.setItem(LEAVE.STORAGE_KEY, rawGuestLeave);
        try {
          const lvMap = JSON.parse(rawGuestLeave);
          Object.values(lvMap).flat().forEach(r =>
            window.SupabaseSync.pushCloudData('leave_records', { ...r })
          );
        } catch (e) { console.warn('[migrate] leave push 실패', e); }
        migrated = true;
      }

      // otManualHourly: 사용자 키에 값 없을 때만 이전
      if (rawGuestManual) {
        const userManualKey = window.getUserStorageKey('otManualHourly');
        if (!localStorage.getItem(userManualKey)) {
          localStorage.setItem(userManualKey, rawGuestManual);
        }
      }

      // _guest 키 전부 삭제 — 공용 기기에서 타인이 볼 수 없도록
      Object.values(GUEST_KEYS).forEach(k => localStorage.removeItem(k));
      console.log('[syncCloudData] Guest 마이그레이션 완료, guest 키 삭제됨');
    }

    // ── [클라우드 → 로컬 동기화] ──
    let changed = migrated; // 마이그레이션만 있어도 UI 갱신 필요
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
        updateProfileTitle(profile.name);
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
        toast.textContent = migrated
          ? "로컬 데이터를 클라우드에 저장했습니다. ✅"
          : "클라우드 데이터와 동기화되었습니다. ✅";
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

  const prevValue = gradeSelect.value;
  gradeSelect.innerHTML = '';

  table.grades.forEach(g => {
    const label = table.gradeLabels?.[g] || g;
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = `${label} (${g})`;
    gradeSelect.appendChild(opt);
  });

  // 이전 선택값이 새 목록에 있으면 유지, 없으면 기본값 선택
  if (table.grades.includes(prevValue)) {
    gradeSelect.value = prevValue;
  } else {
    gradeSelect.value = table.grades[table.grades.length - 1];
  }

  // 호봉 자동 제안 갱신
  const hireDateStr = document.getElementById('pfHireDate')?.value;
  if (hireDateStr) _suggestYear(hireDateStr);
}
// 자녀 수가 1 이상일 때 6세이하 자녀수당 행 표시
function toggleChildFields() { updateFamilyUI(); }
function toggleUnder6Field() { updateFamilyUI(); }

function updateFamilyUI() {
  const numFamily = parseInt(document.getElementById('pfFamily')?.value) || 0;
  const numChildren = parseInt(document.getElementById('pfChildren')?.value) || 0;
  const under6Pay = parseInt(document.getElementById('pfChildrenUnder6Pay')?.value) || 0;

  // 순차 표시: 가족수 > 0 → 자녀수 / 자녀수 > 0 → 6세이하
  const childrenRow = document.getElementById('pfChildrenRow');
  const childExtraRow = document.getElementById('childExtraRow');
  if (childrenRow) childrenRow.style.display = numFamily >= 1 ? 'grid' : 'none';
  if (childExtraRow) childExtraRow.style.display = numChildren >= 1 ? 'grid' : 'none';

  // 가족 0이면 하위 리셋
  if (numFamily === 0) {
    const el = document.getElementById('pfChildren');
    if (el && parseInt(el.value) > 0) el.value = 0;
  }
  if (numChildren === 0) {
    const el = document.getElementById('pfChildrenUnder6Pay');
    if (el && parseInt(el.value) > 0) el.value = 0;
  }

  // 총액 요약
  const summaryEl = document.getElementById('pfFamilySummary');
  if (!summaryEl) return;

  const result = CALC.calcFamilyAllowance(numFamily, numChildren);
  const total = result.월수당 + under6Pay;

  if (total === 0) { summaryEl.style.display = 'none'; return; }

  summaryEl.style.display = 'block';
  summaryEl.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;">
    <span style="color:var(--text-muted);">가족수당 합계</span>
    <span style="font-weight:700; color:var(--accent-indigo);">월 ${total.toLocaleString()}원</span>
  </div>`;
}

function saveProfile() {
  // 승진일 입력 시 자동 직급/호봉 반영
  const promoDateStr = document.getElementById('pfPromotionDate')?.value;
  const promoParsed = PROFILE.parseDate(promoDateStr);
  if (promoParsed) {
    const jobType = document.getElementById('pfJobType')?.value;
    const currentGrade = document.getElementById('pfGrade')?.value;
    const payTableName = CALC.resolvePayTable(jobType);
    const table = DATA.payTables[payTableName];
    if (table && currentGrade && table.autoPromotion[currentGrade]) {
      const promo = table.autoPromotion[currentGrade];
      const promoDate = new Date(promoParsed);
      const yearsAfterPromo = Math.floor((new Date() - promoDate) / (1000 * 60 * 60 * 24 * 365.25));
      const newYear = Math.min(8, Math.max(1, yearsAfterPromo + 1));
      document.getElementById('pfGrade').value = promo.next;
      document.getElementById('pfYear').value = String(newYear);
      const hint = document.getElementById('pfPromotionHint');
      const curLabel = table.gradeLabels?.[currentGrade] || currentGrade;
      const nextLabel = table.gradeLabels?.[promo.next] || promo.next;
      if (hint) hint.textContent = `✅ ${curLabel} → ${nextLabel} ${newYear}년차 적용됨`;
    }
  }

  const data = PROFILE.collectFromForm(PROFILE_FIELDS);
  const profile = PROFILE.save(data);
  updateProfileSummary(profile);
  updateProfileTitle(profile.name);
  document.getElementById('profileStatus').textContent = '저장됨 ✓';
  document.getElementById('profileStatus').className = 'badge emerald';
  // 저장 후 입력 폼 접기
  const pfInput = document.getElementById('pfInputFields');
  if (pfInput) pfInput.style.display = 'none';
  const label = document.getElementById('pfInputToggleLabel');
  if (label) label.textContent = '▸ 내 정보 입력/수정';
  // Q&A 카드 갱신
  if (typeof PAYROLL !== 'undefined') PAYROLL.init();
  // 휴가 연차 한도 갱신 및 UI 리렌더링
  if (typeof applyProfileToLeave === 'function') {
    applyProfileToLeave();
    if (typeof populateLvTypeSelect === 'function') populateLvTypeSelect();
    if (typeof refreshLvCalendar === 'function' && typeof lvInitialized !== 'undefined' && lvInitialized) refreshLvCalendar();
  }
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
  // 초기화 후 타이틀 초기화
  updateProfileTitle('');
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

// ═══════════ 호봉 자동 제안 ═══════════
/**
 * 입사일 + 현재 직급 기준으로 호봉을 자동 제안하여 pfYear 셀렉트에 반영
 * 자동 승진 체인(autoPromotion)에 있는 등급만 계산 가능하며,
 * S1 이상 등급은 개인차가 있으므로 제안하지 않음.
 * @param {string} hireDateStr - 'YYYY-MM-DD' 형식
 */
function _suggestYear(hireDateStr) {
  const hint = document.getElementById('pfYearHint');
  if (!hint) return;

  const jobType = document.getElementById('pfJobType')?.value;
  const grade = document.getElementById('pfGrade')?.value;
  if (!jobType || !grade || !hireDateStr) { hint.textContent = ''; return; }

  const payTableName = CALC.resolvePayTable(jobType);
  const table = DATA.payTables[payTableName];
  if (!table) { hint.textContent = ''; return; }

  // 자동 승진 체인에서 시작 등급 찾기
  // 조건: 승진 체인의 출발점 = canPromoteFrom에 있고 다른 등급의 next 목표가 아닌 것
  const canPromoteFrom = new Set(Object.keys(table.autoPromotion || {}));
  const promotedTo = new Set(Object.values(table.autoPromotion || {}).map(p => p.next));
  const startGrade = table.grades.find(g => canPromoteFrom.has(g) && !promotedTo.has(g));
  if (!startGrade) { hint.textContent = ''; return; }

  // 시작 등급부터 현재 등급까지 누적 연수 계산
  let cumYears = 0;
  let cur = startGrade;
  while (cur && cur !== grade) {
    const promo = table.autoPromotion[cur];
    if (!promo) { hint.textContent = '⚠️ 승진 이력이 있어 자동 계산 불가 — 직접 입력하세요'; return; }
    cumYears += promo.years;
    cur = promo.next;
  }
  if (cur !== grade) { hint.textContent = ''; return; }

  const totalYears = PROFILE.calcServiceYears(hireDateStr);
  const yearsInGrade = totalYears - cumYears;
  if (yearsInGrade < 0) { hint.textContent = '⚠️ 입사일과 직급이 맞지 않습니다'; return; }

  const suggested = Math.min(8, Math.max(1, Math.floor(yearsInGrade) + 1));
  const sel = document.getElementById('pfYear');
  if (sel) sel.value = String(suggested);
  hint.textContent = `→ 입사일 기준 자동 계산: ${suggested}년차`;
}

// ═══════════ 승진일 적용 ═══════════
function applyPromotionDate() {
  const hint = document.getElementById('pfPromotionHint');
  const promoDateStr = document.getElementById('pfPromotionDate')?.value;
  const parsed = PROFILE.parseDate(promoDateStr);
  if (!parsed) {
    if (hint) hint.textContent = '⚠️ 날짜 형식을 확인하세요 (예: 2024-03-01)';
    return;
  }

  const jobType = document.getElementById('pfJobType')?.value;
  const currentGrade = document.getElementById('pfGrade')?.value;
  if (!jobType || !currentGrade) {
    if (hint) hint.textContent = '⚠️ 직종과 현재 직급을 먼저 입력하세요';
    return;
  }

  const payTableName = CALC.resolvePayTable(jobType);
  const table = DATA.payTables[payTableName];
  if (!table || !table.autoPromotion[currentGrade]) {
    if (hint) hint.textContent = '⚠️ 해당 직급의 승진 정보가 없습니다';
    return;
  }

  const promo = table.autoPromotion[currentGrade];
  const nextGrade = promo.next;
  const nextLabel = table.gradeLabels?.[nextGrade] || nextGrade;
  const currentLabel = table.gradeLabels?.[currentGrade] || currentGrade;

  // 승진일 기준으로 호봉 재계산 (승진 후 1년차부터)
  const promoDate = new Date(parsed);
  const now = new Date();
  const yearsAfterPromo = Math.floor((now - promoDate) / (1000 * 60 * 60 * 24 * 365.25));
  const newYear = Math.min(8, Math.max(1, yearsAfterPromo + 1));

  // 직급과 호봉 업데이트
  document.getElementById('pfGrade').value = nextGrade;
  document.getElementById('pfYear').value = String(newYear);

  if (hint) hint.textContent = `✅ ${currentLabel} → ${nextLabel} ${newYear}년차 적용됨`;
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

  // 이미지 파일 선택 방지 (안드로이드에서 사진을 선택하는 경우)
  if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|heic|heif|svg)$/i.test(file.name)) {
    alert("⚠️ 사진 파일은 백업 파일이 아닙니다.\n\n'snuh_backup_날짜.json' 파일을 선택해주세요.\n(보통 '다운로드' 폴더에 있습니다)");
    event.target.value = '';
    return;
  }

  // PDF/Excel 등 다른 형식 선택 방지
  if (/\.(pdf|xls|xlsx|csv|doc|docx|hwp)$/i.test(file.name)) {
    alert("⚠️ 이 파일은 백업 파일이 아닙니다.\n\n'snuh_backup_날짜.json' 파일을 선택해주세요.");
    event.target.value = '';
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // 백업 파일 구조 검증
    if (!data.version && !data.profile && !data.overtime && !data.leave) {
      throw new Error('invalid_structure');
    }

    // 백업 파일 내 각 필드는 localStorage 저장용 JSON 문자열이어야 함.
    // 수동 편집 등으로 객체로 들어온 경우 다시 직렬화하고,
    // 최종적으로 JSON.parse 검증을 통과해야만 저장 — 무음 손상 방지.
    const toStorable = v => {
      if (!v) return null;
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      JSON.parse(s); // 유효하지 않으면 여기서 throw → catch로 이동
      return s;
    };

    const profileStr = toStorable(data.profile);
    const overtimeStr = toStorable(data.overtime);
    const leaveStr = toStorable(data.leave);

    if (profileStr) localStorage.setItem(PROFILE.STORAGE_KEY, profileStr);
    if (overtimeStr) localStorage.setItem(OVERTIME.STORAGE_KEY, overtimeStr);
    if (leaveStr) localStorage.setItem(LEAVE.STORAGE_KEY, leaveStr);

    alert("데이터가 성공적으로 복원되었습니다! 앱을 새로고침합니다.");
    window.location.reload();
  } catch (e) {
    if (e.message === 'invalid_structure') {
      alert("⚠️ 올바른 백업 파일이 아닙니다.\n\n'snuh_backup_날짜.json' 파일을 선택해주세요.");
    } else {
      alert("복원 실패: 올바른 백업 파일(JSON)이 아닙니다.\n\n사진이나 다른 파일이 아닌, 'snuh_backup_날짜.json' 파일을 선택해주세요.");
    }
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

  const gradeDisplay = `${profile.jobType} ${gradeLabel}(${profile.grade}) ${profile.year}년차${serviceYears > 0 ? ` · 근속 ${serviceYears}년` : ''}`;

  // ── 상단: 핵심 요약 (항상 표시) ──
  let html = `
    <div class="result-row" style="font-weight:600;">
      <span class="key">현재 직급/호봉</span><span class="val" style="color:var(--text-muted); font-size:var(--text-body-normal);">${gradeDisplay}</span>
    </div>
    <div class="result-row" style="font-weight:700;">
      <span class="key">월 통상임금</span><span class="val" style="color:var(--accent-indigo);">${CALC.formatCurrency(wage.monthlyWage)}</span>
    </div>
    <div class="result-row" style="font-weight:700;">
      <span class="key">시급 (÷${profile.weeklyHours || 209}시간)</span><span class="val" style="color:var(--accent-emerald);">${CALC.formatCurrency(wage.hourlyRate)}</span>
    </div>
    ${!profile.adjustPay ? '<div class="warning-box" style="margin-top:8px; border-color:var(--accent-amber);">⚠️ 조정급 미입력 시 근속가산기본급·명절지원비가 과소 계산됩니다. 내 정보에서 조정급을 입력해주세요.</div>' : ''}
    <div class="warning-box" style="margin-top:8px;">💡 이 시급이 시간외·온콜 탭에 자동 반영됩니다.</div>`;

  // ── 하단: 통상임금 내역 (토글, 기본 접힘) ──
  let detailHtml = '';
  Object.entries(wage.breakdown).forEach(([key, val]) => {
    if (val > 0) {
      detailHtml += `<div class="result-row"><span class="key">${key}</span><span class="val">${CALC.formatCurrency(val)}</span></div>`;
    }
  });

  html += `
    <div style="margin-top:10px; border-top:1px solid var(--border-glass); padding-top:8px;">
      <div id="pfWageDetailToggle" style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:6px 0; user-select:none;"
           onclick="var b=document.getElementById('pfWageDetailBody'); var ic=document.getElementById('pfWageDetailIcon'); if(b.style.display==='none'){b.style.display='block';ic.textContent='▼';}else{b.style.display='none';ic.textContent='▸';}">
        <span id="pfWageDetailIcon" style="font-size:0.8rem; color:var(--text-muted);">▸</span>
        <span style="font-size:var(--text-body-normal); font-weight:600; color:var(--text-muted);">통상임금 내역</span>
      </div>
      <div id="pfWageDetailBody" style="display:none;">
        ${detailHtml}
      </div>
    </div>`;

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
    banner.innerHTML = `📌 <strong>${escapeHtml(profile.name) || '내 정보'}</strong> 프로필이 적용됩니다. (${escapeHtml(profile.jobType)} ${escapeHtml(profile.grade)} ${escapeHtml(String(profile.year))}년차)`;
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
      const result = CALC.calcAnnualLeave(new Date(parsed));
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

// 히어로 카드 + 월 선택 슬라이더 렌더링
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

  // 특이사항 태그
  let tagsHtml = '';
  if (flags.tags.length > 0) {
    tagsHtml = flags.tags.map(t => `<span class="pe-tag">${escapeHtml(t)}</span>`).join('');
  }
  if (otStats.totalPay > 0) {
    tagsHtml += `<span class="pe-tag ot">시간외·온콜 ${fmtW(otStats.totalPay)} 반영</span>`;
  }

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

  // ── 지급내역 테이블 (설명 없이 항목+금액만) ──
  let payRows = '';
  for (const [name, amount] of Object.entries(r.지급내역)) {
    if (amount <= 0) continue;
    payRows += `
      <div class="pe-item-row">
        <div class="pe-item-name">${escapeHtml(name)}</div>
        <div class="pe-item-amount">${fmtW(amount)}</div>
      </div>`;
  }

  // ── 공제내역 테이블 ──
  let dedRows = '';
  for (const [name, amount] of Object.entries(r.공제내역)) {
    if (amount <= 0) continue;
    dedRows += `
      <div class="pe-item-row">
        <div class="pe-item-name">${escapeHtml(name)}</div>
        <div class="pe-item-amount ded">${fmtW(amount)}</div>
      </div>`;
  }

  // ── 시간외·온콜 상세 내역 (기록이 있을 때) ──
  let otSummary = '';
  if (otStats.recordCount > 0) {
    const records = OVERTIME.getMonthRecords(payEstYear, payEstMonth);
    const profile = PROFILE.load();
    const hourlyRate = r.시급 || 0;
    const rates = DATA.allowances.overtimeRates;

    // 시간외 기록별 breakdown 합산
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

    // 시간외 근무
    if (otStats.byType.overtime.count > 0) {
      otRows += `<div class="pe-ot-category-title">시간외근무 ${otStats.byType.overtime.count}건</div>`;
    }

    // 연장
    if (totalExt > 0) {
      otRows += `<div class="pe-item-row"><div class="pe-item-name">연장 ${totalExt.toFixed(1)}h × ${fmtW(hourlyRate)} × 150%</div><div class="pe-item-amount">${fmtW(extPay)}</div></div>`;
    }
    // 야간
    if (totalNgt > 0) {
      otRows += `<div class="pe-item-row"><div class="pe-item-name">야간 ${totalNgt.toFixed(1)}h × ${fmtW(hourlyRate)} × 200%</div><div class="pe-item-amount">${fmtW(ngtPay)}</div></div>`;
    }
    // 휴일
    if (totalHol > 0) {
      otRows += `<div class="pe-item-row"><div class="pe-item-name">휴일 ${totalHol.toFixed(1)}h × ${fmtW(hourlyRate)} × 150~200%</div><div class="pe-item-amount">${fmtW(holPay)}</div></div>`;
    }
    // 휴일야간
    if (totalHolNgt > 0) {
      otRows += `<div class="pe-item-row"><div class="pe-item-name">휴일야간 ${totalHolNgt.toFixed(1)}h × ${fmtW(hourlyRate)} × 200%</div><div class="pe-item-amount">${fmtW(holNgtPay)}</div></div>`;
    }

    // 온콜대기
    if (otStats.byType.oncall_standby.count > 0) {
      otRows += `<div class="pe-ot-category-title">온콜대기 ${otStats.byType.oncall_standby.count}일</div>`;
      otRows += `<div class="pe-item-row"><div class="pe-item-name">대기수당 ${otStats.byType.oncall_standby.count}일 × ${fmtW(DATA.allowances.onCallStandby)}</div><div class="pe-item-amount">${fmtW(standbyPay)}</div></div>`;
    }

    // 온콜출근
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
    const totalNet = yearly.reduce((a, r) => a + r.net, 0);
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

  el.innerHTML = `
    <div class="pe-section-card">
      <nav class="pe-detail-toggle">
        <button class="pe-toggle-btn ${activeView === 'pay' ? 'active' : ''}" data-view="pay">예상 지급 내역</button>
        <button class="pe-toggle-btn ${activeView === 'ded' ? 'active' : ''}" data-view="ded">예상 공제 내역</button>
      </nav>
      <div class="pe-detail-pane ${activeView === 'pay' ? 'active' : ''}" id="peDetailPay">
        ${payRows}
        <div class="pe-item-row pe-total-row">
          <div class="pe-item-name">지급 합계</div>
          <div class="pe-item-amount">${fmtW(r.급여총액)}</div>
        </div>
      </div>
      <div class="pe-detail-pane ${activeView === 'ded' ? 'active' : ''}" id="peDetailDed">
        ${dedRows}
        <div class="pe-item-row pe-total-row">
          <div class="pe-item-name">공제 합계</div>
          <div class="pe-item-amount ded">${fmtW(r.공제총액)}</div>
        </div>
        <div class="pe-ded-note">소득세·주민세는 간이세액표 기반 근사치입니다.<br>사학연금부담금, 노동조합비 등 개인별 공제는 미반영.</div>
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

// 지급 항목별 계산 근거 설명
function getItemDesc(name, year, month, est) {
  const flags = est.flags;
  if (name === '가계지원비') return '연간 11개월 균등 지급 (1·2·9월 미지급, 단 설/추석월은 지급)';
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

  const container = document.getElementById('otDashboard');
  if (container) {
    const detailItems = [
      { label: '시간외', value: stats.overtimeHours.toFixed(1) + 'h', cls: 'rose' },
      { label: '온콜출근', value: stats.byType.oncall_callout.hours.toFixed(1) + 'h', cls: 'indigo' },
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

    html += `<div class="ot-group" onclick="this.classList.toggle('open')">
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
    const stableRes = SALARY_PARSER.applyStableItemsToProfile(parsed);
    const profileUpdated = stableRes && stableRes.changed;

    // 자동 검증 (콘솔에 결과 출력)
    if (typeof SALARY_TEST !== 'undefined') {
      SALARY_TEST.postParseValidation(parsed);
      SALARY_TEST.validateStorage(parsed, ym);
      SALARY_TEST.validateProfileApply(parsed, stableRes);
    }

    renderPayslip(parsed, ym, profileUpdated, stableRes);
    renderVerification(parsed);
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

    const parsed = await SALARY_PARSER.parseFile(file, onProgress);
    const info = parsed.employeeInfo || {};

    // 프로필에 반영
    const profile = PROFILE.load() || {};

    if (info.name) profile.name = info.name;
    if (info.hireDate) profile.hireDate = info.hireDate;

    // 직종 매핑
    if (info.jobType) {
      const jobTypeMap = { '간호': '간호직', '보건': '보건직', '약무': '약무직', '의료기사': '의료기사직', '의사': '의사직', '사무': '사무직', '기능': '기능직', '시설': '시설직', '환경미화': '환경미화직', '지원': '지원직' };
      for (const [keyword, jt] of Object.entries(jobTypeMap)) {
        if (info.jobType.includes(keyword)) { profile.jobType = jt; break; }
      }
    }

    // 호봉 파싱 (예: "S3-4", "S1 - 03" → grade="S3", year=4)
    if (info.payGrade) {
      const gm = info.payGrade.match(/([A-Za-z]\d+)\s*-\s*(\d+)/);
      if (gm) {
        profile.grade = gm[1].toUpperCase();
        profile.year = parseInt(gm[2]) || 1;
      }
    }

    // 먼저 기본 정보 저장
    PROFILE.save(profile);

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
      ['pfName', updatedProfile.name], ['pfHireDate', updatedProfile.hireDate],
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

function renderPayslip(data, ym, profileUpdated, stableRes) {
  const resultEl = document.getElementById('payslipResult');
  const fmt = n => n != null && n !== 0 ? n.toLocaleString() + '원' : '-';
  const info = data.employeeInfo;
  const meta = data.metadata;
  const typeLabel = ym.type && ym.type !== '급여' ? ` (${ym.type})` : '';

  let html = `
    <div style="margin-bottom:12px; padding:10px 12px; background:var(--bg-hover); border-radius:8px; font-size:var(--text-body-normal); color:var(--text-muted);">
      <strong style="color:var(--text-primary);">${ym.year}년 ${ym.month}월 급여명세서${typeLabel}</strong>
      ${info.name ? `· ${info.name}` : ''}
      ${info.jobType ? `· ${info.jobType}` : ''}
      ${info.payGrade ? `· ${info.payGrade}` : ''}
      ${meta.payDate ? `<br>지급일: ${meta.payDate}` : ''}
    </div>`;

  if (profileUpdated && stableRes && stableRes.applied && stableRes.applied.length > 0) {
    const warnings = stableRes.applied.filter(a => a.note && a.note.startsWith('⚠️'));
    const normals = stableRes.applied.filter(a => !a.note || !a.note.startsWith('⚠️'));
    if (normals.length > 0) {
      const details = normals.map(a => `${a.name}${a.note ? ` (${a.note})` : ''}`).join(', ');
      html += `<div class="warning-box" style="border-color:var(--accent-emerald); margin-bottom:8px;">✅ 자동 반영: ${details}</div>`;
    }
    warnings.forEach(w => {
      html += `<div class="warning-box" style="border-color:var(--accent-amber); margin-bottom:8px;">${w.note}</div>`;
    });
  } else if (profileUpdated) {
    html += `<div class="warning-box" style="border-color:var(--accent-emerald); margin-bottom:8px;">✅ 조정급 등 변경되지 않는 항목을 내 정보에 자동 반영했습니다.</div>`;
  }

  // 파싱 신뢰도 경고
  if (data._parseInfo) {
    const pi = data._parseInfo;
    if (pi.confidence < 70) {
      html += `<div class="warning-box" style="border-color:var(--accent-amber); margin-bottom:8px;">⚠️ 파싱 정확도가 낮습니다 (${pi.confidence}/100). 항목과 금액을 직접 확인해주세요.${pi.method === 'textFallback' ? ' (텍스트 폴백 모드)' : ''}</div>`;
    }
    if (Math.abs(pi.grossDiff || 0) > 1 || Math.abs(pi.deductionDiff || 0) > 1) {
      const details = [];
      if (Math.abs(pi.grossDiff || 0) > 1) details.push('지급 ' + (pi.grossDiff > 0 ? '+' : '') + pi.grossDiff.toLocaleString() + '원');
      if (Math.abs(pi.deductionDiff || 0) > 1) details.push('공제 ' + (pi.deductionDiff > 0 ? '+' : '') + pi.deductionDiff.toLocaleString() + '원');
      html += `<div class="warning-box" style="border-color:var(--accent-rose); margin-bottom:8px;">❌ 항목 합산과 총액이 불일치합니다 (${details.join(', ')})</div>`;
    }
  }

  // 지급 내역 테이블
  html += `<p style="font-size:var(--text-body-normal); color:var(--accent-indigo); font-weight:600; margin:12px 0 6px;">▸ 지급 내역</p>`;
  html += `<div style="display:flex; flex-direction:column; gap:4px;">`;
  data.salaryItems.forEach(item => {
    html += `<div class="result-row"><span class="key">${item.name}</span><span class="val">${fmt(item.amount)}</span></div>`;
  });
  html += `</div>`;

  // 공제 내역
  if (data.deductionItems.length > 0) {
    html += `<p style="font-size:var(--text-body-normal); color:var(--accent-rose); font-weight:600; margin:12px 0 6px;">▸ 공제 내역</p>`;
    html += `<div style="display:flex; flex-direction:column; gap:4px;">`;
    data.deductionItems.forEach(item => {
      html += `<div class="result-row"><span class="key">${item.name}</span><span class="val" style="color:var(--accent-rose);">${fmt(item.amount)}</span></div>`;
    });
    html += `</div>`;
  }

  // 합계
  html += `
    <div class="result-box" style="margin-top:12px;">
      <div class="result-row"><span class="key">급여총액</span><span class="val green">${fmt(data.summary.grossPay)}</span></div>
      <div class="result-row"><span class="key">공제총액</span><span class="val" style="color:var(--accent-rose);">${fmt(data.summary.totalDeduction)}</span></div>
      <div class="result-row" style="border-top:1px solid var(--border-glass); padding-top:8px; margin-top:4px;">
        <span class="key" style="font-weight:700;">실지급액</span>
        <span class="val" style="font-size:var(--text-body-large); font-weight:700;">${fmt(data.summary.netPay)}</span>
      </div>
    </div>
    <button class="btn btn-secondary btn-full" style="margin-top:12px;" onclick="showVerifyInQna()">✅ 앱 계산값과 비교하기</button>
  `;
  resultEl.innerHTML = html;
}

function showVerifyInQna() {
  switchPayrollSubTab('salary-qna');
  const verifyCard = document.getElementById('verifyCard');
  if (verifyCard) verifyCard.style.display = '';
}

function renderVerification(data) {
  const verifyEl = document.getElementById('verifyResult');
  if (!verifyEl) return;
  // 검증 데이터가 있으면 카드 표시
  const verifyCard = document.getElementById('verifyCard');
  if (verifyCard) verifyCard.style.display = '';
  const comparison = SALARY_PARSER.compareWithApp(data);

  if (!comparison) {
    verifyEl.innerHTML = `<div class="warning-box">⚠️ 비교하려면 먼저 <strong>개인정보 탭</strong>에서 내 정보를 저장해주세요.</div>`;
    return;
  }

  const fmt = n => n != null ? n.toLocaleString() + '원' : '-';
  let html = `<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:var(--text-body-normal);">
    <thead>
      <tr style="background:var(--bg-hover); color:var(--text-muted);">
        <th style="padding:8px 6px; text-align:left;">항목</th>
        <th style="padding:8px 6px; text-align:right;">명세서</th>
        <th style="padding:8px 6px; text-align:right;">앱 계산</th>
        <th style="padding:8px 6px; text-align:right;">차이</th>
      </tr>
    </thead><tbody>`;

  comparison.comparison.forEach(row => {
    const diff = row.diff;
    const diffStr = diff !== null ? (diff === 0 ? '✅ 일치' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`) : '-';
    const diffColor = diff === null ? 'var(--text-muted)' : diff === 0 ? 'var(--accent-emerald)' : 'var(--accent-amber)';
    const rowStyle = row.isTotal ? 'border-top:2px solid var(--border-glass); font-weight:700;' : '';
    html += `<tr style="${rowStyle}">
      <td style="padding:7px 6px; color:var(--text-primary);">${row.name}</td>
      <td style="padding:7px 6px; text-align:right; color:var(--text-primary);">${fmt(row.payslip)}</td>
      <td style="padding:7px 6px; text-align:right; color:var(--text-muted);">${fmt(row.app)}</td>
      <td style="padding:7px 6px; text-align:right; color:${diffColor}; font-weight:600;">${diffStr}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;

  // 차이 있는 항목 안내
  const mismatches = comparison.comparison.filter(r => r.diff !== null && r.diff !== 0 && !r.isTotal);
  if (mismatches.length > 0) {
    html += `<div class="warning-box" style="margin-top:12px;">
      ⚠️ <strong>차이가 발생한 항목 ${mismatches.length}개:</strong><br>
      ${mismatches.map(r => `${r.name}: ${(r.diff > 0 ? '+' : '')}${r.diff.toLocaleString()}원`).join('<br>')}
      <br><br>💡 <strong>개인정보</strong> 탭에서 조정급·직책급 등을 실제 명세서 금액으로 수정하면 오차가 줄어듭니다.
    </div>`;
  }
  verifyEl.innerHTML = html;
}

// renderSavedMonths — legacy 호환
function renderSavedMonths() { renderPayslipMgmt(); }

// ── 급여명세서 조회 뷰: 통계 + 월별 카드 ──
function renderPayslipMgmt() {
  const statsEl = document.getElementById('payslipStats');
  const listEl = document.getElementById('payslipMgmtView');
  if (!statsEl || !listEl) return;

  const months = SALARY_PARSER.listSavedMonths(); // newest first

  // ── 데이터 없음 ──
  if (months.length === 0) {
    statsEl.textContent = '';
    listEl.textContent = '';
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'text-align:center; padding:32px 16px;';
    const icon = document.createElement('p');
    icon.style.cssText = 'font-size:1.5rem; margin-bottom:8px;';
    icon.textContent = '📭';
    card.appendChild(icon);
    const p1 = document.createElement('p');
    p1.style.cssText = 'color:var(--text-muted); font-size:var(--text-body-normal);';
    p1.textContent = '저장된 급여명세서가 없습니다.';
    card.appendChild(p1);
    const p2 = document.createElement('p');
    p2.style.cssText = 'color:var(--text-muted); font-size:var(--text-body-small); margin-top:4px;';
    p2.textContent = 'info 탭에서 급여명세서를 등록해주세요.';
    card.appendChild(p2);
    const goBtn = document.createElement('button');
    goBtn.className = 'btn btn-primary';
    goBtn.style.cssText = 'margin-top:12px;';
    goBtn.textContent = '👤 info 탭으로 이동';
    goBtn.addEventListener('click', () => switchTab('profile'));
    card.appendChild(goBtn);
    listEl.appendChild(card);
    return;
  }

  // ── 모든 월 데이터 로드 ──
  const allData = months.map(m => {
    const d = SALARY_PARSER.loadMonthlyData(m.year, m.month, m.type);
    return { year: m.year, month: m.month, type: m.type || '급여', data: d };
  }).filter(m => m.data);

  const fmt = n => n != null && n !== 0 ? n.toLocaleString() + '원' : '-';
  const fmtSign = n => {
    if (n == null || n === 0) return '-';
    const prefix = n > 0 ? '+' : '';
    return prefix + n.toLocaleString() + '원';
  };

  // ── 통계 카드 렌더 ──
  renderPayslipStats(statsEl, allData, fmt, fmtSign);

  // ── 월별 카드 목록 (접이식) ──
  listEl.textContent = '';
  allData.forEach(({ year, month, type, data }, idx) => {
    const cardId = `payslipCard_${year}_${month}_${type}`;
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '12px';

    // 카드 헤더 (항상 보임 — 월, 실지급액 요약)
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; cursor:pointer; padding:4px 0;';
    header.addEventListener('click', () => {
      const body = document.getElementById(cardId);
      if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
      const icon = header.querySelector('.toggle-icon');
      if (icon) icon.textContent = body.style.display === 'none' ? '▸' : '▾';
    });

    const left = document.createElement('div');
    left.style.cssText = 'display:flex; align-items:center; gap:8px;';
    const toggle = document.createElement('span');
    toggle.className = 'toggle-icon';
    toggle.style.cssText = 'font-size:var(--text-body-normal); color:var(--text-muted);';
    toggle.textContent = '▸';
    left.appendChild(toggle);
    const monthLabel = document.createElement('span');
    monthLabel.style.cssText = 'font-weight:700; font-size:var(--text-body-large);';
    const typeLabel = type !== '급여' ? ` (${type})` : '';
    monthLabel.textContent = `${year}년 ${month}월${typeLabel}`;
    left.appendChild(monthLabel);
    header.appendChild(left);

    const right = document.createElement('div');
    right.style.cssText = 'text-align:right; display:flex; flex-direction:column; gap:2px;';
    // 지급 합계
    const grossRow = document.createElement('div');
    grossRow.style.cssText = 'font-size:var(--text-body-small); color:var(--text-muted);';
    const grossLabel = document.createTextNode('지급 ');
    const grossVal = document.createElement('b');
    grossVal.style.color = 'var(--accent-indigo)';
    grossVal.textContent = fmt(data.summary?.grossPay || 0);
    grossRow.appendChild(grossLabel);
    grossRow.appendChild(grossVal);
    right.appendChild(grossRow);
    // 공제 합계
    const dedRow = document.createElement('div');
    dedRow.style.cssText = 'font-size:var(--text-body-small); color:var(--text-muted);';
    const dedLabel = document.createTextNode('공제 ');
    const dedVal = document.createElement('b');
    dedVal.style.color = 'var(--accent-rose)';
    dedVal.textContent = '-' + fmt(data.summary?.totalDeduction || 0);
    dedRow.appendChild(dedLabel);
    dedRow.appendChild(dedVal);
    right.appendChild(dedRow);
    // 실지급액
    const netRow2 = document.createElement('div');
    netRow2.style.cssText = 'font-weight:700; font-size:var(--text-body-large); color:var(--text-primary); border-top:1px solid var(--border-glass); padding-top:2px; margin-top:1px;';
    netRow2.textContent = fmt(data.summary?.netPay || 0);
    right.appendChild(netRow2);
    header.appendChild(right);
    card.appendChild(header);

    // 카드 바디 (접이식 — 첫 번째만 펼침)
    const body = document.createElement('div');
    body.id = cardId;
    body.style.display = 'none';
    body.style.cssText += ';margin-top:12px; border-top:1px solid var(--border-glass); padding-top:12px;';

    // 지급 내역
    if (data.salaryItems && data.salaryItems.length > 0) {
      const salLabel = document.createElement('p');
      salLabel.style.cssText = 'font-size:var(--text-body-normal); color:var(--accent-indigo); font-weight:600; margin:0 0 6px;';
      salLabel.textContent = '▸ 지급 내역';
      body.appendChild(salLabel);
      data.salaryItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'result-row';
        const k = document.createElement('span');
        k.className = 'key';
        k.textContent = item.name;
        const v = document.createElement('span');
        v.className = 'val';
        v.textContent = fmt(item.amount);
        row.appendChild(k);
        row.appendChild(v);
        body.appendChild(row);
      });
      const totalRow = document.createElement('div');
      totalRow.className = 'result-row';
      totalRow.style.cssText = 'border-top:1px solid var(--border); margin-top:6px; padding-top:6px; font-weight:700;';
      const tk = document.createElement('span');
      tk.className = 'key';
      tk.textContent = '급여총액';
      const tv = document.createElement('span');
      tv.className = 'val';
      tv.style.color = 'var(--accent-indigo)';
      tv.textContent = fmt(data.summary?.grossPay || 0);
      totalRow.appendChild(tk);
      totalRow.appendChild(tv);
      body.appendChild(totalRow);
    }

    // 공제 내역
    if (data.deductionItems && data.deductionItems.length > 0) {
      const dedLabel = document.createElement('p');
      dedLabel.style.cssText = 'font-size:var(--text-body-normal); color:var(--accent-rose); font-weight:600; margin:12px 0 6px;';
      dedLabel.textContent = '▸ 공제 내역';
      body.appendChild(dedLabel);
      data.deductionItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'result-row';
        const k = document.createElement('span');
        k.className = 'key';
        k.textContent = item.name;
        const v = document.createElement('span');
        v.className = 'val';
        v.style.color = 'var(--accent-rose)';
        v.textContent = fmt(item.amount);
        row.appendChild(k);
        row.appendChild(v);
        body.appendChild(row);
      });
      const dedTotal = document.createElement('div');
      dedTotal.className = 'result-row';
      dedTotal.style.cssText = 'border-top:1px solid var(--border); margin-top:6px; padding-top:6px; font-weight:700;';
      const dk = document.createElement('span');
      dk.className = 'key';
      dk.textContent = '공제총액';
      const dv = document.createElement('span');
      dv.className = 'val';
      dv.style.color = 'var(--accent-rose)';
      dv.textContent = fmt(data.summary?.totalDeduction || 0);
      dedTotal.appendChild(dk);
      dedTotal.appendChild(dv);
      body.appendChild(dedTotal);
    }

    // ── 실지급액 요약 ──
    if (data.summary?.netPay) {
      const netRow = document.createElement('div');
      netRow.className = 'result-row';
      netRow.style.cssText = 'border-top:2px solid var(--border); margin-top:10px; padding-top:10px; font-weight:700; font-size:var(--text-body-large);';
      const nk = document.createElement('span');
      nk.className = 'key';
      nk.textContent = '실지급액';
      const nv = document.createElement('span');
      nv.className = 'val';
      nv.style.color = 'var(--text-primary)';
      nv.textContent = fmt(data.summary.netPay);
      netRow.appendChild(nk);
      netRow.appendChild(nv);
      body.appendChild(netRow);
    }

    // ── 통상임금 검증 섹션 ──
    renderPayslipVerification(body, data);

    // ── 수당 분석 (리버스엔지니어링) 섹션 ──
    renderOvertimeAnalysis(body, data);

    // 삭제 버튼
    const delWrap = document.createElement('div');
    delWrap.style.cssText = 'margin-top:12px; text-align:right;';
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-outline';
    delBtn.style.cssText = 'font-size:var(--text-body-small); padding:4px 10px; color:var(--accent-rose); border-color:var(--accent-rose);';
    delBtn.textContent = '🗑 삭제';
    delBtn.addEventListener('click', () => deletePayslipMonth(year, month, type));
    delWrap.appendChild(delBtn);
    body.appendChild(delWrap);

    card.appendChild(body);
    listEl.appendChild(card);
  });
}

// ── 통계 카드 ──
function renderPayslipStats(el, allData, fmt, fmtSign) {
  el.textContent = '';
  if (allData.length === 0) return;

  const card = document.createElement('div');
  card.className = 'card';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.style.fontSize = 'var(--text-body-large)';
  const titleIcon = document.createElement('span');
  titleIcon.className = 'icon';
  titleIcon.style.color = 'var(--accent-violet)';
  titleIcon.textContent = '📊';
  title.appendChild(titleIcon);
  title.appendChild(document.createTextNode(' 급여 통계'));
  card.appendChild(title);

  const nets = allData.map(d => d.data.summary?.netPay || 0);
  const grosses = allData.map(d => d.data.summary?.grossPay || 0);
  const deductions = allData.map(d => d.data.summary?.totalDeduction || 0);
  const latestNet = nets[0];
  const avgNet = Math.round(nets.reduce((a, b) => a + b, 0) / nets.length);
  const maxNet = Math.max(...nets);
  const minNet = Math.min(...nets);
  const avgGross = Math.round(grosses.reduce((a, b) => a + b, 0) / grosses.length);
  const avgDed = Math.round(deductions.reduce((a, b) => a + b, 0) / deductions.length);

  // 전월 대비
  const prevNet = nets.length > 1 ? nets[1] : null;
  const diff = prevNet != null ? latestNet - prevNet : null;

  // 기간 표시
  const oldest = allData[allData.length - 1];
  const newest = allData[0];
  const periodText = allData.length === 1
    ? `${newest.year}년 ${newest.month}월`
    : `${oldest.year}년 ${oldest.month}월 ~ ${newest.year}년 ${newest.month}월 (${allData.length}개월)`;
  const periodEl = document.createElement('p');
  periodEl.style.cssText = 'font-size:var(--text-body-small); color:var(--text-muted); margin-bottom:12px;';
  periodEl.textContent = periodText;
  card.appendChild(periodEl);

  // 주요 지표 그리드
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;';

  const addStat = (label, value, color, sub) => {
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-hover); border-radius:10px; padding:12px;';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:var(--text-body-small); color:var(--text-muted); margin-bottom:4px;';
    lbl.textContent = label;
    box.appendChild(lbl);
    const val = document.createElement('div');
    val.style.cssText = `font-weight:700; font-size:var(--text-body-large); color:${color || 'var(--text-primary)'};`;
    val.textContent = value;
    box.appendChild(val);
    if (sub) {
      const s = document.createElement('div');
      s.style.cssText = 'font-size:var(--text-body-small); color:var(--text-muted); margin-top:2px;';
      s.textContent = sub;
      box.appendChild(s);
    }
    grid.appendChild(box);
  };

  addStat('최근 실지급액', fmt(latestNet), 'var(--text-primary)',
    diff != null ? `전월 대비 ${fmtSign(diff)}` : null);
  addStat('평균 실지급액', fmt(avgNet), 'var(--accent-indigo)');
  addStat('평균 급여총액', fmt(avgGross), 'var(--accent-emerald)');
  addStat('평균 공제총액', fmt(avgDed), 'var(--accent-rose)');

  if (allData.length > 1) {
    addStat('최고 실지급액', fmt(maxNet), 'var(--accent-amber)',
      `${allData.find((_, i) => nets[i] === maxNet).year}년 ${allData.find((_, i) => nets[i] === maxNet).month}월`);
    addStat('최저 실지급액', fmt(minNet), 'var(--text-muted)',
      `${allData.find((_, i) => nets[i] === minNet).year}년 ${allData.find((_, i) => nets[i] === minNet).month}월`);
  }
  card.appendChild(grid);

  // 월별 실지급액 추이 (바 차트 — 최근 12개월)
  if (allData.length > 1) {
    const chartLabel = document.createElement('p');
    chartLabel.style.cssText = 'font-size:var(--text-body-normal); font-weight:600; margin:8px 0 8px; color:var(--text-primary);';
    chartLabel.textContent = '▸ 월별 실지급액 추이';
    card.appendChild(chartLabel);

    const chartData = allData.slice(0, 12).reverse(); // oldest first for chart
    const chartMax = Math.max(...chartData.map(d => d.data.summary?.netPay || 0));

    const chart = document.createElement('div');
    chart.style.cssText = 'display:flex; align-items:flex-end; gap:4px; height:120px; padding:0 4px;';

    chartData.forEach(d => {
      const net = d.data.summary?.netPay || 0;
      const pct = chartMax > 0 ? (net / chartMax * 100) : 0;

      const col = document.createElement('div');
      col.style.cssText = 'flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; min-width:0;';

      const bar = document.createElement('div');
      bar.style.cssText = `width:100%; max-width:32px; height:${Math.max(4, pct)}%; background:var(--accent-indigo); border-radius:4px 4px 0 0; transition:height 0.3s; min-height:4px;`;
      bar.title = `${d.year}년 ${d.month}월: ${fmt(net)}`;
      col.appendChild(bar);

      const label = document.createElement('div');
      label.style.cssText = 'font-size:0.6rem; color:var(--text-muted); white-space:nowrap;';
      label.textContent = `${d.month}월`;
      col.appendChild(label);

      chart.appendChild(col);
    });
    card.appendChild(chart);

    // 공제율 표시
    const dedRate = avgGross > 0 ? ((avgDed / avgGross) * 100).toFixed(1) : 0;
    const rateRow = document.createElement('div');
    rateRow.style.cssText = 'margin-top:12px; padding:8px 12px; background:var(--bg-hover); border-radius:8px; font-size:var(--text-body-normal); color:var(--text-muted);';
    rateRow.textContent = `평균 공제율: ${dedRate}% (급여총액 대비 공제총액)`;
    card.appendChild(rateRow);
  }

  el.appendChild(card);
}

// ── 통상임금 검증 섹션 ──
function renderPayslipVerification(container, data) {
  const profile = PROFILE.load();
  if (!profile || !profile.jobType || !profile.grade) return;
  if (!data.salaryItems || data.salaryItems.length === 0) return;

  const serviceYears = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
  const appWage = CALC.calcOrdinaryWage(
    profile.jobType, profile.grade, parseInt(profile.year) || 1,
    {
      hasMilitary: profile.hasMilitary,
      hasSeniority: profile.hasSeniority,
      seniorityYears: profile.hasSeniority ? serviceYears : 0,
      longServiceYears: serviceYears,
      adjustPay: parseInt(profile.adjustPay) || 0,
      upgradeAdjustPay: parseInt(profile.upgradeAdjustPay) || 0,
      specialPayAmount: parseInt(profile.specialPay) || 0,
      positionPay: parseInt(profile.positionPay) || 0,
      workSupportPay: parseInt(profile.workSupportPay) || 0,
      weeklyHours: parseInt(profile.weeklyHours) || 209,
    }
  );
  if (!appWage) return;

  const fmt = n => n != null ? n.toLocaleString() + '원' : '-';

  // 명세서 항목을 이름→금액 맵으로
  const payslipMap = {};
  data.salaryItems.forEach(item => { payslipMap[item.name] = item.amount; });

  // 비교 대상: breakdown 항목 중 0이 아닌 것 + 명세서에만 있는 것
  const rows = [];
  let hasAlert = false;

  Object.entries(appWage.breakdown).forEach(([name, appVal]) => {
    const payVal = payslipMap[name] ?? null;
    const diff = payVal !== null ? payVal - appVal : null;
    const alert = diff !== null && Math.abs(diff) >= 10;
    if (alert) hasAlert = true;
    rows.push({ name, app: appVal, payslip: payVal, diff, alert });
  });

  // 통상임금 합계: 명세서 항목 중 통상임금(breakdown)에 해당하는 것만 합산
  const ordinaryNames = new Set(Object.keys(appWage.breakdown));
  let payslipOrdinarySum = 0;
  data.salaryItems.forEach(item => {
    if (ordinaryNames.has(item.name)) payslipOrdinarySum += item.amount;
  });
  const totalDiff = payslipOrdinarySum - appWage.monthlyWage;
  const totalAlert = Math.abs(totalDiff) >= 10;
  if (totalAlert) hasAlert = true;

  // 섹션 헤더
  const section = document.createElement('div');
  section.style.cssText = 'margin-top:16px; border-top:1px solid var(--border-glass); padding-top:12px;';

  const label = document.createElement('p');
  label.style.cssText = 'font-size:var(--text-body-normal); color:var(--accent-violet); font-weight:600; margin:0 0 8px; cursor:pointer;';
  label.textContent = hasAlert
    ? '⚠️ 통상임금 검증 (차이 발견)'
    : '✅ 통상임금 검증';
  label.style.color = 'var(--accent-emerald)';

  const detail = document.createElement('div');
  detail.style.display = 'none';
  label.addEventListener('click', () => {
    detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
  });
  section.appendChild(label);

  // 테이블 헤더
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:4px; font-size:0.7rem; color:var(--text-muted); padding:4px 0; border-bottom:1px solid var(--border-glass);';
  ['항목', '앱 계산', '명세서', '차이'].forEach(t => {
    const c = document.createElement('span');
    c.textContent = t;
    if (t !== '항목') c.style.textAlign = 'right';
    hdr.appendChild(c);
  });
  detail.appendChild(hdr);

  rows.forEach(r => {
    if (r.app === 0 && r.payslip === null) return; // 둘다 없으면 스킵
    const row = document.createElement('div');
    row.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:4px; font-size:var(--text-body-small); padding:3px 0;';
    if (r.alert) row.style.background = 'rgba(255,180,50,0.1)';

    const c1 = document.createElement('span');
    c1.textContent = r.name;
    c1.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    const c2 = document.createElement('span');
    c2.style.textAlign = 'right';
    c2.textContent = r.app > 0 ? r.app.toLocaleString() : '-';
    const c3 = document.createElement('span');
    c3.style.textAlign = 'right';
    c3.textContent = r.payslip !== null ? r.payslip.toLocaleString() : '-';
    const c4 = document.createElement('span');
    c4.style.textAlign = 'right';
    if (r.diff !== null && Math.abs(r.diff) >= 10) {
      c4.textContent = (r.diff > 0 ? '+' : '') + r.diff.toLocaleString();
      c4.style.color = 'var(--accent-rose)';
      c4.style.fontWeight = '600';
    } else if (r.diff !== null) {
      c4.textContent = '일치';
      c4.style.color = 'var(--accent-emerald)';
    } else {
      c4.textContent = '-';
    }

    row.appendChild(c1);
    row.appendChild(c2);
    row.appendChild(c3);
    row.appendChild(c4);
    detail.appendChild(row);
  });

  // 합계 행
  const totalRow = document.createElement('div');
  totalRow.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:4px; font-size:var(--text-body-small); padding:6px 0; border-top:1px solid var(--border); margin-top:4px; font-weight:700;';
  if (totalAlert) totalRow.style.background = 'rgba(255,180,50,0.15)';
  const t1 = document.createElement('span'); t1.textContent = '통상임금 합계';
  const t2 = document.createElement('span'); t2.style.textAlign = 'right'; t2.textContent = appWage.monthlyWage.toLocaleString();
  const t3 = document.createElement('span'); t3.style.textAlign = 'right'; t3.textContent = payslipOrdinarySum.toLocaleString();
  const t4 = document.createElement('span'); t4.style.textAlign = 'right';
  if (totalAlert) {
    t4.textContent = (totalDiff > 0 ? '+' : '') + totalDiff.toLocaleString();
    t4.style.color = 'var(--accent-rose)';
  } else {
    t4.textContent = '일치';
    t4.style.color = 'var(--accent-emerald)';
  }
  totalRow.appendChild(t1); totalRow.appendChild(t2); totalRow.appendChild(t3); totalRow.appendChild(t4);
  detail.appendChild(totalRow);

  // 시급 정보
  const rateInfo = document.createElement('div');
  rateInfo.style.cssText = 'margin-top:8px; font-size:var(--text-body-small); color:var(--text-muted); padding:6px 8px; background:var(--bg-hover); border-radius:6px;';
  rateInfo.textContent = `앱 기준 시급: ${fmt(appWage.hourlyRate)} (÷${parseInt(profile.weeklyHours) || 209}시간)`;
  detail.appendChild(rateInfo);

  section.appendChild(detail);
  container.appendChild(section);
}

// ── 수당 분석 (리버스엔지니어링) 섹션 ──
function renderOvertimeAnalysis(container, data) {
  const profile = PROFILE.load();
  if (!profile || !profile.jobType || !profile.grade) return;
  if (!data.salaryItems || data.salaryItems.length === 0) return;

  const serviceYears = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
  const appWage = CALC.calcOrdinaryWage(
    profile.jobType, profile.grade, parseInt(profile.year) || 1,
    {
      hasMilitary: profile.hasMilitary,
      hasSeniority: profile.hasSeniority,
      seniorityYears: profile.hasSeniority ? serviceYears : 0,
      longServiceYears: serviceYears,
      adjustPay: parseInt(profile.adjustPay) || 0,
      upgradeAdjustPay: parseInt(profile.upgradeAdjustPay) || 0,
      specialPayAmount: parseInt(profile.specialPay) || 0,
      positionPay: parseInt(profile.positionPay) || 0,
      workSupportPay: parseInt(profile.workSupportPay) || 0,
      weeklyHours: parseInt(profile.weeklyHours) || 209,
    }
  );
  if (!appWage || !appWage.hourlyRate) return;

  const hourlyRate = appWage.hourlyRate;
  const rates = DATA.allowances.overtimeRates;

  // 명세서에서 수당 항목 찾기
  const payslipMap = {};
  data.salaryItems.forEach(item => { payslipMap[item.name] = item.amount; });

  // 역산 대상 매핑: { 명세서항목명: { rate, label } }
  const overtimeItems = [
    { names: ['시간외수당', '시간외근무수당', '연장근무수당', '연장수당'], rate: rates.extended, label: '연장근무', unit: '시간' },
    { names: ['야간수당', '야간근무수당'], rate: rates.night, label: '야간근무', unit: '시간' },
    { names: ['휴일수당', '휴일근무수당'], rate: rates.holiday, label: '휴일근무', unit: '시간' },
    { names: ['야간근무가산금', '야간가산금'], rate: null, label: '야간근무가산', unit: '회', perUnit: DATA.allowances.nightShiftBonus },
    { names: ['당직비', '일직비', '숙직비'], rate: null, label: '당직', unit: '일', perUnit: DATA.allowances.dutyAllowance },
  ];

  const results = [];
  overtimeItems.forEach(ot => {
    for (const name of ot.names) {
      if (payslipMap[name] && payslipMap[name] > 0) {
        const amount = payslipMap[name];
        let estimated;
        if (ot.perUnit) {
          estimated = amount / ot.perUnit;
        } else {
          estimated = amount / (hourlyRate * ot.rate);
        }
        // 15분 단위 반올림 (0.25 단위)
        const rounded = Math.round(estimated * 4) / 4;
        results.push({
          label: ot.label,
          name: name,
          amount: amount,
          estimated: rounded,
          unit: ot.unit,
          rate: ot.rate,
          perUnit: ot.perUnit,
        });
        break; // 첫 매칭만
      }
    }
  });

  if (results.length === 0) return;

  const fmt = n => n > 0 ? n.toLocaleString() + '원' : '-';

  const section = document.createElement('div');
  section.style.cssText = 'margin-top:16px; border-top:1px solid var(--border-glass); padding-top:12px;';

  const label = document.createElement('p');
  label.style.cssText = 'font-size:var(--text-body-normal); color:var(--accent-indigo); font-weight:600; margin:0 0 8px; cursor:pointer;';
  label.textContent = '🔍 수당 분석 (역산)';
  const detail = document.createElement('div');
  detail.style.display = 'none';
  label.addEventListener('click', () => {
    detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
  });
  section.appendChild(label);

  // 시급 기준 안내
  const rateNote = document.createElement('div');
  rateNote.style.cssText = 'font-size:0.7rem; color:var(--text-muted); margin-bottom:8px; padding:4px 8px; background:var(--bg-hover); border-radius:6px;';
  rateNote.textContent = `기준 시급: ${fmt(hourlyRate)} | 연장/야간/휴일: ×${rates.extended} | 야간가산금: ${DATA.allowances.nightShiftBonus.toLocaleString()}원/회 | 당직비: ${DATA.allowances.dutyAllowance.toLocaleString()}원/일`;
  detail.appendChild(rateNote);

  results.forEach(r => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px; margin-bottom:6px; background:var(--bg-hover); border-radius:8px;';

    const left = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:var(--text-body-normal); font-weight:600; color:var(--text-primary);';
    nameEl.textContent = r.label;
    left.appendChild(nameEl);
    const subEl = document.createElement('div');
    subEl.style.cssText = 'font-size:0.7rem; color:var(--text-muted);';
    if (r.perUnit) {
      subEl.textContent = `${r.name} ${fmt(r.amount)} ÷ ${r.perUnit.toLocaleString()}원`;
    } else {
      subEl.textContent = `${r.name} ${fmt(r.amount)} ÷ (${hourlyRate.toLocaleString()} × ${r.rate})`;
    }
    left.appendChild(subEl);
    row.appendChild(left);

    const right = document.createElement('div');
    right.style.cssText = 'text-align:right;';
    const estEl = document.createElement('div');
    estEl.style.cssText = 'font-size:var(--text-body-large); font-weight:700; color:var(--accent-indigo);';
    estEl.textContent = `≈ ${r.estimated}${r.unit}`;
    right.appendChild(estEl);
    row.appendChild(right);

    detail.appendChild(row);
  });

  // 총 시간외 합산
  const timeResults = results.filter(r => r.unit === '시간');
  if (timeResults.length > 0) {
    const totalHours = timeResults.reduce((s, r) => s + r.estimated, 0);
    const totalPay = timeResults.reduce((s, r) => s + r.amount, 0);
    const summaryEl = document.createElement('div');
    summaryEl.style.cssText = 'margin-top:8px; padding:8px 10px; background:var(--accent-indigo); color:white; border-radius:8px; display:flex; justify-content:space-between; font-size:var(--text-body-normal);';
    const sl = document.createElement('span');
    sl.style.fontWeight = '600';
    sl.textContent = `총 시간외 근무: ≈ ${totalHours}시간`;
    const sr = document.createElement('span');
    sr.textContent = `수당 합계: ${fmt(totalPay)}`;
    summaryEl.appendChild(sl);
    summaryEl.appendChild(sr);
    detail.appendChild(summaryEl);
  }

  section.appendChild(detail);
  container.appendChild(section);
}

function deletePayslipMonth(year, month, type) {
  const typeLabel = type && type !== '급여' ? ` (${type})` : '';
  if (!confirm(`${year}년 ${month}월${typeLabel} 급여명세서를 삭제하시겠습니까?`)) return;
  const base = `payslip_${year}_${String(month).padStart(2, '0')}`;
  const key = (type && type !== '급여') ? `${base}_${type}` : base;
  localStorage.removeItem(key);
  renderPayslipMgmt();
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
      const result = CALC.calcAnnualLeave(new Date(parsed));
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

  // 시간외 8h → 연차 1일 회복
  let otEarnedDays = 0;
  let otTotalHours = 0;
  if (typeof OVERTIME !== 'undefined') {
    for (let m = 1; m <= 12; m++) {
      const stats = OVERTIME.calcMonthlyStats(year, m);
      otTotalHours += stats.overtimeHours || 0;
    }
    otEarnedDays = Math.floor(otTotalHours / 8);
  }
  const effectiveUsed = Math.max(0, Math.round((annualUsed - otEarnedDays) * 10) / 10);

  const items = [
    { label: '연차', used: effectiveUsed, total: lvTotalAnnual || '?', key: true },
    { label: '시간차', used: timeLeaveHours, total: null, suffix: 'h', show: timeLeaveHours > 0 },
    { label: '시간외회복', used: otEarnedDays, total: null, suffix: '일', show: otEarnedDays > 0 },
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

// 카테고리별 색상 (캘린더 뷰와 동일)
const LV_CAT_COLORS = {
  legal:     { bg: 'rgba(16,185,129,0.15)',  accent: 'rgba(16,185,129,0.25)',  header: 'rgba(16,185,129,0.10)' },
  health:    { bg: 'rgba(244,63,94,0.12)',    accent: 'rgba(244,63,94,0.22)',   header: 'rgba(244,63,94,0.08)' },
  education: { bg: 'rgba(139,92,246,0.12)',   accent: 'rgba(139,92,246,0.22)',  header: 'rgba(139,92,246,0.08)' },
  family:    { bg: 'rgba(99,102,241,0.12)',   accent: 'rgba(99,102,241,0.22)',  header: 'rgba(99,102,241,0.08)' },
  ceremony:  { bg: 'rgba(245,158,11,0.12)',   accent: 'rgba(245,158,11,0.22)',  header: 'rgba(245,158,11,0.08)' },
  maternity: { bg: 'rgba(6,182,212,0.12)',    accent: 'rgba(6,182,212,0.22)',   header: 'rgba(6,182,212,0.08)' },
  special:   { bg: 'rgba(99,102,241,0.12)',   accent: 'rgba(99,102,241,0.22)',  header: 'rgba(99,102,241,0.08)' },
};
const LV_CAT_DEFAULT_COLOR = { bg: 'rgba(99,102,241,0.10)', accent: 'rgba(99,102,241,0.20)', header: 'rgba(99,102,241,0.06)' };

// 유형 select 동적 생성 (성별 필터 + optgroup)
function populateLvTypeSelect() {
  const container = document.getElementById('lvTypeSelectContainer');
  if (!container) return;
  container.innerHTML = '';

  const profile = PROFILE.load();
  const gender = profile ? profile.gender : '';
  const groups = LEAVE.getGroupedTypes(gender);

  // 현재 선택된 유형
  const lvTypeInput = document.getElementById('lvType');
  const selectedType = lvTypeInput ? lvTypeInput.value : '';

  // 기본적으로 토글이 펼쳐진 그룹들
  const defaultOpenGroups = ['legal', 'education', 'health', 'family'];

  // 사용 현황 데이터 가져오기
  const year = typeof lvCurrentYear !== 'undefined' ? lvCurrentYear : new Date().getFullYear();
  const records = LEAVE.getYearRecords(year);
  const usage = {};
  let timeLeaveHours = 0;
  records.forEach(r => {
    if (!usage[r.type]) usage[r.type] = 0;
    usage[r.type] += (r.days || 0);
    if (r.type === 'time_leave') timeLeaveHours += (r.hours || 0);
  });

  groups.forEach(group => {
    const colors = LV_CAT_COLORS[group.id] || LV_CAT_DEFAULT_COLOR;

    const groupDiv = document.createElement('div');
    groupDiv.style.marginBottom = '6px';
    groupDiv.style.background = 'var(--bg-card)';
    groupDiv.style.borderRadius = 'var(--radius-sm)';
    groupDiv.style.overflow = 'hidden';
    groupDiv.style.border = '1px solid var(--border-glass)';
    groupDiv.style.flexShrink = '0';

    // 제목 (토글 버튼)
    const titleDiv = document.createElement('div');
    titleDiv.style.fontSize = 'var(--text-body-normal)';
    titleDiv.style.fontWeight = '700';
    titleDiv.style.color = 'var(--text-primary)';
    titleDiv.style.padding = '10px 14px';
    titleDiv.style.cursor = 'pointer';
    titleDiv.style.display = 'flex';
    titleDiv.style.alignItems = 'center';
    titleDiv.style.justifyContent = 'space-between';
    titleDiv.style.background = colors.header;

    const isOpenByDefault = defaultOpenGroups.includes(group.id);

    titleDiv.innerHTML = `<span>${group.label}</span><span class="toggle-icon" style="color:var(--text-muted); transition:transform 0.2s;">${isOpenByDefault ? '▲' : '▼'}</span>`;
    groupDiv.appendChild(titleDiv);

    const itemsContainer = document.createElement('div');
    itemsContainer.style.padding = '8px 12px';
    itemsContainer.style.borderTop = '1px solid var(--border-glass)';
    itemsContainer.style.display = isOpenByDefault ? 'block' : 'none';

    // 2컬럼 레이아웃 적용
    if (group.id !== 'other') {
      itemsContainer.style.display = isOpenByDefault ? 'grid' : 'none';
      if (itemsContainer.style.display === 'grid') {
        itemsContainer.style.gridTemplateColumns = '1fr 1fr';
        itemsContainer.style.gap = '6px';
      }
    }

    titleDiv.onclick = () => {
      const icon = titleDiv.querySelector('.toggle-icon');
      if (itemsContainer.style.display === 'none') {
        if (group.id !== 'other') {
          itemsContainer.style.display = 'grid';
          itemsContainer.style.gridTemplateColumns = '1fr 1fr';
          itemsContainer.style.gap = '6px';
        } else {
          itemsContainer.style.display = 'block';
        }
        icon.textContent = '▲';
      } else {
        itemsContainer.style.display = 'none';
        icon.textContent = '▼';
      }
    };

    group.items.forEach(t => {
      let label = t.label;
      if (t.isTimeBased && t.id !== 'time_leave') label += ' (시간단위)';

      const usedRaw = usage[t.id] || 0;
      const usedDays = Math.round(usedRaw * 10) / 10;
      let statusHtml = '';

      if (t.id === 'annual' || t.usesAnnual) {
        const annualData = LEAVE.calcAnnualSummary(year, typeof lvTotalAnnual !== 'undefined' ? lvTotalAnnual : 15);
        if (t.id === 'time_leave') {
          statusHtml = `<span style="color: var(--accent-emerald); font-size: var(--text-body-normal); font-weight: 700; margin-left: auto;">${timeLeaveHours}h 사용</span>`;
        } else {
          statusHtml = `<span style="color: var(--accent-emerald); font-size: var(--text-body-normal); font-weight: 700; margin-left: auto;">${annualData.usedAnnual}/${annualData.totalAnnual}</span>`;
        }
      } else if (t.quota !== null) {
        statusHtml = `<span style="color: var(--accent-emerald); font-size: var(--text-body-normal); font-weight: 700; margin-left: auto;">${usedDays}/${t.quota}</span>`;
      } else {
        statusHtml = `<span style="color: var(--accent-emerald); font-size: var(--text-body-normal); font-weight: 700; margin-left: auto;">${usedDays}일 사용</span>`;
      }

      const isSelected = t.id === selectedType;

      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.width = '100%';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'space-between';
      btn.style.marginBottom = group.id !== 'other' ? '0' : '4px';
      btn.style.padding = '10px 12px';
      btn.style.background = isSelected ? colors.accent : colors.bg;
      btn.style.border = isSelected ? '2px solid var(--accent-emerald)' : '1px solid var(--border-glass)';
      btn.style.borderRadius = 'var(--radius-sm)';
      btn.style.color = 'var(--text-primary)';
      btn.style.fontSize = 'var(--text-body-normal)';
      btn.style.fontWeight = '600';
      btn.onclick = () => selectLvType(t.id, t.label);
      btn.innerHTML = `<span>${isSelected ? '✓ ' : ''}${label}</span>${statusHtml}`;

      const baseBg = colors.bg;
      const hoverBg = colors.accent;
      if (!isSelected) {
        btn.onmouseover = () => btn.style.background = hoverBg;
        btn.onmouseout = () => btn.style.background = baseBg;
      }

      itemsContainer.appendChild(btn);
    });

    groupDiv.appendChild(itemsContainer);
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
  populateLvTypeSelect(); // 선택 상태 갱신
}

function updateLvTypeBtnText(id) {
  const typeInfo = LEAVE.getTypeById(id);
  if (!typeInfo) return;

  let label = typeInfo.label; // 아이콘, [무급] 태그 제거
  if (typeInfo.isTimeBased && id !== 'time_leave') label += ' (시간단위)'; // (시간단위) 제거
  const btnText = document.getElementById('lvTypeBtnText');
  if (btnText) btnText.textContent = label;
}

// recordsByDay 빌더 - 주말/공휴일 제외 (병가는 역일 기준이므로 포함)
function buildLvRecordsByDay(year, month, monthRecords, holidayMap) {
  const recordsByDay = {};
  monthRecords.forEach(r => {
    const useCalendarDays = (r.type === 'sick'); // 병가만 역일 기준
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getMonth() + 1 === month && cur.getFullYear() === year) {
        const d = cur.getDate();
        const dow = cur.getDay();
        const isWeekend = (dow === 0 || dow === 6);
        const isHoliday = !!(holidayMap && holidayMap[d]);
        // 병가가 아닌 경우 주말·공휴일은 연차 소진 없으므로 표시 제외
        if (!useCalendarDays && (isWeekend || isHoliday)) {
          cur.setDate(cur.getDate() + 1);
          continue;
        }
        if (!recordsByDay[d]) recordsByDay[d] = [];
        recordsByDay[d].push(r);
      }
      cur.setDate(cur.getDate() + 1);
    }
  });
  return recordsByDay;
}

async function refreshLvCalendar() {
  const year = lvCurrentYear;
  const month = lvCurrentMonth;

  // 1. 빠른 렌더링 (공휴일 미적용, 주말만 제외)
  const monthRecords = LEAVE.getMonthRecords(year, month);
  const recordsByDayFast = buildLvRecordsByDay(year, month, monthRecords, lvHolidayMap);

  renderLvCalendar(year, month, recordsByDayFast);
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

  // 3. 공휴일 포함해서 재빌드 후 재렌더링
  const recordsByDay = buildLvRecordsByDay(year, month, monthRecords, lvHolidayMap);
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

  let hasHolidayInMonth = false;
  const presentCategories = new Set();

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const isWknd = (dow === 0 || dow === 6);
    const isHoliday = !!lvHolidayMap[d];
    const isToday = (d === todayDay);
    const isSelected = lvSelectedDate && lvSelectedDate.day === d;
    const dayRecords = recordsByDay[d] || [];

    let cls = 'ot-cal-day';
    if (isHoliday) {
      cls += ' holiday';
      hasHolidayInMonth = true;
    } else if (isWknd) {
      cls += ' weekend';
    }
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';

    // 휴가 유형 텍스트 표시 (점 대신 유형명) + 공휴일 이름
    let dotsHtml = '<div style="display:flex; flex-direction:column; gap:1px; margin-top:1px;">';
    if (isHoliday) {
      const hName = lvHolidayMap[d];
      const hShort = hName.length > 3 ? hName.substring(0, 3) : hName;
      dotsHtml += `<span class="cal-badge" style="background:rgba(244,63,94,0.15); color:var(--accent-rose); font-weight:600;">${hShort}</span>`;
    }
    const uniqueTypes = [...new Set(dayRecords.map(r => r.type))];
    uniqueTypes.forEach(t => {
      const typeInfo = LEAVE.getTypeById(t);
      if (typeInfo && typeInfo.category) presentCategories.add(typeInfo.category);
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

  let legendHtml = '';

  if (hasHolidayInMonth) {
    legendHtml += `<span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--accent-rose);"></span> <span style="font-size:12px; color:var(--text-secondary);">공휴일</span></span>`;
  }

  const catNames = {
    legal: '법정',
    health: '건강',
    education: '교육',
    family: '가족',
    ceremony: '청원',
    maternity: '출산',
    special: '특별'
  };
  const catColors = {
    legal: 'rgba(16,185,129,0.15)',
    health: 'rgba(244,63,94,0.12)',
    education: 'rgba(139,92,246,0.12)',
    family: 'rgba(99,102,241,0.12)',
    ceremony: 'rgba(245,158,11,0.12)',
    maternity: 'rgba(6,182,212,0.12)',
    special: 'rgba(99,102,241,0.12)',
  };

  ['legal', 'health', 'education', 'family', 'ceremony', 'maternity', 'special'].forEach(cat => {
    if (presentCategories.has(cat)) {
      legendHtml += `<span><span class="cal-badge" style="background:${catColors[cat]}; color:#1a1a1a; padding:2px 6px;">${catNames[cat]}</span></span>`;
    }
  });

  if (legendHtml !== '') {
    html += `<div class="ot-cal-legend" style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:flex-start; padding:10px 12px 16px;">
      ${legendHtml}
    </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

function onLvDateClick(year, month, day) {
  lvSelectedDate = { year, month, day };
  document.querySelectorAll('#lvCalendar .ot-cal-day').forEach(el => el.classList.remove('selected'));
  const targetCell = document.querySelector(`#lvCalendar .ot-cal-day[data-day="${day}"]`);
  if (targetCell) targetCell.classList.add('selected');

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // 기존 기록이 있으면 자동으로 수정 모드로 열기
  const existing = LEAVE.getDateRecords(dateStr);
  if (existing.length > 0) {
    editLvRecord(existing[0].id);
    return;
  }

  // 새 기록 입력 모드
  const dow = new Date(year, month - 1, day).getDay();
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];

  let dateLabel = `${month}월 ${day}일 (${dowNames[dow]})`;
  if (lvHolidayMap[day]) dateLabel += ` 🔴 ${lvHolidayMap[day]}`;

  document.getElementById('lvPanelDate').textContent = dateLabel;
  document.getElementById('lvStartDate').value = dateStr;
  document.getElementById('lvEndDate').value = dateStr;
  document.getElementById('lvEditId').value = '';
  document.getElementById('lvDeleteBtn').style.display = 'none';
  document.getElementById('lvSaveBtn').textContent = '저장';
  document.getElementById('lvMemo').value = '';
  document.getElementById('lvType').value = 'annual';
  updateLvTypeBtnText('annual');

  onLvTypeChange();
  previewLvCalc();

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
  document.getElementById('lvSaveBtn').textContent = '저장';
  document.getElementById('lvMemo').value = '';
  document.getElementById('lvPreview').innerHTML = '';

  // 오늘 날짜 기본 설정
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
    let effectiveQuota = typeInfo.quota;
    // 가족돌봄(유급): 자녀 2명 이상 → 3일 (제42조, 2021.11 단협)
    if (typeInfo.id === 'family_care_paid') {
      const _pf = typeof PROFILE !== 'undefined' ? PROFILE.load() : null;
      if (_pf && (parseInt(_pf.numChildren) || 0) >= 2) effectiveQuota = 3;
    }
    const records = LEAVE.getYearRecords(year);
    const usedRaw = records.filter(r => r.type === type).reduce((sum, r) => sum + (r.days || 0), 0);
    const used = Math.round(usedRaw * 10) / 10;
    const remain = Math.round((effectiveQuota - usedRaw) * 10) / 10;
    const color = remain <= 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)';
    const refNote = typeInfo.ref ? `<br><span style="color:var(--text-muted); font-size:var(--text-body-normal);">📖 ${typeInfo.ref}</span>` : '';
    quotaBadge.innerHTML = `<div style="padding:6px 10px; border-radius:6px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); font-size:var(--text-body-normal);">
      📊 <strong>${typeInfo.label}</strong> 한도: ${effectiveQuota}일 | 사용: ${used}일 | <span style="color:${color}; font-weight:700;">잔여: ${remain}일</span>
      ${remain <= 0 ? '<br><span style="color:var(--accent-rose)">⚠️ 한도 초과!</span>' : ''}${refNote}
    </div>`;
    quotaBadge.style.display = 'block';
  } else if (typeInfo && typeInfo.usesAnnual) {
    if (lvTotalAnnual > 0) {
      const summary = LEAVE.calcAnnualSummary(year, lvTotalAnnual);
      const otInfo = summary.otEarnedDays > 0 ? ` | 시간외회복: ${summary.otEarnedDays}일` : '';
      quotaBadge.innerHTML = `<div style="padding:6px 10px; border-radius:6px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); font-size:var(--text-body-normal);">
        📅 연차 한도: ${lvTotalAnnual}일 | 사용: ${summary.effectiveUsed}일${otInfo} | <span style="color:var(--accent-emerald); font-weight:700;">잔여: ${summary.remainingAnnual}일</span>
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

  // 새 기록 추가 시 날짜 중복 검사 (수정 모드 제외)
  if (!editId) {
    const year = startDate.split('-')[0];
    const yearRecords = LEAVE.getYearRecords(parseInt(year));
    const overlap = yearRecords.find(r => {
      return new Date(r.startDate) <= new Date(endDate) && new Date(r.endDate) >= new Date(startDate);
    });
    if (overlap) {
      const typeInfo2 = LEAVE.getTypeById(overlap.type);
      alert(`해당 기간에 이미 저장된 휴가가 있습니다.\n(${typeInfo2 ? typeInfo2.label : overlap.type}: ${overlap.startDate} ~ ${overlap.endDate})\n\n날짜를 클릭하면 기존 기록을 수정할 수 있습니다.`);
      return;
    }
  }

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
  document.getElementById('lvSaveBtn').textContent = '수정';

  // 시간차 편집 시 시간 복원
  if (record.type === 'time_leave' && record.startTime && record.endTime) {
    document.getElementById('lvStartTime').value = record.startTime;
    document.getElementById('lvEndTime').value = record.endTime;
  }

  const [y, m, d] = record.startDate.split('-').map(Number);
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dow = new Date(y, m - 1, d).getDay();
  document.getElementById('lvPanelDate').textContent = `${m}월 ${d}일 (${dowNames[dow]})`;

  onLvTypeChange();
  previewLvCalc();

  // 바텀시트 열기
  openLvBottomSheet();
}

function deleteLvRecord() {
  const id = document.getElementById('lvEditId').value;
  if (!id) return;
  // confirm 없이 즉시 삭제 (confirm이 환경에 따라 블록될 수 있음 — 초과근무 삭제와 동일 패턴)
  LEAVE.deleteRecord(id);
  closeLvBottomSheet();
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

    // 연차에 시간외 회복 표시
    const otNote = (q.id === 'annual' && q.otEarnedDays > 0)
      ? `<div style="font-size:11px; color:var(--accent-indigo); margin-top:3px;">시간외 ${q.otEarnedDays}일 회복 (실사용 ${q.rawUsed}일 - ${q.otEarnedDays}일)</div>`
      : '';

    html += `<div style="padding:8px 10px; border-radius:8px; background:var(--bg-glass); border:1px solid var(--border-glass);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-weight:600; font-size:var(--text-body-large);">${q.label}</span>
        <span style="font-size:var(--text-body-normal); font-weight:700; color:${remainColor};">${remainText}</span>
      </div>
      <div class="lv-progress-bar" style="margin-bottom:3px; display:${q.quota !== null ? 'block' : 'none'};">
        <div class="lv-progress-fill" style="width:${pct}%; height:100%; background:${barColor}"></div>
      </div>
      <div style="font-size:var(--text-body-normal); color:var(--text-muted);">${q.used}${q.quota !== null ? '/' + quotaText : '일'} 사용 ${q.overQuota ? '⚠️' : ''}</div>
      ${otNote}
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
    const extra = document.getElementById('lvQuotaExtra');
    if (extra) extra.innerHTML = '';
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
  const round1 = v => Math.round(v);
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

  container.innerHTML = html;

  // ── 월별사용 + 상세기록 → lvQuotaExtra로 이동 ──
  const extraContainer = document.getElementById('lvQuotaExtra');
  if (!extraContainer) return;
  let extraHtml = '';

  // ── 월별 바 차트 (반기 2줄) ──
  const maxMonthDays = Math.max(...Object.values(byMonth), 1);
  extraHtml += '<div style="margin:12px 0 8px; font-size:var(--text-body-normal); font-weight:600; color:var(--text-muted);">월별 사용</div>';
  extraHtml += '<div class="lv-month-bars">';
  for (let m = 1; m <= 12; m++) {
    const d = byMonth[m] || 0;
    const pct = Math.round((d / maxMonthDays) * 100);
    const isCurrentMonth = (m === lvCurrentMonth && year === lvCurrentYear);
    const valInside = pct >= 25 && d > 0;
    extraHtml += `<div class="lv-month-bar${isCurrentMonth ? ' current' : ''}">
      ${d > 0 && !valInside ? `<span class="lv-month-bar-val above">${round1(d)}</span>` : ''}
      <div class="lv-month-bar-fill" style="height:${Math.max(pct, d > 0 ? 10 : 0)}%">
        ${valInside ? `<span class="lv-month-bar-val">${round1(d)}</span>` : ''}
      </div>
      <span class="lv-month-bar-label">${m}월</span>
    </div>`;
  }
  extraHtml += '</div>';

  // ── 상세 기록 (유형별 그룹, 접이식) ──
  // 유형별로 그룹핑
  const grouped = {};
  sorted.forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  extraHtml += `<div style="margin-top:12px;">
    <div class="collapsible-header" onclick="toggleCollapsible('lvRecordDetail')">
      <span style="display:flex; align-items:center; gap:8px;"><span class="toggle-icon">▸</span> 상세 기록 (${sorted.length}건)</span>
    </div>
    <div class="collapsible-body" id="lvRecordDetail" style="display:none; max-height:400px; overflow-y:auto;">
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">`;

  Object.entries(grouped).forEach(([type, records]) => {
    const typeInfo = LEAVE.getTypeById(type);
    const label = typeInfo ? typeInfo.label : type;
    const isPaid = records[0].isPaid;
    const totalDaysGroup = records.reduce((s, r) => s + (r.days || 0), 0);
    const totalImpact = records.reduce((s, r) => s + (r.salaryImpact ? Math.abs(r.salaryImpact) : 0), 0);

    extraHtml += `<div class="lv-record-item" style="flex-direction:column; align-items:stretch; gap:4px; cursor:default; padding:6px 10px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="lv-record-type ${isPaid ? 'paid' : 'unpaid'}">${label}</span>
        <span style="font-size:var(--text-body-normal); font-weight:700; color:${totalImpact ? 'var(--accent-rose)' : 'var(--accent-emerald)'}">
          ${totalImpact ? '-₩' + totalImpact.toLocaleString() : '유급'} · ${Math.round(totalDaysGroup)}일
        </span>
      </div>
      <div style="display:flex; flex-direction:column; gap:1px; padding-left:4px; max-height:calc(var(--text-body-normal, 14px) * 4.8); overflow-y:auto;">`;

    records.forEach(r => {
      const dateDisplay = r.startDate === r.endDate
        ? r.startDate.substring(5)
        : r.startDate.substring(5) + ' ~ ' + r.endDate.substring(5);
      let detail = `${dateDisplay} ${Math.round(r.days || 0)}일`;
      if (r.type === 'time_leave' && r.hours) {
        detail = `${dateDisplay} ${r.startTime || ''}~${r.endTime || ''} (${Math.round(r.hours || 0)}h)`;
      }
      extraHtml += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:var(--text-body-normal); color:var(--text-secondary); cursor:pointer; padding:1px 0;" onclick="editLvRecord('${r.id}')">
        <span>${detail}${r.memo ? ' <span style="color:var(--text-muted)">' + escapeHtml(r.memo) + '</span>' : ''}</span>
      </div>`;
    });

    extraHtml += `</div></div>`;
  });

  extraHtml += '</div></div></div>';

  extraContainer.innerHTML = extraHtml;
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

// ============================================
// 🎓 인터랙티브 튜토리얼 시스템
// ============================================

let tutCurrentStep = 0;
let tutSteps = [];

const TUTORIAL_STEPS = [
  // ── 0: 시작 인사 (화면 중앙, 스포트라이트 없음) ──
  {
    target: null,
    title: '🎓 사용법을 알려드릴게요!',
    body: '실제 화면을 보면서 사용법을 안내해 드릴게요.<br>언제든 <span class="tut-highlight">건너뛰기</span>를 누르면 종료됩니다.',
    position: 'center',
  },
  // ── 1: 개인정보 탭 ──
  {
    target: '.nav-tab[data-tab="profile"]',
    title: '👤 먼저, 개인정보 등록',
    body: '여기서 <span class="tut-highlight">직종·호봉·입사일</span>을 등록하면<br>시급과 연차가 <span class="tut-highlight">자동 계산</span>됩니다.',
    position: 'auto',
  },
  // ── 2: 휴가 탭으로 이동 ──
  {
    target: '.nav-tab[data-tab="leave"]',
    title: '📅 휴가 탭으로 이동',
    body: '휴가를 기록하고 관리하는 곳이에요.<br>탭을 눌러볼게요!',
    position: 'auto',
    autoAction: () => switchTab('leave'),
  },
  // ── 3: 캘린더에서 날짜 선택 ──
  {
    target: '#lvCalendar',
    title: '📆 캘린더에서 날짜 선택',
    body: '기록하고 싶은 <span class="tut-highlight">날짜를 탭</span>하면<br>아래에서 입력 창이 올라와요.',
    position: 'below',
  },
  // ── 4: 실제 연차 저장 ──
  {
    target: null,
    title: '🏖️ 연차 등록 — 직접 저장해보세요!',
    body: '',
    position: 'mock-save',
    mockSheet: () => {
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
      const dow = ['일','월','화','수','목','금','토'][now.getDay()];
      const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      return `
        <div style="text-align:center; margin-bottom:12px;">
          <span style="font-weight:700; font-size:var(--text-title-large); color:var(--text-primary);">${m}월 ${d}일 (${dow})</span>
        </div>
        <div class="tut-mock-field active-field">
          <span class="label">유형</span>
          <span style="font-weight:600;">🏖️ 연차</span>
        </div>
        <div class="tut-mock-field">
          <span class="label">종료일</span>
          <span>${dateStr}</span>
        </div>
        <div class="tut-mock-field">
          <span class="label">메모</span>
          <span style="color:var(--text-muted);">튜토리얼 연습</span>
        </div>
        <div style="margin-top:14px;">
          <button class="tut-mock-btn save" style="border:none; cursor:pointer; width:100%;" onclick="tutSaveDemoLeave()">💾 저장하기</button>
        </div>
        <p id="tutSaveResult" style="text-align:center; margin-top:10px; font-size:var(--text-body-normal); color:var(--text-muted);">
          ↑ 버튼을 눌러 실제로 저장해보세요!
        </p>
      `;
    },
  },
  // ── 5: 수정·삭제 방법 (모의 화면) ──
  {
    target: null,
    title: '✏️ 수정 & 삭제 방법',
    body: '',
    position: 'mock-edit',
    mockSheet: () => {
      const now = new Date();
      const m = now.getMonth() + 1, d = now.getDate();
      const dow = ['일','월','화','수','목','금','토'][now.getDay()];
      return `
        <div style="text-align:center; margin-bottom:12px;">
          <span style="font-weight:700; font-size:var(--text-title-large); color:var(--text-primary);">${m}월 ${d}일 (${dow})</span>
          <span style="font-size:var(--text-body-normal); color:var(--accent-indigo); font-weight:600; display:block; margin-top:2px;">✏️ 수정 모드</span>
        </div>
        <div class="tut-mock-field active-field">
          <span class="label">유형</span>
          <span style="font-weight:600;">🏖️ 연차 → 🩺 병가</span>
          <span style="margin-left:auto; color:var(--accent-indigo); font-size:12px; font-weight:700;">변경!</span>
        </div>
        <div style="display:flex; gap:10px; margin-top:14px;">
          <button class="tut-mock-btn delete" style="flex:1; border:none; cursor:pointer;" onclick="tutDeleteDemoLeave()">🗑 삭제</button>
          <div class="tut-mock-btn save" style="flex:1; opacity:0.5;">💾 수정</div>
        </div>
        <p id="tutDeleteResult" style="text-align:center; margin-top:10px; font-size:var(--text-body-normal); color:var(--text-secondary); line-height:1.6;">
          같은 날짜를 다시 탭하면 <span style="color:var(--accent-indigo); font-weight:600;">수정 모드</span>로 열려요.<br>
          유형을 바꿔서 저장하거나, <span style="color:var(--accent-rose); font-weight:600;">삭제</span>를 눌러 방금 저장한 기록을 지워보세요!
        </p>
      `;
    },
  },
  // ── 6: 시간외 탭 안내 ──
  {
    target: '.nav-tab[data-tab="overtime"]',
    title: '⏰ 시간외·온콜도 동일!',
    body: '시간외·온콜 기록도 <span class="tut-highlight">같은 방식</span>이에요.<br><br>📆 날짜 탭 → 유형·시간 입력 → 저장<br>✏️ 같은 날짜 다시 탭 → 수정 또는 삭제<br><br><span style="font-size:0.9em; color:var(--text-muted);">캘린더 사용법이 휴가와 동일합니다!</span>',
    position: 'auto',
    autoAction: () => switchTab('overtime'),
  },
  // ── 7: 완료 ──
  {
    target: null,
    title: '🎉 튜토리얼 완료!',
    body: '이제 직접 사용해보세요!<br><br>💡 <span class="tut-highlight">개인정보 먼저 등록</span>하면<br>시급·연차가 자동으로 계산됩니다.<br><br><span style="font-size:0.85em; color:var(--text-muted);">홈 탭 하단에서 튜토리얼을 다시 볼 수 있어요.</span>',
    position: 'center',
    isLast: true,
  },
];

function startTutorial() {
  // 온보딩 모달 닫기
  const onb = document.getElementById('onboardingModal');
  if (onb) onb.style.display = 'none';

  tutCurrentStep = 0;
  tutSteps = TUTORIAL_STEPS;

  const overlay = document.getElementById('tutorialOverlay');
  overlay.classList.add('active');
  overlay.style.display = '';

  // backdrop 클릭 시 아무 동작 안 하게
  document.getElementById('tutorialBackdrop').onclick = (e) => e.stopPropagation();

  showTutorialStep(0);
  localStorage.setItem('tutorial_completed', 'true');
}

function showTutorialStep(idx) {
  tutCurrentStep = idx;
  const step = tutSteps[idx];
  if (!step) { endTutorial(); return; }

  const spotlight = document.getElementById('tutorialSpotlight');
  const tooltip = document.getElementById('tutorialTooltip');
  const arrow = document.getElementById('tutorialArrow');
  const mockSheet = document.getElementById('tutorialMockSheet');
  const progress = document.getElementById('tutorialProgress');
  const nextBtn = document.getElementById('tutorialNext');
  const skipBtn = document.getElementById('tutorialSkip');

  // 모의 시트 숨기기
  mockSheet.style.display = 'none';

  // autoAction 실행
  if (step.autoAction) step.autoAction();
  if (step.beforeShow) step.beforeShow();

  // 진행률
  progress.textContent = `${idx + 1} / ${tutSteps.length}`;

  // 마지막 스텝
  if (step.isLast) {
    nextBtn.textContent = '완료! 🚀';
    nextBtn.onclick = () => endTutorial();
    skipBtn.style.display = 'none';
  } else {
    nextBtn.textContent = '다음 →';
    nextBtn.onclick = () => nextTutorialStep();
    skipBtn.style.display = '';
  }

  // 제목/본문
  document.getElementById('tutorialTitle').innerHTML = step.title;
  document.getElementById('tutorialBody').innerHTML = step.body;

  // 모의 바텀시트 스텝 — 제목/버튼을 시트 안에 통합
  if (step.position === 'mock-save' || step.position === 'mock-edit') {
    spotlight.style.display = 'none';
    arrow.style.display = 'none';
    tooltip.style.display = 'none'; // 별도 툴팁 숨김

    const stepTotal = tutSteps.length;
    const isLast = !!step.isLast;
    const nextLabel = isLast ? '완료! 🚀' : '다음 →';
    const skipHtml = isLast ? '' : `<button class="tutorial-btn" onclick="endTutorial()" style="font-size:var(--text-body-normal);">건너뛰기</button>`;

    mockSheet.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div class="tutorial-tooltip-title" style="margin:0;">${step.title}</div>
        <span class="tutorial-progress">${idx + 1} / ${stepTotal}</span>
      </div>
      ${step.mockSheet()}
      <div style="display:flex; justify-content:flex-end; align-items:center; gap:8px; margin-top:16px; padding-top:12px; border-top:1px solid var(--border-glass);">
        ${skipHtml}
        <button class="tutorial-btn primary" onclick="nextTutorialStep()">${nextLabel}</button>
      </div>
    `;
    mockSheet.style.display = 'block';
    return;
  }

  // 센터 모드 (타겟 없음)
  if (step.position === 'center' || !step.target) {
    spotlight.style.display = 'none';
    arrow.style.display = 'none';

    tooltip.style.display = 'block';
    tooltip.style.left = '50%';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    tooltip.style.bottom = '';
    return;
  }

  // 타겟 요소 하이라이트
  const el = document.querySelector(step.target);
  if (!el) { nextTutorialStep(); return; }

  // 스크롤하여 보이게
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    const rect = el.getBoundingClientRect();
    const pad = 6;

    spotlight.style.display = 'block';
    spotlight.style.left = (rect.left - pad) + 'px';
    spotlight.style.top = (rect.top - pad) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';
    spotlight.classList.add('tutorial-spotlight-pulse');

    // 툴팁 위치
    tooltip.style.display = 'block';
    tooltip.style.transform = '';

    const tooltipW = Math.min(320, window.innerWidth - 48);
    let tooltipLeft = rect.left + rect.width / 2 - tooltipW / 2;
    tooltipLeft = Math.max(16, Math.min(tooltipLeft, window.innerWidth - tooltipW - 16));

    tooltip.style.left = tooltipLeft + 'px';
    tooltip.style.width = tooltipW + 'px';

    // 위치 결정: 'auto'면 요소가 화면 하단 절반에 있으면 위에, 아니면 아래에 배치
    let pos = step.position;
    if (pos === 'auto') {
      const midY = window.innerHeight / 2;
      pos = (rect.top > midY) ? 'above' : 'below';
    }

    if (pos === 'below') {
      tooltip.style.top = (rect.bottom + pad + 16) + 'px';
      tooltip.style.bottom = '';
      arrow.style.display = 'block';
      arrow.className = 'tutorial-tooltip-arrow top';
    } else if (pos === 'above') {
      tooltip.style.top = '';
      tooltip.style.bottom = (window.innerHeight - rect.top + pad + 16) + 'px';
      arrow.style.display = 'block';
      arrow.className = 'tutorial-tooltip-arrow bottom';
    }
  }, 350);
}

function nextTutorialStep() {
  tutCurrentStep++;
  if (tutCurrentStep >= tutSteps.length) {
    endTutorial();
    return;
  }
  // 리셋: 모든 요소 숨기고 애니메이션 초기화
  document.getElementById('tutorialTooltip').style.display = 'none';
  document.getElementById('tutorialMockSheet').style.display = 'none';
  const sl = document.getElementById('tutorialSpotlight');
  sl.classList.remove('tutorial-spotlight-pulse');
  sl.style.display = 'none';

  setTimeout(() => showTutorialStep(tutCurrentStep), 250);
}

// ── 튜토리얼 실제 저장/삭제 헬퍼 ──
let tutDemoRecordId = null;

function tutSaveDemoLeave() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const record = LEAVE.addRecord({
    type: 'annual',
    startDate: dateStr,
    endDate: dateStr,
    memo: '튜토리얼 연습',
  });
  tutDemoRecordId = record.id;

  const resultEl = document.getElementById('tutSaveResult');
  if (resultEl) {
    resultEl.innerHTML = '✅ <span style="color:var(--accent-emerald); font-weight:700;">저장 완료!</span> 다음 단계에서 삭제할 수 있어요.';
  }
  // 저장 버튼 비활성화
  const btn = document.querySelector('#tutorialMockSheet .tut-mock-btn.save');
  if (btn) {
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    btn.textContent = '✅ 저장됨';
  }
}

function tutDeleteDemoLeave() {
  if (tutDemoRecordId) {
    LEAVE.deleteRecord(tutDemoRecordId);
    tutDemoRecordId = null;
  }
  const resultEl = document.getElementById('tutDeleteResult');
  if (resultEl) {
    resultEl.innerHTML = '🗑 <span style="color:var(--accent-rose); font-weight:700;">삭제 완료!</span> 깔끔하게 지워졌어요.';
  }
  const btn = document.querySelector('#tutorialMockSheet .tut-mock-btn.delete');
  if (btn) {
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    btn.textContent = '✅ 삭제됨';
  }
}

function endTutorial() {
  // 튜토리얼 중 저장한 데모 기록이 남아있으면 자동 삭제
  if (tutDemoRecordId) {
    LEAVE.deleteRecord(tutDemoRecordId);
    tutDemoRecordId = null;
  }

  const overlay = document.getElementById('tutorialOverlay');
  overlay.classList.remove('active');
  overlay.style.display = 'none';

  document.getElementById('tutorialTooltip').style.display = 'none';
  document.getElementById('tutorialMockSheet').style.display = 'none';
  document.getElementById('tutorialSpotlight').style.display = 'none';
  document.getElementById('tutorialSpotlight').classList.remove('tutorial-spotlight-pulse');

  // 홈 탭으로 이동
  switchTab('home');
}
