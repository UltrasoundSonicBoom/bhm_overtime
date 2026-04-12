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

const state = {
  teams: [],
  teamSlug: '101',
  period: '2026-05',
  dataset: null,
  schedule: null,
  regulation: null,
  memberId: '',
  personalDate: '',
  filter: 'all',
  search: '',
  surface: 'overview',
};

const els = {
  teamSelect: document.getElementById('teamSelect'),
  periodInput: document.getElementById('periodInput'),
  memberSearchInput: document.getElementById('memberSearchInput'),
  memberSelect: document.getElementById('memberSelect'),
  downloadIcsBtn: document.getElementById('downloadIcsBtn'),
  focusBanner: document.getElementById('focusBanner'),
  overviewDigest: document.getElementById('overviewDigest'),
  statusGrid: document.getElementById('statusGrid'),
  boardHeadline: document.getElementById('boardHeadline'),
  publishMeta: document.getElementById('publishMeta'),
  publishedBoard: document.getElementById('publishedBoard'),
  personalHeadline: document.getElementById('personalHeadline'),
  personalPanel: document.getElementById('personalPanel'),
  policyPanel: document.getElementById('policyPanel'),
  surfaceNav: document.getElementById('surfaceNav'),
};

els.periodInput.value = state.period;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function apiJson(path, allow404 = false) {
  const response = await fetch(`${API_BASE}${path}`);
  if (allow404 && response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `요청 실패 (${response.status})`);
  return data;
}

function getPeriodParts() {
  const [year, month] = state.period.split('-').map(Number);
  return { year, month };
}

function sanitizeToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDateLabel(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 (${WEEKDAY_LABELS[date.getUTCDay()]})`;
}

function getMemberAssignments(memberId) {
  return resolvePublishedAssignments()
    .filter((assignment) => assignment.memberId === memberId)
    .sort((left, right) => left.date.localeCompare(right.date));
}

function getMemberAssignmentMap(memberId) {
  const map = new Map();
  getMemberAssignments(memberId).forEach((assignment) => {
    map.set(assignment.date, assignment.shiftCode);
  });
  return map;
}

function getEventBadgeLabel(event) {
  switch (event.eventType) {
    case 'education':
    case 'orientation':
      return 'EDU';
    case 'conference':
      return 'CONF';
    case 'meeting':
      return 'MEET';
    case 'dinner':
      return 'DIN';
    case 'ward_event':
      return 'WARD';
    case 'restriction':
      return 'RULE';
    case 'fixed_shift':
      return event.preferredShiftCode || 'FIX';
    default:
      return String(event.eventType || 'EVT').slice(0, 4).toUpperCase();
  }
}

function getEventTone(event) {
  switch (event.eventType) {
    case 'education':
    case 'orientation':
      return 'education';
    case 'conference':
      return 'conference';
    case 'meeting':
      return 'meeting';
    case 'dinner':
      return 'dinner';
    case 'restriction':
      return 'restriction';
    case 'fixed_shift':
      return 'fixed';
    default:
      return 'team';
  }
}

function ensurePersonalDate(memberId) {
  const periodDates = (state.dataset?.coverage || []).map((day) => day.date);
  if (!periodDates.length) return '';
  if (state.personalDate && periodDates.includes(state.personalDate)) return state.personalDate;
  if (TODAY.startsWith(`${state.period}-`)) {
    state.personalDate = TODAY;
    return state.personalDate;
  }
  const memberAssignments = getMemberAssignments(memberId);
  const eventDates = (state.dataset?.memberEvents || [])
    .filter((event) => event.memberId === memberId)
    .flatMap((event) => event.dates || []);
  const interestingDates = [...memberAssignments.map((assignment) => assignment.date), ...eventDates]
    .filter((date) => periodDates.includes(date))
    .sort();
  state.personalDate = interestingDates[0] || periodDates[0];
  return state.personalDate;
}

function getVisibleMembers() {
  const members = state.dataset?.members || [];
  const leaveIds = new Set((state.dataset?.approvedLeaves || []).map((leave) => leave.memberId));
  const educationIds = new Set((state.dataset?.memberEvents || [])
    .filter((event) => ['education', 'orientation', 'conference'].includes(event.eventType))
    .map((event) => event.memberId));
  const query = state.search.trim().toLowerCase();

  return members.filter((member) => {
    if (query) {
      const text = [member.name, member.roleLabel || '', ...(member.skillTags || [])].join(' ').toLowerCase();
      if (!text.includes(query)) return false;
    }
    if (state.filter === 'leave') return leaveIds.has(member.id);
    if (state.filter === 'education') return educationIds.has(member.id);
    if (state.filter === 'new-grad') return (member.skillTags || []).includes('new-grad');
    return true;
  });
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

function renderTeamOptions() {
  els.teamSelect.innerHTML = state.teams.map((team) => `<option value="${team.slug}">${escapeHtml(team.name)}</option>`).join('');
  els.teamSelect.value = state.teamSlug;
}

function renderMemberOptions() {
  const members = state.dataset?.members || [];
  if (!state.memberId && members.length) {
    state.memberId = String(members[0].id);
  }
  if (state.memberId && !members.some((member) => String(member.id) === state.memberId)) {
    state.memberId = members[0] ? String(members[0].id) : '';
  }
  els.memberSelect.innerHTML = members.map((member) => (
    `<option value="${member.id}">${escapeHtml(member.name)} · ${escapeHtml(member.roleLabel || 'RN')}</option>`
  )).join('');
  els.memberSelect.value = state.memberId;
}

function renderStatusGrid() {
  const validation = state.dataset?.datasetValidation || { summary: { warnings: 0, errors: 0, blocking: false } };
  const educationCount = (state.dataset?.memberEvents || [])
    .filter((event) => ['education', 'orientation', 'conference'].includes(event.eventType))
    .length;
  const cards = [
    ['배포 버전', state.schedule?.published?.version_number ? `v${state.schedule.published.version_number}` : '없음', state.schedule?.published ? '확정 배포본' : '아직 배포되지 않음'],
    ['팀원', `${state.dataset?.members?.length || 0}명`, '읽기 전용 배포판'],
    ['휴가', `${state.dataset?.approvedLeaves?.length || 0}일`, '승인 휴가 포함'],
    ['교육', `${educationCount}건`, '개인 교육·오리엔테이션'],
    ['검증 경고', `${validation.summary.errors || 0}E / ${validation.summary.warnings || 0}W`, validation.summary.blocking ? '관리자 확인 필요' : '배포본 참조 가능'],
  ];
  els.statusGrid.innerHTML = cards.map(([label, value, note]) => `
    <article class="status-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(note)}</span>
    </article>
  `).join('');
}

function renderFocusBanner() {
  const member = (state.dataset?.members || []).find((item) => String(item.id) === state.memberId) || state.dataset?.members?.[0];
  const ledger = (state.dataset?.leaveLedger || []).find((item) => String(item.memberId) === String(member?.id));
  if (!member) {
    els.focusBanner.innerHTML = '선택한 간호사의 핵심 일정을 준비하는 중입니다.';
    return;
  }
  const message = `${member.name}님 기준으로 휴가 ${ledger?.annualLeaveDays || 0}일, 교육 ${ledger?.educationDays || 0}일, 최근 야간 ${ledger?.recentNightCount || 0}회를 먼저 보여드립니다.`;
  els.focusBanner.innerHTML = `
    <strong>${escapeHtml(`${member.name}님의 이번 달 확인`)}</strong>
    <span>${escapeHtml(message)}</span>
  `;
}

function renderOverviewDigest() {
  const member = (state.dataset?.members || []).find((item) => String(item.id) === state.memberId) || state.dataset?.members?.[0];
  const ledger = (state.dataset?.leaveLedger || []).find((item) => String(item.memberId) === String(member?.id));
  if (!member) {
    els.overviewDigest.innerHTML = '<div class="empty-copy">개인 요약을 준비하는 중입니다.</div>';
    return;
  }

  const assignments = getMemberAssignments(member.id);
  const upcomingAssignments = assignments.filter((assignment) => new Date(`${assignment.date}T00:00:00Z`) >= TODAY_DATE).slice(0, 3);
  const nextAssignment = upcomingAssignments[0] || assignments[0] || null;
  const memberEvents = (state.dataset?.memberEvents || [])
    .filter((event) => event.memberId === member.id)
    .slice(0, 3);
  const todayAssignment = assignments.find((assignment) => assignment.date === TODAY);

  els.overviewDigest.innerHTML = `
    <article class="digest-card">
      <strong>${escapeHtml(`${member.name}님 기준`)}</strong>
      <span>${escapeHtml(todayAssignment ? `오늘은 ${todayAssignment.shiftCode} 근무입니다.` : '오늘 배포된 근무가 없거나 미래 기간입니다.')}</span>
      <div class="digest-tags">
        <span class="digest-tag">${escapeHtml(`휴가 ${ledger?.annualLeaveDays || 0}일`)}</span>
        <span class="digest-tag">${escapeHtml(`교육 ${ledger?.educationDays || 0}일`)}</span>
        <span class="digest-tag">${escapeHtml(`최근 야간 ${ledger?.recentNightCount || 0}회`)}</span>
      </div>
      <div class="digest-tags">
        ${(memberEvents.length
          ? memberEvents.map((event) => `<span class="digest-tag">${escapeHtml(event.title)}</span>`).join('')
          : '<span class="digest-tag">개인 이벤트 없음</span>')}
      </div>
    </article>
    <article class="digest-card">
      <strong>${escapeHtml(nextAssignment ? '이번 달 캘린더' : '개인 캘린더') }</strong>
      <span>${escapeHtml(nextAssignment ? `${formatDateLabel(nextAssignment.date)} · ${nextAssignment.shiftCode}가 가장 가깝습니다.` : '날짜를 누르면 아래에서 상세를 봅니다.')}</span>
      ${buildPersonalCalendar(member, { compact: true, triggerAttr: 'data-overview-date' })}
    </article>
  `;
  bindCalendarInteractions(els.overviewDigest, 'data-overview-date');
}

function syncSurfaceNav() {
  document.body.dataset.publishSurface = state.surface;
  els.surfaceNav?.querySelectorAll('[data-surface]').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-surface') === state.surface);
  });
}

function renderBoard() {
  const assignments = resolvePublishedAssignments();
  if (!assignments.length) {
    els.boardHeadline.textContent = `${state.teamSlug} · ${state.period}`;
    els.publishMeta.textContent = '배포본 없음';
    els.publishedBoard.innerHTML = '<div class="empty-copy">이 기간에는 아직 배포된 근무표가 없습니다.</div>';
    return;
  }

  const visibleMembers = getVisibleMembers();
  if (!visibleMembers.length) {
    els.publishedBoard.innerHTML = '<div class="empty-copy">필터 조건에 맞는 팀원이 없습니다.</div>';
    return;
  }

  els.boardHeadline.textContent = `${state.dataset?.team?.name || state.teamSlug} · ${state.period}`;
  els.publishMeta.textContent = `Published v${state.schedule?.published?.version_number || '-'}`;

  const assignmentMap = buildAssignmentMap();
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
        <th class="member-col sticky-col">
          <div class="member-name">${shiftCode} coverage</div>
          <div class="member-meta">배포본 충원 상태</div>
        </th>
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
          <div class="member-meta">${escapeHtml(member.roleLabel || 'RN')} · ${(member.skillTags || []).map((tag) => escapeHtml(tag)).join(', ')}</div>
        </th>
        ${cells}
      </tr>
    `;
  }).join('');

  els.publishedBoard.innerHTML = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th class="member-col sticky-col">Team / Nurse</th>
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

function renderPersonalPanel() {
  const member = (state.dataset?.members || []).find((item) => String(item.id) === state.memberId);
  const ledger = (state.dataset?.leaveLedger || []).find((item) => String(item.memberId) === state.memberId);
  els.personalHeadline.textContent = member ? `${member.name} 일정 캘린더` : '선택한 간호사 일정';
  if (!member) {
    els.personalPanel.innerHTML = '<div class="empty-copy">팀원을 선택하면 개인 일정을 보여줍니다.</div>';
    return;
  }
  const selectedDate = ensurePersonalDate(member.id);
  els.personalPanel.innerHTML = `
    <section class="personal-calendar-stack">
      <div class="personal-summary-row">
        <span class="digest-tag">${escapeHtml(`휴가 ${ledger?.annualLeaveDays || 0}일`)}</span>
        <span class="digest-tag">${escapeHtml(`교육 ${ledger?.educationDays || 0}일`)}</span>
        <span class="digest-tag">${escapeHtml(`최근 야간 ${ledger?.recentNightCount || 0}회`)}</span>
        <span class="digest-tag">${escapeHtml(`최근 주말 ${ledger?.recentWeekendCount || 0}회`)}</span>
      </div>
      ${buildPersonalCalendar(member, { triggerAttr: 'data-personal-date' })}
      ${renderPersonalDateDetail(member, selectedDate)}
    </section>
  `;
  bindCalendarInteractions(els.personalPanel, 'data-personal-date');
}

function renderPolicyPanel() {
  const facts = state.regulation?.ui_quick_facts || [];
  if (!facts.length) {
    els.policyPanel.innerHTML = '<div class="empty-copy">규정 요약을 아직 불러오지 못했습니다.</div>';
    return;
  }
  els.policyPanel.innerHTML = facts.slice(0, 6).map((fact) => `
    <div class="detail-row">
      <strong>${escapeHtml(fact.label || '')}</strong>
      <span>${escapeHtml(fact.value || '')}</span>
      <span>${escapeHtml(fact.ref || '')}</span>
    </div>
  `).join('');
}

function renderAll() {
  renderTeamOptions();
  renderMemberOptions();
  renderFocusBanner();
  renderOverviewDigest();
  renderStatusGrid();
  renderBoard();
  renderPersonalPanel();
  renderPolicyPanel();
  syncSurfaceNav();
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

function buildPersonalCalendar(member, options = {}) {
  const { compact = false, triggerAttr = 'data-personal-date' } = options;
  const { year, month } = getPeriodParts();
  const selectedDate = ensurePersonalDate(member.id);
  const assignmentMap = getMemberAssignmentMap(member.id);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDayOffset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;

  let html = `
    <div class="personal-calendar-shell ${compact ? 'compact' : ''}">
      <div class="personal-calendar-head">
        <strong>${escapeHtml(`${year}년 ${month}월`)}</strong>
        <span>${escapeHtml(compact ? '날짜를 누르면 개인 일정 탭으로 이동합니다.' : '날짜를 눌러 해당 일자의 근무와 이벤트를 확인하세요.')}</span>
      </div>
      <div class="personal-calendar-grid" role="grid" aria-label="${escapeHtml(`${member.name} ${year}년 ${month}월 일정`)}}">
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
    const { memberEvents, teamEvents } = findEventsForCell(member.id, dateKey);
    const eventBadges = [
      ...memberEvents.map((event) => ({
        label: getEventBadgeLabel(event),
        tone: getEventTone(event),
      })),
      ...teamEvents.map(() => ({ label: 'TEAM', tone: 'team' })),
    ];
    const shownBadges = eventBadges.slice(0, compact ? 1 : 2);
    const isToday = dateKey === TODAY;
    const isSelected = selectedDate === dateKey;
    const buttonClass = [
      'personal-day',
      shiftCode !== '-' ? `shift-${sanitizeToken(shiftCode)}` : 'shift-empty',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      eventBadges.length ? 'has-event' : '',
    ].filter(Boolean).join(' ');

    html += `
      <button
        type="button"
        class="${buttonClass}"
        ${triggerAttr}="${dateKey}"
        aria-pressed="${isSelected ? 'true' : 'false'}"
      >
        <span class="day-topline">
          <span class="day-number">${day}</span>
          ${isToday ? '<span class="day-marker">오늘</span>' : ''}
        </span>
        <span class="day-shift">${escapeHtml(shiftCode === '-' ? '미정' : shiftCode)}</span>
        <span class="day-badges">
          ${shownBadges.map((badge) => `<span class="day-badge ${escapeHtml(badge.tone)}">${escapeHtml(badge.label)}</span>`).join('')}
          ${eventBadges.length > shownBadges.length ? `<span class="day-badge count">+${eventBadges.length - shownBadges.length}</span>` : ''}
        </span>
      </button>
    `;
  }

  html += `
      </div>
    </div>
  `;
  return html;
}

function renderPersonalDateDetail(member, selectedDate) {
  const ledger = (state.dataset?.leaveLedger || []).find((item) => String(item.memberId) === String(member.id));
  const assignmentMap = getMemberAssignmentMap(member.id);
  const shiftCode = assignmentMap.get(selectedDate) || '-';
  const { memberEvents, teamEvents } = findEventsForCell(member.id, selectedDate);
  const coverageDay = (state.dataset?.coverage || []).find((day) => day.date === selectedDate);
  const detailRows = [
    {
      label: '배포 근무',
      value: shiftCode === '-' ? '배정 없음' : shiftCode,
      note: selectedDate === TODAY ? '오늘 기준 확정 배포본' : '확정 배포본에서 확인된 근무',
      tone: shiftCode === '-' ? 'neutral' : sanitizeToken(shiftCode),
    },
    ...memberEvents.map((event) => ({
      label: event.title,
      value: getEventBadgeLabel(event),
      note: `${event.startDate}${event.startDate !== event.endDate ? ` ~ ${event.endDate}` : ''} · 개인 이벤트`,
      tone: getEventTone(event),
    })),
    ...teamEvents.map((event) => ({
      label: event.title,
      value: 'TEAM',
      note: `${event.startDate}${event.startDate !== event.endDate ? ` ~ ${event.endDate}` : ''} · 팀 공용 일정`,
      tone: 'team',
    })),
  ];

  if (coverageDay) {
    detailRows.push({
      label: '팀 커버리지',
      value: `D ${coverageDay.requirements?.D || 0} · E ${coverageDay.requirements?.E || 0} · N ${coverageDay.requirements?.N || 0}`,
      note: '이 날짜의 병동 필요 인원',
      tone: 'coverage',
    });
  }

  detailRows.push({
    label: `${member.name} 최근 기준`,
    value: `휴가 ${ledger?.annualLeaveDays || 0}일 · 교육 ${ledger?.educationDays || 0}일`,
    note: `최근 야간 ${ledger?.recentNightCount || 0}회 · 최근 주말 ${ledger?.recentWeekendCount || 0}회`,
    tone: 'summary',
  });

  return `
    <section class="personal-date-detail" aria-live="polite">
      <div class="personal-date-head">
        <strong>${escapeHtml(formatDateLabel(selectedDate))}</strong>
        <span>${escapeHtml('선택한 날짜의 근무, 개인 일정, 병동 공용 이벤트를 한 번에 보여줍니다.')}</span>
      </div>
      <div class="date-detail-list">
        ${detailRows.map((row) => `
          <article class="date-detail-row ${escapeHtml(row.tone)}">
            <strong>${escapeHtml(row.label)}</strong>
            <span>${escapeHtml(row.value)}</span>
            <small>${escapeHtml(row.note)}</small>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function bindCalendarInteractions(container, attributeName) {
  container.querySelectorAll(`[${attributeName}]`).forEach((button) => {
    button.addEventListener('click', () => {
      state.personalDate = button.getAttribute(attributeName) || '';
      if (window.innerWidth <= 820) {
        state.surface = 'personal';
      }
      renderOverviewDigest();
      renderPersonalPanel();
      syncSurfaceNav();
    });
  });
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
  if (window.innerWidth <= 820) {
    state.surface = 'personal';
  }
  renderAll();
});

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.getAttribute('data-filter') || 'all';
    state.surface = 'board';
    document.querySelectorAll('[data-filter]').forEach((chip) => chip.classList.toggle('active', chip === button));
    renderAll();
  });
});

els.surfaceNav?.querySelectorAll('[data-surface]').forEach((button) => {
  button.addEventListener('click', () => {
    state.surface = button.getAttribute('data-surface') || 'overview';
    syncSurfaceNav();
  });
});

els.downloadIcsBtn.addEventListener('click', downloadIcs);

loadTeams()
  .then(loadWorkspace)
  .catch((error) => {
    els.publishedBoard.innerHTML = `<div class="empty-copy">${escapeHtml(error.message || String(error))}</div>`;
  });
