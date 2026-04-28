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

const FLAG_KEY = 'snuhmate_migration_done_v1';

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
    const checks = [
      'snuhmate_hr_profile_guest',
      'overtimeRecords_guest',
      'snuhmate_work_history_guest',
      'snuhmate_reg_favorites_guest',
      'leaveRecords',
    ];
    return checks.some(k => {
      const v = localStorage.getItem(k);
      if (!v) return false;
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.length > 0;
        if (typeof parsed === 'object') return Object.keys(parsed).length > 0;
        return !!parsed;
      } catch { return !!v; }
    });
  } catch { return false; }
}

export async function shouldShowMigration(uid) {
  if (!uid) return false;
  try {
    if (localStorage.getItem(FLAG_KEY)) return false;
    return _hasGuestData();
  } catch { return false; }
}

// ── 업로드 로직 ───────────────────────────────────────────────────────────
// returns { ok: string[], failed: string[] }
export async function uploadCategories(uid, selectedIds) {
  const syncTasks = [];

  if (selectedIds.includes('identity') || selectedIds.includes('payroll')) {
    syncTasks.push({
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

  if (selectedIds.includes('workHistory')) {
    syncTasks.push({
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
  const failed = [];
  for (let i = 0; i < syncTasks.length; i++) {
    if (settled[i].status === 'fulfilled') {
      ok.push(syncTasks[i].label);
    } else {
      failed.push(syncTasks[i].label);
      console.warn(`[migration] ${syncTasks[i].label} sync 실패`, settled[i].reason?.message);
    }
  }

  localStorage.setItem(FLAG_KEY, new Date().toISOString());
  return { ok, failed };
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
  s1Desc.textContent = '핸드폰에 저장된 내용 전체를 클라우드에 동기화하시겠습니까?';

  const s1Hint = document.createElement('p');
  s1Hint.className = 'text-xs text-[var(--text-muted)] text-center mt-0 mb-6';
  s1Hint.textContent = '모든 데이터는 암호화되어 전송됩니다.';

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
  closeBtn.addEventListener('click', () => overlay.remove());

  hdr.appendChild(titleRow);
  hdr.appendChild(closeBtn);

  const s2Desc = document.createElement('p');
  s2Desc.className = 'text-sm text-[var(--text-muted)] mt-2 mb-5 leading-relaxed';
  s2Desc.textContent = '동기화할 항목을 선택하세요. 모든 데이터는 암호화되어 전송됩니다.';

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
  skipBtn.addEventListener('click', () => overlay.remove());

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

  // ── 동기화 실행 (공통) ────────────────────────────────────────────────
  async function doSync(selectedIds, activeBtn) {
    activeBtn.disabled = true;
    activeBtn.textContent = '업로드 중…';

    const { ok, failed } = await uploadCategories(uid, selectedIds);

    if (failed.length === 0) {
      activeBtn.textContent = ok.length > 0 ? `완료! (${ok.length}개)` : '완료!';
    } else {
      activeBtn.textContent = `완료 ${ok.length} / 실패 ${failed.length}`;
      console.warn('[migration] 실패 항목:', failed);
    }
    setTimeout(() => overlay.remove(), 1200);
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
