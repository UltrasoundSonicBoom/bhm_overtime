// ── 연도별 규정 버전 관리 Admin UI ─────────────────────────────────────────
// Endpoints: GET/POST /api/admin/rule-versions
//            PUT  /api/admin/rule-versions/:id/activate
//            GET  /api/admin/rule-versions/:id/entries?category=...
//            PUT  /api/admin/rule-versions/:id/entries/:entryId
//            GET  /api/admin/rule-versions/diff?from=&to=

const API = '/api/admin';

let versions = [];
let currentVersionId = null;
let currentCategory = null;
let allEntries = [];

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function showToast(msg, duration) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, duration || 2500);
}

function makeEl(tag, attrs) {
  const el = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function(k) {
      if (k === 'textContent') { el.textContent = attrs[k]; }
      else if (k === 'className') { el.className = attrs[k]; }
      else if (k === 'style') { el.style.cssText = attrs[k]; }
      else { el.setAttribute(k, attrs[k]); }
    });
  }
  return el;
}

function td(text, attrs) {
  const cell = makeEl('td', attrs);
  cell.textContent = text;
  return cell;
}

function formatDate(d) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}

async function apiFetch(path, options) {
  const res = await fetch(API + path, options);
  if (!res.ok) {
    const err = await res.json().catch(function() { return { error: res.statusText }; });
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ── 버전 목록 ─────────────────────────────────────────────────────────────────

async function loadVersions() {
  document.getElementById('list-status').textContent = '불러오는 중...';
  try {
    const data = await apiFetch('/rule-versions');
    versions = data.versions || [];
    renderVersionTable();
    populateDiffSelects();
    populateCopyFromSelect();
    populateSimSelects();
    document.getElementById('list-status').textContent = '';
  } catch (e) {
    document.getElementById('list-status').textContent = '오류: ' + e.message;
  }
}

function renderVersionTable() {
  const tbody = document.getElementById('version-tbody');
  tbody.textContent = '';

  if (versions.length === 0) {
    const tr = makeEl('tr');
    const cell = makeEl('td', { className: 'empty-msg' });
    cell.textContent = '등록된 버전이 없습니다. [새 버전 만들기]를 눌러 생성하세요.';
    cell.colSpan = 7;
    tr.appendChild(cell);
    tbody.appendChild(tr);
    return;
  }

  versions.forEach(function(v) {
    tbody.appendChild(buildVersionRow(v));
  });
}

function buildVersionRow(v) {
  const tr = document.createElement('tr');

  // 버전
  tr.appendChild(td(v.version || ''));

  // 적용 시작일
  tr.appendChild(td(formatDate(v.effective_from)));

  // 적용 종료일
  tr.appendChild(td(formatDate(v.effective_to)));

  // 상태 badge
  const tdStatus = document.createElement('td');
  const badge = makeEl('span', {
    className: v.is_active ? 'badge-active' : 'badge-inactive',
    textContent: v.is_active ? '● 활성' : '비활성',
  });
  tdStatus.appendChild(badge);
  tr.appendChild(tdStatus);

  // 변경 메모
  tr.appendChild(td(v.change_note || '', { style: 'max-width:220px;color:#555;font-size:0.8rem;' }));

  // 생성일
  tr.appendChild(td(formatDate(v.created_at), { style: 'font-size:0.8rem;color:#999;' }));

  // 작업 버튼
  const tdActions = makeEl('td', { style: 'white-space:nowrap;' });
  const viewBtn = makeEl('button', { className: 'btn btn-secondary btn-sm', style: 'margin-right:4px;', textContent: '항목 보기' });
  viewBtn.addEventListener('click', function() { openEntries(v.id); });
  tdActions.appendChild(viewBtn);

  if (!v.is_active) {
    const activateBtn = makeEl('button', { className: 'btn btn-success btn-sm', textContent: '활성화' });
    activateBtn.addEventListener('click', function() { activateVersion(v.id); });
    tdActions.appendChild(activateBtn);
  }

  tr.appendChild(tdActions);
  return tr;
}

// ── 버전 활성화 ───────────────────────────────────────────────────────────────

async function activateVersion(id) {
  if (!confirm('이 버전을 활성화하면 현재 활성 버전이 비활성으로 변경됩니다. 계속할까요?')) return;
  try {
    await apiFetch('/rule-versions/' + id + '/activate', { method: 'PUT' });
    showToast('버전 활성화 완료');
    loadVersions();
  } catch (e) {
    showToast('오류: ' + e.message);
  }
}

// ── 신규 버전 생성 ────────────────────────────────────────────────────────────

function populateCopyFromSelect() {
  const sel = document.getElementById('nv-copy-from');
  sel.textContent = '';
  const defaultOpt = makeEl('option', { value: '', textContent: '-- 빈 버전으로 생성 --' });
  sel.appendChild(defaultOpt);
  versions.forEach(function(v) {
    const opt = makeEl('option', {
      value: String(v.id),
      textContent: v.version + (v.is_active ? ' (현행)' : ''),
    });
    sel.appendChild(opt);
  });
}

document.getElementById('btn-new-version').addEventListener('click', function() {
  document.getElementById('nv-version').value = '';
  document.getElementById('nv-effective-from').value = '';
  document.getElementById('nv-effective-to').value = '';
  document.getElementById('nv-change-note').value = '';
  document.getElementById('modal-new-version').classList.add('open');
});

document.getElementById('btn-cancel-new-version').addEventListener('click', function() {
  document.getElementById('modal-new-version').classList.remove('open');
});

document.getElementById('btn-confirm-new-version').addEventListener('click', async function() {
  const version = document.getElementById('nv-version').value.trim();
  const effectiveFrom = document.getElementById('nv-effective-from').value;
  const effectiveTo = document.getElementById('nv-effective-to').value || undefined;
  const changeNote = document.getElementById('nv-change-note').value.trim() || undefined;
  const copyFromRaw = document.getElementById('nv-copy-from').value;
  const copyFromVersionId = copyFromRaw ? Number(copyFromRaw) : undefined;

  if (!version || !effectiveFrom) {
    showToast('버전과 적용 시작일은 필수입니다');
    return;
  }

  try {
    await apiFetch('/rule-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version, effectiveFrom, effectiveTo, changeNote, copyFromVersionId }),
    });
    document.getElementById('modal-new-version').classList.remove('open');
    showToast('버전 생성 완료');
    loadVersions();
  } catch (e) {
    showToast('오류: ' + e.message);
  }
});

// ── 항목 편집 패널 ────────────────────────────────────────────────────────────

async function openEntries(versionId) {
  currentVersionId = versionId;
  currentCategory = null;
  allEntries = [];

  const v = versions.find(function(x) { return x.id === versionId; });
  document.getElementById('entries-title').textContent =
    '항목 편집 — ' + (v ? v.version : 'v' + versionId);
  document.getElementById('entries-info').textContent = v
    ? ('버전: ' + v.version + '  |  적용일: ' + formatDate(v.effective_from) +
        (v.is_active ? '  |  [현행 활성 버전]' : ''))
    : '';

  document.getElementById('entries-panel').classList.add('open');

  try {
    const data = await apiFetch('/rule-versions/' + versionId + '/entries');
    allEntries = data.entries || [];
  } catch (e) {
    showToast('항목 로드 오류: ' + e.message);
    return;
  }

  const cats = Array.from(new Set(allEntries.map(function(e) { return e.category; }))).sort();
  const catFilter = document.getElementById('cat-filter');
  catFilter.textContent = '';

  cats.forEach(function(cat) {
    const count = allEntries.filter(function(e) { return e.category === cat; }).length;
    const btn = makeEl('button', {
      className: 'cat-tag',
      textContent: cat + ' (' + count + ')',
    });
    btn.addEventListener('click', function() {
      document.querySelectorAll('.cat-tag').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentCategory = cat;
      renderEntries(cat);
    });
    catFilter.appendChild(btn);
  });

  if (cats.length > 0) {
    currentCategory = cats[0];
    catFilter.querySelector('.cat-tag').classList.add('active');
    renderEntries(cats[0]);
  }

  document.getElementById('entries-panel').scrollIntoView({ behavior: 'smooth' });
}

function renderEntries(category) {
  const filtered = allEntries.filter(function(e) { return e.category === category; });
  const tbody = document.getElementById('entry-tbody');
  tbody.textContent = '';

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    const cell = makeEl('td', { className: 'empty-msg' });
    cell.colSpan = 3;
    cell.textContent = '항목 없음';
    tr.appendChild(cell);
    tbody.appendChild(tr);
    return;
  }

  filtered.forEach(function(entry) {
    const tr = document.createElement('tr');

    // 키 컬럼
    const tdKey = document.createElement('td');
    const code = makeEl('code', { className: 'entry-key' });
    code.textContent = entry.key;
    tdKey.appendChild(code);

    // 값 컬럼
    const tdVal = makeEl('td', { className: 'entry-val' });
    const rawVal = entry.value_json;
    const input = makeEl('input', { type: 'text' });
    input.value = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal != null ? rawVal : '');
    input.setAttribute('data-entry-id', String(entry.id));
    input.setAttribute('data-orig', input.value);
    input.addEventListener('input', function() {
      input.style.borderColor = input.value !== input.getAttribute('data-orig') ? '#2a4acc' : '';
    });
    tdVal.appendChild(input);

    // 저장 버튼
    const tdAction = document.createElement('td');
    const saveBtn = makeEl('button', { className: 'btn btn-primary btn-sm', textContent: '저장' });
    saveBtn.addEventListener('click', function() {
      saveEntry(entry.id, input.value, input);
    });
    tdAction.appendChild(saveBtn);

    tr.appendChild(tdKey);
    tr.appendChild(tdVal);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });
}

async function saveEntry(entryId, rawValue, inputEl) {
  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch (_) {
    const n = Number(rawValue);
    parsed = isNaN(n) ? rawValue : n;
  }

  try {
    await apiFetch(
      '/rule-versions/' + currentVersionId + '/entries/' + entryId,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueJson: parsed }),
      }
    );
    inputEl.setAttribute('data-orig', rawValue);
    inputEl.style.borderColor = '';
    showToast('저장됨', 1500);
    const idx = allEntries.findIndex(function(e) { return e.id === entryId; });
    if (idx >= 0) allEntries[idx].value_json = parsed;
  } catch (e) {
    showToast('저장 오류: ' + e.message);
  }
}

document.getElementById('btn-close-entries').addEventListener('click', function() {
  document.getElementById('entries-panel').classList.remove('open');
});

// ── Diff ──────────────────────────────────────────────────────────────────────

function populateDiffSelects() {
  ['diff-from', 'diff-to'].forEach(function(id, i) {
    const sel = document.getElementById(id);
    sel.textContent = '';
    versions.forEach(function(v, idx) {
      const opt = makeEl('option', {
        value: String(v.id),
        textContent: v.version + (v.is_active ? ' (현행)' : ''),
      });
      if (i === 0 && idx === versions.length - 2) opt.selected = true;
      if (i === 1 && idx === versions.length - 1) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

document.getElementById('btn-show-diff').addEventListener('click', function() {
  document.getElementById('diff-panel').classList.toggle('open');
  document.getElementById('diff-panel').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-close-diff').addEventListener('click', function() {
  document.getElementById('diff-panel').classList.remove('open');
});

document.getElementById('btn-run-diff').addEventListener('click', async function() {
  const from = document.getElementById('diff-from').value;
  const to = document.getElementById('diff-to').value;
  if (!from || !to || from === to) {
    showToast('서로 다른 두 버전을 선택하세요');
    return;
  }
  const container = document.getElementById('diff-result');
  container.textContent = '비교 중...';
  try {
    const data = await apiFetch('/rule-versions/diff?from=' + from + '&to=' + to);
    renderDiff(data.diff || []);
  } catch (e) {
    container.textContent = '오류: ' + e.message;
  }
});

function renderDiff(diff) {
  const container = document.getElementById('diff-result');
  container.textContent = '';

  if (diff.length === 0) {
    const p = makeEl('p', { textContent: '두 버전이 동일합니다.', style: 'color:#666;' });
    container.appendChild(p);
    return;
  }

  const added = diff.filter(function(d) { return d.type === 'added'; }).length;
  const removed = diff.filter(function(d) { return d.type === 'removed'; }).length;
  const changed = diff.filter(function(d) { return d.type === 'changed'; }).length;
  const summary = makeEl('p', {
    textContent: '변경 ' + changed + '건  |  추가 ' + added + '건  |  삭제 ' + removed + '건',
    style: 'font-size:0.85rem;margin-bottom:0.75rem;color:#444;',
  });
  container.appendChild(summary);

  const table = makeEl('table', { className: 'entry-table' });
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['키', '이전 값', '새 값', '유형'].forEach(function(h) {
    const th = makeEl('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  diff.forEach(function(d) {
    const tr = document.createElement('tr');
    tr.className = { added: 'diff-added', removed: 'diff-removed', changed: 'diff-changed' }[d.type] || '';
    const typeLabel = { added: '추가', removed: '삭제', changed: '변경' }[d.type] || d.type;

    const tdKey = document.createElement('td');
    const code = makeEl('code', { className: 'entry-key' });
    code.textContent = d.key;
    tdKey.appendChild(code);

    const tdFrom = makeEl('td', { style: 'font-family:monospace;font-size:0.78rem;' });
    tdFrom.textContent = d.from !== undefined ? JSON.stringify(d.from) : '—';

    const tdTo = makeEl('td', { style: 'font-family:monospace;font-size:0.78rem;' });
    tdTo.textContent = d.to !== undefined ? JSON.stringify(d.to) : '—';

    const tdType = makeEl('td', { style: 'font-weight:600;font-size:0.8rem;', textContent: typeLabel });

    tr.appendChild(tdKey);
    tr.appendChild(tdFrom);
    tr.appendChild(tdTo);
    tr.appendChild(tdType);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// ── 급여 시뮬레이션 ───────────────────────────────────────────────────────────

function populateSimSelects() {
  ['sim-from', 'sim-to'].forEach(function(id, i) {
    var sel = document.getElementById(id);
    sel.textContent = '';
    versions.forEach(function(v, idx) {
      var opt = makeEl('option', {
        value: String(v.id),
        textContent: v.version + (v.is_active ? ' (현행)' : ''),
      });
      if (i === 0 && idx === versions.length - 2) opt.selected = true;
      if (i === 1 && idx === versions.length - 1) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

document.getElementById('btn-show-sim').addEventListener('click', function() {
  document.getElementById('sim-panel').classList.toggle('open');
  document.getElementById('sim-panel').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-close-sim').addEventListener('click', function() {
  document.getElementById('sim-panel').classList.remove('open');
});

document.getElementById('btn-run-sim').addEventListener('click', async function() {
  var fromId = document.getElementById('sim-from').value;
  var toId = document.getElementById('sim-to').value;
  var jobType = document.getElementById('sim-jobtype').value;
  var grade = document.getElementById('sim-grade').value;
  var year = Number(document.getElementById('sim-year').value);
  var overtimeHours = Number(document.getElementById('sim-ot').value) || 0;
  var nightHours = Number(document.getElementById('sim-night').value) || 0;

  if (!fromId || !toId) { showToast('버전을 선택하세요'); return; }

  var container = document.getElementById('sim-result');
  container.textContent = '계산 중...';

  try {
    var data = await apiFetch('/rule-versions/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromVersionId: Number(fromId), toVersionId: Number(toId) }),
    });
    renderSimResult(data, jobType, grade, year, overtimeHours, nightHours);
  } catch (e) {
    container.textContent = '오류: ' + e.message;
  }
});

function renderSimResult(data, jobType, grade, year, overtimeHours, nightHours) {
  var container = document.getElementById('sim-result');
  container.textContent = '';

  var wageFrom = CALC.calcOrdinaryWage(jobType, grade, year, {}, data.fromRuleSet);
  var wageTo = CALC.calcOrdinaryWage(jobType, grade, year, {}, data.toRuleSet);

  if (!wageFrom && !wageTo) {
    var msg = makeEl('p', { textContent: '해당 직종/등급의 보수표 데이터를 찾을 수 없습니다.', style: 'color:#c44;' });
    container.appendChild(msg);
    return;
  }

  var otFrom = wageFrom ? CALC.calcOvertimePay(wageFrom.hourlyRate, overtimeHours, nightHours, 0, false) : null;
  var otTo = wageTo ? CALC.calcOvertimePay(wageTo.hourlyRate, overtimeHours, nightHours, 0, false) : null;

  var fmt = function(n) { return n != null ? n.toLocaleString('ko-KR') + '원' : '—'; };
  var diff = function(a, b) {
    if (a == null || b == null) return '—';
    var d = b - a;
    var s = (d >= 0 ? '+' : '') + d.toLocaleString('ko-KR') + '원';
    return makeEl('span', {
      textContent: s,
      style: 'font-weight:600;color:' + (d > 0 ? '#2a8c4a' : d < 0 ? '#c44' : '#666') + ';',
    });
  };

  var title = makeEl('p', {
    textContent: data.fromVersion + ' → ' + data.toVersion + '  |  ' + jobType + ' ' + grade + ' ' + year + '호봉  |  시간외 ' + overtimeHours + 'h  야간 ' + nightHours + 'h',
    style: 'font-size:0.85rem;color:#444;margin-bottom:0.75rem;',
  });
  container.appendChild(title);

  var rows = [
    ['통상임금 (월)', wageFrom && wageFrom.monthlyWage, wageTo && wageTo.monthlyWage],
    ['시급', wageFrom && wageFrom.hourlyRate, wageTo && wageTo.hourlyRate],
    ['시간외수당', otFrom && otFrom.연장근무수당, otTo && otTo.연장근무수당],
    ['야간수당', otFrom && otFrom.야간수당, otTo && otTo.야간수당],
  ];

  var table = makeEl('table', { className: 'entry-table' });
  var thead = document.createElement('thead');
  var headerRow = document.createElement('tr');
  ['항목', data.fromVersion + ' (기준)', data.toVersion + ' (비교)', '차이'].forEach(function(h) {
    var th = makeEl('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  rows.forEach(function(row) {
    var tr = document.createElement('tr');
    var tdLabel = makeEl('td', { textContent: row[0], style: 'font-weight:600;font-size:0.85rem;' });
    var tdFrom = makeEl('td', { textContent: fmt(row[1]), style: 'font-family:monospace;font-size:0.85rem;' });
    var tdTo = makeEl('td', { textContent: fmt(row[2]), style: 'font-family:monospace;font-size:0.85rem;' });
    var tdDiff = makeEl('td', { style: 'font-family:monospace;font-size:0.85rem;' });
    var diffEl = diff(row[1], row[2]);
    if (typeof diffEl === 'string') { tdDiff.textContent = diffEl; }
    else { tdDiff.appendChild(diffEl); }
    tr.appendChild(tdLabel); tr.appendChild(tdFrom); tr.appendChild(tdTo); tr.appendChild(tdDiff);
    tbody.appendChild(tr);
  });

  // 기준기본급 상세
  if (wageFrom || wageTo) {
    var breakdown = [
      ['기준기본급', wageFrom && wageFrom.breakdown['기준기본급'], wageTo && wageTo.breakdown['기준기본급']],
      ['능력급', wageFrom && wageFrom.breakdown['능력급'], wageTo && wageTo.breakdown['능력급']],
      ['상여금', wageFrom && wageFrom.breakdown['상여금'], wageTo && wageTo.breakdown['상여금']],
    ];
    var sep = document.createElement('tr');
    var sepCell = makeEl('td', { textContent: '── 통상임금 상세 ──', style: 'color:#999;font-size:0.78rem;padding:8px 10px;', colspan: '4' });
    sep.appendChild(sepCell);
    tbody.appendChild(sep);

    breakdown.forEach(function(row) {
      var tr = document.createElement('tr');
      var tdLabel = makeEl('td', { textContent: row[0], style: 'padding-left:1.5rem;font-size:0.82rem;color:#555;' });
      var tdFrom = makeEl('td', { textContent: fmt(row[1]), style: 'font-family:monospace;font-size:0.82rem;color:#555;' });
      var tdTo = makeEl('td', { textContent: fmt(row[2]), style: 'font-family:monospace;font-size:0.82rem;color:#555;' });
      var tdDiff = makeEl('td', { style: 'font-family:monospace;font-size:0.82rem;' });
      var diffEl = diff(row[1], row[2]);
      if (typeof diffEl === 'string') { tdDiff.textContent = diffEl; }
      else { tdDiff.appendChild(diffEl); }
      tr.appendChild(tdLabel); tr.appendChild(tdFrom); tr.appendChild(tdTo); tr.appendChild(tdDiff);
      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

// ── 초기화 ────────────────────────────────────────────────────────────────────
loadVersions();
