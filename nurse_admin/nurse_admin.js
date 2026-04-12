const SUPABASE_URL = 'https://ulamqyarenzjdxlisijl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Mg-Uzj8SwPBaXi3-d-E8PQ_ojRdKASi';

function createFallbackSupabase() {
  return {
    auth: {
      async getSession() {
        return { data: { session: null } };
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signInWithOAuth() {
        throw new Error('로그인 SDK를 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
      },
    },
  };
}

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createFallbackSupabase();
const supabaseSdkReady = Boolean(window.supabase?.createClient);
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
const CANDIDATE_LABELS = {
  balanced: 'Balanced',
  request_friendly: 'Requests',
  continuity_friendly: 'Continuity',
};
const ACTIVE_SHIFT_CODES = ['D', 'E', 'N'];

const state = {
  session: null,
  teams: [],
  teamSlug: '101',
  period: '2026-05',
  context: null,
  schedule: null,
  activeView: 'published',
  activeCandidateId: null,
  previewMemberId: '',
  selectedCell: null,
  selectedShiftCode: '',
  pendingLocks: new Map(),
  periodTouched: false,
  regulation: null,
  regulationScenarioReport: null,
  scenarioReport: null,
  rosterQuery: '',
  rosterFilter: 'all',
  adminPanel: 'overview',
};

const els = {
  authStatus: document.getElementById('authStatus'),
  loginBtn: document.getElementById('loginBtn'),
  workspaceStatus: document.getElementById('workspaceStatus'),
  teamSelect: document.getElementById('teamSelect'),
  periodInput: document.getElementById('periodInput'),
  claimBtn: document.getElementById('claimBtn'),
  refreshWorkspaceBtn: document.getElementById('refreshWorkspaceBtn'),
  generateBtn: document.getElementById('generateBtn'),
  repairBtn: document.getElementById('repairBtn'),
  publishBtn: document.getElementById('publishBtn'),
  metricsGrid: document.getElementById('metricsGrid'),
  datasetBlockingBadge: document.getElementById('datasetBlockingBadge'),
  datasetPulse: document.getElementById('datasetPulse'),
  rosterList: document.getElementById('rosterList'),
  rosterCount: document.getElementById('rosterCount'),
  rosterSearchInput: document.getElementById('rosterSearchInput'),
  rosterFilterChips: document.getElementById('rosterFilterChips'),
  memberSelect: document.getElementById('memberSelect'),
  downloadMemberIcsBtn: document.getElementById('downloadMemberIcsBtn'),
  publishedViewBtn: document.getElementById('publishedViewBtn'),
  candidateViewBtn: document.getElementById('candidateViewBtn'),
  stageHeadline: document.getElementById('stageHeadline'),
  stageDecision: document.getElementById('stageDecision'),
  reviewLane: document.getElementById('reviewLane'),
  opsPulse: document.getElementById('opsPulse'),
  eventTimeline: document.getElementById('eventTimeline'),
  candidateRail: document.getElementById('candidateRail'),
  scheduleViewport: document.getElementById('scheduleViewport'),
  selectedCellCard: document.getElementById('selectedCellCard'),
  selectedInspector: document.getElementById('selectedInspector'),
  shiftPicker: document.getElementById('shiftPicker'),
  lockReasonInput: document.getElementById('lockReasonInput'),
  queueLockBtn: document.getElementById('queueLockBtn'),
  clearSelectionBtn: document.getElementById('clearSelectionBtn'),
  pendingLocksList: document.getElementById('pendingLocksList'),
  pendingCount: document.getElementById('pendingCount'),
  validationCount: document.getElementById('validationCount'),
  validationQueue: document.getElementById('validationQueue'),
  eventCount: document.getElementById('eventCount'),
  eventEditorForm: document.getElementById('eventEditorForm'),
  eventIdInput: document.getElementById('eventIdInput'),
  eventScopeInput: document.getElementById('eventScopeInput'),
  eventMemberSelect: document.getElementById('eventMemberSelect'),
  eventTypeInput: document.getElementById('eventTypeInput'),
  eventTitleInput: document.getElementById('eventTitleInput'),
  eventStartInput: document.getElementById('eventStartInput'),
  eventEndInput: document.getElementById('eventEndInput'),
  eventAllDayInput: document.getElementById('eventAllDayInput'),
  eventBlocksWorkInput: document.getElementById('eventBlocksWorkInput'),
  eventShiftInput: document.getElementById('eventShiftInput'),
  eventCoverageDeltaInput: document.getElementById('eventCoverageDeltaInput'),
  eventNotesInput: document.getElementById('eventNotesInput'),
  eventSaveBtn: document.getElementById('eventSaveBtn'),
  eventResetBtn: document.getElementById('eventResetBtn'),
  eventTable: document.getElementById('eventTable'),
  regulationVersion: document.getElementById('regulationVersion'),
  policySnapshot: document.getElementById('policySnapshot'),
  allowanceLens: document.getElementById('allowanceLens'),
  ruleSummary: document.getElementById('ruleSummary'),
  violationSummary: document.getElementById('violationSummary'),
  scenarioScore: document.getElementById('scenarioScore'),
  scenarioLab: document.getElementById('scenarioLab'),
  resultBox: document.getElementById('resultBox'),
  mobileWorkflowNav: document.getElementById('mobileWorkflowNav'),
};

els.workspaceStatus.textContent = '로딩 준비';
els.teamSelect.innerHTML = '<option value="">팀 불러오는 중</option>';
els.memberSelect.innerHTML = '<option value="">팀원 불러오는 중</option>';
els.periodInput.value = state.period;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setResult(data) {
  els.resultBox.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

function setWorkspaceStatus(message) {
  els.workspaceStatus.textContent = message;
}

function syncAdminPanelNav() {
  document.body.dataset.adminPanel = state.adminPanel;
  els.mobileWorkflowNav?.querySelectorAll('[data-admin-panel]').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-admin-panel') === state.adminPanel);
  });
}

function getCurrentTeam() {
  return state.teams.find((team) => team.slug === state.teamSlug) || null;
}

function getPeriodParts() {
  const [year, month] = state.period.split('-').map(Number);
  return { year, month };
}

function getLockKey(memberId, date) {
  return `${memberId}:${date}`;
}

function getMemberName(memberId) {
  const member = state.context?.members?.find((item) => item.id === memberId);
  return member ? member.name : `#${memberId}`;
}

function formatDateLabel(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}.${date.getUTCDate()}(${WEEKDAY_LABELS[date.getUTCDay()]})`;
}

function formatMetric(label, value, note) {
  return `
    <div class="metric-chip">
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
      <span>${escapeHtml(note)}</span>
    </div>
  `;
}

function renderStageDecision() {
  const validation = getDatasetValidation();
  const hasPublished = Boolean(state.schedule?.published);
  const hasCandidate = Boolean(state.schedule?.candidates?.length);
  let headline = '먼저 데이터셋 상태를 확인하세요.';
  let detail = '휴가, 교육, 공용 이벤트와 검증 경고를 정리한 뒤 초안을 생성하는 게 가장 빠릅니다.';

  if (!hasCandidate) {
    headline = '이제 AI 초안을 생성할 차례입니다.';
    detail = '현재 후보안이 없어서 비교할 수 없습니다. 데이터셋 상태를 확인한 뒤 초안을 만드세요.';
  } else if (validation.summary.blocking) {
    headline = '배포 전에 검증 경고를 먼저 풀어야 합니다.';
    detail = `현재 blocking 경고가 있어 배포보다 검토가 우선입니다. 에러 ${validation.summary.errors}건, 경고 ${validation.summary.warnings}건을 확인하세요.`;
  } else if (!hasPublished) {
    headline = '후보안 비교와 마지막 점검만 남았습니다.';
    detail = '후보안, 고정 큐, 이벤트, 수당 렌즈를 확인한 뒤 배포하면 됩니다.';
  } else {
    headline = '배포본이 존재합니다. 변경 이유를 분명히 남기세요.';
    detail = '추가 수정이 필요하면 published와 candidate를 비교하고, 변경 사유를 로그와 핀 큐에 남기세요.';
  }

  els.stageDecision.innerHTML = `
    <strong>${escapeHtml(headline)}</strong>
    <span>${escapeHtml(detail)}</span>
  `;
}

function renderReviewLane() {
  const validation = getDatasetValidation();
  const hasCandidate = Boolean(state.schedule?.candidates?.length);
  const published = Boolean(state.schedule?.published);
  const candidate = resolveCurrentCandidate();
  const violations = resolveCurrentViolations().length;
  const steps = [
    {
      title: '1. 데이터셋',
      value: validation.summary.blocking ? '정리 필요' : '준비 완료',
      note: `에러 ${validation.summary.errors} · 경고 ${validation.summary.warnings}`,
      tone: validation.summary.blocking ? 'blocked' : 'ready',
    },
    {
      title: '2. 후보안',
      value: hasCandidate ? `${state.schedule.candidates.length}개 생성` : '초안 없음',
      note: candidate ? `${CANDIDATE_LABELS[candidate.candidate_key] || candidate.candidate_key} 검토 중` : 'AI 초안을 먼저 생성하세요.',
      tone: hasCandidate ? 'ready' : 'watch',
    },
    {
      title: '3. 검토',
      value: `${violations}건 위반`,
      note: `${state.pendingLocks.size}개 핀 대기 · ${getAllEvents().length}개 이벤트`,
      tone: violations > 0 ? 'watch' : 'ready',
    },
    {
      title: '4. 배포',
      value: published ? '배포본 존재' : '배포 전',
      note: validation.summary.blocking ? '검증 후 배포 버튼이 열립니다.' : '지금 배포 판단이 가능합니다.',
      tone: validation.summary.blocking ? 'blocked' : 'ready',
    },
  ];

  els.reviewLane.innerHTML = steps.map((step) => `
    <article class="review-step ${escapeHtml(step.tone)}">
      <strong>${escapeHtml(step.title)}</strong>
      <span>${escapeHtml(step.value)}</span>
      <span>${escapeHtml(step.note)}</span>
    </article>
  `).join('');
}

async function getAccessToken() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.access_token || null;
}

async function apiJson(path, options = {}, requireAuth = false, allow404 = false) {
  const headers = { ...(options.headers || {}) };
  if (requireAuth) {
    const token = await getAccessToken();
    if (!token) throw new Error('로그인이 필요합니다.');
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (allow404 && response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.detail || `요청 실패 (${response.status})`);
  return data;
}

async function updateAuthState() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  state.session = session || null;
  const loggedIn = Boolean(session?.access_token);
  if (!supabaseSdkReady) {
    els.authStatus.textContent = '로그인 SDK 지연';
    els.loginBtn.textContent = 'SDK 재시도';
    els.loginBtn.disabled = false;
    els.claimBtn.disabled = true;
    return;
  }
  els.authStatus.textContent = loggedIn ? `${session.user.email || '로그인됨'}` : '로그인 필요';
  els.loginBtn.textContent = loggedIn ? '로그인 완료' : '구글 로그인';
  els.loginBtn.disabled = loggedIn;
  els.claimBtn.disabled = !loggedIn;
  els.generateBtn.disabled = !loggedIn;
  els.repairBtn.disabled = !loggedIn;
  els.publishBtn.disabled = !loggedIn;
  if (els.eventSaveBtn) {
    els.eventSaveBtn.disabled = !loggedIn;
  }
}

function renderTeamOptions() {
  if (!state.teamSlug && state.teams.length > 0) {
    state.teamSlug = state.teams[0].slug;
  }
  els.teamSelect.innerHTML = state.teams.map((team) => (
    `<option value="${escapeHtml(team.slug)}">${escapeHtml(team.name)} · ${escapeHtml(team.current_status || 'new')}</option>`
  )).join('');
  els.teamSelect.value = state.teamSlug;

  const currentTeam = getCurrentTeam();
  const defaultPeriod = currentTeam?.metadata?.defaultPeriod;
  if (!state.periodTouched && typeof defaultPeriod === 'string' && defaultPeriod) {
    state.period = defaultPeriod;
    els.periodInput.value = state.period;
  }
}

function renderMemberOptions() {
  const members = state.context?.members || [];
  if (!state.previewMemberId && members.length > 0) state.previewMemberId = String(members[0].id);
  if (members.length > 0 && !members.some((member) => String(member.id) === state.previewMemberId)) {
    state.previewMemberId = String(members[0].id);
  }
  els.memberSelect.innerHTML = members.map((member) => (
    `<option value="${member.id}">${escapeHtml(member.name)} · ${escapeHtml(member.roleLabel || 'RN')}</option>`
  )).join('');
  els.memberSelect.value = state.previewMemberId;
  if (els.eventMemberSelect) {
    els.eventMemberSelect.innerHTML = [
      '<option value="">팀 전체</option>',
      ...members.map((member) => `<option value="${member.id}">${escapeHtml(member.name)} · ${escapeHtml(member.roleLabel || 'RN')}</option>`),
    ].join('');
  }
  els.rosterCount.textContent = `${members.length}명`;
}

function getRegulation() {
  return state.regulation || null;
}

function getRegulationQuickFacts() {
  return getRegulation()?.ui_quick_facts || [];
}

function getDatasetValidation() {
  return state.context?.datasetValidation || state.context?.validation || { summary: { total: 0, errors: 0, warnings: 0, info: 0, blocking: false }, items: [] };
}

function getDatasetScenarioReport() {
  return state.context?.datasetScenarioReport || state.context?.scenarioReport || null;
}

function mergeScenarioReports() {
  const reports = [state.regulationScenarioReport, getDatasetScenarioReport()].filter(Boolean);
  if (!reports.length) return null;
  const items = reports.flatMap((report) => report.items || []);
  return {
    total: items.length,
    passed: items.filter((item) => item.passed).length,
    failed: items.filter((item) => !item.passed).length,
    items,
  };
}

function getAllEvents() {
  return [
    ...(state.context?.memberEvents || []),
    ...(state.context?.wardEvents || []),
  ];
}

function findEventsForCell(memberId, date) {
  const memberEvents = (state.context?.memberEvents || []).filter((event) => event.memberId === memberId && (event.dates || []).includes(date));
  const teamEvents = (state.context?.wardEvents || []).filter((event) => (event.dates || []).includes(date));
  return { memberEvents, teamEvents };
}

function parseCoverageDeltaInput(value) {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    throw new Error('coverage_delta는 JSON 형식이어야 합니다. 예: {"D":1}');
  }
}

function getVisibleMembers() {
  const members = state.context?.members || [];
  const alerts = buildBoardAlerts();
  const leaveSet = new Set((state.context?.approvedLeaves || []).map((leave) => leave.memberId));
  const query = state.rosterQuery.trim().toLowerCase();

  return members.filter((member) => {
    if (query) {
      const haystack = [
        member.name,
        member.roleLabel || '',
        ...(member.skillTags || []),
      ].join(' ').toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (state.rosterFilter === 'attention') {
      return alerts.attentionMemberIds.has(member.id);
    }
    if (state.rosterFilter === 'leave') {
      return leaveSet.has(member.id);
    }
    if (state.rosterFilter === 'new-grad') {
      return (member.skillTags || []).includes('new-grad');
    }
    return true;
  });
}

function resolveCurrentCandidate() {
  if (!state.schedule?.candidates?.length) return null;
  return state.schedule.candidates.find((candidate) => candidate.id === state.activeCandidateId) || state.schedule.candidates[0];
}

function resolveCurrentAssignments() {
  if (state.activeView === 'published' && state.schedule?.published?.assignments_snapshot) {
    return state.schedule.published.assignments_snapshot;
  }
  return resolveCurrentCandidate()?.assignments_snapshot || [];
}

function resolveCurrentViolations() {
  if (state.activeView !== 'candidate') return [];
  return resolveCurrentCandidate()?.violations_snapshot || [];
}

function buildAssignmentMap() {
  const map = new Map();
  resolveCurrentAssignments().forEach((assignment) => {
    map.set(getLockKey(assignment.memberId, assignment.date), assignment.shiftCode);
  });
  return map;
}

function buildExistingLockMap() {
  const map = new Map();
  (state.context?.locks || []).forEach((lock) => {
    map.set(getLockKey(lock.memberId, lock.date), lock);
  });
  return map;
}

function buildMergedLocks() {
  const merged = new Map();
  (state.context?.locks || []).forEach((lock) => merged.set(getLockKey(lock.memberId, lock.date), { ...lock }));
  Array.from(state.pendingLocks.values()).forEach((lock) => merged.set(getLockKey(lock.memberId, lock.date), { ...lock }));
  return merged;
}

function deriveMemberStats(assignments) {
  const stats = new Map();
  (state.context?.members || []).forEach((member) => {
    stats.set(member.id, { D: 0, E: 0, N: 0, LEAVE: 0 });
  });
  assignments.forEach((assignment) => {
    const record = stats.get(assignment.memberId);
    if (!record) return;
    if (record[assignment.shiftCode] != null) {
      record[assignment.shiftCode] += 1;
    }
  });
  return stats;
}

function deriveCoverage(assignments) {
  const counts = new Map();
  assignments.forEach((assignment) => {
    if (!ACTIVE_SHIFT_CODES.includes(assignment.shiftCode)) return;
    const key = getLockKey(assignment.shiftCode, assignment.date);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function renderMetrics() {
  const assignments = resolveCurrentAssignments();
  const candidate = resolveCurrentCandidate();
  const publishedVersion = state.schedule?.published?.version_number ? `v${state.schedule.published.version_number}` : 'draft';
  const viewLabel = state.activeView === 'published'
    ? `Published ${publishedVersion}`
    : `${CANDIDATE_LABELS[candidate?.candidate_key] || 'Candidate'}`;

  els.metricsGrid.innerHTML = [
    formatMetric('현재 보기', viewLabel, state.period),
    formatMetric('팀원', `${state.context?.members?.length || 0}명`, '월간 3교대'),
    formatMetric('요청', `${state.context?.preferredOffRequests?.length || 0}건`, '희망 오프'),
    formatMetric('휴가', `${state.context?.approvedLeaves?.length || 0}일`, '승인 휴가'),
    formatMetric('고정', `${(state.context?.locks?.length || 0) + state.pendingLocks.size}건`, '현재 + 대기'),
    formatMetric('점수', `${candidate?.score?.total ?? '-'}`, '선택 후보 기준'),
  ].join('');
}

function renderDatasetPulse() {
  const validation = getDatasetValidation();
  const memberEvents = state.context?.memberEvents || [];
  const wardEvents = state.context?.wardEvents || [];
  const educationCount = memberEvents.filter((event) => ['education', 'orientation', 'conference'].includes(event.eventType)).length;
  const items = [
    formatMetric('팀원', `${state.context?.members?.length || 0}명`, '파일럿 인원'),
    formatMetric('승인 휴가', `${state.context?.approvedLeaves?.length || 0}일`, 'leave_records 원본'),
    formatMetric('교육', `${educationCount}건`, '개인 이벤트셋'),
    formatMetric('공용 이벤트', `${wardEvents.length}건`, '팀 회의 · 회식 · ward_event'),
    formatMetric('락', `${state.context?.locks?.length || 0}건`, 'assignment_locks + fixed_shift'),
    formatMetric('검증', `${validation.summary.errors}/${validation.summary.warnings}`, validation.summary.blocking ? '배포 전 확인 필요' : '즉시 검토 가능'),
  ];
  els.datasetPulse.innerHTML = items.join('');
  if (els.datasetBlockingBadge) {
    els.datasetBlockingBadge.textContent = validation.summary.blocking ? 'BLOCK' : 'READY';
  }
}

function getMemberAlertTags(member, stats, alerts) {
  const tags = [];
  const regulation = getRegulation();
  const ageCutoff = Number(regulation?.working_hours_and_shift_rules?.shift_worker_rules?.age_based_night_exclusion?.age || 40);
  if (alerts.attentionMemberIds.has(member.id)) {
    tags.push('주의');
  }
  if (member.age != null && member.age >= ageCutoff && stats.N > 0) {
    tags.push('40+ 야간');
  }
  if (stats.N >= Number(state.context?.rules?.maxNightShiftsPerMonth || 6)) {
    tags.push(`N ${stats.N}`);
  }
  if ((member.skillTags || []).includes('new-grad')) {
    tags.push('신규');
  }
  return tags.slice(0, 3);
}

function renderRoster() {
  const assignments = resolveCurrentAssignments();
  const memberStats = deriveMemberStats(assignments);
  const alerts = buildBoardAlerts();
  const members = getVisibleMembers();
  els.rosterCount.textContent = `${members.length}명`;
  if (members.length === 0) {
    els.rosterList.innerHTML = '<div class="empty-copy">조건에 맞는 팀원이 없습니다.</div>';
    return;
  }
  els.rosterList.innerHTML = members.map((member) => {
    const stats = memberStats.get(member.id) || { D: 0, E: 0, N: 0, LEAVE: 0 };
    const tags = getMemberAlertTags(member, stats, alerts);
    return `
      <div class="roster-row ${alerts.attentionMemberIds.has(member.id) ? 'attention' : ''}">
        <div class="row-title">
          <strong>${escapeHtml(member.name)}</strong>
          <span class="badge-row">${tags.map((tag) => `<em class="mini-badge">${escapeHtml(tag)}</em>`).join('')}</span>
        </div>
        <span>${escapeHtml(member.roleLabel || 'RN')} · ${(member.skillTags || []).map((tag) => escapeHtml(tag)).join(', ')}</span>
        <span>D ${stats.D} · E ${stats.E} · N ${stats.N} · Leave ${stats.LEAVE}</span>
      </div>
    `;
  }).join('');
}

function renderCandidateRail() {
  const published = state.schedule?.published;
  const items = [];
  if (published) {
    items.push({
      key: 'published',
      label: `Published v${published.version_number}`,
      active: state.activeView === 'published',
      meta: [
        ['상태', '배포본'],
        ['변경', `${published.diff_summary?.totalChangedAssignments ?? 0}`],
      ],
      tone: 'published',
    });
  }
  (state.schedule?.candidates || []).forEach((candidate) => {
    items.push({
      key: `candidate-${candidate.id}`,
      candidateId: candidate.id,
      label: CANDIDATE_LABELS[candidate.candidate_key] || candidate.candidate_key,
      active: state.activeView === 'candidate' && state.activeCandidateId === candidate.id,
      meta: [
        ['점수', `${candidate.score?.total ?? '-'}`],
        ['Night', `${candidate.score?.night_cap_excess ?? 0}`],
        ['Requests', `${candidate.score?.request_violations ?? 0}`],
        ['Changes', `${candidate.score?.continuity_changes ?? 0}`],
      ],
      tone: candidate.status === 'selected' ? 'active' : '',
    });
  });

  els.candidateRail.innerHTML = items.map((item) => `
    <article class="candidate-card ${item.active ? 'active' : ''} ${item.tone === 'published' ? 'published' : ''}" data-rail-key="${escapeHtml(item.key)}">
      <header>
        <h3>${escapeHtml(item.label)}</h3>
        <span>${item.active ? '선택됨' : '전환'}</span>
      </header>
      <div class="candidate-meta">
        ${item.meta.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
      </div>
    </article>
  `).join('');

  els.candidateRail.querySelectorAll('[data-rail-key]').forEach((node) => {
    node.addEventListener('click', () => {
      const key = node.getAttribute('data-rail-key');
      if (key === 'published') {
        state.activeView = 'published';
      } else {
        state.activeView = 'candidate';
        state.activeCandidateId = Number(key.replace('candidate-', ''));
      }
      renderAll();
    });
  });
}

function buildBoardAlerts() {
  const empty = {
    underfilledCells: 0,
    overfilledCells: 0,
    violationCount: resolveCurrentViolations().length,
    underfilledDates: new Set(),
    attentionMemberIds: new Set(),
    ageNightMembers: [],
    recoveryDueMembers: [],
    highNightMembers: [],
  };
  if (!state.context?.coverage?.length || !state.context?.members?.length) {
    return empty;
  }

  const regulation = getRegulation();
  const assignments = resolveCurrentAssignments();
  const coverageCounts = deriveCoverage(assignments);
  const memberStats = deriveMemberStats(assignments);
  const maxNight = Number(state.context?.rules?.maxNightShiftsPerMonth
    || regulation?.working_hours_and_shift_rules?.shift_worker_rules?.max_night_shifts_per_month
    || 6);
  const recoveryTrigger = Number(regulation?.working_hours_and_shift_rules?.shift_worker_rules?.recovery_day?.monthly_over_7_days?.trigger || 7);
  const ageCutoff = Number(regulation?.working_hours_and_shift_rules?.shift_worker_rules?.age_based_night_exclusion?.age || 40);

  state.context.coverage.forEach((day) => {
    ACTIVE_SHIFT_CODES.forEach((shiftCode) => {
      const assigned = coverageCounts.get(getLockKey(shiftCode, day.date)) || 0;
      const required = Number(day.requirements?.[shiftCode] || 0);
      if (assigned < required) {
        empty.underfilledCells += 1;
        empty.underfilledDates.add(day.date);
      }
      if (assigned > required) {
        empty.overfilledCells += 1;
      }
    });
  });

  resolveCurrentViolations().forEach((violation) => {
    if (violation.memberId != null) {
      empty.attentionMemberIds.add(Number(violation.memberId));
    }
  });

  (state.context.members || []).forEach((member) => {
    const stats = memberStats.get(member.id) || { D: 0, E: 0, N: 0, LEAVE: 0 };
    if (stats.N > maxNight) {
      empty.highNightMembers.push({ memberId: member.id, name: member.name, nights: stats.N });
      empty.attentionMemberIds.add(member.id);
    }
    if (stats.N >= recoveryTrigger) {
      empty.recoveryDueMembers.push({ memberId: member.id, name: member.name, nights: stats.N });
      empty.attentionMemberIds.add(member.id);
    }
    if (member.age != null && member.age >= ageCutoff && stats.N > 0) {
      empty.ageNightMembers.push({ memberId: member.id, name: member.name, nights: stats.N, age: member.age });
      empty.attentionMemberIds.add(member.id);
    }
  });

  return empty;
}

function renderOpsPulse() {
  const alerts = buildBoardAlerts();
  const scenario = state.scenarioReport;
  const validation = getDatasetValidation();
  const items = [
    ['충원 경고', `${alerts.underfilledCells}칸`, alerts.underfilledDates.size ? `${alerts.underfilledDates.size}일 hotspot` : '부족 없음'],
    ['후보 위반', `${alerts.violationCount}건`, state.activeView === 'published' ? '배포본 보기' : '선택 후보 기준'],
    ['야간 리스크', `${alerts.highNightMembers.length}명`, alerts.ageNightMembers.length ? `40+ 야간 ${alerts.ageNightMembers.length}명` : '연령 리스크 없음'],
    ['리커버리', `${alerts.recoveryDueMembers.length}명`, alerts.recoveryDueMembers.length ? '월 7회 이상 야간' : '추가 발생 없음'],
    ['데이터셋', `${validation.summary.errors}E / ${validation.summary.warnings}W`, validation.summary.blocking ? '배포 CTA 경고 상태' : '검증 안정'],
    ['시나리오', `${scenario?.passed ?? 0}/${scenario?.total ?? 0}`, scenario?.failed ? `${scenario.failed}건 재확인 필요` : '더미 검증 통과'],
  ];

  els.opsPulse.innerHTML = items.map(([label, value, note]) => `
    <article class="pulse-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </article>
  `).join('');
}

function renderEventTimeline() {
  const events = getAllEvents()
    .slice()
    .sort((left, right) => `${left.startDate}-${left.title}`.localeCompare(`${right.startDate}-${right.title}`));
  if (!events.length) {
    els.eventTimeline.textContent = '이번 기간에 등록된 교육, 회의, 회식, 병동 이벤트가 없습니다.';
    return;
  }
  els.eventTimeline.innerHTML = events.slice(0, 12).map((event) => `
    <article class="timeline-card ${escapeHtml(event.scope)} ${escapeHtml(event.eventType)}">
      <div class="timeline-top">
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(event.scope === 'member' ? getMemberName(event.memberId) : 'TEAM')}</span>
      </div>
      <div class="timeline-meta">
        <span>${escapeHtml(`${event.startDate}${event.startDate !== event.endDate ? ` ~ ${event.endDate}` : ''}`)}</span>
        <span>${escapeHtml(event.eventType)}</span>
        ${event.blocksWork ? '<em class="mini-badge">blocks_work</em>' : ''}
        ${event.preferredShiftCode ? `<em class="mini-badge">${escapeHtml(event.preferredShiftCode)}</em>` : ''}
      </div>
    </article>
  `).join('');
}

function renderSelectedInspector() {
  if (!els.selectedInspector) return;
  if (!state.selectedCell) {
    els.selectedInspector.textContent = '선택한 간호사의 휴가 이력, 교육 일정, 최근 야간, 규정 보호를 여기서 확인합니다.';
    return;
  }
  const member = (state.context?.members || []).find((item) => item.id === state.selectedCell.memberId);
  const leaveLedger = (state.context?.leaveLedger || []).find((item) => item.memberId === state.selectedCell.memberId);
  const { memberEvents, teamEvents } = findEventsForCell(state.selectedCell.memberId, state.selectedCell.date);
  const rows = [
    ['선택일', formatDateLabel(state.selectedCell.date)],
    ['휴가 누적', `${leaveLedger?.annualLeaveDays ?? 0}일`],
    ['교육 누적', `${leaveLedger?.educationDays ?? 0}일`],
    ['최근 야간', `${leaveLedger?.recentNightCount ?? 0}회`],
    ['최근 주말', `${leaveLedger?.recentWeekendCount ?? 0}회`],
    ['개인 이벤트', memberEvents.length ? memberEvents.map((event) => event.title).join(', ') : '없음'],
    ['팀 이벤트', teamEvents.length ? teamEvents.map((event) => event.title).join(', ') : '없음'],
  ];
  if ((member?.skillTags || []).includes('new-grad')) {
    rows.push(['보호 규칙', '신규간호사 교육 주간 · 야간 후보 후순위'])
  }
  els.selectedInspector.innerHTML = rows.map(([label, value]) => `
    <div class="rule-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
    </div>
  `).join('');
}

function renderValidationQueue() {
  const validation = getDatasetValidation();
  if (els.validationCount) {
    els.validationCount.textContent = String(validation.summary.total || 0);
  }
  if (!validation.items?.length) {
    els.validationQueue.textContent = '현재 데이터셋 검증 경고가 없습니다.';
    return;
  }
  els.validationQueue.innerHTML = validation.items.slice(0, 10).map((item) => `
    <div class="violation-row ${escapeHtml(item.severity)}">
      <strong>${escapeHtml(item.title || item.code)}</strong>
      <span>${escapeHtml(item.message || item.code)}</span>
      <span>${escapeHtml([item.date, item.memberId ? getMemberName(item.memberId) : null].filter(Boolean).join(' · '))}</span>
    </div>
  `).join('');
}

function renderEventTable() {
  if (!els.eventTable || !els.eventCount) return;
  const events = getAllEvents()
    .slice()
    .sort((left, right) => `${left.startDate}-${left.title}`.localeCompare(`${right.startDate}-${right.title}`));
  els.eventCount.textContent = String(events.length);
  if (!events.length) {
    els.eventTable.textContent = '등록된 이벤트가 없습니다.';
    return;
  }
  els.eventTable.innerHTML = events.map((event) => `
    <div class="pin-row event-row">
      <div class="pin-copy">
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(`${event.scope === 'member' ? getMemberName(event.memberId) : 'TEAM'} · ${event.eventType}`)}</span>
        <span>${escapeHtml(`${event.startDate}${event.startDate !== event.endDate ? ` ~ ${event.endDate}` : ''}`)}</span>
      </div>
      <div class="event-row-actions">
        <button class="btn btn-secondary mini-action" type="button" data-edit-event-id="${event.id}">수정</button>
        <button class="btn btn-secondary mini-action" type="button" data-delete-event-id="${event.id}">삭제</button>
      </div>
    </div>
  `).join('');
  els.eventTable.querySelectorAll('[data-edit-event-id]').forEach((node) => {
    node.addEventListener('click', () => populateEventForm(Number(node.getAttribute('data-edit-event-id'))));
  });
  els.eventTable.querySelectorAll('[data-delete-event-id]').forEach((node) => {
    node.addEventListener('click', () => deleteEventRow(Number(node.getAttribute('data-delete-event-id'))));
  });
}

function renderSelectedCellCard() {
  if (!state.selectedCell) {
    els.selectedCellCard.textContent = '셀을 선택하면 여기서 고정 shift를 지정합니다.';
    return;
  }
  const assignmentMap = buildAssignmentMap();
  const pending = state.pendingLocks.get(getLockKey(state.selectedCell.memberId, state.selectedCell.date));
  const currentShift = pending?.shiftCode || assignmentMap.get(getLockKey(state.selectedCell.memberId, state.selectedCell.date)) || '-';
  els.selectedCellCard.innerHTML = `
    <strong>${escapeHtml(state.selectedCell.memberName)}</strong><br>
    ${escapeHtml(formatDateLabel(state.selectedCell.date))}<br>
    현재 배정 ${escapeHtml(currentShift)}
  `;
}

function renderShiftPicker() {
  const shiftTypes = state.context?.shiftTypes || [];
  els.shiftPicker.innerHTML = shiftTypes.map((shift) => `
    <button
      type="button"
      class="shift-option ${state.selectedShiftCode === shift.code ? 'active' : ''}"
      data-shift-code="${escapeHtml(shift.code)}"
    >${escapeHtml(shift.code)}</button>
  `).join('');
  els.shiftPicker.querySelectorAll('[data-shift-code]').forEach((node) => {
    node.addEventListener('click', () => {
      state.selectedShiftCode = node.getAttribute('data-shift-code') || '';
      renderShiftPicker();
    });
  });
}

function renderPendingLocks() {
  els.pendingCount.textContent = String(state.pendingLocks.size);
  if (state.pendingLocks.size === 0) {
    els.pendingLocksList.textContent = '아직 대기 중인 고정이 없습니다.';
    return;
  }
  els.pendingLocksList.innerHTML = Array.from(state.pendingLocks.values()).map((lock) => `
    <div class="pin-row">
      <div class="pin-copy">
        <strong>${escapeHtml(getMemberName(lock.memberId))} · ${escapeHtml(lock.shiftCode)}</strong>
        <span>${escapeHtml(formatDateLabel(lock.date))}</span>
        <span>${escapeHtml(lock.reason || '사유 없음')}</span>
      </div>
      <button class="pin-remove" type="button" data-lock-key="${escapeHtml(getLockKey(lock.memberId, lock.date))}">×</button>
    </div>
  `).join('');
  els.pendingLocksList.querySelectorAll('[data-lock-key]').forEach((node) => {
    node.addEventListener('click', () => {
      state.pendingLocks.delete(node.getAttribute('data-lock-key'));
      renderAll();
    });
  });
}

function renderPolicySnapshot() {
  const regulation = getRegulation();
  els.regulationVersion.textContent = regulation?._meta?.version || '-';
  if (!regulation) {
    els.policySnapshot.textContent = '규정 데이터를 불러오지 못했습니다.';
    return;
  }
  const facts = getRegulationQuickFacts().slice(0, 6);
  els.policySnapshot.innerHTML = [
    ...facts.map((fact) => `
      <div class="rule-row">
        <strong>${escapeHtml(fact.label || '')}</strong>
        <span>${escapeHtml(`${fact.value || ''} · ${fact.ref || ''}`)}</span>
      </div>
    `),
    `
      <div class="rule-row">
        <strong>원문</strong>
        <span><a class="inline-link" href="../content/policies/2026/2026_조합원_수첩_최종파일.pdf" target="_blank" rel="noopener">PDF</a> · <a class="inline-link" href="../content/policies/2026/nurse_regulation.md" target="_blank" rel="noopener">MD</a></span>
      </div>
    `,
  ].join('');
}

function renderAllowanceLens() {
  const regulation = getRegulation();
  if (!regulation) {
    els.allowanceLens.textContent = '규정 데이터를 불러온 뒤 계산합니다.';
    return;
  }
  if (!state.selectedCell) {
    els.allowanceLens.innerHTML = `
      <div class="rule-row">
        <strong>야간근무가산금</strong>
        <span>${escapeHtml(`${regulation.working_hours_and_shift_rules?.shift_worker_rules?.night_shift_bonus?.toLocaleString() || '-'}원 / 회`)}</span>
      </div>
      <div class="rule-row">
        <strong>온콜 출동</strong>
        <span>${escapeHtml(`2시간 인정 + ${(regulation.working_hours_and_shift_rules?.overtime_and_on_call?.on_call?.dispatch_transport || 0).toLocaleString()}원`)}</span>
      </div>
      <div class="rule-row">
        <strong>리프레시지원비</strong>
        <span>${escapeHtml(`${(regulation.wage_structure_and_allowances?.fixed_allowances?.refresh_support_yearly || 0).toLocaleString()}원 / 연`)}</span>
      </div>
    `;
    return;
  }

  const assignmentMap = buildAssignmentMap();
  const member = (state.context?.members || []).find((item) => item.id === state.selectedCell.memberId);
  const memberStats = deriveMemberStats(resolveCurrentAssignments()).get(state.selectedCell.memberId) || { D: 0, E: 0, N: 0, LEAVE: 0 };
  const currentCode = state.pendingLocks.get(getLockKey(state.selectedCell.memberId, state.selectedCell.date))?.shiftCode
    || assignmentMap.get(getLockKey(state.selectedCell.memberId, state.selectedCell.date))
    || '-';
  const rows = [];
  const ageCutoff = Number(regulation.working_hours_and_shift_rules?.shift_worker_rules?.age_based_night_exclusion?.age || 40);
  const recoveryTrigger = Number(regulation.working_hours_and_shift_rules?.shift_worker_rules?.recovery_day?.monthly_over_7_days?.trigger || 7);

  if (currentCode === 'N') {
    rows.push(['야간가산금', `${(regulation.working_hours_and_shift_rules?.shift_worker_rules?.night_shift_bonus || 0).toLocaleString()}원`]);
    if (member?.age != null && member.age >= ageCutoff) {
      rows.push(['주의', `${ageCutoff}세 이상 야간 제외 원칙`]);
    }
  }
  if (currentCode === 'E') {
    rows.push(['심야 택시', '연장 후 자정 이후 퇴근 시 제공']);
  }
  if (memberStats.N >= recoveryTrigger) {
    rows.push(['리커버리데이', `월 ${memberStats.N}회 야간으로 1일 검토`]);
  }
  if ((member?.skillTags || []).includes('preceptor')) {
    rows.push(['프리셉터 수당', `${(regulation.welfare_and_training?.new_hire_training?.preceptor_allowance || 0).toLocaleString()}원`]);
  }
  if ((member?.skillTags || []).includes('new-grad')) {
    rows.push(['신규간호사 보호', '교육 8주, 초반 4주 초임 80%']);
  }
  const leave = (state.context?.approvedLeaves || []).find((item) => item.memberId === state.selectedCell.memberId && item.date === state.selectedCell.date);
  if (leave) {
    rows.push(['승인 휴가', leave.leaveType]);
  }
  if (rows.length === 0) {
    rows.push(['운영 메모', '이 셀은 즉시 가산/보호 항목이 크지 않습니다.']);
  }

  els.allowanceLens.innerHTML = rows.map(([label, value]) => `
    <div class="rule-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
    </div>
  `).join('');
}

function renderRuleSummary() {
  if (!state.context?.rules) {
    els.ruleSummary.textContent = '팀을 선택하면 규칙이 표시됩니다.';
    return;
  }
  const rules = state.context.rules;
  const regulation = getRegulation();
  const sampleCoverage = state.context.coverage?.find((day) => !day.isWeekend && !day.isHoliday)?.requirements || {};
  const rows = [
    ['최소 휴식', `${rules.minRestHours}시간`],
    ['야간 상한', `${rules.maxNightShiftsPerMonth}회`],
    ['금지 패턴', rules.forbiddenPatterns.map((pattern) => pattern.join('-')).join(', ')],
    ['40세 보호', `${regulation?.working_hours_and_shift_rules?.shift_worker_rules?.age_based_night_exclusion?.age || 40}세 이상 야간 제외 원칙`],
    ['리커버리', `${regulation?.working_hours_and_shift_rules?.shift_worker_rules?.recovery_day?.monthly_over_7_days?.trigger || 7}회 이상 시 1일`],
    ['기본 커버', Object.entries(sampleCoverage).map(([code, value]) => `${code} ${value}`).join(' / ')],
  ];
  els.ruleSummary.innerHTML = rows.map(([label, value]) => `
    <div class="rule-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
    </div>
  `).join('');
}

function renderViolationSummary() {
  const violations = resolveCurrentViolations();
  if (!violations.length) {
    els.violationSummary.textContent = state.activeView === 'published'
      ? '배포본을 보고 있습니다.'
      : '현재 후보 위반이 없습니다.';
    return;
  }
  els.violationSummary.innerHTML = violations.slice(0, 8).map((violation) => `
    <div class="violation-row">
      <strong>${escapeHtml(violation.rule_code || violation.ruleCode || 'rule')}</strong>
      <span>${escapeHtml(`${violation.message || ''}${violation.memberId ? ` · ${getMemberName(violation.memberId)}` : ''}`)}</span>
      <span>${escapeHtml(violation.work_date || violation.date || '')}</span>
    </div>
  `).join('');
}

function renderScenarioLab() {
  const scenario = state.scenarioReport;
  els.scenarioScore.textContent = scenario ? `${scenario.passed}/${scenario.total}` : '-';
  if (!scenario?.items?.length) {
    els.scenarioLab.textContent = '시나리오 리포트를 불러오지 못했습니다.';
    return;
  }
  els.scenarioLab.innerHTML = scenario.items.slice(0, 8).map((item) => `
    <div class="scenario-row ${item.passed ? 'pass' : 'fail'}">
      <div class="row-title">
        <strong>${escapeHtml(item.title || item.id)}</strong>
        <em class="mini-badge">${item.passed ? 'PASS' : 'FAIL'}</em>
      </div>
      <span>${escapeHtml(item.category || 'scenario')}</span>
      <span>${escapeHtml(item.passed ? '예상 규칙과 계산이 맞습니다.' : '기대값과 실제값을 다시 확인하세요.')}</span>
    </div>
  `).join('');
}

function renderBoard() {
  if (!state.context?.coverage?.length || !state.context?.members?.length) {
    els.scheduleViewport.textContent = '근무표를 불러올 수 없습니다.';
    return;
  }

  const visibleMembers = getVisibleMembers();
  if (!visibleMembers.length) {
    els.scheduleViewport.innerHTML = '<div class="empty-board">표시할 팀원이 없습니다. 필터를 조정해 주세요.</div>';
    return;
  }

  const assignments = resolveCurrentAssignments();
  const assignmentMap = buildAssignmentMap();
  const existingLocks = buildExistingLockMap();
  const coverageCounts = deriveCoverage(assignments);
  const memberStats = deriveMemberStats(assignments);
  const alerts = buildBoardAlerts();

  const headerCells = state.context.coverage.map((day) => {
    const classes = [
      'day-head',
      day.isWeekend ? 'weekend' : '',
      day.isHoliday ? 'holiday' : '',
      alerts.underfilledDates.has(day.date) ? 'hotspot' : '',
    ].filter(Boolean).join(' ');
    const date = new Date(`${day.date}T00:00:00Z`);
    return `
      <th class="${classes}">
        <strong>${date.getUTCDate()}</strong>
        <span>${WEEKDAY_LABELS[date.getUTCDay()]}</span>
      </th>
    `;
  }).join('');

  const coverageRows = ACTIVE_SHIFT_CODES.map((shiftCode) => {
    const rowCells = state.context.coverage.map((day) => {
      const assigned = coverageCounts.get(getLockKey(shiftCode, day.date)) || 0;
      const required = Number(day.requirements?.[shiftCode] || 0);
      const statusClass = assigned === required ? 'ok' : assigned > required ? 'over' : 'under';
      return `<td class="coverage-cell"><span class="coverage-pill ${statusClass}">${assigned}/${required}</span></td>`;
    }).join('');
    return `
      <tr>
        <th class="member-col sticky-col coverage-label">
          <div class="member-name">${shiftCode} coverage</div>
          <div class="member-meta">팀 전체 충원 현황</div>
        </th>
        ${rowCells}
      </tr>
    `;
  }).join('');

  const memberRows = visibleMembers.map((member) => {
    const stats = memberStats.get(member.id) || { D: 0, E: 0, N: 0, LEAVE: 0 };
    const cells = state.context.coverage.map((day) => {
      const key = getLockKey(member.id, day.date);
      const pendingLock = state.pendingLocks.get(key);
      const persistedLock = existingLocks.get(key);
      const code = pendingLock?.shiftCode || assignmentMap.get(key) || '-';
      const { memberEvents, teamEvents } = findEventsForCell(member.id, day.date);
      const isSelected = state.selectedCell && state.selectedCell.memberId === member.id && state.selectedCell.date === day.date;
      const cellClass = [
        'shift-button',
        `shift-${String(code).replace(/[^A-Za-z0-9_-]/g, '')}`,
        isSelected ? 'selected' : '',
        pendingLock ? 'pending' : '',
        !pendingLock && persistedLock ? 'locked' : '',
        memberEvents.length ? 'has-member-event' : '',
        teamEvents.length ? 'has-team-event' : '',
      ].filter(Boolean).join(' ');
      const eventBadges = [
        ...memberEvents.map((event) => `<span class="cell-flag member">${escapeHtml(event.eventType === 'education' || event.eventType === 'orientation' ? 'EDU' : event.eventType)}</span>`),
        ...teamEvents.map(() => '<span class="cell-flag team">TEAM</span>'),
      ].slice(0, 2).join('');
      return `
        <td class="shift-cell">
          <button
            type="button"
            class="${cellClass}"
            data-member-id="${member.id}"
            data-member-name="${escapeHtml(member.name)}"
            data-date="${day.date}"
          ><span class="cell-code">${escapeHtml(code)}</span>${eventBadges ? `<span class="cell-flags">${eventBadges}</span>` : ''}</button>
        </td>
      `;
    }).join('');

    return `
      <tr>
        <th class="member-col sticky-col">
          <div class="member-name">${escapeHtml(member.name)}</div>
          <div class="member-meta">
            ${escapeHtml(member.roleLabel || 'RN')} · D ${stats.D} / E ${stats.E} / N ${stats.N}
          </div>
        </th>
        ${cells}
      </tr>
    `;
  }).join('');

  els.scheduleViewport.innerHTML = `
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

  els.scheduleViewport.querySelectorAll('[data-member-id]').forEach((node) => {
    node.addEventListener('click', () => {
      state.selectedCell = {
        memberId: Number(node.getAttribute('data-member-id')),
        memberName: node.getAttribute('data-member-name') || '',
        date: node.getAttribute('data-date') || '',
      };
      const pendingLock = state.pendingLocks.get(getLockKey(state.selectedCell.memberId, state.selectedCell.date));
      state.selectedShiftCode = pendingLock?.shiftCode || '';
      renderAll();
    });
  });
}

function renderAll() {
  renderMemberOptions();
  renderDatasetPulse();
  renderMetrics();
  renderRoster();
  renderStageDecision();
  renderReviewLane();
  renderOpsPulse();
  renderEventTimeline();
  renderCandidateRail();
  renderSelectedCellCard();
  renderSelectedInspector();
  renderShiftPicker();
  renderPendingLocks();
  renderValidationQueue();
  renderEventTable();
  renderPolicySnapshot();
  renderAllowanceLens();
  renderRuleSummary();
  renderViolationSummary();
  renderScenarioLab();
  renderBoard();

  const currentTeam = getCurrentTeam();
  els.stageHeadline.textContent = `${currentTeam?.name || state.teamSlug} · ${state.period}`;
  els.publishedViewBtn.classList.toggle('active', state.activeView === 'published');
  els.candidateViewBtn.classList.toggle('active', state.activeView === 'candidate');
  const validation = getDatasetValidation();
  els.publishBtn.classList.toggle('btn-warning', validation.summary.blocking);
  els.publishBtn.textContent = validation.summary.blocking ? '검증 후 배포' : '배포';
  syncAdminPanelNav();
}

async function loadTeams() {
  const { year, month } = getPeriodParts();
  const data = await apiJson(`/teams?year=${year}&month=${month}`);
  state.teams = data.results || [];
  if (!state.teams.some((team) => team.slug === state.teamSlug) && state.teams.length > 0) {
    state.teamSlug = state.teams[0].slug;
  }
  renderTeamOptions();
}

async function loadRegulation() {
  const { year } = getPeriodParts();
  const data = await apiJson(`/data/nurse-regulation?year=${year}`, {}, false, true);
  state.regulation = data || null;
  state.regulationScenarioReport = data?.scenarioReport || null;
  state.scenarioReport = mergeScenarioReports();
}

async function loadWorkspace() {
  if (!state.teamSlug) return;
  const { year, month } = getPeriodParts();
  setWorkspaceStatus('불러오는 중');
  const [contextData, scheduleData, regulationData] = await Promise.all([
    apiJson(`/teams/${state.teamSlug}/dataset?year=${year}&month=${month}`),
    apiJson(`/teams/${state.teamSlug}/schedules/${state.period}`, {}, false, true),
    apiJson(`/data/nurse-regulation?year=${year}`, {}, false, true),
  ]);
  state.context = contextData.result;
  state.schedule = scheduleData ? scheduleData.result : null;
  state.regulation = regulationData || state.regulation;
  state.regulationScenarioReport = regulationData?.scenarioReport || state.regulationScenarioReport;
  state.scenarioReport = mergeScenarioReports();
  state.pendingLocks = new Map();
  state.selectedCell = null;
  state.selectedShiftCode = '';
  state.activeCandidateId = state.schedule?.period?.current_candidate_id || state.schedule?.candidates?.[0]?.id || null;
  state.activeView = state.schedule?.published ? 'published' : 'candidate';
  setWorkspaceStatus(`${getCurrentTeam()?.name || state.teamSlug}`);
  renderAll();
}

async function refreshWorkspace() {
  try {
    await loadTeams();
    await loadWorkspace();
  } catch (error) {
    setWorkspaceStatus('불러오기 실패');
    setResult(error instanceof Error ? error.message : String(error));
  }
}

async function claimDemoAccess() {
  const team = getCurrentTeam();
  if (!team) return;
  try {
    const emailPrefix = state.session?.user?.email ? state.session.user.email.split('@')[0] : 'pilot';
    const fullName = state.session?.user?.user_metadata?.full_name || state.session?.user?.user_metadata?.name || '파일럿 관리자';
    const data = await apiJson(`/teams/${team.slug}/claim-demo-access`, {
      method: 'POST',
      body: JSON.stringify({
        displayName: fullName,
        employeeCode: `DEMO-${emailPrefix}`.slice(0, 24),
        roleLabel: 'Pilot Head Nurse',
      }),
    }, true);
    setResult(data);
    await refreshWorkspace();
  } catch (error) {
    setResult(error instanceof Error ? error.message : String(error));
  }
}

async function generateSchedule() {
  const team = getCurrentTeam();
  if (!team) return;
  const { year, month } = getPeriodParts();
  try {
    setWorkspaceStatus('생성 중');
    const data = await apiJson(`/teams/${team.slug}/schedules/generate`, {
      method: 'POST',
      body: JSON.stringify({ year, month }),
    }, true);
    setResult(data);
    await refreshWorkspace();
  } catch (error) {
    setWorkspaceStatus('생성 실패');
    setResult(error instanceof Error ? error.message : String(error));
  }
}

async function repairSchedule() {
  const team = getCurrentTeam();
  if (!team || !state.context?.periodId) return;
  const locks = Array.from(buildMergedLocks().values());
  if (locks.length === 0) {
    setResult('고정할 칸을 먼저 추가해 주세요.');
    return;
  }
  try {
    setWorkspaceStatus('Repair Solve');
    const data = await apiJson(`/teams/${team.slug}/schedules/${state.context.periodId}/repair`, {
      method: 'POST',
      body: JSON.stringify({ locks }),
    }, true);
    state.pendingLocks = new Map();
    state.selectedShiftCode = '';
    setResult(data);
    await refreshWorkspace();
  } catch (error) {
    setWorkspaceStatus('Repair 실패');
    setResult(error instanceof Error ? error.message : String(error));
  }
}

async function publishSchedule() {
  const team = getCurrentTeam();
  if (!team || !state.context?.periodId) return;
  const candidateId = state.activeCandidateId || state.schedule?.period?.current_candidate_id;
  if (!candidateId) {
    setResult('배포할 후보를 선택해 주세요.');
    return;
  }
  try {
    setWorkspaceStatus('배포 중');
    const data = await apiJson(`/teams/${team.slug}/schedules/${state.context.periodId}/publish`, {
      method: 'POST',
      body: JSON.stringify({ candidateId }),
    }, true);
    setResult(data);
    await refreshWorkspace();
  } catch (error) {
    setWorkspaceStatus('배포 실패');
    setResult(error instanceof Error ? error.message : String(error));
  }
}

function resetEventForm() {
  if (!els.eventEditorForm) return;
  els.eventIdInput.value = '';
  els.eventScopeInput.value = 'member';
  els.eventMemberSelect.value = state.previewMemberId || '';
  els.eventTypeInput.value = 'education';
  els.eventTitleInput.value = '';
  els.eventStartInput.value = `${state.period}-01`;
  els.eventEndInput.value = `${state.period}-01`;
  els.eventAllDayInput.checked = true;
  els.eventBlocksWorkInput.checked = false;
  els.eventShiftInput.value = '';
  els.eventCoverageDeltaInput.value = '';
  els.eventNotesInput.value = '';
  els.eventMemberSelect.disabled = false;
}

function populateEventForm(eventId) {
  const event = getAllEvents().find((item) => item.id === eventId);
  if (!event) return;
  els.eventIdInput.value = String(event.id);
  els.eventScopeInput.value = event.scope;
  els.eventMemberSelect.value = event.memberId ? String(event.memberId) : '';
  els.eventTypeInput.value = event.eventType;
  els.eventTitleInput.value = event.title;
  els.eventStartInput.value = event.startDate;
  els.eventEndInput.value = event.endDate;
  els.eventAllDayInput.checked = Boolean(event.allDay);
  els.eventBlocksWorkInput.checked = Boolean(event.blocksWork);
  els.eventShiftInput.value = event.preferredShiftCode || '';
  els.eventCoverageDeltaInput.value = Object.keys(event.coverageDelta || {}).length
    ? JSON.stringify(event.coverageDelta)
    : '';
  els.eventNotesInput.value = event.notes || '';
  els.eventMemberSelect.disabled = event.scope === 'team';
}

async function saveEventForm(event) {
  event.preventDefault();
  const team = getCurrentTeam();
  if (!team) return;
  const { year, month } = getPeriodParts();
  try {
    const payload = {
      id: els.eventIdInput.value ? Number(els.eventIdInput.value) : undefined,
      year,
      month,
      scope: els.eventScopeInput.value,
      memberId: els.eventScopeInput.value === 'member' && els.eventMemberSelect.value
        ? Number(els.eventMemberSelect.value)
        : null,
      eventType: els.eventTypeInput.value,
      title: els.eventTitleInput.value.trim(),
      startDate: els.eventStartInput.value,
      endDate: els.eventEndInput.value,
      allDay: els.eventAllDayInput.checked,
      blocksWork: els.eventBlocksWorkInput.checked,
      preferredShiftCode: els.eventShiftInput.value.trim() || null,
      coverageDelta: parseCoverageDeltaInput(els.eventCoverageDeltaInput.value),
      notes: els.eventNotesInput.value.trim() || null,
      source: 'manual',
    };
    setWorkspaceStatus('이벤트 저장');
    const data = await apiJson(`/teams/${team.slug}/events/upsert`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true);
    setResult(data);
    resetEventForm();
    await refreshWorkspace();
  } catch (error) {
    setWorkspaceStatus('이벤트 저장 실패');
    setResult(error instanceof Error ? error.message : String(error));
  }
}

async function deleteEventRow(eventId) {
  const team = getCurrentTeam();
  if (!team || !eventId) return;
  if (!window.confirm('이 이벤트를 삭제할까요?')) return;
  try {
    setWorkspaceStatus('이벤트 삭제');
    const data = await apiJson(`/teams/${team.slug}/events/${eventId}`, {
      method: 'DELETE',
    }, true);
    setResult(data);
    resetEventForm();
    await refreshWorkspace();
  } catch (error) {
    setWorkspaceStatus('이벤트 삭제 실패');
    setResult(error instanceof Error ? error.message : String(error));
  }
}

function downloadMemberIcs() {
  const team = getCurrentTeam();
  if (!team || !state.previewMemberId) {
    setResult('팀원과 팀을 먼저 선택해 주세요.');
    return;
  }
  const link = document.createElement('a');
  link.href = `${API_BASE}/teams/${team.slug}/schedules/${state.period}/calendar.ics?memberId=${encodeURIComponent(state.previewMemberId)}`;
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function queueLock() {
  if (!state.selectedCell || !state.selectedShiftCode) {
    setResult('셀을 선택하고 shift를 지정해 주세요.');
    return;
  }
  const lock = {
    memberId: state.selectedCell.memberId,
    date: state.selectedCell.date,
    shiftCode: state.selectedShiftCode,
    reason: els.lockReasonInput.value.trim() || null,
  };
  state.pendingLocks.set(getLockKey(lock.memberId, lock.date), lock);
  els.lockReasonInput.value = '';
  renderAll();
}

els.loginBtn.addEventListener('click', async () => {
  try {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
        queryParams: { prompt: 'select_account' },
      },
    });
  } catch (error) {
    setResult(error instanceof Error ? error.message : String(error));
  }
});

els.teamSelect.addEventListener('change', async (event) => {
  state.teamSlug = event.target.value;
  await loadWorkspace();
});

els.periodInput.addEventListener('change', async (event) => {
  state.periodTouched = true;
  state.period = event.target.value;
  await refreshWorkspace();
});

els.memberSelect.addEventListener('change', (event) => {
  state.previewMemberId = event.target.value;
});

els.rosterSearchInput.addEventListener('input', (event) => {
  state.rosterQuery = event.target.value || '';
  renderAll();
});

els.rosterFilterChips.querySelectorAll('[data-roster-filter]').forEach((node) => {
  node.addEventListener('click', () => {
    state.rosterFilter = node.getAttribute('data-roster-filter') || 'all';
    els.rosterFilterChips.querySelectorAll('[data-roster-filter]').forEach((chip) => {
      chip.classList.toggle('active', chip === node);
    });
    renderAll();
  });
});

els.claimBtn.addEventListener('click', claimDemoAccess);
els.refreshWorkspaceBtn.addEventListener('click', refreshWorkspace);
els.generateBtn.addEventListener('click', generateSchedule);
els.repairBtn.addEventListener('click', repairSchedule);
els.publishBtn.addEventListener('click', publishSchedule);
els.downloadMemberIcsBtn.addEventListener('click', downloadMemberIcs);
els.queueLockBtn.addEventListener('click', queueLock);
els.clearSelectionBtn.addEventListener('click', () => {
  state.selectedCell = null;
  state.selectedShiftCode = '';
  els.lockReasonInput.value = '';
  renderAll();
});
if (els.eventEditorForm) {
  els.eventEditorForm.addEventListener('submit', saveEventForm);
  els.eventResetBtn.addEventListener('click', resetEventForm);
  els.eventScopeInput.addEventListener('change', () => {
    els.eventMemberSelect.disabled = els.eventScopeInput.value === 'team';
    if (els.eventScopeInput.value === 'team') {
      els.eventMemberSelect.value = '';
    }
  });
}

els.publishedViewBtn.addEventListener('click', () => {
  if (!state.schedule?.published) return;
  state.activeView = 'published';
  state.adminPanel = 'board';
  renderAll();
});

els.candidateViewBtn.addEventListener('click', () => {
  state.activeView = 'candidate';
  if (!state.activeCandidateId) state.activeCandidateId = state.schedule?.candidates?.[0]?.id || null;
  state.adminPanel = 'board';
  renderAll();
});

els.mobileWorkflowNav?.querySelectorAll('[data-admin-panel]').forEach((button) => {
  button.addEventListener('click', () => {
    state.adminPanel = button.getAttribute('data-admin-panel') || 'overview';
    syncAdminPanelNav();
  });
});

supabaseClient.auth.onAuthStateChange(() => {
  updateAuthState();
});

window.addEventListener('error', (event) => {
  setWorkspaceStatus('화면 오류');
  setResult(event.error?.message || event.message || '알 수 없는 화면 오류');
});

window.addEventListener('unhandledrejection', (event) => {
  setWorkspaceStatus('요청 실패');
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
  setResult(reason);
});

if (!supabaseSdkReady) {
  console.warn('Supabase SDK did not load. Nurse admin will continue in read-only mode.');
}

updateAuthState();
resetEventForm();
syncAdminPanelNav();
refreshWorkspace();
