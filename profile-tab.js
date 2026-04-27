// profile-tab.js — 프로필 탭 UI + 저장
// Phase 5: cross-module 명시 named import (PROFILE_FIELDS bare 참조 회귀 종결)
import { PROFILE, PROFILE_FIELDS } from './profile.js';
import { CALC } from './calculators.js';
import { DATA } from './data.js';
import { PAYROLL } from './payroll.js';
import { OVERTIME } from './overtime.js';
import { LEAVE } from './leave.js';
import { escapeHtml } from './shared-utils.js';
import {
  _loadWorkHistory, _saveWorkHistory, renderWorkHistory,
  _showWorkHistoryUpdateBanner,
} from './work-history.js';

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
  renderWorkHistory();
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
    renderWorkHistory();
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

  // 생년월일 → 퇴직금 탭 동기화
  const pfBirthDateEl = document.getElementById('pfBirthDate');
  if (pfBirthDateEl) {
    pfBirthDateEl.addEventListener('input', (e) => syncBirthDateToRetirement(e.target.value));
  }

  // 부서 변경 시 근무이력 시드 재평가 (저장 전이라도 즉시 반영)
  const pfDeptEl = document.getElementById('pfDepartment');
  if (pfDeptEl) {
    pfDeptEl.addEventListener('input', () => {
      try { if (typeof renderWorkHistory === 'function') renderWorkHistory(); } catch (e) {}
    });
  }

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
  /^bhm_hr_profile/,           // PROFILE (모든 namespace 포함)
  /^overtimeRecords/,          // OVERTIME (_guest, _<uid>, _demo)
  /^leaveRecords/,             // LEAVE
  /^bhm_work_history/,         // 근무이력
  /^payslip_/,                 // 급여명세서
  /^otManualHourly/,           // 수동 시급
  /^overtimePayslipData/,      // 명세서 시간외 보정
  /^bhm_lastEdit_/,            // sync 메타
  /^_orphan_/,                 // orphan recovery
  /^snuhmate_reg_favorites/,   // 규정 즐겨찾기
  /^payroll_compare_history/,  // ← Phase 5-followup 누락 fix (이슈 2 보안)
  /^cardnews\./,               // 카드뉴스 사용자 위젯 설정
  /^bhm_demo_mode$/,
  /^hwBannerDismissed$/,
];

// 시스템 메타 — KEEP (디바이스 / 마이그레이션 / 테마 / 온보딩 진행상태)
const CLEAR_KEEP_KEYS = new Set([
  'bhm_local_uid',
  'bhm_deviceId',
  'bhm_anon_id',
  'theme', 'snuhmate-theme',
  'bhm_leave_migrated_v1',
  'bhm_debug_parser',
  'onboarding_seen_v2',
  'onboarding_count',
  // bhm_settings 는 PII 필드만 셀렉티브 wipe (_wipeSettingsPII)
]);

// bhm_settings 안에서 PII 만 wipe — 사용자 설정 (driveEnabled 등) 은 보존
const SETTINGS_PII_FIELDS = ['googleSub', 'googleEmail', 'cachedProfile', 'lastSync', 'pinHash', 'displayName'];

function _wipeSettingsPII() {
  try {
    const raw = localStorage.getItem('bhm_settings');
    if (!raw) return;
    const settings = JSON.parse(raw);
    let changed = false;
    for (const f of SETTINGS_PII_FIELDS) {
      if (f in settings) { delete settings[f]; changed = true; }
    }
    if (changed) localStorage.setItem('bhm_settings', JSON.stringify(settings));
  } catch (e) { /* noop */ }
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
  // bhm_settings 의 PII 필드 셀렉티브 wipe (계정 설정은 보존)
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
  if (typeof window.__bhmReloadHook === 'function') {
    window.__bhmReloadHook();
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
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:#fff; border-radius:14px; max-width:440px; width:100%; padding:24px; box-shadow:0 20px 60px rgba(0,0,0,0.3); font-family:inherit;';

  const title = document.createElement('h2');
  title.textContent = '⚠️ 모든 사용자 데이터 초기화';
  title.style.cssText = 'margin:0 0 12px; font-size:1.15rem; color:#dc2626;';
  card.appendChild(title);

  const desc = document.createElement('p');
  desc.style.cssText = 'margin:0 0 12px; font-size:0.9rem; line-height:1.55; color:#374151;';
  desc.textContent = '다음 데이터를 모두 삭제합니다 (되돌릴 수 없습니다):';
  card.appendChild(desc);

  const ul = document.createElement('ul');
  ul.style.cssText = 'margin:0 0 16px 18px; font-size:0.85rem; color:#4b5563; line-height:1.6;';
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
  note.style.cssText = 'margin:0 0 18px; padding:10px 12px; background:#fef3c7; border-radius:8px; font-size:0.82rem; color:#78350f; line-height:1.5;';
  note.appendChild(document.createTextNode('💡 삭제 전 '));
  const noteStrong = document.createElement('strong');
  noteStrong.textContent = '[백업 저장]';
  note.appendChild(noteStrong);
  note.appendChild(document.createTextNode('을 눌러 현재 데이터를 안전하게 보관하세요.'));
  card.appendChild(note);

  const backupStatus = document.createElement('div');
  backupStatus.id = 'clearProfileBackupStatus';
  backupStatus.style.cssText = 'margin:0 0 14px; padding:8px 12px; background:#f3f4f6; border-radius:6px; font-size:0.8rem; color:#6b7280; min-height:1.4em;';
  backupStatus.textContent = '백업 미저장';
  card.appendChild(backupStatus);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap;';

  // [백업 저장하기] — 강조: indigo, full width
  const btnBackup = document.createElement('button');
  btnBackup.type = 'button';
  btnBackup.textContent = '💾 백업 저장하기';
  btnBackup.style.cssText = 'flex:1 1 100%; padding:11px 16px; background:#4f46e5; color:#fff; border:none; border-radius:8px; font-size:0.95rem; font-weight:600; cursor:pointer;';
  btnBackup.onclick = function () {
    const ok = _downloadFullBackup();
    backupStatus.textContent = ok ? '✅ 백업 다운로드됨 — 안전하게 삭제 가능' : '⚠️ 백업 다운로드 실패';
    backupStatus.style.background = ok ? '#dcfce7' : '#fee2e2';
    backupStatus.style.color = ok ? '#166534' : '#991b1b';
    btnBackup.disabled = true;
    btnBackup.style.background = '#9ca3af';
    btnBackup.style.cursor = 'default';
    btnBackup.textContent = '✅ 백업 저장됨';
  };
  btnRow.appendChild(btnBackup);

  // [취소] — 보조
  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.textContent = '취소';
  btnCancel.style.cssText = 'flex:1 1 45%; padding:10px 16px; background:#e5e7eb; color:#374151; border:none; border-radius:8px; font-size:0.9rem; font-weight:500; cursor:pointer;';
  btnCancel.onclick = function () { overlay.remove(); };
  btnRow.appendChild(btnCancel);

  // [모두 삭제] — 위험
  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '🗑 모두 삭제';
  btnDelete.style.cssText = 'flex:1 1 45%; padding:10px 16px; background:#dc2626; color:#fff; border:none; border-radius:8px; font-size:0.9rem; font-weight:600; cursor:pointer;';
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
  if (typeof window.__bhmConfirmClearForTest === 'function' && window.__bhmConfirmClearForTest()) {
    _executeFullClear(keys);
    return;
  }
  _openClearProfileModal(keys);
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
 * 퇴직금 탭 retBirthDate → 개인정보 탭 pfBirthDate 동기화 + localStorage 저장
 */
function syncBirthDateToProfile(val) {
  const pfEl = document.getElementById('pfBirthDate');
  if (pfEl && pfEl.value !== val) pfEl.value = val;

  // 다른 퇴직금 필드도 동기화
  ['retBirthDate', 'retScBirthDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== val) el.value = val;
  });

  // profile localStorage에 즉시 반영
  const saved = PROFILE.load() || {};
  saved.birthDate = val;
  PROFILE.save(saved);
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
import { registerActions as _profile_registerActions } from './shared-utils.js';
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

// Phase 3-regression: cross-module bare 호출 → window 호환층 복원
if (typeof window !== 'undefined') {
  window.initProfileTab = initProfileTab;
  window.updateProfileGrades = updateProfileGrades;
  window.toggleChildFields = toggleChildFields;
  window._collapseBasicFieldsWithPreview = _collapseBasicFieldsWithPreview;
  window._seedFirstWorkFromProfile = _seedFirstWorkFromProfile;
  // tab-profile.html fragment 의 inline onchange="_suggestYear(...)" 가 호출
  window._suggestYear = _suggestYear;
}
export {};