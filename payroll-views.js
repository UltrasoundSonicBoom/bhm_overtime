// ── payroll-views.js ──
// 급여 탭 시각적 렌더링: 히스토리(대시보드) + 명세서(뷰어)
// DOM API 사용 (innerHTML 미사용)
// Phase 5: cross-module 명시 named import (IIFE 안에서 사용)
import { PAYROLL } from './payroll.js';
import { SALARY_PARSER } from './salary-parser.js';
import { PROFILE } from './profile.js';

(function () {
  'use strict';

  // ── 유틸리티 ──
  const fmt = n => (n != null && n > 0) ? n.toLocaleString() + '원' : '-';
  const fmtNum = n => (n != null) ? n.toLocaleString() : '0';
  const fmtSign = n => {
    if (n == null || n === 0) return '-';
    return (n > 0 ? '+' : '') + n.toLocaleString() + '원';
  };
  const pct = (part, total) => total > 0 ? Math.round(part / total * 100) : 0;

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(k => {
        if (k === 'style' && typeof attrs[k] === 'object') {
          Object.assign(e.style, attrs[k]);
        } else if (k === 'className') {
          e.className = attrs[k];
        } else if (k === 'textContent') {
          e.textContent = attrs[k];
        } else if (k.startsWith('on')) {
          e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else {
          e.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (c == null) return;
        if (typeof c === 'string') e.appendChild(document.createTextNode(c));
        else e.appendChild(c);
      });
    }
    return e;
  }

  function getAllMonthData() {
    const months = SALARY_PARSER.listSavedMonths();
    return months.map(m => {
      const d = SALARY_PARSER.loadMonthlyData(m.year, m.month, m.type);
      return { year: m.year, month: m.month, type: m.type || '급여', data: d };
    }).filter(m => {
      if (!m.data) return false;
      // 실제 급여 데이터가 있는 월만 (시뮬레이터 빈 저장 제외)
      const s = m.data.summary;
      if (!s) return false;
      return (s.netPay > 0 || s.grossPay > 0);
    });
  }

  // 같은 달의 모든 명세서를 합산한 집계 객체 반환
  function getMonthAggregate(allData, year, month) {
    const entries = allData.filter(m => m.year === year && m.month === month);
    if (entries.length === 0) return null;
    if (entries.length === 1) return entries[0];

    // 항목별 합산 (같은 이름이면 금액 누적)
    const salMap = {}, dedMap = {};
    entries.forEach(function (m) {
      (m.data.salaryItems || []).forEach(function (i) {
        salMap[i.name] = (salMap[i.name] || 0) + (i.amount || 0);
      });
      (m.data.deductionItems || []).forEach(function (i) {
        dedMap[i.name] = (dedMap[i.name] || 0) + (i.amount || 0);
      });
    });
    const salaryItems = Object.keys(salMap).map(name => ({ name, amount: salMap[name] }));
    const deductionItems = Object.keys(dedMap).map(name => ({ name, amount: dedMap[name] }));
    const grossPay = salaryItems.reduce((s, i) => s + i.amount, 0);
    const totalDeduction = deductionItems.reduce((s, i) => s + i.amount, 0);

    return {
      year, month, type: '합계',
      data: {
        salaryItems, deductionItems,
        summary: { grossPay, totalDeduction, netPay: grossPay - totalDeduction },
        metadata: entries[0].data.metadata,
      }
    };
  }

  // 이전 달 year/month 계산
  function prevCalendarMonth(year, month) {
    return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  }

  // ── initPayrollTab ──
  window.initPayrollTab = function () {
    const active = document.querySelector('#tab-payroll .pay-bookmark-tab.active');
    const name = active ? active.dataset.subtab : 'pay-payslip';
    if (name === 'pay-payslip') renderPayPayslip();
    else if (name === 'pay-calc') { PAYROLL.init(); }
    else if (name === 'pay-qa') { PAYROLL.init(); }
  };

  // ══════════════════════════════════════════════
  // ██ 히스토리 탭 (대시보드)
  // ══════════════════════════════════════════════
  window.renderPayHistory = function () {
    const container = document.getElementById('payHistoryView');
    if (!container) return;
    try {
    container.textContent = '';

    const allData = getAllMonthData();

    // ── 데이터 없을 때 ──
    if (allData.length === 0) {
      container.appendChild(buildEmptyState(
        '급여 히스토리',
        '저장된 급여명세서가 없습니다.',
        '명세서 탭에서 급여명세서를 업로드해주세요.',
        function () {
          const payslipTab = document.querySelector('.pay-bookmark-tab[data-subtab="pay-payslip"]');
          if (payslipTab) payslipTab.click();
        },
        '명세서 탭으로 이동'
      ));
      return;
    }

    const latest = allData[0];
    const prev = allData.length > 1 ? allData[1] : null;
    const net = latest.data.summary?.netPay || 0;
    const prevNet = prev ? (prev.data.summary?.netPay || 0) : 0;
    const diff = prev ? net - prevNet : 0;

    // 1) 큰 숫자 카드 (실지급액)
    container.appendChild(buildNetPayCard(latest, diff, prev));

    // 2) 6개월 바 차트
    if (allData.length >= 2) {
      container.appendChild(buildBarChart(allData.slice(0, 6).reverse()));
    }

    // 3) 변동 요인 분석
    if (prev) {
      container.appendChild(buildChangeFactors(latest, prev));
    }

    // 4) 통계 카드
    container.appendChild(buildStatsRow(allData));

    // 5) 아카이브 배너
    container.appendChild(buildArchiveBanner(allData.length));
    } catch (err) {
      console.error('[renderPayHistory]', err);
      container.textContent = '';
      const errCard = el('div', { className: 'card', style: { textAlign: 'center', padding: '24px' } });
      errCard.appendChild(el('div', { style: { color: 'var(--accent-rose)', fontWeight: '700', marginBottom: '8px' }, textContent: '⚠️ 히스토리 표시 오류' }));
      errCard.appendChild(el('div', { style: { color: 'var(--text-muted)', fontSize: 'var(--text-body-small)' }, textContent: err.message || String(err) }));
      container.appendChild(errCard);
    }
  };

  // ── 실지급액 큰 숫자 카드 ──
  function buildNetPayCard(latest, diff, prev) {
    const card = el('div', { className: 'card pay-net-card' });
    card.appendChild(el('div', {
      className: 'pay-net-label',
      textContent: latest.year + '년 ' + latest.month + '월 실지급액'
    }));
    card.appendChild(el('div', {
      className: 'pay-net-amount',
      textContent: fmtNum(latest.data.summary?.netPay || 0) + '원'
    }));
    if (prev && diff !== 0) {
      const diffEl = el('div', {
        className: 'pay-net-diff ' + (diff > 0 ? 'up' : 'down'),
        textContent: '전월 대비 ' + (diff > 0 ? '+' : '') + fmtNum(diff) + '원'
      });
      card.appendChild(diffEl);
    }
    // 지급/공제 요약 행 (보색 카드)
    const row = el('div', { className: 'pay-stats-row' });
    row.appendChild(buildMiniStat('지급합계', latest.data.summary?.grossPay || 0, 'stat-gross'));
    row.appendChild(buildMiniStat('공제합계', latest.data.summary?.totalDeduction || 0, 'stat-deduction'));
    card.appendChild(row);
    return card;
  }

  function buildMiniStat(label, amount, extraClass) {
    const card = el('div', { className: 'pay-stat-card' + (extraClass ? ' ' + extraClass : '') });
    card.appendChild(el('div', {
      style: { fontSize: 'var(--text-body-small)', opacity: '0.85' },
      textContent: label
    }));
    card.appendChild(el('div', {
      style: { fontWeight: '700', fontSize: 'var(--text-body-large)' },
      textContent: fmt(amount)
    }));
    return card;
  }

  // ── 6개월 바 차트 ──
  function buildBarChart(months) {
    const card = el('div', { className: 'card' });
    card.appendChild(el('div', {
      className: 'card-title',
      textContent: '월별 실지급액 추이'
    }));

    const chart = el('div', { className: 'pay-bar-chart' });
    const maxVal = Math.max(...months.map(m => m.data.summary?.netPay || 0), 1);

    months.forEach(m => {
      const net = m.data.summary?.netPay || 0;
      const heightPct = Math.max(Math.round(net / maxVal * 100), 5);
      const col = el('div', { className: 'pay-bar-col' });
      const barWrap = el('div', { className: 'pay-bar-wrap' });
      const bar = el('div', { className: 'pay-bar' });
      bar.style.height = heightPct + '%';
      const valLabel = el('div', { className: 'pay-bar-value', textContent: Math.round(net / 10000) + '만' });
      barWrap.appendChild(valLabel);
      barWrap.appendChild(bar);
      col.appendChild(barWrap);
      col.appendChild(el('div', { className: 'pay-bar-label', textContent: m.month + '월' }));
      chart.appendChild(col);
    });

    card.appendChild(chart);
    return card;
  }

  // ── 변동 요인 분석 ──
  function buildChangeFactors(latest, prev) {
    const card = el('div', { className: 'card' });
    card.appendChild(el('div', {
      className: 'card-title',
      textContent: '전월 대비 변동 요인'
    }));

    const factors = [];
    const latestItems = latest.data.salaryItems || [];
    const prevItems = prev.data.salaryItems || [];
    const latestDed = latest.data.deductionItems || [];
    const prevDed = prev.data.deductionItems || [];

    // 지급 항목 비교
    const prevMap = {};
    prevItems.forEach(i => { prevMap[i.name] = i.amount || 0; });
    latestItems.forEach(i => {
      const p = prevMap[i.name] || 0;
      const d = (i.amount || 0) - p;
      if (d !== 0) factors.push({ name: i.name, diff: d, type: 'salary' });
      delete prevMap[i.name];
    });
    Object.keys(prevMap).forEach(name => {
      if (prevMap[name] !== 0) factors.push({ name: name, diff: -prevMap[name], type: 'salary' });
    });

    // 공제 항목 비교
    const prevDedMap = {};
    prevDed.forEach(i => { prevDedMap[i.name] = i.amount || 0; });
    latestDed.forEach(i => {
      const p = prevDedMap[i.name] || 0;
      const d = (i.amount || 0) - p;
      if (d !== 0) factors.push({ name: i.name, diff: -d, type: 'deduction' });
      delete prevDedMap[i.name];
    });
    Object.keys(prevDedMap).forEach(name => {
      if (prevDedMap[name] !== 0) factors.push({ name: name, diff: prevDedMap[name], type: 'deduction' });
    });

    factors.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    if (factors.length === 0) {
      card.appendChild(el('p', {
        style: { color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' },
        textContent: '전월과 동일한 급여입니다.'
      }));
    } else {
      factors.slice(0, 5).forEach(f => {
        const row = el('div', { className: 'pay-factor-row' });
        const icon = el('span', {
          className: 'pay-factor-icon ' + (f.diff > 0 ? 'up' : 'down'),
          textContent: f.diff > 0 ? '▲' : '▼'
        });
        row.appendChild(icon);
        row.appendChild(el('span', { className: 'pay-factor-name', textContent: f.name }));
        row.appendChild(el('span', {
          className: 'pay-factor-amount ' + (f.diff > 0 ? 'up' : 'down'),
          textContent: (f.diff > 0 ? '+' : '') + fmtNum(f.diff) + '원'
        }));
        card.appendChild(row);
      });
    }

    return card;
  }

  // ── 통계 카드 ──
  function buildStatsRow(allData) {
    const card = el('div', { className: 'card' });
    const nets = allData.map(m => m.data.summary?.netPay || 0).filter(n => n > 0);
    const avg = nets.length > 0 ? Math.round(nets.reduce((a, b) => a + b, 0) / nets.length) : 0;
    const max = nets.length > 0 ? Math.max(...nets) : 0;
    const min = nets.length > 0 ? Math.min(...nets) : 0;

    const row = el('div', { className: 'pay-stats-row' });
    row.appendChild(buildStatCard('평균', avg));
    row.appendChild(buildStatCard('최고', max));
    row.appendChild(buildStatCard('최저', min));
    row.appendChild(buildStatCard('저장', allData.length + '개월'));
    card.appendChild(row);
    return card;
  }

  function buildStatCard(label, value) {
    const card = el('div', { className: 'pay-stat-card' });
    card.appendChild(el('div', {
      style: { fontSize: 'var(--text-body-small)', color: 'var(--text-muted)' },
      textContent: label
    }));
    card.appendChild(el('div', {
      style: { fontWeight: '700', fontSize: 'var(--text-body-large)' },
      textContent: typeof value === 'number' ? fmt(value) : value
    }));
    return card;
  }

  // ── 아카이브 배너 ──
  function buildArchiveBanner(count) {
    const banner = el('div', {
      className: 'card',
      style: { textAlign: 'center', padding: '16px', background: 'var(--bg-card)' }
    });
    banner.appendChild(el('div', {
      style: { fontSize: 'var(--text-body-normal)', color: 'var(--text-muted)' },
      textContent: '총 ' + count + '개월의 급여명세서가 안전하게 저장되어 있습니다.'
    }));
    return banner;
  }

  // ══════════════════════════════════════════════
  // ██ 명세서 탭 (시각적 뷰어)
  // ══════════════════════════════════════════════
  let currentPayslipIdx = 0;

  window.renderPayPayslip = function () {
    const headerEl = document.getElementById('payPayslipHeader');
    const sliderEl = document.getElementById('payMonthSlider');
    const visualEl = document.getElementById('payPayslipVisual');
    const archiveEl = document.getElementById('payArchiveList');
    if (!visualEl) return;

    try {
    const allData = getAllMonthData();

    // 헤더 영역 (슬라이더 바로 아래, 우측 정렬) — 데이터 있을 때만 표시
    if (headerEl) {
      headerEl.textContent = '';
      if (allData.length > 0) {
        headerEl.style.display = 'flex';
        headerEl.style.justifyContent = 'flex-end';
        headerEl.style.padding = '0';
        headerEl.style.marginTop = '-20px';
        headerEl.style.marginBottom = '10px';
        headerEl.appendChild(buildTextUploadBtn());
      } else {
        headerEl.style.display = 'none';
      }
    }

    if (allData.length === 0) {
      // 월 슬라이더: 현재 월 표시 (업로드 버튼은 헤더에 이미 있으므로 중복 안 함)
      if (sliderEl) {
        sliderEl.textContent = '';
        const now = new Date();
        const slider = el('div', {
          style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px 0' }
        });
        const prevBtn = el('button', { className: 'btn', textContent: '◀', style: { minWidth: '10px', padding: '6px' } });
        prevBtn.disabled = true;
        const nextBtn = el('button', { className: 'btn', textContent: '▶', style: { minWidth: '10px', padding: '6px' } });
        nextBtn.disabled = true;
        const label = el('span', {
          style: { fontWeight: '700', fontSize: 'var(--text-title-medium)' },
          textContent: now.getFullYear() + '년 ' + (now.getMonth() + 1) + '월'
        });
        slider.appendChild(prevBtn);
        slider.appendChild(label);
        slider.appendChild(nextBtn);
        sliderEl.appendChild(slider);
      }
      visualEl.textContent = '';
      if (archiveEl) archiveEl.textContent = '';
      // Phase 5-followup-2 fix: <label for=""> 패턴 — 브라우저 native 처리, user gesture 보장
      // 이전 패턴 (button onClick → 동적 input 생성 → input.click()) 가 user gesture 손실 → file picker 안 뜸
      const empty = el('div', { className: 'pay-empty-state' });
      empty.appendChild(el('div', { style: { fontSize: '2.5rem', marginBottom: '12px' }, textContent: '📭' }));
      empty.appendChild(el('div', { style: { fontWeight: '600', fontSize: 'var(--text-body-large)', marginBottom: '4px' }, textContent: '아직 등록된 명세서가 없습니다.' }));
      empty.appendChild(el('div', { style: { color: 'var(--text-muted)', fontSize: 'var(--text-body-normal)' }, textContent: 'PDF 는 이 브라우저에만 저장됩니다.' }));

      // <input type="file"> 미리 생성 + DOM attach (label-for 가 작동하려면 같은 DOM 안에 있어야)
      const fileInput = el('input', {
        type: 'file',
        id: 'payslipUploadFileInput',
        accept: '.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp',
        style: { display: 'none' }
      });
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files.length > 0) handleInlineUpload(fileInput.files[0]);
        fileInput.value = '';  // 같은 파일 재선택 가능
      });

      // <label for="..."> — 브라우저 native 위임, user gesture 100% 보장
      const labelBtn = el('label', {
        className: 'btn btn-primary',
        style: { marginTop: '16px', cursor: 'pointer', display: 'inline-block' },
        textContent: '📄 급여명세서 업로드'
      });
      labelBtn.htmlFor = 'payslipUploadFileInput';
      labelBtn.setAttribute('for', 'payslipUploadFileInput');

      empty.appendChild(labelBtn);
      empty.appendChild(fileInput);
      visualEl.appendChild(empty);
      return;
    }

    currentPayslipIdx = Math.min(currentPayslipIdx, allData.length - 1);
    if (currentPayslipIdx < 0) currentPayslipIdx = 0;

    // 월 슬라이더 + 업로드 버튼
    if (sliderEl) buildMonthSlider(sliderEl, allData, currentPayslipIdx);

    // 현재 월 시각적 렌더 (개별 명세서)
    const current = allData[currentPayslipIdx];
    // 전월 비교: 이전 달력월 전체 합산 vs 현재 달력월 전체 합산
    const curAgg = getMonthAggregate(allData, current.year, current.month);
    const pm = prevCalendarMonth(current.year, current.month);
    const prevAgg = getMonthAggregate(allData, pm.year, pm.month);
    buildPayslipVisual(visualEl, current, curAgg, prevAgg);

    // 아카이브 목록
    if (archiveEl) buildArchiveList(archiveEl, allData);
    } catch (err) {
      console.error('[renderPayPayslip]', err);
      visualEl.textContent = '';
      const errCard = el('div', { className: 'card', style: { textAlign: 'center', padding: '24px' } });
      errCard.appendChild(el('div', { style: { color: 'var(--accent-rose)', fontWeight: '700', marginBottom: '8px' }, textContent: '⚠️ 명세서 표시 오류' }));
      errCard.appendChild(el('div', { style: { color: 'var(--text-muted)', fontSize: 'var(--text-body-small)' }, textContent: err.message || String(err) }));
      visualEl.appendChild(errCard);
    }
  };

  // ── 월 슬라이더 + 업로드 버튼 ──
  function buildMonthSlider(container, allData, idx) {
    container.textContent = '';
    const slider = el('div', {
      style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }
    });
    // 좌측 여백 (우측 업로드 버튼과 균형)
    slider.appendChild(el('div', { style: { flex: '1' } }));

    const prevBtn = el('button', {
      className: 'btn',
      textContent: '◀',
      style: { minWidth: '36px', padding: '6px' },
      onClick: function () {
        if (currentPayslipIdx < allData.length - 1) {
          currentPayslipIdx++;
          renderPayPayslip();
        }
      }
    });
    if (idx >= allData.length - 1) prevBtn.disabled = true;

    const cur = allData[idx];
    const typeTag = cur.type && cur.type !== '급여' ? ' (' + cur.type + ')' : '';
    const label = el('span', {
      style: { fontWeight: '700', fontSize: 'var(--text-title-medium)' },
      textContent: cur.year + '년 ' + cur.month + '월' + typeTag
    });

    const nextBtn = el('button', {
      className: 'btn',
      textContent: '▶',
      style: { minWidth: '36px', padding: '6px' },
      onClick: function () {
        if (currentPayslipIdx > 0) {
          currentPayslipIdx--;
          renderPayPayslip();
        }
      }
    });
    if (idx <= 0) nextBtn.disabled = true;

    slider.appendChild(prevBtn);
    slider.appendChild(label);
    slider.appendChild(nextBtn);
    slider.appendChild(el('div', { style: { flex: '1' } }));

    container.appendChild(slider);
  }

  // ── 텍스트 업로드 버튼 (명세서 탭 상단 우측) ──
  // REMOVED auth: drive sign-in helpers — 로컬 전용 앱

  function buildTextUploadBtn() {
    // Phase 5-followup-2 fix: <label for=""> native 위임 — user gesture 보장
    // 이전 button onClick → fileInput.click() 패턴이 일부 브라우저에서 차단됨
    var inputId = 'payTextUploadInput_' + Math.random().toString(36).slice(2, 8);
    const fileInput = el('input', { type: 'file', accept: 'application/pdf,.pdf', id: inputId });
    fileInput.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';

    const btn = el('label', {
      className: 'pay-text-upload-btn',
      textContent: '급여 PDF 업로드',
      style: { cursor: 'pointer' },
    });
    btn.htmlFor = inputId;
    btn.setAttribute('for', inputId);

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files.length > 0) {
        handleInlineUpload(fileInput.files[0]);
        fileInput.value = '';
      }
    });

    const wrap = el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' } });
    const row = el('div', { style: { display: 'inline-flex', gap: '6px' } });
    row.appendChild(btn);
    row.appendChild(fileInput);
    wrap.appendChild(row);
    const note = el('div', {
      style: { fontSize: 'var(--text-body-small)', color: 'var(--text-muted)', textAlign: 'right', maxWidth: '280px' },
      textContent: 'PDF 는 이 브라우저에만 저장됩니다.'
    });
    wrap.appendChild(note);
    return wrap;
  }

  async function handleInlineUpload(file) {
    const visualEl = document.getElementById('payPayslipVisual');
    if (visualEl) {
      const loading = el('div', {
        className: 'card',
        style: { textAlign: 'center', padding: '24px' }
      });
      loading.appendChild(el('div', { textContent: '파일 처리 중...', style: { color: 'var(--text-muted)' } }));
      visualEl.textContent = '';
      visualEl.appendChild(loading);
    }

    try {
      const result = await SALARY_PARSER.parseFile(file);
      const ym = SALARY_PARSER.parsePeriodYearMonth(result);
      if (ym) {
        SALARY_PARSER.saveMonthlyData(ym.year, ym.month, result, ym.type);

        // 프로필 자동 반영 (grade/year/부서/입사일/직종 등) — const SALARY_PARSER 는 top-level 이라 직접 참조 가능
        if (typeof SALARY_PARSER.applyStableItemsToProfile === 'function') {
          SALARY_PARSER.applyStableItemsToProfile(result);
        }

        // 근무정보 자동 배치 이력 생성
        if (typeof window._propagatePayslipToWorkHistory === 'function') {
          window._propagatePayslipToWorkHistory(result, ym);
        }

        currentPayslipIdx = 0;
        renderPayPayslip();

        // Phase 5-followup: 자동 저장 명시 (이슈 3 — 사용자 인지 향상)
        try {
          const toast = document.createElement('div');
          toast.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#10b981; color:#fff; padding:10px 18px; border-radius:8px; z-index:9999; font-size:0.9rem; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.2);';
          toast.textContent = '💾 명세서 ' + ym.year + '년 ' + ym.month + '월 자동 저장됨 — 내 정보 자동 반영 완료';
          document.body.appendChild(toast);
          setTimeout(() => { toast.remove(); }, 3500);
        } catch (e) { /* noop */ }
      } else {
        alert('급여 기간을 인식할 수 없습니다. 파일을 확인해주세요.');
        renderPayPayslip();
      }
    } catch (err) {
      alert('오류: ' + (err.message || '파일 처리 실패'));
      renderPayPayslip();
    }
  }

  // ── 명세서 시각적 렌더 ──
  // current: 현재 선택된 개별 명세서
  // curAgg: 현재 달력월 전체 합산 (전월 비교용)
  // prevAgg: 이전 달력월 전체 합산 (전월 비교용)
  function buildPayslipVisual(container, current, curAgg, prevAgg) {
    container.textContent = '';
    const data = current.data;
    const gross = data.summary?.grossPay || 0;
    const deduction = data.summary?.totalDeduction || 0;
    const net = data.summary?.netPay || 0;
    const total = gross + deduction;

    // 도넛 차트 (지급 vs 공제 비율) — 개별 명세서 기준
    container.appendChild(buildDonutChart(gross, deduction, net, total));

    // 지급 항목 수평 바 — 개별 명세서 기준
    if (data.salaryItems && data.salaryItems.length > 0) {
      container.appendChild(buildHBarSection('지급 내역', data.salaryItems, gross, 'var(--accent-emerald)', null));
    }

    // 공제 항목 수평 바 — 개별 명세서 기준
    if (data.deductionItems && data.deductionItems.length > 0) {
      container.appendChild(buildHBarSection('공제 내역', data.deductionItems, deduction, 'var(--accent-rose)', null));
    }

    // 전월 비교 그리드 — 달력월 합산 기준
    if (prevAgg) {
      container.appendChild(buildCompareGrid(curAgg, prevAgg));
    }
  }

  // ── 급여 구성 컬러바 ──
  function buildDonutChart(gross, deduction, net, total) {
    const card = el('div', { className: 'card' });

    // 실지급액 큰 숫자
    card.appendChild(el('div', {
      style: { fontSize: 'var(--text-label-small)', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' },
      textContent: '실지급액'
    }));
    card.appendChild(el('div', {
      style: { fontSize: '1.5rem', fontWeight: '800', marginBottom: '4px' },
      textContent: fmtNum(net) + '원'
    }));

    // 컬러바
    const grossPct = pct(gross, total);
    const dedPct = 100 - grossPct;

    const bar = el('div', { className: 'pay-colorbar' });
    const grossFill = el('div', { className: 'pay-colorbar-fill' });
    grossFill.style.flex = String(grossPct);
    grossFill.style.background = 'var(--accent-emerald)';
    const dedFill = el('div', { className: 'pay-colorbar-fill' });
    dedFill.style.flex = String(dedPct);
    dedFill.style.background = 'var(--accent-rose)';
    bar.appendChild(grossFill);
    bar.appendChild(dedFill);
    card.appendChild(bar);

    // 레전드
    const legend = el('div', { className: 'pay-colorbar-legend' });
    legend.appendChild(buildColorbarLegendItem('지급 ' + grossPct + '%', gross, 'var(--accent-emerald)'));
    legend.appendChild(buildColorbarLegendItem('공제 ' + dedPct + '%', deduction, 'var(--accent-rose)'));
    card.appendChild(legend);

    return card;
  }

  function buildColorbarLegendItem(label, amount, color) {
    const item = el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } });
    item.appendChild(el('div', {
      className: 'pay-colorbar-dot',
      style: { background: color }
    }));
    const text = el('div');
    text.appendChild(el('div', { style: { fontWeight: '600', fontSize: 'var(--text-body-normal)' }, textContent: label }));
    text.appendChild(el('div', { style: { fontSize: 'var(--text-label-small)', color: 'var(--text-muted)' }, textContent: fmt(amount) }));
    item.appendChild(text);
    return item;
  }

  // ── 수평 바 섹션 ──
  function buildHBarSection(title, items, total, color, prevItems) {
    const card = el('div', { className: 'card' });
    card.appendChild(el('div', { className: 'card-title', textContent: title }));

    const prevMap = {};
    if (prevItems) prevItems.forEach(i => { prevMap[i.name] = i.amount || 0; });

    const sorted = items.slice().sort((a, b) => (b.amount || 0) - (a.amount || 0));
    const maxAmt = sorted.length > 0 ? (sorted[0].amount || 1) : 1;

    sorted.forEach(item => {
      const amt = item.amount || 0;
      const widthPct = Math.max(Math.round(amt / maxAmt * 100), 3);
      const row = el('div', { className: 'pay-hbar-row' });

      const nameEl = el('span', { className: 'pay-hbar-name', textContent: item.name });
      row.appendChild(nameEl);

      const trackEl = el('div', { className: 'pay-hbar-track' });
      const fillEl = el('div', { className: 'pay-hbar-fill' });
      fillEl.style.width = widthPct + '%';
      fillEl.style.background = color;
      trackEl.appendChild(fillEl);
      row.appendChild(trackEl);

      const amtEl = el('span', { className: 'pay-hbar-amount', textContent: fmt(amt) });
      row.appendChild(amtEl);

      // 전월 대비 차이
      if (prevItems && prevMap[item.name] !== undefined) {
        const d = amt - prevMap[item.name];
        if (d !== 0) {
          row.appendChild(el('span', {
            className: 'pay-hbar-diff ' + (d > 0 ? 'up' : 'down'),
            textContent: (d > 0 ? '+' : '') + fmtNum(d)
          }));
        }
      }

      card.appendChild(row);
    });

    // 합계
    const totalRow = el('div', {
      className: 'pay-hbar-row',
      style: { borderTop: '1px solid var(--border-glass)', paddingTop: '8px', marginTop: '4px', fontWeight: '700' }
    });
    totalRow.appendChild(el('span', { className: 'pay-hbar-name', textContent: '합계' }));
    totalRow.appendChild(el('span', { className: 'pay-hbar-amount', textContent: fmt(total) }));
    card.appendChild(totalRow);

    return card;
  }

  // ── 전월 비교 그리드 ──
  function buildCompareGrid(current, prev) {
    const card = el('div', { className: 'card' });
    card.appendChild(el('div', { className: 'card-title', textContent: '전월 비교' }));

    const grid = el('div', { className: 'pay-compare-grid' });

    // 헤더
    const header = el('div', { className: 'cg-header' });
    header.appendChild(el('div', { className: 'cg-name', textContent: '항목' }));
    header.appendChild(el('div', { className: 'cg-val', textContent: prev.month + '월' }));
    header.appendChild(el('div', { className: 'cg-val', textContent: current.month + '월' }));
    header.appendChild(el('div', { className: 'cg-diff', textContent: '차이' }));
    grid.appendChild(header);

    const rows = [
      { name: '지급합계', cur: current.data.summary?.grossPay || 0, pre: prev.data.summary?.grossPay || 0 },
      { name: '공제합계', cur: current.data.summary?.totalDeduction || 0, pre: prev.data.summary?.totalDeduction || 0 },
      { name: '실지급액', cur: current.data.summary?.netPay || 0, pre: prev.data.summary?.netPay || 0 }
    ];

    rows.forEach(r => {
      const row = el('div', { className: 'cg-header' });
      row.appendChild(el('div', { className: 'cg-name', textContent: r.name }));
      row.appendChild(el('div', { className: 'cg-val', textContent: fmt(r.pre) }));
      row.appendChild(el('div', { className: 'cg-val', textContent: fmt(r.cur) }));
      const d = r.cur - r.pre;
      const diffEl = el('div', {
        className: 'cg-diff ' + (d > 0 ? 'up' : d < 0 ? 'down' : ''),
        textContent: d === 0 ? '-' : fmtSign(d)
      });
      row.appendChild(diffEl);
      grid.appendChild(row);
    });

    card.appendChild(grid);
    return card;
  }

  // (업로드 영역 삭제 — 인라인 업로드 버튼으로 대체됨)

  // ── 아카이브 목록 ──
  function buildArchiveList(container, allData) {
    container.textContent = '';
    if (allData.length <= 1) return;

    // 위임 핸들러: 컨테이너에 한 번만 부착 — 리렌더 후 data-* 속성이 바뀌어도 핸들러는 유지
    if (!container._archiveDelegated) {
      container._archiveDelegated = true;
      container.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-action]');
        const row = e.target.closest('.pay-archive-row');
        if (!row) return;

        const idx   = parseInt(row.dataset.idx, 10);
        const year  = parseInt(row.dataset.year, 10);
        const month = parseInt(row.dataset.month, 10);
        const type  = row.dataset.type || '급여';
        const typeTag = type !== '급여' ? ' (' + type + ')' : '';

        if (btn && btn.dataset.action === 'edit') {
          e.stopPropagation();
          openEditModal(year, month, type);
        } else if (btn && btn.dataset.action === 'delete') {
          e.stopPropagation();
          if (!confirm(year + '년 ' + month + '월' + typeTag + ' 명세서를 삭제할까요?')) return;
          SALARY_PARSER.deleteMonthlyData(year, month, type);
          const remaining = getAllMonthData();
          if (currentPayslipIdx >= remaining.length) currentPayslipIdx = Math.max(0, remaining.length - 1);
          renderPayPayslip();
        } else if (!btn) {
          currentPayslipIdx = idx;
          renderPayPayslip();
        }
      });
    }

    const card = el('div', { className: 'card' });
    card.appendChild(el('div', { className: 'card-title', textContent: '저장된 명세서 (' + allData.length + '건)' }));

    allData.forEach(function (m, idx) {
      const row = el('div', {
        className: 'pay-archive-row pay-hbar-row',
        style: { cursor: 'pointer', padding: '8px 4px', borderRadius: '6px' }
      });
      row.dataset.idx   = idx;
      row.dataset.year  = m.year;
      row.dataset.month = m.month;
      row.dataset.type  = m.type || '급여';

      if (idx === currentPayslipIdx) {
        row.style.background = 'var(--bg-hover)';
      }

      const typeTag = m.type && m.type !== '급여' ? ' (' + m.type + ')' : '';
      row.appendChild(el('span', {
        className: 'pay-hbar-name',
        style: { fontWeight: idx === currentPayslipIdx ? '700' : '400' },
        textContent: m.year + '년 ' + m.month + '월' + typeTag
      }));
      row.appendChild(el('span', {
        className: 'pay-hbar-amount',
        textContent: fmt(m.data.summary?.netPay || 0)
      }));

      // 수정 버튼 (data-action으로 위임 처리)
      const editBtn = el('button', {
        className: 'pay-edit-btn',
        textContent: '✎',
        title: '수정'
      });
      editBtn.dataset.action = 'edit';
      row.appendChild(editBtn);

      // 삭제 버튼 (data-action으로 위임 처리)
      const delBtn = el('button', {
        style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: '0 4px', flexShrink: '0' },
        textContent: '×',
        title: '삭제'
      });
      delBtn.dataset.action = 'delete';
      row.appendChild(delBtn);
      card.appendChild(row);
    });

    container.appendChild(card);
  }

  // ── 명세서 수정 모달 ──
  function openEditModal(year, month, type) {
    const data = SALARY_PARSER.loadMonthlyData(year, month, type);
    if (!data) return;

    // 항목 deep copy (원본 불변)
    var salaryItems    = (data.salaryItems    || []).map(function (i) { return { name: i.name, amount: i.amount }; });
    var deductionItems = (data.deductionItems || []).map(function (i) { return { name: i.name, amount: i.amount }; });
    var typeTag = type && type !== '급여' ? ' (' + type + ')' : '';

    // 오버레이
    var overlay = el('div', { className: 'pay-edit-modal-overlay' });
    var modal   = el('div', { className: 'pay-edit-modal' });

    // 헤더
    var header = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } });
    header.appendChild(el('div', { style: { fontWeight: '700', fontSize: 'var(--text-body-large)' }, textContent: year + '년 ' + month + '월' + typeTag + ' 명세서 수정' }));
    var closeBtn = el('button', { style: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }, textContent: '×' });
    closeBtn.addEventListener('click', function () { overlay.remove(); });
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // 실지급액 요약 (동적 갱신용)
    var totalDiv = el('div', { className: 'pay-edit-total-row' });
    function updateTotal() {
      var gross = salaryItems.reduce(function (s, i) { return s + (parseFloat(i.amount) || 0); }, 0);
      var deduct = deductionItems.reduce(function (s, i) { return s + (parseFloat(i.amount) || 0); }, 0);
      totalDiv.textContent = '';
      totalDiv.appendChild(el('span', { textContent: '실지급액' }));
      totalDiv.appendChild(el('span', { textContent: fmt(gross - deduct) }));
    }

    // 항목 섹션 빌더
    function buildSection(title, items) {
      modal.appendChild(el('div', { className: 'pay-edit-section-title', textContent: title }));
      var list = el('div');

      function addRow(item) {
        var row = el('div', { className: 'pay-edit-item-row' });
        var nameInput = el('input', { type: 'text', className: 'ret-input', placeholder: '항목명', value: item.name });
        var amtInput  = el('input', { type: 'number', className: 'ret-input', placeholder: '금액', value: item.amount });
        nameInput.addEventListener('input', function () { item.name   = nameInput.value; });
        amtInput.addEventListener('input',  function () { item.amount = parseFloat(amtInput.value) || 0; updateTotal(); });
        var rowDel = el('button', { style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', flexShrink: '0', padding: '0 4px' }, textContent: '×' });
        rowDel.addEventListener('click', function () {
          var idx = items.indexOf(item);
          if (idx !== -1) items.splice(idx, 1);
          row.remove();
          updateTotal();
        });
        row.appendChild(nameInput);
        row.appendChild(amtInput);
        row.appendChild(rowDel);
        list.appendChild(row);
      }

      items.forEach(addRow);
      modal.appendChild(list);

      var addBtn = el('button', { className: 'pay-edit-add-btn btn', textContent: '+ 항목 추가' });
      addBtn.addEventListener('click', function () {
        var newItem = { name: '', amount: 0 };
        items.push(newItem);
        addRow(newItem);
      });
      modal.appendChild(addBtn);
    }

    buildSection('지급 항목', salaryItems);
    buildSection('공제 항목', deductionItems);

    updateTotal();
    modal.appendChild(totalDiv);

    // 저장 / 취소 버튼
    var actions = el('div', { className: 'pay-edit-actions' });
    var saveBtn   = el('button', { className: 'btn pay-edit-save-btn',   textContent: '저장' });
    var cancelBtn = el('button', { className: 'btn pay-edit-cancel-btn', textContent: '취소' });
    saveBtn.addEventListener('click', function () {
      var gross   = salaryItems.reduce(function (s, i) { return s + (parseFloat(i.amount) || 0); }, 0);
      var deduct  = deductionItems.reduce(function (s, i) { return s + (parseFloat(i.amount) || 0); }, 0);
      var updated = Object.assign({}, data, {
        salaryItems:    salaryItems,
        deductionItems: deductionItems,
        summary: { grossPay: gross, totalDeduction: deduct, netPay: gross - deduct },
        editedAt: new Date().toISOString()
      });
      SALARY_PARSER.saveMonthlyData(year, month, updated, type, true);
      overlay.remove();
      renderPayPayslip();
    });
    cancelBtn.addEventListener('click', function () { overlay.remove(); });
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // ── 빈 상태 ──
  function buildEmptyState(title, msg, sub, onAction, actionLabel) {
    const wrapper = el('div', { className: 'pay-empty-state' });
    wrapper.appendChild(el('div', { style: { fontSize: '2.5rem', marginBottom: '12px' }, textContent: '📭' }));
    wrapper.appendChild(el('div', { style: { fontWeight: '600', fontSize: 'var(--text-body-large)', marginBottom: '4px' }, textContent: msg }));
    wrapper.appendChild(el('div', { style: { color: 'var(--text-muted)', fontSize: 'var(--text-body-normal)' }, textContent: sub }));
    if (onAction && actionLabel) {
      const btn = el('button', {
        className: 'btn btn-primary',
        style: { marginTop: '16px' },
        textContent: actionLabel,
        onClick: onAction
      });
      wrapper.appendChild(btn);
    }
    return wrapper;
  }

})();

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)
export {};
