// dashboard.html 단일 ESM entry (Phase 2-G)
import '@snuhmate/shared-utils';
import { escapeHtml } from '@snuhmate/shared-utils';

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

const state = {
  teams: [],
  teamSlug: '101',
  period: '2026-05',
  dataset: null,
  schedule: null,
  regulation: null,
  surface: 'overview',
};

const els = {
  teamTabs: document.getElementById('teamTabs'),
  summaryGrid: document.getElementById('summaryGrid'),
  healthGrid: document.getElementById('healthGrid'),
  ruleCoverage: document.getElementById('ruleCoverage'),
  memberMatrix: document.getElementById('memberMatrix'),
  validationList: document.getElementById('validationList'),
  scenarioList: document.getElementById('scenarioList'),
  coverageDeltaList: document.getElementById('coverageDeltaList'),
  surfaceNav: document.getElementById('surfaceNav'),
  decisionBanner: document.getElementById('decisionBanner'),
};

// escapeHtml은 shared-utils.js에서 window 전역으로 제공됨.

async function apiJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `요청 실패 (${response.status})`);
  return data;
}

function getPeriodParts() {
  const [year, month] = state.period.split('-').map(Number);
  return { year, month };
}

function mergeScenarioReport() {
  const reports = [state.regulation?.scenarioReport, state.dataset?.datasetScenarioReport || state.dataset?.scenarioReport]
    .filter(Boolean);
  const items = reports.flatMap((report) => report.items || []);
  return {
    total: items.length,
    passed: items.filter((item) => item.passed).length,
    failed: items.filter((item) => !item.passed).length,
    items,
  };
}

function renderTabs() {
  els.teamTabs.innerHTML = state.teams
    .filter((team) => ['101', 'angio'].includes(team.slug))
    .map((team) => `<button class="team-tab ${team.slug === state.teamSlug ? 'active' : ''}" type="button" data-team-slug="${team.slug}">${escapeHtml(team.name)}</button>`)
    .join('');
  els.teamTabs.querySelectorAll('[data-team-slug]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.teamSlug = button.getAttribute('data-team-slug') || state.teamSlug;
      await loadWorkspace();
    });
  });
}

function syncSurfaceNav() {
  document.body.dataset.dashboardSurface = state.surface;
  els.surfaceNav?.querySelectorAll('[data-surface]').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-surface') === state.surface);
  });
}

function renderSummary() {
  const validation = state.dataset?.datasetValidation || { summary: { total: 0, errors: 0, warnings: 0, info: 0 } };
  const scenario = mergeScenarioReport();
  const publishCreated = state.schedule?.published?.created_at || '미배포';
  const latestRun = state.schedule?.period?.latest_run_id ? `#${state.schedule.period.latest_run_id}` : '없음';
  const cards = [
    ['팀', state.dataset?.team?.name || state.teamSlug, state.period],
    ['마지막 솔버', latestRun, state.schedule?.period?.status || 'draft'],
    ['마지막 배포', publishCreated, state.schedule?.published?.version_number ? `v${state.schedule.published.version_number}` : '미배포'],
    ['시나리오', `${scenario.passed}/${scenario.total}`, scenario.failed ? `${scenario.failed}건 재확인` : '전체 통과'],
  ];
  els.summaryGrid.innerHTML = cards.map(([label, value, note]) => `
    <article class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(note)}</span>
    </article>
  `).join('');

  const healthItems = [
    ['팀원', `${state.dataset?.members?.length || 0}명`, '파일럿 인원'],
    ['휴가', `${state.dataset?.approvedLeaves?.length || 0}일`, '승인 휴가'],
    ['개인 이벤트', `${state.dataset?.memberEvents?.length || 0}건`, '교육 · 오리엔테이션'],
    ['공용 이벤트', `${state.dataset?.wardEvents?.length || 0}건`, '회의 · 회식 · ward_event'],
    ['락', `${state.dataset?.locks?.length || 0}건`, 'assignment_locks + fixed_shift'],
    ['검증', `${validation.summary.errors}E / ${validation.summary.warnings}W`, validation.summary.blocking ? '배포 차단 가능' : '참고 경고'],
  ];
  els.healthGrid.innerHTML = healthItems.map(([label, value, note]) => `
    <div class="row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
      <span>${escapeHtml(note)}</span>
    </div>
  `).join('');
}

function renderDecisionBanner() {
  const validation = state.dataset?.datasetValidation?.summary || { errors: 0, warnings: 0, blocking: false };
  const scenario = mergeScenarioReport();
  const isReady = !validation.blocking && validation.errors === 0 && scenario.failed === 0;
  const headline = isReady ? '지금 배포 가능한 상태입니다.' : '지금은 배포 전에 확인이 더 필요합니다.';
  const detail = isReady
    ? '규정 시나리오와 데이터셋 검증이 모두 안정권입니다.'
    : `에러 ${validation.errors}건, 경고 ${validation.warnings}건, 시나리오 실패 ${scenario.failed}건을 먼저 확인하세요.`;
  els.decisionBanner.innerHTML = `
    <strong>${escapeHtml(headline)}</strong>
    <span>${escapeHtml(detail)}</span>
  `;
}

function renderRuleCoverage() {
  const rules = state.dataset?.rules || {};
  const validation = state.dataset?.datasetValidation || { summary: { errors: 0, warnings: 0, info: 0 } };
  const rows = [
    ['휴식', `${rules.minRestHours || '-'}시간`, '최소 휴식'],
    ['야간 상한', `${rules.maxNightShiftsPerMonth || '-'}회`, '월간 상한'],
    ['40+ 보호', validation.items?.some((item) => item.code === 'member.age_night_capability') ? '감시 중' : '감시 없음', 'age_night_capability'],
    ['금지 패턴', (rules.forbiddenPatterns || []).map((pattern) => pattern.join('-')).join(', ') || '-', 'solver rule'],
    ['이벤트 충돌', `${validation.items?.filter((item) => item.code.includes('event.')).length || 0}건`, 'leave_overlap · blocked_day'],
    ['coverage delta', `${(state.dataset?.wardEvents || []).filter((event) => Object.keys(event.coverageDelta || {}).length).length}건`, '팀 공용 이벤트'],
  ];
  els.ruleCoverage.innerHTML = rows.map(([label, value, note]) => `
    <div class="row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
      <span>${escapeHtml(note)}</span>
    </div>
  `).join('');
}

function renderMemberMatrix() {
  const members = state.dataset?.members || [];
  const leaveLedger = new Map((state.dataset?.leaveLedger || []).map((item) => [item.memberId, item]));
  if (!members.length) {
    els.memberMatrix.innerHTML = '<div class="empty-copy">팀 데이터를 불러오지 못했습니다.</div>';
    return;
  }
  els.memberMatrix.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>이름</th>
          <th>휴가</th>
          <th>교육</th>
          <th>최근 야간</th>
          <th>최근 주말</th>
          <th>최근 변경량</th>
        </tr>
      </thead>
      <tbody>
        ${members.map((member) => {
          const ledger = leaveLedger.get(member.id);
          return `
            <tr>
              <td>${escapeHtml(member.name)}</td>
              <td>${escapeHtml(String(ledger?.annualLeaveDays || 0))}</td>
              <td>${escapeHtml(String(ledger?.educationDays || 0))}</td>
              <td>${escapeHtml(String(ledger?.recentNightCount || 0))}</td>
              <td>${escapeHtml(String(ledger?.recentWeekendCount || 0))}</td>
              <td>${escapeHtml(String(ledger?.recentPublishedChanges || 0))}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderValidationList() {
  const items = state.dataset?.datasetValidation?.items || [];
  if (!items.length) {
    els.validationList.innerHTML = '<div class="empty-copy">현재 검증 경고가 없습니다.</div>';
    return;
  }
  els.validationList.innerHTML = items.map((item) => `
    <div class="validation-row ${escapeHtml(item.severity)}">
      <strong>${escapeHtml(item.title || item.code)}</strong>
      <span>${escapeHtml(item.message || item.code)}</span>
      <span>${escapeHtml([item.date, item.memberId ? `member ${item.memberId}` : null].filter(Boolean).join(' · '))}</span>
    </div>
  `).join('');
}

function renderScenarioList() {
  const scenario = mergeScenarioReport();
  if (!scenario.items.length) {
    els.scenarioList.innerHTML = '<div class="empty-copy">시나리오 결과가 없습니다.</div>';
    return;
  }
  els.scenarioList.innerHTML = scenario.items.map((item) => `
    <div class="row">
      <strong>${escapeHtml(item.title || item.id)}</strong>
      <span>${escapeHtml(`${item.category || 'scenario'} · ${item.passed ? 'PASS' : 'FAIL'}`)}</span>
      <span>${escapeHtml(JSON.stringify(item.actual || {}))}</span>
    </div>
  `).join('');
}

function renderCoverageDelta() {
  const baseCoverage = new Map((state.dataset?.baseCoverage || []).map((day) => [day.date, day]));
  const adjustedCoverage = new Map((state.dataset?.coverage || []).map((day) => [day.date, day]));
  const deltaEvents = (state.dataset?.wardEvents || []).filter((event) => Object.keys(event.coverageDelta || {}).length);
  if (!deltaEvents.length) {
    els.coverageDeltaList.innerHTML = '<div class="empty-copy">coverage delta가 적용된 팀 이벤트가 없습니다.</div>';
    return;
  }
  els.coverageDeltaList.innerHTML = deltaEvents.map((event) => {
    const date = event.dates?.[0];
    const before = baseCoverage.get(date);
    const after = adjustedCoverage.get(date);
    return `
      <div class="row">
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(`${date} · ${JSON.stringify(event.coverageDelta || {})}`)}</span>
        <span>${escapeHtml(`before ${JSON.stringify(before?.requirements || {})} / after ${JSON.stringify(after?.requirements || {})}`)}</span>
      </div>
    `;
  }).join('');
}

function renderAll() {
  renderTabs();
  renderDecisionBanner();
  renderSummary();
  renderRuleCoverage();
  renderMemberMatrix();
  renderValidationList();
  renderScenarioList();
  renderCoverageDelta();
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
    apiJson(`/teams/${state.teamSlug}/schedules/${state.period}`),
    apiJson(`/data/nurse-regulation?year=${year}`),
  ]);
  state.dataset = datasetData.result;
  state.schedule = scheduleData.result;
  state.regulation = regulationData;
  renderAll();
}

loadTeams()
  .then(loadWorkspace)
  .catch((error) => {
    els.summaryGrid.innerHTML = `<div class="empty-copy">${escapeHtml(error.message || String(error))}</div>`;
  });

els.surfaceNav?.querySelectorAll('[data-surface]').forEach((button) => {
  button.addEventListener('click', () => {
    state.surface = button.getAttribute('data-surface') || 'overview';
    syncSurfaceNav();
  });
});

// Phase 3-regression: cross-module bare 호출 → window 호환층 복원
if (typeof window !== 'undefined') {
  window.renderAll = renderAll;
  window.renderTabs = renderTabs;
}
