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

const state = {
  teams: [],
  teamSlug: '101',
  period: '2026-05',
  dataset: null,
  schedule: null,
  regulation: null,
  memberId: '',
  filter: 'all',
  search: '',
};

const els = {
  teamSelect: document.getElementById('teamSelect'),
  periodInput: document.getElementById('periodInput'),
  memberSearchInput: document.getElementById('memberSearchInput'),
  memberSelect: document.getElementById('memberSelect'),
  downloadIcsBtn: document.getElementById('downloadIcsBtn'),
  statusGrid: document.getElementById('statusGrid'),
  boardHeadline: document.getElementById('boardHeadline'),
  publishMeta: document.getElementById('publishMeta'),
  publishedBoard: document.getElementById('publishedBoard'),
  personalHeadline: document.getElementById('personalHeadline'),
  personalPanel: document.getElementById('personalPanel'),
  policyPanel: document.getElementById('policyPanel'),
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
  els.personalHeadline.textContent = member ? `${member.name} 일정` : '선택한 간호사 일정';
  if (!member) {
    els.personalPanel.innerHTML = '<div class="empty-copy">팀원을 선택하면 개인 일정을 보여줍니다.</div>';
    return;
  }

  const assignments = resolvePublishedAssignments()
    .filter((assignment) => assignment.memberId === member.id)
    .slice(0, 12);
  const events = (state.dataset?.memberEvents || [])
    .filter((event) => event.memberId === member.id)
    .slice(0, 6);
  const rows = [
    ['휴가 누적', `${ledger?.annualLeaveDays || 0}일`, '최근 배포 기준'],
    ['교육 누적', `${ledger?.educationDays || 0}일`, '오리엔테이션 포함'],
    ['최근 야간', `${ledger?.recentNightCount || 0}회`, '최근 3개월 기준'],
    ['최근 주말', `${ledger?.recentWeekendCount || 0}회`, '최근 3개월 기준'],
    ...events.map((event) => [event.title, `${event.startDate}${event.startDate !== event.endDate ? ` ~ ${event.endDate}` : ''}`, event.eventType]),
    ...assignments.slice(0, 4).map((assignment) => [assignment.date, assignment.shiftCode, '배포 근무']),
  ];

  els.personalPanel.innerHTML = rows.map(([label, value, note]) => `
    <div class="detail-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
      <span>${escapeHtml(note)}</span>
    </div>
  `).join('');
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
  renderStatusGrid();
  renderBoard();
  renderPersonalPanel();
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
  renderAll();
});

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.getAttribute('data-filter') || 'all';
    document.querySelectorAll('[data-filter]').forEach((chip) => chip.classList.toggle('active', chip === button));
    renderAll();
  });
});

els.downloadIcsBtn.addEventListener('click', downloadIcs);

loadTeams()
  .then(loadWorkspace)
  .catch((error) => {
    els.publishedBoard.innerHTML = `<div class="empty-copy">${escapeHtml(error.message || String(error))}</div>`;
  });
