// ══════════════════════════════════════════════════════════════
//  retirement-redesign.js — 퇴직금 탭 재설계 모듈 (2026-04-30)
// ══════════════════════════════════════════════════════════════
// plan: reactive-sprouting-sprout.md
// 디자인 시안: ~/.gstack/projects/.../retirement-tab-redesign-20260430/
//
// 책임:
//   1. Tab 1 시뮬레이터 Wizard 3-step 네비게이션
//   2. Tab 2 타임라인 세로 듀얼 spine 렌더 + 시나리오 토글 + 동일 비교 카드
//   3. tab=timeline 진입 시 자동 렌더
//
// 기존 핸들러(calcRetirementEmbedded / retSelectPeakOpt 등) 그대로 재사용.

import { RetirementEngine } from '@snuhmate/calculators/retirement-engine';

const E = RetirementEngine;

// ─── 유틸 ────────────────────────────────────────────────────────
/** @param {string} id */
function $(id) { return document.getElementById(id); }
function fmt(n) { return E.fmtFull ? E.fmtFull(n) : (Math.round(n).toLocaleString('ko-KR') + '원'); }
function fmtDate(d) { return E.fmtDate ? E.fmtDate(d) : (d ? new Date(d).toLocaleDateString('ko-KR') : '—'); }

// ─── Tab 1 Wizard ────────────────────────────────────────────────
/** @type {1|2|3} */
let wizStep = 1;

function setWizStep(/** @type {1|2|3} */ step) {
  wizStep = step;
  document.querySelectorAll('#ret-panel-sim .ret-wiz-step').forEach((s) => {
    const el = /** @type {HTMLElement} */ (s);
    el.classList.toggle('active', Number(el.dataset.step) === step);
  });
  document.querySelectorAll('#retWizProgress .ws').forEach((w) => {
    const el = /** @type {HTMLElement} */ (w);
    const n = Number(el.dataset.step);
    el.classList.remove('cur', 'done');
    if (n < step) el.classList.add('done');
    else if (n === step) el.classList.add('cur');
  });
  const lbl = $('retWizStepLabel');
  if (lbl) {
    const labels = { 1: '1 / 3 — 평균임금 입력', 2: '2 / 3 — 날짜·공로연수 조건', 3: '3 / 3 — 결과' };
    lbl.textContent = labels[step];
  }
  const prev = /** @type {HTMLButtonElement|null} */ ($('retWizPrev'));
  const next = /** @type {HTMLButtonElement|null} */ ($('retWizNext'));
  if (prev) prev.disabled = step === 1;
  if (next) {
    next.textContent = step === 3 ? '✓ 완료' : (step === 2 ? '결과 보기 →' : '다음 →');
    next.classList.toggle('submit', step === 3);
  }
}

function wizNext() {
  if (wizStep === 1) {
    const wage = parseFloat(/** @type {HTMLInputElement} */ ($('retAvgWage'))?.value || '0');
    if (!wage) { alert('월 평균임금을 입력해 주세요.'); return; }
    setWizStep(2);
  } else if (wizStep === 2) {
    const hire = /** @type {HTMLInputElement} */ ($('retHireDate'))?.value;
    const retire = /** @type {HTMLInputElement} */ ($('retRetireDate'))?.value;
    if (!hire || !retire) { alert('입사일과 퇴직(예정)일을 입력해 주세요.'); return; }
    setWizStep(3);
    // Step 3 진입 시 자동 계산
    const fn = /** @type {((silent?: boolean) => boolean) | undefined} */ (
      /** @type {{ calcRetirementEmbedded?: (silent?: boolean) => boolean }} */ (window).calcRetirementEmbedded
    );
    if (typeof fn === 'function') fn(false);
  } else {
    // Step 3에서 '완료' → 타임라인 탭으로 이동
    const tlBtn = document.querySelector('#retTabs .ret-bookmark-tab[data-tab="timeline"]');
    if (tlBtn instanceof HTMLElement) tlBtn.click();
  }
}

function wizPrev() {
  if (wizStep > 1) setWizStep(/** @type {1|2|3} */ (wizStep - 1));
}

function wireWizard() {
  const prev = $('retWizPrev');
  const next = $('retWizNext');
  if (prev && !prev.dataset.wired) {
    prev.dataset.wired = '1';
    prev.addEventListener('click', wizPrev);
  }
  if (next && !next.dataset.wired) {
    next.dataset.wired = '1';
    next.addEventListener('click', wizNext);
  }
}

// ─── Tab 2 타임라인: 세로 듀얼 spine 렌더 ─────────────────────────
/** @typedef {{date: Date, label: string, type: 'start'|'now'|'peak'|'fin'}} TLNode */

function buildSpineNodes(/** @type {Date} */ hire, /** @type {Date} */ peakStart, /** @type {Date} */ peakEnd, /** @type {boolean} */ withPeak) {
  const now = new Date();
  /** @type {TLNode[]} */
  const nodes = [
    { date: hire, label: '입사', type: 'start' },
    { date: now, label: '현재', type: 'now' },
  ];
  if (withPeak) {
    nodes.push({ date: peakStart, label: '공로연수 시작', type: 'peak' });
  }
  nodes.push({ date: peakEnd, label: '정년 ★', type: 'fin' });
  return nodes;
}

function renderSpine(/** @type {string} */ containerId, /** @type {TLNode[]} */ nodes, /** @type {boolean} */ withPeakBand) {
  const root = $(containerId);
  if (!root) return;
  while (root.firstChild) root.removeChild(root.firstChild);

  nodes.forEach((n, i) => {
    const item = document.createElement('div');
    item.className = 'ret-v-node' + (n.type === 'now' ? ' now' : '') + (n.type === 'fin' ? ' fin' : '');
    const yr = document.createElement('div');
    yr.className = 'yr';
    const d = n.date;
    yr.textContent = d ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}` : '—';
    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.textContent = n.label;
    if (n.type === 'now') lbl.style.color = '#ef4444';
    item.appendChild(yr);
    item.appendChild(lbl);
    root.appendChild(item);

    // 공로연수 시작과 정년 사이에 색깔 띠
    if (withPeakBand && n.type === 'peak') {
      const band = document.createElement('div');
      band.className = 'ret-v-band on';
      band.textContent = '↓ 60% 보수 · 1년';
      root.appendChild(band);
    }
    if (!withPeakBand && i === nodes.length - 2) {
      // 미선택 트랙: 마지막 노드 직전에 100% 보수 띠
      const band = document.createElement('div');
      band.className = 'ret-v-band off';
      band.textContent = '↓ 100% 보수 · 1년';
      root.appendChild(band);
    }
  });
}

/** @type {{wage: number, hire: Date|null, peakStart: Date|null, peakEnd: Date|null}} */
const tlState = { wage: 0, hire: null, peakStart: null, peakEnd: null };

function renderTimeline() {
  const wage = parseFloat(/** @type {HTMLInputElement} */ ($('retAvgWage'))?.value || '0')
    || parseFloat(/** @type {HTMLInputElement} */ ($('retScWage'))?.value || '0');
  const hireVal = /** @type {HTMLInputElement} */ ($('retHireDate'))?.value
    || /** @type {HTMLInputElement} */ ($('retScHireDate'))?.value;
  const birthVal = /** @type {HTMLInputElement} */ ($('retBirthDate'))?.value
    || /** @type {HTMLInputElement} */ ($('retScBirthDate'))?.value;

  const empty = $('retTlEmpty');
  const spineCard = $('retTlSpineCard');
  const scCard = $('retTlScenarioCard');
  const cmpCard = $('retTlComparePair');

  if (!wage || !hireVal || !birthVal) {
    if (empty) empty.style.display = 'block';
    if (spineCard) spineCard.style.display = 'none';
    if (scCard) scCard.style.display = 'none';
    if (cmpCard) cmpCard.style.display = 'none';
    return;
  }

  const hire = new Date(hireVal);
  const birth = new Date(birthVal);
  // 정년: 만 60세 도달하는 해의 12월 31일 (제24조)
  const peakEnd = new Date(birth.getFullYear() + 60, 11, 31);
  const peakStart = new Date(peakEnd);
  peakStart.setFullYear(peakStart.getFullYear() - 1);

  tlState.wage = wage;
  tlState.hire = hire;
  tlState.peakStart = peakStart;
  tlState.peakEnd = peakEnd;

  if (empty) empty.style.display = 'none';
  if (spineCard) spineCard.style.display = 'block';
  if (scCard) scCard.style.display = 'block';
  if (cmpCard) cmpCard.style.display = 'block';

  // 입사 5년 이내 정년자 — 공로연수 미적용
  const yearsFromHireToFin = (peakEnd.getTime() - hire.getTime()) / (365.25 * 86400000);
  const peakExcluded = yearsFromHireToFin <= 5;

  const onNodes = buildSpineNodes(hire, peakStart, peakEnd, !peakExcluded);
  const offNodes = buildSpineNodes(hire, peakStart, peakEnd, false);
  renderSpine('retTlSpineOn', onNodes, !peakExcluded);
  renderSpine('retTlSpineOff', offNodes, false);

  // 시나리오 비교 — 시나리오 토글 카드 + 동일 비교 카드
  // 퇴직금 (양 시나리오 동일): 평균임금 × 근속년수, peakEnd 기준
  const totalYears = (peakEnd.getTime() - hire.getTime()) / (365.25 * 86400000);
  const sev = computeSeverance(wage, totalYears, hireVal, peakEnd);
  const peakIncomeOn = Math.round(wage * 0.6 * 12);   // 60% × 12개월
  const peakIncomeOff = Math.round(wage * 12);        // 100% × 12개월

  // 토글 상태 반영
  const togBtns = document.querySelectorAll('#retTlToggle button');
  let curTog = 'on';
  togBtns.forEach((b) => {
    const el = /** @type {HTMLElement} */ (b);
    if (el.classList.contains('active')) curTog = el.dataset.tog || 'on';
  });

  const stats = $('retTlScenarioStats');
  const note = $('retTlScenarioNote');
  if (stats) {
    while (stats.firstChild) stats.removeChild(stats.firstChild);
    const isOn = curTog === 'on';
    const peakIncome = isOn ? peakIncomeOn : peakIncomeOff;
    const rate = isOn ? '60%' : '100%';
    const rateColor = isOn ? '#00B894' : '#1a1a1a';
    pushStat(stats, '정년퇴직일', fmtDate(peakEnd));
    if (!peakExcluded) pushStat(stats, '공로연수 시작', fmtDate(peakStart));
    pushStat(stats, `직전 1년 보수 (${isOn ? '선택' : '미선택'})`, peakIncome.toLocaleString('ko-KR') + '원', rateColor);
    pushStat(stats, '예상 퇴직금 (산정 기준)', fmt(sev.퇴직금));
  }
  if (note) {
    if (peakExcluded) {
      note.textContent = '⚠️ 입사일로부터 5년 이내 정년 도달 — 공로연수 적용 대상에서 제외됩니다.';
    } else {
      const onTxt = peakIncomeOn.toLocaleString('ko-KR');
      const offTxt = peakIncomeOff.toLocaleString('ko-KR');
      note.textContent = `토글로 OFF 선택 시: 직전 1년 보수 100% (${offTxt}원). 퇴직금은 양 시나리오 모두 ${fmt(sev.퇴직금)}로 동일.`;
    }
  }

  // 동일 비교 카드
  const cmpOn = $('retCmpOn');
  const cmpOff = $('retCmpOff');
  const cmpDiff = $('retCmpDiff');
  if (cmpOn) cmpOn.textContent = fmt(sev.퇴직금);
  if (cmpOff) cmpOff.textContent = fmt(sev.퇴직금);
  if (cmpDiff) cmpDiff.textContent = (peakIncomeOff - peakIncomeOn).toLocaleString('ko-KR') + '원';
}

function pushStat(/** @type {HTMLElement} */ root, /** @type {string} */ label, /** @type {string} */ value, /** @type {string=} */ color) {
  const row = document.createElement('div');
  row.className = 'ret-stat-line';
  const l = document.createElement('span');
  l.textContent = label;
  const v = document.createElement('span');
  v.className = 'v';
  v.textContent = value;
  if (color) v.style.color = color;
  row.appendChild(l);
  row.appendChild(v);
  root.appendChild(row);
}

function computeSeverance(/** @type {number} */ wage, /** @type {number} */ years, /** @type {string} */ hireVal, /** @type {Date|string} */ retireDateVal) {
  const CALC = /** @type {{ calcSeveranceFullPay?: Function } | undefined} */ (
    /** @type {{ CALC?: { calcSeveranceFullPay?: Function } }} */ (window).CALC
  );
  if (CALC && typeof CALC.calcSeveranceFullPay === 'function') {
    return CALC.calcSeveranceFullPay(wage, years, hireVal, {
      retireDate: retireDateVal,
      roundingMode: 'union',
    });
  }
  // 폴백 (legacy 단순 계산)
  const base = Math.round(wage * years);
  const isPre2015 = hireVal && new Date(hireVal) <= new Date('2015-06-30');
  const addonRate = years >= 20 ? 0.6 : years >= 15 ? 0.5 : years >= 10 ? 0.45 : years >= 5 ? 0.35 : years >= 1 ? 0.1 : 0;
  const addon = isPre2015 ? Math.round(wage * Math.floor(years) * addonRate) : 0;
  return { 퇴직금: base + addon, 기본퇴직금: base, 퇴직수당: addon };
}

function wireScenarioToggle() {
  const togRoot = $('retTlToggle');
  if (!togRoot || togRoot.dataset.wired) return;
  togRoot.dataset.wired = '1';
  togRoot.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('button');
    if (!btn) return;
    togRoot.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderTimeline();
  });
}

// ─── 외부 진입점 (app.js initRetirementTab 에서 호출) ──────────────
export function initRetirementRedesign() {
  wireWizard();
  wireScenarioToggle();
  setWizStep(1);
}

export function refreshTimelineTab() {
  renderTimeline();
}

// 전역 노출 (app.js 가 호출할 수 있도록)
const _w = /** @type {any} */ (window);
_w.initRetirementRedesign = initRetirementRedesign;
_w.refreshRetirementTimeline = refreshTimelineTab;
