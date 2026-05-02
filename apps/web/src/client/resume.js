// resume.js — 이력서 섹션 (학력/자격/논문/군경력/자기소개서) + PDF 미리보기
// index.html의 #resumeSections 를 채우고, printResume()으로 #printableResume에 렌더 후 window.print()

(function (global) {
  'use strict';

  function _genId() {
    return 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function _profile() {
    if (!global.PROFILE || !global.PROFILE.load) return null;
    var p = global.PROFILE.load() || {};
    if (!Array.isArray(p.education)) p.education = [];
    if (!Array.isArray(p.licenses)) p.licenses = [];
    if (!Array.isArray(p.papers)) p.papers = [];
    if (!p.military || typeof p.military !== 'object') p.military = {};
    if (typeof p.coverLetter !== 'string') p.coverLetter = '';
    return p;
  }

  function _saveProfile(p) {
    global.PROFILE.save(p);
  }

  // ── 섹션 정의 (학력/자격/논문) ─────────────────────────────
  var SECTIONS = {
    education: {
      label: '학력',
      icon: '🎓',
      empty: '학력을 추가해주세요.',
      fields: [
        { key: 'period', label: '재학기간', placeholder: '예: 2009 ~ 2010' },
        { key: 'degree', label: '학위 / 구분', placeholder: '예: 학사 / 졸업' },
        { key: 'school', label: '학교명(소재지)', placeholder: '예: 서울대학교 (서울)' },
        { key: 'major', label: '전공', placeholder: '예: 방사선학' },
        { key: 'grade', label: '학점', placeholder: '예: 3.5 / 4.5' }
      ],
      summary: function (it) { return (it.degree || '') + ' · ' + (it.school || ''); },
      sub: function (it) { return (it.period || '') + (it.major ? ' · ' + it.major : ''); }
    },
    licenses: {
      label: '자격 / 면허',
      icon: '🎖️',
      empty: '자격증/면허증을 추가해주세요.',
      fields: [
        { key: 'date', label: '취득일', placeholder: '예: 2016.09' },
        { key: 'type', label: '구분', placeholder: '예: 면허증 / 자격증' },
        { key: 'name', label: '자격 / 면허명', placeholder: '예: 핵의학 전문 방사선사' },
        { key: 'issuer', label: '발행처', placeholder: '예: 보건복지부' }
      ],
      summary: function (it) { return it.name || '(이름 없음)'; },
      sub: function (it) { return (it.type || '') + (it.date ? ' · ' + it.date : '') + (it.issuer ? ' · ' + it.issuer : ''); }
    },
    papers: {
      label: '논문',
      icon: '📚',
      empty: '논문을 추가해주세요.',
      fields: [
        { key: 'year', label: '년도', placeholder: '예: 2016' },
        { key: 'title', label: '제목', placeholder: '논문 제목' },
        { key: 'venue', label: '주관 / 학회', placeholder: '예: ISRRT / Seoul' }
      ],
      summary: function (it) { return it.title || '(제목 없음)'; },
      sub: function (it) { return (it.year || '') + (it.venue ? ' · ' + it.venue : ''); }
    }
  };

  var MILITARY_FIELDS = [
    { key: 'period', label: '복무기간', placeholder: '예: 1999.10 ~ 2001.12' },
    { key: 'branch', label: '군별', placeholder: '예: 육군' },
    { key: 'rank', label: '계급', placeholder: '예: 병장' },
    { key: 'mos', label: '병과', placeholder: '예: 포병' },
    { key: 'status', label: '군필여부', placeholder: '예: 만기전역' },
    { key: 'veteran', label: '보훈대상', placeholder: '예: 비대상' }
  ];

  // ── 섹션 렌더 ──────────────────────────────────────────────
  function renderResumeSections() {
    var root = document.getElementById('resumeSections');
    if (!root) return;
    var p = _profile();
    if (!p) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    Object.keys(SECTIONS).forEach(function (key) {
      root.appendChild(_renderSection(key, SECTIONS[key], p[key] || []));
    });
    root.appendChild(_renderMilitary(p.military));
    root.appendChild(_renderCoverLetter(p.coverLetter));
  }

  function _renderSection(key, def, items) {
    var box = document.createElement('div');
    box.style.cssText = 'border:1px solid var(--border-glass);border-radius:8px;padding:12px 14px;margin-bottom:10px;';
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
    var t = document.createElement('div');
    t.style.cssText = 'font-weight:700;font-size:0.9rem;';
    t.textContent = def.icon + ' ' + def.label + ' (' + items.length + ')';
    var add = document.createElement('button');
    add.className = 'btn btn-outline';
    add.style.cssText = 'padding:4px 10px;font-size:0.72rem;';
    add.textContent = '+ 추가';
    add.onclick = function () { openResumeItemSheet(key); };
    header.appendChild(t);
    header.appendChild(add);
    box.appendChild(header);

    if (items.length === 0) {
      var empty = document.createElement('p');
      empty.textContent = def.empty;
      empty.style.cssText = 'font-size:0.72rem;color:var(--text-muted);margin:6px 0;';
      box.appendChild(empty);
    } else {
      items.forEach(function (it) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px dashed var(--border-glass);';
        var info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';
        var s1 = document.createElement('div');
        s1.style.cssText = 'font-size:0.82rem;font-weight:600;';
        s1.textContent = def.summary(it);
        var s2 = document.createElement('div');
        s2.style.cssText = 'font-size:0.7rem;color:var(--text-muted);';
        s2.textContent = def.sub(it);
        info.appendChild(s1);
        info.appendChild(s2);
        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:4px;flex-shrink:0;';
        var ed = document.createElement('button');
        ed.textContent = '✎';
        ed.style.cssText = 'font-size:0.7rem;padding:2px 6px;border:1px solid var(--border-glass);border-radius:4px;background:none;cursor:pointer;';
        ed.onclick = function () { openResumeItemSheet(key, it); };
        var dl = document.createElement('button');
        dl.textContent = '🗑';
        dl.style.cssText = 'font-size:0.7rem;padding:2px 6px;border:1px solid var(--border-glass);border-radius:4px;background:none;cursor:pointer;';
        dl.onclick = function () {
          if (!confirm('삭제할까요?')) return;
          var pp = _profile();
          pp[key] = (pp[key] || []).filter(function (x) { return x.id !== it.id; });
          _saveProfile(pp);
          renderResumeSections();
        };
        btns.appendChild(ed);
        btns.appendChild(dl);
        row.appendChild(info);
        row.appendChild(btns);
        box.appendChild(row);
      });
    }
    return box;
  }

  function _renderMilitary(m) {
    var box = document.createElement('div');
    box.style.cssText = 'border:1px solid var(--border-glass);border-radius:8px;padding:12px 14px;margin-bottom:10px;';
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
    var t = document.createElement('div');
    t.style.cssText = 'font-weight:700;font-size:0.9rem;';
    t.textContent = '🪖 군 경력';
    var btn = document.createElement('button');
    btn.className = 'btn btn-outline';
    btn.style.cssText = 'padding:4px 10px;font-size:0.72rem;';
    btn.textContent = (m && m.period) ? '편집' : '+ 입력';
    btn.onclick = function () { openMilitarySheet(); };
    header.appendChild(t);
    header.appendChild(btn);
    box.appendChild(header);
    if (m && m.period) {
      var s = document.createElement('div');
      s.style.cssText = 'font-size:0.78rem;';
      s.textContent = (m.period || '') + ' · ' + (m.branch || '') + ' · ' + (m.rank || '') + ' · ' + (m.mos || '');
      box.appendChild(s);
    } else {
      var p = document.createElement('p');
      p.style.cssText = 'font-size:0.72rem;color:var(--text-muted);margin:0;';
      p.textContent = '군 경력을 입력하면 PDF 이력서에 표시됩니다.';
      box.appendChild(p);
    }
    return box;
  }

  function _renderCoverLetter(text) {
    var box = document.createElement('div');
    box.style.cssText = 'border:1px solid var(--border-glass);border-radius:8px;padding:12px 14px;margin-bottom:10px;';
    var t = document.createElement('div');
    t.style.cssText = 'font-weight:700;font-size:0.9rem;margin-bottom:8px;';
    t.textContent = '📝 자기소개서 (선택)';
    var ta = document.createElement('textarea');
    ta.id = 'coverLetterTextarea';
    ta.rows = 5;
    ta.placeholder = '지원동기, 강점, 입사 후 목표 등을 자유롭게 작성하세요.';
    ta.style.cssText = 'width:100%;padding:10px 12px;border:1px solid var(--border-glass);border-radius:8px;font-size:0.82rem;resize:vertical;';
    ta.value = text || '';
    ta.onblur = function () {
      var p = _profile();
      p.coverLetter = ta.value;
      _saveProfile(p);
    };
    box.appendChild(t);
    box.appendChild(ta);
    return box;
  }

  // ── 입력 시트 ──────────────────────────────────────────────
  var _itemCtx = { section: null, id: null };

  function openResumeItemSheet(sectionKey, item) {
    var def = SECTIONS[sectionKey];
    if (!def) return;
    _itemCtx = { section: sectionKey, id: item ? item.id : null };
    _populateSheetFields(def.fields, item, (item ? '편집' : '추가') + ' · ' + def.label);
  }

  function openMilitarySheet() {
    var p = _profile();
    _itemCtx = { section: '__military__', id: null };
    _populateSheetFields(MILITARY_FIELDS, p.military || {}, '군 경력');
  }

  function _populateSheetFields(fields, item, title) {
    var fieldsRoot = document.getElementById('resumeItemFields');
    var titleEl = document.getElementById('resumeItemSheetTitle');
    if (titleEl) titleEl.textContent = title;
    while (fieldsRoot.firstChild) fieldsRoot.removeChild(fieldsRoot.firstChild);
    fields.forEach(function (f) {
      var wrap = document.createElement('div');
      var lab = document.createElement('label');
      lab.style.cssText = 'font-size:0.78rem;font-weight:600;display:block;margin-bottom:4px;';
      lab.textContent = f.label;
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.id = 'rsField_' + f.key;
      inp.placeholder = f.placeholder || '';
      inp.value = item ? (item[f.key] || '') : '';
      inp.style.cssText = 'width:100%;padding:10px 12px;border:1px solid var(--border-glass);border-radius:8px;font-size:0.88rem;';
      wrap.appendChild(lab);
      wrap.appendChild(inp);
      fieldsRoot.appendChild(wrap);
    });
    var sheet = document.getElementById('resumeItemSheet');
    if (sheet) { sheet.style.display = 'block'; document.body.style.overflow = 'hidden'; }
  }

  function closeResumeItemSheet() {
    var sheet = document.getElementById('resumeItemSheet');
    if (sheet) sheet.style.display = 'none';
    document.body.style.overflow = '';
  }

  function saveResumeItem() {
    if (_itemCtx.section === '__military__') {
      var p = _profile();
      var m = {};
      MILITARY_FIELDS.forEach(function (f) {
        var el = document.getElementById('rsField_' + f.key);
        m[f.key] = el ? el.value.trim() : '';
      });
      p.military = m;
      _saveProfile(p);
      closeResumeItemSheet();
      renderResumeSections();
      return;
    }
    var def = SECTIONS[_itemCtx.section];
    if (!def) return;
    var data = { id: _itemCtx.id || _genId() };
    def.fields.forEach(function (f) {
      var el = document.getElementById('rsField_' + f.key);
      data[f.key] = el ? el.value.trim() : '';
    });
    var pp = _profile();
    var arr = pp[_itemCtx.section] || [];
    if (_itemCtx.id) {
      var i = arr.findIndex(function (x) { return x.id === _itemCtx.id; });
      if (i >= 0) arr[i] = data; else arr.push(data);
    } else {
      arr.push(data);
    }
    pp[_itemCtx.section] = arr;
    _saveProfile(pp);
    closeResumeItemSheet();
    renderResumeSections();
  }

  // ── 이력서 미리보기 + PDF ─────────────────────────────────
  function _formatPeriod(from, to) {
    if (!from && !to) return '';
    var f = (from || '?').replace('-', '.');
    var t = to ? to.replace('-', '.') : '현재';
    return f + ' ~ ' + t;
  }

  // 안전한 DOM 빌더 헬퍼
  function _h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'style') el.style.cssText = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function _table(headers, rows) {
    var thead = _h('thead', null, [_h('tr', null, headers.map(function (h) {
      return _h('th', h.style ? { style: h.style } : null, [h.label || h]);
    }))]);
    var tbody = _h('tbody', null, rows);
    return _h('table', { class: 'rs-table' }, [thead, tbody]);
  }

  function _row(cells) {
    return _h('tr', null, cells.map(function (c) {
      if (c && c.nodeType) return _h('td', null, [c]);
      return _h('td', null, [c == null ? '' : String(c)]);
    }));
  }

  function _rotationsCell(item) {
    var deptText = document.createElement('div');
    deptText.textContent = item.dept || '';
    deptText.style.cssText = 'font-weight:600;';
    if (!item.rotations || !item.rotations.length) return deptText;
    var ul = _h('ul', { class: 'rs-rotations' }, item.rotations.slice().sort(function (a, b) {
      return (a.from || '').localeCompare(b.from || '');
    }).map(function (r) {
      var li = _h('li', null, [
        _h('span', { class: 'rs-rot-period' }, [_formatPeriod(r.from, r.to)]),
        ' ',
        _h('strong', null, [r.room || ''])
      ]);
      if (r.tasks) {
        var d = _h('div', { class: 'rs-rot-tasks' }, []);
        d.textContent = r.tasks;
        li.appendChild(d);
      }
      return li;
    }));
    var wrap = document.createElement('div');
    wrap.appendChild(deptText);
    wrap.appendChild(ul);
    return wrap;
  }

  function _section(title, child) {
    var frag = document.createDocumentFragment();
    frag.appendChild(_h('h2', { class: 'rs-h2' }, [title]));
    frag.appendChild(child);
    return frag;
  }

  function _buildResumeNode(p, wh) {
    var page = _h('div', { class: 'resume-page' }, []);
    page.appendChild(_h('h1', { class: 'rs-name' }, [(p.name || '이름') + ' 이력서']));

    var meta = _h('div', { class: 'rs-meta' }, []);
    if (p.birthDate) meta.appendChild(_h('div', null, ['생년월일: ' + p.birthDate]));
    meta.appendChild(_h('div', null, [
      '현재 소속: ' + (p.hospital || '서울대학교병원') + (p.department ? ' · ' + p.department : '')
    ]));
    page.appendChild(meta);

    // 경력
    if (wh && wh.length) {
      var careerRows = wh.slice().sort(function (a, b) { return (b.from || '').localeCompare(a.from || ''); })
        .map(function (it) {
          return _h('tr', null, [
            _h('td', null, [_formatPeriod(it.from, it.to)]),
            _h('td', null, [_rotationsCell(it)]),
            _h('td', null, [it.role || ''])
          ]);
        });
      page.appendChild(_section('경력', _table(
        [{ label: '근무기간', style: 'width:22%' }, { label: '회사 / 부서' }, { label: '직책 / 직위', style: 'width:22%' }],
        careerRows
      )));
    } else {
      page.appendChild(_section('경력', _h('p', { class: 'rs-empty' }, ['근무이력 없음'])));
    }

    if ((p.education || []).length) {
      page.appendChild(_section('학력', _table(
        ['재학기간', '학위/구분', '학교명', '전공', '학점'],
        p.education.map(function (e) { return _row([e.period, e.degree, e.school, e.major, e.grade]); })
      )));
    }
    if ((p.licenses || []).length) {
      page.appendChild(_section('자격 / 면허', _table(
        ['취득일', '구분', '자격/면허명', '발행처'],
        p.licenses.map(function (l) { return _row([l.date, l.type, l.name, l.issuer]); })
      )));
    }
    if ((p.papers || []).length) {
      page.appendChild(_section('논문', _table(
        ['년도', '제목', '주관'],
        p.papers.map(function (pp) { return _row([pp.year, pp.title, pp.venue]); })
      )));
    }
    var m = p.military || {};
    if (m.period) {
      page.appendChild(_section('군 경력', _table(
        ['복무기간', '군별', '계급', '병과', '군필여부', '보훈대상'],
        [_row([m.period, m.branch, m.rank, m.mos, m.status, m.veteran])]
      )));
    }
    if (p.coverLetter) {
      var cover = _h('div', { class: 'rs-cover' }, []);
      cover.textContent = p.coverLetter;
      page.appendChild(_section('자기소개서', cover));
    }
    return page;
  }

  function printResume() {
    var p = _profile();
    if (!p) return;
    var wh;
    var _rhK = window.getUserStorageKey ? window.getUserStorageKey('snuhmate_work_history') : 'snuhmate_work_history_guest';
    var _legacyRhK = window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
    try { wh = JSON.parse(localStorage.getItem(_rhK) || localStorage.getItem(_legacyRhK) || '[]'); } catch (e) { wh = []; }
    (wh || []).forEach(function (it) { if (!Array.isArray(it.rotations)) it.rotations = []; });

    var target = document.getElementById('printableResume');
    if (!target) return;
    while (target.firstChild) target.removeChild(target.firstChild);
    target.appendChild(_buildResumeNode(p, wh));

    document.body.classList.add('printing-resume');
    var cleanup = function () {
      document.body.classList.remove('printing-resume');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(function () { window.print(); }, 50);
  }

  global.renderResumeSections = renderResumeSections;
  global.openResumeItemSheet = openResumeItemSheet;
  global.closeResumeItemSheet = closeResumeItemSheet;
  global.saveResumeItem = saveResumeItem;
  global.openMilitarySheet = openMilitarySheet;
  global.printResume = printResume;
})(window);

// Phase 5: 호환층 — IIFE 내부에서 이미 global.X 노출 중 (line 442-447). 중복 제거.
// closeResumeItemSheet / saveResumeItem 등은 IIFE 안에서 정의되므로 모듈 스코프에서 직접 접근 불가.
export {};
