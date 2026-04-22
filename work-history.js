// work-history.js — 근무이력 관리
// ── E1: 근무이력 ──────────────────────────────────────────────────
var _whEditId = null;
function _whKey() {
  return window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
}
function _whSeedKey() {
  return window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history_seeded') : 'bhm_work_history_seeded_guest';
}

function _loadWorkHistory() {
  try {
    var list = JSON.parse(localStorage.getItem(_whKey()) || '[]');
    // lazy 마이그레이션
    list.forEach(function(item) {
      if (!Array.isArray(item.rotations)) item.rotations = [];
      // workplace/dept 분리 (이전 버전: dept = "서울대학교병원 · 핵의학과")
      if (!item.workplace && item.dept && item.dept.indexOf(' · ') >= 0) {
        var parts = item.dept.split(' · ');
        item.workplace = parts[0].trim();
        item.dept = parts.slice(1).join(' · ').trim();
      } else if (!item.workplace) {
        item.workplace = '서울대학교병원';
      }
    });
    return list;
  } catch(e) { return []; }
}

function _genId(prefix) {
  return (prefix || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function addRotation(parentId, rotation) {
  var list = _loadWorkHistory();
  var parent = list.find(function(i) { return i.id === parentId; });
  if (!parent) return false;
  rotation.id = rotation.id || _genId('rot_');
  rotation.updatedAt = new Date().toISOString();
  parent.rotations.push(rotation);
  _saveWorkHistory(list);
  return true;
}

function updateRotation(parentId, rotId, patch) {
  var list = _loadWorkHistory();
  var parent = list.find(function(i) { return i.id === parentId; });
  if (!parent) return false;
  var idx = parent.rotations.findIndex(function(r) { return r.id === rotId; });
  if (idx < 0) return false;
  parent.rotations[idx] = Object.assign({}, parent.rotations[idx], patch, { updatedAt: new Date().toISOString() });
  _saveWorkHistory(list);
  return true;
}

function deleteRotation(parentId, rotId) {
  var list = _loadWorkHistory();
  var parent = list.find(function(i) { return i.id === parentId; });
  if (!parent) return false;
  parent.rotations = parent.rotations.filter(function(r) { return r.id !== rotId; });
  _saveWorkHistory(list);
  return true;
}

window.addRotation = addRotation;
window.updateRotation = updateRotation;
window.deleteRotation = deleteRotation;

function _saveWorkHistory(list) {
  localStorage.setItem(_whKey(), JSON.stringify(list));
  // bhm_lastEdit_<key> 도 갱신 — 향후 서버 sync 재도입 시 충돌 비교용
  localStorage.setItem('bhm_lastEdit_' + _whKey(), new Date().toISOString());
  // REMOVED auth: SyncManager.enqueuePush — 로컬 저장만 사용
}

function _fmtYm(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 7).replace(/-/g, '.');
}

function _humanDuration(fromIso, toIso) {
  if (!fromIso) return '';
  var f = fromIso.slice(0, 7).split('-');
  var now = toIso ? toIso.slice(0, 7).split('-') : (function() {
    var d = new Date();
    return [String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0')];
  })();
  var months = (parseInt(now[0], 10) - parseInt(f[0], 10)) * 12 + (parseInt(now[1], 10) - parseInt(f[1], 10));
  if (isNaN(months) || months < 0) return '';
  var y = Math.floor(months / 12);
  var m = months % 12;
  if (y && m) return y + '년 ' + m + '개월';
  if (y) return y + '년';
  return (m || 1) + '개월';
}

function renderWorkHistory() {
  var container = document.getElementById('workHistoryList');
  if (!container) return;

  var list = _loadWorkHistory();
  while (container.firstChild) container.removeChild(container.firstChild);

  // 비어있고 프로필에 부서+입사일 있으면 무조건 자동 시드 (플래그 없음)
  if (list.length === 0) {
    var seed = _seedFirstWorkFromProfile();
    if (seed) {
      seed.autoSeeded = true;
      list.push(seed);
      _saveWorkHistory(list);
    }
  }
  // 스테일 플래그 정리 (이전 버전 호환)
  try { localStorage.removeItem(_whSeedKey()); } catch (e) {}

  if (list.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'padding:16px 0;text-align:center;';
    var emptyMsg = document.createElement('p');
    emptyMsg.textContent = '개인 정보(부서·입사일)를 먼저 입력하면 첫 근무지가 자동으로 추가됩니다.';
    emptyMsg.style.cssText = 'color:var(--text-muted);font-size:var(--text-body-small);margin:0 0 10px;line-height:1.5;';
    var emptyBtn = document.createElement('button');
    emptyBtn.textContent = '+ 근무지 직접 추가';
    emptyBtn.className = 'btn btn-outline';
    emptyBtn.onclick = function() { openWorkHistorySheet(); };
    empty.appendChild(emptyMsg);
    empty.appendChild(emptyBtn);
    container.appendChild(empty);
    return;
  }

  var sorted = list.slice().sort(function(a, b) {
    var aEff = _effectivePeriod(a), bEff = _effectivePeriod(b);
    var aOpen = !aEff.to, bOpen = !bEff.to;
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    var toDiff = (bEff.to || '').localeCompare(aEff.to || '');
    if (toDiff !== 0) return toDiff;
    return (bEff.from || '').localeCompare(aEff.from || '');
  });

  var timeline = document.createElement('div');
  timeline.className = 'career-timeline';

  var spine = document.createElement('div');
  spine.className = 'career-spine';
  timeline.appendChild(spine);

  // 부서 시작 연도 유니크 (최신 → 과거)
  var years = [];
  sorted.forEach(function(it) {
    var eff = _effectivePeriod(it);
    var y = (eff.from || '').slice(0, 4);
    if (y && years.indexOf(y) === -1) years.push(y);
  });

  var highlightItem = null;
  var prevYear = null;
  sorted.forEach(function(item) {
    var eff = _effectivePeriod(item);
    var seg = _renderCareerSegment(item, eff);
    var y = (eff.from || '').slice(0, 4);
    if (y && y !== prevYear) {
      var stamp = document.createElement('span');
      stamp.className = 'career-year-stamp';
      stamp.textContent = y;
      seg.appendChild(stamp);
      prevYear = y;
    }
    timeline.appendChild(seg);
    if (window._pendingHighlightWHId === item.id) highlightItem = seg;
  });

  container.appendChild(timeline);

  if (highlightItem) {
    window._pendingHighlightWHId = null;
    highlightItem.classList.add('highlight');
    setTimeout(function() {
      highlightItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    setTimeout(function() { highlightItem.classList.remove('highlight'); }, 2200);
  }
}

// 로테이션 기반 부모 효과기간 자동 집계
// - 로테이션이 없으면 부모 값 그대로 반환 (inferred: false)
// - 로테이션이 있으면 min(rot.from) ~ max(rot.to) 산출
// - 로테이션 중 하나라도 진행중(to 없음)이거나 item.to가 비어있으면 to: '' (재직 중)
function _effectivePeriod(item) {
  var rots = ((item && item.rotations) || []).filter(function(r) { return r && r.from; });
  if (!rots.length) return { from: (item && item.from) || '', to: (item && item.to) || '', inferred: false };
  var fromMin = rots.reduce(function(acc, r) {
    if (!acc) return r.from;
    return r.from < acc ? r.from : acc;
  }, item.from || '');
  var anyOpen = rots.some(function(r) { return !r.to; }) || !(item && item.to);
  var toMax = anyOpen ? '' : rots.reduce(function(acc, r) { return r.to > acc ? r.to : acc; }, item.to || '');
  return { from: fromMin, to: toMax, inferred: true };
}
window._effectivePeriod = _effectivePeriod;

// 로테이션 기간이 부모 기간을 벗어나는지 검증
function _isRotationOutOfParent(parent, rot) {
  if (!parent.from || !rot.from) return false;
  if (rot.from < parent.from) return true;
  if (parent.to && rot.to && rot.to > parent.to) return true;
  return false;
}

function _renderCareerSegment(item, eff) {
  var seg = document.createElement('div');
  seg.className = 'career-segment';
  seg.setAttribute('data-wh-id', item.id);
  seg.setAttribute('data-wh-from', eff.from || '');
  if (!eff.to) seg.classList.add('current');

  var card = document.createElement('div');
  card.className = 'career-seg-card';

  var head = document.createElement('div');
  head.className = 'career-seg-head';

  var info = document.createElement('div');
  info.className = 'career-seg-head-info';

  var dept = document.createElement('div');
  dept.className = 'career-seg-dept';
  var defaultHospital = ((window.PROFILE && window.PROFILE.load && window.PROFILE.load()) || {}).hospital || '서울대학교병원';
  var workplaceText = (item.workplace && item.workplace !== defaultHospital) ? item.workplace : '';
  var deptText = item.dept || '(부서명 없음)';
  dept.textContent = workplaceText ? (workplaceText + ' · ' + deptText) : deptText;
  info.appendChild(dept);

  var period = document.createElement('div');
  period.className = 'career-seg-period';
  var periodTxt = document.createElement('span');
  var fromStr = _fmtYm(eff.from) || '?';
  var toStr = eff.to ? _fmtYm(eff.to) : '재직 중';
  periodTxt.textContent = fromStr + ' — ' + toStr;
  period.appendChild(periodTxt);

  if (!eff.to) {
    var live = document.createElement('span');
    live.className = 'career-live';
    var dur = _humanDuration(eff.from, '');
    live.textContent = 'LIVE' + (dur ? ' · ' + dur : '');
    period.appendChild(live);
  } else {
    var durDone = _humanDuration(eff.from, eff.to);
    if (durDone) {
      var durSpan = document.createElement('span');
      durSpan.style.color = 'var(--text-muted)';
      durSpan.textContent = '· ' + durDone;
      period.appendChild(durSpan);
    }
  }
  info.appendChild(period);

  if (item.role) {
    var role = document.createElement('div');
    role.className = 'career-seg-role';
    role.textContent = item.role;
    info.appendChild(role);
  }

  if (item.desc) {
    var desc = document.createElement('div');
    desc.className = 'career-seg-desc';
    desc.textContent = item.desc;
    info.appendChild(desc);
  }

  head.appendChild(info);

  // kebab 메뉴
  var menuWrap = document.createElement('div');
  menuWrap.className = 'career-seg-menu-wrap';
  var menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'career-seg-menu';
  menuBtn.setAttribute('aria-label', '부서 옵션');
  menuBtn.textContent = '⋯';
  var pop = document.createElement('div');
  pop.className = 'career-seg-menu-pop';
  pop.style.display = 'none';
  var editOpt = document.createElement('button');
  editOpt.type = 'button';
  editOpt.textContent = '편집';
  editOpt.onclick = function(e) { e.stopPropagation(); pop.style.display = 'none'; openWorkHistorySheet(item); };
  var delOpt = document.createElement('button');
  delOpt.type = 'button';
  delOpt.className = 'career-menu-delete';
  delOpt.textContent = '삭제';
  delOpt.onclick = function(e) {
    e.stopPropagation();
    pop.style.display = 'none';
    var label = (item.dept || '이 근무지') + (item.workplace && item.workplace !== '서울대학교병원' ? ' (' + item.workplace + ')' : '');
    if (!confirm('"' + label + '"을(를) 삭제할까요? 로테이션 기록도 함께 지워집니다.')) return;
    deleteWorkHistoryEntry(item.id);
  };
  pop.appendChild(editOpt);
  pop.appendChild(delOpt);
  menuBtn.onclick = function(e) {
    e.stopPropagation();
    var open = pop.style.display === 'block';
    // 다른 열린 pop 닫기
    document.querySelectorAll('.career-seg-menu-pop').forEach(function(p) { p.style.display = 'none'; });
    pop.style.display = open ? 'none' : 'block';
    if (!open) {
      setTimeout(function() {
        document.addEventListener('click', function once() {
          pop.style.display = 'none';
          document.removeEventListener('click', once);
        }, { once: true });
      }, 0);
    }
  };
  menuWrap.appendChild(menuBtn);
  menuWrap.appendChild(pop);
  head.appendChild(menuWrap);

  card.appendChild(head);

  // 로테이션 칩
  var chips = document.createElement('div');
  chips.className = 'career-seg-chips';
  (item.rotations || []).slice().sort(function(a, b) { return (a.from || '').localeCompare(b.from || ''); })
    .forEach(function(rot) {
      chips.appendChild(_renderRotationChip(item, rot));
    });
  var addChip = document.createElement('button');
  addChip.type = 'button';
  addChip.className = 'career-rot-chip-add';
  addChip.textContent = item.rotations && item.rotations.length ? '+ 로테이션' : '+ 로테이션 추가';
  addChip.onclick = function(e) { e.stopPropagation(); openRotationSheet(item.id); };
  chips.appendChild(addChip);
  card.appendChild(chips);

  seg.appendChild(card);
  return seg;
}

function _renderRotationChip(parent, rot) {
  var chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'career-rot-chip';
  if (_isRotationOutOfParent(parent, rot)) {
    chip.classList.add('warn');
    chip.title = '⚠ 부모 기간 벗어남';
  }
  var name = document.createElement('span');
  name.textContent = rot.room || '(근무방 없음)';
  chip.appendChild(name);

  if (rot.from) {
    var mono = document.createElement('span');
    mono.className = 'career-rot-mono';
    var f = _fmtYm(rot.from).slice(2); // '06.07'
    var t = rot.to ? _fmtYm(rot.to).slice(2) : '';
    mono.textContent = f + '~' + t;
    chip.appendChild(mono);
  }

  chip.onclick = function(e) {
    e.stopPropagation();
    openRotationSheet(parent.id, rot);
  };
  return chip;
}

// ── 로테이션 입력 바텀시트 ──
var _rotEditCtx = { parentId: null, rotId: null };

function openRotationSheet(parentId, rotation) {
  var sheet = document.getElementById('rotationSheet');
  if (!sheet) return;
  var parent = _loadWorkHistory().find(function(i) { return i.id === parentId; });
  _rotEditCtx.parentId = parentId;
  _rotEditCtx.rotId = rotation ? rotation.id : null;

  document.getElementById('rotRoom').value = rotation ? (rotation.room || '') : '';
  document.getElementById('rotFrom').value = rotation ? (rotation.from || '') : (parent ? (parent.from || '') : '');
  document.getElementById('rotTo').value = rotation ? (rotation.to || '') : '';
  document.getElementById('rotTasks').value = rotation ? (rotation.tasks || '') : '';

  var title = document.getElementById('rotationSheetTitle');
  if (title) title.textContent = (rotation ? '로테이션 편집' : '로테이션 추가') + (parent ? ' · ' + parent.dept : '');
  var hint = document.getElementById('rotationParentHint');
  if (hint && parent) {
    hint.textContent = '부모 기간: ' + (parent.from || '?') + ' ~ ' + (parent.to || '재직 중');
  }

  var delBtn = document.getElementById('rotDeleteBtn');
  var actions = document.getElementById('rotActions');
  if (delBtn) delBtn.style.display = rotation ? 'block' : 'none';
  if (actions) actions.style.gridTemplateColumns = rotation ? '1fr 1fr' : '1fr';

  sheet.style.display = 'block';
  document.body.style.overflow = 'hidden';
  setTimeout(function() { document.getElementById('rotRoom').focus(); }, 100);
}

function closeRotationSheet() {
  var sheet = document.getElementById('rotationSheet');
  if (sheet) sheet.style.display = 'none';
  document.body.style.overflow = '';
}

function deleteRotationEntry() {
  if (!_rotEditCtx.parentId || !_rotEditCtx.rotId) return;
  var room = (document.getElementById('rotRoom').value || '').trim() || '이 로테이션';
  if (!confirm('"' + room + '"을(를) 삭제할까요?')) return;
  deleteRotation(_rotEditCtx.parentId, _rotEditCtx.rotId);
  closeRotationSheet();
  renderWorkHistory();
}
window.deleteRotationEntry = deleteRotationEntry;

function saveRotationEntry() {
  var room = (document.getElementById('rotRoom').value || '').trim();
  if (!room) { document.getElementById('rotRoom').focus(); return; }
  var data = {
    room: room,
    from: document.getElementById('rotFrom').value || '',
    to: document.getElementById('rotTo').value || '',
    tasks: (document.getElementById('rotTasks').value || '').trim()
  };
  if (_rotEditCtx.rotId) {
    updateRotation(_rotEditCtx.parentId, _rotEditCtx.rotId, data);
  } else {
    addRotation(_rotEditCtx.parentId, data);
  }
  closeRotationSheet();
  renderWorkHistory();
}

function autofillRotationTasks() {
  if (!global_JT()) return;
  var room = (document.getElementById('rotRoom').value || '').trim();
  if (!room) {
    alert('먼저 근무방/파트명을 입력해주세요.');
    document.getElementById('rotRoom').focus();
    return;
  }
  // 부모 부서명을 우선 사용 (로테이션은 같은 부서 내)
  var parent = _loadWorkHistory().find(function(i) { return i.id === _rotEditCtx.parentId; });
  var deptName = parent ? parent.dept : room;
  var ta = document.getElementById('rotTasks');
  var existing = (ta.value || '').trim();
  var suggestion = window.JobTemplates.autofillForEntry({ dept: deptName });
  if (!suggestion) {
    alert('"' + deptName + '" 부서·직종 조합에 등록된 표준 업무 템플릿이 없어요.');
    return;
  }
  if (existing && !confirm('기존 내용 위에 표준 업무를 덮어쓸까요?')) return;
  ta.value = suggestion;
}
window.autofillRotationTasks = autofillRotationTasks;

window.openRotationSheet = openRotationSheet;
window.closeRotationSheet = closeRotationSheet;
window.saveRotationEntry = saveRotationEntry;

// 직종별 직무 추천 리스트 (보건직은 직무명 자체, 간호/의사는 근무부서와 결합한 예시)
var JOB_ROLE_SUGGESTIONS = {
  '보건직': ['방사선사', '임상병리사', '물리치료사', '작업치료사', '치과위생사', '영양사', '약무보조', '응급구조사'],
  '간호직': ['외래 간호사', '병동 간호사', '중환자실 간호사', '응급실 간호사', '수술실 간호사', '수간호사', '책임간호사', '전담간호사'],
  '의사직': ['전공의', '전임의(펠로우)', '임상강사', '임상조교수', '조교수', '부교수', '교수', '전문의'],
  '사무직': ['행정사무원', '인사담당자', '총무담당자', '회계담당자', '교육담당자'],
  '기술직': ['시설관리원', '전기기술자', '기계기술자', '보안관리자'],
};
var JOB_ROLE_HINTS = {
  '간호직': '예: "내과 외래 간호사", "101병동 간호사", "신경외과 병동 수간호사"',
  '의사직': '예: "내과 전공의", "정형외과 전문의", "마취통증의학과 조교수"',
  '보건직': '담당 직무를 선택하거나 직접 입력하세요.',
};

function _refreshRoleSuggestions() {
  var dl = document.getElementById('whRoleSuggestions');
  var hint = document.getElementById('whRoleHint');
  if (!dl) return;
  while (dl.firstChild) dl.removeChild(dl.firstChild);
  var jobType = (window.PROFILE && window.PROFILE.load && (window.PROFILE.load() || {}).jobType) || '';
  // 폼 값이 최신일 수 있으므로 폴백
  if (!jobType) {
    var jobEl = document.getElementById('pfJobType');
    jobType = jobEl ? (jobEl.value || '') : '';
  }
  var options = JOB_ROLE_SUGGESTIONS[jobType] || [];
  options.forEach(function(opt) {
    var o = document.createElement('option');
    o.value = opt;
    dl.appendChild(o);
  });
  if (hint) hint.textContent = JOB_ROLE_HINTS[jobType] || (options.length ? '' : '');
}

function _nextMonth(yyyymm) {
  if (!yyyymm || !/^\d{4}-\d{2}$/.test(yyyymm)) return '';
  var y = parseInt(yyyymm.slice(0, 4), 10);
  var m = parseInt(yyyymm.slice(5, 7), 10);
  m += 1;
  if (m > 12) { m = 1; y += 1; }
  return y + '-' + (m < 10 ? '0' + m : '' + m);
}
window._nextMonth = _nextMonth;

function _latestEndMonth() {
  var list = _loadWorkHistory();
  var latest = '';
  list.forEach(function(it) {
    if (it.to && it.to > latest) latest = it.to;
    (it.rotations || []).forEach(function(r) {
      if (r.to && r.to > latest) latest = r.to;
    });
  });
  return latest;
}

function _buildPickerButton(emoji, title, subtitle, bgColor) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';
  btn.style.cssText = 'padding:14px;text-align:left;border:1px solid var(--border-glass);border-radius:10px;background:' + bgColor + ';cursor:pointer;';
  var t = document.createElement('div');
  t.style.cssText = 'font-weight:600;font-size:var(--text-body-normal);';
  t.textContent = emoji + ' ' + title;
  var s = document.createElement('div');
  s.style.cssText = 'font-size:0.78rem;color:var(--text-muted);margin-top:2px;';
  s.textContent = subtitle;
  btn.appendChild(t); btn.appendChild(s);
  return btn;
}

function openAddWorkHistoryPicker() {
  var list = _loadWorkHistory();
  if (!list.length) { openWorkHistorySheet(); return; }

  var listSorted = list.slice().sort(function(a, b) {
    var ato = a.to || '9999-99';
    var bto = b.to || '9999-99';
    if (ato !== bto) return bto.localeCompare(ato);
    return (b.from || '').localeCompare(a.from || '');
  });
  var parent = listSorted[0];

  var existing = document.getElementById('addWorkHistoryPicker');
  if (existing) existing.remove();

  var ov = document.createElement('div');
  ov.id = 'addWorkHistoryPicker';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center;';
  ov.onclick = function(e) { if (e.target === ov) ov.remove(); };

  var panel = document.createElement('div');
  panel.style.cssText = 'background:var(--bg-card,#fff);border-radius:16px 16px 0 0;padding:20px 16px 28px;width:100%;max-width:600px;';

  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
  var hTitle = document.createElement('span');
  hTitle.style.cssText = 'font-size:var(--text-body-large);font-weight:600;';
  hTitle.textContent = '근무 추가 유형';
  var hClose = document.createElement('button');
  hClose.type = 'button';
  hClose.style.cssText = 'background:none;border:none;font-size:1.4rem;cursor:pointer;line-height:1;padding:4px 8px;';
  hClose.textContent = '×';
  hClose.onclick = function() { ov.remove(); };
  header.appendChild(hTitle); header.appendChild(hClose);

  var desc = document.createElement('p');
  desc.style.cssText = 'font-size:var(--text-body-small);color:var(--text-muted);margin:0 0 16px;';
  desc.textContent = '같은 부서에서 파트만 이동했다면 로테이션, 휴직 후 복직이나 부서가 바뀌었다면 새 근무지를 선택하세요.';

  var btnWrap = document.createElement('div');
  btnWrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

  var rotBtn = _buildPickerButton('🔄', '로테이션', (parent.dept || '') + ' 내 파트·근무방 이동', 'rgba(99,102,241,.06)');
  rotBtn.onclick = function() { ov.remove(); openRotationSheet(parent.id); };
  var newBtn = _buildPickerButton('🏥', '새 근무지', '휴직 후 복직·부서 이동 (시작월 자동 계산)', 'rgba(245,158,11,.06)');
  newBtn.onclick = function() { ov.remove(); openWorkHistorySheet({ __newPost: true }); };

  btnWrap.appendChild(rotBtn); btnWrap.appendChild(newBtn);
  panel.appendChild(header); panel.appendChild(desc); panel.appendChild(btnWrap);
  ov.appendChild(panel);
  document.body.appendChild(ov);
}
window.openAddWorkHistoryPicker = openAddWorkHistoryPicker;

function openWorkHistorySheet(item) {
  var sheet = document.getElementById('workHistorySheet');
  var title = document.getElementById('workHistorySheetTitle');
  if (!sheet) return;

  var isNewPost = item && item.__newPost === true;
  var editItem = (item && !isNewPost) ? item : null;

  var profile = (window.PROFILE && window.PROFILE.load) ? (window.PROFILE.load() || {}) : {};
  var defaultWorkplace = profile.hospital || '서울대학교병원';
  var hireFromMonth = '';
  if (profile.hireDate && window.PROFILE && window.PROFILE.parseDate) {
    var hire = window.PROFILE.parseDate(profile.hireDate);
    if (hire) hireFromMonth = hire.slice(0, 7);
  }

  var defaultFromMonth = hireFromMonth;
  if (isNewPost) {
    var latestEnd = _latestEndMonth();
    if (latestEnd) defaultFromMonth = _nextMonth(latestEnd) || hireFromMonth;
  }

  document.getElementById('whEditId').value = editItem ? editItem.id : '';
  document.getElementById('whWorkplace').value = editItem ? (editItem.workplace || defaultWorkplace) : defaultWorkplace;
  document.getElementById('whDept').value = editItem ? (editItem.dept || '') : '';
  document.getElementById('whFrom').value = editItem ? (editItem.from || '') : defaultFromMonth;
  document.getElementById('whTo').value = editItem ? (editItem.to || '') : '';
  document.getElementById('whRole').value = editItem ? (editItem.role || '') : '';
  document.getElementById('whDesc').value = editItem ? (editItem.desc || '') : '';
  if (title) title.textContent = editItem ? '근무이력 편집' : (isNewPost ? '새 근무지 추가' : '근무이력 추가');

  // 모드 배지
  var badge = document.getElementById('workHistorySheetBadge');
  if (badge) {
    if (isNewPost) {
      badge.textContent = '🏥 새 근무지';
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
  // 시작월 자동 프리필 힌트
  var fromHint = document.getElementById('whFromHint');
  if (fromHint) {
    if (isNewPost && defaultFromMonth && defaultFromMonth !== hireFromMonth) {
      fromHint.textContent = '이전 근무 종료 다음 달(' + defaultFromMonth + ')로 자동 설정됨 · 필요 시 변경';
      fromHint.style.display = 'block';
    } else {
      fromHint.style.display = 'none';
    }
  }

  _refreshRoleSuggestions();

  sheet.style.display = 'block';
  document.body.style.overflow = 'hidden';
  setTimeout(function() { document.getElementById('whDept').focus(); }, 100);
}

function autofillJobDesc() {
  if (!global_JT()) return;
  var dept = (document.getElementById('whDept').value || '').trim();
  if (!dept) {
    alert('먼저 부서명을 입력해주세요.');
    document.getElementById('whDept').focus();
    return;
  }
  var ta = document.getElementById('whDesc');
  var existing = (ta.value || '').trim();
  var suggestion = window.JobTemplates.autofillForEntry({ dept: dept });
  if (!suggestion) {
    alert('"' + dept + '" 부서·직종 조합에 등록된 표준 업무 템플릿이 없어요.\n수동으로 입력해주세요.');
    return;
  }
  if (existing && !confirm('기존 내용 위에 표준 업무를 덮어쓸까요?')) return;
  ta.value = suggestion;
}
function global_JT() { return window.JobTemplates && window.JobTemplates.autofillForEntry; }
window.autofillJobDesc = autofillJobDesc;

function closeWorkHistorySheet() {
  var sheet = document.getElementById('workHistorySheet');
  if (sheet) sheet.style.display = 'none';
  document.body.style.overflow = '';
}

function saveWorkHistoryEntry() {
  var workplace = (document.getElementById('whWorkplace').value || '').trim() || '서울대학교병원';
  var dept = (document.getElementById('whDept').value || '').trim();
  if (!dept) {
    document.getElementById('whDept').focus();
    return;
  }
  var editId = document.getElementById('whEditId').value;
  var list = _loadWorkHistory();

  var entry = {
    id: editId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    workplace: workplace,
    dept: dept,
    from: document.getElementById('whFrom').value || '',
    to: document.getElementById('whTo').value || '',
    role: (document.getElementById('whRole').value || '').trim(),
    desc: (document.getElementById('whDesc').value || '').trim(),
    updatedAt: new Date().toISOString()
  };

  if (editId) {
    var idx = list.findIndex(function(i) { return i.id === editId; });
    if (idx >= 0) {
      // 기존 로테이션 보존
      entry.rotations = list[idx].rotations || [];
      // 부모 종료 시: 진행중 로테이션 자동 종료
      if (entry.to) {
        entry.rotations.forEach(function(r) {
          if (!r.to) r.to = entry.to;
        });
      }
      list[idx] = entry;
    } else {
      entry.rotations = [];
      list.push(entry);
    }
  } else {
    entry.rotations = [];
    list.push(entry);
  }

  _saveWorkHistory(list);
  closeWorkHistorySheet();
  var isNew = !editId;
  window._pendingHighlightWHId = entry.id;
  renderWorkHistory();
  if (isNew) _showWorkHistoryToast('새 근무지가 추가됐어요');
}

function _showWorkHistoryToast(message) {
  var t = document.createElement('div');
  t.textContent = message;
  t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9500;background:#101218;color:#fff;padding:10px 18px;border-radius:999px;font-size:0.82rem;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.25);opacity:0;transition:opacity .2s;';
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.style.opacity = '1'; });
  setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 250); }, 2200);
}

function deleteWorkHistoryEntry(id) {
  var list = _loadWorkHistory().filter(function(i) { return i.id !== id; });
  _saveWorkHistory(list);
  renderWorkHistory();
}

