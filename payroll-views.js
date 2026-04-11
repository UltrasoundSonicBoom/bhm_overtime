// ── payroll-views.js ──
// 급여 탭 시각적 렌더링: 히스토리(대시보드) + 명세서(뷰어)
// DOM API 사용 (innerHTML 미사용)

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

  // ── initPayrollTab ──
  window.initPayrollTab = function () {
    const active = document.querySelector('#tab-payroll .pay-bookmark-tab.active');
    const name = active ? active.dataset.subtab : 'pay-history';
    if (name === 'pay-history') renderPayHistory();
    else if (name === 'pay-payslip') renderPayPayslip();
    else if (name === 'pay-calc') { if (typeof PAYROLL !== 'undefined') PAYROLL.init(); }
  };

  // ══════════════════════════════════════════════
  // ██ 히스토리 탭 (대시보드)
  // ══════════════════════════════════════════════
  // 월별 합산 데이터 생성 (히스토리용: 같은 월의 모든 유형 합산)
  function aggregateByMonth(allData) {
    const map = new Map();
    allData.forEach(m => {
      const key = m.year * 100 + m.month;
      if (!map.has(key)) {
        map.set(key, {
          year: m.year, month: m.month,
          data: { summary: { grossPay: 0, totalDeduction: 0, netPay: 0 }, salaryItems: [], deductionItems: [] },
          types: [],
          baseData: null, // 급여 유형만 따로 보관 (변동 분석용)
        });
      }
      const entry = map.get(key);
      const s = m.data.summary || {};
      entry.data.summary.grossPay += s.grossPay || 0;
      entry.data.summary.totalDeduction += s.totalDeduction || 0;
      entry.data.summary.netPay += s.netPay || 0;
      entry.types.push(m.type || '급여');
      if (m.type === '급여' || !m.type) {
        entry.baseData = m.data;
      }
    });
    return Array.from(map.values());
  }

  window.renderPayHistory = function () {
    const container = document.getElementById('payHistoryView');
    if (!container) return;
    container.textContent = '';

    const allData = getAllMonthData();
    const monthAgg = aggregateByMonth(allData);

    // ── 데이터 없을 때 ──
    if (monthAgg.length === 0) {
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

    const latest = monthAgg[0];
    const prev = monthAgg.length > 1 ? monthAgg[1] : null;
    const net = latest.data.summary?.netPay || 0;
    const prevNet = prev ? (prev.data.summary?.netPay || 0) : 0;
    const diff = prev ? net - prevNet : 0;

    // 1) 큰 숫자 카드 (실지급액 — 월 합산)
    const latestDisplay = { year: latest.year, month: latest.month, data: latest.data, types: latest.types };
    container.appendChild(buildNetPayCard(latestDisplay, diff, prev));

    // 2) 6개월 바 차트 (합산 기준)
    if (monthAgg.length >= 2) {
      container.appendChild(buildBarChart(monthAgg.slice(0, 6).reverse()));
    }

    // 3) 변동 요인 분석 (급여 유형끼리만 비교)
    if (prev) {
      const latestBase = latest.baseData || latest.data;
      const prevBase = prev.baseData || prev.data;
      const latestForCompare = { year: latest.year, month: latest.month, data: latestBase };
      const prevForCompare = { year: prev.year, month: prev.month, data: prevBase };
      container.appendChild(buildChangeFactors(latestForCompare, prevForCompare));
    }

    // 4) 통계 카드 (합산 기준)
    container.appendChild(buildStatsRow(monthAgg));

    // 5) 아카이브 배너
    container.appendChild(buildArchiveBanner(monthAgg.length));
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
    // 복수 유형이 합산된 경우 표시
    if (latest.types && latest.types.length > 1) {
      const extraTypes = latest.types.filter(t => t !== '급여');
      if (extraTypes.length > 0) {
        card.appendChild(el('div', {
          style: { fontSize: 'var(--text-body-small)', color: 'var(--text-muted)', marginBottom: '4px' },
          textContent: '급여 + ' + extraTypes.join(', ') + ' 합산'
        }));
      }
    }
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
  let currentMonthIdx = 0;
  let currentTypeIdx = 0;

  // allData를 year-month 기준으로 그룹핑 (최신순)
  function groupByMonth(allData) {
    const map = new Map();
    allData.forEach(m => {
      const key = m.year * 100 + m.month;
      if (!map.has(key)) map.set(key, { year: m.year, month: m.month, payslips: [] });
      map.get(key).payslips.push({ type: m.type, data: m.data });
    });
    // 급여 유형을 먼저, 나머지는 지급일순
    const groups = Array.from(map.values());
    groups.forEach(g => {
      g.payslips.sort((a, b) => {
        if (a.type === '급여') return -1;
        if (b.type === '급여') return 1;
        return 0;
      });
    });
    return groups;
  }

  window.renderPayPayslip = function () {
    const headerEl = document.getElementById('payPayslipHeader');
    const sliderEl = document.getElementById('payMonthSlider');
    const visualEl = document.getElementById('payPayslipVisual');
    const archiveEl = document.getElementById('payArchiveList');
    if (!visualEl) return;

    // 헤더 영역 (슬라이더 바로 아래, 우측 정렬)
    if (headerEl) {
      headerEl.textContent = '';
      headerEl.style.display = 'flex';
      headerEl.style.justifyContent = 'flex-end';
      headerEl.style.padding = '0';
      headerEl.style.marginTop = '-40px';
      headerEl.style.marginBottom = '6px';
      headerEl.appendChild(buildTextUploadBtn());
    }

    const allData = getAllMonthData();
    const monthGroups = groupByMonth(allData);

    if (monthGroups.length === 0) {
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
      const empty = buildEmptyState(
        '급여명세서',
        '아직 등록된 명세서가 없습니다.',
        '우측 상단 버튼으로 급여명세서를 업로드해주세요.',
        null, null
      );
      visualEl.appendChild(empty);
      return;
    }

    currentMonthIdx = Math.min(currentMonthIdx, monthGroups.length - 1);
    if (currentMonthIdx < 0) currentMonthIdx = 0;
    const curGroup = monthGroups[currentMonthIdx];
    currentTypeIdx = Math.min(currentTypeIdx, curGroup.payslips.length - 1);
    if (currentTypeIdx < 0) currentTypeIdx = 0;

    // 월 슬라이더 + 유형 칩
    if (sliderEl) buildMonthSlider(sliderEl, monthGroups, currentMonthIdx, currentTypeIdx);

    // 현재 명세서 시각적 렌더
    const currentPayslip = curGroup.payslips[currentTypeIdx];
    const current = { year: curGroup.year, month: curGroup.month, type: currentPayslip.type, data: currentPayslip.data };

    // 전월 비교: 같은 유형의 이전 월 or 이전 월 급여
    let prev = null;
    if (currentMonthIdx < monthGroups.length - 1) {
      const prevGroup = monthGroups[currentMonthIdx + 1];
      const sameType = prevGroup.payslips.find(p => p.type === currentPayslip.type);
      const basePay = prevGroup.payslips.find(p => p.type === '급여');
      const prevPayslip = sameType || basePay || prevGroup.payslips[0];
      prev = { year: prevGroup.year, month: prevGroup.month, type: prevPayslip.type, data: prevPayslip.data };
    }
    buildPayslipVisual(visualEl, current, prev);

    // 아카이브 목록
    if (archiveEl) buildArchiveList(archiveEl, monthGroups);

    // currentPayslipIdx 동기화 (하위호환)
    currentPayslipIdx = currentMonthIdx;
  };

  // ── 월 슬라이더 + 유형 칩 ──
  function buildMonthSlider(container, monthGroups, mIdx, tIdx) {
    container.textContent = '';
    const curGroup = monthGroups[mIdx];

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
        if (currentMonthIdx < monthGroups.length - 1) {
          currentMonthIdx++;
          currentTypeIdx = 0;
          renderPayPayslip();
        }
      }
    });
    if (mIdx >= monthGroups.length - 1) prevBtn.disabled = true;

    const label = el('span', {
      style: { fontWeight: '700', fontSize: 'var(--text-title-medium)' },
      textContent: curGroup.year + '년 ' + curGroup.month + '월'
    });

    const nextBtn = el('button', {
      className: 'btn',
      textContent: '▶',
      style: { minWidth: '36px', padding: '6px' },
      onClick: function () {
        if (currentMonthIdx > 0) {
          currentMonthIdx--;
          currentTypeIdx = 0;
          renderPayPayslip();
        }
      }
    });
    if (mIdx <= 0) nextBtn.disabled = true;

    slider.appendChild(prevBtn);
    slider.appendChild(label);
    slider.appendChild(nextBtn);
    slider.appendChild(el('div', { style: { flex: '1' } }));

    container.appendChild(slider);

    // 같은 월에 복수 유형이 있으면 유형 칩 표시
    if (curGroup.payslips.length > 1) {
      const chipRow = el('div', {
        style: { display: 'flex', gap: '8px', justifyContent: 'center', paddingBottom: '8px' }
      });
      curGroup.payslips.forEach(function (ps, i) {
        const isActive = i === tIdx;
        const chip = el('button', {
          className: 'btn' + (isActive ? ' btn-primary' : ''),
          textContent: ps.type,
          style: {
            padding: '4px 14px',
            fontSize: 'var(--text-body-small)',
            fontWeight: isActive ? '700' : '400',
            borderRadius: '16px',
          },
          onClick: function () {
            currentTypeIdx = i;
            renderPayPayslip();
          }
        });
        chipRow.appendChild(chip);
      });
      container.appendChild(chipRow);
    }
  }

  // ── 텍스트 업로드 버튼 (명세서 탭 상단 우측) ──
  function buildTextUploadBtn() {
    const fileInput = el('input', { type: 'file', accept: '.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp' });
    fileInput.style.display = 'none';

    const btn = el('button', {
      className: 'pay-text-upload-btn',
      textContent: '급여 PDF 업로드',
      onClick: function () { fileInput.click(); }
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) {
        handleInlineUpload(fileInput.files[0]);
      }
    });

    const wrap = el('div', { style: { display: 'inline-flex' } });
    wrap.appendChild(btn);
    wrap.appendChild(fileInput);
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
        currentMonthIdx = 0;
        currentTypeIdx = 0;
        renderPayPayslip();
        if (typeof renderPayHistory === 'function') renderPayHistory();
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
  function buildPayslipVisual(container, current, prev) {
    container.textContent = '';
    const data = current.data;
    const gross = data.summary?.grossPay || 0;
    const deduction = data.summary?.totalDeduction || 0;
    const net = data.summary?.netPay || 0;
    const total = gross + deduction;

    // 유형 배지 (소급분, 연차수당 등 — 급여는 표시 안 함)
    if (current.type && current.type !== '급여') {
      const badge = el('div', {
        style: {
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: 'var(--text-body-small)',
          fontWeight: '600',
          background: 'var(--accent-amber, #f59e0b)',
          color: '#fff',
          marginBottom: '10px',
        },
        textContent: current.type
      });
      container.appendChild(badge);
    }

    // 도넛 차트 (지급 vs 공제 비율)
    container.appendChild(buildDonutChart(gross, deduction, net, total));

    // 지급 항목 수평 바
    if (data.salaryItems && data.salaryItems.length > 0) {
      container.appendChild(buildHBarSection('지급 내역', data.salaryItems, gross, 'var(--accent-emerald)',
        prev ? prev.data.salaryItems : null));
    }

    // 공제 항목 수평 바
    if (data.deductionItems && data.deductionItems.length > 0) {
      container.appendChild(buildHBarSection('공제 내역', data.deductionItems, deduction, 'var(--accent-rose)',
        prev ? prev.data.deductionItems : null));
    }


    // 전월 비교 그리드
    if (prev) {
      container.appendChild(buildCompareGrid(current, prev));
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
  function buildArchiveList(container, monthGroups) {
    container.textContent = '';
    if (monthGroups.length <= 1) return;

    const totalPayslips = monthGroups.reduce((s, g) => s + g.payslips.length, 0);
    const card = el('div', { className: 'card' });
    card.appendChild(el('div', { className: 'card-title', textContent: '저장된 명세서 (' + totalPayslips + '건)' }));

    monthGroups.forEach(function (group, mIdx) {
      group.payslips.forEach(function (ps, tIdx) {
        const isActive = mIdx === currentMonthIdx && tIdx === currentTypeIdx;
        const row = el('div', {
          className: 'pay-hbar-row',
          style: { cursor: 'pointer', padding: '8px 4px', borderRadius: '6px' },
          onClick: function () {
            currentMonthIdx = mIdx;
            currentTypeIdx = tIdx;
            renderPayPayslip();
          }
        });
        if (isActive) {
          row.style.background = 'var(--bg-hover)';
        }

        const labelText = group.year + '년 ' + group.month + '월'
          + (ps.type !== '급여' ? ' (' + ps.type + ')' : '');
        row.appendChild(el('span', {
          className: 'pay-hbar-name',
          style: { fontWeight: isActive ? '700' : '400' },
          textContent: labelText
        }));
        row.appendChild(el('span', {
          className: 'pay-hbar-amount',
          textContent: fmt(ps.data.summary?.netPay || 0)
        }));
        card.appendChild(row);
      });
    });

    container.appendChild(card);
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
