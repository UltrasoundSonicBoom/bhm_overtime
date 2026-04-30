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
/** @type {'auto'|'manual'} */
let retMode = 'auto';

function renderAutoPayslipRows() {
  const rowsEl = $('retPayslipRows');
  const summaryEl = $('retAvgSummary');
  const autoDisplayEl = $('retAvgDisplayAuto');
  const srcLabelEl = $('retWageSourceLabel');
  const emptyCta = $('retPayslipEmpty');
  const filledBox = $('retPayslipFilled');
  if (!rowsEl) return;

  const parser = /** @type {{ getRecent?: (n: number) => Array<{ym: string, total: number}> } | undefined} */ (
    /** @type {any} */ (window).SALARY_PARSER
  );
  const rows = parser && typeof parser.getRecent === 'function' ? parser.getRecent(3) : [];

  while (rowsEl.firstChild) rowsEl.removeChild(rowsEl.firstChild);

  // 0건 → 업로드 CTA 노출, payslip block 숨김
  if (!rows || rows.length === 0) {
    if (emptyCta) emptyCta.style.display = '';
    if (filledBox) filledBox.style.display = 'none';
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }

  if (emptyCta) emptyCta.style.display = 'none';
  if (filledBox) filledBox.style.display = '';

  rows.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'ret-payslip-row';
    const yr = document.createElement('span');
    yr.className = 'yr';
    yr.textContent = String(r.ym).replace(/(\d{4})(\d{2})/, '$1.$2');
    const v = document.createElement('span');
    v.className = 'v';
    v.textContent = Math.round(r.total).toLocaleString('ko-KR') + '원';
    row.appendChild(yr);
    row.appendChild(v);
    rowsEl.appendChild(row);
  });

  const avg = Math.round(rows.reduce((s, r) => s + r.total, 0) / rows.length);
  // 자동 모드면 항상 평균값을 우선 채움 (수동 입력 흔적 덮어쓰기)
  const wageEl = /** @type {HTMLInputElement|null} */ ($('retAvgWage'));
  if (wageEl && retMode === 'auto') wageEl.value = String(avg);

  if (summaryEl) summaryEl.style.display = '';
  if (autoDisplayEl) autoDisplayEl.textContent = avg.toLocaleString('ko-KR') + '원';
  const srcText = rows.length < 3 ? `(${rows.length}개월 평균)` : '';
  if (srcLabelEl) srcLabelEl.textContent = srcText;
}

function retSetMode(/** @type {'auto'|'manual'} */ mode) {
  retMode = mode;
  const autoSection = $('retAutoSection');
  const manualSection = $('retManualSection');
  const autoBtn = $('retModeAutoBtn');
  const manualBtn = $('retModeManualBtn');

  if (mode === 'auto') {
    if (autoSection) autoSection.style.display = '';
    if (manualSection) manualSection.style.display = 'none';
    if (autoBtn) autoBtn.classList.add('active');
    if (manualBtn) manualBtn.classList.remove('active');
    renderAutoPayslipRows();
  } else {
    if (autoSection) autoSection.style.display = 'none';
    if (manualSection) manualSection.style.display = '';
    if (autoBtn) autoBtn.classList.remove('active');
    if (manualBtn) manualBtn.classList.add('active');
  }
}

/** Step 1 자동 모드에서 명세서 0건일 때 — 급여명세서 관리 서브탭으로 이동 */
function retGoToPayslipUpload() {
  const tabBtn = document.querySelector('.pay-bookmark-tab[data-subtab="pay-payslip"]');
  if (tabBtn instanceof HTMLElement) tabBtn.click();
}

/** Step 2 옵션 카드 클릭 시 즉시 Step 3 으로 이동 + 해당 시나리오로 계산 */
function retAdvanceToStep3(/** @type {'A'|'none'} */ opt) {
  // retRetireDate를 옵션에 따라 세팅
  // 'A' = 공로연수 선택 → 정년 1년 전 시작이지만 퇴직금 산정은 보호조항으로 정년퇴직일 그대로
  // 'none' = 정년 퇴직 → 정년퇴직일
  const birthVal = /** @type {HTMLInputElement|null} */ ($('retBirthDate'))?.value;
  const retireEl = /** @type {HTMLInputElement|null} */ ($('retRetireDate'));
  if (birthVal && retireEl) {
    const b = new Date(birthVal);
    const retireDate = `${b.getFullYear() + 60}-12-31`;
    retireEl.value = retireDate;
  }
  // Step 3 토글 라벨 업데이트
  syncStep3ToggleLabels();
  // Step 3 진입 + 토글 활성화
  setWizStep(3);
  setStep3Tog(opt);
}

/** Step 3 토글 라벨에 옵션 A/B 날짜 반영 */
function syncStep3ToggleLabels() {
  const aDateEl = $('retStep3TogADate');
  const bDateEl = $('retStep3TogBDate');
  const aSrc = $('retOptAStartDate');
  const bSrc = $('retOptBRetireDate');
  if (aDateEl && aSrc) aDateEl.textContent = aSrc.textContent || '—';
  if (bDateEl && bSrc) bDateEl.textContent = bSrc.textContent || '—';
}

/** Step 3 토글 클릭 핸들러 (전역) — 시나리오 전환 + 재계산 */
function setStep3Tog(/** @type {'A'|'none'} */ opt) {
  // 토글 active 표시
  document.querySelectorAll('.ret-step3-toggle button').forEach((b) => {
    const el = /** @type {HTMLElement} */ (b);
    el.classList.toggle('active', el.dataset.step3Tog === opt);
  });
  // Step 2 라디오 동기화 (state 일관성)
  const matchOpt = opt === 'A' ? 'retPeakOpt_A' : 'retPeakOpt_none';
  const targetLabel = document.getElementById(matchOpt);
  if (targetLabel) {
    document.querySelectorAll('.ret-peak-opt').forEach((el) => el.classList.remove('selected'));
    targetLabel.classList.add('selected');
    const radio = /** @type {HTMLInputElement|null} */ (targetLabel.querySelector('input[type=radio]'));
    if (radio) radio.checked = true;
  }
  // 자동 계산
  const fn = /** @type {((silent?: boolean) => boolean) | undefined} */ (
    /** @type {{ calcRetirementEmbedded?: (silent?: boolean) => boolean }} */ (window).calcRetirementEmbedded
  );
  if (typeof fn === 'function') fn(false);
}


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
    if (!wage) {
      if (retMode === 'auto') alert('급여명세서를 업로드하거나 수동 입력 모드로 전환해 주세요.');
      else alert('월 평균임금을 입력해 주세요.');
      return;
    }
    const hire = /** @type {HTMLInputElement} */ ($('retHireDate'))?.value;
    const birth = /** @type {HTMLInputElement} */ ($('retBirthDate'))?.value;
    if (!hire || !birth) {
      if (retMode === 'auto') alert('개인정보 탭에서 생년월일·입사일을 먼저 등록하거나 수동 입력 모드로 전환해 주세요.');
      else alert('생년월일과 입사일을 입력해 주세요.');
      return;
    }
    setWizStep(2);
  } else if (wizStep === 2) {
    // retRetireDate는 생년월일 입력 시 retUpdateQuickDates()가 자동 세팅.
    // Step 2 옵션은 informational, 실제 retRetireDate는 정년퇴직일 그대로.
    const retireEl = /** @type {HTMLInputElement|null} */ ($('retRetireDate'));
    if (retireEl && !retireEl.value) {
      const birthVal = /** @type {HTMLInputElement|null} */ ($('retBirthDate'))?.value;
      if (!birthVal) { alert('생년월일을 입력해 주세요. (1단계에서 입력)'); return; }
      const b = new Date(birthVal);
      const retYear = b.getFullYear() + 60;
      retireEl.value = `${retYear}-12-31`;
    }
    setWizStep(3);
    // Step 3 토글 라벨 동기화
    syncStep3ToggleLabels();
    // 현재 선택된 옵션 라디오값 → toggle 동기화
    const checked = /** @type {HTMLInputElement|null} */ (document.querySelector('input[name="retPeakOpt"]:checked'));
    setStep3Tog(checked && checked.value === 'A' ? 'A' : 'none');
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
  retSetMode('auto');
}

export function refreshTimelineTab() {
  renderTimeline();
}

// 전역 노출 (app.js 가 호출할 수 있도록)
const _w = /** @type {any} */ (window);
_w.initRetirementRedesign = initRetirementRedesign;
_w.refreshRetirementTimeline = refreshTimelineTab;
_w.retSetMode = retSetMode;
_w.retGoToPayslipUpload = retGoToPayslipUpload;
_w.retRefreshAutoPayslipRows = renderAutoPayslipRows;
_w.retAdvanceToStep3 = retAdvanceToStep3;
_w.retSetStep3Tog = setStep3Tog;
