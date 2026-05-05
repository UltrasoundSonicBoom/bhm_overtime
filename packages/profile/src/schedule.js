// ============================================
// 근무표 (schedule) 저장소 네임스페이스
// localStorage 키: snuhmate_schedule_records (user-scoped)
// 데이터 shape: { 'YYYY-MM': { mine: { day: code }, team: {...}, lastEditAt, demo? } }
// 본 모듈은 OVERTIME / LEAVE 와 동일한 패턴(getUserStorageKey + Firestore write-through)을
// 따른다. 기존 schedule-tab.js 의 const STORAGE_KEY 를 본 getter 로 교체.
// ============================================

export const SCHEDULE = {
  get STORAGE_KEY() {
    return typeof window !== 'undefined' && window.getUserStorageKey
      ? window.getUserStorageKey('snuhmate_schedule_records')
      : 'snuhmate_schedule_records_guest';
  },

  // ── 구버전 키(snuhmate_schedule_records 비-스코프) 1회성 흡수 ──
  // OVERTIME/LEAVE 와 달리 schedule 은 user-scope 도입 전 단일 키였다.
  // 현재 user/guest 키가 비어 있을 때만 legacy 로 흡수.
  _migrateLegacyKeys() {
    try {
      const targetKey = this.STORAGE_KEY;
      if (!targetKey || targetKey === 'snuhmate_schedule_records') return;
      if (localStorage.getItem('snuhmate_schedule_scope_migrated_v1') === '1') return;

      const rawLegacy = localStorage.getItem('snuhmate_schedule_records');
      if (!rawLegacy) return;

      const merged = (() => {
        try { return JSON.parse(localStorage.getItem(targetKey)) || {}; }
        catch { return {}; }
      })();
      const legacy = (() => {
        try { return JSON.parse(rawLegacy) || {}; }
        catch { return {}; }
      })();

      // YYYY-MM 단위 머지: target 에 이미 값이 있으면 보존
      for (const [ym, monthData] of Object.entries(legacy)) {
        if (!monthData || typeof monthData !== 'object') continue;
        if (merged[ym] && Object.keys(merged[ym].mine || {}).length > 0) continue;
        merged[ym] = monthData;
      }

      localStorage.setItem(targetKey, JSON.stringify(merged));
      localStorage.setItem('snuhmate_schedule_scope_migrated_v1', '1');
      // legacy 키는 즉시 삭제하지 않는다 — 다른 디바이스/세션의 hydrate 충돌을 피하려고
      // 마이그레이션 표식만 둔다. (필요 시 후속 정리)
      console.log('[SCHEDULE] legacy snuhmate_schedule_records → ' + targetKey + ' 흡수');
    } catch (e) {
      console.warn('[SCHEDULE] 레거시 키 마이그레이션 실패:', e);
    }
  },

  // ── 저장소 ──
  _loadAll() {
    this._migrateLegacyKeys();
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
    } catch { return {}; }
  },

  _saveAll(data, opts = {}) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[SCHEDULE] localStorage save 실패', e);
      return;
    }
    if (opts.recordEdit !== false && typeof window !== 'undefined' && window.recordLocalEdit) {
      window.recordLocalEdit('snuhmate_schedule_records');
    }
    // Phase 8: Firestore write-through (로그인 시만, fire-and-forget)
    if (typeof window !== 'undefined' && window.__firebaseUid) {
      const uid = window.__firebaseUid;
      import('/src/firebase/sync/schedule-sync.js').then(m =>
        m.writeAllSchedule(null, uid, data)
      ).catch(err => {
        console.warn('[SCHEDULE] cloud sync 실패 (무해)', err?.message || err);
      });
    }
    if (opts.recordEdit !== false && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('scheduleChanged', { detail: { source: 'local' } }));
      } catch {}
    }
  },

  // ── YYYY-MM 키 ──
  _ymKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  },

  getMonth(year, month) {
    const all = this._loadAll();
    return all[this._ymKey(year, month)] || { mine: {}, team: {}, lastEditAt: 0 };
  },

  setMonth(year, month, data, opts = {}) {
    const all = this._loadAll();
    all[this._ymKey(year, month)] = {
      ...data,
      lastEditAt: opts.preserveLastEditAt ? (data.lastEditAt || Date.now()) : Date.now(),
    };
    this._saveAll(all, opts);
  },

  // 본인(mine) 셀 단위 set/clear — 외부에서 부분 업데이트 시 사용
  setMineCell(year, month, day, code) {
    const data = this.getMonth(year, month);
    const next = { ...data, mine: { ...(data.mine || {}) } };
    if (code == null || code === '') delete next.mine[String(day)];
    else next.mine[String(day)] = code;
    this.setMonth(year, month, next);
  },

  getMineCell(year, month, day) {
    const data = this.getMonth(year, month);
    return (data.mine || {})[String(day)] || '';
  },
};

// 호환층 — IIFE 스크립트 / 기존 schedule-tab.js 가 window.SCHEDULE 로 접근
if (typeof window !== 'undefined') {
  window.SCHEDULE = SCHEDULE;
}
