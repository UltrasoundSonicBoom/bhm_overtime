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
const query = new URLSearchParams(window.location.search);

const state = {
  teams: [],
  teamSlug: query.get('team') || '101',
  period: query.get('period') || '2026-05',
  dataset: null,
  schedule: null,
  memberId: query.get('memberId') || '',
  search: query.get('q') || '',
  boardShiftFocus: 'all',
};

const els = {
  teamSelect: document.getElementById('teamSelect'),
  periodInput: document.getElementById('periodInput'),
  memberSearchInput: document.getElementById('memberSearchInput'),
  memberSelect: document.getElementById('memberSelect'),
  myDayLink: document.getElementById('myDayLink'),
  myDayActionLink: document.getElementById('myDayActionLink'),
  focusBanner: document.getElementById('focusBanner'),
  statusGrid: document.getElementById('statusGrid'),
  todayCrewPanel: document.getElementById('todayCrewPanel'),
  boardHeadline: document.getElementById('boardHeadline'),
  publishMeta: document.getElementById('publishMeta'),
  shiftFocusBar: document.getElementById('shiftFocusBar'),
  shiftFocusMeta: document.getElementById('shiftFocusMeta'),
  publishedBoard: document.getElementById('publishedBoard'),
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

  throw new Error(`로컬 샘플 데이터가 없습니다: ${url.pathname}`);
}

function formatDateLabel(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 (${WEEKDAY_LABELS[date.getUTCDay()]})`;
}

function resolvePublishedAssignments() {
  return state.schedule?.published?.assignments_snapshot || [];
}

function buildAssignmentMap() {
  const map = new Map();
  resolvePublishedAssignments().forEach((assignment) => {
    map.set(`${assignment.memberId}:${assignment.date}`, assignment.shiftCode);
  });
  return map;
}

function findEventsForCell(memberId, date) {
  return {
    memberEvents: (state.dataset?.memberEvents || []).filter((event) => event.memberId === memberId && (event.dates || []).includes(date)),
    teamEvents: (state.dataset?.wardEvents || []).filter((event) => (event.dates || []).includes(date)),
  };
}

function getBoardFocusDate() {
  const dates = (state.dataset?.coverage || []).map((day) => day.date);
  if (!dates.length) return '';
  if (TODAY.startsWith(`${state.period}-`) && dates.includes(TODAY)) return TODAY;
  return dates[0];
}

function buildCoverageSummary(dateStr) {
  const summary = { D: 0, E: 0, N: 0, OFF: 0, LEAVE: 0, EDU: 0 };
  resolvePublishedAssignments()
    .filter((assignment) => assignment.date === dateStr)
    .forEach((assignment) => {
      if (summary[assignment.shiftCode] !== undefined) {
        summary[assignment.shiftCode] += 1;
      }
    });
  return summary;
}

function getVisibleMembers() {
  const members = state.dataset?.members || [];
  const query = state.search.trim().toLowerCase();
  return members.filter((member) => {
    if (!query) return true;
    const text = [member.name, member.roleLabel || '', ...(member.skillTags || [])].join(' ').toLowerCase();
    return text.includes(query);
  });
}

function getBoardCrew(dateStr) {
  const visibleMembers = getVisibleMembers();
  const assignmentMap = buildAssignmentMap();
  return visibleMembers
    .filter((member) => state.boardShiftFocus === 'all' || assignmentMap.get(`${member.id}:${dateStr}`) === state.boardShiftFocus)
    .slice(0, 10)
    .map((member) => ({
      member,
      shiftCode: assignmentMap.get(`${member.id}:${dateStr}`) || '-',
    }));
}

function syncLinks() {
  const search = new URLSearchParams({
    team: state.teamSlug,
    period: state.period,
    memberId: state.memberId || '',
  });
  if (state.search) search.set('q', state.search);
  const href = `./my-day.html?${search.toString()}`;
  if (els.myDayLink) els.myDayLink.href = href;
  if (els.myDayActionLink) els.myDayActionLink.href = href;
  const boardSearch = new URLSearchParams(search);
  const nextUrl = `${window.location.pathname}?${boardSearch.toString()}`;
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
  els.memberSelect.innerHTML = members.map((member) => (
    `<option value="${member.id}">${escapeHtml(member.name)} · ${escapeHtml(member.roleLabel || 'RN')}</option>`
  )).join('');
  els.memberSelect.value = state.memberId;
  syncLinks();
}

function renderStatusGrid() {
  const focusDate = getBoardFocusDate();
  const coverage = buildCoverageSummary(focusDate);
  const educationCount = (state.dataset?.memberEvents || []).filter((event) => ['education', 'orientation', 'conference'].includes(event.eventType)).length;
  const cards = [
    ['확정본', state.schedule?.published?.version_number ? `v${state.schedule.published.version_number}` : '없음'],
    ['근무 인원', `${state.dataset?.members?.length || 0}명`],
    ['휴가', `${state.dataset?.approvedLeaves?.length || 0}일`],
    ['주간 커버', `D ${coverage.D} · E ${coverage.E} · N ${coverage.N}`],
    ['교육', `${educationCount}건`],
  ];
  els.statusGrid.innerHTML = cards.map(([label, value]) => `
    <article class="status-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join('');
}

function renderFocusBanner() {
  const focusDate = getBoardFocusDate();
  if (!focusDate) {
    els.focusBanner.textContent = '오늘 근무 정보를 준비하는 중입니다.';
    return;
  }
  const coverage = buildCoverageSummary(focusDate);
  els.focusBanner.innerHTML = `
    <strong>${escapeHtml(`${state.dataset?.team?.name || state.teamSlug} · ${formatDateLabel(focusDate)}`)}</strong>
    <span>${escapeHtml(`D ${coverage.D}명 · E ${coverage.E}명 · N ${coverage.N}명 · 휴가 ${state.dataset?.approvedLeaves?.length || 0}건`)}</span>
  `;
}

function renderTodayCrewPanel() {
  const focusDate = getBoardFocusDate();
  const selectedMember = (state.dataset?.members || []).find((item) => String(item.id) === state.memberId) || null;
  const crew = getBoardCrew(focusDate);
  const selectedEntry = crew.find((item) => item.member.id === selectedMember?.id) || null;
  const shiftLabel = state.boardShiftFocus === 'all' ? (selectedEntry?.shiftCode || '전체') : state.boardShiftFocus;
  els.todayCrewPanel.innerHTML = `
    <strong>${escapeHtml(`${formatDateLabel(focusDate)} · ${shiftLabel}`)}</strong>
    <span>${escapeHtml(selectedEntry ? `${selectedMember.name}님과 같은 시간대 근무자입니다.` : '현재 선택한 근무조 인원을 보여줍니다.')}</span>
    <div class="crew-chip-row">
      ${crew.length ? crew.map((entry) => `
        <span class="crew-chip ${selectedMember && entry.member.id === selectedMember.id ? 'self' : ''}">
          ${escapeHtml(`${entry.member.name} · ${entry.shiftCode}`)}
        </span>
      `).join('') : '<span class="crew-chip">표시할 인원이 없습니다.</span>'}
    </div>
  `;
}

function renderShiftFocusBar() {
  const focusDate = getBoardFocusDate();
  const assignments = resolvePublishedAssignments().filter((assignment) => assignment.date === focusDate);
  const counts = { all: assignments.length, D: 0, E: 0, N: 0 };
  assignments.forEach((assignment) => {
    if (assignment.shiftCode === 'D') counts.D += 1;
    if (assignment.shiftCode === 'E') counts.E += 1;
    if (assignment.shiftCode === 'N') counts.N += 1;
  });
  const items = [
    ['all', '전체', counts.all],
    ['D', 'D', counts.D],
    ['E', 'E', counts.E],
    ['N', 'N', counts.N],
  ];
  els.shiftFocusBar.innerHTML = items.map(([key, label, count]) => `
    <button class="shift-focus-btn ${state.boardShiftFocus === key ? 'active' : ''}" type="button" data-shift-focus="${key}">
      ${escapeHtml(label)}${count ? ` · ${count}` : ''}
    </button>
  `).join('');
  els.shiftFocusMeta.textContent = `${formatDateLabel(focusDate)} 기준 ${state.boardShiftFocus === 'all' ? '전체 근무' : `${state.boardShiftFocus} 근무`}를 보고 있습니다.`;
  els.shiftFocusBar.querySelectorAll('[data-shift-focus]').forEach((button) => {
    button.addEventListener('click', () => {
      state.boardShiftFocus = button.getAttribute('data-shift-focus') || 'all';
      renderBoard();
      renderTodayCrewPanel();
    });
  });
}

function renderBoard() {
  const assignments = resolvePublishedAssignments();
  els.boardHeadline.textContent = `${state.dataset?.team?.name || state.teamSlug} · ${state.period}`;
  els.publishMeta.textContent = state.schedule?.published?.version_number
    ? `v${state.schedule.published.version_number}`
    : (state.schedule?.status || 'draft').toUpperCase();
  if (!assignments.length) {
    els.shiftFocusBar.innerHTML = '';
    els.shiftFocusMeta.textContent = '배포본이 없어서 근무조 선택은 잠시 숨겼습니다.';
    els.publishedBoard.innerHTML = `
      <div class="empty-copy">
        이 기간에는 아직 배포된 근무표가 없습니다.
        ${state.schedule?.candidates?.length ? '운영 콘솔에서 후보안을 검토한 뒤 배포하면 팀 보드에 표시됩니다.' : '먼저 운영 콘솔에서 초안을 생성해 주세요.'}
      </div>
    `;
    return;
  }

  const focusDate = getBoardFocusDate();
  const assignmentMap = buildAssignmentMap();
  renderShiftFocusBar();
  const visibleMembers = getVisibleMembers().filter((member) => {
    if (state.boardShiftFocus === 'all') return true;
    return assignmentMap.get(`${member.id}:${focusDate}`) === state.boardShiftFocus;
  });
  const coverageCounts = new Map();
  assignments.forEach((assignment) => {
    if (!['D', 'E', 'N'].includes(assignment.shiftCode)) return;
    const key = `${assignment.shiftCode}:${assignment.date}`;
    coverageCounts.set(key, (coverageCounts.get(key) || 0) + 1);
  });

  const headerCells = (state.dataset?.coverage || []).map((day) => {
    const date = new Date(`${day.date}T00:00:00Z`);
    return `
      <th class="day-head">
        <strong>${date.getUTCDate()}</strong>
        <span>${WEEKDAY_LABELS[date.getUTCDay()]}</span>
      </th>
    `;
  }).join('');

  const coverageRows = ['D', 'E', 'N'].map((shiftCode) => {
    const cells = (state.dataset?.coverage || []).map((day) => {
      const assigned = coverageCounts.get(`${shiftCode}:${day.date}`) || 0;
      const required = Number(day.requirements?.[shiftCode] || 0);
      const tone = assigned === required ? 'good' : assigned > required ? 'warn' : 'bad';
      return `<td class="coverage-cell"><span class="coverage-pill ${tone}">${assigned}/${required}</span></td>`;
    }).join('');
    return `
      <tr>
        <th class="member-col sticky-col"><div class="member-name">${shiftCode}</div></th>
        ${cells}
      </tr>
    `;
  }).join('');

  const memberRows = visibleMembers.map((member) => {
    const highlight = String(member.id) === state.memberId;
    const cells = (state.dataset?.coverage || []).map((day) => {
      const code = assignmentMap.get(`${member.id}:${day.date}`) || '-';
      const { memberEvents, teamEvents } = findEventsForCell(member.id, day.date);
      const flags = [
        ...memberEvents.map((event) => `<span class="cell-flag member">${escapeHtml(event.eventType === 'education' || event.eventType === 'orientation' ? 'EDU' : event.eventType)}</span>`),
        ...teamEvents.map(() => '<span class="cell-flag team">TEAM</span>'),
      ].slice(0, 2).join('');
      return `
        <td class="shift-cell">
          <div class="shift-pill shift-${escapeHtml(String(code))} ${day.date === TODAY ? 'today' : ''}">
            <span>${escapeHtml(code)}</span>
            ${flags ? `<span class="cell-flags">${flags}</span>` : ''}
          </div>
        </td>
      `;
    }).join('');
    return `
      <tr>
        <th class="member-col sticky-col ${highlight ? 'highlight' : ''}">
          <div class="member-name">${escapeHtml(member.name)}</div>
          <div class="member-meta">${escapeHtml(member.roleLabel || 'RN')}</div>
        </th>
        ${cells}
      </tr>
    `;
  }).join('');

  els.publishedBoard.innerHTML = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th class="member-col sticky-col">이름</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        ${coverageRows}
        ${memberRows}
      </tbody>
    </table>
  `;
}

function renderAll() {
  renderTeamOptions();
  renderMemberOptions();
  renderFocusBanner();
  renderStatusGrid();
  renderTodayCrewPanel();
  renderBoard();
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
  const [datasetData, scheduleData] = await Promise.all([
    apiJson(`/teams/${state.teamSlug}/dataset?year=${year}&month=${month}`),
    apiJson(`/teams/${state.teamSlug}/schedules/${state.period}`, true),
  ]);
  state.dataset = datasetData.result;
  state.schedule = scheduleData ? scheduleData.result : null;
  renderAll();
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
  syncLinks();
  renderAll();
});

loadTeams()
  .then(loadWorkspace)
  .catch((error) => {
    els.publishedBoard.innerHTML = `<div class="empty-copy">${escapeHtml(error.message || String(error))}</div>`;
  });
