/**
 * CalcFlowGraph — SNUH Mate 계산값 흐름 시각화
 * Cytoscape.js + dagre 기반 실시간 인터랙티브 노드 그래프
 */
(function () {
  'use strict';

  // ══════════════════════════════════════════
  // 1. 데이터 모델 — 5-Layer 노드 + 엣지
  // ══════════════════════════════════════════

  var LAYERS = [
    { id: 'constants', label: 'Layer 1: 규정 상수', color: '#a78bfa' },
    { id: 'wage',      label: 'Layer 2: 시급 산출', color: '#3b82f6' },
    { id: 'record',    label: 'Layer 3: 레코드 생성', color: '#6366f1' },
    { id: 'aggregate', label: 'Layer 4: 월간 집계', color: '#06b6d4' },
    { id: 'consumer',  label: 'Layer 5: 소비자',   color: '#22c55e' },
  ];

  var LAYER_COLORS = {};
  LAYERS.forEach(function (l) { LAYER_COLORS[l.id] = l.color; });

  var NODES = [
    // Layer 1: 규정 상수
    { id: 'overtimeRates',   label: 'overtimeRates',           file: 'data.js',          line: null, layer: 'constants', type: 'constant', desc: '시간외 배율 (1.5/2.0)' },
    { id: 'payTables',       label: 'payTables',               file: 'data.js',          line: null, layer: 'constants', type: 'constant', desc: '직종별 보수표' },
    { id: 'allowances',      label: 'allowances',              file: 'data.js',          line: null, layer: 'constants', type: 'constant', desc: '각종 수당 단가' },
    { id: 'deductions',      label: 'deductions',              file: 'data.js',          line: null, layer: 'constants', type: 'constant', desc: '4대보험 요율' },
    { id: 'seniorityRates',  label: 'seniorityRates',          file: 'data.js',          line: null, layer: 'constants', type: 'constant', desc: '근속가산율' },

    // Layer 2: 시급 산출
    { id: 'calcOrdinaryWage', label: 'calcOrdinaryWage()',     file: 'calculators.js',   line: 39,  layer: 'wage', type: 'function', desc: '통상임금·시급 계산' },
    { id: 'calcOvertimePay',  label: 'calcOvertimePay()',      file: 'calculators.js',   line: 150, layer: 'wage', type: 'function', desc: '시간외수당 계산' },
    { id: 'calcOnCallPay',    label: 'calcOnCallPay()',        file: 'calculators.js',   line: 190, layer: 'wage', type: 'function', desc: '온콜수당 계산' },
    { id: 'profileCalcWage',  label: 'PROFILE.calcWage()',     file: 'profile.js',       line: null, layer: 'wage', type: 'function', desc: '프로필 → 시급 변환' },

    // Layer 3: 레코드 생성
    { id: 'createRecord',     label: 'createRecord()',         file: 'overtime.js',      line: 211, layer: 'record', type: 'function', desc: '시간외 레코드 생성' },
    { id: 'savePayslipData',  label: 'savePayslipData()',      file: 'overtime.js',      line: 502, layer: 'record', type: 'function', desc: '명세서 보충 데이터 저장' },
    { id: 'propagatePayslip', label: '_propagatePayslipToOT()',file: 'app.js',           line: 3507,layer: 'record', type: 'function', desc: '명세서→시간외 브릿지' },

    // Layer 4: 월간 집계
    { id: 'calcMonthlyStats', label: 'calcMonthlyStats()',     file: 'overtime.js',      line: 317, layer: 'aggregate', type: 'function', desc: '월간 통계 + payslipSupplement' },
    { id: 'calcYearlyStats',  label: 'calcYearlyStats()',      file: 'overtime.js',      line: 395, layer: 'aggregate', type: 'function', desc: '연간 통계 (supplement 포함)' },
    { id: 'crossVerify',      label: 'crossVerify()',          file: 'overtime.js',      line: 517, layer: 'aggregate', type: 'function', desc: '수동 vs 명세서 교차검증' },

    // Layer 5: 소비자
    { id: 'renderOtDashboard', label: 'renderOtDashboard()',    file: 'app.js',          line: 3031, layer: 'consumer', type: 'function', desc: '대시보드 시간외 카드' },
    { id: 'renderHomeOtMonth', label: '_renderHomeOtMonth()',   file: 'app.js',          line: 94,   layer: 'consumer', type: 'function', desc: '홈 탭 월간 요약' },
    { id: 'alertBanner',      label: '_renderOTAlertBanner()',  file: 'app.js',          line: 2044, layer: 'consumer', type: 'function', desc: '초과근무 경고 배너' },
    { id: 'renderVerification',label: 'renderOtVerification()', file: 'app.js',          line: 3045, layer: 'consumer', type: 'function', desc: '명세서 자동 보충 UI' },
    { id: 'calcMonthEstimate', label: 'calcMonthEstimate()',    file: 'pay-estimation.js',line: 158, layer: 'consumer', type: 'function', desc: '급여 예상 시뮬레이션' },
    { id: 'calcAverageWage',   label: 'calcAverageWage()',     file: 'calculators.js',   line: 514, layer: 'consumer', type: 'function', desc: '퇴직금 평균임금' },
    { id: 'payrollOtCalc',     label: 'overtimeCalc._getStats()',file:'payroll.js',       line: 25,  layer: 'consumer', type: 'function', desc: '계산기 카드 시간외' },
    { id: 'syncOtPayslip',     label: 'DATA_MAP.overtimePayslip',file:'syncManager.js',  line: 24,  layer: 'consumer', type: 'variable', desc: 'Drive 동기화' },
    { id: 'calcPayrollSim',    label: 'calcPayrollSimulation()',file:'calculators.js',    line: 567, layer: 'consumer', type: 'function', desc: '급여 시뮬레이터' },
  ];

  var EDGES = [
    // Layer 1 → 2
    { source: 'payTables',       target: 'calcOrdinaryWage', label: '보수표 데이터',     status: 'connected' },
    { source: 'allowances',      target: 'calcOrdinaryWage', label: '수당 단가',         status: 'connected' },
    { source: 'seniorityRates',  target: 'calcOrdinaryWage', label: '근속가산율',        status: 'connected' },
    { source: 'overtimeRates',   target: 'calcOvertimePay',  label: '배율 상수',         status: 'connected' },
    { source: 'allowances',      target: 'calcOnCallPay',    label: '온콜수당 단가',     status: 'connected' },
    { source: 'overtimeRates',   target: 'calcOnCallPay',    label: '배율 상수',         status: 'connected' },
    // Layer 2 → 3
    { source: 'calcOrdinaryWage',target: 'profileCalcWage',  label: 'hourlyRate',        status: 'connected' },
    { source: 'profileCalcWage', target: 'createRecord',     label: 'hourlyRate',        status: 'connected' },
    { source: 'calcOvertimePay', target: 'createRecord',     label: 'breakdown 계산',    status: 'connected' },
    // 명세서 경로
    { source: 'propagatePayslip',target: 'savePayslipData',  label: 'workStats/hourlyRate',status: 'connected' },
    // Layer 3 → 4
    { source: 'createRecord',    target: 'calcMonthlyStats', label: 'records 합산',      status: 'connected' },
    { source: 'savePayslipData', target: 'calcMonthlyStats', label: 'payslipSupplement', status: 'connected' },
    { source: 'calcMonthlyStats',target: 'calcYearlyStats',  label: '월→연 합산',        status: 'connected' },
    { source: 'calcMonthlyStats',target: 'crossVerify',      label: 'manual vs payslip', status: 'connected' },
    // Layer 4 → 5
    { source: 'calcMonthlyStats',target: 'renderOtDashboard', label: 'effectiveOtHours', status: 'connected' },
    { source: 'calcMonthlyStats',target: 'renderHomeOtMonth', label: 'effectiveOtHours', status: 'connected' },
    { source: 'calcMonthlyStats',target: 'alertBanner',       label: 'supplement extH',  status: 'connected' },
    { source: 'crossVerify',     target: 'renderVerification',label: '보충 UI',           status: 'connected' },
    { source: 'calcMonthlyStats',target: 'calcMonthEstimate', label: 'supplement 시간',   status: 'connected' },
    { source: 'calcMonthlyStats',target: 'calcAverageWage',   label: 'suppPay 합산',     status: 'connected' },
    { source: 'calcMonthlyStats',target: 'payrollOtCalc',     label: 'supp 시간 가산',   status: 'connected' },
    { source: 'savePayslipData', target: 'syncOtPayslip',     label: 'Drive 동기화',     status: 'connected' },
    { source: 'calcOrdinaryWage',target: 'calcPayrollSim',    label: 'hourlyRate/wage',  status: 'connected' },
    { source: 'calcMonthEstimate',target:'calcPayrollSim',    label: '시간외 파라미터',   status: 'connected' },
    // Layer 1 → 5 direct
    { source: 'deductions',      target: 'calcPayrollSim',   label: '공제 요율',         status: 'connected' },
    { source: 'overtimeRates',   target: 'calcMonthlyStats', label: 'supplement 배율',   status: 'connected' },
  ];

  // ══════════════════════════════════════════
  // 2. DOM helpers (no innerHTML)
  // ══════════════════════════════════════════

  function mkEl(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') e.className = attrs[k];
        else if (k === 'textContent') e.textContent = attrs[k];
        else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else e.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (!c) return;
        if (typeof c === 'string') e.appendChild(document.createTextNode(c));
        else e.appendChild(c);
      });
    }
    return e;
  }

  // ══════════════════════════════════════════
  // 3. 상태
  // ══════════════════════════════════════════

  var state = {
    cy: null,
    activeLayer: null,
    searchQuery: '',
    selectedNode: null,
  };

  function getNodeById(id) {
    for (var i = 0; i < NODES.length; i++) {
      if (NODES[i].id === id) return NODES[i];
    }
    return null;
  }

  function getLayerById(id) {
    for (var i = 0; i < LAYERS.length; i++) {
      if (LAYERS[i].id === id) return LAYERS[i];
    }
    return null;
  }

  function getNodeHealthStatus(nodeId) {
    if (window.HealthMonitor) return window.HealthMonitor.getNodeStatus(nodeId);
    return 'ok';
  }

  // ══════════════════════════════════════════
  // 4. Cytoscape 초기화
  // ══════════════════════════════════════════

  var STATUS_COLORS = {
    ok:    '#22c55e',
    warn:  '#eab308',
    error: '#ef4444',
  };

  var EDGE_COLORS = {
    connected: '#22c55e',
    missing:   '#ef4444',
    partial:   '#eab308',
  };

  function buildElements() {
    var nodes = NODES.map(function (n) {
      var health = getNodeHealthStatus(n.id);
      return {
        data: {
          id: n.id,
          label: n.label,
          layer: n.layer,
          type: n.type,
          file: n.file,
          line: n.line,
          desc: n.desc || '',
          health: health,
          layerColor: LAYER_COLORS[n.layer] || '#6366f1',
          healthColor: STATUS_COLORS[health] || STATUS_COLORS.ok,
        },
        classes: [n.layer, n.type, 'health-' + health],
      };
    });

    var edges = EDGES.map(function (e, i) {
      return {
        data: {
          id: 'e' + i,
          source: e.source,
          target: e.target,
          label: e.label,
          status: e.status,
          edgeColor: EDGE_COLORS[e.status] || EDGE_COLORS.connected,
        },
        classes: [e.status],
      };
    });

    return { nodes: nodes, edges: edges };
  }

  function buildStylesheet() {
    return [
      // ── 노드 기본 스타일 ──
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': '180px',
          'font-size': '11px',
          'font-family': "'IBM Plex Sans KR', 'Space Grotesk', system-ui, sans-serif",
          'font-weight': 600,
          'color': '#e4e5ea',
          'background-color': '#1a1d27',
          'border-width': 2,
          'border-color': 'data(layerColor)',
          'width': 200,
          'height': 56,
          'shape': 'round-rectangle',
          'corner-radius': 10,
          'padding': '8px',
          'overlay-opacity': 0,
          'text-outline-width': 0,
        },
      },
      // 상태별 보더 하이라이트
      {
        selector: 'node.health-ok',
        style: {
          'border-color': 'data(layerColor)',
          'border-width': 2,
        },
      },
      {
        selector: 'node.health-warn',
        style: {
          'border-color': '#eab308',
          'border-width': 3,
          'border-style': 'dashed',
        },
      },
      {
        selector: 'node.health-error',
        style: {
          'border-color': '#ef4444',
          'border-width': 3,
        },
      },
      // 선택된 노드
      {
        selector: 'node:selected',
        style: {
          'border-color': '#818cf8',
          'border-width': 3,
          'overlay-color': '#6366f1',
          'overlay-opacity': 0.1,
        },
      },
      // 호버
      {
        selector: 'node:active',
        style: {
          'overlay-opacity': 0.08,
          'overlay-color': '#6366f1',
        },
      },
      // 흐림 (필터/검색)
      {
        selector: 'node.dimmed',
        style: {
          'opacity': 0.15,
        },
      },
      // 하이라이트 (선택 노드의 이웃)
      {
        selector: 'node.highlighted',
        style: {
          'border-color': '#818cf8',
          'border-width': 3,
        },
      },
      // ── 엣지 기본 스타일 ──
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': 'data(edgeColor)',
          'target-arrow-color': 'data(edgeColor)',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 0.8,
          'curve-style': 'bezier',
          'opacity': 0.5,
          'label': 'data(label)',
          'font-size': '9px',
          'font-family': "'Space Grotesk', monospace",
          'color': '#8b8d98',
          'text-rotation': 'autorotate',
          'text-background-color': '#0f1117',
          'text-background-opacity': 0.8,
          'text-background-padding': '2px',
          'text-margin-y': -8,
        },
      },
      {
        selector: 'edge.connected',
        style: {
          'line-color': '#22c55e',
          'target-arrow-color': '#22c55e',
        },
      },
      {
        selector: 'edge.missing',
        style: {
          'line-color': '#ef4444',
          'target-arrow-color': '#ef4444',
          'line-style': 'dashed',
          'line-dash-pattern': [6, 4],
          'opacity': 0.7,
        },
      },
      {
        selector: 'edge.partial',
        style: {
          'line-color': '#eab308',
          'target-arrow-color': '#eab308',
          'line-style': 'dashed',
          'line-dash-pattern': [4, 2],
          'opacity': 0.6,
        },
      },
      {
        selector: 'edge.highlighted',
        style: {
          'opacity': 1,
          'width': 3,
        },
      },
      {
        selector: 'edge.dimmed',
        style: {
          'opacity': 0.08,
        },
      },
    ];
  }

  function initCytoscape() {
    if (typeof cytoscape === 'undefined') {
      console.error('Cytoscape.js not loaded');
      return;
    }

    // dagre 레이아웃은 cytoscape-dagre.js 로드 시 자동 등록됨

    var elements = buildElements();

    state.cy = cytoscape({
      container: document.getElementById('cy'),
      elements: elements.nodes.concat(elements.edges),
      style: buildStylesheet(),
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        rankSep: 100,
        nodeSep: 30,
        edgeSep: 15,
        padding: 40,
      },
      minZoom: 0.3,
      maxZoom: 2.5,
      wheelSensitivity: 0.3,
      boxSelectionEnabled: false,
    });

    // ── 이벤트 ──
    state.cy.on('tap', 'node', function (evt) {
      var nodeId = evt.target.id();
      selectNode(nodeId);
    });

    state.cy.on('tap', function (evt) {
      if (evt.target === state.cy) {
        clearSelection();
      }
    });

    // ── 초기 요약 ──
    renderSidebar();
    renderSummary();
  }

  // ══════════════════════════════════════════
  // 5. 노드 선택 + 디테일 패널
  // ══════════════════════════════════════════

  function selectNode(nodeId) {
    state.selectedNode = nodeId;

    // 이전 하이라이트 제거
    state.cy.elements().removeClass('highlighted dimmed');

    // 선택 노드 + 이웃 하이라이트
    var node = state.cy.getElementById(nodeId);
    var neighborhood = node.neighborhood().add(node);
    state.cy.elements().not(neighborhood).addClass('dimmed');
    neighborhood.addClass('highlighted');
    node.select();

    openDetail(nodeId);
  }

  function clearSelection() {
    state.selectedNode = null;
    state.cy.elements().removeClass('highlighted dimmed');
    state.cy.nodes().unselect();
    closeDetail();
  }

  function openDetail(nodeId) {
    var panel = document.getElementById('cfDetail');
    var node = getNodeById(nodeId);
    if (!panel || !node) return;

    var layer = getLayerById(node.layer);
    var health = getNodeHealthStatus(nodeId);
    var outgoing = EDGES.filter(function (e) { return e.source === nodeId; });
    var incoming = EDGES.filter(function (e) { return e.target === nodeId; });

    panel.querySelector('.cf-detail-title').textContent = node.label;

    var body = panel.querySelector('.cf-detail-body');
    while (body.firstChild) body.removeChild(body.firstChild);

    // Info section
    var infoSection = mkEl('div', { className: 'cf-detail-section' }, [
      mkEl('div', { className: 'cf-detail-section-title', textContent: 'Information' }),
      makeRow('Type', node.type),
      makeRow('File', node.file + (node.line ? ':' + node.line : '')),
      makeRow('Layer', layer ? layer.label : node.layer),
      makeRow('Health', health),
    ]);
    if (node.desc) infoSection.appendChild(makeRow('Desc', node.desc));
    body.appendChild(infoSection);

    // Incoming
    if (incoming.length > 0) {
      var inSection = mkEl('div', { className: 'cf-detail-section' }, [
        mkEl('div', { className: 'cf-detail-section-title', textContent: 'Inputs (' + incoming.length + ')' }),
      ]);
      var inList = mkEl('div', { className: 'cf-detail-connections' });
      incoming.forEach(function (e) {
        inList.appendChild(makeConnItem(e.source, e.status, e.label));
      });
      inSection.appendChild(inList);
      body.appendChild(inSection);
    }

    // Outgoing
    if (outgoing.length > 0) {
      var outSection = mkEl('div', { className: 'cf-detail-section' }, [
        mkEl('div', { className: 'cf-detail-section-title', textContent: 'Outputs (' + outgoing.length + ')' }),
      ]);
      var outList = mkEl('div', { className: 'cf-detail-connections' });
      outgoing.forEach(function (e) {
        outList.appendChild(makeConnItem(e.target, e.status, e.label));
      });
      outSection.appendChild(outList);
      body.appendChild(outSection);
    }

    // Health detail (from HealthMonitor)
    if (window.HealthMonitor) {
      var scan = window.HealthMonitor.scan();
      var healthSection = mkEl('div', { className: 'cf-detail-section' }, [
        mkEl('div', { className: 'cf-detail-section-title', textContent: 'Live Data' }),
        makeRow('Profile', scan.profile.label),
        makeRow('OT Records', scan.overtime.label),
        makeRow('Payslip', scan.payslip.label),
        makeRow('Sync', scan.sync.label),
      ]);
      body.appendChild(healthSection);
    }

    panel.classList.add('open');
  }

  function closeDetail() {
    var panel = document.getElementById('cfDetail');
    if (panel) panel.classList.remove('open');
  }

  function makeRow(key, val) {
    var row = mkEl('div', { className: 'cf-detail-row' });
    row.appendChild(mkEl('span', { className: 'cf-detail-key', textContent: key }));
    row.appendChild(mkEl('span', { className: 'cf-detail-val', textContent: val }));
    return row;
  }

  function makeConnItem(nodeId, status, label) {
    var node = getNodeById(nodeId);
    var dotClass = status === 'connected' ? 'ok' : status === 'missing' ? 'missing' : 'partial';
    var item = mkEl('div', { className: 'cf-detail-conn', onClick: function () { selectNode(nodeId); } }, [
      mkEl('div', { className: 'cf-conn-dot ' + dotClass }),
      mkEl('span', { textContent: (node ? node.label : nodeId) + ' — ' + label }),
    ]);
    return item;
  }

  // ══════════════════════════════════════════
  // 6. 사이드바
  // ══════════════════════════════════════════

  function renderSidebar() {
    var container = document.getElementById('cfSidebarLayers');
    if (!container) return;
    container.textContent = '';

    // "전체" 버튼
    var allBtn = mkEl('button', {
      className: 'cf-filter-btn' + (state.activeLayer ? '' : ' active'),
      textContent: '전체',
      onClick: function () { setLayerFilter(null); },
    });
    container.appendChild(allBtn);

    LAYERS.forEach(function (layer) {
      var btn = mkEl('button', {
        className: 'cf-filter-btn' + (state.activeLayer === layer.id ? ' active' : ''),
        onClick: function () { setLayerFilter(layer.id); },
      }, [
        mkEl('div', { className: 'cf-filter-dot', style: 'background:' + layer.color }),
        layer.label,
      ]);
      container.appendChild(btn);
    });
  }

  function renderSummary() {
    var connected = 0, missing = 0, partial = 0;
    EDGES.forEach(function (e) {
      if (e.status === 'connected') connected++;
      else if (e.status === 'missing') missing++;
      else partial++;
    });

    setText('cfSummaryNodes', NODES.length);
    setText('cfSummaryEdges', EDGES.length);
    setText('cfSummaryConnected', connected);
    setText('cfSummaryMissing', missing + partial);
  }

  function setText(id, val) {
    var e = document.getElementById(id);
    if (e) e.textContent = String(val);
  }

  // ══════════════════════════════════════════
  // 7. 필터 + 검색
  // ══════════════════════════════════════════

  function setLayerFilter(layerId) {
    state.activeLayer = layerId;
    applyFilters();
    renderSidebar();
  }

  function applyFilters() {
    if (!state.cy) return;
    var q = state.searchQuery.toLowerCase();

    state.cy.batch(function () {
      state.cy.elements().removeClass('dimmed');

      state.cy.nodes().forEach(function (node) {
        var data = node.data();
        var layerMatch = !state.activeLayer || data.layer === state.activeLayer;
        var searchMatch = !q ||
          data.label.toLowerCase().indexOf(q) >= 0 ||
          data.file.toLowerCase().indexOf(q) >= 0 ||
          data.desc.toLowerCase().indexOf(q) >= 0;

        if (!layerMatch || !searchMatch) {
          node.addClass('dimmed');
        }
      });

      // 흐린 노드에 연결된 엣지도 흐리게
      state.cy.edges().forEach(function (edge) {
        var src = edge.source();
        var tgt = edge.target();
        if (src.hasClass('dimmed') && tgt.hasClass('dimmed')) {
          edge.addClass('dimmed');
        }
      });
    });
  }

  // ══════════════════════════════════════════
  // 8. 실시간 상태 업데이트
  // ══════════════════════════════════════════

  function refreshNodeHealth() {
    if (!state.cy || !window.HealthMonitor) return;
    window.HealthMonitor.invalidateCache();

    state.cy.batch(function () {
      state.cy.nodes().forEach(function (node) {
        var nodeId = node.id();
        var newHealth = getNodeHealthStatus(nodeId);
        var oldHealth = node.data('health');

        if (newHealth !== oldHealth) {
          node.data('health', newHealth);
          node.data('healthColor', STATUS_COLORS[newHealth] || STATUS_COLORS.ok);
          node.removeClass('health-ok health-warn health-error');
          node.addClass('health-' + newHealth);
        }
      });
    });
  }

  // ══════════════════════════════════════════
  // 9. 초기화
  // ══════════════════════════════════════════

  function init() {
    initCytoscape();

    // 검색
    var searchEl = document.getElementById('cfSearch');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        state.searchQuery = searchEl.value;
        applyFilters();
      });
    }

    // 줌 버튼
    var zoomInBtn = document.getElementById('cfZoomIn');
    var zoomOutBtn = document.getElementById('cfZoomOut');
    var zoomResetBtn = document.getElementById('cfZoomReset');
    if (zoomInBtn) zoomInBtn.addEventListener('click', function () { state.cy.zoom(state.cy.zoom() * 1.2); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', function () { state.cy.zoom(state.cy.zoom() * 0.8); });
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', function () { state.cy.fit(undefined, 40); });

    // 디테일 닫기
    var closeBtn = document.getElementById('cfDetailClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { clearSelection(); });

    // 10초마다 건강 상태 갱신
    setInterval(refreshNodeHealth, 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
