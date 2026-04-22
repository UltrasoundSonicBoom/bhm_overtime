// ══════════════════════════════════════════════════════════════
//  RetirementEngine — 임금피크 × 중간정산 계산 엔진
//  side-effect 없는 순수 계산 모듈. data.js / calculators.js 불필요.
// ══════════════════════════════════════════════════════════════
const RetirementEngine = (function () {
  'use strict';

  // ── 퇴직금 계산에 필요한 내장 데이터 ──────────────────────
  // ARCH-01: 아래 SEV_PAY, SEV_MULTI는 data.js의 DATA.severancePay,
  //          DATA.severanceMultipliersPre2001과 동일한 값으로 유지해야 함.
  //          DB 연결 후: window.DATA 참조로 전환 예정.
  // 출처: data.js severancePay (2015.06.30 이전 입사자 퇴직수당)
  const SEV_PAY = window.DATA && window.DATA.severancePay ? window.DATA.severancePay : [
    { min: 20, rate: 0.60 },
    { min: 15, rate: 0.50 },
    { min: 10, rate: 0.45 },
    { min:  5, rate: 0.35 },
    { min:  1, rate: 0.10 }
  ];
  // 출처: data.js severanceMultipliersPre2001 (2001.08.31 이전 입사자 누진배수)
  // ARCH-01: DB 연결 후 window.DATA 참조로 전환 예정.
  const SEV_MULTI = window.DATA && window.DATA.severanceMultipliersPre2001 ? window.DATA.severanceMultipliersPre2001 : [
    { min: 30, multiplier: 52.5 },
    { min: 25, multiplier: 42.5 },
    { min: 20, multiplier: 33.0 },
    { min: 15, multiplier: 24.0 },
    { min: 14, multiplier: 22.3 },
    { min: 13, multiplier: 20.6 },
    { min: 12, multiplier: 18.9 },
    { min: 11, multiplier: 17.2 },
    { min: 10, multiplier: 15.5 },
    { min:  9, multiplier: 13.9 },
    { min:  8, multiplier: 12.3 },
    { min:  7, multiplier: 10.7 },
    { min:  6, multiplier:  9.1 },
    { min:  5, multiplier:  7.5 },
    { min:  4, multiplier:  5.5 },
    { min:  3, multiplier:  3.5 },
    { min:  2, multiplier:  2.0 },
    { min:  1, multiplier:  1.0 }
  ];
  const CUT2001 = new Date('2001-08-31');
  const CUT2015 = new Date('2015-06-30');

  // ── localStorage 접근 ──────────────────────────────────────
  function profileKey() {
    return window.getUserStorageKey
      ? window.getUserStorageKey('bhm_hr_profile')
      : 'bhm_hr_profile';
  }
  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(profileKey())) || {}; }
    catch { return {}; }
  }
  function getLatestWage() {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('payslip_')) continue;
      const m = k.match(/payslip_(\d{4})_(\d{2})(?:_(.+))?$/);
      if (m) entries.push({ year: +m[1], month: +m[2], type: m[3] || '급여', key: k });
    }
    entries.sort((a, b) => b.year - a.year || b.month - a.month
      || (a.type === '급여' ? -1 : 1));
    for (const e of entries) {
      try {
        const d = JSON.parse(localStorage.getItem(e.key));
        if (d?.summary?.grossPay > 0)
          return { wage: d.summary.grossPay, source: `${e.year}년 ${e.month}월 명세서` };
      } catch {}
    }
    return null;
  }

  // ── 자동 입력 로드 ─────────────────────────────────────────
  function autoLoad() {
    const p  = loadProfile();
    const wr = getLatestWage();
    return {
      wage:       wr?.wage      || 0,
      wageSource: wr?.source    || null,
      birthDate:  p.birthDate   || null,
      hireDate:   p.hireDate    || null,
      name:       p.name        || null,
      isComplete: !!(wr?.wage && p.birthDate && p.hireDate)
    };
  }

  // ── 날짜 계산 ──────────────────────────────────────────────
  function calcPeakDates(birthDateStr) {
    const b = new Date(birthDateStr);
    return {
      peakStart: new Date(b.getFullYear() + 60, b.getMonth(), b.getDate()),
      peakEnd:   new Date(b.getFullYear() + 61, b.getMonth(), b.getDate())
    };
  }
  function dStr(d) { return d.toISOString().slice(0, 10); }
  function diffDays(a, b) {
    return Math.max(0, Math.floor((new Date(b) - new Date(a)) / 86400000));
  }

  // ── 퇴직금 계산 핵심 (retireDate 명시) ────────────────────
  //   wage        : 기준 평균임금 (월)
  //   hireDateStr : 입사일 YYYY-MM-DD
  //   retireDateStr: 퇴직(예정)일 YYYY-MM-DD
  function calcSev(wage, hireDateStr, retireDateStr) {
    const hire    = new Date(hireDateStr);
    const days    = diffDays(hireDateStr, retireDateStr);
    const precise = days / 365;
    const years   = Math.floor(precise);

    if (precise < 1) return { 퇴직금: 0, 기본퇴직금: 0, 퇴직수당: 0,
      yearsDisplay: '1년 미만', precise, isPre2001: hire <= CUT2001, isPre2015: hire <= CUT2015 };

    // 기본 퇴직금
    let base   = Math.round(wage * precise);
    let method = '법정 퇴직금';
    if (hire <= CUT2001) {
      const row = SEV_MULTI.find(r => years >= r.min);
      if (row) { base = Math.round(wage * row.multiplier); method = `누진배수 ×${row.multiplier}`; }
    }

    // 퇴직수당 (2015.06.30 이전 입사자)
    let addon = 0;
    if (hire <= CUT2015) {
      const sp = SEV_PAY.find(s => years >= s.min);
      if (sp) addon = Math.round(wage * precise * sp.rate);
    }

    const yrs = Math.floor(precise);
    const mos = Math.floor((precise % 1) * 12);
    return {
      퇴직금:   base + addon,
      기본퇴직금: base,
      퇴직수당:  addon,
      yearsDisplay: `${yrs}년 ${mos}개월`,
      precise, method,
      isPre2001: hire <= CUT2001,
      isPre2015: hire <= CUT2015
    };
  }

  // 중간정산 후 최종 1년치: 근속 리셋 → 기본 1개월치만 (퇴직수당 조건 미충족)
  function calcFinalAfterMid(wage) {
    return { 퇴직금: Math.round(wage), 기본퇴직금: Math.round(wage), 퇴직수당: 0, yearsDisplay: '1년' };
  }

  // ── 5개 시나리오 계산 ──────────────────────────────────────
  function calcAllScenarios(wage, hireDateStr, birthDateStr) {
    const { peakStart, peakEnd } = calcPeakDates(birthDateStr);
    const ps = dStr(peakStart);
    const pe = dStr(peakEnd);

    const w60 = Math.round(wage * 0.6);

    const list = [
      // ① 임금피크 전 퇴직 (만 59세)
      (function () {
        const sev = calcSev(wage, hireDateStr, ps);
        return {
          id: 'before_peak',
          label: '임금피크 전 퇴직',
          sublabel: '만 59세, 임금피크 전날 퇴직',
          tag: '비교 기준',
          tagColor: '#64748b',
          midSettlement: false,
          sev, midSev: null, finalSev: null,
          peakIncome: 0, peakRate: 0,
          segments: [{ label: '퇴직금', amt: sev.퇴직금, color: '#6C5CE7' }],
          totalSev: sev.퇴직금,
          total: sev.퇴직금,
          retireAge: '만 60세'
        };
      })(),

      // ② 옵션 A — 중간정산 없이
      (function () {
        const sev = calcSev(w60, hireDateStr, pe);
        const pi  = Math.round(w60 * 12);
        return {
          id: 'optA_no_mid',
          label: '옵션 A — 중간정산 없이',
          sublabel: '공로연수(60%) 1년, 퇴직금도 60% 기준',
          tag: '가장 불리',
          tagColor: '#ef4444',
          midSettlement: false,
          sev, midSev: null, finalSev: null,
          peakIncome: pi, peakRate: 0.6,
          segments: [
            { label: '퇴직금', amt: sev.퇴직금, color: '#6C5CE7' },
            { label: '공로연수 수령', amt: pi, color: '#FDCB6E' }
          ],
          totalSev: sev.퇴직금,
          total: sev.퇴직금 + pi,
          retireAge: '만 61세'
        };
      })(),

      // ③ 옵션 A — 중간정산 후
      (function () {
        const midSev   = calcSev(wage, hireDateStr, ps);   // N년 × 100%
        const finalSev = calcFinalAfterMid(w60);            // 1년 × 60%
        const pi       = Math.round(w60 * 12);
        const totalSev = midSev.퇴직금 + finalSev.퇴직금;
        return {
          id: 'optA_mid',
          label: '옵션 A — 중간정산 후',
          sublabel: '임금피크 전 중간정산 + 공로연수(60%) 1년',
          tag: '중간정산 추천',
          tagColor: '#00B894',
          midSettlement: true,
          sev: midSev, midSev, finalSev,
          peakIncome: pi, peakRate: 0.6,
          segments: [
            { label: '중간정산', amt: midSev.퇴직금, color: '#A29BFE' },
            { label: '최종퇴직금', amt: finalSev.퇴직금, color: '#6C5CE7' },
            { label: '공로연수 수령', amt: pi, color: '#FDCB6E' }
          ],
          totalSev,
          total: totalSev + pi,
          retireAge: '만 61세'
        };
      })(),

      // ④ 옵션 B — 중간정산 없이
      (function () {
        const sev = calcSev(wage, hireDateStr, pe);   // N+1년 × 100%
        const pi  = Math.round(wage * 12);
        return {
          id: 'optB_no_mid',
          label: '옵션 B — 중간정산 없이',
          sublabel: '계속근무(100%) 1년, 퇴직금 기준 유지',
          tag: '일반 선택',
          tagColor: '#6C5CE7',
          midSettlement: false,
          sev, midSev: null, finalSev: null,
          peakIncome: pi, peakRate: 1.0,
          segments: [
            { label: '퇴직금', amt: sev.퇴직금, color: '#6C5CE7' },
            { label: '계속근무 수령', amt: pi, color: '#FDCB6E' }
          ],
          totalSev: sev.퇴직금,
          total: sev.퇴직금 + pi,
          retireAge: '만 61세'
        };
      })(),

      // ⑤ 옵션 B — 중간정산 후
      (function () {
        const midSev   = calcSev(wage, hireDateStr, ps);   // N년 × 100%
        const finalSev = calcFinalAfterMid(wage);           // 1년 × 100%
        const pi       = Math.round(wage * 12);
        const totalSev = midSev.퇴직금 + finalSev.퇴직금;
        return {
          id: 'optB_mid',
          label: '옵션 B — 중간정산 후',
          sublabel: '임금피크 전 중간정산 + 계속근무(100%) 1년',
          tag: '비교용',
          tagColor: '#74B9FF',
          midSettlement: true,
          sev: midSev, midSev, finalSev,
          peakIncome: pi, peakRate: 1.0,
          segments: [
            { label: '중간정산', amt: midSev.퇴직금, color: '#A29BFE' },
            { label: '최종퇴직금', amt: finalSev.퇴직금, color: '#6C5CE7' },
            { label: '계속근무 수령', amt: pi, color: '#FDCB6E' }
          ],
          totalSev,
          total: totalSev + pi,
          retireAge: '만 61세'
        };
      })()
    ];

    const maxTotal = Math.max(...list.map(s => s.total));
    const bestIdx  = list.reduce((bi, s, i) => s.total > list[bi].total ? i : bi, 0);

    // 중간정산 효과: ③ vs ② (옵션A 비교)
    const midEffect = list[2].total - list[1].total;

    return { scenarios: list, maxTotal, bestIdx, midEffect, peakStart, peakEnd };
  }

  // ── 단일 퇴직금 계산 (탭 1용) ─────────────────────────────
  function calcSingle(wage, hireDateStr, retireDateStr) {
    return calcSev(wage, hireDateStr, retireDateStr);
  }

  // ── 포맷 헬퍼 ─────────────────────────────────────────────
  function fmt(n) {
    if (n === 0) return '0원';
    if (Math.abs(n) >= 100000000) {
      const eok = Math.floor(Math.abs(n) / 100000000);
      const man = Math.round((Math.abs(n) % 100000000) / 10000);
      const s   = (n < 0 ? '-' : '') + eok + '억';
      return man > 0 ? s + ' ' + man.toLocaleString() + '만원' : s + '원';
    }
    return (n < 0 ? '-' : '') + Math.round(Math.abs(n) / 10000).toLocaleString() + '만원';
  }
  function fmtFull(n) { return Math.round(n).toLocaleString() + '원'; }
  function fmtDate(d) {
    if (!d) return '—';
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt)) return '—';
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
  }
  function daysUntil(targetDate) {
    return Math.max(0, Math.ceil((new Date(targetDate) - new Date()) / 86400000));
  }

  // ── 3개월 평균임금 계산 (R20) ─────────────────────────────
  // 사용: getThreeMonthAverage([{grossPay: 3000000}, ...]) 최신순 정렬 배열
  // 반환: { average, months, warning: null | 'insufficient_data' | 'wage_peak_protection' }
  // 근거: 근로기준법 제2조 평균임금 3개월 원칙
  // 임금피크 보호 기준: 최저임금(2026: 9,860원) × 209h × 1.2 = 2,472,120원 이상이면 정상
  function getThreeMonthAverage(payslips) {
    if (!payslips || payslips.length < 3) {
      return {
        average: null,
        months: payslips ? payslips.length : 0,
        warning: 'insufficient_data'
      };
    }
    const recent3 = payslips.slice(0, 3);
    const avg = Math.floor(recent3.reduce(function (s, p) { return s + p.grossPay; }, 0) / 3);
    // 운영기능직 임금피크 보호: 최저임금 9,860원 × 209h × 1.2 (2026 기준)
    const wagePeakThreshold = Math.floor(9860 * 209 * 1.2); // 2,472,120원
    const warning = avg < wagePeakThreshold ? 'wage_peak_protection' : null;
    return { average: avg, months: 3, warning };
  }

  return {
    autoLoad,
    calcAllScenarios,
    calcSingle,
    calcPeakDates,
    calcSev,
    fmt,
    fmtFull,
    fmtDate,
    daysUntil,
    dStr,
    getThreeMonthAverage
  };
})();
