// schedule-suite.js — 통합 캘린더(근무·휴가·시간외) 컨트롤러.
//
// ScheduleSuiteIsland 의 단일 캘린더 셀(day → { duty, ot, leave }) 표시·편집을
// 실제 도메인 store(SCHEDULE / OVERTIME / LEAVE) 와 직접 연결한다.
//
// 정책:
//   - duty: SCHEDULE.mine[day] 직결.
//   - ot:   OVERTIME 기록 합계 (일자 단위). 편집은 source='suite' 레코드로만 갈아끼움.
//   - leave: LEAVE 기록 (일자 단위). 편집은 source='suite' 레코드로만 갈아끼움.
//   - 'today' 플래그는 영속하지 않고 호출 시점 날짜로 도출.
//   - lens 필터는 UI-only 로 localStorage 'snuhmate_schedule_suite_lens' 에 저장.
//
// 모든 계산은 read 시점에 저장소에서 즉시 도출 — 캐시 없음, single source of truth.

import { SCHEDULE } from '@snuhmate/profile/schedule';
import { OVERTIME } from '@snuhmate/profile/overtime';
import { LEAVE } from '@snuhmate/profile/leave';
import { PROFILE } from '@snuhmate/profile/profile';
import { deriveSuite } from '@snuhmate/calculators/derive-suite';
import { comparePayslipToSuite } from '@snuhmate/calculators/payslip-suite-diff';

const SUITE_SOURCE = 'suite';
const LENS_KEY = 'snuhmate_schedule_suite_lens';
const ANNUAL_QUOTA = 21; // TODO: PROFILE 기반 동적 — 현재 카드 표시용 고정값

function pad2(n) { return String(n).padStart(2, '0'); }

function ymd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function _hourlyRate() {
  try {
    const profile = PROFILE.load();
    if (!profile) return 0;
    const wage = PROFILE.calcWage(profile);
    return wage?.hourlyRate || 0;
  } catch { return 0; }
}

// ── 통합 셀 read ──
// returns: { '1': { duty, ot, leave, leaveType, today }, ... }
export function loadUnifiedCells(year, month) {
  const cells = {};
  const daysInMonth = new Date(year, month, 0).getDate();

  const sched = SCHEDULE.getMonth(year, month);
  const mine = sched.mine || {};

  const otRecs = OVERTIME.getMonthRecords(year, month) || [];
  const otByDay = {};
  for (const rec of otRecs) {
    if (!rec || !rec.date) continue;
    const d = parseInt(String(rec.date).split('-')[2], 10);
    if (!d) continue;
    const hours = Number(rec.totalHours || rec.hours || 0);
    if (!hours) continue;
    otByDay[d] = (otByDay[d] || 0) + hours;
  }

  const leaveRecs = LEAVE.getYearRecords(year) || [];
  const leaveByDay = {};
  for (const rec of leaveRecs) {
    if (!rec || !rec.startDate) continue;
    const start = new Date(rec.startDate + 'T00:00:00');
    const end = new Date((rec.endDate || rec.startDate) + 'T00:00:00');
    for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
      if (cur.getFullYear() !== year || (cur.getMonth() + 1) !== month) continue;
      const d = cur.getDate();
      if (!leaveByDay[d]) {
        leaveByDay[d] = {
          leave: true,
          leaveType: rec.category || rec.type || '연차',
        };
      }
    }
  }

  const today = new Date();
  const isCurMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
  const todayDay = isCurMonth ? today.getDate() : -1;

  for (let d = 1; d <= daysInMonth; d++) {
    const duty = mine[String(d)] || mine[d] || 'OFF';
    cells[String(d)] = {
      duty: duty === 'O' ? 'OFF' : duty,
      ot: Math.round((otByDay[d] || 0) * 100) / 100,
      leave: !!(leaveByDay[d] && leaveByDay[d].leave),
      leaveType: leaveByDay[d] ? leaveByDay[d].leaveType : undefined,
      today: d === todayDay,
    };
  }
  return cells;
}

// ── 셀 부분 패치 ──
export function saveCellEntry(year, month, day, patch) {
  if (!patch || typeof patch !== 'object') return;
  const dateStr = ymd(year, month, day);

  if (Object.prototype.hasOwnProperty.call(patch, 'duty')) {
    const code = patch.duty == null ? '' : String(patch.duty);
    SCHEDULE.setMineCell(year, month, day, code);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'ot')) {
    const newHours = Math.max(0, Number(patch.ot) || 0);
    const dayRecs = OVERTIME.getDateRecords(year, month, day) || [];
    for (const r of dayRecs) {
      if (r.source === SUITE_SOURCE) {
        try { OVERTIME.deleteRecord(r.id); } catch (e) {
          console.warn('[schedule-suite] OT delete 실패', e?.message || e);
        }
      }
    }
    if (newHours > 0) {
      const startTime = '18:00';
      const startMin = 18 * 60;
      const endMin = startMin + Math.round(newHours * 60);
      const endH = Math.floor(endMin / 60) % 24;
      const endM = endMin % 60;
      const endTime = `${pad2(endH)}:${pad2(endM)}`;
      try {
        OVERTIME.createRecord(
          dateStr, startTime, endTime, 'overtime',
          _hourlyRate(), false, '',
          { source: SUITE_SOURCE, sourceMonth: `${year}-${pad2(month)}` }
        );
      } catch (e) {
        console.warn('[schedule-suite] OT create 실패', e?.message || e);
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'leave')) {
    const yearRecs = LEAVE.getDateRecords(dateStr) || [];
    for (const r of yearRecs) {
      if (r.source === SUITE_SOURCE) {
        try { LEAVE.deleteRecord(r.id); } catch (e) {
          console.warn('[schedule-suite] LEAVE delete 실패', e?.message || e);
        }
      }
    }
    if (patch.leave === true) {
      const lt = mapLeaveType(patch.leaveType);
      try {
        LEAVE.addRecord({
          type: lt.id,
          startDate: dateStr,
          endDate: dateStr,
          hours: lt.halfDay ? 4 : undefined,
          source: SUITE_SOURCE,
          sourceMonth: `${year}-${pad2(month)}`,
        });
      } catch (e) {
        console.warn('[schedule-suite] LEAVE add 실패', e?.message || e);
      }
    }
  }
}

function mapLeaveType(label) {
  if (!label) return { id: 'annual', halfDay: false };
  if (label.indexOf('반차') >= 0) return { id: 'time_leave', halfDay: true };
  if (label === '병가') return { id: 'sick', halfDay: false };
  if (label === '경조') return { id: 'family_event', halfDay: false };
  if (label === '출산') return { id: 'maternity', halfDay: false };
  if (label === '육아') return { id: 'childcare', halfDay: false };
  return { id: 'annual', halfDay: false };
}

// ─────────────────────────────────────────────────────────────
// UI 컨트롤러
// ─────────────────────────────────────────────────────────────

const ui = {
  year: 0,
  month: 0,
  cells: {},
  lens: [],
  editingDay: null,
};

function loadLens() {
  try {
    const raw = localStorage.getItem(LENS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(x => ['duty', 'ot', 'leave'].includes(x));
  } catch {}
  return [];
}

function saveLens() {
  try { localStorage.setItem(LENS_KEY, JSON.stringify(ui.lens)); } catch {}
}

// 통합 KPI 도출은 packages/calculators/derive-suite.js (순수함수) 위임.

function clearChildren(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }

function buildCell(year, month, day, cell, isLeading) {
  const div = document.createElement('div');
  div.className = 'ot-cal-day';
  div.dataset.day = String(day);
  div.dataset.duty = cell.leave ? 'OFF' : cell.duty;
  div.dataset.ot = String(cell.ot || 0);
  div.dataset.leave = cell.leave ? '1' : '0';
  if (cell.today) div.dataset.today = '1';
  if (isLeading) div.dataset.prev = '1';

  const date = document.createElement('div');
  date.className = 'day-num';
  date.textContent = String(day);
  div.appendChild(date);

  const duty = document.createElement('div');
  duty.className = 'day-duty';
  duty.textContent = cell.leave
    ? (cell.leaveType || '휴가').replace(/ \(.+\)/, '').slice(0, 3)
    : cell.duty;
  div.appendChild(duty);

  if (cell.ot > 0) {
    const ot = document.createElement('div');
    ot.className = 'day-ot';
    ot.textContent = '+' + cell.ot + 'h';
    div.appendChild(ot);
  }
  if (cell.leave) {
    const lv = document.createElement('div');
    lv.className = 'day-leave';
    lv.textContent = '🌴';
    div.appendChild(lv);
  }
  if (!isLeading) {
    div.addEventListener('click', () => openPanel(day));
  }
  return div;
}

function renderCal() {
  const cal = document.getElementById('suiteMergedCal');
  if (!cal) return;
  clearChildren(cal);

  const { year, month, cells } = ui;
  const daysInMonth = new Date(year, month, 0).getDate();
  // 1일의 요일 (0=일 ... 6=토)
  const firstDow = new Date(year, month - 1, 1).getDay();
  // 이전 달 마지막 날들 (firstDow 칸 만큼)
  const prevMonthLast = new Date(year, month - 1, 0).getDate();
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevMonthLast - i;
    const placeholder = { duty: 'OFF', ot: 0, leave: false };
    cal.appendChild(buildCell(year, month, d, placeholder, true));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const c = cells[String(d)] || { duty: 'OFF', ot: 0, leave: false };
    cal.appendChild(buildCell(year, month, d, c, false));
  }
  // 트레일링 셀 — 마지막 행 채우기 (옵션)
  const totalCells = firstDow + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const placeholder = { duty: 'OFF', ot: 0, leave: false };
    cal.appendChild(buildCell(year, month, i, placeholder, true));
  }

  applyLens();
}

function applyLens() {
  const cal = document.getElementById('suiteMergedCal');
  if (!cal) return;
  const lens = Array.isArray(ui.lens) ? ui.lens : [];
  const hasFilter = lens.length > 0 && lens.length < 3;
  cal.classList.toggle('has-filter', hasFilter);
  cal.classList.toggle('show-duty', lens.indexOf('duty') >= 0);
  cal.classList.toggle('show-ot', lens.indexOf('ot') >= 0);
  cal.classList.toggle('show-leave', lens.indexOf('leave') >= 0);
  document.querySelectorAll('.suite-lens-pill').forEach((el) => {
    const k = el.dataset.lens;
    if (k === 'all') el.classList.toggle('active', !hasFilter);
    else el.classList.toggle('active', lens.indexOf(k) >= 0);
  });
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function renderKPIs() {
  const { year, month, cells } = ui;
  const today = new Date();
  const todayInMonth = (today.getFullYear() === year && today.getMonth() + 1 === month);
  const baseDate = todayInMonth ? today : new Date(year, month - 1, 1);
  const s = deriveSuite(cells, { hourlyRate: _hourlyRate(), annualQuota: ANNUAL_QUOTA }, baseDate);

  setText('suiteKpiTotal', s.totalH + ' h');
  setText('suiteKpiTotalSub', `D ${s.dC} / E ${s.eC} / N ${s.nC} / OFF ${s.offCount}`);
  setText('suiteKpiOt', s.otH + ' h');
  setText('suiteKpiOtSub', '예상 ' + s.otPay.toLocaleString() + ' 원');
  setText('suiteKpiLeave', s.remainingLeave + ' / ' + s.annualQuota);
  setText('suiteKpiLeaveSub', s.leaveDays + '일 사용');
  setText('suiteKpiLimit', s.limitPct + ' %');
  setText('suiteKpiLimitSub', s.otH >= 60 ? '⚠️ 한도 초과' : s.remainingOtH + 'h 남음');
  setText('suiteKpiNextN', s.nextN ? ('D-' + s.nextN.daysAway) : '없음');
  setText('suiteKpiNextNSub', s.nextN ? `${pad2(month)}.${pad2(s.nextN.day)}` : '이번 달 N 없음');

  setText('suiteInsN', s.nightHours + ' h ' + (s.nightHours > 40 ? '↑' : ''));
  setText('suiteInsOt', s.otH + ' h × 1.5 = ' + (s.otH * 1.5).toFixed(1) + ' h');
  setText('suiteInsLeave', s.leaveDays + ' 일');

  const insPat = document.getElementById('suiteInsPattern');
  if (insPat) {
    insPat.textContent = s.hasNtoD ? '⚠️ N→D 전환' : '✓ 정상';
    insPat.style.color = s.hasNtoD ? 'var(--accent-rose)' : 'var(--accent-emerald)';
  }

  setText('suiteCtxNextN', s.nextN
    ? `${pad2(month)}.${pad2(s.nextN.day)} (${['일','월','화','수','목','금','토'][new Date(year, month - 1, s.nextN.day).getDay()]})`
    : '없음');
  setText('suiteCtxNextNSub', s.nextN ? ('D-' + s.nextN.daysAway) : '');

  setText('suiteCtxLimitPct', s.limitPct + '%');
  const bar = document.getElementById('suiteCtxLimitBar');
  if (bar) bar.style.width = Math.min(100, s.limitPct) + '%';
  setText('suiteCtxLimitTxt', s.otH + 'h / 60h');
  setText('suiteCtxLimitWarn', s.otH >= 48 ? '⚠️ 한도 임박' : '');

  const leavePct = s.annualQuota > 0 ? Math.round((s.remainingLeave / s.annualQuota) * 100) : 0;
  setText('suiteCtxLeavePct', leavePct + '%');
  setText('suiteCtxLeaveRingLabel', s.remainingLeave + '/' + s.annualQuota);
  const ring = document.getElementById('suiteCtxLeaveRing');
  if (ring) ring.setAttribute('stroke-dasharray', ((138 * leavePct) / 100).toFixed(1) + ' 138');

  setText('suiteCtxOtPay', s.otPay.toLocaleString() + ' 원');
  setText('suiteCtxNightPay', s.nightPay.toLocaleString() + ' 원');
  setText('suiteCtxTotalPay', (s.otPay + s.nightPay).toLocaleString() + ' 원');

  const msg = document.getElementById('suiteCtxPatternMsg');
  if (msg) {
    msg.textContent = s.hasNtoD ? '⚠️ N→D 즉시 전환 발견 — 휴식 12h+ 확인' : '✓ N→D 전환 0회 — 안전.';
    msg.style.color = s.hasNtoD ? 'var(--accent-rose)' : 'var(--text-secondary)';
  }
}

function renderHeader() {
  setText('suiteCalMonth', `${ui.year}년 ${ui.month}월`);
}

function refresh() {
  ui.cells = loadUnifiedCells(ui.year, ui.month);
  renderHeader();
  renderCal();
  renderKPIs();
}

// ── 책갈피 탭 바텀시트 (휴가 / 시간외·온콜) ───────────────────────────
// LeaveIsland 의 #lvInputSheet 와 OvertimeIsland 의 #otInputPanel 을 통째로
// suitePanelLeaveSlot / suitePanelOtSlot 로 portal 한다.
// closePanel 시 원래 위치(body)로 복귀.

const portalState = {
  lvOriginalParent: null,
  lvOriginalNext: null,
  otOriginalParent: null,
  otOriginalNext: null,
  active: false,
};

function _portalIn(elId, slotId, origParentKey, origNextKey) {
  const el = document.getElementById(elId);
  const slot = document.getElementById(slotId);
  if (!el || !slot) return false;
  // 원래 위치 기록
  portalState[origParentKey] = el.parentNode;
  portalState[origNextKey] = el.nextSibling;
  slot.appendChild(el);
  // 짝 overlay 가리기
  const ov = document.getElementById(elId === 'lvInputSheet' ? 'lvInputOverlay' : 'otInputOverlay');
  if (ov) ov.dataset.suitePortal = '1';
  return true;
}

function _portalOut(elId, origParentKey, origNextKey) {
  const el = document.getElementById(elId);
  if (!el) return;
  const parent = portalState[origParentKey];
  const nextSib = portalState[origNextKey];
  if (parent) {
    if (nextSib && nextSib.parentNode === parent) parent.insertBefore(el, nextSib);
    else parent.appendChild(el);
  }
  portalState[origParentKey] = null;
  portalState[origNextKey] = null;
  const ov = document.getElementById(elId === 'lvInputSheet' ? 'lvInputOverlay' : 'otInputOverlay');
  if (ov) delete ov.dataset.suitePortal;
}

function _setActiveTab(tab) {
  const tabLeave = document.getElementById('suitePanelTabLeave');
  const tabOt = document.getElementById('suitePanelTabOt');
  const slotLeave = document.getElementById('suitePanelLeaveSlot');
  const slotOt = document.getElementById('suitePanelOtSlot');
  if (!tabLeave || !tabOt || !slotLeave || !slotOt) return;
  if (tab === 'ot') {
    tabLeave.classList.remove('active'); tabLeave.setAttribute('aria-selected', 'false');
    tabOt.classList.add('active'); tabOt.setAttribute('aria-selected', 'true');
    slotLeave.hidden = true; slotOt.hidden = false;
    slotOt.classList.add('active-accent');
    slotLeave.classList.remove('active-accent');
  } else {
    tabOt.classList.remove('active'); tabOt.setAttribute('aria-selected', 'false');
    tabLeave.classList.add('active'); tabLeave.setAttribute('aria-selected', 'true');
    slotOt.hidden = true; slotLeave.hidden = false;
    slotLeave.classList.add('active-accent');
    slotOt.classList.remove('active-accent');
  }
}

function openPanel(day) {
  ui.editingDay = day;
  const dow = ['일','월','화','수','목','금','토'][new Date(ui.year, ui.month - 1, day).getDay()];
  setText('suitePanelDate', `${ui.year}년 ${ui.month}월 ${day}일 (${dow})`);

  // 1) lvInputSheet 와 otInputPanel 을 통합 패널로 portal
  if (!portalState.active) {
    _portalIn('lvInputSheet', 'suitePanelLeaveSlot', 'lvOriginalParent', 'lvOriginalNext');
    _portalIn('otInputPanel', 'suitePanelOtSlot', 'otOriginalParent', 'otOriginalNext');
    portalState.active = true;
  }

  // 2) 듀티 빠른 변경 버튼 — 현재 듀티 active
  const cell = ui.cells[String(day)] || { duty: 'OFF' };
  const currentDuty = cell.leave ? 'OFF' : (cell.duty || 'OFF');
  document.querySelectorAll('.suite-duty-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.duty === currentDuty);
  });

  // 3) 기본 휴가 탭 활성 + 휴가 폼 초기화
  _setActiveTab('leave');
  if (typeof window.onLvDateClick === 'function') {
    try { window.onLvDateClick(ui.year, ui.month, day); } catch (e) {
      console.warn('[schedule-suite] onLvDateClick 실패', e);
    }
  }

  // 4) 패널 표시
  const ov = document.getElementById('suitePanelOverlay');
  if (ov) ov.dataset.open = '1';
}

// 같은 날짜 LEAVE 레코드 모두 삭제 (suite/schedule/사용자 직접 입력 가리지 않음).
// 휴가↔근무 전환 시 휴가 자동 정리.
function _purgeLeaveOnDate(year, month, day) {
  const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
  const recs = LEAVE.getDateRecords(dateStr) || [];
  let purged = 0;
  for (const r of recs) {
    try {
      if (LEAVE.deleteRecord(r.id)) purged++;
    } catch (e) {
      console.warn('[schedule-suite] LEAVE.deleteRecord 실패', r.id, e);
    }
  }
  return purged;
}

// 같은 날짜 OVERTIME 레코드 모두 삭제 (OFF/휴가 전환 시 정리).
function _purgeOvertimeOnDate(year, month, day) {
  const recs = OVERTIME.getDateRecords(year, month, day) || [];
  let purged = 0;
  for (const r of recs) {
    try {
      if (OVERTIME.deleteRecord(r.id)) purged++;
    } catch (e) {
      console.warn('[schedule-suite] OVERTIME.deleteRecord 실패', r.id, e);
    }
  }
  return purged;
}

// 듀티 버튼 클릭 → 변경 확인 → SCHEDULE.setMineCell + 휴가/시간외 일관성 정리 + refresh
function _onDutyClick(newDuty) {
  if (ui.editingDay == null) return;
  const day = ui.editingDay;
  const cell = ui.cells[String(day)] || { duty: 'OFF' };
  const currentDuty = cell.leave ? 'OFF' : (cell.duty || 'OFF');
  if (newDuty === currentDuty && !cell.leave) return;

  const labels = { D: '데이(D)', E: '이브닝(E)', N: '나이트(N)', OFF: '오프(/)' };
  const fromLabel = cell.leave ? `휴가(${cell.leaveType || '연차'})` : (labels[currentDuty] || currentDuty);
  const toLabel = labels[newDuty] || newDuty;

  // 휴가가 있는 날짜로의 변경 → 휴가 삭제 안내 포함
  let extraWarn = '';
  if (cell.leave) {
    extraWarn = `\n\n⚠️ 이 날의 휴가(${cell.leaveType || '연차'}) 기록이 함께 삭제됩니다.`;
  }
  // OFF 로 가면서 시간외가 있으면 안내
  if (newDuty === 'OFF' && cell.ot > 0) {
    extraWarn += `\n\n⚠️ 이 날의 시간외 ${cell.ot}h 기록이 함께 삭제됩니다.`;
  }

  const ok = window.confirm(`${ui.month}월 ${day}일 근무를 [${fromLabel}] → [${toLabel}] 로 변경할까요?${extraWarn}`);
  if (!ok) return;

  // 1) 듀티 변경 (OFF → 빈 셀)
  try {
    SCHEDULE.setMineCell(ui.year, ui.month, day, newDuty === 'OFF' ? '' : newDuty);
  } catch (e) {
    console.warn('[schedule-suite] SCHEDULE.setMineCell 실패', e);
    return;
  }

  // 2) 휴가 자동 정리 — 근무로 바뀌면 휴가 레코드 모두 삭제
  if (cell.leave && newDuty !== 'OFF') {
    _purgeLeaveOnDate(ui.year, ui.month, day);
  }

  // 3) OFF 로 변경 시 시간외 자동 정리 (선택적, 사용자 컨펌 후)
  if (newDuty === 'OFF' && cell.ot > 0) {
    _purgeOvertimeOnDate(ui.year, ui.month, day);
  }

  // 버튼 active 갱신
  document.querySelectorAll('.suite-duty-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.duty === newDuty);
  });

  // 즉시 refresh — 캘린더 + KPI + 홈 대시보드 (scheduleChanged/leaveChanged/overtimeChanged 이벤트 dispatch 됨)
  refresh();

  // 듀티만 바꾸고 바로 패널 닫기 (사용자 요구: "버튼만 바꿔서 누르면 바로 저장되서 나가게")
  closePanel();
}

function closePanel() {
  const ov = document.getElementById('suitePanelOverlay');
  if (ov) ov.dataset.open = '0';

  // portal 노드 원위치
  if (portalState.active) {
    _portalOut('lvInputSheet', 'lvOriginalParent', 'lvOriginalNext');
    _portalOut('otInputPanel', 'otOriginalParent', 'otOriginalNext');
    portalState.active = false;
  }
  // 두 BottomSheet 의 close 함수 호출 (저장 후 자체 close 가 이미 호출됐을 수 있음)
  if (typeof window.closeLvBottomSheet === 'function') {
    try { window.closeLvBottomSheet(); } catch {}
  }
  if (typeof window.closeOtBottomSheet === 'function') {
    try { window.closeOtBottomSheet(); } catch {}
  }
  ui.editingDay = null;
}

function _onTabClick(tab) {
  _setActiveTab(tab);
  if (tab === 'ot' && ui.editingDay != null) {
    if (typeof window.onOtDateClick === 'function') {
      try { window.onOtDateClick(ui.year, ui.month, ui.editingDay); } catch (e) {
        console.warn('[schedule-suite] onOtDateClick 실패', e);
      }
    }
  } else if (tab === 'leave' && ui.editingDay != null) {
    if (typeof window.onLvDateClick === 'function') {
      try { window.onLvDateClick(ui.year, ui.month, ui.editingDay); } catch (e) {
        console.warn('[schedule-suite] onLvDateClick 실패', e);
      }
    }
  }
}

// ── lens ──
function setLens(key) {
  if (!Array.isArray(ui.lens)) ui.lens = [];
  if (key === 'all') {
    ui.lens = [];
  } else {
    const idx = ui.lens.indexOf(key);
    if (idx >= 0) ui.lens.splice(idx, 1);
    else ui.lens.push(key);
  }
  saveLens();
  applyLens();
}

// ── 빠른 추가 (오늘 기준) ──
function quickAction(action) {
  const today = new Date();
  const isCurMonth = today.getFullYear() === ui.year && (today.getMonth() + 1) === ui.month;
  const day = isCurMonth ? today.getDate() : 1;
  const cur = ui.cells[String(day)] || { duty: 'OFF', ot: 0, leave: false };
  if (action === 'ot1') saveCellEntry(ui.year, ui.month, day, { ot: (cur.ot || 0) + 1 });
  else if (action === 'ot2') saveCellEntry(ui.year, ui.month, day, { ot: (cur.ot || 0) + 2 });
  else if (action === 'oncall') saveCellEntry(ui.year, ui.month, day, { ot: (cur.ot || 0) + 4 });
  else if (action === 'leave') saveCellEntry(ui.year, ui.month, day, { leave: true, leaveType: '연차' });
  refresh();
}

function shiftMonth(delta) {
  const cur = new Date(ui.year, ui.month - 1 + delta, 1);
  ui.year = cur.getFullYear();
  ui.month = cur.getMonth() + 1;
  refresh();
}

function resetMonth() {
  if (!window.confirm(`${ui.year}년 ${ui.month}월의 통합 캘린더 입력을 모두 지울까요? (suite 출처 기록만 삭제)`)) return;
  // suite-source OT/LEAVE 만 삭제 + duty 초기화는 보존
  const otRecs = OVERTIME.getMonthRecords(ui.year, ui.month) || [];
  for (const r of otRecs) {
    if (r.source === SUITE_SOURCE) {
      try { OVERTIME.deleteRecord(r.id); } catch {}
    }
  }
  const leaveRecs = LEAVE.getYearRecords(ui.year) || [];
  for (const r of leaveRecs) {
    if (r.source !== SUITE_SOURCE) continue;
    const ymd = r.startDate || '';
    const m = parseInt((ymd.split('-')[1] || '0'), 10);
    if (m !== ui.month) continue;
    try { LEAVE.deleteRecord(r.id); } catch {}
  }
  refresh();
}

// ── init ──
function init() {
  const root = document.getElementById('tab-schedule-suite');
  if (!root) return; // 탭이 DOM 에 없음 — 이 페이지는 스킵
  if (root.dataset.suiteInited === '1') return;
  root.dataset.suiteInited = '1';

  const today = new Date();
  ui.year = today.getFullYear();
  ui.month = today.getMonth() + 1;
  ui.lens = loadLens();

  // 초기 렌더
  refresh();

  // 핸들러 와이어업
  document.querySelectorAll('.suite-lens-pill').forEach((el) => {
    el.addEventListener('click', () => setLens(el.dataset.lens));
  });
  document.querySelectorAll('.suite-quick').forEach((el) => {
    el.addEventListener('click', () => quickAction(el.dataset.action));
  });
  document.getElementById('suiteResetBtn')?.addEventListener('click', resetMonth);
  document.getElementById('suiteCalPrev')?.addEventListener('click', () => shiftMonth(-1));
  document.getElementById('suiteCalNext')?.addEventListener('click', () => shiftMonth(1));

  // 책갈피 탭 패널
  document.getElementById('suitePanelClose')?.addEventListener('click', closePanel);
  document.getElementById('suitePanelTabLeave')?.addEventListener('click', () => _onTabClick('leave'));
  document.getElementById('suitePanelTabOt')?.addEventListener('click', () => _onTabClick('ot'));
  // 듀티 빠른 변경 버튼 (D/E/N/OFF)
  document.querySelectorAll('.suite-duty-btn').forEach((btn) => {
    btn.addEventListener('click', () => _onDutyClick(btn.dataset.duty));
  });
  const overlay = document.getElementById('suitePanelOverlay');
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePanel();
  });

  // 두 BottomSheet 의 자체 저장/취소 후 closePanel 도 함께 닫히도록 이벤트 리스너
  // (overtimeChanged / leaveChanged 가 발생하면 패널도 닫는다)
  // 동시에 휴가↔근무↔시간외 일관성 정리:
  //   - 휴가 저장됐을 때 그 날의 듀티가 D/E/N 이면 → OFF 로 자동 정리 (사용자에게 토스트만)
  //   - 시간외 저장은 듀티/휴가 건드리지 않음 (시간외는 정규근무에 추가)
  let _consistencyGuard = false;
  window.addEventListener('leaveChanged', () => {
    if (_consistencyGuard) return;
    if (ui.editingDay == null) {
      // 패널 외부에서 휴가 변경 — refresh 만
      return;
    }
    const day = ui.editingDay;
    const dateStr = `${ui.year}-${pad2(ui.month)}-${pad2(day)}`;
    const lvRecs = LEAVE.getDateRecords(dateStr) || [];
    if (lvRecs.length === 0) return;
    // 듀티가 D/E/N 이면 → OFF 로 정리
    const sched = SCHEDULE.getMonth(ui.year, ui.month);
    const curDuty = String((sched.mine || {})[String(day)] || '').toUpperCase();
    if (['D', 'E', 'N', '9A'].includes(curDuty)) {
      _consistencyGuard = true;
      try {
        SCHEDULE.setMineCell(ui.year, ui.month, day, '');
      } catch (e) {
        console.warn('[schedule-suite] 일관성 정리 실패', e);
      } finally {
        _consistencyGuard = false;
      }
    }
  });

  // 패널 자동 닫힘 + refresh (저장/취소 후)
  ['overtimeChanged', 'leaveChanged'].forEach((ev) => {
    window.addEventListener(ev, () => {
      if (document.getElementById('suitePanelOverlay')?.dataset.open === '1') {
        closePanel();
      }
    });
  });

  // 외부 변경 이벤트 → 자동 갱신
  window.addEventListener('overtimeChanged', refresh);
  window.addEventListener('leaveChanged', refresh);
  window.addEventListener('scheduleChanged', refresh);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// 명세서 → Suite 차이 분석 (UI 컨펌 모달은 design-shotgun 으로 위임)
export function comparePayslipForMonth(parsed, year, month) {
  const cells = loadUnifiedCells(year, month);
  const s = deriveSuite(cells, {}, new Date(year, month - 1, 1));
  return comparePayslipToSuite(parsed, s.otH);
}

// 테스트 / 외부 호환층
if (typeof window !== 'undefined') {
  window.scheduleSuite = window.scheduleSuite || {};
  window.scheduleSuite.loadUnifiedCells = loadUnifiedCells;
  window.scheduleSuite.saveCellEntry = saveCellEntry;
  window.scheduleSuite.refresh = refresh;
  window.scheduleSuite.comparePayslipForMonth = comparePayslipForMonth;
}
