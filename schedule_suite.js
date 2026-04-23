const REPORT_PATH = './data/schedule_suite_report_2026-05.json';

const state = {
  report: null,
  teamSlug: '101',
  view: 'deploy',
};

const els = {
  heroSummary: document.getElementById('heroSummary'),
  teamTabs: document.getElementById('teamTabs'),
  viewTabs: document.getElementById('viewTabs'),
  statusGrid: document.getElementById('statusGrid'),
  viewMount: document.getElementById('viewMount'),
  testsetGrid: document.getElementById('testsetGrid'),
};

// escapeHtml은 shared-utils.js에서 window 전역으로 제공됨.

async function loadReport() {
  const response = await fetch(REPORT_PATH);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '최종 리포트를 불러오지 못했습니다.');
  }
  state.report = data;
  renderAll();
}

function getTeamData() {
  return state.report?.teams?.[state.teamSlug] || null;
}

function getDataset() {
  return getTeamData()?.dataset || null;
}

function getSchedule() {
  return getTeamData()?.schedule || null;
}

function getTestReport() {
  return getTeamData()?.testReport || null;
}

function renderTabs() {
  const teamEntries = Object.values(state.report?.teams || {});
  els.teamTabs.innerHTML = teamEntries.map((team) => `
    <button class="tab-btn ${team.slug === state.teamSlug ? 'active' : ''}" type="button" data-team-slug="${team.slug}">
      ${escapeHtml(team.dataset?.team?.name || team.slug)}
    </button>
  `).join('');
  els.teamTabs.querySelectorAll('[data-team-slug]').forEach((button) => {
    button.addEventListener('click', () => {
      state.teamSlug = button.getAttribute('data-team-slug') || state.teamSlug;
      renderAll();
    });
  });

  const viewLabels = {
    deploy: '배포판',
    admin: '관리자판',
    dashboard: '대시보드',
  };
  els.viewTabs.innerHTML = Object.entries(viewLabels).map(([view, label]) => `
    <button class="tab-btn ${view === state.view ? 'active' : ''}" type="button" data-view="${view}">
      ${escapeHtml(label)}
    </button>
  `).join('');
  els.viewTabs.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.getAttribute('data-view') || state.view;
      renderAll();
    });
  });
}

function renderHeroSummary() {
  const summary = state.report.summary;
  const regulation = state.report.regulationScenarioReport || { total: 0, passed: 0, failed: 0 };
  els.heroSummary.innerHTML = `
    <div class="hero-copy">
      <p class="eyebrow">Final Snapshot</p>
      <h2>10개 테스트셋 + 실제 팀원 데이터</h2>
      <p>${escapeHtml(`${state.report.period} 기준으로 101 병동과 Angio 팀에 대해 실제 팀원, 승인 휴가, 이벤트셋, coverage delta, fixed shift 시나리오를 알고리즘에 물려 검증했습니다.`)}</p>
    </div>
    <div class="hero-stat">
      <span>테스트셋</span>
      <strong>${summary.passedTestsets}/${summary.totalTestsets}</strong>
      <span>${summary.failedTestsets}건 실패</span>
    </div>
    <div class="hero-stat">
      <span>규정 시나리오</span>
      <strong>${regulation.passed}/${regulation.total}</strong>
      <span>${regulation.failed}건 재확인</span>
    </div>
    <div class="hero-stat">
      <span>현재 팀</span>
      <strong>${escapeHtml(getDataset()?.team?.name || state.teamSlug)}</strong>
      <span>${escapeHtml(state.report.period)}</span>
    </div>
    <div class="hero-stat">
      <span>생성 시각</span>
      <strong>${escapeHtml(state.report.generatedAt.slice(11, 16))}</strong>
      <span>${escapeHtml(state.report.generatedAt.slice(0, 10))}</span>
    </div>
  `;
}

function renderStatusGrid() {
  const dataset = getDataset();
  const schedule = getSchedule();
  const validation = dataset?.datasetValidation?.summary || { errors: 0, warnings: 0, blocking: false };
  const educationCount = (dataset?.memberEvents || []).filter((event) => ['education', 'orientation', 'conference'].includes(event.eventType)).length;
  const cards = [
    ['배포 버전', schedule?.published?.version_number ? `v${schedule.published.version_number}` : '없음', schedule?.published ? '확정 배포' : '미배포'],
    ['팀원', `${dataset?.members?.length || 0}명`, '실제 팀원'],
    ['휴가', `${dataset?.approvedLeaves?.length || 0}일`, '승인 휴가'],
    ['교육', `${educationCount}건`, 'orientation 포함'],
    ['검증', `${validation.errors}E / ${validation.warnings}W`, validation.blocking ? '배포 차단 가능' : '참고 경고'],
  ];
  els.statusGrid.innerHTML = cards.map(([label, value, note]) => `
    <article class="status-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(note)}</span>
    </article>
  `).join('');
}

function buildBoardHtml(dataset, assignments) {
  const assignmentMap = new Map(assignments.map((assignment) => [`${assignment.memberId}:${assignment.date}`, assignment.shiftCode]));
  const coverageCounts = new Map();
  assignments.forEach((assignment) => {
    if (!['D', 'E', 'N'].includes(assignment.shiftCode)) return;
    const key = `${assignment.shiftCode}:${assignment.date}`;
    coverageCounts.set(key, (coverageCounts.get(key) || 0) + 1);
  });
  const headerCells = (dataset.coverage || []).map((day) => {
    const date = new Date(`${day.date}T00:00:00Z`);
    return `
      <th class="day-head">
        <strong>${date.getUTCDate()}</strong>
        <span>${escapeHtml(['일','월','화','수','목','금','토'][date.getUTCDay()])}</span>
      </th>
    `;
  }).join('');
  const coverageRows = ['D', 'E', 'N'].map((shiftCode) => {
    const cells = (dataset.coverage || []).map((day) => {
      const assigned = coverageCounts.get(`${shiftCode}:${day.date}`) || 0;
      const required = Number(day.requirements?.[shiftCode] || 0);
      const tone = assigned === required ? 'good' : assigned > required ? 'warn' : 'bad';
      return `<td class="coverage-cell"><span class="coverage-pill ${tone}">${assigned}/${required}</span></td>`;
    }).join('');
    return `
      <tr>
        <th class="member-col sticky-col">
          <div class="member-name">${shiftCode} coverage</div>
          <div class="member-meta">팀 충원 현황</div>
        </th>
        ${cells}
      </tr>
    `;
  }).join('');
  const memberRows = (dataset.members || []).map((member) => {
    const cells = (dataset.coverage || []).map((day) => {
      const code = assignmentMap.get(`${member.id}:${day.date}`) || '-';
      const memberEvents = (dataset.memberEvents || []).filter((event) => event.memberId === member.id && (event.dates || []).includes(day.date));
      const teamEvents = (dataset.wardEvents || []).filter((event) => (event.dates || []).includes(day.date));
      const flags = [
        ...memberEvents.map((event) => `<span class="cell-flag">${escapeHtml(event.eventType === 'education' || event.eventType === 'orientation' ? 'EDU' : event.eventType)}</span>`),
        ...teamEvents.map(() => '<span class="cell-flag team">TEAM</span>'),
      ].slice(0, 2).join('');
      return `
        <td class="shift-cell">
          <div class="shift-pill shift-${escapeHtml(String(code))}">
            <span>${escapeHtml(code)}</span>
            ${flags ? `<span class="cell-flags">${flags}</span>` : ''}
          </div>
        </td>
      `;
    }).join('');
    return `
      <tr>
        <th class="member-col sticky-col">
          <div class="member-name">${escapeHtml(member.name)}</div>
          <div class="member-meta">${escapeHtml(member.roleLabel || 'RN')} · ${(member.skillTags || []).map((tag) => escapeHtml(tag)).join(', ')}</div>
        </th>
        ${cells}
      </tr>
    `;
  }).join('');

  return `
    <div class="legend-row">
      <span class="legend-chip shift-D">D</span>
      <span class="legend-chip shift-E">E</span>
      <span class="legend-chip shift-N">N</span>
      <span class="legend-chip shift-OFF">OFF</span>
      <span class="legend-chip shift-LEAVE">LEAVE</span>
      <span class="legend-chip shift-EDU">EDU</span>
      <span class="legend-note">휴가, 교육, 팀 이벤트 배지를 함께 표시합니다.</span>
    </div>
    <div class="board-shell">
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
    </div>
  `;
}

function renderDeployView() {
  const dataset = getDataset();
  const schedule = getSchedule();
  const assignments = schedule?.published?.assignments_snapshot || [];
  const featuredMember = dataset?.members?.[0];
  const ledger = (dataset?.leaveLedger || []).find((item) => item.memberId === featuredMember?.id);
  const personalRows = featuredMember ? [
    ['휴가 누적', `${ledger?.annualLeaveDays || 0}일`, '최근 기준'],
    ['교육 누적', `${ledger?.educationDays || 0}일`, 'orientation 포함'],
    ['최근 야간', `${ledger?.recentNightCount || 0}회`, '최근 3개월'],
    ['최근 주말', `${ledger?.recentWeekendCount || 0}회`, '최근 3개월'],
  ] : [];
  return `
    <div class="two-col">
      <section class="card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Published Board</p>
            <h2>${escapeHtml(`${dataset?.team?.name || state.teamSlug} 배포본`)}</h2>
          </div>
        </div>
        ${assignments.length ? buildBoardHtml(dataset, assignments) : '<div class="empty-copy">배포된 근무표가 없습니다.</div>'}
      </section>
      <section class="stack">
        <article class="card">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Personal Snapshot</p>
              <h2>${escapeHtml(featuredMember?.name || '대표 간호사')}</h2>
            </div>
          </div>
          <div class="stack">
            ${personalRows.map(([label, value, note]) => `
              <div class="mini-card">
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(value)}</span>
                <span>${escapeHtml(note)}</span>
              </div>
            `).join('')}
          </div>
        </article>
        <article class="card">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Protection Rules</p>
              <h2>배포본 참고 규정</h2>
            </div>
          </div>
          <div class="stack">
            ${(state.report.regulationScenarioReport?.items || []).slice(0, 4).map((item) => `
              <div class="mini-card">
                <strong>${escapeHtml(item.title || item.id)}</strong>
                <span>${escapeHtml(item.passed ? 'PASS' : 'FAIL')}</span>
                <span>${escapeHtml(JSON.stringify(item.actual || {}))}</span>
              </div>
            `).join('')}
          </div>
        </article>
      </section>
    </div>
  `;
}

function renderAdminView() {
  const dataset = getDataset();
  const schedule = getSchedule();
  const validation = dataset?.datasetValidation?.items || [];
  const events = [...(dataset?.memberEvents || []), ...(dataset?.wardEvents || [])]
    .sort((left, right) => `${left.startDate}-${left.title}`.localeCompare(`${right.startDate}-${right.title}`));
  return `
    <div class="two-col">
      <section class="stack">
        <article class="card">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Candidate Compare</p>
              <h2>후보안 비교</h2>
            </div>
          </div>
          <div class="candidate-grid">
            ${(schedule?.candidates || []).map((candidate) => `
              <div class="candidate-row ${candidate.status === 'selected' ? 'active' : ''}">
                <strong>${escapeHtml(candidate.candidate_key)}</strong>
                <span>score ${escapeHtml(String(candidate.score?.total ?? '-'))}</span>
                <span>request ${escapeHtml(String(candidate.score?.request_violations ?? 0))} · continuity ${escapeHtml(String(candidate.score?.continuity_changes ?? 0))}</span>
              </div>
            `).join('')}
          </div>
        </article>
        <article class="card">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Event Timeline</p>
              <h2>휴가 · 교육 · 회의 · 회식</h2>
            </div>
          </div>
          <div class="stack">
            ${events.slice(0, 10).map((event) => `
              <div class="timeline-card">
                <strong>${escapeHtml(event.title)}</strong>
                <span>${escapeHtml(`${event.scope === 'member' ? `${event.memberId}` : 'TEAM'} · ${event.eventType}`)}</span>
                <span>${escapeHtml(`${event.startDate}${event.startDate !== event.endDate ? ` ~ ${event.endDate}` : ''}`)}</span>
              </div>
            `).join('')}
          </div>
        </article>
      </section>
      <section class="stack">
        <article class="card">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Validation Queue</p>
              <h2>검증 큐</h2>
            </div>
          </div>
          <div class="stack">
            ${validation.length ? validation.slice(0, 10).map((item) => `
              <div class="validation-row ${escapeHtml(item.severity)}">
                <strong>${escapeHtml(item.title || item.code)}</strong>
                <span>${escapeHtml(item.message || item.code)}</span>
                <span>${escapeHtml([item.date, item.memberId ? `member ${item.memberId}` : null].filter(Boolean).join(' · '))}</span>
              </div>
            `).join('') : '<div class="empty-copy">현재 검증 큐가 비어 있습니다.</div>'}
          </div>
        </article>
        <article class="card">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Team Inspect</p>
              <h2>사람별 누적 지표</h2>
            </div>
          </div>
          <div class="stack">
            ${(dataset?.leaveLedger || []).slice(0, 6).map((item) => `
              <div class="mini-card">
                <strong>${escapeHtml(item.memberName)}</strong>
                <span>${escapeHtml(`연차 ${item.annualLeaveDays} · 교육 ${item.educationDays} · 야간 ${item.recentNightCount}`)}</span>
                <span>${escapeHtml(`주말 ${item.recentWeekendCount} · 변경량 ${item.recentPublishedChanges}`)}</span>
              </div>
            `).join('')}
          </div>
        </article>
      </section>
    </div>
  `;
}

function renderDashboardView() {
  const dataset = getDataset();
  const rules = dataset?.rules || {};
  const validation = dataset?.datasetValidation || { summary: { errors: 0, warnings: 0, info: 0 }, items: [] };
  const teamReport = getTestReport();
  return `
    <div class="three-col">
      <section class="card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Dataset Health</p>
            <h2>건강도</h2>
          </div>
        </div>
        <div class="stack">
          <div class="mini-card"><strong>팀원</strong><span>${escapeHtml(String(dataset?.members?.length || 0))}명</span></div>
          <div class="mini-card"><strong>개인 이벤트</strong><span>${escapeHtml(String(dataset?.memberEvents?.length || 0))}건</span></div>
          <div class="mini-card"><strong>공용 이벤트</strong><span>${escapeHtml(String(dataset?.wardEvents?.length || 0))}건</span></div>
          <div class="mini-card"><strong>검증</strong><span>${escapeHtml(`${validation.summary.errors}E / ${validation.summary.warnings}W`)}</span></div>
        </div>
      </section>
      <section class="card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Rule Coverage</p>
            <h2>규칙 적용</h2>
          </div>
        </div>
        <div class="stack">
          <div class="mini-card"><strong>최소 휴식</strong><span>${escapeHtml(`${rules.minRestHours || '-'}시간`)}</span></div>
          <div class="mini-card"><strong>야간 상한</strong><span>${escapeHtml(`${rules.maxNightShiftsPerMonth || '-'}회`)}</span></div>
          <div class="mini-card"><strong>금지 패턴</strong><span>${escapeHtml((rules.forbiddenPatterns || []).map((pattern) => pattern.join('-')).join(', '))}</span></div>
          <div class="mini-card"><strong>이벤트 충돌</strong><span>${escapeHtml(String(validation.items.filter((item) => item.code.startsWith('event.')).length))}건</span></div>
        </div>
      </section>
      <section class="card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Scenario Lab</p>
            <h2>${escapeHtml(teamReport ? `${teamReport.passed}/${teamReport.total}` : '-')}</h2>
          </div>
        </div>
        <div class="stack">
          ${(teamReport?.items || []).slice(0, 5).map((item) => `
            <div class="mini-card">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(`${item.status.toUpperCase()} · ${item.selectedCandidateKey || item.solverStatus}`)}</span>
              <span>${escapeHtml(item.description)}</span>
            </div>
          `).join('')}
        </div>
      </section>
      <section class="card" style="grid-column: 1 / -1;">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Member Matrix</p>
            <h2>사람별 휴가 · 교육 · 최근 야간 · 변경량</h2>
          </div>
        </div>
        <div class="table-shell">
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
              ${(dataset?.leaveLedger || []).map((item) => `
                <tr>
                  <td>${escapeHtml(item.memberName)}</td>
                  <td>${escapeHtml(String(item.annualLeaveDays))}</td>
                  <td>${escapeHtml(String(item.educationDays))}</td>
                  <td>${escapeHtml(String(item.recentNightCount))}</td>
                  <td>${escapeHtml(String(item.recentWeekendCount))}</td>
                  <td>${escapeHtml(String(item.recentPublishedChanges))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderView() {
  if (state.view === 'deploy') {
    els.viewMount.innerHTML = renderDeployView();
    return;
  }
  if (state.view === 'admin') {
    els.viewMount.innerHTML = renderAdminView();
    return;
  }
  els.viewMount.innerHTML = renderDashboardView();
}

function renderTestsetGrid() {
  const allReports = Object.values(state.report.teams || {}).flatMap((team) => team.testReport?.items || []);
  els.testsetGrid.innerHTML = allReports.map((item) => `
    <article class="test-card ${escapeHtml(item.status)}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(`${item.status.toUpperCase()} · ${item.selectedCandidateKey || item.solverStatus}`)}</span>
      <span>${escapeHtml(item.description)}</span>
      <div class="pill-row">
        <span class="pill ${item.status === 'passed' ? 'ready' : 'bad'}">${escapeHtml(`checks ${item.checks.filter((check) => check.passed).length}/${item.checks.length}`)}</span>
        <span class="pill ${item.validation.blocking ? 'bad' : 'good'}">${escapeHtml(`${item.validation.errors}E / ${item.validation.warnings}W`)}</span>
      </div>
      <div class="check-list">
        ${item.checks.map((check) => `
          <div class="check-row">
            <strong>${escapeHtml(`${check.passed ? 'PASS' : 'FAIL'} · ${check.label}`)}</strong>
            <span>${escapeHtml(`expected ${check.expected}`)}</span>
            <span>${escapeHtml(`actual ${check.actual}`)}</span>
          </div>
        `).join('')}
      </div>
    </article>
  `).join('');
}

function renderAll() {
  renderHeroSummary();
  renderTabs();
  renderStatusGrid();
  renderView();
  renderTestsetGrid();
}

loadReport().catch((error) => {
  els.heroSummary.innerHTML = `<div class="empty-copy">${escapeHtml(error.message || String(error))}</div>`;
  els.viewMount.innerHTML = `<div class="empty-copy">${escapeHtml(error.message || String(error))}</div>`;
  els.testsetGrid.innerHTML = '';
});
