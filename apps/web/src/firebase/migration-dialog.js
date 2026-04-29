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
  'leaveRecords',
];

const PAYSLIP_GUEST_KEY_RE = /^payslip_guest_\d{4}_\d{2}(_.+)?$/;

function _clearAllGuestData() {
  for (const k of GUEST_FLAT_KEYS) localStorage.removeItem(k);
  const payslipKeys = Object.keys(localStorage).filter(k => PAYSLIP_GUEST_KEY_RE.test(k));
  for (const k of payslipKeys) localStorage.removeItem(k);
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
    const hasFlatGuest = GUEST_FLAT_KEYS.some(k => {
      const v = localStorage.getItem(k);
      if (!v) return false;
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.length > 0;
        if (typeof parsed === 'object') return Object.keys(parsed).length > 0;
        return !!parsed;
      } catch { return !!v; }
    });
    if (hasFlatGuest) return true;
    return Object.keys(localStorage).some(k => PAYSLIP_GUEST_KEY_RE.test(k));
  } catch { return false; }
}

export async function shouldShowMigration(uid) {
  if (!uid) return false;
  try {
    if (localStorage.getItem(FLAG_KEY)) return false;
    const snooze = localStorage.getItem(SNOOZE_KEY);
    if (snooze) {
      const snoozeUntil = parseInt(snooze, 10);
      if (Number.isFinite(snoozeUntil) && Date.now() < snoozeUntil) return false;
      localStorage.removeItem(SNOOZE_KEY);
    }
    return _hasGuestData();
  } catch { return false; }
}

// ── 업로드 로직 ───────────────────────────────────────────────────────────
// returns { ok: string[], failed: Array<{id: string, label: string, reason: string}> }
export async function uploadCategories(uid, selectedIds) {
  const syncTasks = [];

  if (selectedIds.includes('identity') || selectedIds.includes('payroll')) {
    syncTasks.push({
      id: 'profile',
      label: '프로필',
      run: async () => {
        const raw = localStorage.getItem('snuhmate_hr_profile_guest');
        if (!raw) return;
        const profile = JSON.parse(raw);
        const { writeProfile } = await import('/src/firebase/sync/profile-sync.js');
        await writeProfile(null, uid, profile);
      },
    });
  }

  if (selectedIds.includes('overtime')) {
    syncTasks.push({
      id: 'overtime',
      label: '시간외',
      run: async () => {
        const raw = localStorage.getItem('overtimeRecords_guest');
        if (!raw) return;
        const data = JSON.parse(raw);
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
        const raw = localStorage.getItem('leaveRecords');
        if (!raw) return;
        const data = JSON.parse(raw);
        const { writeAllLeave } = await import('/src/firebase/sync/leave-sync.js');
        await writeAllLeave(null, uid, data);
      },
    });
  }

  if (selectedIds.includes('schedule') || selectedIds.includes('overtime')) {
    // 근무표는 overtime 항목과 함께 마이그레이션 (자동 레코드 의존성 때문에)
    const raw = localStorage.getItem('snuhmate_schedule_records');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const { writeAllSchedule } = await import('/src/firebase/sync/schedule-sync.js');
        tasks.push(writeAllSchedule(null, uid, data));
      } catch (e) {
        console.warn('[migration] schedule sync 실패', e?.message);
      }
    }
  }

  if (selectedIds.includes('workHistory')) {
    syncTasks.push({
      id: 'workHistory',
      label: '근무이력',
      run: async () => {
        const raw = localStorage.getItem('snuhmate_work_history_guest');
        if (!raw) return;
        const entries = JSON.parse(raw);
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
        const raw = localStorage.getItem('snuhmate_settings');
        if (!raw) return;
        const settings = JSON.parse(raw);
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
        const raw = localStorage.getItem('snuhmate_reg_favorites_guest');
        if (!raw) return;
        const favs = JSON.parse(raw);
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
    _clearAllGuestData();
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
export async function openMigrationDialog(uid) {
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
  const _hasGuestPayslip = Object.keys(localStorage).some(k => PAYSLIP_GUEST_KEY_RE.test(k));
  let s1PayslipNote = null;
  if (_hasGuestPayslip) {
    s1PayslipNote = document.createElement('p');
    s1PayslipNote.className = 'text-xs text-[var(--accent-amber,#d97706)] text-center mt-0 mb-6';
    s1PayslipNote.textContent = '※ 급여명세서는 클라우드 미동기화입니다. 자동 정리되니 필요 시 미리 백업하세요.';
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

    const { ok, failed } = await uploadCategories(uid, selectedIds);

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
