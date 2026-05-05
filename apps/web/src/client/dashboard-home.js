// dashboard-home.js — 홈 탭 대시보드 컨트롤러.
//
// 기존 home-summary-card 위에 진정한 대시보드 섹션을 추가:
//   1) 이번 달 스냅샷 KPI strip (통상임금 / 시간외 / 휴가 잔여 / 한도 / 다음 N)
//   2) 6개월 시간외 트렌드 (SVG sparkline bar)
//   3) 이번 달 근무 패턴 (SVG donut: D/E/N/OFF 비율)
//   4) 다음 액션 추천 카드 (스마트 인사이트)
//   5) 커리어 타임라인 (입사 D+ / 호봉 / 연차)
//
// 데이터 source: PROFILE / OVERTIME / LEAVE / SCHEDULE (모두 직접 read).

import { PROFILE } from '@snuhmate/profile/profile';
import { OVERTIME } from '@snuhmate/profile/overtime';
import { LEAVE } from '@snuhmate/profile/leave';
import { SCHEDULE } from '@snuhmate/profile/schedule';
import { CALC } from '@snuhmate/calculators';
import { deriveSuite } from '@snuhmate/calculators/derive-suite';
import { escapeHtml } from '@snuhmate/shared-utils';

const CHART_HEIGHT = 60;
const CHART_BAR_GAP = 4;
const TONE = {
  D: 'var(--accent-sky, #0ea5e9)',
  E: 'var(--accent-amber, #f59e0b)',
  N: 'var(--accent-indigo, #6366f1)',
  OFF: 'var(--text-muted, #8a8a8a)',
};

function _hourlyRate() {
  try {
    const p = PROFILE.load();
    if (!p) return 0;
    return PROFILE.calcWage(p)?.hourlyRate || 0;
  } catch { return 0; }
}

function _monthlyWage() {
  try {
    const p = PROFILE.load();
    if (!p) return 0;
    return PROFILE.calcWage(p)?.monthlyWage || 0;
  } catch { return 0; }
}

function _last6MonthsOt() {
  const now = new Date();
  const series = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const stats = OVERTIME.calcMonthlyStats ? OVERTIME.calcMonthlyStats(y, m) : null;
    const supp = stats?.payslipSupplement;
    const hours = (stats?.byType?.overtime?.hours || 0) + (supp ? supp.totalHours : 0);
    series.push({ y, m, label: `${m}월`, hours: Math.round(hours * 10) / 10 });
  }
  return series;
}

function _thisMonthDuty() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const data = SCHEDULE.getMonth(y, m);
  const mine = data.mine || {};
  const counts = { D: 0, E: 0, N: 0, OFF: 0, AL: 0, RD: 0 };
  Object.values(mine).forEach((code) => {
    const c = String(code || '').toUpperCase();
    if (counts[c] != null) counts[c]++;
    else counts.OFF++;
  });
  return { y, m, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

function _suiteSummaryThisMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const cells = (typeof window !== 'undefined' && window.scheduleSuite?.loadUnifiedCells)
    ? window.scheduleSuite.loadUnifiedCells(y, m)
    : null;
  if (!cells) return null;
  return deriveSuite(cells, { hourlyRate: _hourlyRate() }, now);
}

function _careerTimeline() {
  const profile = PROFILE.load();
  if (!profile || !profile.hireDate) return null;
  const parsed = PROFILE.parseDate(profile.hireDate);
  if (!parsed) return null;
  const hire = new Date(parsed);
  const now = new Date();
  const days = Math.floor((now - hire) / (1000 * 60 * 60 * 24));
  const years = days / 365.25;
  const yearInt = Math.floor(years);
  const monthsRem = Math.round((years - yearInt) * 12);
  const result = CALC.calcAnnualLeave(hire);
  return {
    days,
    yearsLabel: `${yearInt}년 ${monthsRem}개월`,
    annualLeaveYears: result?.diffYears || yearInt,
    annualLeave: result?.totalLeave || 0,
  };
}

// ── DOM helpers (innerHTML 안 쓰고 createElement 로 안전하게) ─────────────────

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') node.className = String(v);
      else if (k === 'text') node.textContent = String(v);
      else if (k === 'style') node.setAttribute('style', String(v));
      else if (k.startsWith('data-')) node.setAttribute(k, String(v));
      else node.setAttribute(k, String(v));
    });
  }
  if (children) {
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null) return;
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else node.appendChild(c);
    });
  }
  return node;
}

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function fmt(n) { return Number(n || 0).toLocaleString(); }

// ── 차트 SVG (정적, 사용자 입력 0) ─────────────────────────────────────────

function svgFromString(svgString) {
  // SVG 마크업은 정적 템플릿 + 숫자값만 들어감 (사용자 입력 없음).
  // 안전하게 createElementNS 로 파싱하기 위해 임시 wrapper.
  const wrap = document.createElement('div');
  // svgString 은 본 모듈 내부에서만 만들어진다 (Number 만 interpolate).
  // eslint-disable-next-line no-unsanitized/property
  wrap.innerHTML = svgString;
  return wrap.firstElementChild;
}

function buildBarSvg(series) {
  const max = Math.max(1, ...series.map((s) => s.hours));
  const w = 240;
  const h = CHART_HEIGHT;
  const barW = (w - (series.length - 1) * CHART_BAR_GAP) / series.length;
  let bars = '';
  let labels = '';
  series.forEach((s, i) => {
    const x = (i * (barW + CHART_BAR_GAP)).toFixed(2);
    const barH = max > 0 ? (s.hours / max) * (h - 18) : 0;
    const y = (h - 14 - barH).toFixed(2);
    const opacity = i === series.length - 1 ? 1 : 0.6;
    bars += `<rect x="${x}" y="${y}" width="${barW.toFixed(2)}" height="${barH.toFixed(2)}" rx="2" fill="var(--accent-rose, #f43f5e)" opacity="${opacity}"/>`;
    const cx = (Number(x) + barW / 2).toFixed(2);
    const lbl = String(s.m) + '월';
    labels += `<text x="${cx}" y="${h - 2}" text-anchor="middle" font-size="9" fill="var(--text-muted, #8a8a8a)">${lbl}</text>`;
    if (s.hours > 0) {
      labels += `<text x="${cx}" y="${(Number(y) - 2).toFixed(2)}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text-primary, #1a1a1a)">${s.hours}</text>`;
    }
  });
  return svgFromString(`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%; height:${h}px; display:block;">${bars}${labels}</svg>`);
}

function buildDonutSvg(counts) {
  const order = ['D', 'E', 'N', 'OFF'];
  const total = order.reduce((a, k) => a + (Number(counts[k]) || 0), 0);
  const r = 28;
  const c = 2 * Math.PI * r;
  if (total === 0) {
    return svgFromString(`<svg viewBox="0 0 80 80" style="width:80px; height:80px;"><circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--color-border-default, #e5e7eb)" stroke-width="10"/><text x="40" y="44" text-anchor="middle" font-size="11" fill="var(--text-muted, #8a8a8a)">데이터 없음</text></svg>`);
  }
  let acc = 0;
  let segs = '';
  order.forEach((k) => {
    const v = Number(counts[k]) || 0;
    if (v === 0) return;
    const len = (v / total) * c;
    segs += `<circle cx="40" cy="40" r="${r}" fill="none" stroke="${TONE[k]}" stroke-width="10" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 40 40)"/>`;
    acc += len;
  });
  return svgFromString(`<svg viewBox="0 0 80 80" style="width:80px; height:80px;">${segs}<text x="40" y="42" text-anchor="middle" font-size="14" font-weight="800" fill="var(--text-primary, #1a1a1a)">${total}</text><text x="40" y="55" text-anchor="middle" font-size="9" fill="var(--text-muted, #8a8a8a)">일</text></svg>`);
}

// ── 다음 액션 추천 ─────────────────────────────────────────────────────────

function _nextActions() {
  const actions = [];
  const profile = PROFILE.load();

  if (!profile || !profile.jobType) {
    actions.push({ icon: '👤', label: '프로필 입력', desc: '직종·호봉 입력하면 시간외 자동 계산', tab: 'profile' });
    return actions;
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const stats = OVERTIME.calcMonthlyStats ? OVERTIME.calcMonthlyStats(y, m) : null;
  const otHours = stats?.byType?.overtime?.hours || 0;

  if (otHours >= 48) {
    actions.push({ icon: '⚠️', label: '시간외 한도 임박', desc: `${otHours}h / 60h — 한도 도달 임박`, tab: 'overtime', tone: 'amber' });
  }

  const sched = SCHEDULE.getMonth(y, m);
  const mine = sched.mine || {};
  let nDays = 0;
  Object.entries(mine).forEach(([day, code]) => {
    if (code === 'N') {
      const d = parseInt(day, 10);
      const recs = OVERTIME.getDateRecords(y, m, d);
      if (!recs || recs.length === 0) nDays++;
    }
  });
  if (nDays > 0) {
    actions.push({ icon: '🌙', label: '야간근무 기록 누락', desc: `${m}월 N 듀티 ${nDays}일 — 시간외 미기록`, tab: 'overtime', tone: 'rose' });
  }

  if (profile.hireDate) {
    const career = _careerTimeline();
    if (career && career.annualLeave > 0) {
      const summary = LEAVE.calcAnnualSummary(y, career.annualLeave);
      if (summary.remainingAnnual >= 5 && now.getMonth() >= 9) {
        actions.push({ icon: '🌴', label: `연차 ${summary.remainingAnnual}일 남음`, desc: '연말까지 사용 권장 — 휴가 탭에서 등록', tab: 'leave', tone: 'emerald' });
      }
    }
  }

  if (actions.length === 0) {
    actions.push({ icon: '✓', label: '모든 것이 정상', desc: '이번 달 입력 누락·한도 임박 없음', tab: null, tone: 'emerald' });
  }
  return actions.slice(0, 4);
}

// ── 컴포넌트 빌더 ─────────────────────────────────────────────────────────

function buildKpi(label, value, trend, tone) {
  return el('div', { class: 'ds-kpi' + (tone ? ' ' + tone : '') }, [
    el('div', { class: 'ds-kpi-label', text: label }),
    el('div', { class: 'ds-kpi-value', text: value }),
    el('div', { class: 'ds-kpi-trend', text: trend }),
  ]);
}

function buildKpiStrip(profile, monthlyWage, otThisMonth, otTrend, leaveSummary, totalAnnual, suite, m) {
  const kpis = el('div', { class: 'dash-kpi ds-row cols-5 mt-1' }, [
    buildKpi(
      '통상임금 (월)',
      monthlyWage > 0 ? '₩' + fmt(monthlyWage) : '—',
      profile?.jobType ? String(profile.jobType) : '프로필 미입력',
    ),
    buildKpi(
      m + '월 시간외',
      otThisMonth + 'h',
      otTrend > 0 ? '↑ ' + otTrend + '% (6개월 평균 대비)'
        : otTrend < 0 ? '↓ ' + Math.abs(otTrend) + '% (6개월 평균 대비)'
        : '평균과 동일 (6개월)',
      'indigo',
    ),
    buildKpi(
      '연차 잔여',
      leaveSummary ? leaveSummary.remainingAnnual + ' / ' + totalAnnual : '—',
      leaveSummary ? leaveSummary.usedAnnual + '일 사용' : '프로필 입력 후 자동',
      'emerald',
    ),
    buildKpi(
      '시간외 한도',
      (suite ? suite.limitPct : 0) + ' %',
      suite ? Math.max(0, 60 - suite.otH) + 'h 남음 (60h 기준)' : '—',
      'amber',
    ),
    buildKpi(
      '다음 N (야근)',
      suite?.nextN ? 'D-' + suite.nextN.daysAway : '—',
      suite?.nextN ? m + '월 ' + suite.nextN.day + '일' : '이번 달 N 없음',
      'cyan',
    ),
  ]);
  return kpis;
}

function buildChartsRow(series, dutyAgg, ot6moAvg, otThisMonth, m) {
  // 시간외 트렌드 카드
  const trendCard = el('div', { class: 'card p-3' }, [
    el('div', { class: 'card-title text-brand-body-large mb-2' }, '📊 6개월 시간외 트렌드'),
    series.every((s) => s.hours === 0)
      ? el('div', { class: 'dash-empty', text: '시간외 기록을 입력하면 트렌드가 표시됩니다.' })
      : buildBarSvg(series),
    el('div', { class: 'dash-meta' }, [
      el('span', { text: '평균 ' + ot6moAvg + 'h' }),
      el('span', { text: '이번 달 ' + otThisMonth + 'h' }),
    ]),
  ]);

  // 도넛 카드
  const donut = buildDonutSvg(dutyAgg.counts);
  const legend = el('div', { class: 'dash-donut-legend' }, [
    el('div', null, [el('span', { class: 'dash-dot', style: 'background:' + TONE.D }), 'D 데이 ', el('strong', { text: String(dutyAgg.counts.D) })]),
    el('div', null, [el('span', { class: 'dash-dot', style: 'background:' + TONE.E }), 'E 이브닝 ', el('strong', { text: String(dutyAgg.counts.E) })]),
    el('div', null, [el('span', { class: 'dash-dot', style: 'background:' + TONE.N }), 'N 나이트 ', el('strong', { text: String(dutyAgg.counts.N) })]),
    el('div', null, [el('span', { class: 'dash-dot', style: 'background:' + TONE.OFF }), 'OFF ', el('strong', { text: String(dutyAgg.counts.OFF) })]),
  ]);
  const donutCard = el('div', { class: 'card p-3' }, [
    el('div', { class: 'card-title text-brand-body-large mb-2' }, '🎯 ' + m + '월 근무 패턴'),
    el('div', { class: 'dash-donut-row' }, [donut, legend]),
  ]);

  return el('div', { class: 'dash-charts ds-row cols-2 mt-3' }, [trendCard, donutCard]);
}

function buildActions(actions) {
  const list = el('div', { class: 'dash-actions' });
  actions.forEach((a) => {
    const item = el('div', {
      class: 'dash-action' + (a.tone ? ' ' + a.tone : ''),
      'data-action-tab': a.tab || '',
    }, [
      el('div', { class: 'dash-action-icon', text: a.icon }),
      el('div', { class: 'dash-action-body' }, [
        el('div', { class: 'dash-action-label', text: a.label }),
        el('div', { class: 'dash-action-desc', text: a.desc }),
      ]),
    ]);
    if (a.tab) {
      item.addEventListener('click', () => {
        if (typeof window.switchTab === 'function') window.switchTab(a.tab);
      });
      item.style.cursor = 'pointer';
    }
    list.appendChild(item);
  });
  return el('div', { class: 'card p-3 mt-3' }, [
    el('div', { class: 'card-title text-brand-body-large mb-2' }, '⚡ 다음 액션 추천'),
    list,
  ]);
}

function buildCareer(profile, career) {
  if (!career) return null;
  return el('div', { class: 'card p-3 mt-3' }, [
    el('div', { class: 'card-title text-brand-body-large mb-2' }, '📍 커리어 타임라인'),
    el('div', { class: 'dash-career' }, [
      el('div', { class: 'dash-career-item' }, [
        el('div', { class: 'dash-career-label', text: '근속' }),
        el('div', { class: 'dash-career-value', text: career.yearsLabel }),
        el('div', { class: 'dash-career-meta', text: career.days + '일' }),
      ]),
      el('div', { class: 'dash-career-item' }, [
        el('div', { class: 'dash-career-label', text: '연차 (보장)' }),
        el('div', { class: 'dash-career-value', text: career.annualLeave + '일' }),
        el('div', { class: 'dash-career-meta', text: '근속 ' + career.annualLeaveYears + '년차' }),
      ]),
      el('div', { class: 'dash-career-item' }, [
        el('div', { class: 'dash-career-label', text: '호봉' }),
        el('div', { class: 'dash-career-value', text: (profile?.grade ? String(profile.grade) : '—') + (profile?.year ? ' ' + profile.year + '년차' : '') }),
        el('div', { class: 'dash-career-meta', text: profile?.jobType ? String(profile.jobType) : '프로필 미입력' }),
      ]),
    ]),
  ]);
}

// ── mount ────────────────────────────────────────────────────────────────

function ensureMount() {
  const tabHome = document.getElementById('tab-home');
  if (!tabHome) return null;
  let mount = document.getElementById('homeDashboard');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'homeDashboard';
    mount.className = 'home-dashboard';
    const grid = tabHome.querySelector('.home-summary-grid');
    if (grid) tabHome.insertBefore(mount, grid);
    else tabHome.insertBefore(mount, tabHome.firstChild);
  }
  return mount;
}

function renderDashboard() {
  const mount = ensureMount();
  if (!mount) return;
  clear(mount);

  const profile = PROFILE.load();
  const monthlyWage = _monthlyWage();
  const series = _last6MonthsOt();
  const dutyAgg = _thisMonthDuty();
  const suite = _suiteSummaryThisMonth();
  const career = _careerTimeline();
  const actions = _nextActions();

  const now = new Date();
  const m = now.getMonth() + 1;
  const otThisMonth = series[series.length - 1]?.hours || 0;
  const ot6moAvg = series.length > 0
    ? Math.round((series.reduce((a, s) => a + s.hours, 0) / series.length) * 10) / 10
    : 0;
  const otTrend = ot6moAvg > 0 ? Math.round(((otThisMonth - ot6moAvg) / ot6moAvg) * 100) : 0;

  const totalAnnual = career?.annualLeave || 0;
  const leaveSummary = totalAnnual > 0 ? LEAVE.calcAnnualSummary(now.getFullYear(), totalAnnual) : null;

  mount.appendChild(buildKpiStrip(profile, monthlyWage, otThisMonth, otTrend, leaveSummary, totalAnnual, suite, m));
  mount.appendChild(buildChartsRow(series, dutyAgg, ot6moAvg, otThisMonth, m));
  mount.appendChild(buildActions(actions));
  const careerCard = buildCareer(profile, career);
  if (careerCard) mount.appendChild(careerCard);
}

// ── 외부 hook ────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.renderHomeDashboard = renderDashboard;
  window.addEventListener('DOMContentLoaded', () => {
    const tab = document.getElementById('tab-home');
    if (tab && tab.classList.contains('active')) renderDashboard();
  });
  ['profileChanged', 'overtimeChanged', 'leaveChanged', 'scheduleChanged', 'payslipChanged'].forEach((ev) => {
    window.addEventListener(ev, () => {
      const tab = document.getElementById('tab-home');
      if (tab && tab.classList.contains('active')) renderDashboard();
    });
  });
}

export { renderDashboard as renderHomeDashboard };
