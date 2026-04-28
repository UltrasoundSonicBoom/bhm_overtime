// firebase/migration-dialog.js — Phase 8 마이그레이션 다이얼로그
//
// 게스트 데이터 → Firestore 동기화 (카테고리별 동의 + flag idempotency)
//
// 흐름:
//   1. shouldShowMigration(uid): 게스트 데이터 존재 + migration_done flag 없음 → true
//   2. openMigrationDialog(uid): 카테고리 체크박스 UI → 사용자 동의 → uploadCategories
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
export async function uploadCategories(uid, selectedIds) {
  const tasks = [];

  if (selectedIds.includes('identity') || selectedIds.includes('payroll')) {
    const raw = localStorage.getItem('snuhmate_hr_profile_guest');
    if (raw) {
      try {
        const profile = JSON.parse(raw);
        const { writeProfile } = await import('/src/firebase/sync/profile-sync.js');
        tasks.push(writeProfile(null, uid, profile));
      } catch (e) {
        console.warn('[migration] profile sync 실패', e?.message);
      }
    }
  }

  if (selectedIds.includes('overtime')) {
    const raw = localStorage.getItem('overtimeRecords_guest');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const { writeAllOvertime } = await import('/src/firebase/sync/overtime-sync.js');
        tasks.push(writeAllOvertime(null, uid, data));
      } catch (e) {
        console.warn('[migration] overtime sync 실패', e?.message);
      }
    }
  }

  if (selectedIds.includes('leave')) {
    const raw = localStorage.getItem('leaveRecords');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const { writeAllLeave } = await import('/src/firebase/sync/leave-sync.js');
        tasks.push(writeAllLeave(null, uid, data));
      } catch (e) {
        console.warn('[migration] leave sync 실패', e?.message);
      }
    }
  }

  if (selectedIds.includes('workHistory')) {
    const raw = localStorage.getItem('snuhmate_work_history_guest');
    if (raw) {
      try {
        const entries = JSON.parse(raw);
        const { writeAllWorkHistory } = await import('/src/firebase/sync/work-history-sync.js');
        tasks.push(writeAllWorkHistory(null, uid, Array.isArray(entries) ? entries : []));
      } catch (e) {
        console.warn('[migration] work_history sync 실패', e?.message);
      }
    }
  }

  if (selectedIds.includes('settings')) {
    const raw = localStorage.getItem('snuhmate_settings');
    if (raw) {
      try {
        const settings = JSON.parse(raw);
        const { writeSettings } = await import('/src/firebase/sync/settings-sync.js');
        tasks.push(writeSettings(null, uid, settings));
      } catch (e) {
        console.warn('[migration] settings sync 실패', e?.message);
      }
    }
  }

  if (selectedIds.includes('reference')) {
    const raw = localStorage.getItem('snuhmate_reg_favorites_guest');
    if (raw) {
      try {
        const favs = JSON.parse(raw);
        const { writeFavorites } = await import('/src/firebase/sync/favorites-sync.js');
        tasks.push(writeFavorites(null, uid, Array.isArray(favs) ? favs : []));
      } catch (e) {
        console.warn('[migration] favorites sync 실패', e?.message);
      }
    }
  }

  await Promise.allSettled(tasks);
  localStorage.setItem(FLAG_KEY, new Date().toISOString());
}

// ── 마이그레이션 다이얼로그 DOM ───────────────────────────────────────────
export async function openMigrationDialog(uid) {
  if (!uid) return;
  if (document.getElementById('snuhmate-migration-dialog')) return;

  // 오버레이 — 하단에서 올라오는 sheet
  const overlay = document.createElement('div');
  overlay.id = 'snuhmate-migration-dialog';
  overlay.className = 'fixed inset-0 z-[9200] bg-black/60 flex items-end justify-center';

  // 패널 — 디자인시스템 card 스타일 (상단 모서리만 둥글게)
  const panel = document.createElement('div');
  panel.className = [
    'bg-[var(--bg-card)]',
    'border-t border-[var(--border-glass)]',
    'rounded-t-[20px]',
    'px-5 pt-6 pb-8',
    'w-full max-w-[600px]',
    'max-h-[90vh] overflow-y-auto',
  ].join(' ');

  // 헤더
  const hdr = document.createElement('div');
  hdr.className = 'flex items-center justify-between mb-1';

  const titleRow = document.createElement('div');
  titleRow.className = 'flex items-center gap-2';
  const titleIcon = document.createElement('span');
  titleIcon.className = 'icon indigo';
  titleIcon.textContent = '☁️';
  const titleText = document.createElement('h2');
  titleText.className = 'text-[length:var(--text-title-large)] font-bold text-[var(--text-primary)] m-0';
  titleText.textContent = '클라우드 동기화 설정';
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

  const desc = document.createElement('p');
  desc.className = 'text-sm text-[var(--text-muted)] mt-2 mb-5 leading-relaxed';
  desc.textContent = '로그인 전에 저장된 데이터를 클라우드에 업로드할 수 있습니다. 항목을 선택하고 동기화하세요. 모든 데이터는 암호화되어 전송됩니다.';

  // 카테고리 체크박스 목록
  const checkboxes = {};
  const listEl = document.createElement('div');
  listEl.className = 'flex flex-col gap-2.5 mb-5';

  for (const cat of CATEGORIES) {
    const row = document.createElement('label');
    row.className = [
      'flex items-center gap-3',
      'p-3 cursor-pointer',
      'border border-[var(--border-glass)]',
      'rounded-[var(--radius-sm)]',
      'bg-[var(--bg-card)]',
      'hover:border-[var(--border-active)]',
      'transition-colors',
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

  // 액션 버튼
  const actions = document.createElement('div');
  actions.className = 'grid grid-cols-[1fr_2fr] gap-2.5';

  const skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'btn btn-secondary btn-full';
  skipBtn.textContent = '나중에';
  skipBtn.addEventListener('click', () => overlay.remove());

  const syncBtn = document.createElement('button');
  syncBtn.type = 'button';
  syncBtn.className = 'btn btn-primary btn-full';
  syncBtn.textContent = '선택 항목 동기화';
  syncBtn.addEventListener('click', async () => {
    const selected = Object.entries(checkboxes)
      .filter(([, cb]) => cb.checked)
      .map(([id]) => id);
    if (selected.length === 0) { overlay.remove(); return; }

    syncBtn.disabled = true;
    syncBtn.textContent = '업로드 중…';
    try {
      await uploadCategories(uid, selected);
      syncBtn.textContent = '완료!';
      setTimeout(() => overlay.remove(), 800);
    } catch {
      syncBtn.disabled = false;
      syncBtn.textContent = '다시 시도';
    }
  });

  actions.appendChild(skipBtn);
  actions.appendChild(syncBtn);

  panel.appendChild(hdr);
  panel.appendChild(desc);
  panel.appendChild(listEl);
  panel.appendChild(actions);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}
