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
  authStatus: document.getElementById('authStatus'),
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
  scenarioSummary: document.getElementById('scenarioSummary'),
  scenarioList: document.getElementById('scenarioList'),
  resultBox: document.getElementById('resultBox'),
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
};

els.yearInput.value = String(state.year);
els.versionYearInput.value = String(state.year + 1);

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
  els.surfaceNav?.querySelectorAll('[data-surface]').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-surface') === state.surface);
  });
}

async function updateAuthState() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  state.session = session || null;
  const loggedIn = Boolean(session?.access_token);
  els.authStatus.textContent = loggedIn ? `${session.user.email || '로그인됨'}` : '로그인 필요';
  els.loginBtn.textContent = loggedIn ? '로그인 완료' : '구글 로그인';
  els.loginBtn.disabled = loggedIn;
  els.refreshBtn.disabled = !loggedIn;
  els.refreshNextBtn.disabled = !loggedIn;
  els.versionSubmitBtn.disabled = !loggedIn;
  els.faqSubmitBtn.disabled = !loggedIn;
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

  els.summaryGrid.innerHTML = cards.map(([label, value, note]) => `
    <article class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(note)}</span>
    </article>
  `).join('');
}

function renderQuickFacts() {
  const facts = state.regulation?.ui_quick_facts || [];
  if (!facts.length) {
    els.quickFacts.innerHTML = '<div class="empty-copy">규정 요약을 불러오지 못했습니다.</div>';
    return;
  }

  els.quickFacts.innerHTML = facts.slice(0, 6).map((fact) => `
    <div class="row">
      <strong>${escapeHtml(fact.label || '')}</strong>
      <span>${escapeHtml(fact.value || '')}</span>
      <span>${escapeHtml(fact.ref || '')}</span>
    </div>
  `).join('');
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

  els.opsChecklist.innerHTML = checks.map((item) => `
    <div class="check-row">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.status)}</span>
      <span>${escapeHtml(item.note)}</span>
    </div>
  `).join('');
}

function renderSnapshots() {
  if (!state.snapshots) {
    els.snapshotMeta.innerHTML = '<div class="empty-copy">로그인하면 저장된 공휴일 스냅샷을 볼 수 있습니다.</div>';
    els.snapshotList.innerHTML = '<div class="empty-copy">공휴일 미리보기를 준비 중입니다.</div>';
    return;
  }

  const rows = [
    ['법정 공휴일', `${state.snapshots.holidays?.items?.length || 0}건`, state.snapshots.holidays?.refreshed_at ? String(state.snapshots.holidays.refreshed_at).slice(0, 10) : '미저장'],
    ['기념일', `${state.snapshots.anniversaries?.items?.length || 0}건`, state.snapshots.anniversaries?.refreshed_at ? String(state.snapshots.anniversaries.refreshed_at).slice(0, 10) : '미저장'],
  ];

  els.snapshotMeta.innerHTML = rows.map(([label, value, note]) => `
    <div class="snapshot-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
      <span>${escapeHtml(note)}</span>
    </div>
  `).join('');

  const previewItems = [
    ...(state.snapshots.holidays?.items || []).slice(0, 6),
    ...(state.snapshots.anniversaries?.items || []).slice(0, 4),
  ];

  els.snapshotList.innerHTML = previewItems.length
    ? previewItems.map((item) => `
      <div class="snapshot-row">
        <strong>${escapeHtml(item.name || '')}</strong>
        <span>${escapeHtml(String(item.date || ''))}</span>
        <span>${escapeHtml(item.dateKind || (item.isHoliday ? 'holiday' : 'anniversary') || '')}</span>
      </div>
    `).join('')
    : '<div class="empty-copy">저장된 공휴일 스냅샷이 없습니다.</div>';
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
  if (!state.versions.length) {
    els.versionsList.innerHTML = '<div class="empty-copy">규정 버전이 없습니다.</div>';
    return;
  }

  els.versionsList.innerHTML = state.versions.map((version) => `
    <div class="version-row">
      <strong>${escapeHtml(`${version.year} · ${version.title}`)}</strong>
      <span>${escapeHtml(version.effective_date || '효력일 미정')}</span>
      <span>${escapeHtml(`created ${String(version.created_at || '').slice(0, 10)}`)}</span>
      <div class="tag-row">
        <span class="tag ${escapeHtml(version.status)}">${escapeHtml(version.status)}</span>
        ${(version.source_files || []).slice(0, 3).map((file) => `<span class="tag">${escapeHtml(file)}</span>`).join('')}
      </div>
      <div class="version-actions">
        <button class="mini-btn primary" type="button" data-version-id="${version.id}" data-version-action="activate">활성화</button>
        <button class="mini-btn edit" type="button" data-version-id="${version.id}" data-version-action="duplicate">복제</button>
        <button class="mini-btn warn" type="button" data-version-id="${version.id}" data-version-action="archive">보관</button>
      </div>
    </div>
  `).join('');

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
  if (!state.selectedVersionId) {
    els.faqList.innerHTML = '<div class="empty-copy">FAQ를 볼 버전을 선택해 주세요.</div>';
    return;
  }
  if (!state.faqs.length) {
    els.faqList.innerHTML = '<div class="empty-copy">등록된 FAQ가 없습니다.</div>';
    return;
  }

  els.faqList.innerHTML = state.faqs.map((faq) => `
    <div class="faq-row">
      <strong>${escapeHtml(faq.question)}</strong>
      <span>${escapeHtml(faq.answer)}</span>
      <div class="tag-row">
        <span class="tag">${escapeHtml(faq.category)}</span>
        <span class="tag ${faq.is_published ? 'active' : 'draft'}">${escapeHtml(faq.is_published ? 'published' : 'draft')}</span>
        ${faq.article_ref ? `<span class="tag">${escapeHtml(faq.article_ref)}</span>` : ''}
      </div>
      <div class="faq-actions">
        <button class="mini-btn edit" type="button" data-faq-id="${faq.id}">수정</button>
      </div>
    </div>
  `).join('');

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
  const scenario = state.regulation?.scenarioReport || { total: 0, passed: 0, failed: 0, items: [] };
  const cards = [
    ['전체', String(scenario.total), '규정 시나리오 수'],
    ['통과', String(scenario.passed), '현재 기준 통과'],
    ['실패', String(scenario.failed), '재검토 필요'],
    ['기준 연도', String(state.year), '조회 기준'],
  ];
  els.scenarioSummary.innerHTML = cards.map(([label, value, note]) => `
    <article class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(note)}</span>
    </article>
  `).join('');

  els.scenarioList.innerHTML = scenario.items?.length
    ? scenario.items.map((item) => `
      <div class="scenario-row ${item.passed ? 'pass' : 'fail'}">
        <strong>${escapeHtml(item.title || item.id)}</strong>
        <span>${escapeHtml(`${item.category || 'scenario'} · ${item.passed ? 'PASS' : 'FAIL'}`)}</span>
        <span>${escapeHtml(JSON.stringify(item.actual || {}))}</span>
      </div>
    `).join('')
    : '<div class="empty-copy">시나리오 결과가 없습니다.</div>';
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
    const empty = document.createElement('div');
    empty.className = 'empty-copy';
    empty.textContent = '등록된 콘텐츠가 없습니다.';
    els.contentList.appendChild(empty);
    return;
  }

  const filtered = state.contentFilter === 'all'
    ? state.contentEntries
    : state.contentEntries.filter(function(e) { return e.status === state.contentFilter; });

  els.contentList.textContent = '';
  if (!filtered.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-copy';
    empty.textContent = '"' + state.contentFilter + '" 상태의 콘텐츠가 없습니다.';
    els.contentList.appendChild(empty);
    return;
  }

  filtered.forEach(function(entry) {
    var row = document.createElement('div');
    row.className = 'version-row';
    row.dataset.contentId = String(entry.id);
    var title = document.createElement('strong');
    title.textContent = entry.title || '제목 없음';
    row.appendChild(title);
    var meta = document.createElement('span');
    meta.textContent = (entry.content_type || '') + ' | ' + (entry.slug || '');
    row.appendChild(meta);
    var dateSpan = document.createElement('span');
    dateSpan.textContent = formatDateTime(entry.updated_at || entry.created_at);
    row.appendChild(dateSpan);
    var tagRow = document.createElement('div');
    tagRow.className = 'tag-row';
    var statusTag = document.createElement('span');
    statusTag.className = 'tag ' + (entry.status === 'published' ? 'active' : entry.status === 'draft' ? 'draft' : '');
    statusTag.textContent = entry.status;
    tagRow.appendChild(statusTag);
    var typeTag = document.createElement('span');
    typeTag.className = 'tag';
    typeTag.textContent = entry.content_type || '';
    tagRow.appendChild(typeTag);
    row.appendChild(tagRow);
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
    var empty = document.createElement('div');
    empty.className = 'empty-copy';
    empty.textContent = state.reviewFilter === 'pending' ? '대기중인 검토 항목이 없습니다.' : '해당 상태의 검토 항목이 없습니다.';
    els.reviewList.appendChild(empty);
    return;
  }

  filtered.forEach(function(task) {
    var row = document.createElement('div');
    row.className = 'version-row';
    var title = document.createElement('strong');
    title.textContent = '검토 #' + task.id + ' -- 콘텐츠 #' + task.entry_id;
    row.appendChild(title);
    var reqSpan = document.createElement('span');
    reqSpan.textContent = '요청: ' + formatDateTime(task.created_at);
    row.appendChild(reqSpan);
    if (task.decided_at) {
      var decSpan = document.createElement('span');
      decSpan.textContent = '결정: ' + formatDateTime(task.decided_at);
      row.appendChild(decSpan);
    }
    if (task.decision_note) {
      var noteSpan = document.createElement('span');
      noteSpan.textContent = '사유: ' + task.decision_note;
      row.appendChild(noteSpan);
    }
    var tagRow = document.createElement('div');
    tagRow.className = 'tag-row';
    var tag = document.createElement('span');
    var statusClass = task.status === 'pending' ? 'draft' : task.status === 'approved' ? 'active' : 'archived';
    tag.className = 'tag ' + statusClass;
    tag.textContent = task.status;
    tagRow.appendChild(tag);
    row.appendChild(tagRow);
    els.reviewList.appendChild(row);
  });
}

function renderAuditLogs() {
  if (!els.auditLogList) return;
  els.auditLogList.textContent = '';

  if (!state.auditLogs.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-copy';
    empty.textContent = '감사 로그가 없습니다.';
    els.auditLogList.appendChild(empty);
    return;
  }

  state.auditLogs.slice(0, 100).forEach(function(log) {
    var row = document.createElement('div');
    row.className = 'row';
    var action = document.createElement('strong');
    action.textContent = log.action || '';
    row.appendChild(action);
    var entity = document.createElement('span');
    entity.textContent = (log.entity_type || '') + ' #' + String(log.entity_id || '');
    row.appendChild(entity);
    var time = document.createElement('span');
    time.textContent = formatDateTime(log.created_at) + ' | ' + (log.actor_role || 'unknown');
    row.appendChild(time);
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
  heading.className = 'section-heading';
  var headingInner = document.createElement('div');
  var eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Revision History';
  headingInner.appendChild(eyebrow);
  var h3 = document.createElement('h3');
  h3.textContent = revisions.length + '개 리비전';
  headingInner.appendChild(h3);
  heading.appendChild(headingInner);
  els.contentRevisions.appendChild(heading);

  revisions.forEach(function(rev) {
    var row = document.createElement('div');
    row.className = 'row';
    var strong = document.createElement('strong');
    strong.textContent = 'Rev #' + rev.revision_number;
    row.appendChild(strong);
    var statusSpan = document.createElement('span');
    statusSpan.textContent = (rev.status || 'draft') + ' | ' + formatDateTime(rev.created_at);
    row.appendChild(statusSpan);
    if (rev.summary) {
      var sumSpan = document.createElement('span');
      sumSpan.textContent = rev.summary;
      row.appendChild(sumSpan);
    }
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
}

async function loadPublicData() {
  const data = await apiJson(`/data/nurse-regulation?year=${state.year}`);
  state.regulation = data;
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

els.surfaceNav?.querySelectorAll('[data-surface]').forEach((button) => {
  button.addEventListener('click', () => {
    state.surface = button.getAttribute('data-surface') || 'dashboard';
    syncSurfaceNav();
  });
});

els.contentFilterBar?.querySelectorAll('[data-content-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.contentFilter = button.getAttribute('data-content-filter') || 'all';
    els.contentFilterBar.querySelectorAll('.mini-btn').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    renderContentEntries();
  });
});

els.reviewFilterBar?.querySelectorAll('[data-review-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.reviewFilter = button.getAttribute('data-review-filter') || 'pending';
    els.reviewFilterBar.querySelectorAll('.mini-btn').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
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

supabaseClient.auth.onAuthStateChange(async () => {
  await updateAuthState();
  await loadAdminData();
});

updateAuthState()
  .then(loadWorkspace)
  .catch((error) => {
    setResult(error instanceof Error ? error.message : String(error));
  });
