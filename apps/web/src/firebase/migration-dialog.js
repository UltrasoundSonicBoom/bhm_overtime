// firebase/migration-dialog.js — Phase 8 마이그레이션 다이얼로그
//
// 게스트 데이터 → Firestore 동기화 (카테고리별 동의 + flag idempotency)
//
// 흐름:
//   1. shouldShowMigration(uid): 게스트 데이터 존재 + migration_done flag 없음 → true
//   2. openMigrationDialog(uid): 2단계 UI
//      - Step 1: 간단 확인 ("전체 동기화?" 예/아니요)
//      - Step 2: 카테고리 선택 (아니요 선택 시)
//   3. uploadCategories(uid, categories): 게스트 localStorage → Firestore write
//   4. FLAG_KEY 설정 → shouldShowMigration 이후 false 반환 (idempotent)
//
// Non-pushy UX: URL 자동 오픈 없음, 명시적 사용자 액션으로만 트리거.

import { humanReason } from './migration-errors.js';

// humanReason 은 단위 테스트를 위해 별도 모듈에서 정의. 외부 호환을 위해 re-export.
export { humanReason };

const FLAG_KEY = 'snuhmate_migration_done_v1';
const SNOOZE_KEY = 'snuhmate_migration_snooze_v1';
const FAIL_COUNT_KEY = 'snuhmate_migration_fail_count_v1';
// '나중에' / '×' 버튼이 24h snooze 적용. 또한 N회 연속 실패 후 soft-snooze 에도 사용.
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000;
// 영구 실패 (예: 권한 거부) 시 매 페이지 로드마다 dialog 가 재출현하는 pushy UX 를 막기 위한 임계값.
const MAX_CONSECUTIVE_FAILURES = 3;

const GUEST_FLAT_KEYS = [
  'snuhmate_hr_profile_guest',
  'overtimeRecords_guest',
  'snuhmate_work_history_guest',
  'snuhmate_reg_favorites_guest',
  'otManualHourly_guest',
  'overtimePayslipData_guest',
  'overtimePayslipData',
  'leaveRecords',
  'leaveRecords_guest',
  'snuhmate_schedule_records',
  'snuhmate_settings',
];

const PAYSLIP_GUEST_KEY_RE = /^payslip_guest_\d{4}_\d{2}(_.+)?$/;

function _parseStored(raw) {
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function _isMeaningfulValue(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  return !!value;
}

function _snapshotHasData(snapshot) {
  if (!snapshot) return false;
  return Object.values(snapshot.flat || {}).some(_isMeaningfulValue) ||
    Object.keys(snapshot.payslips || {}).length > 0;
}

function _stringifyComparable(value) {
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function captureGuestMigrationSnapshot() {
  const flat = {};
  const payslips = {};
  try {
    for (const k of GUEST_FLAT_KEYS) {
      const raw = localStorage.getItem(k);
      const parsed = _parseStored(raw);
      if (_isMeaningfulValue(parsed)) flat[k] = parsed;
    }
    Object.keys(localStorage)
      .filter(k => PAYSLIP_GUEST_KEY_RE.test(k))
      .forEach(k => {
        const parsed = _parseStored(localStorage.getItem(k));
        if (_isMeaningfulValue(parsed)) payslips[k] = parsed;
      });
  } catch {}
  return { flat, payslips, capturedAt: Date.now() };
}

function _clearAllGuestData(snapshot = null) {
  const sharedKeys = ['leaveRecords', 'snuhmate_schedule_records', 'overtimePayslipData'];
  for (const k of GUEST_FLAT_KEYS) {
    if (sharedKeys.includes(k) || k === 'snuhmate_settings') continue;
    localStorage.removeItem(k);
  }
  const payslipKeys = Object.keys(localStorage).filter(k => PAYSLIP_GUEST_KEY_RE.test(k));
  for (const k of payslipKeys) localStorage.removeItem(k);

  // leaveRecords / schedule_records / legacy overtimePayslipData 는 공유 키라서
  // 로그인 후 hydrate 가 이미 cloud 값을 써둔 경우까지 지우면 안 된다.
  for (const k of sharedKeys) {
    const snapValue = snapshot?.flat?.[k];
    if (snapValue === undefined) continue;
    const current = _parseStored(localStorage.getItem(k));
    if (_stringifyComparable(current) === _stringifyComparable(snapValue)) {
      localStorage.removeItem(k);
    }
  }
}

// ── 카테고리 정의 ──────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'identity',
    label: '내 정보',
    desc: '이름, 사번, 부서, 입사일 등 프로필',
    guestKey: () => 'snuhmate_hr_profile_guest',
  },
  {
    id: 'payroll',
    label: '급여 정보',
    desc: '시급, 연봉, 수당 정책',
    guestKey: () => 'snuhmate_hr_profile_guest',
  },
  {
    id: 'overtime',
    label: '시간외 기록',
    desc: '시간외·온콜 근무 기록',
    guestKey: () => 'overtimeRecords_guest',
  },
  {
    id: 'schedule',
    label: '근무표',
    desc: '월별 근무표와 자동 생성 기준',
    guestKey: () => 'snuhmate_schedule_records',
  },
  {
    id: 'payslips',
    label: '급여명세서',
    desc: 'PDF 파싱 결과와 시간외 보충 데이터',
    guestKey: () => null,
  },
  {
    id: 'leave',
    label: '휴가 기록',
    desc: '연차·병가·청원 휴가 사용 내역',
    guestKey: () => 'leaveRecords',
  },
  {
    id: 'workHistory',
    label: '근무이력',
    desc: '부서·로테이션 경력 정보',
    guestKey: () => 'snuhmate_work_history_guest',
  },
  {
    id: 'settings',
    label: '앱 설정',
    desc: '테마, AppLock PIN 등',
    guestKey: () => null,
  },
  {
    id: 'reference',
    label: '즐겨찾기',
    desc: '찾아보기 탭 규정 즐겨찾기',
    guestKey: () => 'snuhmate_reg_favorites_guest',
  },
];

// ── 게스트 데이터 존재 여부 체크 ──────────────────────────────────────────
function _hasGuestData() {
  try {
    return _snapshotHasData(captureGuestMigrationSnapshot());
  } catch { return false; }
}

export async function shouldShowMigration(uid, snapshot = null) {
  if (!uid) return false;
  try {
    if (localStorage.getItem(FLAG_KEY)) return false;
    const snooze = localStorage.getItem(SNOOZE_KEY);
    if (snooze) {
      const snoozeUntil = parseInt(snooze, 10);
      if (Number.isFinite(snoozeUntil) && Date.now() < snoozeUntil) return false;
      localStorage.removeItem(SNOOZE_KEY);
    }
    return snapshot ? _snapshotHasData(snapshot) : _hasGuestData();
  } catch { return false; }
}

function _snapshotValue(snapshot, key) {
  if (snapshot && Object.prototype.hasOwnProperty.call(snapshot.flat || {}, key)) {
    return snapshot.flat[key];
  }
  return _parseStored(localStorage.getItem(key));
}

function _monthFromPayslipKey(key) {
  const m = /^payslip_guest_(\d{4})_(\d{2})(?:_.+)?$/.exec(key);
  return m ? `${m[1]}-${m[2]}` : null;
}

function _typeFromPayslipKey(key) {
  const m = /^payslip_guest_\d{4}_\d{2}_(.+)$/.exec(key);
  return m ? m[1] : '급여';
}

function _uidPayslipKey(uid, guestKey) {
  return guestKey.replace(/^payslip_guest_/, `payslip_${uid}_`);
}

function _mergePayslipMaps(...maps) {
  const merged = {};
  for (const map of maps) {
    if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
    for (const [payMonth, data] of Object.entries(map)) {
      if (!/^\d{4}-\d{2}$/.test(payMonth)) continue;
      merged[payMonth] = { ...(merged[payMonth] || {}), ...(data || {}) };
    }
  }
  return merged;
}

function _applySnapshotToUidLocal(uid, selectedIds, snapshot) {
  if (!uid || !snapshot) return;
  const flat = snapshot.flat || {};
  try {
    if ((selectedIds.includes('identity') || selectedIds.includes('payroll')) && flat.snuhmate_hr_profile_guest) {
      localStorage.setItem(`snuhmate_hr_profile_uid_${uid}`, JSON.stringify(flat.snuhmate_hr_profile_guest));
    }
    if (selectedIds.includes('payroll') && flat.otManualHourly_guest != null) {
      localStorage.setItem(`otManualHourly_uid_${uid}`, String(flat.otManualHourly_guest));
    }
    if (selectedIds.includes('overtime') && flat.overtimeRecords_guest) {
      localStorage.setItem(`overtimeRecords_uid_${uid}`, JSON.stringify(flat.overtimeRecords_guest));
    }
    if (selectedIds.includes('leave') && (flat.leaveRecords || flat.leaveRecords_guest)) {
      localStorage.setItem('leaveRecords', JSON.stringify(flat.leaveRecords || flat.leaveRecords_guest));
    }
    if ((selectedIds.includes('schedule') || selectedIds.includes('overtime')) && flat.snuhmate_schedule_records) {
      localStorage.setItem('snuhmate_schedule_records', JSON.stringify(flat.snuhmate_schedule_records));
    }
    if (selectedIds.includes('workHistory') && flat.snuhmate_work_history_guest) {
      localStorage.setItem(`snuhmate_work_history_uid_${uid}`, JSON.stringify(flat.snuhmate_work_history_guest));
    }
    if (selectedIds.includes('reference') && flat.snuhmate_reg_favorites_guest) {
      localStorage.setItem(`snuhmate_reg_favorites_uid_${uid}`, JSON.stringify(flat.snuhmate_reg_favorites_guest));
    }
    if (selectedIds.includes('payslips')) {
      const supplemental = _mergePayslipMaps(flat.overtimePayslipData_guest, flat.overtimePayslipData);
      if (Object.keys(supplemental).length > 0) {
        localStorage.setItem(`overtimePayslipData_uid_${uid}`, JSON.stringify(supplemental));
      }
      for (const [guestKey, data] of Object.entries(snapshot.payslips || {})) {
        localStorage.setItem(_uidPayslipKey(uid, guestKey), JSON.stringify(data));
      }
    }
    if (selectedIds.includes('settings') && flat.snuhmate_settings) {
      const existing = _parseStored(localStorage.getItem('snuhmate_settings')) || {};
      localStorage.setItem('snuhmate_settings', JSON.stringify({
        ...flat.snuhmate_settings,
        googleSub: existing.googleSub || uid,
      }));
    }
  } catch (e) {
    console.warn('[migration] uid local mirror 실패', e?.message);
  }
}

function _dispatchMigrationRefresh(uid, ok, failed) {
  if (typeof window === 'undefined') return;
  const detail = { source: 'migration', uid, ok, failed };
  [
    'profileChanged',
    'overtimeChanged',
    'leaveChanged',
    'payslipChanged',
    'scheduleChanged',
    'workHistoryChanged',
    'settingsChanged',
    'favoritesChanged',
  ].forEach(name => {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
  });
}

// ── 업로드 로직 ───────────────────────────────────────────────────────────
// returns { ok: string[], failed: Array<{id: string, label: string, reason: string}> }
export async function uploadCategories(uid, selectedIds, snapshot = null) {
  const syncTasks = [];
  const source = snapshot || captureGuestMigrationSnapshot();

  if (selectedIds.includes('identity') || selectedIds.includes('payroll')) {
    syncTasks.push({
      id: 'profile',
      label: '프로필',
      run: async () => {
        const profile = _snapshotValue(source, 'snuhmate_hr_profile_guest');
        if (!profile) return;
        const { writeProfile } = await import('/src/firebase/sync/profile-sync.js');
        await writeProfile(null, uid, profile);
      },
    });
  }

  if (selectedIds.includes('payroll')) {
    syncTasks.push({
      id: 'manualHourly',
      label: '수동 시급',
      run: async () => {
        const raw = _snapshotValue(source, 'otManualHourly_guest');
        if (raw == null || raw === '') return;
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) return;
        const { writeManualHourly } = await import('/src/firebase/sync/settings-sync.js');
        await writeManualHourly(null, uid, value);
      },
    });
  }

  if (selectedIds.includes('overtime')) {
    syncTasks.push({
      id: 'overtime',
      label: '시간외',
      run: async () => {
        const data = _snapshotValue(source, 'overtimeRecords_guest');
        if (!data) return;
        const { writeAllOvertime } = await import('/src/firebase/sync/overtime-sync.js');
        await writeAllOvertime(null, uid, data);
      },
    });
  }

  if (selectedIds.includes('leave')) {
    syncTasks.push({
      id: 'leave',
      label: '휴가',
      run: async () => {
        const data = _snapshotValue(source, 'leaveRecords') || _snapshotValue(source, 'leaveRecords_guest');
        if (!data) return;
        const { writeAllLeave } = await import('/src/firebase/sync/leave-sync.js');
        await writeAllLeave(null, uid, data);
      },
    });
  }

  if (selectedIds.includes('schedule') || selectedIds.includes('overtime')) {
    syncTasks.push({
      id: 'schedule',
      label: '근무표',
      run: async () => {
        const data = _snapshotValue(source, 'snuhmate_schedule_records');
        if (!data) return;
        const { writeAllSchedule } = await import('/src/firebase/sync/schedule-sync.js');
        await writeAllSchedule(null, uid, data);
      },
    });
  }

  if (selectedIds.includes('payslips') || selectedIds.includes('payroll')) {
    syncTasks.push({
      id: 'payslips',
      label: '급여명세서',
      run: async () => {
        const { writePayslip, writeAllPayslips } = await import('/src/firebase/sync/payslip-sync.js');
        const supplemental = _mergePayslipMaps(
          _snapshotValue(source, 'overtimePayslipData_guest'),
          _snapshotValue(source, 'overtimePayslipData'),
        );
        if (Object.keys(supplemental).length > 0) {
          await writeAllPayslips(null, uid, supplemental);
        }
        await Promise.all(Object.entries(source.payslips || {}).map(([key, data]) => {
          const payMonth = _monthFromPayslipKey(key);
          if (!payMonth) return Promise.resolve();
          return writePayslip(null, uid, payMonth, data, undefined, _typeFromPayslipKey(key));
        }));
      },
    });
  }

  if (selectedIds.includes('workHistory')) {
    syncTasks.push({
      id: 'workHistory',
      label: '근무이력',
      run: async () => {
        const entries = _snapshotValue(source, 'snuhmate_work_history_guest');
        if (!entries) return;
        const { writeAllWorkHistory } = await import('/src/firebase/sync/work-history-sync.js');
        await writeAllWorkHistory(null, uid, Array.isArray(entries) ? entries : []);
      },
    });
  }

  if (selectedIds.includes('settings')) {
    syncTasks.push({
      id: 'settings',
      label: '설정',
      run: async () => {
        const settings = _snapshotValue(source, 'snuhmate_settings');
        if (!settings) return;
        const { writeSettings } = await import('/src/firebase/sync/settings-sync.js');
        await writeSettings(null, uid, settings);
      },
    });
  }

  if (selectedIds.includes('reference')) {
    syncTasks.push({
      id: 'reference',
      label: '즐겨찾기',
      run: async () => {
        const favs = _snapshotValue(source, 'snuhmate_reg_favorites_guest');
        if (!favs) return;
        const { writeFavorites } = await import('/src/firebase/sync/favorites-sync.js');
        await writeFavorites(null, uid, Array.isArray(favs) ? favs : []);
      },
    });
  }

  const settled = await Promise.allSettled(syncTasks.map(t => t.run()));
  const ok = [];
  const failed = []; // [{ id, label, reason }]
  for (let i = 0; i < syncTasks.length; i++) {
    if (settled[i].status === 'fulfilled') {
      ok.push(syncTasks[i].label);
    } else {
      const reason = humanReason(settled[i].reason);
      failed.push({ id: syncTasks[i].id, label: syncTasks[i].label, reason });
      console.warn(`[migration] ${syncTasks[i].label} sync 실패`, settled[i].reason?.message, settled[i].reason);
    }
  }

  if (failed.length === 0) {
    localStorage.setItem(FLAG_KEY, new Date().toISOString());
    localStorage.removeItem(SNOOZE_KEY);
    localStorage.removeItem(FAIL_COUNT_KEY);
    _clearAllGuestData(source);
    _applySnapshotToUidLocal(uid, selectedIds, source);
    _dispatchMigrationRefresh(uid, ok, failed);
  } else {
    // 실패 카운트 증가. 임계값 초과 시 호출자(doSync)가 soft-snooze 적용.
    const prev = parseInt(localStorage.getItem(FAIL_COUNT_KEY) || '0', 10) || 0;
    localStorage.setItem(FAIL_COUNT_KEY, String(prev + 1));
  }
  return { ok, failed };
}

// 연속 실패가 임계값 이상인지 — doSync 의 닫기 핸들러가 soft-snooze 결정에 사용.
export function shouldSoftSnooze() {
  try {
    const n = parseInt(localStorage.getItem(FAIL_COUNT_KEY) || '0', 10) || 0;
    return n >= MAX_CONSECUTIVE_FAILURES;
  } catch { return false; }
}

// ── 마이그레이션 다이얼로그 DOM ───────────────────────────────────────────
export async function openMigrationDialog(uid, snapshot = null) {
  if (!uid) return;
  if (document.getElementById('snuhmate-migration-dialog')) return;

  const overlay = document.createElement('div');
  overlay.id = 'snuhmate-migration-dialog';
  overlay.className = 'fixed inset-0 z-[9200] bg-black/60 flex items-end justify-center';

  function makePanel(hidden) {
    const p = document.createElement('div');
    p.className = [
      'bg-[var(--bg-card)]',
      'border-t border-[var(--border-glass)]',
      'rounded-t-[20px]',
      'px-5 pt-6 pb-8',
      'w-full max-w-[600px]',
      'max-h-[90vh] overflow-y-auto',
    ].join(' ');
    if (hidden) p.style.display = 'none';
    return p;
  }

  // ── Step 1: 간단 확인 패널 ────────────────────────────────────────────
  const step1 = makePanel(false);

  const s1Icon = document.createElement('div');
  s1Icon.className = 'text-2xl text-center mb-3';
  s1Icon.textContent = '☁️';

  const s1Title = document.createElement('h2');
  s1Title.className = 'text-[length:var(--text-title-large)] font-bold text-[var(--text-primary)] text-center m-0 mb-3';
  s1Title.textContent = '클라우드 동기화';

  const s1Desc = document.createElement('p');
  s1Desc.className = 'text-sm text-[var(--text-secondary)] text-center mt-0 mb-2 leading-relaxed';
  s1Desc.textContent = '게스트로 입력한 데이터를 클라우드에 동기화하시겠습니까?';

  const s1Hint = document.createElement('p');
  s1Hint.className = 'text-xs text-[var(--text-muted)] text-center mt-0 mb-2';
  s1Hint.textContent = '동기화 후 로컬 게스트 데이터는 정리됩니다.';

  // Detect if there are guest payslip keys to surface a payslip-specific notice
  const _hasGuestPayslip = snapshot
    ? Object.keys(snapshot.payslips || {}).length > 0
    : Object.keys(localStorage).some(k => PAYSLIP_GUEST_KEY_RE.test(k));
  let s1PayslipNote = null;
  if (_hasGuestPayslip) {
    s1PayslipNote = document.createElement('p');
    s1PayslipNote.className = 'text-xs text-[var(--accent-amber,#d97706)] text-center mt-0 mb-6';
    s1PayslipNote.textContent = '※ 급여명세서도 함께 클라우드에 동기화됩니다.';
  }

  const s1Actions = document.createElement('div');
  s1Actions.className = 'grid grid-cols-2 gap-2.5';

  const s1NoBtn = document.createElement('button');
  s1NoBtn.type = 'button';
  s1NoBtn.className = 'btn btn-secondary btn-full';
  s1NoBtn.textContent = '아니요 (선택)';

  const s1YesBtn = document.createElement('button');
  s1YesBtn.type = 'button';
  s1YesBtn.className = 'btn btn-primary btn-full';
  s1YesBtn.textContent = '예 (전체 동기화)';

  s1Actions.appendChild(s1NoBtn);
  s1Actions.appendChild(s1YesBtn);
  step1.appendChild(s1Icon);
  step1.appendChild(s1Title);
  step1.appendChild(s1Desc);
  step1.appendChild(s1Hint);
  if (s1PayslipNote) step1.appendChild(s1PayslipNote);
  step1.appendChild(s1Actions);

  // ── Step 2: 카테고리 선택 패널 ───────────────────────────────────────
  const step2 = makePanel(true);

  const hdr = document.createElement('div');
  hdr.className = 'flex items-center justify-between mb-1';

  const titleRow = document.createElement('div');
  titleRow.className = 'flex items-center gap-2';
  const titleIcon = document.createElement('span');
  titleIcon.textContent = '☁️';
  const titleText = document.createElement('h2');
  titleText.className = 'text-[length:var(--text-title-large)] font-bold text-[var(--text-primary)] m-0';
  titleText.textContent = '동기화 항목 선택';
  titleRow.appendChild(titleIcon);
  titleRow.appendChild(titleText);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn-icon';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', '닫기');
  closeBtn.addEventListener('click', snoozeAndClose);

  hdr.appendChild(titleRow);
  hdr.appendChild(closeBtn);

  const s2Desc = document.createElement('p');
  s2Desc.className = 'text-sm text-[var(--text-muted)] mt-2 mb-5 leading-relaxed';
  s2Desc.textContent = '동기화 후 게스트 데이터는 정리됩니다. 선택하지 않은 항목은 업로드되지 않고 그대로 정리됩니다.';

  const checkboxes = {};
  const listEl = document.createElement('div');
  listEl.className = 'flex flex-col gap-2.5 mb-5';

  for (const cat of CATEGORIES) {
    const row = document.createElement('label');
    row.className = [
      'flex items-center gap-3 p-3 cursor-pointer',
      'border border-[var(--border-glass)]',
      'rounded-[var(--radius-sm)] bg-[var(--bg-card)]',
      'hover:border-[var(--border-active)] transition-colors',
    ].join(' ');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.className = 'w-[18px] h-[18px] shrink-0 cursor-pointer accent-[var(--accent-indigo)]';
    checkboxes[cat.id] = cb;

    const textWrap = document.createElement('div');
    const labelEl = document.createElement('div');
    labelEl.className = 'font-semibold text-sm text-[var(--text-primary)]';
    labelEl.textContent = cat.label;
    const descEl = document.createElement('div');
    descEl.className = 'text-xs text-[var(--text-muted)] mt-0.5';
    descEl.textContent = cat.desc;
    textWrap.appendChild(labelEl);
    textWrap.appendChild(descEl);

    row.appendChild(cb);
    row.appendChild(textWrap);
    listEl.appendChild(row);
  }

  const s2Actions = document.createElement('div');
  s2Actions.className = 'grid grid-cols-[1fr_2fr] gap-2.5';

  const skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'btn btn-secondary btn-full';
  skipBtn.textContent = '나중에';
  skipBtn.addEventListener('click', snoozeAndClose);

  const syncBtn = document.createElement('button');
  syncBtn.type = 'button';
  syncBtn.className = 'btn btn-primary btn-full';
  syncBtn.textContent = '선택 항목 동기화';

  s2Actions.appendChild(skipBtn);
  s2Actions.appendChild(syncBtn);

  step2.appendChild(hdr);
  step2.appendChild(s2Desc);
  step2.appendChild(listEl);
  step2.appendChild(s2Actions);

  overlay.appendChild(step1);
  overlay.appendChild(step2);
  document.body.appendChild(overlay);

  // ── 닫기 핸들러 헬퍼 ─────────────────────────────────────────────────
  function snoozeAndClose() {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DURATION_MS)); } catch {}
    overlay.remove();
  }
  function _closeNoSnooze() {
    overlay.remove();
  }

  // ── 동기화 실행 (공통) ────────────────────────────────────────────────
  async function doSync(selectedIds, activeBtn) {
    activeBtn.disabled = true;
    activeBtn.textContent = '업로드 중…';

    const { ok, failed } = await uploadCategories(uid, selectedIds, snapshot);

    // 사용자가 await 중에 dialog 를 닫은 경우 — 후속 DOM 작업이 detached 노드에 닿지 않도록 즉시 종료
    if (!overlay.isConnected) return;

    // 이전 fail 박스 제거 (재시도 시 중복 방지)
    const prevFailBox = overlay.querySelector('[data-role="fail-box"]');
    if (prevFailBox) prevFailBox.remove();

    if (failed.length === 0) {
      // 이전 retry 에서 closeBtn 가 _closeNoSnooze 로 swap 되었을 수 있음 — 복원 (멱등)
      closeBtn.removeEventListener('click', _closeNoSnooze);
      closeBtn.removeEventListener('click', snoozeAndClose);
      closeBtn.addEventListener('click', snoozeAndClose);
      activeBtn.textContent = ok.length > 0 ? `완료! (${ok.length}개)` : '완료!';
      setTimeout(() => overlay.remove(), 1200);
      return;
    }

    activeBtn.textContent = `완료 ${ok.length} / 실패 ${failed.length}`;

    const failBox = document.createElement('div');
    failBox.dataset.role = 'fail-box';
    failBox.className = 'mt-3 p-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border-glass)]';

    const failTitle = document.createElement('div');
    failTitle.className = 'text-xs font-semibold text-[var(--text-primary)] mb-2';
    failTitle.textContent = '아래 항목 동기화에 실패했습니다';
    failBox.appendChild(failTitle);

    const failList = document.createElement('ul');
    failList.className = 'text-xs text-[var(--text-muted)] m-0 mb-3 pl-4 list-disc space-y-1';
    for (const f of failed) {
      const li = document.createElement('li');
      const labelSpan = document.createElement('span');
      labelSpan.className = 'font-semibold text-[var(--text-primary)]';
      labelSpan.textContent = f.label;
      const reasonSpan = document.createElement('span');
      reasonSpan.textContent = ' — ' + f.reason;
      li.appendChild(labelSpan);
      li.appendChild(reasonSpan);
      failList.appendChild(li);
    }
    failBox.appendChild(failList);

    // N회 연속 실패 시 soft-snooze: '다음 로그인 자동 재시도' 약속을 깨지 않으면서
    // 매 페이지 로드 재출현 (pushy UX) 을 막는다. closeManualBtn / '×' 가 24h SNOOZE 적용.
    const softSnooze = shouldSoftSnooze();

    const note = document.createElement('p');
    note.className = 'text-xs text-[var(--text-muted)] m-0 mb-3';
    note.textContent = softSnooze
      ? '연속 실패가 누적되어, 닫으면 24시간 후 다시 안내합니다.'
      : '닫으면 다음 로그인 시 자동으로 다시 시도합니다.';
    failBox.appendChild(note);

    const btnRow = document.createElement('div');
    btnRow.className = 'grid grid-cols-2 gap-2.5';

    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn btn-primary btn-full';
    retryBtn.textContent = '지금 재시도';
    retryBtn.addEventListener('click', () => {
      retryBtn.disabled = true;
      doSync(failed.map(f => f.id), activeBtn);
    });

    const closeManualBtn = document.createElement('button');
    closeManualBtn.type = 'button';
    closeManualBtn.className = 'btn btn-secondary btn-full';
    closeManualBtn.textContent = '닫기';
    closeManualBtn.addEventListener('click', softSnooze ? snoozeAndClose : () => overlay.remove());

    btnRow.appendChild(closeManualBtn);
    btnRow.appendChild(retryBtn);
    failBox.appendChild(btnRow);

    activeBtn.parentElement.appendChild(failBox);

    // failBox 가 보이는 동안 '×' 의 동작은 closeManualBtn 과 동일하게 일치시킴
    // (소프트 스누즈 발동 시: snoozeAndClose / 평상시: 단순 닫기)
    closeBtn.removeEventListener('click', snoozeAndClose);
    closeBtn.removeEventListener('click', _closeNoSnooze);
    closeBtn.addEventListener('click', softSnooze ? snoozeAndClose : _closeNoSnooze);
  }

  // ── 이벤트 바인딩 ─────────────────────────────────────────────────────
  s1YesBtn.addEventListener('click', () => {
    doSync(CATEGORIES.map(c => c.id), s1YesBtn);
  });

  s1NoBtn.addEventListener('click', () => {
    step1.style.display = 'none';
    step2.style.display = '';
  });

  syncBtn.addEventListener('click', () => {
    const selected = Object.entries(checkboxes)
      .filter(([, cb]) => cb.checked)
      .map(([id]) => id);
    if (selected.length === 0) { overlay.remove(); return; }
    doSync(selected, syncBtn);
  });
}
