const API_BASE = (() => {
  const hostname = window.location.hostname;
  const localHostMap = {
    localhost: 'localhost',
    '127.0.0.1': 'localhost',
    '::1': 'localhost',
  };
  const localApiHost = localHostMap[hostname];
  if (window.location.protocol === 'file:') return 'http://localhost:3001/api';
  if (localApiHost && window.location.port !== '3001') return `http://${localApiHost}:3001/api`;
  return '/api';
})();

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const TODAY = new Date().toISOString().slice(0, 10);
const TODAY_DATE = new Date(`${TODAY}T00:00:00Z`);

const query = new URLSearchParams(window.location.search);

const state = {
  teams: [],
  teamSlug: query.get('team') || '101',
  period: query.get('period') || '2026-05',
  memberId: query.get('memberId') || '',
  dataset: null,
  schedule: null,
  regulation: null,
  personalDate: '',
  search: '',
};

const els = {
  teamSelect: document.getElementById('teamSelect'),
  periodInput: document.getElementById('periodInput'),
  memberSearchInput: document.getElementById('memberSearchInput'),
  memberSelect: document.getElementById('memberSelect'),
  downloadIcsBtn: document.getElementById('downloadIcsBtn'),
  boardLink: document.getElementById('boardLink'),
  todayHero: document.getElementById('todayHero'),
  statusGrid: document.getElementById('statusGrid'),
  todayChecklist: document.getElementById('todayChecklist'),
  coworkerPanel: document.getElementById('coworkerPanel'),
  personalHeadline: document.getElementById('personalHeadline'),
  personalPanel: document.getElementById('personalPanel'),
  policyPanel: document.getElementById('policyPanel'),
};

els.periodInput.value = state.period;
els.memberSearchInput.value = state.search;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function apiJson(path, allow404 = false) {
  if (window.location.protocol === 'file:' && window.__NURSE_ADMIN_FIXTURES) {
    return fixtureJson(path, allow404);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (allow404 && response.status === 404) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `요청 실패 (${response.status})`);
    return data;
  } catch (error) {
    if (window.__NURSE_ADMIN_FIXTURES) {
      return fixtureJson(path, allow404);
    }
    throw error;
  }
}

function getPeriodParts() {
  const [year, month] = state.period.split('-').map(Number);
  return { year, month };
}

function getPeriodKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function fixtureJson(path, allow404 = false) {
  const fixtures = window.__NURSE_ADMIN_FIXTURES;
  if (!fixtures) throw new Error('로컬 샘플 데이터가 없습니다.');

  const url = new URL(path, 'http://local.test');
  if (url.pathname === '/teams') {
    return fixtures.teams;
  }

  const datasetMatch = url.pathname.match(/^\/teams\/([^/]+)\/dataset$/);
  if (datasetMatch) {
    const year = Number(url.searchParams.get('year') || 0);
    const month = Number(url.searchParams.get('month') || 0);
    const data = fixtures.datasets?.[`${datasetMatch[1]}:${getPeriodKey(year, month)}`];
    if (data) return data;
  }

  const scheduleMatch = url.pathname.match(/^\/teams\/([^/]+)\/schedules\/(\d{4}-\d{2})$/);
  if (scheduleMatch) {
    const data = fixtures.schedules?.[`${scheduleMatch[1]}:${scheduleMatch[2]}`];
    if (data) return data;
    if (allow404) return null;
  }

  if (url.pathname === '/data/nurse-regulation') {
    const year = url.searchParams.get('year') || '2026';
    const data = fixtures.regulations?.[year];
    if (data) return data;
  }

  throw new Error(`로컬 샘플 데이터가 없습니다: ${url.pathname}`);
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDateLabel(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 (${WEEKDAY_LABELS[date.getUTCDay()]})`;
}

function getMemberAssignments(memberId) {
  return (state.schedule?.published?.assignments_snapshot || [])
    .filter((assignment) => String(assignment.memberId) === String(memberId))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function getMemberAssignmentMap(memberId) {
  const map = new Map();
  getMemberAssignments(memberId).forEach((assignment) => map.set(assignment.date, assignment.shiftCode));
  return map;
}

function getTodayFocusDate(memberId) {
  const periodDates = (state.dataset?.coverage || []).map((day) => day.date);
  if (!periodDates.length) return '';
  if (TODAY.startsWith(`${state.period}-`) && periodDates.includes(TODAY)) return TODAY;
  const assignments = getMemberAssignments(memberId);
  return assignments[0]?.date || periodDates[0];
}

function getVisibleMembers() {
  const members = state.dataset?.members || [];
  const queryText = state.search.trim().toLowerCase();
  return members.filter((member) => {
    if (!queryText) return true;
    const haystack = [member.name, member.roleLabel || '', ...(member.skillTags || [])].join(' ').toLowerCase();
    return haystack.includes(queryText);
  });
}

function findEventsForDate(memberId, date) {
  return {
    memberEvents: (state.dataset?.memberEvents || []).filter((event) => event.memberId === memberId && (event.dates || []).includes(date)),
    teamEvents: (state.dataset?.wardEvents || []).filter((event) => (event.dates || []).includes(date)),
  };
}

function syncLinks() {
  const search = new URLSearchParams({
    team: state.teamSlug,
    period: state.period,
    memberId: state.memberId || '',
  });
  if (state.search) search.set('q', state.search);
  els.boardLink.href = `./index.html?${search.toString()}`;
  const nextUrl = `${window.location.pathname}?${search.toString()}`;
  window.history.replaceState({}, '', nextUrl);
}

function renderTeamOptions() {
  els.teamSelect.innerHTML = state.teams.map((team) => `<option value="${team.slug}">${escapeHtml(team.name)}</option>`).join('');
  els.teamSelect.value = state.teamSlug;
}

function renderMemberOptions() {
  const members = state.dataset?.members || [];
  if (!state.memberId && members.length) state.memberId = String(members[0].id);
  if (state.memberId && !members.some((member) => String(member.id) === state.memberId)) {
    state.memberId = members[0] ? String(members[0].id) : '';
  }
  els.memberSelect.innerHTML = members.map((member) => `<option value="${member.id}">${escapeHtml(member.name)} · ${escapeHtml(member.roleLabel || 'RN')}</option>`).join('');
  els.memberSelect.value = state.memberId;
  syncLinks();
}

function renderStatusGrid(member, dateKey) {
  const ledger = (state.dataset?.leaveLedger || []).find((item) => String(item.memberId) === String(member.id));
  const assignmentMap = getMemberAssignmentMap(member.id);
  const shiftCode = assignmentMap.get(dateKey) || '-';
  const cards = [
    ['오늘 근무', shiftCode],
    ['휴가', `${ledger?.annualLeaveDays || 0}일`],
    ['교육', `${ledger?.educationDays || 0}일`],
    ['최근 야간', `${ledger?.recentNightCount || 0}회`],
  ];
  els.statusGrid.innerHTML = cards.map(([label, value]) => `
    <article class="status-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join('');
}

function renderTodayHero(member, dateKey) {
  const assignmentMap = getMemberAssignmentMap(member.id);
  const shiftCode = assignmentMap.get(dateKey) || '-';
  els.todayHero.innerHTML = `
    <strong>${escapeHtml(`${member.name}님의 오늘`)}</strong>
    <span>${escapeHtml(`${formatDateLabel(dateKey)} · ${shiftCode} 근무`)}</span>
  `;
}

function renderTodayChecklist(member, dateKey) {
  const assignmentMap = getMemberAssignmentMap(member.id);
  const shiftCode = assignmentMap.get(dateKey) || '-';
  const { memberEvents, teamEvents } = findEventsForDate(member.id, dateKey);
  const items = [
    shiftCode === 'D' ? '출근 전 인계와 오늘 업무 순서를 확인하세요.' : null,
    shiftCode === 'E' ? '저녁 인계 전 남은 처치와 공용 일정을 확인하세요.' : null,
    shiftCode === 'N' ? '야간 인계 전 호출과 안전 체크를 먼저 확인하세요.' : null,
    memberEvents.length ? `${memberEvents[0].title} 일정을 확인하세요.` : null,
    teamEvents.length ? `${teamEvents[0].title} 팀 공용 일정을 확인하세요.` : null,
    '개인 캘린더가 필요하면 .ics를 내려받으세요.',
  ].filter(Boolean);
  els.todayChecklist.innerHTML = items.map((item) => `<div class="detail-row"><strong>${escapeHtml(item)}</strong></div>`).join('');
}

function renderCoworkerPanel(member, dateKey) {
  const assignmentMap = new Map();
  (state.schedule?.published?.assignments_snapshot || []).forEach((assignment) => {
    assignmentMap.set(`${assignment.memberId}:${assignment.date}`, assignment.shiftCode);
  });
  const myShift = assignmentMap.get(`${member.id}:${dateKey}`) || '-';
  const coworkers = (state.dataset?.members || [])
    .filter((item) => item.id !== member.id)
    .filter((item) => assignmentMap.get(`${item.id}:${dateKey}`) === myShift)
    .slice(0, 8);
  els.coworkerPanel.innerHTML = coworkers.length
    ? coworkers.map((item) => `
      <div class="detail-row">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(`${item.roleLabel || 'RN'} · ${myShift}`)}</span>
      </div>
    `).join('')
    : '<div class="empty-copy">같은 시간대 근무자가 없습니다.</div>';
}

function buildPersonalCalendar(member) {
  const { year, month } = getPeriodParts();
  const selectedDate = state.personalDate || getTodayFocusDate(member.id);
  const assignmentMap = getMemberAssignmentMap(member.id);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDayOffset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;

  let html = `
    <div class="personal-calendar-shell">
      <div class="personal-calendar-head">
        <strong>${escapeHtml(`${year}년 ${month}월`)}</strong>
        <span>날짜를 누르면 상세를 확인합니다.</span>
      </div>
      <div class="personal-calendar-grid" role="grid" aria-label="${escapeHtml(`${member.name} ${year}년 ${month}월 일정`)}">
  `;

  WEEKDAY_LABELS.forEach((label, index) => {
    html += `<span class="calendar-weekday ${index === 0 ? 'sun' : ''} ${index === 6 ? 'sat' : ''}">${label}</span>`;
  });

  for (let index = 0; index < totalCells; index += 1) {
    const day = index - firstDayOffset + 1;
    if (day < 1 || day > daysInMonth) {
      html += '<div class="personal-day outside" aria-hidden="true"></div>';
      continue;
    }
    const dateKey = formatDateKey(year, month, day);
    const shiftCode = assignmentMap.get(dateKey) || '-';
    const isToday = dateKey === TODAY;
    const isSelected = selectedDate === dateKey;
    html += `
      <button
        type="button"
        class="personal-day ${shiftCode !== '-' ? `shift-${shiftCode.toLowerCase()}` : 'shift-empty'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
        data-personal-date="${dateKey}"
      >
        <span class="day-topline">
          <span class="day-number">${day}</span>
          ${isToday ? '<span class="day-marker">오늘</span>' : ''}
        </span>
        <span class="day-shift">${escapeHtml(shiftCode === '-' ? '미정' : shiftCode)}</span>
      </button>
    `;
  }

  html += '</div></div>';
  return html;
}

function renderPersonalDetail(member, selectedDate) {
  const assignmentMap = getMemberAssignmentMap(member.id);
  const shiftCode = assignmentMap.get(selectedDate) || '-';
  const { memberEvents, teamEvents } = findEventsForDate(member.id, selectedDate);
  const rows = [
    { label: '배포 근무', value: shiftCode === '-' ? '배정 없음' : shiftCode },
    ...memberEvents.map((event) => ({ label: event.title, value: '개인 일정' })),
    ...teamEvents.map((event) => ({ label: event.title, value: '팀 일정' })),
  ];
  return `
    <section class="personal-date-detail" aria-live="polite">
      <div class="personal-date-head">
        <strong>${escapeHtml(formatDateLabel(selectedDate))}</strong>
        <span>선택한 날짜의 근무와 일정을 보여줍니다.</span>
      </div>
      <div class="date-detail-list">
        ${rows.map((row) => `
          <article class="date-detail-row">
            <strong>${escapeHtml(row.label)}</strong>
            <span>${escapeHtml(row.value)}</span>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function bindCalendarInteractions(container, member) {
  container.querySelectorAll('[data-personal-date]').forEach((button) => {
    button.addEventListener('click', () => {
      state.personalDate = button.getAttribute('data-personal-date') || '';
      renderPersonalPanel(member);
    });
  });
}

function renderPersonalPanel(member) {
  const selectedDate = state.personalDate || getTodayFocusDate(member.id);
  els.personalHeadline.textContent = `${member.name} 일정`;
  els.personalPanel.innerHTML = `
    <section class="personal-calendar-stack">
      ${buildPersonalCalendar(member)}
      ${renderPersonalDetail(member, selectedDate)}
    </section>
  `;
  bindCalendarInteractions(els.personalPanel, member);
}

function renderPolicyPanel() {
  const facts = state.regulation?.ui_quick_facts || [];
  els.policyPanel.innerHTML = facts.length
    ? facts.slice(0, 4).map((fact) => `
      <div class="detail-row">
        <strong>${escapeHtml(fact.label || '')}</strong>
        <span>${escapeHtml(fact.value || '')}</span>
      </div>
    `).join('')
    : '<div class="empty-copy">근무 기준을 불러오는 중입니다.</div>';
}

function renderAll() {
  renderTeamOptions();
  renderMemberOptions();
  const member = (state.dataset?.members || []).find((item) => String(item.id) === state.memberId) || state.dataset?.members?.[0];
  if (!member) return;
  const dateKey = getTodayFocusDate(member.id);
  renderTodayHero(member, dateKey);
  renderStatusGrid(member, dateKey);
  renderTodayChecklist(member, dateKey);
  renderCoworkerPanel(member, dateKey);
  renderPersonalPanel(member);
  renderPolicyPanel();
}

async function loadTeams() {
  const { year, month } = getPeriodParts();
  const data = await apiJson(`/teams?year=${year}&month=${month}`);
  state.teams = data.results || [];
  if (!state.teams.some((team) => team.slug === state.teamSlug) && state.teams.length) {
    state.teamSlug = state.teams[0].slug;
  }
}

async function loadWorkspace() {
  const { year, month } = getPeriodParts();
  const [datasetData, scheduleData, regulationData] = await Promise.all([
    apiJson(`/teams/${state.teamSlug}/dataset?year=${year}&month=${month}`),
    apiJson(`/teams/${state.teamSlug}/schedules/${state.period}`, true),
    apiJson(`/data/nurse-regulation?year=${year}`, true),
  ]);
  state.dataset = datasetData.result;
  state.schedule = scheduleData ? scheduleData.result : null;
  state.regulation = regulationData || null;
  state.personalDate = '';
  renderAll();
}

function downloadIcs() {
  if (!state.memberId) return;
  const link = document.createElement('a');
  link.href = `${API_BASE}/teams/${state.teamSlug}/schedules/${state.period}/calendar.ics?memberId=${encodeURIComponent(state.memberId)}`;
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

els.teamSelect.addEventListener('change', async (event) => {
  state.teamSlug = event.target.value;
  await loadWorkspace();
});

els.periodInput.addEventListener('change', async (event) => {
  state.period = event.target.value;
  await loadTeams();
  await loadWorkspace();
});

els.memberSearchInput.addEventListener('input', (event) => {
  state.search = event.target.value || '';
  renderAll();
});

els.memberSelect.addEventListener('change', (event) => {
  state.memberId = event.target.value;
  state.personalDate = '';
  syncLinks();
  renderAll();
});

els.downloadIcsBtn.addEventListener('click', downloadIcs);

loadTeams()
  .then(loadWorkspace)
  .catch((error) => {
    els.personalPanel.innerHTML = `<div class="empty-copy">${escapeHtml(error.message || String(error))}</div>`;
  });
