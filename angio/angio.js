const PAGE_META = {
  hub: {
    title: 'Angio 운영 문서 연결 허브',
    description:
      '호출표, 진료현황, Angio 당직표, 시간외 통계, 간호사 스케줄을 같은 사람·날짜·방 축으로 묶어 읽는 공개형 운영 화면입니다.'
  },
  files: {
    title: '그리드, 레인, 셀 카테고리 분석',
    description:
      '파일별 원래 구조를 유지한 채 페이지, 레인, 고빈도 토큰, 셀 카테고리, 연결 인물을 함께 검토할 수 있습니다.'
  },
  people: {
    title: '실명 인물 레지스트리와 협업 패턴',
    description:
      'RN, RT, CPN, 교수, Fellow, R1, 준비실 인물을 역할별로 묶고, 반복 패턴과 대체 관계, 교차 문서 등장 빈도를 추적합니다.'
  },
  operations: {
    title: '실제 당직, 방 배정, 시간외 스냅샷',
    description:
      '날짜별 호출, 방 배정, 휴가와 교육, 시간외 누적 통계를 문서별 아카이브로 읽고 예상 목표·결과·효과를 운영 뷰에 같이 붙였습니다.'
  }
};

const DATA_URLS = {
  sourceFiles: '/data/angio/source_files.json',
  gridCells: '/data/angio/grid_cells.json',
  people: '/data/angio/people.json',
  operations: '/data/angio/operations.json',
  comparisons: '/data/angio/comparisons.json'
};

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => renderError(error));
});

async function init() {
  const page = document.body.dataset.page || 'hub';
  applyPageMeta(page);
  setActiveNav(page);
  setLoadingState();

  const [sourceFiles, gridCells, people, operations, comparisons] = await Promise.all(
    Object.values(DATA_URLS).map(fetchJson)
  );

  const data = buildViewModel({ sourceFiles, gridCells, people, operations, comparisons });
  renderHeroMetrics(page, data);

  switch (page) {
    case 'files':
      renderFilesPage(data);
      break;
    case 'people':
      renderPeoplePage(data);
      break;
    case 'operations':
      renderOperationsPage(data);
      break;
    case 'hub':
    default:
      renderHubPage(data);
      break;
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${url} 로딩 실패 (${response.status})`);
  }
  return response.json();
}

function buildViewModel(raw) {
  const sourceFiles = raw.sourceFiles.files;
  const sourceMap = new Map(sourceFiles.map((file) => [file.id, file]));
  const cells = raw.gridCells.cells;
  const categories = raw.gridCells.categories;
  const people = raw.people.people;
  const roleGroups = raw.people.roleGroups;
  const snapshots = raw.operations.snapshots;
  const comparisons = raw.comparisons.reports;

  const cellsByFile = new Map();
  for (const cell of cells) {
    if (!cellsByFile.has(cell.sourceFileId)) {
      cellsByFile.set(cell.sourceFileId, []);
    }
    cellsByFile.get(cell.sourceFileId).push(cell);
  }

  const peopleByDoc = new Map();
  for (const person of people) {
    for (const docId of person.documents) {
      if (!peopleByDoc.has(docId)) {
        peopleByDoc.set(docId, new Set());
      }
      peopleByDoc.get(docId).add(person.name);
    }
  }

  const snapshotByFile = new Map(snapshots.map((snapshot) => [snapshot.sourceFileId, snapshot]));

  const documentInsights = sourceFiles.map((file) => {
    const fileCells = cellsByFile.get(file.id) || [];
    const categoryCounts = countBy(fileCells, (cell) => cell.category);
    const linkedPeople = new Set();
    const linkedRooms = new Set();
    const linkedDates = new Set();
    for (const cell of fileCells) {
      for (const name of cell.linkedPeople || []) linkedPeople.add(name);
      for (const room of cell.linkedRooms || []) linkedRooms.add(room);
      for (const date of cell.linkedDates || []) linkedDates.add(date);
    }
    const sampleCells = fileCells
      .filter((cell) => cell.category !== 'free_text')
      .slice(0, 14);
    const roleTokens = topTokens(
      fileCells.filter((cell) => cell.category === 'role_lane' || cell.category === 'room'),
      10
    );
    return {
      ...file,
      fileCells,
      categoryCounts,
      sampleCells,
      roleTokens,
      peopleCount: (peopleByDoc.get(file.id) || new Set()).size,
      linkedPeople,
      linkedRooms,
      linkedDates,
      snapshot: snapshotByFile.get(file.id) || null
    };
  });

  const relationshipLeaders = [...people]
    .sort((a, b) => (b.relationships?.length || 0) - (a.relationships?.length || 0))
    .slice(0, 8);

  const roleCounts = roleGroups.map((group) => ({
    role: group.role,
    count: group.members.length
  }));

  return {
    generatedAt: raw.sourceFiles.generatedAt,
    sourceFiles,
    sourceMap,
    documentInsights,
    cells,
    categories,
    people,
    roleGroups,
    roleCounts,
    snapshots,
    comparisons,
    relationshipLeaders,
    totals: {
      files: sourceFiles.length,
      cells: cells.length,
      people: people.length,
      contacts: people.filter((person) => person.contact).length,
      rooms: uniqueCount(cells.flatMap((cell) => cell.linkedRooms || [])),
      datedCells: uniqueCount(cells.flatMap((cell) => cell.linkedDates || [])),
      categoryCount: categories.length,
      roleGroups: roleGroups.length,
      snapshots: snapshots.length,
      overtimePoints: snapshots.reduce((sum, snapshot) => sum + (snapshot.overtimeStats?.length || 0), 0),
      assignments: snapshots.reduce((sum, snapshot) => sum + (snapshot.dailyAssignments?.length || 0), 0),
      roomEvents: snapshots.reduce((sum, snapshot) => sum + (snapshot.roomSchedule?.length || 0), 0)
    }
  };
}

function applyPageMeta(page) {
  const meta = PAGE_META[page] || PAGE_META.hub;
  const titleEl = document.querySelector('#hero-title');
  const descriptionEl = document.querySelector('#hero-description');
  if (titleEl) titleEl.textContent = meta.title;
  if (descriptionEl) descriptionEl.textContent = meta.description;
}

function setActiveNav(page) {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('active', link.dataset.nav === page);
  });
}

function setLoadingState() {
  const root = document.querySelector('#page-root');
  if (!root) return;
  root.innerHTML = '<div class="empty-state">실제 문서 스냅샷 데이터를 불러오는 중입니다.</div>';
}

function renderHeroMetrics(page, data) {
  const metricsRoot = document.querySelector('#hero-metrics');
  if (!metricsRoot) return;

  const metricsByPage = {
    hub: [
      ['문서 수', `${data.totals.files}`, '원본 5종을 월/연도 단위로 분리 보존'],
      ['인물 수', `${data.totals.people}`, '실명, 연락처, 역할 태그 포함'],
      ['셀 분류 수', formatNumber(data.totals.cells), 'date ~ free_text 14개 카테고리'],
      ['운영 스냅샷', `${data.totals.snapshots}`, '당직, 진료실, 간호, 시간외 결과 요약']
    ],
    files: [
      ['문서 타입', `${data.totals.files}`, 'radiology duty / clinic status / overtime / nurse schedule'],
      ['분류 카테고리', `${data.totals.categoryCount}`, '모든 셀에 동일한 분류 키 적용'],
      ['연결 날짜', `${data.totals.datedCells}`, '교차 문서 검색 가능한 날짜 축'],
      ['연결 방', `${data.totals.rooms}`, '1~6번방, 지혈, 암병원 등 공간 축']
    ],
    people: [
      ['등록 인물', `${data.totals.people}`, '문서 간 실명 엔티티 병합'],
      ['역할 그룹', `${data.totals.roleGroups}`, 'RN, RT, CPN, 교수, Fellow, R1, 준비실'],
      ['연락처 노출', `${data.totals.contacts}`, '페이지 내 표시 범위 제어'],
      ['관계 리드', `${data.relationshipLeaders.length}`, '공동 배정 증거가 많은 인물 우선']
    ],
    operations: [
      ['운영 문서', `${data.totals.snapshots}`, '문서별 스냅샷 아카이브'],
      ['일별 레코드', formatNumber(data.totals.assignments), '호출표와 간호 달력에서 추출'],
      ['방 배정 세션', formatNumber(data.totals.roomEvents), '오전/오후/저녁 room schedule'],
      ['시간외 포인트', `${data.totals.overtimePoints}`, '차트 기반 수동 구조화 포함']
    ]
  };

  const metrics = metricsByPage[page] || metricsByPage.hub;
  metricsRoot.innerHTML = metrics
    .map(
      ([label, value, note]) => `
        <article class="metric-card">
          <span class="metric-label">${escapeHtml(label)}</span>
          <span class="metric-value">${escapeHtml(value)}</span>
          <span class="metric-note">${escapeHtml(note)}</span>
        </article>
      `
    )
    .join('');
}

function renderHubPage(data) {
  const root = document.querySelector('#page-root');
  const decisionRows = [
    {
      label: '오늘 누가 호출을 받는가',
      linked: ['혈관조영실 당직근무표', 'Angio 당직표'],
      meaning: 'RT/RN/CPN 호출과 교수/Fellow/CPN 당직을 함께 봐야 야간 대응 체인이 닫힙니다.'
    },
    {
      label: '어느 방이 누구에게 배정되었는가',
      linked: ['Angio 진료현황'],
      meaning: '1~6번방, 지혈, 암병원, backup/operator 변경을 room 단위로 확인합니다.'
    },
    {
      label: '간호사 개인 상태와 대체근무',
      linked: ['간호사 스케줄'],
      meaning: 'A/B팀, 생휴, 오후off, 시간외, 대신근무 메모가 간호팀 내부 조정 규칙을 보여줍니다.'
    },
    {
      label: '월간 부담과 병목이 어디에 몰리는가',
      linked: ['2026 시간외근무 통계'],
      meaning: '주차별/월별 시간외 값으로 편중 인력과 결과 지표를 사후 확인합니다.'
    }
  ];

  root.innerHTML = `
    <div class="section-stack">
      <section class="section-block">
        <div class="section-header">
          <div>
            <h2 class="section-title">문서별 특징, 목표, 예상 결과, 예상 효과</h2>
            <p class="section-description">각 파일은 원래의 월/연도 컨텍스트를 유지한 채로 공개 스냅샷에 들어갑니다.</p>
          </div>
        </div>
        <div class="document-grid">
          ${data.documentInsights.map(renderHubDocumentCard).join('')}
        </div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <div>
            <h2 class="section-title">문서 간 연결 지도</h2>
            <p class="section-description">사람, 역할, 날짜, 방, 시간외 결과가 어떻게 이어지는지 운영 의미 중심으로 정리했습니다.</p>
          </div>
        </div>
        <div class="comparison-grid">
          ${data.comparisons.map(renderComparisonCard).join('')}
        </div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <div>
            <h2 class="section-title">어떤 파일이 어떤 운영 판단에 쓰이는가</h2>
            <p class="section-description">앱에서 바로 읽어야 할 판단 단위를 문서별로 정리했습니다.</p>
          </div>
        </div>
        <div class="decision-grid">
          ${decisionRows
            .map(
              (row) => `
                <article class="panel-card panel-pad">
                  <div class="panel-title-row">
                    <h3 class="panel-title">${escapeHtml(row.label)}</h3>
                  </div>
                  <div class="tag-row">
                    ${row.linked.map((item) => `<span class="tag emphasis">${escapeHtml(item)}</span>`).join('')}
                  </div>
                  <p class="panel-lead" style="margin-top:12px;">${escapeHtml(row.meaning)}</p>
                </article>
              `
            )
            .join('')}
        </div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <div>
            <h2 class="section-title">가장 많이 연결되는 인물</h2>
            <p class="section-description">교차 문서 등장과 공동 배정 증거가 많은 인물을 먼저 보여 줍니다.</p>
          </div>
          <a class="link-button" href="/angio/people.html">인물 상세 보기</a>
        </div>
        <div class="people-grid">
          ${data.relationshipLeaders.map(renderMiniPersonCard).join('')}
        </div>
      </section>
    </div>
  `;
}

function renderFilesPage(data) {
  const root = document.querySelector('#page-root');
  root.innerHTML = `
    <div class="section-stack">
      <section class="section-block">
        <div class="toolbar">
          <label>
            문서 선택
            <select id="file-filter">
              <option value="all">전체 문서</option>
              ${data.documentInsights
                .map((file) => `<option value="${escapeHtml(file.id)}">${escapeHtml(file.title)}</option>`)
                .join('')}
            </select>
          </label>
          <label>
            셀 카테고리
            <select id="category-filter">
              <option value="all">전체 카테고리</option>
              ${data.categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}
            </select>
          </label>
        </div>
        <div id="files-results"></div>
      </section>
    </div>
  `;

  const fileFilter = document.querySelector('#file-filter');
  const categoryFilter = document.querySelector('#category-filter');

  const render = () => {
    const fileId = fileFilter.value;
    const category = categoryFilter.value;
    const files =
      fileId === 'all'
        ? data.documentInsights
        : data.documentInsights.filter((file) => file.id === fileId);
    const results = document.querySelector('#files-results');

    if (!files.length) {
      results.innerHTML = '<div class="empty-state">선택한 조건과 일치하는 문서가 없습니다.</div>';
      return;
    }

    results.innerHTML = files
      .map((file) => renderFileDetail(file, category))
      .join('');
  };

  fileFilter.addEventListener('change', render);
  categoryFilter.addEventListener('change', render);
  render();
}

function renderPeoplePage(data) {
  const root = document.querySelector('#page-root');
  root.innerHTML = `
    <div class="section-stack">
      <section class="section-block">
        <div class="section-header">
          <div>
            <h2 class="section-title">역할 그룹 필터</h2>
            <p class="section-description">직군별 반복 패턴과 연락 체인을 바로 좁혀 볼 수 있습니다.</p>
          </div>
        </div>
        <div class="role-filter-bar" id="role-filter-bar">
          <button class="filter-pill active" data-role="all" type="button">전체</button>
          ${data.roleGroups
            .map((group) => `<button class="filter-pill" data-role="${escapeHtml(group.role)}" type="button">${escapeHtml(group.role)} · ${group.members.length}</button>`)
            .join('')}
        </div>
        <div id="people-results"></div>
      </section>
    </div>
  `;

  const filterBar = document.querySelector('#role-filter-bar');
  filterBar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-role]');
    if (!button) return;
    filterBar.querySelectorAll('[data-role]').forEach((pill) => pill.classList.remove('active'));
    button.classList.add('active');
    drawPeople(button.dataset.role);
  });

  drawPeople('all');

  function drawPeople(role) {
    const filteredPeople =
      role === 'all'
        ? [...data.people]
        : data.people.filter((person) => person.roleTags.includes(role));
    const comparisons = data.comparisons.filter((report) => report.rolePair.includes(role) || role === 'all');
    const results = document.querySelector('#people-results');
    results.innerHTML = `
      <div class="kpi-rail" style="margin-bottom:18px;">
        ${renderRoleKpiRail(data.roleCounts, role)}
      </div>
      <div class="comparison-grid" style="margin-bottom:18px;">
        ${comparisons.map(renderComparisonCard).join('')}
      </div>
      <div class="people-grid">
        ${filteredPeople.map(renderPersonCard).join('')}
      </div>
    `;
  }
}

function renderOperationsPage(data) {
  const root = document.querySelector('#page-root');
  root.innerHTML = `
    <div class="section-stack">
      <section class="section-block">
        <div class="toolbar">
          <label>
            운영 문서
            <select id="snapshot-filter">
              ${data.snapshots
                .map((snapshot) => {
                  const source = data.sourceMap.get(snapshot.sourceFileId);
                  return `<option value="${escapeHtml(snapshot.id)}">${escapeHtml(source.title)}</option>`;
                })
                .join('')}
            </select>
          </label>
        </div>
        <div class="snapshot-rail" id="snapshot-rail">
          ${data.snapshots.map((snapshot) => renderSnapshotRailCard(snapshot, data.sourceMap.get(snapshot.sourceFileId))).join('')}
        </div>
      </section>
      <section class="section-block">
        <div id="operations-results"></div>
      </section>
    </div>
  `;

  const filter = document.querySelector('#snapshot-filter');
  const rail = document.querySelector('#snapshot-rail');

  rail.addEventListener('click', (event) => {
    const target = event.target.closest('[data-snapshot-id]');
    if (!target) return;
    filter.value = target.dataset.snapshotId;
    renderSelectedSnapshot(target.dataset.snapshotId);
  });

  filter.addEventListener('change', () => renderSelectedSnapshot(filter.value));
  renderSelectedSnapshot(filter.value);

  function renderSelectedSnapshot(snapshotId) {
    document.querySelectorAll('[data-snapshot-id]').forEach((card) => {
      card.classList.toggle('active-rail', card.dataset.snapshotId === snapshotId);
    });
    const snapshot = data.snapshots.find((item) => item.id === snapshotId);
    const source = data.sourceMap.get(snapshot.sourceFileId);
    const results = document.querySelector('#operations-results');
    results.innerHTML = renderOperationDetail(snapshot, source);
  }
}

function renderFileDetail(file, category) {
  const relevantCells =
    category === 'all'
      ? file.fileCells
      : file.fileCells.filter((cell) => cell.category === category);
  const sampleCells = relevantCells.filter((cell) => cell.category !== 'free_text').slice(0, 14);
  const categoryEntries = Object.entries(file.categoryCounts).sort((a, b) => b[1] - a[1]);

  return `
    <article class="panel-card" style="margin-bottom:18px;">
      <div class="split-layout">
        <div>
          <div class="preview-frame">
            <img src="${escapeHtml(toAssetPath(file.previewImages[0]))}" alt="${escapeHtml(file.title)} 미리보기">
          </div>
          <div class="panel-pad">
            <div class="panel-title-row">
              <div>
                <h3 class="panel-title">${escapeHtml(file.title)}</h3>
                <div class="panel-meta">${escapeHtml(file.period)} · ${escapeHtml(file.documentType)} · ${file.pages} pages</div>
              </div>
              <span class="status-chip emphasis">${file.peopleCount} people</span>
            </div>
            <p class="panel-lead">${escapeHtml((file.characteristics || []).join(' / '))}</p>
            <div class="source-link-row">
              <a class="link-button primary" href="${escapeHtml(toAssetPath(file.pdfPath))}" target="_blank" rel="noopener noreferrer">원문 PDF 열기</a>
              <a class="link-button" href="/angio/operations.html">운영 뷰에서 보기</a>
            </div>
          </div>
        </div>
        <div class="panel-pad">
          <div class="detail-grid">
            <div class="detail-block">
              <h4>특징</h4>
              <ul class="content-list">${file.characteristics.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            </div>
            <div class="detail-block">
              <h4>목표</h4>
              <ul class="content-list">${file.goals.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            </div>
            <div class="detail-block">
              <h4>예상 결과</h4>
              <ul class="content-list">${file.expectedResults.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            </div>
            <div class="detail-block">
              <h4>예상 효과</h4>
              <ul class="content-list">${file.expectedEffects.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            </div>
          </div>

          <div class="detail-block" style="margin-top:18px;">
            <h4>페이지 섹션</h4>
            <ul class="content-list">
              ${file.sections
                .map(
                  (section) => `
                    <li>
                      p.${section.page} · ${escapeHtml(section.title)}<br>
                      <span class="muted">${escapeHtml((section.focus || []).join(', '))}</span>
                    </li>
                  `
                )
                .join('')}
            </ul>
          </div>
        </div>
      </div>

      <div class="panel-pad">
        <div class="section-header">
          <div>
            <h4 class="section-title" style="font-size:1.06rem;">셀 카테고리와 핵심 토큰</h4>
            <p class="section-description">문서별 그리드 문법이 어떤 셀 타입으로 이루어졌는지 요약했습니다.</p>
          </div>
          <span class="status-chip warning">${category === 'all' ? '전체 셀' : escapeHtml(category)} · ${formatNumber(relevantCells.length)}</span>
        </div>
        <div class="detail-grid">
          <div class="panel-card panel-pad">
            <div class="mini-section-title">카테고리 카운트</div>
            <div class="stat-table-wrap">
              <table class="compact-table">
                <thead>
                  <tr><th>Category</th><th>Count</th></tr>
                </thead>
                <tbody>
                  ${categoryEntries.map(([name, count]) => `<tr><td>${escapeHtml(name)}</td><td>${formatNumber(count)}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="panel-card panel-pad">
            <div class="mini-section-title">레인/방 고빈도 토큰</div>
            <div class="token-cloud">
              ${file.roleTokens.length
                ? file.roleTokens.map((token) => `<span class="token">${escapeHtml(token.label)} · ${token.count}</span>`).join('')
                : '<span class="empty-state">역할 레인 토큰이 없습니다.</span>'}
            </div>
            <div class="mini-section-title" style="margin-top:16px;">연결 범위</div>
            <div class="kpi-rail">
              <div class="kpi-box"><strong>${file.linkedPeople.size}</strong><span>연결 인물</span></div>
              <div class="kpi-box"><strong>${file.linkedRooms.size}</strong><span>연결 방/공간</span></div>
              <div class="kpi-box"><strong>${file.linkedDates.size}</strong><span>연결 날짜</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-pad">
        <div class="mini-section-title">샘플 셀</div>
        ${
          sampleCells.length
            ? `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Row/Col</th>
                      <th>Category</th>
                      <th>원문</th>
                      <th>정규화</th>
                      <th>연결</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sampleCells
                      .map((cell) => {
                        const links = [...(cell.linkedPeople || []), ...(cell.linkedDates || []), ...(cell.linkedRooms || [])].slice(0, 5);
                        return `
                          <tr>
                            <td>${cell.page}</td>
                            <td>${escapeHtml(cell.rowKey)} / ${escapeHtml(cell.colKey)}</td>
                            <td>${escapeHtml(cell.category)}</td>
                            <td>${escapeHtml(cell.rawText)}</td>
                            <td>${escapeHtml(cell.normalizedValue || '-')}</td>
                            <td>${escapeHtml(links.join(', ') || '-')}</td>
                          </tr>
                        `;
                      })
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
            : '<div class="empty-state">선택한 카테고리에 해당하는 샘플 셀이 없습니다.</div>'
        }
      </div>
    </article>
  `;
}

function renderPersonCard(person) {
  const relationships = (person.relationships || []).slice(0, 4);
  return `
    <article class="panel-card panel-pad">
      <div class="panel-title-row">
        <div>
          <h3 class="panel-title">${escapeHtml(person.name)}</h3>
          <div class="panel-meta">${escapeHtml((person.documents || []).join(', '))}</div>
        </div>
        <span class="status-chip">${(person.relationships || []).length} links</span>
      </div>
      <div class="role-tags" style="margin-bottom:12px;">
        ${(person.roleTags || []).map((tag) => `<span class="tag emphasis">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="detail-grid">
        <div class="detail-block">
          <h4>연락처</h4>
          <p class="panel-lead">${escapeHtml(person.contact || '미기재')}</p>
        </div>
        <div class="detail-block">
          <h4>반복 패턴</h4>
          <ul class="inline-list">${(person.patterns || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="detail-block" style="margin-top:16px;">
        <h4>주요 관계</h4>
        ${
          relationships.length
            ? `<ul class="relationship-list">
                ${relationships
                  .map(
                    (rel) => `
                      <li>
                        <strong>${escapeHtml(rel.with)}</strong> · ${escapeHtml(rel.type)}<br>
                        <span class="muted">${escapeHtml((rel.evidence || []).slice(0, 2).join(' / '))}</span>
                      </li>
                    `
                  )
                  .join('')}
              </ul>`
            : '<div class="empty-state">관계 정보가 없습니다.</div>'
        }
      </div>
    </article>
  `;
}

function renderMiniPersonCard(person) {
  return `
    <article class="panel-card panel-pad">
      <div class="panel-title-row">
        <div>
          <h3 class="panel-title">${escapeHtml(person.name)}</h3>
          <div class="panel-meta">${escapeHtml((person.roleTags || []).join(', '))}</div>
        </div>
        <span class="status-chip emphasis">${(person.relationships || []).length} evidence</span>
      </div>
      <p class="panel-lead">${escapeHtml((person.patterns || []).slice(0, 2).join(' / ') || '패턴 없음')}</p>
      <div class="tag-row">
        ${(person.documents || []).map((doc) => `<span class="tag">${escapeHtml(doc)}</span>`).join('')}
      </div>
    </article>
  `;
}

function renderComparisonCard(report) {
  return `
    <article class="panel-card panel-pad">
      <div class="panel-title-row">
        <div>
          <h3 class="panel-title">${escapeHtml(report.rolePair.join(' vs '))}</h3>
          <div class="panel-meta">${escapeHtml(report.id)}</div>
        </div>
      </div>
      <div class="detail-block">
        <h4>공통점</h4>
        <ul class="inline-list">${(report.commonPoints || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="detail-block" style="margin-top:14px;">
        <h4>차이점</h4>
        <ul class="inline-list">${(report.differences || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="detail-block" style="margin-top:14px;">
        <h4>협업 지점</h4>
        <ul class="inline-list">${(report.handoffLinks || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="detail-block" style="margin-top:14px;">
        <h4>운영 의미</h4>
        <p class="panel-lead">${escapeHtml(report.operationalMeaning)}</p>
      </div>
    </article>
  `;
}

function renderSnapshotRailCard(snapshot, source) {
  return `
    <button class="panel-card panel-pad" type="button" data-snapshot-id="${escapeHtml(snapshot.id)}" style="text-align:left; cursor:pointer;">
      <div class="panel-title">${escapeHtml(source.title)}</div>
      <div class="panel-meta" style="margin-top:6px;">${escapeHtml(source.period)} · ${escapeHtml(snapshot.headline)}</div>
      <div class="tag-row" style="margin-top:12px;">
        <span class="tag">${snapshot.dailyAssignments.length} daily</span>
        <span class="tag">${snapshot.roomSchedule.length} room</span>
        <span class="tag">${snapshot.overtimeStats.length} overtime</span>
      </div>
    </button>
  `;
}

function renderOperationDetail(snapshot, source) {
  const roomSessions = (snapshot.roomSchedule || []).slice(0, 8);
  const dailyRows = (snapshot.dailyAssignments || []).slice(0, 24);
  const overtimeGroups = groupBy(snapshot.overtimeStats || [], (item) => item.scope);

  return `
    <article class="panel-card">
      <div class="split-layout">
        <div>
          <div class="preview-frame">
            <img src="${escapeHtml(toAssetPath(source.previewImages[0]))}" alt="${escapeHtml(source.title)} 미리보기">
          </div>
          <div class="panel-pad">
            <div class="panel-title-row">
              <div>
                <h3 class="panel-title">${escapeHtml(source.title)}</h3>
                <div class="panel-meta">${escapeHtml(source.period)} · ${escapeHtml(snapshot.headline)}</div>
              </div>
              <a class="link-button primary" href="${escapeHtml(toAssetPath(source.pdfPath))}" target="_blank" rel="noopener noreferrer">PDF 열기</a>
            </div>
            <p class="panel-lead">${escapeHtml((source.expectedResults || []).join(' / '))}</p>
            <div class="two-column-note">
              <div class="panel-card panel-pad">
                <div class="mini-section-title">예상 목표</div>
                <ul class="inline-list">${source.goals.map((goal) => `<li>${escapeHtml(goal)}</li>`).join('')}</ul>
              </div>
              <div class="panel-card panel-pad">
                <div class="mini-section-title">예상 효과</div>
                <ul class="inline-list">${source.expectedEffects.map((effect) => `<li>${escapeHtml(effect)}</li>`).join('')}</ul>
              </div>
            </div>
          </div>
        </div>
        <div class="panel-pad">
          <div class="kpi-rail">
            <div class="kpi-box"><strong>${snapshot.dailyAssignments.length}</strong><span>daily assignments</span></div>
            <div class="kpi-box"><strong>${snapshot.roomSchedule.length}</strong><span>room sessions</span></div>
            <div class="kpi-box"><strong>${snapshot.leaveEvents.length}</strong><span>leave events</span></div>
            <div class="kpi-box"><strong>${snapshot.educationEvents.length}</strong><span>education events</span></div>
            <div class="kpi-box"><strong>${snapshot.overtimeStats.length}</strong><span>overtime stats</span></div>
          </div>
          <div class="detail-block" style="margin-top:18px;">
            <h4>운영 메모</h4>
            ${
              (snapshot.notes || []).length
                ? `<ul class="inline-list">${snapshot.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`
                : '<div class="empty-state">별도 운영 메모 없음</div>'
            }
          </div>
        </div>
      </div>

      <div class="panel-pad">
        <div class="section-header">
          <div>
            <h4 class="section-title" style="font-size:1.06rem;">일자별 운영 레코드</h4>
            <p class="section-description">호출표, 간호 달력 등에서 바로 쓸 수 있는 날짜별 레코드를 우선 보여 줍니다.</p>
          </div>
        </div>
        ${
          dailyRows.length
            ? `<div class="table-wrap">${renderAssignmentsTable(dailyRows)}</div>`
            : '<div class="empty-state">이 문서에는 날짜별 daily assignment 레코드가 없습니다.</div>'
        }
      </div>

      <div class="panel-pad">
        <div class="section-header">
          <div>
            <h4 class="section-title" style="font-size:1.06rem;">방 / 세션 운영</h4>
            <p class="section-description">진료현황 문서처럼 공간 배정이 핵심인 경우 room schedule을 먼저 읽을 수 있게 했습니다.</p>
          </div>
        </div>
        ${
          roomSessions.length
            ? `<div class="timeline-stack">${roomSessions.map(renderRoomSession).join('')}</div>`
            : '<div class="empty-state">방 배정 세션 정보가 없습니다.</div>'
        }
      </div>

      <div class="panel-pad">
        <div class="section-header">
          <div>
            <h4 class="section-title" style="font-size:1.06rem;">부재, 교육, 시간외 결과</h4>
            <p class="section-description">예상 목표가 실제로 어떤 결과값으로 남는지 같은 섹션에서 확인합니다.</p>
          </div>
        </div>
        <div class="detail-grid">
          <div class="panel-card panel-pad">
            <div class="mini-section-title">Leave Events</div>
            ${renderEventList(snapshot.leaveEvents, '휴가/부재 기록이 없습니다.')}
          </div>
          <div class="panel-card panel-pad">
            <div class="mini-section-title">Education Events</div>
            ${renderEventList(snapshot.educationEvents, '교육/학회 기록이 없습니다.')}
          </div>
        </div>
        <div class="detail-block" style="margin-top:18px;">
          <div class="mini-section-title">시간외 통계</div>
          ${
            snapshot.overtimeStats.length
              ? `
                <div class="highlight-grid">
                  ${Object.entries(overtimeGroups)
                    .map(
                      ([scope, entries]) => `
                        <article class="panel-card panel-pad">
                          <h4 class="panel-title">${escapeHtml(scope)}</h4>
                          <ul class="inline-list" style="margin-top:12px;">
                            ${entries
                              .map(
                                (entry) => `
                                  <li>
                                    <strong>${escapeHtml(entry.person)}</strong> · ${escapeHtml(entry.period)} · ${entry.value}${escapeHtml(entry.unit || '')}
                                    <span class="muted"> (p.${entry.sourcePage}${entry.note ? ` / ${escapeHtml(entry.note)}` : ''})</span>
                                  </li>
                                `
                              )
                              .join('')}
                          </ul>
                        </article>
                      `
                    )
                    .join('')}
                </div>
              `
              : '<div class="empty-state">시간외 통계가 없는 문서입니다.</div>'
          }
        </div>
      </div>
    </article>
  `;
}

function renderAssignmentsTable(rows) {
  const hasRoleAssignments = rows.some((row) => row.roleAssignments);
  const hasTeamLabel = rows.some((row) => row.teamLabel);

  if (hasRoleAssignments) {
    return `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>RT</th>
            <th>RN</th>
            <th>CPN</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  <td>${escapeHtml(formatDate(row.date))}</td>
                  <td>${escapeHtml(row.roleAssignments?.RT || '-')}</td>
                  <td>${escapeHtml(row.roleAssignments?.RN || '-')}</td>
                  <td>${escapeHtml(row.roleAssignments?.CPN || '-')}</td>
                  <td>${escapeHtml((row.notes || []).join(', ') || '-')}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  if (hasTeamLabel) {
    return `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Team</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  <td>${escapeHtml(formatDate(row.date))}</td>
                  <td>${escapeHtml(row.teamLabel || '-')}</td>
                  <td>${escapeHtml((row.notes || []).join(', ') || '-')}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  return '<div class="empty-state">표로 보여 줄 daily assignment 형식이 없습니다.</div>';
}

function renderRoomSession(session) {
  return `
    <article class="timeline-card">
      <h4>${escapeHtml(formatDate(session.date))} · ${escapeHtml(session.session || 'session')}</h4>
      <div class="panel-meta" style="margin-bottom:10px;">${(session.rooms || []).length} room entries</div>
      <div class="table-wrap">
        <table class="compact-table">
          <thead>
            <tr><th>Room</th><th>Assignment</th><th>People</th></tr>
          </thead>
          <tbody>
            ${(session.rooms || [])
              .map(
                (room) => `
                  <tr>
                    <td>${escapeHtml(room.room || '-')}</td>
                    <td>${escapeHtml(room.assignment || '-')}</td>
                    <td>${escapeHtml((room.people || []).join(', ') || '-')}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
      ${
        (session.notes || []).length
          ? `<div class="footnote" style="margin-top:10px;">${escapeHtml(session.notes.join(', '))}</div>`
          : ''
      }
    </article>
  `;
}

function renderEventList(events, emptyText) {
  if (!events || !events.length) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }
  return `
    <ul class="inline-list">
      ${events
        .slice(0, 16)
        .map(
          (event) => `
            <li>
              <strong>${escapeHtml(event.person || event.name || '-')}</strong>
              <span class="muted">${escapeHtml(event.date || event.period || '')}</span>
              ${event.reason ? `<br><span>${escapeHtml(event.reason)}</span>` : ''}
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function renderHubDocumentCard(file) {
  return `
    <article class="panel-card">
      <div class="preview-frame">
        <img src="${escapeHtml(toAssetPath(file.previewImages[0]))}" alt="${escapeHtml(file.title)} 미리보기">
      </div>
      <div class="panel-pad">
        <div class="panel-title-row">
          <div>
            <h3 class="panel-title">${escapeHtml(file.title)}</h3>
            <div class="panel-meta">${escapeHtml(file.period)} · ${escapeHtml(file.documentType)}</div>
          </div>
          <span class="status-chip emphasis">${formatNumber(file.fileCells.length)} cells</span>
        </div>
        <p class="panel-lead">${escapeHtml((file.characteristics || []).join(' / '))}</p>
        <div class="detail-grid">
          <div class="detail-block">
            <h4>목표</h4>
            <ul class="inline-list">${file.goals.slice(0, 3).map((goal) => `<li>${escapeHtml(goal)}</li>`).join('')}</ul>
          </div>
          <div class="detail-block">
            <h4>예상 효과</h4>
            <ul class="inline-list">${file.expectedEffects.slice(0, 3).map((effect) => `<li>${escapeHtml(effect)}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="tag-row" style="margin-top:14px;">
          <span class="tag">${file.peopleCount} people</span>
          <span class="tag">${file.linkedRooms.size} rooms</span>
          <span class="tag">${file.linkedDates.size} dates</span>
        </div>
        <div class="source-link-row">
          <a class="link-button" href="/angio/files.html">그리드 보기</a>
          <a class="link-button" href="/angio/operations.html">운영 뷰 보기</a>
        </div>
      </div>
    </article>
  `;
}

function renderRoleKpiRail(roleCounts, selectedRole) {
  const counts = selectedRole === 'all' ? roleCounts : roleCounts.filter((item) => item.role === selectedRole);
  return counts
    .map(
      (item) => `
        <div class="kpi-box">
          <strong>${item.count}</strong>
          <span>${escapeHtml(item.role)}</span>
        </div>
      `
    )
    .join('');
}

function renderError(error) {
  const root = document.querySelector('#page-root');
  const banner = document.querySelector('#error-banner');
  const message = error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.';
  if (banner) {
    banner.hidden = false;
    banner.textContent = `Angio JSON을 읽지 못했습니다: ${message}`;
  }
  if (root) {
    root.innerHTML = `
      <div class="empty-state">
        필요한 JSON이 없거나 경로가 잘못되었습니다.<br>
        <span class="muted">/data/angio/source_files.json, grid_cells.json, people.json, operations.json, comparisons.json</span>
      </div>
    `;
  }
}

function toAssetPath(relativePath) {
  if (!relativePath) return '';
  return `/data/angio/${relativePath.replace(/^\.\//, '')}`;
}

function topTokens(items, limit) {
  const counts = countBy(items, (item) => item.normalizedValue || item.rawText || '');
  return Object.entries(counts)
    .filter(([label]) => label)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function uniqueCount(items) {
  return new Set(items.filter(Boolean)).size;
}

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatDate(value) {
  if (!value) return '-';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
