// firebase/key-registry.js — Phase 8 Task 6 단일 진실 원천
//
// SPEC §3 인벤토리 100% 매핑 — 모든 localStorage 키 의 Firestore path + scope.
// 새 키 추가 시 → 여기 등록 필수. 누락 키는 sync 루프에서 무시됨.
//
// scope:
//   - 'sync'          : Firestore 동기화 대상 (로그인 시 write-through)
//   - 'device-local'  : 기기 로컬 전용 (uid, anon_id, debug flag 등 — sync 제외)
//
// shape (sync 키):
//   - 'doc'                  : 단일 doc (전체를 1 doc 의 data 필드로 저장)
//   - 'doc-merge'            : 단일 doc — 기존 doc 에 field merge
//   - 'split-identity-payroll' : profile 특수 — identity / payroll 분리 doc
//   - 'collection-by-yyyymm' : entries 배열 → yyyymm 별 doc split
//   - 'collection-by-yyyy'   : entries 배열 → yyyy 별 doc split (4-seg path)
//   - 'collection-by-id'     : 배열 → entryId 별 doc split
//
// localScope:
//   - 'user'   : localStorage 에서 base_uid_<uid> / base_guest 로 분리
//   - 'shared' : 기기 단위 shared key (settings/theme 처럼 일부 device-local 필드와 병존)

export const KEY_REGISTRY = {
  // ── Profile (SPEC §3.4) — identity / payroll 분리 ──
  'snuhmate_hr_profile': {
    scope: 'sync',
    localScope: 'user',
    shape: 'split-identity-payroll',
    firestorePath: (uid) => `users/${uid}/profile/identity`,
    payrollPath: (uid) => `users/${uid}/profile/payroll`,
    category: 'identity',
  },
  // ── Work history (SPEC §3.4) ──
  'snuhmate_work_history': {
    scope: 'sync', localScope: 'user', shape: 'collection-by-id',
    firestorePath: (uid) => `users/${uid}/work_history`,
    category: 'workHistory',
  },
  'snuhmate_work_history_seeded': {
    scope: 'sync', localScope: 'user', shape: 'doc-merge',
    firestorePath: (uid) => `users/${uid}/profile/identity`,
    fieldName: 'workHistorySeeded',
    category: 'workHistory',
  },
  // ── Career events (커리어 타임라인 통합 모델 — workplace + tenure + leave 등) ──
  'snuhmate_career_events': {
    scope: 'sync', localScope: 'user', shape: 'collection-by-id',
    firestorePath: (uid) => `users/${uid}/careerEvents`,
    category: 'workHistory',
  },
  // ── Overtime (SPEC §3.2) ──
  'overtimeRecords': {
    scope: 'sync', localScope: 'user', shape: 'collection-by-yyyymm',
    firestorePath: (uid) => `users/${uid}/overtime`,
    category: 'overtime',
  },
  'otManualHourly': {
    scope: 'sync', localScope: 'user', shape: 'doc-merge',
    firestorePath: (uid) => `users/${uid}/profile/payroll`,
    fieldName: 'manualHourly',
    category: 'payroll',
  },
  'overtimePayslipData': {
    scope: 'sync', localScope: 'user', shape: 'collection-by-id',
    firestorePath: (uid) => `users/${uid}/payslips`,
    category: 'payroll',
  },
  // ── Leave (SPEC §3.3) — 4-seg path (leave/{yyyy} doc) ──
  'leaveRecords': {
    scope: 'sync', localScope: 'user', shape: 'collection-by-yyyy',
    firestorePath: (uid) => `users/${uid}/leave`,
    category: 'leave',
  },
  // ── Schedule (근무표) ──
  'snuhmate_schedule_records': {
    scope: 'sync', localScope: 'user', shape: 'collection-by-yyyymm',
    firestorePath: (uid) => `users/${uid}/schedule`,
    category: 'schedule',
  },
  // ── Settings (SPEC §3.6) ──
  'snuhmate_settings': {
    scope: 'sync', localScope: 'shared', shape: 'doc',
    firestorePath: (uid) => `users/${uid}/settings/app`,
    category: 'settings',
  },
  'theme': {
    scope: 'sync', localScope: 'shared', shape: 'doc-merge',
    firestorePath: (uid) => `users/${uid}/settings/app`,
    fieldName: 'theme',
    category: 'settings',
  },
  // ── Reference (SPEC §3.5) ──
  'snuhmate_reg_favorites': {
    scope: 'sync', localScope: 'user', shape: 'doc',
    firestorePath: (uid) => `users/${uid}/settings/reference`,
    category: 'reference',
  },
  // ── Device-local (sync 제외 — SPEC §3.6) ──
  'snuhmate_local_uid': { scope: 'device-local' },
  'snuhmate_anon_id': { scope: 'device-local' },
  'snuhmate_device_id': { scope: 'device-local' },
  'snuhmate_demo_mode': { scope: 'device-local' },
  'snuhmate_debug_parser': { scope: 'device-local' },
  'snuhmate_leave_migrated_v1': { scope: 'device-local' },  // legacy migration flag
  'snuhmate_leave_scope_migrated_v2': { scope: 'device-local' },
};

export const CATEGORIES = ['identity', 'payroll', 'overtime', 'schedule', 'leave', 'workHistory', 'settings', 'reference'];

export function allBaseKeys() {
  return Object.keys(KEY_REGISTRY);
}

export function syncKeys() {
  return Object.entries(KEY_REGISTRY)
    .filter(([, d]) => d.scope === 'sync')
    .map(([k]) => k);
}

export function deviceLocalKeys() {
  return Object.entries(KEY_REGISTRY)
    .filter(([, d]) => d.scope === 'device-local')
    .map(([k]) => k);
}

export function firestorePathFor(baseKey, uid) {
  const def = KEY_REGISTRY[baseKey];
  if (!def || def.scope !== 'sync' || !def.firestorePath) return null;
  return def.firestorePath(uid);
}

export function localScopeOf(baseKey) {
  return KEY_REGISTRY[baseKey]?.localScope ?? null;
}

export function localKeyFor(baseKey, uid) {
  const def = KEY_REGISTRY[baseKey];
  if (!def) return null;
  if (def.scope === 'device-local' || def.localScope === 'shared') return baseKey;
  const cleanUid = (typeof uid === 'string' && uid.length > 0) ? uid : null;
  return cleanUid ? `${baseKey}_uid_${cleanUid}` : `${baseKey}_guest`;
}

export function guestLocalKeyFor(baseKey) {
  const def = KEY_REGISTRY[baseKey];
  if (!def) return null;
  if (def.scope === 'device-local' || def.localScope === 'shared') return baseKey;
  return `${baseKey}_guest`;
}

export function categoryOf(baseKey) {
  return KEY_REGISTRY[baseKey]?.category ?? null;
}

export function syncKeysByCategory(category) {
  return Object.entries(KEY_REGISTRY)
    .filter(([, d]) => d.scope === 'sync' && d.category === category)
    .map(([k]) => k);
}
