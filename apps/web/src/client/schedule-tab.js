// schedule-tab.js — 근무 탭 실동작 구현.
//
// 책임:
//   - localStorage('snuhmate_schedule_records') CRUD
//   - 그리드 / 통계 / 경고 / 다음 근무 / HPPD 렌더
//   - 본인 듀티 → OVERTIME / LEAVE 자동 레코드 생성 (idempotent via source='schedule')
//   - 로그인 사용자: schedule-sync로 Firestore write/read
//   - 본인 셀 클릭 → 시간외/휴가 탭 deep-link
//
// 부수효과 없는 계산은 schedule-calc.js에 분리.

import { OVERTIME } from '@snuhmate/profile/overtime';
import { LEAVE } from '@snuhmate/profile/leave';
import { PROFILE } from '@snuhmate/profile/profile';
import { HOLIDAYS } from '@snuhmate/calculators/holidays';

// `@snuhmate/profile/profile` 등은 모듈 초기화 시 `window.PROFILE`/`window.OVERTIME`/`window.LEAVE` 도 export.
// 직접 import한 ESM 객체를 우선 사용해 SSR/test에서 안전하게 동작.

import {
  DUTY_CODES,
  DUTY_TIMES,
  HPPD_THRESHOLDS,
  VIOLATION_LIMITS,
  calcMonthlyDutyCounts,
  detectViolations,
  findNextDuty,
  calcHppdByDay,
  mineMapToRecords,
} from './schedule-calc.js';

const STORAGE_KEY = 'snuhmate_schedule_records';

const DUTY_LABELS = {
  D: '데이', E: '이브닝', N: '나이트',
  O: '오프', AL: '연차', RD: '리커버리데이',
};

const VIOLATION_LABELS = {
  consecutive_night: (v) => `⚠️ 야간 ${v.days}일 연속 — 단체협약 확인 필요`,
  min_rest_violation: (v) => `⚠️ 최소 휴식 미보장 (${v.date}, 약 7시간)`,
  monthly_night_overflow: (v) => `⚠️ 월 야간 ${v.count}일 — 시간외수당 처리 대상`,
};

const SAMPLE_TEAM = [
  { name: '김지원', cls: 'c1', tags: [['role', '책임'], ['skill', '중환자']] },
  { name: '박서연', cls: 'c2', tags: [['skill', 'ACLS']] },
  { name: '이도현', cls: 'c3', tags: [['role', '주임']] },
  { name: '정하은', cls: 'c4', tags: [['skill', 'ACLS']] },
  { name: '최민준', cls: 'c5', tags: [['role', '책임']] },
];

let schState = {
  year: 0,
  month: 0,
  view: 'mine',         // 'mine' | 'team'
  period: 'month',      // 'month' | 'week'  — team view에서만 의미 있음
  weekStartDay: 1,      // week period의 시작일 (1~daysInMonth)
  selectedDay: null,
  uploadFile: null,
  parsedNames: [],
  holidayMap: {},       // { day: name }  — 최신 월의 공휴일
  hourlyRate: 0,
};

// ── HTML escape ──
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeCode(code) {
  return DUTY_CODES.includes(code) ? code : '';
}

// "대체공휴일(부처님오신날)" → "부처님오신날(대휴)"
function _formatHolidayName(name) {
  const m = name.match(/^대체공휴일\((.+)\)$/);
  return m ? `${m[1]}(대휴)` : name;
}

function _today() {
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() };
}

function _ymd(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function _initials(name) {
  if (!name) return '?';
  return name.charAt(0);
}

// ── localStorage I/O ──
function _loadAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (_e) {
    return {};
  }
}
function _saveAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('[schedule] localStorage save failed', e);
  }
}
function _yyyymm(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}
function _getMonthData(year, month) {
  const all = _loadAll();
  return all[_yyyymm(year, month)] || { mine: {}, team: {}, lastEditAt: 0 };
}
function _setMonthData(year, month, data) {
  const all = _loadAll();
  all[_yyyymm(year, month)] = { ...data, lastEditAt: Date.now() };
  _saveAll(all);
}

// ── 데모 시드 (게스트/빈 상태에서만) ──
function _seedDemoIfEmpty(year, month) {
  const data = _getMonthData(year, month);
  if (Object.keys(data.mine).length > 0) return;

  const codes = ['D', 'E', 'N', 'N', 'O', 'O', 'D', 'E', 'D', 'D', 'E', 'N', 'N', 'O', 'AL', 'D', 'D', 'E', 'N', 'N', 'O', 'O', 'D', 'E', 'N', 'O', 'D', 'RD', 'O', 'D', 'E'];
  const daysInMonth = new Date(year, month, 0).getDate();
  const newData = { mine: {}, team: {}, lastEditAt: Date.now(), demo: true };
  for (let d = 1; d <= daysInMonth; d++) {
    newData.mine[d] = codes[(d - 1) % codes.length];
  }
  SAMPLE_TEAM.forEach(({ name }, idx) => {
    newData.team[name] = {};
    const shift = (idx + 1) * 3;
    for (let d = 1; d <= daysInMonth; d++) {
      newData.team[name][d] = codes[(d - 1 + shift) % codes.length];
    }
  });
  _setMonthData(year, month, newData);
}

// ── 공휴일 사전 조회 (월간 일괄) ──
async function _loadHolidayMap(year, month) {
  const map = {};
  const daysInMonth = new Date(year, month, 0).getDate();
  // HOLIDAYS.getDateType is async — Promise.all 일괄
  const promises = [];
  for (let d = 1; d <= daysInMonth; d++) {
    promises.push(
      HOLIDAYS.getDateType(year, month, d)
        .then(info => {
          if (info && info.type === 'holiday') {
            map[d] = (info.names && info.names[0]) || '공휴일';
          }
        })
        .catch(() => { /* silently fall back to weekend-only */ })
    );
  }
  await Promise.all(promises);
  return map;
}

// ── 시급 ──
function _loadHourlyRate() {
  try {
    const profile = PROFILE.load();
    if (!profile) return 0;
    const wage = PROFILE.calcWage(profile);
    return wage?.hourlyRate || 0;
  } catch (_e) {
    return 0;
  }
}

// ── 부서 전체 ICU 로스터 그리드 (월간/주간 지원) ──
function renderRoster() {
  const root = document.getElementById('schRoster');
  if (!root) return;

  const { year, month, period, selectedDay } = schState;
  const data = _getMonthData(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayInfo = _today();
  const isCurMonth = todayInfo.year === year && todayInfo.month === month;
  const todayDay = isCurMonth ? todayInfo.day : -1;

  // 주간 모드 시 표시 범위 결정 (weekStartDay ~ +6일, 월 경계 clamp)
  let dayStart = 1;
  let dayEnd = daysInMonth;
  if (period === 'week') {
    dayStart = Math.max(1, schState.weekStartDay || 1);
    dayEnd = Math.min(daysInMonth, dayStart + 6);
  }
  const visibleDays = dayEnd - dayStart + 1;

  // grid-template-columns 동적 설정
  root.dataset.period = period;
  if (period === 'week') {
    // 주간: 1fr 컬럼으로 모바일 너비에 자동 맞춤 (스크롤 불필요)
    root.style.gridTemplateColumns =
      `minmax(120px, max-content) repeat(${visibleDays}, 1fr) minmax(44px, max-content)`;
  } else {
    root.style.gridTemplateColumns =
      `minmax(140px, max-content) repeat(${visibleDays}, 32px) minmax(48px, max-content)`;
  }

  const dowLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const profileName = (PROFILE.load() && PROFILE.load().name) || '내';

  let html = '';

  // ── 컬럼 헤더 ──
  html += `<div class="sch-nurse-head">간호사</div>`;
  for (let d = dayStart; d <= dayEnd; d++) {
    const dowIdx = new Date(year, month - 1, d).getDay();
    const dow = dowLabels[dowIdx];
    let cls = 'sch-col-head';
    if (schState.holidayMap[d]) cls += ' holiday';
    else if (dowIdx === 0) cls += ' weekend-sun';
    else if (dowIdx === 6) cls += ' weekend-sat';
    if (d === todayDay) cls += ' today';
    const title = schState.holidayMap[d] ? ` title="${esc(schState.holidayMap[d])}"` : '';
    html += `<div class="${cls}"${title}><span class="dow">${dow}</span><span class="dom">${d}</span></div>`;
  }
  html += `<div class="sch-total-head">${period === 'week' ? '주' : '합계'}</div>`;

  // ── HPPD 행 ──
  const hppd = calcHppdByDay(data, year, month);
  html += `<div class="sch-hppd-label">HPPD 충족</div>`;
  for (let d = dayStart; d <= dayEnd; d++) {
    const cell = hppd[d] || {};
    const cellCls = cell.alert ? 'sch-hppd-cell alert' : 'sch-hppd-cell';
    const tip = `${cell.day || 0}D ${cell.evening || 0}E ${cell.night || 0}N${cell.alert ? ' — 인력 부족' : ''}`;
    html += `<div class="${cellCls}" title="${esc(tip)}"><span class="sch-hppd-dot"></span></div>`;
  }
  html += `<div class="sch-hppd-cell sch-hppd-total"></div>`;

  // ── 본인 행 ──
  html += _renderNurseRow({
    name: profileName,
    cls: 'c5',
    tags: [],
    isMine: true,
    dayMap: data.mine || {},
    dayStart, dayEnd,
    selectedDay,
    todayDay,
    rowKey: null,
    isSelectedNurse: false,
  });

  // ── 팀 행 (모두 표시 — view='team'일 때만 이 함수가 호출됨) ──
  {
    const teamNames = Object.keys(data.team || {});
    // name → rowKey 맵 갱신 (selectSchNurse에서 DOM 조작에 사용)
    const nurseRowMap = {};
    teamNames.forEach((name, idx) => { nurseRowMap[name] = String(idx); });
    schState._nurseRowMap = nurseRowMap;

    teamNames.forEach((name, idx) => {
      const sample = SAMPLE_TEAM.find(t => t.name === name);
      html += _renderNurseRow({
        name,
        cls: sample?.cls || ('c' + ((idx % 8) + 1)),
        tags: sample?.tags || [],
        isMine: false,
        dayMap: data.team[name],
        dayStart, dayEnd,
        selectedDay,
        todayDay,
        rowKey: String(idx),
        isSelectedNurse: schState.selectedNurse === name,
      });
    });
  }

  // eslint-disable-next-line no-unsanitized/property
  root.innerHTML = html;
}

function _renderNurseRow({ name, cls, tags, isMine, dayMap, dayStart, dayEnd, selectedDay, todayDay: _t, rowKey, isSelectedNurse }) {
  const dutyMap = dayMap || {};
  // total: 전체 월 (주간 모드여도 월간 합계 보여주는 게 자연스러움 — 다만 주간 모드면 가시 범위만 카운트)
  let total = 0;
  for (let d = dayStart; d <= dayEnd; d++) {
    const code = dutyMap[d];
    if (code && code !== 'O') total++;
  }

  const tagHtml = (tags || []).map(([t, label]) =>
    `<span class="sch-mini-tag ${esc(t)}">${esc(label)}</span>`
  ).join('');

  const mineCls = isMine ? ' is-mine' : '';
  const avatarMine = isMine ? ' is-mine' : '';
  const selectedCls = isSelectedNurse ? ' is-selected-nurse' : '';

  // 팀원 행: data-nurse-row(DOM 조작 키) + 클릭 액션
  const nurseRowAttr = (!isMine && rowKey != null) ? ` data-nurse-row="${rowKey}"` : '';
  const nurseClickAttr = (!isMine && rowKey != null)
    ? ` data-action="selectSchNurse" data-nurse-name="${esc(name)}"`
    : '';

  let row = `<div class="sch-nurse-cell${mineCls}${selectedCls}"${nurseRowAttr}${nurseClickAttr}>`;
  row += `<div class="sch-avatar ${cls}${avatarMine}">${esc(_initials(name))}</div>`;
  row += `<div class="sch-nurse-info"><span class="sch-nurse-name">${esc(name)}</span>`;
  if (tagHtml) row += `<div class="sch-nurse-tags">${tagHtml}</div>`;
  row += `</div></div>`;

  for (let d = dayStart; d <= dayEnd; d++) {
    const code = safeCode(dutyMap[d]);
    let dutyCls = 'sch-duty';
    let label = '';
    if (code) {
      dutyCls += ' sch-duty-' + code;
      label = code === 'O' ? 'OFF' : code;
    } else {
      dutyCls += ' sch-duty-empty';
    }
    if (isMine) dutyCls += ' is-mine';
    if (isMine && code && code !== 'O') dutyCls += ' is-clickable';
    if (selectedDay === d) dutyCls += ' is-selected';

    const clickAttr = (isMine && code)
      ? ` data-action="onSchDutyClick" data-sch-day="${d}" data-sch-code="${esc(code)}"`
      : '';
    const cellNurseRowAttr = (!isMine && rowKey != null) ? ` data-nurse-row="${rowKey}"` : '';
    row += `<div class="${dutyCls}"${clickAttr}${cellNurseRowAttr}>${esc(label)}</div>`;
  }

  const totalExtraCls = isMine ? ' is-mine-total' : (isSelectedNurse ? ' is-selected-nurse' : '');
  const totalNurseRowAttr = (!isMine && rowKey != null) ? ` data-nurse-row="${rowKey}"` : '';
  row += `<div class="sch-total-cell${totalExtraCls}"${totalNurseRowAttr}>${total}<span class="lbl">일</span></div>`;
  return row;
}

// ── 내 스케줄 월간 캘린더 (휴가/시간외 스타일 — ot-cal 패턴) ──
function renderMineCalendar() {
  const root = document.getElementById('schMineCalendar');
  if (!root) return;

  const { year, month, selectedDay } = schState;
  const data = _getMonthData(year, month);
  const mine = data.mine || {};
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const todayInfo = _today();
  const isCurMonth = todayInfo.year === year && todayInfo.month === month;
  const todayDay = isCurMonth ? todayInfo.day : -1;

  const dowLabels = ['일', '월', '화', '수', '목', '금', '토'];

  let html = `<div class="ot-cal"><div class="ot-cal-header" style="background:rgba(99,102,241,0.08); color:var(--accent-indigo)">`
    + `<button class="cal-nav-btn" data-action="schNavMonth" data-nav-delta="-1">◀</button>`
    + `<span class="cal-nav-title" data-action="schGoToday">${year}년 ${month}월</span>`
    + `<button class="cal-nav-btn" data-action="schNavMonth" data-nav-delta="1">▶</button>`
    + `</div>`;
  html += `<div class="ot-cal-grid">`;

  dowLabels.forEach((d, i) => {
    const cls = i === 0 ? 'sun' : (i === 6 ? 'sat' : '');
    html += `<div class="ot-cal-dow ${cls}">${d}</div>`;
  });

  for (let i = 0; i < firstDow; i++) {
    html += `<div class="ot-cal-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const isWknd = (dow === 0 || dow === 6);
    const isHoliday = !!schState.holidayMap[d];
    const isToday = (d === todayDay);
    const isSelected = selectedDay === d;
    const code = safeCode(mine[d]);

    let cls = 'ot-cal-day sch-cal-day';
    if (isHoliday) cls += ' holiday';
    else if (isWknd) cls += ' weekend';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';

    const clickAttr = code ? ` data-action="onSchDutyClick" data-sch-day="${d}" data-sch-code="${esc(code)}"` : '';

    let dutyChip = '';
    if (code) {
      dutyChip = `<span class="cal-badge sch-duty-${code} sch-cal-badge">${esc(code === 'O' ? 'OFF' : code)}</span>`;
    }
    const holidayName = schState.holidayMap[d];
    const holidayChip = holidayName
      ? `<span class="sch-cal-holiday" title="${esc(holidayName)}">${esc(_formatHolidayName(holidayName))}</span>`
      : '';

    html += `<div class="${cls}"${clickAttr} data-day="${d}">${d}${holidayChip}${dutyChip}</div>`;
  }

  html += `</div></div>`;
  // eslint-disable-next-line no-unsanitized/property
  root.innerHTML = html;
}

// ── 월/주 이동 (mine view = 월 / team view = 월 또는 주) ──
function schNavMonth(delta) {
  const d = parseInt(delta, 10) || 0;
  let { year, month } = schState;
  month += d;
  if (month > 12) { year++; month = 1; }
  if (month < 1) { year--; month = 12; }
  schState.year = year;
  schState.month = month;
  schState.weekStartDay = 1;
  schState.selectedDay = null;
  _refreshMonth();
}

function schGoToday() {
  const t = _today();
  schState.year = t.year;
  schState.month = t.month;
  schState.weekStartDay = _weekStartContaining(t.year, t.month, t.day);
  schState.selectedDay = t.day;
  _refreshMonth();
}

// 주 이동 (부서 전체 + 주간 모드 전용)
function schNavWeek(delta) {
  const d = parseInt(delta, 10) || 0;
  const daysInMonth = new Date(schState.year, schState.month, 0).getDate();
  let next = (schState.weekStartDay || 1) + d * 7;
  if (next < 1) {
    schNavMonth(-1);
    const prevDays = new Date(schState.year, schState.month, 0).getDate();
    schState.weekStartDay = Math.max(1, prevDays - 6);
    _refreshMonth();
    return;
  }
  if (next > daysInMonth) {
    schNavMonth(1);
    schState.weekStartDay = 1;
    _refreshMonth();
    return;
  }
  schState.weekStartDay = next;
  _updateWeekLabel();
  if (schState.view === 'team') renderRoster();
}

function _weekStartContaining(year, month, day) {
  // 7일 단위 묶음의 시작 (1, 8, 15, 22, 29)
  return Math.floor((day - 1) / 7) * 7 + 1;
}

// ── 통계 + 경고 렌더 ──
function renderStats() {
  const grid = document.getElementById('schStatsGrid');
  const warnRow = document.getElementById('schWarnRow');
  if (!grid || !warnRow) return;

  const { year, month } = schState;
  const data = _getMonthData(year, month);
  const holidaySet = new Set(Object.keys(schState.holidayMap).map(Number));
  const counts = calcMonthlyDutyCounts(data.mine || {}, holidaySet);

  const cards = [
    { cls: 'D', code: 'D', num: counts.D, lbl: '데이' },
    { cls: 'E', code: 'E', num: counts.E, lbl: '이브닝' },
    { cls: 'N', code: 'N', num: counts.N, lbl: '나이트' },
    { cls: 'O', code: 'O', num: counts.O, lbl: '오프' },
    { cls: 'AL', code: 'AL', num: counts.AL, lbl: '연차' },
    { cls: 'RD', code: 'RD', num: counts.RD, lbl: '리커버리' },
  ];
  if (counts.holidayDuty > 0) {
    cards.push({ cls: 'HD', code: 'HD', num: counts.holidayDuty, lbl: '공휴일 근무' });
  }

  let html = '';
  for (const c of cards) {
    const statClass = c.cls ? ` sch-stat-${esc(c.cls)}` : '';
    html += `<div class="sch-stat-card${statClass}" data-duty="${esc(c.cls)}"><span class="sch-stat-code">${esc(c.code)}</span><span class="num">${esc(c.num)}</span><span class="lbl">${esc(c.lbl)}</span></div>`;
  }
  // eslint-disable-next-line no-unsanitized/property
  grid.innerHTML = html;

  // 경고 칩
  const violations = detectViolations(data.mine || {}, year, month);
  let warnHtml = '';
  for (const v of violations) {
    const fn = VIOLATION_LABELS[v.type];
    if (!fn) continue;
    const tone = v.type === 'min_rest_violation' ? 'rose' : 'amber';
    warnHtml += `<span class="sch-warn-chip ${tone}">${esc(fn(v))}</span>`;
  }
  // eslint-disable-next-line no-unsanitized/property
  warnRow.innerHTML = warnHtml;
}

// ── 다음 근무 ──
function renderNextDuty() {
  const wrap = document.getElementById('schNextDutyWrap');
  const dateEl = document.getElementById('schNextDate');
  const dutyEl = document.getElementById('schNextDuty');
  const timeEl = document.getElementById('schNextTime');
  if (!wrap || !dateEl || !dutyEl || !timeEl) return;

  const { year, month } = schState;
  const data = _getMonthData(year, month);
  const next = findNextDuty(data.mine || {}, year, month);

  if (next) {
    wrap.style.display = '';
    dateEl.textContent = next.date.replace(/^\d{4}-/, '').replace('-', '월 ') + '일';
    dutyEl.textContent = next.code + ' ' + (DUTY_LABELS[next.code] || '');
    dutyEl.className = 'sch-next-duty sch-duty-' + safeCode(next.code);
    timeEl.textContent = next.timeRange || '';
  } else {
    wrap.style.display = '';
    dateEl.textContent = '예정 근무 없음';
    dutyEl.textContent = '';
    dutyEl.className = 'sch-next-duty';
    timeEl.textContent = '';
  }
}

// ── 기간 헤더 ──
function renderPeriodLabel() {
  const el = document.getElementById('schPeriodLabel');
  if (el) el.textContent = `${schState.year}년 ${schState.month}월`;
}

// ── 뷰 토글 ──
function setSchView(view) {
  if (view !== 'mine' && view !== 'team') return;
  schState.view = view;
  document.getElementById('schViewMineBtn')?.classList.toggle('active', view === 'mine');
  document.getElementById('schViewTeamBtn')?.classList.toggle('active', view === 'team');

  // 컨테이너 가시성: mine = mine 캘린더 / team = 로스터 그리드
  const mineCard = document.getElementById('schMineCalendarCard');
  const rosterCard = document.getElementById('schRosterCard');
  if (mineCard) mineCard.style.display = view === 'mine' ? '' : 'none';
  if (rosterCard) rosterCard.style.display = view === 'team' ? '' : 'none';

  // 월간/주간 segment: mine view에서는 숨김
  const periodSeg = document.getElementById('schPeriodSeg');
  const periodHint = document.getElementById('schPeriodHint');
  if (periodSeg) periodSeg.style.display = view === 'team' ? '' : 'none';
  if (periodHint) periodHint.style.display = 'none';

  // mine view → 강제 month period
  if (view === 'mine' && schState.period !== 'month') {
    schState.period = 'month';
    document.getElementById('schPeriodMonthBtn')?.classList.add('active');
    document.getElementById('schPeriodWeekBtn')?.classList.remove('active');
  }

  // 활성 컨테이너 렌더
  if (view === 'mine') renderMineCalendar();
  else renderRoster();
}

function setSchPeriod(period) {
  if (period !== 'month' && period !== 'week') return;
  // 주간은 부서 전체 뷰에서만 의미 있음
  if (period === 'week' && schState.view !== 'team') {
    _showToast('주간 뷰는 부서 전체에서만 동작합니다.', 'warning');
    return;
  }
  schState.period = period;
  document.getElementById('schPeriodMonthBtn')?.classList.toggle('active', period === 'month');
  document.getElementById('schPeriodWeekBtn')?.classList.toggle('active', period === 'week');
  if (period === 'week' && (!schState.weekStartDay || schState.weekStartDay < 1)) {
    const t = _today();
    const isCurMonth = t.year === schState.year && t.month === schState.month;
    schState.weekStartDay = isCurMonth ? _weekStartContaining(t.year, t.month, t.day) : 1;
  }
  // 주간 nav 헤더 가시성 + 라벨
  const weekNav = document.getElementById('schWeekNav');
  if (weekNav) weekNav.style.display = period === 'week' ? '' : 'none';
  _updateWeekLabel();
  if (schState.view === 'team') renderRoster();
}

function _updateWeekLabel() {
  const label = document.getElementById('schWeekLabel');
  if (!label) return;
  if (schState.period !== 'week') return;
  const start = schState.weekStartDay || 1;
  const daysInMonth = new Date(schState.year, schState.month, 0).getDate();
  const end = Math.min(daysInMonth, start + 6);
  label.textContent = `${schState.year}년 ${schState.month}월 ${start}일 ~ ${end}일`;
}

// ── 본인 듀티 셀 클릭 → cross-tab deep-link ──
function onSchDutyClick(day, code) {
  schState.selectedDay = day;

  if (code === 'N' || code === 'D' || code === 'E') {
    const dateStr = _ymd(schState.year, schState.month, day);
    const isHolidayDuty = !!schState.holidayMap[day];

    if (code === 'N' || isHolidayDuty) {
      // 시간외 탭으로 이동 (자동 입력 레코드 확인 안내)
      window.SCHEDULE_DEEP_LINK = { kind: 'overtime', date: dateStr, code };
      if (window.switchTab) window.switchTab('overtime');
      _showToast(`시간외 탭으로 이동 — ${dateStr} ${code} 근무 기록을 확인하세요.`, 'success');
      return;
    }
    // 평일 D/E는 정규근무 — 토스트만
    _showToast(`${dateStr} ${code} (정규근무)`, 'success');
    return;
  }

  if (code === 'AL' || code === 'RD') {
    const dateStr = _ymd(schState.year, schState.month, day);
    window.SCHEDULE_DEEP_LINK = { kind: 'leave', date: dateStr, code };
    if (window.switchTab) window.switchTab('leave');
    _showToast(`휴가 탭으로 이동 — ${dateStr} ${DUTY_LABELS[code]} 기록을 확인하세요.`, 'success');
    return;
  }

  if (code === 'O') {
    _showToast('오프', 'success');
  }
}

// ── 팀원 행 선택 (re-render 없이 DOM 클래스 토글) ──
function selectSchNurse(name) {
  const prev = schState.selectedNurse;
  const prevKey = schState._nurseRowMap?.[prev];
  if (prevKey != null) {
    document.querySelectorAll(`#schRoster [data-nurse-row="${prevKey}"]`)
      .forEach(el => el.classList.remove('is-selected-nurse'));
  }
  if (prev === name) {
    schState.selectedNurse = null;
    return;
  }
  schState.selectedNurse = name;
  const newKey = schState._nurseRowMap?.[name];
  if (newKey != null) {
    document.querySelectorAll(`#schRoster [data-nurse-row="${newKey}"]`)
      .forEach(el => el.classList.add('is-selected-nurse'));
  }
}

// ── 자동 레코드 reconcile (idempotent: 기존 source='schedule' 삭제 후 신규) ──
async function reconcileMonthlyRecords(year, month) {
  const data = _getMonthData(year, month);
  const mine = data.mine || {};
  const yyyymm = _yyyymm(year, month);

  // 1. 기존 source='schedule' AND sourceMonth=yyyymm 레코드 삭제
  let deletedOt = 0;
  let deletedLv = 0;
  try {
    deletedOt = OVERTIME.deleteRecordsBySource('schedule', yyyymm);
    deletedLv = LEAVE.deleteRecordsBySource('schedule', yyyymm);
  } catch (e) {
    console.warn('[schedule] reconcile delete failed', e);
  }

  // 2. 공휴일 set
  const holidayDays = new Set(Object.keys(schState.holidayMap).map(Number));

  // 3. mine → records
  const { overtimeRecords, leaveRecords } = mineMapToRecords(mine, year, month, holidayDays, {
    hourlyRate: schState.hourlyRate,
    sourceMonth: yyyymm,
  });

  // 4. 신규 생성
  let createdOt = 0;
  let createdLv = 0;
  for (const r of overtimeRecords) {
    try {
      OVERTIME.createRecord(
        r.date, r.startTime, r.endTime, r.type,
        r.hourlyRate, r.isHoliday, r.memo,
        { source: r.source, sourceMonth: r.sourceMonth }
      );
      createdOt++;
    } catch (e) {
      console.warn('[schedule] OVERTIME.createRecord failed', e);
    }
  }
  for (const r of leaveRecords) {
    try {
      LEAVE.addRecord(r);
      createdLv++;
    } catch (e) {
      console.warn('[schedule] LEAVE.addRecord failed', e);
    }
  }

  return { createdOt, createdLv, deletedOt, deletedLv };
}

// ── Firebase sync ──
async function _syncMonthToFirebase(year, month) {
  const uid = window.__firebaseUid;
  if (!uid) return;
  try {
    const { writeScheduleMonth } = await import('/src/firebase/sync/schedule-sync.js');
    const data = _getMonthData(year, month);
    await writeScheduleMonth(null, uid, _yyyymm(year, month), data);
  } catch (e) {
    console.warn('[schedule] Firebase sync failed', e?.message);
  }
}

async function _loadFromFirebase(year, month) {
  const uid = window.__firebaseUid;
  if (!uid) return;
  try {
    const { readScheduleMonth } = await import('/src/firebase/sync/schedule-sync.js');
    const remote = await readScheduleMonth(null, uid, _yyyymm(year, month));
    if (remote && Object.keys(remote.mine || {}).length > 0) {
      _setMonthData(year, month, remote);
    }
  } catch (e) {
    console.warn('[schedule] Firebase load failed', e?.message);
  }
}

// ── 업로드 모달 ──
function openSchUpload() {
  const overlay = document.getElementById('schUploadOverlay');
  const sheet = document.getElementById('schUploadSheet');
  if (!overlay || !sheet) return;
  overlay.classList.add('show');
  sheet.classList.add('show');

  document.getElementById('schUploadStatus').style.display = 'none';
  document.getElementById('schNameMatch').style.display = 'none';
  document.getElementById('schUploadConfirmBtn').disabled = true;
  document.getElementById('schFileInput').value = '';
  schState.uploadFile = null;
  schState.parsedNames = [];
}

function closeSchUpload() {
  const overlay = document.getElementById('schUploadOverlay');
  const sheet = document.getElementById('schUploadSheet');
  if (!overlay || !sheet) return;
  overlay.classList.remove('show');
  sheet.classList.remove('show');
}

async function _handleSchFileSelect(file) {
  if (!file) return;
  schState.uploadFile = file;
  schState.parsedGrid = null;
  schState.parsedNames = [];

  const status = document.getElementById('schUploadStatus');
  const fileName = document.getElementById('schUploadFileName');
  const message = document.getElementById('schUploadMessage');
  const icon = document.getElementById('schUploadIcon');
  status.style.display = '';
  fileName.textContent = file.name;
  icon.textContent = '⏳';
  message.textContent = '파일 분석 중...';

  // 프로필에서 본인 이름 / 부서 / 월 힌트
  let profileName = '';
  try {
    const profile = PROFILE.load();
    profileName = profile?.name || '';
  } catch (_e) { /* noop */ }

  try {
    const { parseScheduleFile } = await import('./schedule-parser/index.js');
    const result = await parseScheduleFile(file, {
      profileName,
      monthHint: `${schState.year}-${String(schState.month).padStart(2, '0')}`,
    });

    if (result.blocked) {
      icon.textContent = '⚠️';
      message.textContent = result.error || '이 부서·월은 이미 3번 파싱되었습니다.';
      _showToast(message.textContent, 'warning');
      return;
    }

    if (!result.grid) {
      icon.textContent = '❌';
      message.textContent = result.error || '자동 인식 실패. 검수 모달에서 직접 입력하세요.';
      // 빈 grid로 검수 모달 진입 (사용자가 행 추가)
      schState.parsedGrid = { rows: [], confidence: 0, dept: null, month: null };
      _renderParsedNamesSelect(profileName);
      return;
    }

    // 정확도 등급
    const tier = result.tier;
    const confPct = Math.round((result.grid.confidence || 0) * 100);
    if (result.fromCache) {
      icon.textContent = '⚡';
      message.textContent = `캐시에서 즉시 불러왔어요 (${result.provider}, ${result.grid.rows.length}명, 정확도 ${confPct}%).`;
    } else if (tier === 'auto') {
      icon.textContent = '✅';
      message.textContent = `자동 인식 완료 — ${result.provider}, ${result.grid.rows.length}명, 정확도 ${confPct}%.`;
    } else if (tier === 'review-required') {
      icon.textContent = '⚠️';
      message.textContent = `자동 인식 정확도 낮음 (${confPct}%) — 모든 행을 직접 확인하세요.`;
    } else {
      icon.textContent = '❌';
      message.textContent = `자동 인식 실패 (${confPct}%) — 수동 입력으로 진행하세요.`;
    }

    schState.parsedGrid = result.grid;
    schState.parsedNames = (result.grid.rows || []).map(r => r.name);
    _renderParsedNamesSelect(profileName);
  } catch (e) {
    icon.textContent = '❌';
    message.textContent = `파싱 실패: ${e?.message?.slice(0, 100) || 'unknown error'}`;
    console.warn('[schedule] parseScheduleFile error', e);
  }
}

function _renderParsedNamesSelect(profileName) {
  const select = document.getElementById('schNameSelect');
  select.textContent = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— 선택 —';
  select.appendChild(placeholder);

  const names = schState.parsedNames.length > 0
    ? schState.parsedNames
    : ['(파싱된 이름 없음 — 수동으로 본인 데이터를 입력하세요)'];

  names.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    if (n === profileName) opt.selected = true;
    select.appendChild(opt);
  });

  document.getElementById('schNameMatch').style.display = '';
  document.getElementById('schUploadConfirmBtn').disabled = !select.value;

  // 동의 체크박스 → 기존 동의 상태 반영
  try {
    import('./schedule-parser/anonymize.js').then(({ getCorpusConsent }) => {
      const cb = document.getElementById('schCorpusConsent');
      if (cb) cb.checked = !!getCorpusConsent().granted;
    });
  } catch (_e) { /* noop */ }

  select.onchange = () => {
    document.getElementById('schUploadConfirmBtn').disabled = !select.value;
  };
}

async function confirmSchUpload() {
  const select = document.getElementById('schNameSelect');
  const selectedName = select?.value;
  if (!selectedName) return;

  const { year, month } = schState;
  const data = _getMonthData(year, month);

  // 파싱된 grid가 있으면 mine map과 team map을 새 데이터로 갱신
  const parsedGrid = schState.parsedGrid;
  if (parsedGrid && Array.isArray(parsedGrid.rows) && parsedGrid.rows.length > 0) {
    const myRow = parsedGrid.rows.find(r => r.name === selectedName);
    if (myRow && myRow.days) {
      // mine map: { day: code }
      data.mine = {};
      for (const [day, code] of Object.entries(myRow.days)) {
        if (code) data.mine[day] = code;
      }
    }
    // team map: 본인 외 모든 행
    const newTeam = {};
    for (const row of parsedGrid.rows) {
      if (row.name === selectedName) continue;
      const dayMap = {};
      for (const [day, code] of Object.entries(row.days || {})) {
        if (code) dayMap[day] = code;
      }
      newTeam[row.name] = dayMap;
    }
    data.team = newTeam;

    // 부서·월 메타 (파싱 결과 우선, 없으면 schState 유지)
    if (parsedGrid.dept) data.dept = parsedGrid.dept;
    if (parsedGrid.month) data.parsedMonth = parsedGrid.month;
  }

  data.sourceFile = schState.uploadFile?.name || '';
  data.demo = false;
  _setMonthData(year, month, data);

  // 코퍼스 동의 처리 (체크박스 상태 → localStorage 저장 → 제출)
  const consentCb = document.getElementById('schCorpusConsent');
  const wantsConsent = !!(consentCb && consentCb.checked);
  try {
    const { setCorpusConsent } = await import('./schedule-parser/anonymize.js');
    setCorpusConsent(wantsConsent);
  } catch (_e) { /* noop */ }

  closeSchUpload();

  // Firebase sync (best-effort)
  _syncMonthToFirebase(year, month);

  // 코퍼스 제출 (동의한 경우만, best-effort)
  if (wantsConsent && schState.parsedGrid) {
    try {
      const { submitToCorpus } = await import('/src/firebase/sync/corpus-sync.js');
      submitToCorpus({ grid: schState.parsedGrid }).catch(e => {
        console.warn('[schedule] corpus submit failed', e?.message);
      });
    } catch (_e) { /* noop */ }
  }

  // 자동 레코드 생성 (idempotent)
  const result = await reconcileMonthlyRecords(year, month);
  const msg = `'${selectedName}' 님의 ${month}월 근무표 반영 — 시간외 ${result.createdOt}건, 휴가 ${result.createdLv}건 등록`;
  _showToast(msg, 'success');

  // 재렌더
  await _refreshMonth();
}

function goToProfileFromSch() {
  closeSchUpload();
  if (window.switchTab) window.switchTab('profile');
}

// ── 입력 소스 카드 전환 ──
function setSchSource(source) {
  const valid = ['file', 'ics', 'url'];
  if (!valid.includes(source)) return;

  document.querySelectorAll('#tab-schedule .sch-source-card').forEach(t => {
    const isActive = t.dataset.source === source;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-checked', String(isActive));
  });
  document.querySelectorAll('#tab-schedule [data-source-pane]').forEach(p => {
    p.style.display = p.dataset.sourcePane === source ? '' : 'none';
  });

  // 상태 초기화
  document.getElementById('schUploadStatus').style.display = 'none';
  document.getElementById('schNameMatch').style.display = 'none';
  document.getElementById('schUploadConfirmBtn').disabled = true;
  schState.parsedGrid = null;
  schState.parsedNames = [];
}

// ── iCal URL 가져오기 ──
async function fetchSchIcsUrl() {
  const urlInput = document.getElementById('schIcsUrl');
  const url = urlInput?.value?.trim();
  if (!url) {
    _showToast('URL을 입력하세요', 'warning');
    return;
  }

  const status = document.getElementById('schUploadStatus');
  const fileName = document.getElementById('schUploadFileName');
  const message = document.getElementById('schUploadMessage');
  const icon = document.getElementById('schUploadIcon');
  status.style.display = '';
  fileName.textContent = url;
  icon.textContent = '⏳';
  message.textContent = '캘린더 URL 가져오는 중...';

  let profileName = '';
  try {
    const profile = PROFILE.load();
    profileName = profile?.name || '';
  } catch (_e) { /* noop */ }

  try {
    const { parseScheduleUrl } = await import('./schedule-parser/index.js');
    const result = await parseScheduleUrl(url, {
      profileName,
      monthHint: `${schState.year}-${String(schState.month).padStart(2, '0')}`,
    });

    if (!result.grid) {
      icon.textContent = '❌';
      message.textContent = result.error || 'URL 파싱 실패';
      return;
    }

    const confPct = Math.round((result.grid.confidence || 0) * 100);
    icon.textContent = '✅';
    message.textContent = `iCal URL 파싱 완료 — ${result.grid.rows.length}명, 정확도 ${confPct}%.`;
    schState.parsedGrid = result.grid;
    schState.parsedNames = (result.grid.rows || []).map(r => r.name);
    schState.uploadFile = { name: url };
    _renderParsedNamesSelect(profileName);
  } catch (e) {
    icon.textContent = '❌';
    message.textContent = `URL 가져오기 실패: ${e?.message?.slice(0, 100) || ''}`;
  }
}

// ── 토스트 (기존 otToast 재사용) ──
function _showToast(message, type = 'success') {
  const toast = document.getElementById('otToast');
  if (!toast) {
    console.log('[schedule]', message);
    return;
  }
  toast.textContent = message;
  toast.style.background = type === 'warning'
    ? 'rgba(245,158,11,0.95)'
    : 'rgba(16,185,129,0.95)';
  toast.style.display = 'block';
  // eslint-disable-next-line no-unused-expressions
  toast.offsetHeight;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.style.display = 'none'; }, 400);
  }, 2500);
}

// ── 월 전환 ──
async function _refreshMonth() {
  const { year, month, view } = schState;
  schState.holidayMap = await _loadHolidayMap(year, month);
  schState.hourlyRate = _loadHourlyRate();
  renderPeriodLabel();
  // 뷰별로 활성 컨테이너만 렌더
  if (view === 'mine') renderMineCalendar();
  else renderRoster();
  renderStats();
  renderNextDuty();
}

// ── 진입점 ──
async function initScheduleTab() {
  const t = _today();
  if (!schState.year) {
    schState.year = t.year;
    schState.month = t.month;
  }
  // 로그인 사용자: Firebase에서 우선 로드 시도
  await _loadFromFirebase(schState.year, schState.month);
  // 데모 시드는 항상 실제 현재 월에만 (이전 탐색 상태가 다른 월이어도 그 월에 시드하지 않음)
  _seedDemoIfEmpty(t.year, t.month);
  await _refreshMonth();
  setSchView(schState.view);
}

// ── 글로벌 노출 (data-action 디스패처용) ──
window.initScheduleTab = initScheduleTab;
window.openSchUpload = openSchUpload;
window.closeSchUpload = closeSchUpload;
window.confirmSchUpload = confirmSchUpload;
window.setSchView = setSchView;
window.setSchPeriod = setSchPeriod;
window.onSchDutyClick = onSchDutyClick;
window.goToProfileFromSch = goToProfileFromSch;
window.setSchSource = setSchSource;
window.fetchSchIcsUrl = fetchSchIcsUrl;
window.schNavMonth = schNavMonth;
window.schGoToday = schGoToday;
window.schNavWeek = schNavWeek;
window.selectSchNurse = selectSchNurse;

// ── data-action 글로벌 디스패처 ──
document.addEventListener('click', (ev) => {
  const target = ev.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (!action) return;

  switch (action) {
    case 'openSchUpload':       openSchUpload(); break;
    case 'closeSchUpload':      closeSchUpload(); break;
    case 'confirmSchUpload':    confirmSchUpload(); break;
    case 'setSchView':          setSchView(target.dataset.view); break;
    case 'setSchPeriod':        setSchPeriod(target.dataset.period); break;
    case 'goToProfileFromSch':  goToProfileFromSch(); break;
    case 'setSchSource':        setSchSource(target.dataset.source); break;
    case 'fetchSchIcsUrl':      fetchSchIcsUrl(); break;
    case 'schNavMonth':         schNavMonth(target.dataset.navDelta); break;
    case 'schGoToday':          schGoToday(); break;
    case 'schNavWeek':          schNavWeek(target.dataset.navDelta); break;
    case 'onSchDutyClick': {
      const day = Number(target.dataset.schDay);
      const code = target.dataset.schCode;
      if (day && code) onSchDutyClick(day, code);
      break;
    }
    case 'selectSchNurse': selectSchNurse(target.dataset.nurseName); break;
    default: break;
  }
});

document.addEventListener('change', (ev) => {
  if (ev.target && (ev.target.id === 'schFileInput' || ev.target.id === 'schIcsFileInput')) {
    const file = ev.target.files && ev.target.files[0];
    if (file) _handleSchFileSelect(file).catch(e => console.warn('[schedule] file select handler', e));
  }
});

export { initScheduleTab };
