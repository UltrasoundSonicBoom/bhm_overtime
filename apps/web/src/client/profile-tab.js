// profile-tab.js — 프로필 탭 UI + 저장
// Phase 5: cross-module 명시 named import (PROFILE_FIELDS bare 참조 회귀 종결)
import { PROFILE, PROFILE_FIELDS } from '@snuhmate/profile/profile';
import { CALC } from '@snuhmate/calculators';
import { DATA } from '@snuhmate/data';
import { PAYROLL } from '@snuhmate/profile/payroll';
import { OVERTIME } from '@snuhmate/profile/overtime';
import { LEAVE } from '@snuhmate/profile/leave';
import { escapeHtml } from '@snuhmate/shared-utils';
import {
  _loadWorkHistory, _saveWorkHistory, renderWorkHistory,
  _showWorkHistoryUpdateBanner,
} from '@snuhmate/profile/work-history';
import { CAREER } from '@snuhmate/profile/career-events';

// ── 개인정보 탭 초기화 ──
// Phase 5-followup: 명세서 업로드 후 info 탭 재방문 시 form 비어 있음 회귀 fix.
// 기존: _bootstrapProfileTab 가 1회만 form 채움 → 이후 진입 시 form 갱신 누락.
// 수정: 매번 진입 시 PROFILE.applyToForm 호출 (저장 상태 항상 반영).
function initProfileTab() {
  const saved = PROFILE.load();
  if (saved) {
    PROFILE.applyToForm(saved, PROFILE_FIELDS);
    if (typeof updateFamilyUI === 'function') updateFamilyUI();
    if (saved.birthDate && typeof syncBirthDateToRetirement === 'function') {
      syncBirthDateToRetirement(saved.birthDate);
    }
    updateProfileSummary(saved);
    updateProfileTitle(saved.name);
    const profileStatusEl = document.getElementById('profileStatus');
    if (profileStatusEl) {
      profileStatusEl.textContent = '저장됨 ✓';
      profileStatusEl.className = 'badge emerald';
    }
    if (typeof _collapseBasicFieldsWithPreview === 'function') {
      _collapseBasicFieldsWithPreview(saved);
    }
  } else {
    updateProfileTitle('');
  }
  // 커리어 타임라인: 헤더 + 필터 핸들러 바인딩 → 렌더
  if (typeof window !== 'undefined' && window.renderWorkHistory) {
    window.renderWorkHistory();
  } else {
    renderWorkHistory();
  }
}

// ── 책갈피: 개인 정보 ↔ 근무 정보 전환 ──
function switchProfileSection(section) {
  var personal = document.getElementById('profileSectionPersonal');
  var work = document.getElementById('profileSectionWork');
  var bmP = document.getElementById('bmPersonal');
  var bmW = document.getElementById('bmWork');
  if (!personal || !work) return;
  var isWork = section === 'work';
  personal.style.display = isWork ? 'none' : 'block';
  work.style.display = isWork ? 'block' : 'none';
  if (bmP && bmW) {
    bmP.setAttribute('aria-selected', isWork ? 'false' : 'true');
    bmW.setAttribute('aria-selected', isWork ? 'true' : 'false');
    bmP.classList.toggle('active', !isWork);
    bmW.classList.toggle('active', isWork);
    var accent = document.getElementById('profileTabAccent');
    if (accent) accent.style.background = isWork ? '#0891b2' : '#4f46e5';
  }
  if (isWork) {
    if (typeof window !== 'undefined' && window.renderWorkHistory) {
      window.renderWorkHistory();
    } else {
      renderWorkHistory();
    }
    if (typeof renderResumeSections === 'function') renderResumeSections();
  }
}

// 프로필 정보 기반 자동 시드 카드 생성 (사용자 확인 후 저장)
function _seedFirstWorkFromProfile() {
  try {
    var profile = PROFILE.load() || {};
    // 저장되지 않았더라도 현재 폼에 입력된 값을 폴백으로 사용 → "보이는 대로" 시드
    var deptEl = document.getElementById('pfDepartment');
    var hireEl = document.getElementById('pfHireDate');
    var jobEl = document.getElementById('pfJobType');
    var formDept = deptEl && deptEl.value ? deptEl.value.trim() : '';
    var formHire = hireEl && hireEl.value ? hireEl.value.trim() : '';
    var formJob = jobEl && jobEl.value ? jobEl.value.trim() : '';
    var hireStr = profile.hireDate || formHire;
    var dept = profile.department || formDept;
    var jobType = profile.jobType || formJob;
    if (!hireStr || !dept) return null;
    var hospital = profile.hospital || '서울대학교병원';
    var hire = PROFILE.parseDate ? PROFILE.parseDate(hireStr) : null;
    var fromMonth = '';
    if (hire) {
      var m = String(hire.getMonth() + 1).padStart(2, '0');
      fromMonth = hire.getFullYear() + '-' + m;
    }
    return {
      id: Date.now().toString(36) + '_seed',
      workplace: hospital,
      dept: dept,
      from: fromMonth,
      to: '',
      role: jobType,
      desc: '',
      rotations: [],
      source: 'auto',   // Phase 4-A: 자동 시드 마킹 (rebuildWorkHistoryFromPayslips 와 일관)
      updatedAt: new Date().toISOString()
    };
  } catch (e) { return null; }
}

function acceptSeededWorkHistory() {
  var seed = _seedFirstWorkFromProfile();
  if (!seed) return;
  var list = _loadWorkHistory();
  list.push(seed);
  _saveWorkHistory(list);
  renderWorkHistory();
}

// ── E2: AI 이력서 생성 — 2026-04-15 제거 (구조화 데이터만으로 PDF 출력) ──────

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
    if (span) span.textContent = span.textContent.replace(/[▸▾▼]/, isOpen ? '▸' : '▾');
  }
  // 기본 정보 프리뷰: 열면 숨김, 닫으면 표시
  if (id === 'pfBasicFields') {
    const preview = document.getElementById('pfBasicPreview');
    if (preview && preview.textContent) preview.style.display = isOpen ? 'block' : 'none';
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

// ── 초기화 (profile 탭이 처음 로드된 직후 1회 실행) ──
window._bootstrapProfileTab = (function () {
  var called = false;
  return function () {
    if (called) return;
    called = true;
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

  // 생년월일 → 퇴직금 탭 동기화 + 유효성 검사
  const pfBirthDateEl = document.getElementById('pfBirthDate');
  const pfBirthErr = document.getElementById('pfBirthDateErr');
  if (pfBirthDateEl) {
    pfBirthDateEl.addEventListener('input', (e) => {
      const err = _validateBirthDate(e.target.value);
      if (pfBirthErr) pfBirthErr.textContent = err || '';
      e.target.setCustomValidity(err || '');
      if (!err) syncBirthDateToRetirement(e.target.value);
    });
  }

  // 병원 + 사번 → 병원 이메일 자동 생성
  const _HOSPITAL_EMAIL_MAP = {
    '서울대학교병원': 'snuh.org',
    '어린이병원':     'snuh.org',
    '강남센터':       'snuh.org',
    '보라매병원':     'brmh.org',
    '국립교통재활병원': 'ntrh.or.kr',
  };
  function _updateHospitalEmail() {
    const hospital = document.getElementById('pfHospital')?.value || '';
    const empNo    = document.getElementById('pfEmployeeNumber')?.value?.trim() || '';
    const domain   = _HOSPITAL_EMAIL_MAP[hospital];
    const emailEl  = document.getElementById('pfHospitalEmail');
    if (emailEl) emailEl.value = (domain && empNo) ? `${empNo}@${domain}` : '';
  }
  document.getElementById('pfHospital')?.addEventListener('change', _updateHospitalEmail);
  document.getElementById('pfEmployeeNumber')?.addEventListener('input', _updateHospitalEmail);

  // 부서 변경 시 근무이력 시드 재평가 (저장 전이라도 즉시 반영)
  const pfDeptEl = document.getElementById('pfDepartment');
  if (pfDeptEl) {
    pfDeptEl.addEventListener('input', () => {
      try { if (typeof renderWorkHistory === 'function') renderWorkHistory(); } catch (e) {}
    });
  }

  // 입사일 → 근속연수 표시 + 근속가산기본급 자동 감지 (2016.2 이전 입사자) + 호봉 자동 제안
  const pfHireDateEl = document.getElementById('pfHireDate');
  const pfHireErr = document.getElementById('pfHireDateErr');
  pfHireDateEl.addEventListener('input', (e) => {
    const parsed = PROFILE.parseDate(e.target.value);
    const svcEl = document.getElementById('pfServiceDisplay');
    if (parsed) {
      const err = _validateHireDate(parsed);
      if (pfHireErr) pfHireErr.textContent = err || '';
      e.target.setCustomValidity(err || '');
      if (err) { if (svcEl) svcEl.textContent = ''; return; }
      const years = PROFILE.calcServiceYears(parsed);
      if (svcEl) svcEl.textContent = `→ ${parsed} (근속 ${years}년)`;
      const hireDate = new Date(parsed);
      const seniorityThreshold = new Date('2016-02-01');
      document.getElementById('pfSeniority').checked = hireDate < seniorityThreshold;
      // 호봉 자동 제안
      _suggestYear(parsed);
    } else if (e.target.value.length > 0) {
      if (svcEl) svcEl.textContent = '※ YYYY-MM-DD, YYYYMMDD, YYYY.MM.DD 형식';
    } else {
      if (svcEl) svcEl.textContent = '';
      document.getElementById('pfSeniority').checked = false;
      const hint = document.getElementById('pfYearHint');
      if (hint) hint.textContent = '';
      if (pfHireErr) pfHireErr.textContent = '';
      e.target.setCustomValidity('');
    }
    // 입사일 변경 즉시 근무이력 시드 재평가
    try { if (typeof renderWorkHistory === 'function') renderWorkHistory(); } catch (ex) {}
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
    // 생년월일 → 퇴직금 탭 초기 동기화
    if (saved.birthDate) syncBirthDateToRetirement(saved.birthDate);
    updateFamilyUI(); // 가족/자녀 수 기반 UI 표시
    updateProfileSummary(saved);
    updateProfileTitle(saved.name);
    const profileStatusEl = document.getElementById('profileStatus');
    if (profileStatusEl) {
      profileStatusEl.textContent = '저장됨 ✓';
      profileStatusEl.className = 'badge emerald';
    }
    // 저장된 데이터가 있으면 기본 정보 접힘 + 프리뷰 표시
    _collapseBasicFieldsWithPreview(saved);
  } else {
    // 신규 유저: 기본 정보 펼침
    const basicFields = document.getElementById('pfBasicFields');
    if (basicFields) basicFields.style.display = 'block';
  }

  // 급여 시뮬레이터: 연도/월 변경 시 자동 업데이트
  document.getElementById('psSimYear').addEventListener('change', () => autoFillMonth());
  document.getElementById('psSimMonth').addEventListener('change', () => autoFillMonth());

  // 초기 로드 시 현재 선택된 연도/월로 자동설정
  autoFillMonth();

  // REMOVED auth: ?mode=family 배너 + authContainer (Google 로그인 UI) — 로컬 전용 앱

  // backupSection: 항상 표시
  const backupSection = document.getElementById('localBackupSection');
  if (backupSection) backupSection.style.display = 'block';

  // ── [Cloud Sync Callback] ──
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
      profile: 'snuhmate_hr_profile_guest',
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
        migrated = true;
      }

      // 시간외: 클라우드 레코드가 없을 때만 이전
      if (!(cloudData.overtime && cloudData.overtime.length > 0) && rawGuestOt) {
        localStorage.setItem(OVERTIME.STORAGE_KEY, rawGuestOt);
        migrated = true;
      }

      // 휴가: 클라우드 레코드가 없을 때만 이전
      if (!(cloudData.leave && cloudData.leave.length > 0) && rawGuestLeave) {
        localStorage.setItem(LEAVE.STORAGE_KEY, rawGuestLeave);
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
  };
})();

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

// 기본 정보 접힘 + 한줄 프리뷰 (저장된 데이터가 있을 때)
function _collapseBasicFieldsWithPreview(data) {
  const body = document.getElementById('pfBasicFields');
  const preview = document.getElementById('pfBasicPreview');
  const badge = document.getElementById('pfBasicBadge');
  const header = document.getElementById('pfBasicHeader');
  if (!body || !preview || !data) return;

  // 접기
  body.style.display = 'none';
  if (header) {
    const icon = header.querySelector('.toggle-icon');
    if (icon) icon.textContent = '▸';
  }

  // 프리뷰 텍스트 생성
  const parts = [];
  if (data.name) parts.push(data.name);
  if (data.gender === 'M') parts.push('남');
  else if (data.gender === 'F') parts.push('여');
  if (data.birthDate) parts.push(data.birthDate);
  if (data.department) parts.push(data.department);
  const jobEl = document.getElementById('pfJobType');
  const gradeEl = document.getElementById('pfGrade');
  if (jobEl && jobEl.selectedIndex > 0) parts.push(jobEl.options[jobEl.selectedIndex].text);
  if (gradeEl && gradeEl.selectedIndex > 0) parts.push(gradeEl.options[gradeEl.selectedIndex].text);
  const yearEl = document.getElementById('pfYear');
  if (yearEl) parts.push(yearEl.options[yearEl.selectedIndex].text);

  preview.textContent = parts.join(' · ') || '저장된 정보';
  preview.style.display = 'block';
  if (badge) badge.style.display = 'inline-block';

  // 급여탭 안내 링크 숨김 (이미 데이터 있으면 불필요)
  const link = document.getElementById('pfPayslipLink');
  if (link) link.style.display = 'none';
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
  // 부서/입사일 저장 직후 근무이력 자동 시드 재평가
  try { if (typeof renderWorkHistory === 'function') renderWorkHistory(); } catch (e) {}
  document.getElementById('profileStatus').textContent = '저장됨 ✓';
  document.getElementById('profileStatus').className = 'badge emerald';
  // Variant C: fields stay visible after save
  // Q&A 카드 갱신
  PAYROLL.init();
  // 휴가 연차 한도 갱신 및 UI 리렌더링
  if (typeof applyProfileToLeave === 'function') {
    applyProfileToLeave();
    if (typeof populateLvTypeSelect === 'function') populateLvTypeSelect();
    // ESM 모듈 cross-reference: lvInitialized 는 leave-tab.js 모듈 스코프 → window 노출 사용
    if (typeof refreshLvCalendar === 'function' && window.lvInitialized) refreshLvCalendar();
  }
  // 저장 성공 CTA 표시 (직종별 분기)
  const savedCTA = document.getElementById('profileSavedCTA');
  if (savedCTA) {
    const ctaDesc = document.getElementById('profileSavedCTADesc');
    const ctaBtn = document.getElementById('profileSavedCTABtn');
    const ctaJobType = document.getElementById('pfJobType')?.value;
    if (ctaDesc && ctaBtn) {
      if (ctaJobType === '간호직') {
        ctaDesc.textContent = '정보가 저장됐어요. 이번 달 야간 근무와 리커버리데이를 확인해볼까요?';
        ctaBtn.textContent = '🌙 이번 달 야간·리커버리데이 확인하기 →';
        ctaBtn.onclick = function() { switchTab('overtime'); };
      } else if (ctaJobType === '보건직') {
        ctaDesc.textContent = '정보가 저장됐어요. 온콜 대기 및 출동 수당을 계산해볼까요?';
        ctaBtn.textContent = '📟 온콜 대기·출동 수당 계산하기 →';
        ctaBtn.onclick = function() { switchTab('overtime'); };
      } else if (ctaJobType === '사무직') {
        ctaDesc.textContent = '정보가 저장됐어요. 연차 현황과 시간외 수당을 확인해볼까요?';
        ctaBtn.textContent = '📅 연차 현황 및 시간외 수당 확인하기 →';
        ctaBtn.onclick = function() { switchTab('leave'); };
      } else {
        ctaDesc.textContent = '정보가 저장됐어요. 이번 달 시간외 수당을 계산해볼까요?';
        ctaBtn.textContent = '⏰ 시간외 계산하러 가기 →';
        ctaBtn.onclick = function() { switchTab('overtime'); };
      }
    }
    savedCTA.style.display = 'block';
  }
  // 홈 힌트 배너 숨기기
  const homeNudge = document.getElementById('homeProfileNudge');
  if (homeNudge) homeNudge.style.display = 'none';
  // 저장 후 기본 정보 접힘 + 프리뷰
  _collapseBasicFieldsWithPreview(profile);
}

// Phase 5-followup: 사용자 데이터 완전 초기화 (다른 사람이 써도 흔적 0)
// 1) 자동 백업 다운로드 (안전 마진)
// 2) 1단계 confirm (정말 삭제할 건지)
// 3) 모든 사용자 도메인 키 wipe
// 4) 페이지 새로고침 (메모리 상태도 초기화)
// 단일 진실 원천 — 사용자 도메인 데이터 키 패턴
// 새 키 추가 시 이 목록 갱신 PR 필수 (docs/superpowers/specs/2026-04-27-data-lifecycle-policy.md)
const USER_DATA_PATTERNS = [
  /^snuhmate_hr_profile/,              // PROFILE
  /^overtimeRecords/,                   // OVERTIME (prefix 없음)
  /^leaveRecords/,                      // LEAVE
  /^snuhmate_work_history/,             // 근무이력
  /^snuhmate_last_edit_/,               // 새 snake_case
  /^payslip_/,                          // 급여명세서
  /^otManualHourly/,                    // 수동 시급
  /^overtimePayslipData/,               // 명세서 시간외 보정
  /^_orphan_/,                          // orphan recovery
  /^snuhmate_reg_favorites/,            // 규정 즐겨찾기
  /^payroll_compare_history/,
  /^cardnews\./,                        // 카드뉴스 사용자 위젯 설정
  /^snuhmate_demo_mode$/,
  /^hwBannerDismissed$/,
];

// 시스템 메타 — KEEP (디바이스 / 마이그레이션 / 테마 / 온보딩 진행상태)
const CLEAR_KEEP_KEYS = new Set([
  'snuhmate_local_uid',
  'snuhmate_device_id',
  'snuhmate_anon_id',
  'theme', 'snuhmate-theme',
  'snuhmate_leave_migrated_v1',
  'snuhmate_debug_parser',
  'onboarding_seen_v2',
  'onboarding_count',
  // snuhmate_settings 는 PII 필드만 셀렉티브 wipe (_wipeSettingsPII)
]);

// snuhmate_settings 안에서 PII 만 wipe — 사용자 설정 (driveEnabled 등) 은 보존
const SETTINGS_PII_FIELDS = ['googleSub', 'googleEmail', 'cachedProfile', 'lastSync', 'pinHash', 'displayName'];

function _wipeSettingsPII() {
  ['snuhmate_settings'].forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const settings = JSON.parse(raw);
      let changed = false;
      for (const f of SETTINGS_PII_FIELDS) {
        if (f in settings) { delete settings[f]; changed = true; }
      }
      if (changed) localStorage.setItem(key, JSON.stringify(settings));
    } catch (e) { /* noop */ }
  });
}

function _collectUserDataKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || CLEAR_KEEP_KEYS.has(k)) continue;
    if (USER_DATA_PATTERNS.some(p => p.test(k))) keys.push(k);
  }
  return keys;
}

function _downloadFullBackup() {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    exportType: 'full',
    keys: {},
  };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (USER_DATA_PATTERNS.some(p => p.test(k))) {
      data.keys[k] = localStorage.getItem(k);
    }
  }
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const yyyymmdd = new Date().toISOString().split('T')[0];
    a.download = `snuh_backup_full_${yyyymmdd}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) { return false; }
}

function _executeFullClear(keys) {
  keys.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
  // snuhmate_settings 의 PII 필드 셀렉티브 wipe (계정 설정은 보존)
  _wipeSettingsPII();
  Object.values(PROFILE_FIELDS).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = false;
    else if (el.type === 'number') el.value = 0;
    else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  updateProfileTitle('');
  if (typeof window.__snuhmateReloadHook === 'function') {
    window.__snuhmateReloadHook();
  } else {
    setTimeout(() => window.location.reload(), 100);
  }
}

// Phase 5-followup UX: native confirm 대신 custom modal — [백업 저장] [모두 삭제] [취소] 3 버튼
// 사용자 의도: 자동 백업 X, 명시적 [백업 저장] 버튼으로 시각 구별
function _openClearProfileModal(keys) {
  const old = document.getElementById('clearProfileModal');
  if (old) old.remove();

  const payslipCount = keys.filter(k => /^payslip_/.test(k)).length;
  const otherCount = keys.length - payslipCount;

  const overlay = document.createElement('div');
  overlay.id = 'clearProfileModal';
  overlay.className = 'fixed inset-0 bg-black/55 z-[99999] flex items-center justify-center p-4';

  const card = document.createElement('div');
  card.className = [
    'bg-[var(--bg-card)]',
    'border border-[var(--border-glass)]',
    'rounded-[var(--radius-md)]',
    'shadow-[var(--shadow-lg)]',
    'max-w-[440px] w-full p-6',
  ].join(' ');

  const title = document.createElement('h2');
  title.textContent = '⚠️ 모든 사용자 데이터 초기화';
  title.className = 'text-[var(--color-status-error,#dc2626)] font-bold text-[length:var(--text-title-large)] m-0 mb-3';
  card.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'text-sm leading-relaxed text-[var(--text-primary)] mb-3';
  desc.textContent = '다음 데이터를 모두 삭제합니다 (되돌릴 수 없습니다):';
  card.appendChild(desc);

  const ul = document.createElement('ul');
  ul.className = 'text-sm text-[var(--text-secondary)] mb-4 pl-5 leading-relaxed';
  [
    '개인정보 / 시간외 / 휴가 / 근무이력',
    `급여명세서 ${payslipCount}개`,
    `기타 사용자 데이터 ${otherCount}개`,
  ].forEach(t => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
  card.appendChild(ul);

  const note = document.createElement('p');
  note.className = 'mb-[18px] px-3 py-2.5 bg-[var(--color-status-warning-bg,#fef3c7)] rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] leading-relaxed';
  note.appendChild(document.createTextNode('💡 삭제 전 '));
  const noteStrong = document.createElement('strong');
  noteStrong.textContent = '[백업 저장]';
  note.appendChild(noteStrong);
  note.appendChild(document.createTextNode('을 눌러 현재 데이터를 안전하게 보관하세요.'));
  card.appendChild(note);

  const backupStatus = document.createElement('div');
  backupStatus.id = 'clearProfileBackupStatus';
  backupStatus.className = 'mb-3.5 px-3 py-2 bg-[var(--bg-muted,#f3f4f6)] rounded-[var(--radius-sm)] text-xs text-[var(--text-muted)] min-h-[1.4em]';
  backupStatus.textContent = '백업 미저장';
  card.appendChild(backupStatus);

  const btnRow = document.createElement('div');
  btnRow.className = 'flex gap-2 flex-wrap';

  // [백업 저장하기] — btn-primary, full width
  const btnBackup = document.createElement('button');
  btnBackup.type = 'button';
  btnBackup.textContent = '💾 백업 저장하기';
  btnBackup.className = 'btn btn-primary btn-full flex-[1_1_100%]';
  btnBackup.onclick = function () {
    const ok = _downloadFullBackup();
    backupStatus.textContent = ok ? '✅ 백업 다운로드됨 — 안전하게 삭제 가능' : '⚠️ 백업 다운로드 실패';
    backupStatus.style.background = ok ? 'var(--color-status-success-bg,#dcfce7)' : 'var(--color-status-error-bg,#fee2e2)';
    backupStatus.style.color = ok ? 'var(--color-status-success,#166534)' : 'var(--color-status-error,#991b1b)';
    btnBackup.disabled = true;
    btnBackup.style.opacity = '0.5';
    btnBackup.style.cursor = 'default';
    btnBackup.textContent = '✅ 백업 저장됨';
  };
  btnRow.appendChild(btnBackup);

  // [취소] — btn-secondary
  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.textContent = '취소';
  btnCancel.className = 'btn btn-secondary justify-center flex-[1_1_45%]';
  btnCancel.onclick = function () { overlay.remove(); };
  btnRow.appendChild(btnCancel);

  // [모두 삭제] — 위험 (rose 컬러)
  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '🗑 모두 삭제';
  btnDelete.className = 'btn justify-center flex-[1_1_45%] bg-[var(--color-status-error,#dc2626)] text-white border-none hover:bg-[#b91c1c]';
  btnDelete.onclick = function () {
    overlay.remove();
    _executeFullClear(keys);
  };
  btnRow.appendChild(btnDelete);

  card.appendChild(btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.tabIndex = -1;
  overlay.focus();
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { overlay.remove(); }
  });
}

function clearProfile() {
  const keys = _collectUserDataKeys();
  if (keys.length === 0) {
    if (typeof alert === 'function') alert('초기화할 사용자 데이터가 없습니다.');
    return;
  }
  // 테스트 hook: 자동 confirm + 즉시 wipe (modal 우회)
  if (typeof window.__snuhmateConfirmClearForTest === 'function' && window.__snuhmateConfirmClearForTest()) {
    _executeFullClear(keys);
    return;
  }
  _openClearProfileModal(keys);
}

// ═══════════ 날짜 유효성 검사 ═══════════
/**
 * 생년월일: 만 18세 미만(미성년자) 입력 차단.
 * 반환값: 오류 문자열 | null (정상).
 */
function _validateBirthDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  const max = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  if (d > max) return `만 18세 미만은 입력할 수 없습니다 (${max.getFullYear()}-${String(max.getMonth()+1).padStart(2,'0')}-${String(max.getDate()).padStart(2,'0')} 이전 출생만 허용)`;
  return null;
}
/**
 * 입사일: 법정 정년(만 60세)을 이미 초과했거나, 미래 날짜 차단.
 * 최소 입사 연령 18세 기준 최대 재직 42년 — 그 이전이면 이미 퇴직.
 * 반환값: 오류 문자열 | null (정상).
 */
function _validateHireDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  if (d > today) return '입사일이 오늘보다 미래입니다';
  const maxYearsAgo = 42; // 만 18세 입사 + 만 60세 정년 = 최대 42년
  const minHire = new Date(today.getFullYear() - maxYearsAgo, today.getMonth(), today.getDate());
  if (d < minHire) return `이 입사일은 법정 정년(만 60세)이 이미 지난 시점입니다 (${minHire.getFullYear()}년 이후만 허용)`;
  return null;
}

// ═══════════ 생년월일 양방향 동기화 ═══════════
/**
 * 개인정보 탭 pfBirthDate → 퇴직금 탭 retBirthDate, retScBirthDate 동기화
 */
function syncBirthDateToRetirement(val) {
  ['retBirthDate', 'retScBirthDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== val) el.value = val;
  });
  if (typeof retUpdateQuickDates === 'function') retUpdateQuickDates();
}

/**
 * 퇴직금 탭 retBirthDate ↔ 개인정보 탭 pfBirthDate 양방향 동기화 + localStorage 직접 저장.
 * PROFILE.save() 대신 직접 저장해 profileChanged 이벤트를 발행하지 않음
 * → initPayrollTab() 재호출로 Wizard 상태가 초기화되는 문제 방지.
 */
function syncBirthDateToProfile(val) {
  const err = _validateBirthDate(val);
  // 퇴직금 탭의 오류 표시
  const retErrEl = document.getElementById('retBirthDateErr');
  if (retErrEl) retErrEl.textContent = err || '';
  const retEl = document.getElementById('retBirthDate');
  if (retEl) retEl.setCustomValidity(err || '');
  // 개인정보 탭 pfBirthDate 동기화 + 오류 표시
  const pfEl = document.getElementById('pfBirthDate');
  if (pfEl) { if (pfEl.value !== val) pfEl.value = val; pfEl.setCustomValidity(err || ''); }
  const pfErrEl = document.getElementById('pfBirthDateErr');
  if (pfErrEl) pfErrEl.textContent = err || '';
  if (err) return; // 유효하지 않으면 저장 중단

  ['retBirthDate', 'retScBirthDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== val) el.value = val;
  });

  try {
    const key = PROFILE.STORAGE_KEY;
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    if (saved.birthDate !== val) {
      saved.birthDate = val;
      saved.savedAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(saved));
    }
  } catch (_) { /* silent */ }
}

/**
 * 퇴직금 탭 retHireDate ↔ 개인정보 탭 pfHireDate 양방향 동기화 + localStorage 직접 저장.
 */
function syncHireDateToProfile(val) {
  const err = _validateHireDate(val);
  const retErrEl = document.getElementById('retHireDateErr');
  if (retErrEl) retErrEl.textContent = err || '';
  const retEl = document.getElementById('retHireDate');
  if (retEl) retEl.setCustomValidity(err || '');
  const pfEl = document.getElementById('pfHireDate');
  if (pfEl) { if (pfEl.value !== val) pfEl.value = val; pfEl.setCustomValidity(err || ''); }
  const pfErrEl = document.getElementById('pfHireDateErr');
  if (pfErrEl) pfErrEl.textContent = err || '';
  if (err) return; // 유효하지 않으면 저장 중단

  ['retHireDate', 'retScHireDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== val) el.value = val;
  });

  try {
    const key = PROFILE.STORAGE_KEY;
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    if (saved.hireDate !== val) {
      saved.hireDate = val;
      saved.savedAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(saved));
    }
  } catch (_) { /* silent */ }
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
// Phase 5-followup: downloadBackup 도 v2.0 으로 통일 (모든 사용자 도메인 키 포함)
// 이전: v1.0 (profile/overtime/leave 3 필드만) → 명세서/근무이력 백업 누락 회귀
// 신규: USER_DATA_PATTERNS 모든 매칭 키 일괄 백업 (uploadBackup v2.0 path 와 호환)
function downloadBackup() {
  const data = {
    version: "2.0",
    exportDate: new Date().toISOString(),
    exportType: "full",
    keys: {},
    // v1.0 호환 — 옛 uploadBackup 도 동작 (3 필드 동시 포함)
    profile: localStorage.getItem(PROFILE.STORAGE_KEY),
    overtime: localStorage.getItem(OVERTIME.STORAGE_KEY),
    leave: localStorage.getItem(LEAVE.STORAGE_KEY),
  };

  // 모든 USER_DATA_PATTERNS 매칭 키 keys 에 추가
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (USER_DATA_PATTERNS.some(p => p.test(k))) {
      data.keys[k] = localStorage.getItem(k);
    }
  }

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

  const totalKeys = Object.keys(data.keys).length;
  const payslipCount = Object.keys(data.keys).filter(k => /^payslip_/.test(k)).length;
  const workHistoryCount = Object.keys(data.keys).filter(k => /^snuhmate_work_history/.test(k)).length;

  const toast = document.getElementById('otToast');
  const msg = `백업 다운로드됨 (총 ${totalKeys}개 항목 — 명세서 ${payslipCount}, 근무이력 ${workHistoryCount}) 📥`;
  if (toast) {
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 4000);
  } else {
    alert(msg);
  }
}

// Phase 5-followup: v1.0 + v2.0 백업 모두 복원 + 다른 디바이스 namespace 매핑 + 모바일 호환
//
// 근본 원인 분석 (사용자 보고 "복원 안 됨"):
//   1. v2.0 (keys object) 미지원 — 신규 _downloadFullBackup 결과 복원 안 됨
//   2. namespace mismatch — 다른 디바이스 복원 시 PROFILE.STORAGE_KEY 가 다름
//      (Google 로그인 / guest / demo 별로 키 suffix 다름)
//   3. 안드로이드 사진 picker 열림 — accept="application/json" 무시
//   4. iOS 사파리 label[for] click trigger 안 됨

// canonical key 매핑 — 다른 디바이스/브라우저에서 복원 시 현재 namespace 로 변환
function _restoreKeyForCurrent(key) {
  // _<uid> / _guest / _demo suffix 제거 → 현재 환경의 same-base 키로
  const KNOWN_BASES = ['snuhmate_hr_profile', 'overtimeRecords', 'leaveRecords', 'snuhmate_work_history', 'otManualHourly', 'overtimePayslipData'];
  const getKey = (typeof window.getUserStorageKey === 'function') ? window.getUserStorageKey : null;
  for (const base of KNOWN_BASES) {
    if (key === base || key.startsWith(base + '_')) {
      return getKey ? getKey(base) : base;
    }
  }
  return key;  // payslip_<uid>_* 등은 그대로 (uid 가 백업 시점 그대로 보존)
}

async function uploadBackup(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  // 1단계: 파일 형식 차단 (사진/PDF/Excel)
  if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|heic|heif|svg)$/i.test(file.name)) {
    alert("⚠️ 사진 파일은 백업 파일이 아닙니다.\n\n'snuh_backup_*.json' 파일을 선택해주세요.\n(보통 '다운로드' 폴더에 있습니다)");
    event.target.value = '';
    return;
  }
  if (/\.(pdf|xls|xlsx|csv|doc|docx|hwp|zip|hwpx)$/i.test(file.name)) {
    alert("⚠️ 이 파일은 백업 파일이 아닙니다.\n\n'snuh_backup_*.json' 파일을 선택해주세요.");
    event.target.value = '';
    return;
  }

  try {
    // 2단계: 파일 읽기 (모바일 호환 — file.text() 미지원 fallback)
    let text;
    if (typeof file.text === 'function') {
      text = await file.text();
    } else {
      // iOS 12 이하 / 일부 안드로이드 webview
      text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(reader.error || new Error('FileReader 실패'));
        reader.readAsText(file);
      });
    }

    const data = JSON.parse(text);

    // 3단계: 백업 구조 검증 (v1.0 / v2.0 지원)
    const isV2 = data.version && data.keys && typeof data.keys === 'object';
    const isV1 = data.profile || data.overtime || data.leave;
    if (!isV2 && !isV1) {
      throw new Error('invalid_structure');
    }

    // 4단계: 안전 직렬화 — JSON.parse 검증 통과한 것만 저장
    const toStorable = v => {
      if (v === null || v === undefined) return null;
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      try { JSON.parse(s); } catch (e) { return null; }
      return s;
    };

    let restoredCount = 0;

    if (isV2) {
      // v2.0: keys object — 모든 사용자 도메인 키 일괄 복원 (namespace 매핑)
      for (const [origKey, value] of Object.entries(data.keys)) {
        const storable = toStorable(value);
        if (storable === null) continue;
        const targetKey = _restoreKeyForCurrent(origKey);
        try {
          localStorage.setItem(targetKey, storable);
          restoredCount++;
        } catch (e) { /* quota or invalid key */ }
      }
    } else {
      // v1.0: profile/overtime/leave 3개만 (namespace 매핑)
      const v1Map = [
        ['snuhmate_hr_profile', data.profile],
        ['overtimeRecords', data.overtime],
        ['leaveRecords', data.leave],
      ];
      for (const [base, value] of v1Map) {
        const storable = toStorable(value);
        if (storable === null) continue;
        const targetKey = _restoreKeyForCurrent(base);
        try {
          localStorage.setItem(targetKey, storable);
          restoredCount++;
        } catch (e) { /* noop */ }
      }
    }

    if (restoredCount === 0) {
      alert("⚠️ 백업 파일에 복원 가능한 데이터가 없습니다.");
      event.target.value = '';
      return;
    }

    alert(`✅ 데이터가 성공적으로 복원되었습니다! (${restoredCount}개 항목)\n앱을 새로고침합니다.`);
    if (typeof window.__snuhmateReloadHook === 'function') {
      window.__snuhmateReloadHook();
    } else {
      window.location.reload();
    }
  } catch (e) {
    if (e && e.message === 'invalid_structure') {
      alert("⚠️ 올바른 백업 파일이 아닙니다.\n\n'snuh_backup_*.json' 파일을 선택해주세요.");
    } else {
      alert("복원 실패: 올바른 백업 파일(JSON)이 아닙니다.\n\n사진이나 다른 파일이 아닌, 'snuh_backup_*.json' 파일을 선택해주세요.\n\n(에러: " + (e && e.message ? e.message : 'unknown') + ")");
    }
  } finally {
    event.target.value = '';
  }
}

// Phase 5-followup: 모바일 호환 file picker — label[for] 안 되는 안드로이드/iOS 우회
// onclick 으로 직접 input.click() trigger
function triggerBackupFilePicker() {
  const input = document.getElementById('backupFileInput');
  if (input) {
    input.value = '';  // 같은 파일 재선택 가능
    input.click();
  }
}
window.triggerBackupFilePicker = triggerBackupFilePicker;
window.uploadBackup = uploadBackup;

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
           data-action="togglePfWageDetail">
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
  // Phase 5-followup: input.value 직접 설정 → input 이벤트 미발생 → updateHourlyWarning 호출 누락 회귀 fix
  // 사용자: "급여명세서 + 개인정보 입력됐는데 '개인정보 먼저 입력' 배너가 안 사라짐"
  if (typeof window.updateHourlyWarning === 'function') {
    try { window.updateHourlyWarning(); } catch (e) {}
  }
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

    // 연차 자동 산정 — lvTotalAnnual 은 leave-tab.js 모듈 스코프
    // ESM 환경: window 통해 cross-module 동기화
    const parsed = PROFILE.parseDate(profile.hireDate);
    if (parsed) {
      const result = CALC.calcAnnualLeave(new Date(parsed));
      if (result) window.lvTotalAnnual = result.totalLeave;
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

// ── 탭 간 실시간 갱신 — 휴가/시간외 저장 시 프로필 탭 active 면 잔여 연차·요약 재계산 ──
(function () {
  if (typeof window === 'undefined') return;
  var _refreshProfile = function () {
    var profileTab = document.getElementById('tab-profile');
    if (!profileTab || !profileTab.classList.contains('active')) return;
    // 우선순위: initProfileTab (전체 재초기화) → updateProfileSummary(load()) → PROFILE.render
    if (typeof initProfileTab === 'function') {
      try { initProfileTab(); return; } catch (_) {}
    }
    if (typeof updateProfileSummary === 'function') {
      try { var p = PROFILE.load(); if (p) updateProfileSummary(p); return; } catch (_) {}
    }
    if (typeof PROFILE.render === 'function') {
      try { PROFILE.render(); } catch (_) {}
    }
  };
  window.addEventListener('leaveChanged', _refreshProfile);
  window.addEventListener('overtimeChanged', _refreshProfile);
  // Phase 5-followup: 명세서 업로드 → PROFILE.save 의 profileChanged 이벤트로 자동 form 갱신
  // 사용자가 다른 탭에 있다가 info 진입 시 항상 최신 데이터 반영 (initProfileTab 가 매번 form 채움)
  window.addEventListener('profileChanged', _refreshProfile);
})();

// 모든 탭 진입 시 정보 항상 최신화 — switchTab 이벤트 hook
// 사용자: "급여명세서 입력 후 개인정보 탭 처음에는 아무것도 안 나옴" 회귀 fix
// initProfileTab() 이 active 상태에서만 실행되도록 deferred — 탭 전환 시점에 호출 보장
if (typeof window !== 'undefined') {
  var _origSwitchTabForProfile = window.switchTab;
  if (typeof _origSwitchTabForProfile === 'function' && !_origSwitchTabForProfile.__phase5Wrapped) {
    var wrapped = function (name) {
      var ret = _origSwitchTabForProfile.apply(this, arguments);
      if (name === 'profile' && typeof initProfileTab === 'function') {
        try { initProfileTab(); } catch (e) {}
      }
      return ret;
    };
    wrapped.__phase5Wrapped = true;
    window.switchTab = wrapped;
  }
}

// ── 페이지 로드 직후 기본 탭 활성화 (URL ?tab= 파라미터 우선, 없으면 home) ──
document.addEventListener('DOMContentLoaded', function () {
  if (typeof window.switchTab !== 'function') return;
  var params = new URLSearchParams(window.location.search);
  var requestedTab = params.get('tab');
  if (!window.switchTab(requestedTab || 'home')) {
    window.switchTab('home');
  }
});


// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)

// Phase 2-regression: inline onclick window 노출 (Phase 3-F 검토 후 제거 예정)
if (typeof window !== 'undefined') {
  window.switchToProfileTab = switchToProfileTab;
}

// Phase 3-E: profile-tab 1 onclick (통상임금 내역 토글) → data-action 위임
import { registerActions as _profile_registerActions } from '@snuhmate/shared-utils';
_profile_registerActions({
  togglePfWageDetail: () => {
    const body = document.getElementById('pfWageDetailBody');
    const icon = document.getElementById('pfWageDetailIcon');
    if (!body || !icon) return;
    if (body.style.display === 'none') {
      body.style.display = 'block';
      icon.textContent = '▼';
    } else {
      body.style.display = 'none';
      icon.textContent = '▸';
    }
  },
});


// Phase 3-F 회귀 fix: tabs/*.html fragment + safeCall 동적 dispatch 가 의존하는 호환층 복원
if (typeof window !== 'undefined') {
  window.applyProfileToLeave = applyProfileToLeave;
  window.applyProfileToOvertime = applyProfileToOvertime;
  window.applyProfileToPayroll = applyProfileToPayroll;
  window.clearProfile = clearProfile;
  window.downloadBackup = downloadBackup;
  window.saveProfile = saveProfile;
  window.switchProfileSection = switchProfileSection;
  window.toggleCollapsible = toggleCollapsible;
}

// ── 커리어 타임라인 렌더 + CRUD ──────────────────────────────
// 단일 키 `snuhmate_career_events` 통합. work_history 와 자동승격·장기근속·공로연수·정년을 한 시점에서 본다.
let _careerCurrentFilter = 'all'; // 기본 = 전체 (필터별 토글은 사용자 선택)

function _careerEventStatus(ev, now) {
  if (!ev?.dateFrom) return 'future';
  // 근무처: dateTo 가 비면 "현재까지 이어짐" → 항상 now
  if (ev.category === 'workplace' && !ev.dateTo) return 'now';
  // 근무처: dateTo 가 있으면 그 종료월 마지막 날 기준 past 판정 — 같은 달은 'now', 다음 달부터 'past'
  if (ev.category === 'workplace' && ev.dateTo) {
    const [ty, tm] = ev.dateTo.split('-').map(Number);
    // new Date(year, month, 0) → month-1 의 마지막 날 (JS 표준 트릭)
    // 예: new Date(2026, 5, 0) → 2026-05-31
    const evEnd = new Date(ty, tm || 1, 0);
    return now > evEnd ? 'past' : 'now';
  }
  const [y, m] = ev.dateFrom.split('-').map(Number);
  const evStart = new Date(y, (m || 1) - 1, 1);
  const monthDiff = (now.getFullYear() - evStart.getFullYear()) * 12 + (now.getMonth() - evStart.getMonth());
  if (Math.abs(monthDiff) <= 1) return 'now';
  return monthDiff > 0 ? 'past' : 'future';
}

function _careerFmtDate(ev, now) {
  const [y, m] = (ev.dateFrom || '').split('-');
  if (!y || !m) return '';
  let s = `${y} · ${parseInt(m, 10)}월`;
  if (ev.dateTo) {
    const [y2, m2] = ev.dateTo.split('-');
    s = `${y}.${m} ~ ${y2}.${m2}`;
  } else if (ev.category === 'workplace' && _careerEventStatus(ev, now) !== 'future') {
    s = `${y}.${m} ~ 현재`;
  }
  return s;
}

// 단협 원문(full_union_regulation_2026.md) 기준 — 자동승격 정의가 없는 자격등급 = 심사승진 대상
// S 등급은 8년 자동승격 (PROMO_GENERAL 에 포함) → M·C·L·SC·SL 만 심사승진
const _REVIEW_PROMO_GRADES = new Set([
  'M1', 'M2',
  'C1', 'C2', 'C3', 'L1', 'L2',
  'SC1', 'SC2', 'SC3', 'SL1', 'SL2',
]);
const _TOP_GRADES = new Set(['M3', 'L3', 'SL3']);

function _resolveNextPromoLabel(grade, nextPromo) {
  if (nextPromo) {
    return `${nextPromo.dateFrom} (${(nextPromo.title || '').replace(/^.*→\s*/, '')})`;
  }
  if (_TOP_GRADES.has(grade)) return '최상위 자격등급';
  if (_REVIEW_PROMO_GRADES.has(grade)) return '심사승진 대상';
  return '없음';
}

if (typeof window !== 'undefined') {
  window.__test_resolveNextPromoLabel = _resolveNextPromoLabel;
}

function _careerHeroStat() {
  const profile = PROFILE.load();
  const wrap = document.getElementById('careerHeroStat');
  if (!wrap) return;
  if (!profile?.hireDate) {
    wrap.replaceChildren();
    const msg = document.createElement('div');
    msg.style.cssText = 'font-size:var(--text-body-small);color:var(--text-muted);text-align:center;padding:8px 0;';
    msg.textContent = '입사일을 입력하면 자동승격·장기근속·정년 일정이 자동 표시됩니다.';
    wrap.appendChild(msg);
    return;
  }
  const hireYears = PROFILE.calcServiceYears(profile.hireDate);
  const hireDateObj = new Date(PROFILE.parseDate(profile.hireDate));
  const events = CAREER.loadEvents();
  const now = new Date();
  const nextPromo = events
    .filter((e) => e.category === 'promotion' && !e.fixed)
    .map((e) => ({ ...e, _start: e.dateFrom ? new Date(parseInt(e.dateFrom.slice(0, 4), 10), parseInt(e.dateFrom.slice(5, 7), 10) - 1) : null }))
    .filter((e) => e._start && e._start > now)
    .sort((a, b) => a._start - b._start)[0];
  const retire = events.find((e) => e.title === '정년 퇴직' || /정년/.test(e.title || ''));
  const totalYears = retire?.dateFrom ? (parseInt(retire.dateFrom.slice(0, 4), 10) - hireDateObj.getFullYear()) : 40;
  const remainingYears = Math.max(0, totalYears - hireYears);
  const pctNum = Math.min(100, Math.max(0, Math.round((hireYears / totalYears) * 100)));
  const currentYear = now.getFullYear();

  wrap.replaceChildren();
  const rows = [
    { lbl: '근속', val: `${hireYears}년 / ${totalYears}년 (${pctNum}%)` },
    { lbl: '현재 자격등급', val: `${profile.grade || '-'}${profile.year ? ` · ${profile.year}년차` : ''}` },
    { lbl: '다음 자동승격', val: _resolveNextPromoLabel(profile.grade || '', nextPromo) },
    { lbl: '정년까지', val: retire?.dateFrom ? `${remainingYears}년 남음 · ${retire.dateFrom.slice(0, 4)}.12` : '미설정' },
  ];
  rows.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'row';
    const lbl = document.createElement('span');
    lbl.className = 'lbl'; lbl.textContent = r.lbl;
    const val = document.createElement('span');
    val.className = 'val'; val.textContent = r.val;
    row.appendChild(lbl); row.appendChild(val);
    wrap.appendChild(row);
  });

  // 진행바 — 현재년도 tick + label
  const prog = document.createElement('div');
  prog.className = 'progress';
  const fill = document.createElement('div');
  fill.className = 'fill'; fill.style.width = pctNum + '%';
  prog.appendChild(fill);
  // 현재 위치 마커
  const marker = document.createElement('div');
  marker.className = 'progress-marker';
  marker.style.left = pctNum + '%';
  marker.title = `${currentYear} (${pctNum}%)`;
  prog.appendChild(marker);
  wrap.appendChild(prog);

  // 진행 메타 — 입사 / 현재년도+% / 정년
  const meta = document.createElement('div');
  meta.className = 'progress-meta';
  const left = document.createElement('span');
  left.textContent = `${hireDateObj.getFullYear()} 입사`;
  const center = document.createElement('span');
  center.className = 'now-label';
  center.textContent = `${currentYear} 현재 · ${pctNum}%`;
  center.style.cssText = `position:absolute;left:${pctNum}%;transform:translateX(-50%);color:var(--accent-indigo);font-weight:700;`;
  const right = document.createElement('span');
  right.textContent = retire?.dateFrom ? `${retire.dateFrom.slice(0, 4)} 정년` : '';
  meta.style.position = 'relative';
  meta.appendChild(left); meta.appendChild(center); meta.appendChild(right);
  wrap.appendChild(meta);

  if (nextPromo) {
    const card = document.createElement('div');
    card.className = 'career-next-promo-card';
    const lbl = document.createElement('div');
    lbl.className = 'label';
    lbl.textContent = '다음 자동승격';
    card.appendChild(lbl);
    const title = document.createElement('div');
    title.className = 'title';
    // dateFrom 은 input type="month" 출력 = "YYYY-MM" 계약. slice(0,7) 로 future-proof.
    title.textContent = `${(nextPromo.dateFrom || '').slice(0, 7).replace('-', '.')} · ${nextPromo.title}`;
    card.appendChild(title);
    if (nextPromo.amount) {
      const amt = document.createElement('div');
      amt.className = 'breakdown is-amount';
      amt.textContent = nextPromo.amount;
      card.appendChild(amt);
    }
    if (Array.isArray(nextPromo.detailTokens) && nextPromo.detailTokens.length) {
      const bd = document.createElement('div');
      bd.className = 'breakdown';
      nextPromo.detailTokens.forEach((tok) => {
        if (tok.bold != null) {
          const b = document.createElement('b'); b.textContent = tok.bold; bd.appendChild(b);
        } else if (tok.text != null) bd.appendChild(document.createTextNode(tok.text));
      });
      card.appendChild(bd);
    }
    wrap.appendChild(card);
  }
}

function _careerBuildHobonDot(ev, now) {
  const status = _careerEventStatus(ev, now);
  const wrap = document.createElement('div');
  wrap.className = 'career-hobon-dot' + (status === 'past' ? ' is-past' : '');
  wrap.title = ev.sub || ev.title || '호봉 변동';
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('tabindex', '0');

  const dot = document.createElement('span');
  dot.className = 'dot';
  wrap.appendChild(dot);

  const lbl = document.createElement('span');
  lbl.className = 'lbl';
  const ymTxt = (ev.dateFrom || '').replace('-', '.');
  lbl.textContent = `${ymTxt} · ${ev.title || ''}`;
  wrap.appendChild(lbl);

  wrap.onclick = () => openCareerEventSheet(ev);
  wrap.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCareerEventSheet(ev); } };
  return wrap;
}

function _careerBuildEventEl(ev, now) {
  if (ev.category === 'hobon-change') return _careerBuildHobonDot(ev, now);
  const el = document.createElement('div');
  const status = _careerEventStatus(ev, now);
  el.className = `career-event status-${status} cat-${ev.category || 'workplace'}`;
  if (status === 'now') el.classList.add('now');
  if (status === 'future') el.classList.add('future');

  const yr = document.createElement('div');
  yr.className = 'career-event-year';
  const yrLeft = document.createElement('div');
  yrLeft.style.cssText = 'display:flex;align-items:center;gap:6px;';
  const yrText = document.createElement('span');
  yrText.textContent = _careerFmtDate(ev, now);
  yrLeft.appendChild(yrText);
  if (status === 'now') {
    const nowPill = document.createElement('span');
    nowPill.className = 'career-now-pill';
    nowPill.textContent = '지금';
    yrLeft.appendChild(nowPill);
  }
  yr.appendChild(yrLeft);
  const editBtn = document.createElement('button');
  editBtn.className = 'career-edit-btn';
  editBtn.type = 'button';
  editBtn.textContent = '✎';
  editBtn.title = '편집';
  editBtn.onclick = (e) => { e.stopPropagation(); openCareerEventSheet(ev); };
  yr.appendChild(editBtn);
  el.appendChild(yr);

  const card = document.createElement('div');
  card.className = 'career-event-card';
  card.onclick = () => openCareerEventSheet(ev);

  const title = document.createElement('h3');
  title.className = 'career-event-title';
  title.appendChild(document.createTextNode(ev.title || ''));
  if (ev.badge) {
    const b = document.createElement('span');
    b.className = `career-badge ${ev.badge.tone || 'gray'}`;
    b.textContent = ev.badge.text || '';
    title.appendChild(b);
  }
  card.appendChild(title);

  if (ev.sub) {
    const sub = document.createElement('p');
    sub.className = 'career-event-sub';
    sub.textContent = ev.sub;
    card.appendChild(sub);
  }
  if (ev.amount) {
    const amt = document.createElement('span');
    amt.className = 'career-event-amount';
    amt.textContent = ev.amount;
    card.appendChild(amt);
  }
  if (Array.isArray(ev.detailTokens) && ev.detailTokens.length) {
    const dg = document.createElement('div');
    dg.className = 'career-event-detail-grid';
    ev.detailTokens.forEach((tok) => {
      if (tok.bold != null) {
        const b = document.createElement('b');
        b.textContent = tok.bold;
        dg.appendChild(b);
      } else if (tok.text != null) {
        dg.appendChild(document.createTextNode(tok.text));
      }
    });
    card.appendChild(dg);
  }
  el.appendChild(card);
  return el;
}

// 과거 펼침 토글 상태 (필터별로 유지)
const _careerPastExpanded = {};

function _buildPastSummary(pastEvents, expanded) {
  const wrap = document.createElement('div');
  wrap.className = 'career-past-summary' + (expanded ? ' expanded' : '');

  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = '📜';
  wrap.appendChild(icon);

  const body = document.createElement('div');
  body.className = 'summary-body';
  const title = document.createElement('div');
  title.className = 'summary-title';
  // 첫 입사 ~ 최근 과거 이벤트 요약
  const first = pastEvents[0];
  const last = pastEvents[pastEvents.length - 1];
  const firstYM = (first?.dateFrom || '').replace('-', '.');
  const lastYM = (last?.dateFrom || '').replace('-', '.');
  title.textContent = `과거 이력 ${pastEvents.length}건 · ${firstYM} ~ ${lastYM}`;
  body.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'summary-sub';
  // 짧은 요약 (제목들 일부)
  const labels = pastEvents.map((e) => e.title).slice(0, 3).join(' · ');
  sub.textContent = pastEvents.length > 3
    ? `${labels} 외 ${pastEvents.length - 3}건` : labels;
  body.appendChild(sub);
  wrap.appendChild(body);

  const chev = document.createElement('span');
  chev.className = 'chev';
  chev.textContent = '▾';
  wrap.appendChild(chev);

  wrap.onclick = () => {
    _careerPastExpanded[_careerCurrentFilter] = !_careerPastExpanded[_careerCurrentFilter];
    renderCareerTimeline();
  };
  return wrap;
}

// Task 4 (UI merge): legacy `snuhmate_work_history` 아이템을 workplace 이벤트로
// 변환해 타임라인에 병합. career-events.js 의 `loadEvents()` migration 은 신규 키가
// 비어있을 때만 1회 실행되므로, 시드 이벤트만 있고 work_history 데이터가 따로
// 동기화되어 있는 경우 사용자가 등록한 근무처가 보이지 않는 회귀가 발생.
// 여기선 매 렌더 시점에 양쪽을 합쳐 보여준다 (data 보존, UI 통합).
function _legacyWorkHistoryAsEvents() {
  try {
    const k = (typeof window !== 'undefined' && window.getUserStorageKey)
      ? window.getUserStorageKey('snuhmate_work_history')
      : 'snuhmate_work_history_guest';
    const list = JSON.parse(localStorage.getItem(k) || '[]') || [];
    if (!Array.isArray(list) || list.length === 0) return [];
    return list.map((wh) => ({
      // legacy id 그대로 사용 (충돌 방지 prefix) — 동일 work_history 가 이미
      // career_events workplace 로 마이그레이션된 케이스 dedupe 는 아래 merge 단계.
      id: 'wh-' + (wh.id || ''),
      category: 'workplace',
      title: wh.dept || wh.workplace || '근무처',
      sub: [
        wh.workplace && wh.workplace !== '서울대학교병원' ? wh.workplace : null,
        wh.role,
        wh.desc,
      ].filter(Boolean).join(' · '),
      dateFrom: (wh.from || '').slice(0, 7),
      dateTo: (wh.to || '').slice(0, 7),
      legacyOrigin: 'work_history',
      _legacyId: wh.id,  // edit 라우팅용 (현재는 미사용 — Task 5 시 활용)
    })).filter((ev) => ev.dateFrom);
  } catch { return []; }
}

function renderCareerTimeline() {
  const tl = document.getElementById('workHistoryList');
  const empty = document.getElementById('careerEmptyMsg');
  if (!tl) return;
  _careerHeroStat();
  tl.replaceChildren();

  const events = CAREER.loadEvents();
  let dynamicLeave = [];
  try {
    dynamicLeave = (typeof CAREER.computeDynamicLeaveEvents === 'function')
      ? CAREER.computeDynamicLeaveEvents(PROFILE.load(), new Date())
      : [];
  } catch (e) { /* leave 모듈 미초기화 무해 */ }

  // Task 4: legacy work_history merge. 이미 같은 dateFrom+title 의 workplace
  // 이벤트가 career_events 에 있으면 (career-events.js loadEvents 의 1회 마이그레이션
  // 결과) 중복을 피한다.
  const legacyEvents = _legacyWorkHistoryAsEvents();
  // dateFrom 정규화: "6-07"·"2006.07"·"6.07" 모두 "2006-07"로 통일해서 dedup key 구성
  function _normDedupYM(s) {
    if (!s) return '';
    const norm = String(s).trim().replace(/[./]/g, '-');
    const mp = norm.match(/^(\d{1,4})-(\d{1,2})(?:-\d+)?$/);
    if (!mp) return s;
    let y = mp[1];
    if (y.length <= 2) { const yi = parseInt(y, 10); y = String(yi <= 30 ? 2000 + yi : 1900 + yi); }
    return `${y}-${mp[2].padStart(2, '0')}`;
  }
  const dedupeKey = (ev) => `${ev.category || ''}|${_normDedupYM(ev.dateFrom || '')}|${ev.title || ''}`;
  const seen = new Set(events.map(dedupeKey));
  const legacyMerged = legacyEvents.filter((ev) => !seen.has(dedupeKey(ev)));
  // 모든 소스 통합 후 정규화 key 기준 dedupe
  const seenDedup = new Set();
  const allEvents = [...events, ...legacyMerged, ...dynamicLeave].filter((ev) => {
    const k = dedupeKey(ev);
    if (seenDedup.has(k)) return false;
    seenDedup.add(k);
    return true;
  });
  const filtered = allEvents
    .filter((ev) => _careerCurrentFilter === 'all' || ev.category === _careerCurrentFilter)
    .slice()
    .sort((a, b) => (a.dateFrom || '9999').localeCompare(b.dateFrom || '9999'));

  if (filtered.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  // 과거 / 현재 / 미래 분리
  const now = new Date();
  const past = [], present = [], future = [];
  filtered.forEach((ev) => {
    const s = _careerEventStatus(ev, now);
    if (s === 'past') past.push(ev);
    else if (s === 'now') present.push(ev);
    else future.push(ev);
  });

  // 1. 과거 요약 카드 (있을 때만)
  const expanded = !!_careerPastExpanded[_careerCurrentFilter];
  if (past.length > 0) {
    tl.appendChild(_buildPastSummary(past, expanded));
    if (expanded) {
      past.forEach((ev) => {
        const el = _careerBuildEventEl(ev, now);
        el.classList.add('is-past');
        tl.appendChild(el);
      });
    }
  }
  // 2. 현재 (full size, 펄스)
  present.forEach((ev) => tl.appendChild(_careerBuildEventEl(ev, now)));
  // 3. 미래 (full size, dashed)
  future.forEach((ev) => tl.appendChild(_careerBuildEventEl(ev, now)));
}

function openCareerEventSheet(ev) {
  const sheet = document.getElementById('careerEventSheet');
  if (!sheet) return;
  const isNew = !ev || !ev.id;
  document.getElementById('careerSheetTitle').textContent = isNew ? '이벤트 추가' : '이벤트 편집';
  document.getElementById('ceEditId').value = isNew ? '' : ev.id;
  const cat = isNew ? (_careerCurrentFilter !== 'all' ? _careerCurrentFilter : 'promotion') : ev.category;
  document.getElementById('ceCategory').value = cat;
  document.getElementById('ceTitle').value = isNew ? '' : (ev.title || '');
  document.getElementById('ceDateFrom').value = isNew ? '' : (ev.dateFrom || '');
  document.getElementById('ceDateTo').value = isNew ? '' : (ev.dateTo || '');
  document.getElementById('ceSub').value = isNew ? '' : (ev.sub || '');
  document.getElementById('ceAmount').value = isNew ? '' : (ev.amount || '');
  document.getElementById('ceDateToWrap').style.display = cat === 'workplace' ? 'block' : 'none';
  // 단협 보호 이벤트는 삭제 차단
  document.getElementById('ceDeleteBtn').style.display = (!isNew && !ev.fixed) ? 'inline-flex' : 'none';
  sheet.style.display = 'block';
}
function closeCareerEventSheet() {
  const sheet = document.getElementById('careerEventSheet');
  if (sheet) sheet.style.display = 'none';
}
function saveCareerEvent() {
  const id = document.getElementById('ceEditId').value;
  const cat = document.getElementById('ceCategory').value;
  const title = document.getElementById('ceTitle').value.trim();
  const dateFrom = document.getElementById('ceDateFrom').value;
  const dateTo = document.getElementById('ceDateTo').value || '';
  const sub = document.getElementById('ceSub').value.trim();
  const amount = document.getElementById('ceAmount').value.trim();
  if (!title || !dateFrom) {
    alert('제목과 시작 일자는 필수입니다.');
    return;
  }
  const payload = { category: cat, title, dateFrom, dateTo: cat === 'workplace' ? dateTo : '', sub, amount };
  if (id) {
    CAREER.updateEvent(id, payload);
  } else {
    CAREER.addEvent(payload);
  }
  // 새 카테고리로 추가/변경된 경우 그 필터로 자동 전환
  if (_careerCurrentFilter !== 'all' && _careerCurrentFilter !== cat) {
    _careerCurrentFilter = cat;
    document.querySelectorAll('.career-chip').forEach((c) =>
      c.classList.toggle('on', c.dataset.filter === cat));
  }
  renderCareerTimeline();
  closeCareerEventSheet();
}
function deleteCareerEvent() {
  const id = document.getElementById('ceEditId').value;
  if (!id) return;
  if (!confirm('이 이벤트를 삭제할까요?')) return;
  const ok = CAREER.deleteEvent(id);
  if (!ok) { alert('단협 보호 이벤트는 삭제할 수 없습니다.'); return; }
  renderCareerTimeline();
  closeCareerEventSheet();
}
function _initCareerTimelineHandlers() {
  const filterRow = document.getElementById('careerFilterRow');
  if (filterRow && !filterRow.dataset.bound) {
    filterRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.career-chip');
      if (!btn) return;
      document.querySelectorAll('.career-chip').forEach((c) => c.classList.remove('on'));
      btn.classList.add('on');
      _careerCurrentFilter = btn.dataset.filter;
      renderCareerTimeline();
    });
    filterRow.dataset.bound = '1';
  }
  const fab = document.getElementById('careerFabAdd');
  if (fab && !fab.dataset.bound) {
    fab.addEventListener('click', () => openCareerEventSheet(null));
    fab.dataset.bound = '1';
  }
  // LEAVE 모듈 변경 시 자동 재렌더 (실시간 동기화)
  if (!window._careerLeaveHandlerBound) {
    window.addEventListener('leaveChanged', () => {
      try { renderCareerTimeline(); } catch {}
    });
    window._careerLeaveHandlerBound = true;
  }
}

// Phase 3-regression: cross-module bare 호출 → window 호환층 복원
if (typeof window !== 'undefined') {
  window.initProfileTab = initProfileTab;
  window.updateProfileGrades = updateProfileGrades;
  window.toggleChildFields = toggleChildFields;
  window._collapseBasicFieldsWithPreview = _collapseBasicFieldsWithPreview;
  window._seedFirstWorkFromProfile = _seedFirstWorkFromProfile;
  // tab-profile.html fragment 의 inline onchange="_suggestYear(...)" 가 호출
  window._suggestYear = _suggestYear;
  // PayrollIsland.astro retBirthDate oninput 에서 호출
  window.syncBirthDateToProfile = syncBirthDateToProfile;
  window.syncHireDateToProfile = syncHireDateToProfile;
  // 커리어 타임라인
  // 테스트 expose
  window.__test_careerEventStatus = _careerEventStatus;
  window.renderCareerTimeline = renderCareerTimeline;
  window.openCareerEventSheet = openCareerEventSheet;
  window.closeCareerEventSheet = closeCareerEventSheet;
  window.saveCareerEvent = saveCareerEvent;
  window.deleteCareerEvent = deleteCareerEvent;
  // 기존 renderWorkHistory 콜사이트도 새 타임라인으로 라우팅 (back-compat 호환층).
  // work-history.js 의 module-init 이 이 키를 덮어쓰는 회귀를 막기 위해 매 호출마다
  // 우리 함수로 재고정 (work-history 의 legacy 렌더는 더 이상 사용 안 함).
  function _renderWorkHistoryShim() {
    _initCareerTimelineHandlers();
    renderCareerTimeline();
  }
  window.renderWorkHistory = _renderWorkHistoryShim;
  // 커리어 카드 ID 가 DOM 에 들어오는 즉시 바인딩 (탭 전환 시점).
  // _initCareerTimelineHandlers 는 idempotent (data-bound 가드 + flag 가드).
  // DOMContentLoaded 이후엔 work-history.js module-init 가 이미 끝났으므로
  // 여기서 다시 한 번 window.renderWorkHistory 를 우리 shim 으로 고정해 회귀 방지.
  function _ensureCareerRouting() {
    window.renderWorkHistory = _renderWorkHistoryShim;
    _initCareerTimelineHandlers();
  }
  if (document.readyState !== 'loading') _ensureCareerRouting();
  else document.addEventListener('DOMContentLoaded', _ensureCareerRouting);

  // Task 4: career_events / cloud-hydrate / legacy work_history 변경 시 재렌더.
  // 모듈 init 시점에 한 번만 바인딩 (DOMContentLoaded 와 무관 — hydrate 가 더
  // 일찍 끝날 수 있어 listener 는 가장 빨리 거는 게 안전).
  if (!window._careerEventsHandlerBound) {
    window._careerEventsHandlerBound = true;
    let _rerenderTimer = null;
    const rerender = () => {
      try { renderCareerTimeline(); } catch {}
      try { _careerHeroStat(); } catch {}
    };
    const rerenderDebounced = () => {
      if (_rerenderTimer) clearTimeout(_rerenderTimer);
      _rerenderTimer = setTimeout(() => { _rerenderTimer = null; rerender(); }, 50);
    };
    // 페이지/탭 진입 시 가장 최근 명세서로 profile.grade/year 자동 동기화 후 재렌더
    const _syncFromLatestPayslip = () => {
      try {
        if (!window.SALARY_PARSER || typeof window.SALARY_PARSER.listSavedMonths !== 'function') return;
        const months = window.SALARY_PARSER.listSavedMonths();
        const paid = (months || []).filter((m) => m.type === '급여');
        if (paid.length === 0) return;
        // 가장 최근 (year*100+month 최대)
        paid.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));
        const latest = paid[0];
        const data = window.SALARY_PARSER.loadMonthlyData(latest.year, latest.month, latest.type);
        if (data && typeof window.SALARY_PARSER.applyStableItemsToProfile === 'function') {
          window.SALARY_PARSER.applyStableItemsToProfile(data);
          // careerProfileChanged 가 applyStableItems 안에서 grade/year 변경 시 자동 발화
        }
      } catch {}
    };
    window.addEventListener('careerEventsChanged', rerender);
    window.addEventListener('app:cloud-hydrated', () => { _syncFromLatestPayslip(); rerender(); });
    window.addEventListener('workHistoryChanged', rerender);
    // 명세서 추가/편집 → profile.grade/year 갱신 → hero card + timeline 재렌더
    window.addEventListener('payslipChanged', () => { _syncFromLatestPayslip(); rerenderDebounced(); });
    window.addEventListener('careerProfileChanged', rerenderDebounced);
    // 모듈 초기 로드 시점에도 한 번 시도 (SALARY_PARSER 가 이미 노출돼 있으면 즉시 동기화)
    setTimeout(_syncFromLatestPayslip, 200);
  }
}
export {};
