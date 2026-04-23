// orphan-recovery.js — Orphan 데이터 복구 UI
// ── Orphan 복구 UI ──
(function () {
  var TYPE_LABELS = {
    overtimeRecords: '시간외 기록',
    leaveRecords: '휴가 기록',
    bhm_hr_profile: '프로필',
    otManualHourly: '수동 시급'
  };
  function _guessType(key) {
    for (var base in TYPE_LABELS) {
      if (key.toLowerCase().indexOf(base.toLowerCase()) !== -1) return base;
    }
    return null;
  }
  function _parseDate(orphanKey) {
    var m = orphanKey.match(/_orphan_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
    if (!m) return null;
    try {
      var iso = m[1].replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3Z');
      return new Date(iso);
    } catch (e) { return null; }
  }
  function _formatDate(d) {
    if (!d || isNaN(d.getTime())) return '날짜 불명';
    return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' +
      String(d.getDate()).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  }
  function _scanOrphans() {
    var results = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('_orphan_') !== -1) results.push(k);
    }
    return results;
  }
  function _makeBtn(label, color) {
    var b = document.createElement('button');
    b.className = 'btn btn-outline';
    b.textContent = label;
    b.style.cssText = 'font-size:var(--text-label-small);padding:4px 10px;color:' + color + ';border-color:' + color + ';';
    return b;
  }
  function renderOrphanSection() {
    var orphans = _scanOrphans();
    var section = document.getElementById('orphanRecoverySection');
    var list = document.getElementById('orphanList');
    var badge = document.getElementById('orphanCountBadge');
    if (!section || !list || !badge) return;
    if (orphans.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    badge.textContent = String(orphans.length);
    // 이전 노드 제거 (이벤트 리스너 포함)
    var newList = list.cloneNode(false);
    list.parentNode.replaceChild(newList, list);
    list = newList;
    orphans.forEach(function (key) {
      var typeBase = _guessType(key);
      var typeLabel = typeBase ? TYPE_LABELS[typeBase] : '알 수 없음';
      var d = _parseDate(key);
      var dateStr = _formatDate(d);
      var raw = localStorage.getItem(key);
      var previewText = '';
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) previewText = parsed.length + '개 항목';
        else if (parsed && typeof parsed.name === 'string') previewText = parsed.name.slice(0, 30);
      } catch (e) { }

      var row = document.createElement('div');
      row.style.cssText = 'border:1px solid var(--border-glass);border-radius:10px;padding:10px 12px;background:var(--bg-hover);display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

      var info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:120px;';
      var titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-weight:600;font-size:var(--text-body-normal);color:var(--text-primary);';
      titleEl.textContent = typeLabel;
      var metaEl = document.createElement('div');
      metaEl.style.cssText = 'font-size:var(--text-label-small);color:var(--text-muted);';
      metaEl.textContent = dateStr + (previewText ? ' · ' + previewText : '');
      info.appendChild(titleEl);
      info.appendChild(metaEl);

      var restoreBtn = _makeBtn('복구', 'var(--accent-emerald)');
      var deleteBtn = _makeBtn('삭제', 'var(--accent-rose)');

      (function (oKey, base) {
        restoreBtn.addEventListener('click', function () {
          if (!base) { alert('데이터 유형을 자동 인식하지 못했어요. 직접 백업 복원을 이용해주세요.'); return; }
          var label2 = TYPE_LABELS[base] || base;
          if (!confirm('"' + label2 + '" 을 이 백업으로 복구할까요?\n현재 데이터는 새 백업으로 보관됩니다.')) return;
          var activeKey = window.getUserStorageKey ? window.getUserStorageKey(base) : base + '_guest';
          var current = localStorage.getItem(activeKey);
          if (current) {
            var stamp = new Date().toISOString().replace(/[:.]/g, '-');
            localStorage.setItem(activeKey + '_orphan_' + stamp + '_before_restore', current);
          }
          localStorage.setItem(activeKey, localStorage.getItem(oKey));
          localStorage.setItem('bhm_lastEdit_' + activeKey, new Date().toISOString());
          localStorage.removeItem(oKey);
          if (window.OT && window.OT.renderList) window.OT.renderList();
          if (window.LEAVE && window.LEAVE.renderList) window.LEAVE.renderList();
          if (window.PROFILE && window.PROFILE.render) window.PROFILE.render();
          renderOrphanSection();
          var t = document.getElementById('otToast');
          if (t) { t.textContent = '복구 완료.'; t.style.display = 'block'; setTimeout(function () { t.style.display = 'none'; }, 4000); }
        });
        deleteBtn.addEventListener('click', function () {
          if (!confirm('이 백업을 삭제할까요? 복구할 수 없어요.')) return;
          localStorage.removeItem(oKey);
          renderOrphanSection();
        });
      })(key, typeBase);

      row.appendChild(info);
      row.appendChild(restoreBtn);
      row.appendChild(deleteBtn);
      list.appendChild(row);
    });
  }
  document.addEventListener('DOMContentLoaded', renderOrphanSection);
  window._renderOrphanSection = renderOrphanSection;
})();
