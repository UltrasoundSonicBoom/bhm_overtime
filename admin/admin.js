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

// supabaseClient는 initApp()에서 서버로부터 config를 받아 초기화됩니다.
// 소스코드에 키를 하드코딩하지 않습니다.
let supabaseClient = createFallbackSupabase();

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
  year: new Date().getFullYear(),
  surface: 'dashboard',
  session: null,
  regulation: null,
  adminDashboard: null,
  versions: [],
  snapshots: null,
  faqs: [],
  contentEntries: [],
  contentFilter: 'all',
  editingContentId: '',
  contentDetail: null,
  approvals: [],
  reviewFilter: 'pending',
  auditLogs: [],
  selectedVersionId: '',
  editingFaqId: '',
};

const els = {
  loginBtn: document.getElementById('loginBtn'),
  // 새 셸: authStatusBadge (이전: authStatus)
  authStatus: document.getElementById('authStatusBadge') || document.getElementById('authStatus'),
  yearInput: document.getElementById('yearInput'),
  refreshBtn: document.getElementById('refreshBtn'),
  refreshNextBtn: document.getElementById('refreshNextBtn'),
  summaryGrid: document.getElementById('summaryGrid'),
  quickFacts: document.getElementById('quickFacts'),
  opsChecklist: document.getElementById('opsChecklist'),
  snapshotMeta: document.getElementById('snapshotMeta'),
  snapshotList: document.getElementById('snapshotList'),
  versionForm: document.getElementById('versionForm'),
  versionYearInput: document.getElementById('versionYearInput'),
  versionTitleInput: document.getElementById('versionTitleInput'),
  versionEffectiveInput: document.getElementById('versionEffectiveInput'),
  versionSourceInput: document.getElementById('versionSourceInput'),
  versionSubmitBtn: document.getElementById('versionSubmitBtn'),
  versionsList: document.getElementById('versionsList'),
  faqVersionSelect: document.getElementById('faqVersionSelect'),
  faqForm: document.getElementById('faqForm'),
  faqIdInput: document.getElementById('faqIdInput'),
  faqCategoryInput: document.getElementById('faqCategoryInput'),
  faqQuestionInput: document.getElementById('faqQuestionInput'),
  faqAnswerInput: document.getElementById('faqAnswerInput'),
  faqRefInput: document.getElementById('faqRefInput'),
  faqPublishedInput: document.getElementById('faqPublishedInput'),
  faqSubmitBtn: document.getElementById('faqSubmitBtn'),
  faqResetBtn: document.getElementById('faqResetBtn'),
  faqList: document.getElementById('faqList'),
  // 새 셸에서 scenarioSummary/List는 제거됨, null-safe로 처리
  scenarioSummary: document.getElementById('scenarioSummary'),
  scenarioList: document.getElementById('scenarioList'),
  // 새 셸: globalLog (이전: resultBox)
  resultBox: document.getElementById('globalLog') || document.getElementById('resultBox'),
  // 새 셸: 사이드바 아이템으로 교체됨, null-safe
  surfaceNav: document.getElementById('surfaceNav'),
  contentList: document.getElementById('contentList'),
  contentFilterBar: document.getElementById('contentFilterBar'),
  newContentBtn: document.getElementById('newContentBtn'),
  reviewList: document.getElementById('reviewList'),
  reviewBadge: document.getElementById('reviewBadge'),
  reviewFilterBar: document.getElementById('reviewFilterBar'),
  auditLogList: document.getElementById('auditLogList'),
  contentEditorForm: document.getElementById('contentEditorForm'),
  contentIdInput: document.getElementById('contentIdInput'),
  contentTypeSelect: document.getElementById('contentTypeSelect'),
  contentTitleInput: document.getElementById('contentTitleInput'),
  contentSlugInput: document.getElementById('contentSlugInput'),
  contentSummaryInput: document.getElementById('contentSummaryInput'),
  contentBodyInput: document.getElementById('contentBodyInput'),
  contentSaveBtn: document.getElementById('contentSaveBtn'),
  contentResetBtn: document.getElementById('contentResetBtn'),
  contentStatusActions: document.getElementById('contentStatusActions'),
  contentRevisions: document.getElementById('contentRevisions'),
  healthGrid: document.getElementById('healthGrid'),
  healthAlerts: document.getElementById('healthAlerts'),
};

if (els.yearInput) els.yearInput.value = String(state.year);
if (els.versionYearInput) els.versionYearInput.value = String(state.year + 1);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getAccessToken() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.access_token || null;
}

async function apiJson(path, options = {}, requireAuth = false) {
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `요청 실패 (${response.status})`);
  return data;
}

function getSelectedVersion() {
  return state.versions.find((version) => String(version.id) === String(state.selectedVersionId)) || null;
}

function syncSurfaceNav() {
  document.body.dataset.regSurface = state.surface;

  // 사이드바 아이템 활성 상태
  document.querySelectorAll('.sidebar-item[data-surface]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-surface') === state.surface);
  });

  // 뷰 패널 표시/숨김
  document.querySelectorAll('[data-surface-panel]').forEach((panel) => {
    panel.style.display = panel.getAttribute('data-surface-panel') === state.surface ? '' : 'none';
  });

  // 모바일 네비게이션 활성 상태
  document.querySelectorAll('.mobile-role-nav [data-surface]').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-surface') === state.surface);
  });
}

function setResult(data) {
  const box = els.resultBox;
  if (!box) return;
  box.style.display = 'block';
  box.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  // 5초 후 자동 숨김
  clearTimeout(box._hideTimer);
  box._hideTimer = setTimeout(() => { box.style.display = 'none'; }, 5000);
}

async function updateAuthState() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  state.session = session || null;
  const loggedIn = Boolean(session?.access_token);

  // 새 셸 authStatusBadge
  if (els.authStatus) {
    els.authStatus.textContent = loggedIn ? (session.user.email || '로그인됨') : '로그인 필요';
    els.authStatus.className = `inline-status ${loggedIn ? 'success' : ''}`;
  }
  if (els.loginBtn) {
    els.loginBtn.textContent = loggedIn ? '로그아웃' : '구글 로그인';
    els.loginBtn.className = loggedIn ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm';
  }
  if (els.refreshBtn) els.refreshBtn.disabled = !loggedIn;
  if (els.refreshNextBtn) els.refreshNextBtn.disabled = !loggedIn;
  if (els.versionSubmitBtn) els.versionSubmitBtn.disabled = !loggedIn;
  if (els.faqSubmitBtn) els.faqSubmitBtn.disabled = !loggedIn;
  if (els.newContentBtn) els.newContentBtn.disabled = !loggedIn;
  if (els.contentSaveBtn) els.contentSaveBtn.disabled = !loggedIn;
}

function renderSummary() {
  const scenario = state.regulation?.scenarioReport || { total: 0, passed: 0, failed: 0 };
  const snapshotHolidayCount = state.snapshots?.holidays?.items?.length || 0;
  const activeVersion = state.versions.find((item) => item.status === 'active') || null;
  const cards = [
    ['활성 버전', activeVersion ? `${activeVersion.year}` : '없음', activeVersion?.title || '활성 버전 필요'],
    ['시나리오', `${scenario.passed}/${scenario.total}`, scenario.failed ? `${scenario.failed}건 재확인` : '전체 통과'],
    ['공휴일 스냅샷', `${snapshotHolidayCount}건`, state.snapshots?.holidays?.refreshed_at ? '저장됨' : '아직 없음'],
    ['승인 대기', `${state.adminDashboard?.pending_approvals ?? 0}건`, '관리자 검토 필요'],
  ];

  const pendingApprovals = state.adminDashboard?.pending_approvals ?? 0;
  const badgeCount = document.getElementById('reviewBadgeCount');
  if (badgeCount) {
    badgeCount.textContent = String(pendingApprovals);
    badgeCount.style.display = pendingApprovals > 0 ? '' : 'none';
  }

  if (!els.summaryGrid) return;
  els.summaryGrid.textContent = '';
  cards.forEach(([label, value, note], i) => {
    const article = document.createElement('article');
    article.className = 'metric-card' + (i === 3 && pendingApprovals > 0 ? ' accent-red' : '');
    const labelEl = document.createElement('div');
    labelEl.className = 'metric-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('div');
    valueEl.className = 'metric-value';
    valueEl.textContent = value;
    const noteEl = document.createElement('div');
    noteEl.className = 'metric-note';
    noteEl.textContent = note;
    article.appendChild(labelEl);
    article.appendChild(valueEl);
    article.appendChild(noteEl);
    els.summaryGrid.appendChild(article);
  });
}

function renderQuickFacts() {
  if (!els.quickFacts) return;
  const facts = state.regulation?.ui_quick_facts || [];
  els.quickFacts.textContent = '';
  if (!facts.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state-title';
    empty.textContent = '규정 요약을 불러오지 못했습니다.';
    els.quickFacts.appendChild(empty);
    return;
  }
  facts.slice(0, 6).forEach((fact) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.style.cursor = 'default';
    const body = document.createElement('div');
    body.className = 'list-item-body';
    const title = document.createElement('div');
    title.className = 'list-item-title';
    title.textContent = fact.label || '';
    const sub = document.createElement('div');
    sub.className = 'list-item-sub';
    sub.textContent = `${fact.value || ''} ${fact.ref ? `(${fact.ref})` : ''}`;
    body.appendChild(title);
    body.appendChild(sub);
    row.appendChild(body);
    els.quickFacts.appendChild(row);
  });
}

function renderChecklist() {
  const activeVersion = state.versions.find((item) => item.status === 'active');
  const checks = [
    {
      title: '활성 버전 확인',
      status: activeVersion ? '정상' : '필요',
      note: activeVersion ? `${activeVersion.year} 버전이 활성 상태입니다.` : '활성 규정 버전을 지정해야 합니다.',
    },
    {
      title: '공휴일 스냅샷 갱신',
      status: state.snapshots?.holidays?.refreshed_at ? '확인' : '필요',
      note: state.snapshots?.holidays?.refreshed_at
        ? `${String(state.snapshots.holidays.refreshed_at).slice(0, 10)} 기준 저장됨`
        : '특별 공휴일 반영 전이면 갱신이 필요합니다.',
    },
    {
      title: 'FAQ 정비',
      status: state.faqs.length ? '확인' : '권장',
      note: state.faqs.length ? `${state.faqs.length}개 FAQ가 등록되어 있습니다.` : '현장 질문을 FAQ로 정리하면 관리자판 설명 부담이 줄어듭니다.',
    },
    {
      title: '규정 시나리오',
      status: (state.regulation?.scenarioReport?.failed || 0) === 0 ? '통과' : '재확인',
      note: (state.regulation?.scenarioReport?.failed || 0) === 0 ? '현재 규정 시나리오가 모두 통과했습니다.' : '규정 계산이나 수당 기준을 다시 확인해야 합니다.',
    },
  ];

  if (!els.opsChecklist) return;
  els.opsChecklist.textContent = '';
  checks.forEach((item) => {
    const isOk = ['정상', '확인', '통과'].includes(item.status);
    const row = document.createElement('div');
    row.className = 'list-item';
    row.style.cursor = 'default';
    const body = document.createElement('div');
    body.className = 'list-item-body';
    const title = document.createElement('div');
    title.className = 'list-item-title';
    title.textContent = item.title;
    const note = document.createElement('div');
    note.className = 'list-item-sub';
    note.textContent = item.note;
    body.appendChild(title);
    body.appendChild(note);
    const badge = document.createElement('span');
    badge.className = `badge ${isOk ? 'badge-green' : 'badge-yellow'}`;
    badge.textContent = item.status;
    row.appendChild(body);
    row.appendChild(badge);
    els.opsChecklist.appendChild(row);
  });
}

function makeListItem(title, sub, badgeText, badgeClass) {
  const row = document.createElement('div');
  row.className = 'list-item';
  row.style.cursor = 'default';
  const body = document.createElement('div');
  body.className = 'list-item-body';
  const titleEl = document.createElement('div');
  titleEl.className = 'list-item-title';
  titleEl.textContent = title;
  body.appendChild(titleEl);
  if (sub) {
    const subEl = document.createElement('div');
    subEl.className = 'list-item-sub';
    subEl.textContent = sub;
    body.appendChild(subEl);
  }
  row.appendChild(body);
  if (badgeText) {
    const badge = document.createElement('span');
    badge.className = `badge ${badgeClass || 'badge-gray'}`;
    badge.textContent = badgeText;
    row.appendChild(badge);
  }
  return row;
}

function renderSnapshots() {
  const metaEl = els.snapshotMeta;
  const listEl = els.snapshotList;
  if (!metaEl && !listEl) return;

  if (!state.snapshots) {
    if (metaEl) { metaEl.textContent = ''; metaEl.appendChild(makeListItem('로그인하면 저장된 공휴일 스냅샷을 볼 수 있습니다.', null, null, null)); }
    if (listEl) { listEl.textContent = ''; listEl.appendChild(makeListItem('공휴일 미리보기를 준비 중입니다.', null, null, null)); }
    return;
  }

  if (metaEl) {
    metaEl.textContent = '';
    [
      ['법정 공휴일', state.snapshots.holidays?.items?.length || 0, state.snapshots.holidays?.refreshed_at],
      ['기념일', state.snapshots.anniversaries?.items?.length || 0, state.snapshots.anniversaries?.refreshed_at],
    ].forEach(([label, count, refreshed]) => {
      const note = refreshed ? String(refreshed).slice(0, 10) + ' 기준' : '미저장';
      metaEl.appendChild(makeListItem(label, note, `${count}건`, refreshed ? 'badge-green' : 'badge-gray'));
    });
  }

  if (listEl) {
    listEl.textContent = '';
    const previewItems = [
      ...(state.snapshots.holidays?.items || []).slice(0, 6),
      ...(state.snapshots.anniversaries?.items || []).slice(0, 4),
    ];
    if (!previewItems.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state-title';
      empty.textContent = '저장된 공휴일 스냅샷이 없습니다.';
      listEl.appendChild(empty);
    } else {
      previewItems.forEach((item) => {
        const kind = item.dateKind || (item.isHoliday ? 'holiday' : 'anniversary') || '';
        listEl.appendChild(makeListItem(item.name || '', String(item.date || ''), kind, 'badge-blue'));
      });
    }
  }
}

function renderVersionOptions() {
  const options = state.versions.map((version) => (
    `<option value="${version.id}">${escapeHtml(`${version.year} · ${version.title}`)}</option>`
  )).join('');
  els.faqVersionSelect.innerHTML = options || '<option value="">버전 없음</option>';
  if (!state.selectedVersionId && state.versions.length) {
    const preferred = state.versions.find((item) => item.status === 'active') || state.versions[0];
    state.selectedVersionId = String(preferred.id);
  }
  els.faqVersionSelect.value = state.selectedVersionId;
}

function renderVersions() {
  if (!els.versionsList) return;
  els.versionsList.textContent = '';

  if (!state.versions.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state-title';
    empty.textContent = '규정 버전이 없습니다.';
    els.versionsList.appendChild(empty);
    return;
  }

  state.versions.forEach((version) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.style.cursor = 'default';

    const body = document.createElement('div');
    body.className = 'list-item-body';

    const title = document.createElement('div');
    title.className = 'list-item-title';
    title.textContent = `${version.year} · ${version.title}`;
    body.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'list-item-sub';
    sub.textContent = `효력일: ${version.effective_date || '미정'} | 생성: ${String(version.created_at || '').slice(0, 10)}`;
    body.appendChild(sub);

    row.appendChild(body);

    // 상태 배지
    const statusClass = version.status === 'active' ? 'badge-green' : version.status === 'archived' ? 'badge-gray' : 'badge-yellow';
    const statusBadge = document.createElement('span');
    statusBadge.className = `badge ${statusClass}`;
    statusBadge.textContent = version.status;
    row.appendChild(statusBadge);

    // 소스 파일 배지
    (version.source_files || []).slice(0, 2).forEach((file) => {
      const fileBadge = document.createElement('span');
      fileBadge.className = 'badge badge-gray';
      fileBadge.textContent = file;
      row.appendChild(fileBadge);
    });

    // 액션 버튼
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:4px;flex-shrink:0';

    [
      { label: '활성화', action: 'activate', cls: 'btn btn-primary btn-sm' },
      { label: '복제', action: 'duplicate', cls: 'btn btn-secondary btn-sm' },
      { label: '보관', action: 'archive', cls: 'btn btn-danger btn-sm' },
    ].forEach(({ label, action, cls }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls;
      btn.textContent = label;
      btn.dataset.versionId = String(version.id);
      btn.dataset.versionAction = action;
      actions.appendChild(btn);
    });

    row.appendChild(actions);
    els.versionsList.appendChild(row);
  });

  els.versionsList.querySelectorAll('[data-version-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const versionId = button.getAttribute('data-version-id');
      const action = button.getAttribute('data-version-action');
      if (!versionId || !action) return;
      if (action === 'duplicate') {
        try {
          const data = await apiJson(`/admin/versions/${versionId}/duplicate`, {
            method: 'POST',
            body: JSON.stringify({}),
          }, true);
          setResult(data);
          await loadAdminData();
        } catch (error) {
          setResult(error instanceof Error ? error.message : String(error));
        }
        return;
      }
      const status = action === 'activate' ? 'active' : 'archived';
      try {
        const data = await apiJson(`/admin/versions/${versionId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }, true);
        setResult(data);
        await loadAdminData();
      } catch (error) {
        setResult(error instanceof Error ? error.message : String(error));
      }
    });
  });
}

function resetFaqForm() {
  state.editingFaqId = '';
  els.faqIdInput.value = '';
  els.faqCategoryInput.value = '';
  els.faqQuestionInput.value = '';
  els.faqAnswerInput.value = '';
  els.faqRefInput.value = '';
  els.faqPublishedInput.checked = false;
}

function renderFaqs() {
  if (!els.faqList) return;
  els.faqList.textContent = '';

  if (!state.selectedVersionId) {
    const p = document.createElement('p');
    p.className = 'empty-state-title';
    p.textContent = 'FAQ를 볼 버전을 선택해 주세요.';
    els.faqList.appendChild(p);
    return;
  }
  if (!state.faqs.length) {
    const p = document.createElement('p');
    p.className = 'empty-state-title';
    p.textContent = '등록된 FAQ가 없습니다.';
    els.faqList.appendChild(p);
    return;
  }

  state.faqs.forEach((faq) => {
    const row = document.createElement('div');
    row.className = 'list-item';

    const body = document.createElement('div');
    body.className = 'list-item-body';

    const title = document.createElement('div');
    title.className = 'list-item-title';
    title.textContent = faq.question;
    body.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'list-item-sub';
    sub.textContent = faq.answer;
    body.appendChild(sub);

    row.appendChild(body);

    const catBadge = document.createElement('span');
    catBadge.className = 'badge badge-blue';
    catBadge.textContent = faq.category;
    row.appendChild(catBadge);

    const pubBadge = document.createElement('span');
    pubBadge.className = `badge ${faq.is_published ? 'badge-green' : 'badge-yellow'}`;
    pubBadge.textContent = faq.is_published ? 'published' : 'draft';
    row.appendChild(pubBadge);

    if (faq.article_ref) {
      const refBadge = document.createElement('span');
      refBadge.className = 'badge badge-gray';
      refBadge.textContent = faq.article_ref;
      row.appendChild(refBadge);
    }

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.dataset.faqId = String(faq.id);
    editBtn.textContent = '수정';
    row.appendChild(editBtn);

    els.faqList.appendChild(row);
  });

  els.faqList.querySelectorAll('[data-faq-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const faq = state.faqs.find((item) => String(item.id) === button.getAttribute('data-faq-id'));
      if (!faq) return;
      state.editingFaqId = String(faq.id);
      els.faqIdInput.value = String(faq.id);
      els.faqCategoryInput.value = faq.category || '';
      els.faqQuestionInput.value = faq.question || '';
      els.faqAnswerInput.value = faq.answer || '';
      els.faqRefInput.value = faq.article_ref || '';
      els.faqPublishedInput.checked = Boolean(faq.is_published);
      state.surface = 'faq';
      syncSurfaceNav();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function renderScenarios() {
  // 새 셸에서는 scenarioSummary/scenarioList가 없으므로 null-safe 처리
  if (!els.scenarioSummary && !els.scenarioList) return;

  const scenario = state.regulation?.scenarioReport || { total: 0, passed: 0, failed: 0, items: [] };

  if (els.scenarioSummary) {
    els.scenarioSummary.textContent = '';
    [
      ['전체', String(scenario.total), '규정 시나리오 수'],
      ['통과', String(scenario.passed), '현재 기준 통과'],
      ['실패', String(scenario.failed), '재검토 필요'],
      ['기준 연도', String(state.year), '조회 기준'],
    ].forEach(([label, value, note]) => {
      const article = document.createElement('article');
      article.className = 'metric-card';
      const labelEl = document.createElement('div');
      labelEl.className = 'metric-label';
      labelEl.textContent = label;
      const valueEl = document.createElement('div');
      valueEl.className = 'metric-value';
      valueEl.textContent = value;
      const noteEl = document.createElement('div');
      noteEl.className = 'metric-note';
      noteEl.textContent = note;
      article.appendChild(labelEl);
      article.appendChild(valueEl);
      article.appendChild(noteEl);
      els.scenarioSummary.appendChild(article);
    });
  }

  if (els.scenarioList) {
    els.scenarioList.textContent = '';
    if (!scenario.items?.length) {
      const p = document.createElement('p');
      p.className = 'empty-state-title';
      p.textContent = '시나리오 결과가 없습니다.';
      els.scenarioList.appendChild(p);
    } else {
      scenario.items.forEach((item) => {
        const badgeClass = item.passed ? 'badge-green' : 'badge-red';
        const row = makeListItem(
          item.title || item.id,
          `${item.category || 'scenario'} | ${JSON.stringify(item.actual || {})}`,
          item.passed ? 'PASS' : 'FAIL',
          badgeClass
        );
        row.style.cursor = 'default';
        els.scenarioList.appendChild(row);
      });
    }
  }
}

function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function renderContentEntries() {
  if (!els.contentList) return;
  if (!state.contentEntries.length) {
    els.contentList.textContent = '';
    const emptyEl = document.createElement('p');
    emptyEl.className = 'empty-state-title';
    emptyEl.textContent = '등록된 콘텐츠가 없습니다.';
    els.contentList.appendChild(emptyEl);
    return;
  }

  const filtered = state.contentFilter === 'all'
    ? state.contentEntries
    : state.contentEntries.filter(function(e) { return e.status === state.contentFilter; });

  els.contentList.textContent = '';
  if (!filtered.length) {
    var emptyEl = document.createElement('p');
    emptyEl.className = 'empty-state-title';
    emptyEl.textContent = '"' + state.contentFilter + '" 상태의 콘텐츠가 없습니다.';
    els.contentList.appendChild(emptyEl);
    return;
  }

  filtered.forEach(function(entry) {
    var row = document.createElement('div');
    row.className = 'list-item';
    row.dataset.contentId = String(entry.id);

    var body = document.createElement('div');
    body.className = 'list-item-body';
    var titleEl = document.createElement('div');
    titleEl.className = 'list-item-title';
    titleEl.textContent = entry.title || '제목 없음';
    var subEl = document.createElement('div');
    subEl.className = 'list-item-sub';
    subEl.textContent = (entry.content_type || '') + (entry.slug ? ' · ' + entry.slug : '') + ' · ' + formatDateTime(entry.updated_at || entry.created_at);
    body.appendChild(titleEl);
    body.appendChild(subEl);
    row.appendChild(body);

    var statusClass = entry.status === 'published' ? 'badge-green' : entry.status === 'draft' ? 'badge-yellow' : 'badge-gray';
    var statusBadge = document.createElement('span');
    statusBadge.className = 'badge ' + statusClass;
    statusBadge.textContent = entry.status;
    row.appendChild(statusBadge);

    var typeBadge = document.createElement('span');
    typeBadge.className = 'badge badge-blue';
    typeBadge.textContent = entry.content_type || '';
    row.appendChild(typeBadge);

    els.contentList.appendChild(row);
  });
}

function renderReviewList() {
  if (!els.reviewList) return;
  var filtered = state.reviewFilter === 'all'
    ? state.approvals
    : state.approvals.filter(function(a) { return a.status === state.reviewFilter; });

  var pendingCount = state.approvals.filter(function(a) { return a.status === 'pending'; }).length;
  if (els.reviewBadge) {
    els.reviewBadge.textContent = pendingCount + '건 대기';
  }

  els.reviewList.textContent = '';
  if (!filtered.length) {
    var emptyEl = document.createElement('p');
    emptyEl.className = 'empty-state-title';
    emptyEl.textContent = state.reviewFilter === 'pending' ? '대기중인 검토 항목이 없습니다.' : '해당 상태의 검토 항목이 없습니다.';
    els.reviewList.appendChild(emptyEl);
    return;
  }

  filtered.forEach(function(task) {
    var statusBadgeClass = task.status === 'pending' ? 'badge-yellow' : task.status === 'approved' ? 'badge-green' : 'badge-red';
    var subParts = ['요청: ' + formatDateTime(task.created_at)];
    if (task.decided_at) subParts.push('결정: ' + formatDateTime(task.decided_at));
    if (task.decision_note) subParts.push('사유: ' + task.decision_note);
    var row = makeListItem(
      '검토 #' + task.id + ' — 콘텐츠 #' + task.entry_id,
      subParts.join(' | '),
      task.status,
      statusBadgeClass
    );
    row.style.cursor = 'default';
    els.reviewList.appendChild(row);
  });
}

function renderAuditLogs() {
  if (!els.auditLogList) return;
  els.auditLogList.textContent = '';

  if (!state.auditLogs.length) {
    var emptyEl = document.createElement('p');
    emptyEl.className = 'empty-state-title';
    emptyEl.textContent = '감사 로그가 없습니다.';
    els.auditLogList.appendChild(emptyEl);
    return;
  }

  state.auditLogs.slice(0, 100).forEach(function(log) {
    var row = makeListItem(
      log.action || '',
      (log.entity_type || '') + ' #' + String(log.entity_id || '') + ' | ' + formatDateTime(log.created_at),
      log.actor_role || 'unknown',
      'badge-gray'
    );
    row.style.cursor = 'default';
    els.auditLogList.appendChild(row);
  });
}

function resetContentForm() {
  state.editingContentId = '';
  state.contentDetail = null;
  if (els.contentIdInput) els.contentIdInput.value = '';
  if (els.contentTypeSelect) els.contentTypeSelect.value = 'notice';
  if (els.contentTitleInput) els.contentTitleInput.value = '';
  if (els.contentSlugInput) els.contentSlugInput.value = '';
  if (els.contentSummaryInput) els.contentSummaryInput.value = '';
  if (els.contentBodyInput) els.contentBodyInput.value = '';
  if (els.contentStatusActions) els.contentStatusActions.style.display = 'none';
  if (els.contentRevisions) els.contentRevisions.textContent = '';
}

async function loadContentDetail(contentId) {
  try {
    const data = await apiJson('/admin/content/' + contentId, {}, true);
    state.contentDetail = data.result || null;
    state.editingContentId = String(contentId);

    var entry = state.contentDetail.entry;
    var revisions = state.contentDetail.revisions || [];
    var latestRevision = revisions[0] || null;

    if (els.contentIdInput) els.contentIdInput.value = String(entry.id);
    if (els.contentTypeSelect) els.contentTypeSelect.value = entry.content_type || 'notice';
    if (els.contentTitleInput) els.contentTitleInput.value = entry.title || '';
    if (els.contentSlugInput) els.contentSlugInput.value = entry.slug || '';
    if (els.contentBodyInput) els.contentBodyInput.value = latestRevision ? (latestRevision.body || '') : '';
    if (els.contentSummaryInput) els.contentSummaryInput.value = '';

    if (els.contentStatusActions) {
      els.contentStatusActions.style.display = 'flex';
    }

    renderContentRevisions(revisions);
  } catch (error) {
    setResult(error instanceof Error ? error.message : String(error));
  }
}

function renderContentRevisions(revisions) {
  if (!els.contentRevisions) return;
  els.contentRevisions.textContent = '';

  if (!revisions || !revisions.length) return;

  var heading = document.createElement('div');
  heading.className = 'card-header';
  var h3 = document.createElement('h3');
  h3.className = 'card-title';
  h3.textContent = 'Revision History (' + revisions.length + ')';
  heading.appendChild(h3);
  els.contentRevisions.appendChild(heading);

  revisions.forEach(function(rev) {
    var statusBadgeClass = rev.status === 'approved' ? 'badge-green' : rev.status === 'rejected' ? 'badge-red' : 'badge-yellow';
    var row = makeListItem(
      'Rev #' + rev.revision_number,
      formatDateTime(rev.created_at) + (rev.summary ? ' | ' + rev.summary : ''),
      rev.status || 'draft',
      statusBadgeClass
    );
    row.style.cursor = 'default';
    els.contentRevisions.appendChild(row);
  });
}

async function saveContent(event) {
  event.preventDefault();
  try {
    var title = els.contentTitleInput.value.trim();
    var body = els.contentBodyInput.value.trim();
    if (!title || !body) {
      setResult('제목과 본문을 입력해야 합니다.');
      return;
    }

    if (state.editingContentId) {
      var revData = await apiJson('/admin/content/' + state.editingContentId + '/revisions', {
        method: 'POST',
        body: JSON.stringify({
          body: body,
          summary: els.contentSummaryInput.value.trim() || null,
        }),
      }, true);
      setResult(revData);
      await loadContentDetail(state.editingContentId);
    } else {
      var createData = await apiJson('/admin/content', {
        method: 'POST',
        body: JSON.stringify({
          contentType: els.contentTypeSelect.value,
          title: title,
          slug: els.contentSlugInput.value.trim() || undefined,
          body: body,
          summary: els.contentSummaryInput.value.trim() || undefined,
        }),
      }, true);
      setResult(createData);
      state.editingContentId = String(createData.result.entry.id);
      await loadContentDetail(state.editingContentId);
    }

    await loadContentEntries();
    renderContentEntries();
  } catch (error) {
    setResult(error instanceof Error ? error.message : String(error));
  }
}

// Valid transitions: draft -> review, review -> published, published -> archived, any -> draft
async function changeContentStatus(newStatus) {
  if (!state.editingContentId) {
    setResult('콘텐츠를 먼저 선택해주세요.');
    return;
  }
  try {
    if (newStatus === 'review') {
      var reqData = await apiJson('/admin/content/' + state.editingContentId + '/request-review', {
        method: 'POST',
        body: JSON.stringify({}),
      }, true);
      setResult(reqData);
    } else {
      var statusData = await apiJson('/admin/content/' + state.editingContentId + '/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      }, true);
      setResult(statusData);
    }
    await loadContentDetail(state.editingContentId);
    await loadContentEntries();
    renderContentEntries();
  } catch (error) {
    setResult(error instanceof Error ? error.message : String(error));
  }
}

// ── 데이터 건강 모니터링 카드 ──
function renderHealthMonitor() {
  if (!els.healthGrid || !window.HealthMonitor) return;
  var result = window.HealthMonitor.scan();
  var statusIcon = { ok: '\u2705', warn: '\u26A0\uFE0F', error: '\u274C' };
  var accentClass = { ok: ' accent-green', warn: '', error: ' accent-red' };

  var cards = [
    { label: '\uC885\uD569 \uC810\uC218', value: result.score + '%', note: result.overall === 'ok' ? '\uC815\uC0C1' : result.overall === 'warn' ? '\uD655\uC778 \uD544\uC694' : '\uC870\uCE58 \uD544\uC694', status: result.overall },
    { label: '\uD504\uB85C\uD544 \uC644\uC804\uC131', value: result.profile.label, note: result.profile.status === 'ok' ? '\uD544\uC218 \uD56D\uBAA9 \uC644\uB8CC' : result.profile.missing.length + '\uAC74 \uB204\uB77D', status: result.profile.status },
    { label: '\uC2DC\uAC04\uC678 \uC815\uD569\uC131', value: result.overtime.label, note: result.overtime.issues.length > 0 ? result.overtime.issues.length + '\uAC74 \uC774\uC0C1' : '\uC815\uC0C1', status: result.overtime.status },
    { label: '\uB3D9\uAE30\uD654 \uC0C1\uD0DC', value: result.sync.label, note: result.sync.status === 'ok' ? '\uCD5C\uADFC \uB3D9\uAE30\uD654' : result.sync.status === 'warn' ? '\uC7A5\uAE30 \uBBF8\uC2E4\uD589' : '\uD655\uC778 \uD544\uC694', status: result.sync.status },
    { label: '\uC0C1\uC218 \uC720\uD6A8\uC131', value: result.constants.label, note: result.constants.issues.length > 0 ? result.constants.issues.length + '\uAC74 \uC774\uC0C1' : '\uC815\uC0C1', status: result.constants.status },
  ];

  els.healthGrid.textContent = '';
  cards.forEach(function (card) {
    var article = document.createElement('article');
    article.className = 'metric-card' + (accentClass[card.status] || '');
    var labelEl = document.createElement('div');
    labelEl.className = 'metric-label';
    labelEl.textContent = statusIcon[card.status] + ' ' + card.label;
    var valueEl = document.createElement('div');
    valueEl.className = 'metric-value';
    valueEl.textContent = card.value;
    var noteEl = document.createElement('div');
    noteEl.className = 'metric-note';
    noteEl.textContent = card.note;
    article.appendChild(labelEl);
    article.appendChild(valueEl);
    article.appendChild(noteEl);
    els.healthGrid.appendChild(article);
  });
}

// ── 데이터 무결성 경고 ──
var _dismissedAlerts = new Set();

function renderHealthAlerts() {
  if (!els.healthAlerts || !window.HealthMonitor) return;
  var alerts = window.HealthMonitor.getAlerts();

  // 이미 닫은 알림 제외
  alerts = alerts.filter(function (a) { return !_dismissedAlerts.has(a.title); });

  els.healthAlerts.textContent = '';
  if (alerts.length === 0) {
    els.healthAlerts.style.display = 'none';
    return;
  }
  els.healthAlerts.style.display = '';

  var severityClass = { error: 'alert-error', warn: 'alert-warn', info: 'alert-info' };

  alerts.forEach(function (alert) {
    var div = document.createElement('div');
    div.className = 'alert ' + (severityClass[alert.severity] || 'alert-info');
    div.style.cssText = 'display:flex;align-items:flex-start;gap:10px;cursor:pointer;';
    div.title = '\uD074\uB9AD\uD558\uC5EC \uB2EB\uAE30';

    var textWrap = document.createElement('div');
    textWrap.style.flex = '1';

    var titleEl = document.createElement('strong');
    titleEl.textContent = alert.title;

    var msgEl = document.createElement('div');
    msgEl.style.cssText = 'font-size:13px;margin-top:2px;';
    msgEl.textContent = alert.message;

    if (alert.action) {
      var actionEl = document.createElement('div');
      actionEl.style.cssText = 'font-size:12px;margin-top:4px;opacity:0.8;';
      actionEl.textContent = '\u2192 ' + alert.action;
      textWrap.appendChild(titleEl);
      textWrap.appendChild(msgEl);
      textWrap.appendChild(actionEl);
    } else {
      textWrap.appendChild(titleEl);
      textWrap.appendChild(msgEl);
    }

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = 'background:none;border:none;font-size:16px;cursor:pointer;color:inherit;opacity:0.6;padding:0;line-height:1;';
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _dismissedAlerts.add(alert.title);
      renderHealthAlerts();
    });

    div.appendChild(textWrap);
    div.appendChild(closeBtn);
    els.healthAlerts.appendChild(div);
  });
}

function renderAll() {
  renderSummary();
  renderQuickFacts();
  renderChecklist();
  renderSnapshots();
  renderVersionOptions();
  renderVersions();
  renderFaqs();
  renderScenarios();
  renderContentEntries();
  renderReviewList();
  renderAuditLogs();
  syncSurfaceNav();
  renderHealthMonitor();
  renderHealthAlerts();
}

async function loadPublicData() {
  try {
    const data = await apiJson(`/data/nurse-regulation?year=${state.year}`);
    state.regulation = data;
  } catch (_) {
    state.regulation = null;
  }
}

async function loadFaqs() {
  if (!state.session?.access_token || !state.selectedVersionId) {
    state.faqs = [];
    renderFaqs();
    return;
  }
  const data = await apiJson(`/admin/faqs?versionId=${state.selectedVersionId}`, {}, true);
  state.faqs = data.results || [];
}

async function loadContentEntries() {
  if (!state.session?.access_token) {
    state.contentEntries = [];
    renderContentEntries();
    return;
  }
  try {
    const data = await apiJson('/admin/content', {}, true);
    state.contentEntries = data.results || [];
  } catch (_) {
    state.contentEntries = [];
  }
}

async function loadApprovals() {
  if (!state.session?.access_token) {
    state.approvals = [];
    renderReviewList();
    return;
  }
  try {
    const data = await apiJson('/admin/approvals', {}, true);
    state.approvals = data.results || [];
  } catch (_) {
    state.approvals = [];
  }
}

async function loadAuditLogs() {
  if (!state.session?.access_token) {
    state.auditLogs = [];
    renderAuditLogs();
    return;
  }
  try {
    const data = await apiJson('/admin/audit-logs', {}, true);
    state.auditLogs = data.results || [];
  } catch (_) {
    state.auditLogs = [];
  }
}

async function loadAdminData() {
  if (!state.session?.access_token) {
    state.adminDashboard = null;
    state.versions = [];
    state.snapshots = null;
    state.faqs = [];
    state.contentEntries = [];
    state.approvals = [];
    state.auditLogs = [];
    renderAll();
    return;
  }

  const [dashboardData, versionsData, snapshotsData] = await Promise.all([
    apiJson('/admin/dashboard', {}, true),
    apiJson('/admin/versions', {}, true),
    apiJson(`/admin/calendar/snapshots?year=${state.year}`, {}, true),
  ]);

  state.adminDashboard = dashboardData.result;
  state.versions = versionsData.results || [];
  state.snapshots = snapshotsData.result || null;

  if (!state.selectedVersionId || !state.versions.some((item) => String(item.id) === String(state.selectedVersionId))) {
    const preferred = state.versions.find((item) => item.status === 'active') || state.versions[0] || null;
    state.selectedVersionId = preferred ? String(preferred.id) : '';
  }

  await Promise.all([
    loadFaqs(),
    loadContentEntries(),
    loadApprovals(),
    loadAuditLogs(),
  ]);
  renderAll();
}

async function loadWorkspace() {
  try {
    await loadPublicData();
    await loadAdminData();
    renderAll();
  } catch (error) {
    setResult(error instanceof Error ? error.message : String(error));
  }
}

async function postRefresh(year) {
  const data = await apiJson('/admin/calendar/refresh', {
    method: 'POST',
    body: JSON.stringify({ year }),
  }, true);
  setResult(data);
  await loadAdminData();
}

async function createVersion(event) {
  event.preventDefault();
  try {
    const sourceFiles = els.versionSourceInput.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const data = await apiJson('/admin/versions', {
      method: 'POST',
      body: JSON.stringify({
        year: Number(els.versionYearInput.value),
        title: els.versionTitleInput.value.trim(),
        effectiveDate: els.versionEffectiveInput.value || null,
        sourceFiles,
      }),
    }, true);
    setResult(data);
    els.versionTitleInput.value = '';
    els.versionEffectiveInput.value = '';
    els.versionSourceInput.value = '';
    await loadAdminData();
  } catch (error) {
    setResult(error instanceof Error ? error.message : String(error));
  }
}

async function saveFaq(event) {
  event.preventDefault();
  if (!state.selectedVersionId) {
    setResult('FAQ를 저장할 버전을 먼저 선택해 주세요.');
    return;
  }

  try {
    const payload = {
      versionId: Number(state.selectedVersionId),
      category: els.faqCategoryInput.value.trim(),
      question: els.faqQuestionInput.value.trim(),
      answer: els.faqAnswerInput.value.trim(),
      articleRef: els.faqRefInput.value.trim() || null,
      isPublished: els.faqPublishedInput.checked,
      sortOrder: 0,
    };

    const data = state.editingFaqId
      ? await apiJson(`/admin/faqs/${state.editingFaqId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }, true)
      : await apiJson('/admin/faqs', {
          method: 'POST',
          body: JSON.stringify(payload),
        }, true);

    setResult(data);
    resetFaqForm();
    await loadFaqs();
    renderAll();
  } catch (error) {
    setResult(error instanceof Error ? error.message : String(error));
  }
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

els.yearInput.addEventListener('change', async (event) => {
  state.year = Number(event.target.value);
  await loadWorkspace();
});

els.refreshBtn.addEventListener('click', async () => {
  await postRefresh(state.year);
});

els.refreshNextBtn.addEventListener('click', async () => {
  await postRefresh(state.year);
  await postRefresh(state.year + 1);
});

els.versionForm.addEventListener('submit', createVersion);
els.faqForm.addEventListener('submit', saveFaq);
els.faqResetBtn.addEventListener('click', resetFaqForm);

els.faqVersionSelect.addEventListener('change', async (event) => {
  state.selectedVersionId = event.target.value;
  resetFaqForm();
  await loadFaqs();
  renderAll();
});

// 사이드바 및 모바일 뷰 전환
document.querySelectorAll('[data-surface]').forEach((button) => {
  button.addEventListener('click', () => {
    state.surface = button.getAttribute('data-surface') || 'dashboard';
    syncSurfaceNav();
  });
});

// 이전 수평 탭 호환
els.surfaceNav?.querySelectorAll('[data-surface]').forEach((button) => {
  button.addEventListener('click', () => {
    state.surface = button.getAttribute('data-surface') || 'dashboard';
    syncSurfaceNav();
  });
});

els.contentFilterBar?.querySelectorAll('[data-content-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.contentFilter = button.getAttribute('data-content-filter') || 'all';
    els.contentFilterBar.querySelectorAll('[data-content-filter]').forEach((b) => {
      b.className = b === button ? 'btn btn-secondary btn-sm active' : 'btn btn-ghost btn-sm';
    });
    renderContentEntries();
  });
});

els.reviewFilterBar?.querySelectorAll('[data-review-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.reviewFilter = button.getAttribute('data-review-filter') || 'pending';
    els.reviewFilterBar.querySelectorAll('[data-review-filter]').forEach((b) => {
      b.className = b === button ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm';
    });
    renderReviewList();
  });
});

if (els.contentEditorForm) {
  els.contentEditorForm.addEventListener('submit', saveContent);
}

if (els.contentResetBtn) {
  els.contentResetBtn.addEventListener('click', resetContentForm);
}

if (els.newContentBtn) {
  els.newContentBtn.addEventListener('click', () => {
    resetContentForm();
    state.surface = 'content';
    syncSurfaceNav();
    els.contentTitleInput?.focus();
  });
}

if (els.contentStatusActions) {
  els.contentStatusActions.querySelectorAll('[data-content-status]').forEach((button) => {
    button.addEventListener('click', () => {
      var newStatus = button.getAttribute('data-content-status');
      if (newStatus) changeContentStatus(newStatus);
    });
  });
}

if (els.contentList) {
  els.contentList.addEventListener('click', (event) => {
    var row = event.target.closest('[data-content-id]');
    if (!row) return;
    var contentId = row.dataset.contentId;
    if (contentId) loadContentDetail(contentId);
  });
}

async function initApp() {
  try {
    // 서버에서 publishable 클라이언트 설정을 가져와 Supabase 초기화
    const configRes = await fetch(`${API_BASE}/config`);
    if (configRes.ok) {
      const config = await configRes.json();
      if (window.supabase?.createClient && config.supabaseUrl && config.supabaseAnonKey) {
        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      }
    }
  } catch (_) {
    // config 로드 실패 시 fallback(비로그인) 모드로 동작
  }

  supabaseClient.auth.onAuthStateChange(async () => {
    await updateAuthState();
    await loadAdminData();
  });

  await updateAuthState();
  await loadWorkspace();
}

initApp().catch((error) => {
  setResult(error instanceof Error ? error.message : String(error));
});

// ── 건강 모니터링 자동 갱신 (30초) ──
setInterval(function () {
  if (state.surface === 'dashboard' && window.HealthMonitor) {
    window.HealthMonitor.invalidateCache();
    renderHealthMonitor();
    renderHealthAlerts();
  }
}, 30000);
