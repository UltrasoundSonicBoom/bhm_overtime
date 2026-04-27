// ══════════════════════════════════════════════════════════════
//  retirement.js — UI 오케스트레이션 + 렌더링 — retirement.html 단일 entry
// ══════════════════════════════════════════════════════════════
// Phase 2-G: retirement.html 의 2 script 통합 → 단일 type=module entry.
import './retirement-engine.js';
// Phase 5: cross-module 명시 named import
import { RetirementEngine } from './retirement-engine.js';

(function () {
  'use strict';

  const E = RetirementEngine;

  // ── 상태 ──────────────────────────────────────────────────
  const state = {
    wage: 0, hireDate: null, birthDate: null, wageSource: null,
    timing: 'now',   // 탭1: 'now' | 'before_peak' | 'after_peak'
    result: null     // calcAllScenarios 결과
  };

  // ── DOM 헬퍼 ──────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls)  e.className   = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function app(parent, child) { parent.appendChild(child); return child; }

  // ── 탭 스위칭 ─────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.rt-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.rt-tab').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.rt-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var panel = $('rt-panel-' + btn.dataset.tab);
        if (panel) panel.classList.add('active');
      });
    });
  }

  // ── 타이밍 pill (탭1) ─────────────────────────────────────
  function setupPills() {
    document.querySelectorAll('.rt-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.rt-pill').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.timing = btn.dataset.timing;
        renderTab1();
      });
    });
  }

  // ── 수동 입력 폼 이벤트 ───────────────────────────────────
  function setupInputForm() {
    var form = $('rtInputForm');
    if (!form) return;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var wage = parseFloat(($('rtInputWage') || {}).value) || 0;
      var birth = ($('rtInputBirth') || {}).value || '';
      var hire  = ($('rtInputHire')  || {}).value || '';
      if (!wage || !birth || !hire) {
        alert('세 항목을 모두 입력해 주세요.');
        return;
      }
      state.wage      = wage;
      state.birthDate = birth;
      state.hireDate  = hire;
      state.wageSource = '직접 입력';
      form.style.display = 'none';
      compute();
    });
  }

  // ── 수정 버튼 ─────────────────────────────────────────────
  function setupEditBtn() {
    var btn = $('rtEditBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var banner = $('rtAutoLoadBanner');
      var form   = $('rtInputForm');
      if (banner) banner.style.display = 'none';
      if (form)   {
        // 현재 값 주입
        if ($('rtInputWage'))  $('rtInputWage').value  = state.wage;
        if ($('rtInputBirth')) $('rtInputBirth').value = state.birthDate || '';
        if ($('rtInputHire'))  $('rtInputHire').value  = state.hireDate  || '';
        form.style.display = 'block';
      }
    });
  }

  // ── 자동 로드 배너 ────────────────────────────────────────
  function showAutoLoadBanner(inputs) {
    var banner = $('rtAutoLoadBanner');
    if (!banner) return;
    banner.style.display = 'block';
    var detail = $('rtAutoLoadDetail');
    if (detail) {
      detail.textContent =
        '입사일 ' + E.fmtDate(inputs.hireDate) +
        ' · 생년월일 ' + E.fmtDate(inputs.birthDate) +
        ' · 최근급여 ' + E.fmtFull(inputs.wage) +
        (inputs.wageSource ? ' (' + inputs.wageSource + ')' : '');
    }
  }

  // ── 부족한 필드 입력 폼 표시 ──────────────────────────────
  function showInputForm(inputs) {
    var form = $('rtInputForm');
    if (!form) return;
    form.style.display = 'block';
    if (inputs.wage      && $('rtInputWage'))  $('rtInputWage').value  = inputs.wage;
    if (inputs.birthDate && $('rtInputBirth')) $('rtInputBirth').value = inputs.birthDate;
    if (inputs.hireDate  && $('rtInputHire'))  $('rtInputHire').value  = inputs.hireDate;
  }

  // ── 계산 실행 ─────────────────────────────────────────────
  function compute() {
    if (!state.wage || !state.hireDate || !state.birthDate) return;
    state.result = E.calcAllScenarios(state.wage, state.hireDate, state.birthDate);
    renderTab1();
    renderTab2();
    // 탭1 활성화
    document.querySelectorAll('.rt-tab')[0].click();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  탭 1: 퇴직금 계산기 렌더링
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function renderTab1() {
    if (!state.result) return;
    var { peakStart, peakEnd } = state.result;
    var now = new Date();

    var retireDate;
    if (state.timing === 'before_peak') retireDate = E.dStr(peakStart);
    else if (state.timing === 'after_peak') retireDate = E.dStr(peakEnd);
    else retireDate = E.dStr(now);

    var sev = E.calcSingle(state.wage, state.hireDate, retireDate);
    var out = $('rtCalcResult');
    if (!out) return;
    while (out.firstChild) out.removeChild(out.firstChild);
    out.style.display = 'block';

    // 금액 표시
    var amtEl = el('div', 'rt-hero-amount', E.fmtFull(sev.퇴직금));
    var labelEl = el('div', 'rt-hero-label',
      state.timing === 'before_peak' ? '임금피크 전 퇴직 시 예상 퇴직금' :
      state.timing === 'after_peak'  ? '정년(만 61세) 퇴직 시 예상 퇴직금' :
                                       '지금 퇴직 시 예상 퇴직금');
    app(out, labelEl);
    app(out, amtEl);

    // 구분선
    var hr = el('div', 'rt-divider');
    app(out, hr);

    // 상세 breakdown
    function row(label, val, highlight) {
      var r  = el('div', 'rt-breakdown-row' + (highlight ? ' total' : ''));
      var l  = el('span', 'rt-breakdown-label', label);
      var v  = el('span', 'rt-breakdown-val',   val);
      r.appendChild(l); r.appendChild(v);
      app(out, r);
    }
    row('근속 기간', sev.yearsDisplay || '—');
    row('기본 퇴직금', E.fmtFull(sev.기본퇴직금));
    if (sev.퇴직수당 > 0) row('퇴직수당 (단체협약)', E.fmtFull(sev.퇴직수당));
    row('합계', E.fmtFull(sev.퇴직금), true);

    // 입사일 기준 특수 안내
    if (sev.isPre2001) {
      var warn = el('div', 'rt-warning-box', '⚠️ 2001.08.31 이전 근속분 포함 — 누진배수가 적용됩니다. 정확한 금액은 인사과에 문의하세요.');
      app(out, warn);
    } else if (sev.isPre2015) {
      var info = el('div', 'rt-info-note', '📋 2015.06.30 이전 입사자 — 퇴직수당(단체협약)이 포함됩니다.');
      app(out, info);
    }

    // D-day 뱃지
    var days = E.daysUntil(state.timing === 'before_peak' ? peakStart :
                           state.timing === 'after_peak'  ? peakEnd   : now);
    if (days > 0) {
      var dday = el('div', 'rt-dday-badge', 'D-' + days.toLocaleString() + ' · ' + E.fmtDate(retireDate));
      app(out, dday);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  탭 2: 임금피크 시뮬레이터 렌더링
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function renderTab2() {
    if (!state.result) return;
    var { scenarios, maxTotal, bestIdx, midEffect, peakStart, peakEnd } = state.result;

    // ── 중간정산 효과 배너 ──
    renderMidEffectBanner(midEffect, peakStart);

    // ── 바 차트 ──
    var chartEl = $('rtBarChart');
    if (chartEl) {
      while (chartEl.firstChild) chartEl.removeChild(chartEl.firstChild);
      scenarios.forEach(function (sc, i) {
        chartEl.appendChild(buildBarRow(sc, i, bestIdx, maxTotal));
      });
    }

    // ── 시나리오 카드 ──
    var cardsEl = $('rtScenarioCards');
    if (cardsEl) {
      while (cardsEl.firstChild) cardsEl.removeChild(cardsEl.firstChild);
      scenarios.forEach(function (sc, i) {
        cardsEl.appendChild(buildScenarioCard(sc, i, bestIdx));
      });
    }

    // ── 결론 박스 ──
    renderConclusion(scenarios, bestIdx, midEffect);
  }

  // 중간정산 효과 배너
  function renderMidEffectBanner(midEffect, peakStart) {
    var el1 = $('rtMidEffectAmount');
    var el2 = $('rtMidEffectDesc');
    var el3 = $('rtPeakStartDate');
    if (el1) el1.textContent = (midEffect >= 0 ? '+' : '') + E.fmt(midEffect);
    if (el2) {
      el2.textContent = midEffect > 0
        ? '옵션 A를 선택할 경우, 중간정산하면 이만큼 더 받을 수 있어요.'
        : '옵션 B는 중간정산 효과가 크지 않습니다.';
    }
    if (el3) el3.textContent = '임금피크 시작: ' + E.fmtDate(peakStart) + ' (만 60세)';
  }

  // 바 차트 한 줄
  function buildBarRow(sc, idx, bestIdx, maxTotal) {
    var row = el('div', 'rt-bar-row' + (idx === bestIdx ? ' best' : ''));

    // 레이블
    var labelWrap = el('div', 'rt-bar-label-wrap');
    var tagEl = el('span', 'rt-bar-tag');
    tagEl.textContent = sc.tag;
    tagEl.style.background = sc.tagColor + '22';
    tagEl.style.color = sc.tagColor;
    tagEl.style.border = '1.5px solid ' + sc.tagColor;
    var nameEl = el('div', 'rt-bar-name', sc.label);
    labelWrap.appendChild(tagEl);
    labelWrap.appendChild(nameEl);

    // 바 트랙
    var track = el('div', 'rt-bar-track');
    sc.segments.forEach(function (seg) {
      var pct = maxTotal > 0 ? (seg.amt / maxTotal) * 100 : 0;
      var seg_el = el('div', 'rt-bar-seg');
      seg_el.style.width = pct.toFixed(2) + '%';
      seg_el.style.background = seg.color;
      seg_el.title = seg.label + ': ' + E.fmtFull(seg.amt);
      track.appendChild(seg_el);
    });

    // 금액
    var amtEl = el('div', 'rt-bar-amount', E.fmt(sc.total));
    if (idx === bestIdx) amtEl.classList.add('best');

    row.appendChild(labelWrap);
    row.appendChild(track);
    row.appendChild(amtEl);
    return row;
  }

  // 시나리오 카드
  function buildScenarioCard(sc, idx, bestIdx) {
    var card = el('div', 'rt-sc-card' + (idx === bestIdx ? ' best' : ''));

    // 카드 헤더
    var hdr = el('div', 'rt-sc-header');
    var tagEl = el('span', 'rt-sc-tag');
    tagEl.textContent = sc.tag;
    tagEl.style.background = sc.tagColor + '22';
    tagEl.style.color = sc.tagColor;
    tagEl.style.border = '1.5px solid ' + sc.tagColor;
    var titleEl = el('div', 'rt-sc-title', sc.label);
    var subEl   = el('div', 'rt-sc-sub',   sc.sublabel);
    hdr.appendChild(tagEl);
    hdr.appendChild(titleEl);
    hdr.appendChild(subEl);
    card.appendChild(hdr);

    if (idx === bestIdx) {
      var bestBadge = el('div', 'rt-sc-best-badge', '✓ 최고 총액');
      card.appendChild(bestBadge);
    }

    // 구분선
    card.appendChild(el('div', 'rt-divider'));

    // 상세 row 추가
    function addRow(label, val, isTotal) {
      var r  = el('div', 'rt-sc-row' + (isTotal ? ' total' : ''));
      var l  = el('span', 'rt-sc-row-label', label);
      var v  = el('span', 'rt-sc-row-val',   val);
      r.appendChild(l); r.appendChild(v);
      card.appendChild(r);
    }

    // 근속기간
    addRow('근속', sc.sev.yearsDisplay + (sc.midSettlement ? ' (중간정산 기준)' : ''));

    // 퇴직금 구분
    if (sc.midSettlement) {
      addRow('중간정산 금액 (N년 × 100%)', E.fmtFull(sc.midSev.퇴직금));
      addRow('  └ 기본 퇴직금', E.fmtFull(sc.midSev.기본퇴직금));
      if (sc.midSev.퇴직수당 > 0) addRow('  └ 퇴직수당', E.fmtFull(sc.midSev.퇴직수당));
      addRow('최종 퇴직금 (1년치)', E.fmtFull(sc.finalSev.퇴직금));
      addRow('퇴직금 합계', E.fmtFull(sc.totalSev));
    } else {
      addRow('기본 퇴직금', E.fmtFull(sc.sev.기본퇴직금));
      if (sc.sev.퇴직수당 > 0) addRow('퇴직수당', E.fmtFull(sc.sev.퇴직수당));
      addRow('퇴직금 소계', E.fmtFull(sc.totalSev));
    }

    if (sc.peakIncome > 0) {
      var peakLabel = sc.peakRate === 0.6 ? '공로연수 수령 (60% × 12개월)' : '계속근무 수령 (100% × 12개월)';
      addRow(peakLabel, E.fmtFull(sc.peakIncome));
    }
    addRow('패키지 총액', E.fmtFull(sc.total), true);

    return card;
  }

  // 결론 박스
  function renderConclusion(scenarios, bestIdx, midEffect) {
    var box = $('rtConclusion');
    if (!box) return;
    while (box.firstChild) box.removeChild(box.firstChild);

    var best = scenarios[bestIdx];
    var optA_no  = scenarios[1];
    var optA_mid = scenarios[2];
    var optB_no  = scenarios[3];

    var titleEl = el('div', 'rt-conclusion-title', '📊 시뮬레이션 결론');
    box.appendChild(titleEl);

    function addLine(text, emphasis) {
      var p = el('div', 'rt-conclusion-line' + (emphasis ? ' em' : ''), text);
      box.appendChild(p);
    }

    addLine('가장 유리한 선택: ' + best.label, true);

    if (midEffect > 0) {
      addLine('옵션 A 선택 예정이라면: 임금피크 전 중간정산이 ' + E.fmt(midEffect) + ' 더 유리합니다.');
      addLine('이유: 퇴직금이 \"마지막 3개월 평균임금 × 근속연수\" 구조이므로, 임금이 60%로 줄기 전에 정산해야 전체 근속분을 100% 기준으로 확보할 수 있습니다.');
    } else {
      addLine('옵션 A에서 중간정산 효과: ' + E.fmt(midEffect));
    }

    var optBDiff = optB_no.total - optA_mid.total;
    if (optBDiff > 0) {
      addLine('옵션 B(계속근무)가 옵션 A(공로연수)+중간정산보다 ' + E.fmt(optBDiff) + ' 더 많습니다.');
      addLine('단, 옵션 B는 실제 1년 근무가 필요하며 건강·업무 상황을 함께 고려하세요.');
    }

    var irpNote = el('div', 'rt-irp-note',
      '💡 중간정산금을 IRP(개인형 퇴직연금) 계좌로 이체하면 퇴직소득세를 만 55세 이후로 이연할 수 있어 절세 효과가 있습니다.');
    box.appendChild(irpNote);

    var legalNote = el('div', 'rt-legal-note',
      '※ 이 시뮬레이션은 참고용입니다. 중간정산 가능 여부와 정확한 금액은 반드시 인사과에 확인하세요.');
    box.appendChild(legalNote);
  }

  // ── 초기화 ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    setupTabs();
    setupPills();
    setupInputForm();
    setupEditBtn();

    var inputs = E.autoLoad();
    state.wage      = inputs.wage;
    state.hireDate  = inputs.hireDate;
    state.birthDate = inputs.birthDate;
    state.wageSource = inputs.wageSource;

    if (inputs.isComplete) {
      showAutoLoadBanner(inputs);
      compute();
    } else {
      showInputForm(inputs);
    }
  });

})();
