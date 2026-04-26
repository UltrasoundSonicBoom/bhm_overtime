/**
 * SNUH Mate Companion — Popup Logic
 * 미니 캘린더 + Quick Capture + PDF 가져오기
 */
(function () {
  'use strict';

  var selectedDate = null;
  var currentYear, currentMonth; // 0-indexed month

  // ── Mini Calendar ──
  function renderMiniCalendar(year, month) {
    currentYear = year;
    currentMonth = month;

    var root = document.getElementById('quickCaptureCalendar');
    // Clear children safely
    while (root.firstChild) root.removeChild(root.firstChild);

    var today = new Date();
    var todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

    // Header
    var header = document.createElement('div');
    header.className = 'cal-header';

    var prevBtn = document.createElement('button');
    prevBtn.textContent = '\u25C0';
    prevBtn.onclick = function () { renderMiniCalendar(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1); };

    var title = document.createElement('span');
    title.className = 'cal-title';
    title.textContent = year + '.' + String(month + 1).padStart(2, '0');

    var nextBtn = document.createElement('button');
    nextBtn.textContent = '\u25B6';
    nextBtn.onclick = function () { renderMiniCalendar(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1); };

    header.appendChild(prevBtn);
    header.appendChild(title);
    header.appendChild(nextBtn);
    root.appendChild(header);

    // Day labels
    var grid = document.createElement('div');
    grid.className = 'cal-grid';
    var dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    dayLabels.forEach(function (d) {
      var label = document.createElement('span');
      label.className = 'cal-day-label';
      label.textContent = d;
      grid.appendChild(label);
    });

    // Days
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevDays = new Date(year, month, 0).getDate();

    // Previous month filler
    for (var i = firstDay - 1; i >= 0; i--) {
      var btn = document.createElement('button');
      btn.className = 'cal-day other-month';
      btn.textContent = prevDays - i;
      grid.appendChild(btn);
    }

    // Current month
    for (var d = 1; d <= daysInMonth; d++) {
      var dayBtn = document.createElement('button');
      dayBtn.className = 'cal-day';
      dayBtn.textContent = d;

      var dateStr = formatDate(year, month, d);
      dayBtn.dataset.date = dateStr;

      if (dateStr === todayStr) dayBtn.classList.add('today');
      if (dateStr === selectedDate) dayBtn.classList.add('selected');
      if (new Date(year, month, d).getDay() === 0) dayBtn.classList.add('sunday');

      dayBtn.onclick = function () {
        selectedDate = this.dataset.date;
        root.dataset.selectedDate = selectedDate;
        renderMiniCalendar(currentYear, currentMonth);
      };
      grid.appendChild(dayBtn);
    }

    // Next month filler
    var remaining = 7 - ((firstDay + daysInMonth) % 7);
    if (remaining < 7) {
      for (var n = 1; n <= remaining; n++) {
        var nextBtn2 = document.createElement('button');
        nextBtn2.className = 'cal-day other-month';
        nextBtn2.textContent = n;
        grid.appendChild(nextBtn2);
      }
    }

    root.appendChild(grid);

    if (selectedDate) root.dataset.selectedDate = selectedDate;
  }

  function formatDate(y, m, d) {
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  // ── Capture Type Toggle ──
  function initTypeButtons() {
    var container = document.getElementById('captureType');
    var timeInputs = document.getElementById('timeInputs');

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('.type-btn');
      if (!btn) return;

      container.querySelectorAll('.type-btn').forEach(function (b) {
        b.classList.remove('active');
        b.removeAttribute('data-active');
      });
      btn.classList.add('active');
      btn.setAttribute('data-active', '1');

      if (btn.dataset.kind === 'oncall_standby') {
        timeInputs.style.display = 'none';
      } else {
        timeInputs.style.display = '';
      }
    });
  }

  // ── Quick Capture Submit ──
  async function submitQuickCapture() {
    var statusEl = document.getElementById('captureStatus');
    var saveBtn = document.getElementById('saveQuickCapture');

    if (!selectedDate) {
      statusEl.textContent = '날짜를 선택해주세요';
      statusEl.className = 'status-msg error';
      return;
    }

    var activeBtn = document.querySelector('#captureType [data-active="1"]');
    var kind = activeBtn ? activeBtn.dataset.kind : 'overtime';

    var payload = {
      kind: kind,
      date: selectedDate,
      startTime: document.getElementById('startTime').value,
      endTime: document.getElementById('endTime').value,
      memo: document.getElementById('memo').value,
      isHoliday: document.getElementById('isHoliday').checked
    };

    saveBtn.disabled = true;
    statusEl.textContent = '저장 중...';
    statusEl.className = 'status-msg';

    try {
      var response = await chrome.runtime.sendMessage({
        type: 'QUICK_CAPTURE',
        payload: payload
      });

      if (response && response.ok) {
        statusEl.textContent = '저장 완료!';
        statusEl.className = 'status-msg success';
        setTimeout(function () { window.close(); }, 1200);
      } else {
        statusEl.textContent = (response && response.error) || '저장 실패';
        statusEl.className = 'status-msg error';
      }
    } catch (err) {
      statusEl.textContent = err.message || '오류 발생';
      statusEl.className = 'status-msg error';
    } finally {
      saveBtn.disabled = false;
    }
  }

  // ── PDF Import ──
  async function importPdfFromUrl(url, fileName) {
    var statusEl = document.getElementById('captureStatus');
    statusEl.textContent = 'PDF 가져오는 중...';
    statusEl.className = 'status-msg';

    try {
      await chrome.runtime.sendMessage({
        type: 'IMPORT_PAYSLIP_FROM_URL',
        payload: { url: url, fileName: fileName || 'payslip.pdf' }
      });
      statusEl.textContent = 'PDF 전달 완료!';
      statusEl.className = 'status-msg success';
    } catch (err) {
      statusEl.textContent = err.message || 'PDF 가져오기 실패';
      statusEl.className = 'status-msg error';
    }
  }

  async function importCurrentTabPdf() {
    try {
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      var tab = tabs && tabs[0];
      if (!tab || !tab.url) return;

      if (/\.pdf($|\?)/i.test(tab.url) || (tab.url.indexOf('content-type=application/pdf') !== -1)) {
        await importPdfFromUrl(tab.url, tab.title || 'payslip.pdf');
      } else {
        var statusEl = document.getElementById('captureStatus');
        statusEl.textContent = '현재 탭이 PDF가 아닙니다';
        statusEl.className = 'status-msg error';
      }
    } catch (err) {
      // ignore
    }
  }

  async function loadRecentPdf() {
    try {
      var data = await chrome.storage.local.get('lastPdfCandidate');
      var candidate = data.lastPdfCandidate;
      var listEl = document.getElementById('recentPdfList');

      if (!candidate || !candidate.url || (Date.now() - candidate.at > 24 * 60 * 60 * 1000)) {
        return;
      }

      // Clear and rebuild safely
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      var item = document.createElement('div');
      item.className = 'recent-pdf-item';
      var displayName = candidate.filename
        ? candidate.filename.split('/').pop().split('\\').pop()
        : 'PDF 파일';
      item.textContent = displayName;
      item.onclick = function () {
        importPdfFromUrl(candidate.url, candidate.filename || 'payslip.pdf');
      };
      listEl.appendChild(item);
    } catch (e) {
      // ignore
    }
  }

  // ── Init ──
  document.addEventListener('DOMContentLoaded', function () {
    var now = new Date();
    selectedDate = formatDate(now.getFullYear(), now.getMonth(), now.getDate());
    renderMiniCalendar(now.getFullYear(), now.getMonth());

    initTypeButtons();

    document.getElementById('saveQuickCapture').addEventListener('click', submitQuickCapture);
    document.getElementById('importCurrentPdf').addEventListener('click', importCurrentTabPdf);

    loadRecentPdf();
  });
})();
