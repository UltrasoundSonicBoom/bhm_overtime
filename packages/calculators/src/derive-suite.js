// derive-suite.js — 통합 캘린더의 KPI / 인사이트 도출 (순수함수, side-effect 없음).
//
// 입력:
//   cells: { '<day>': { duty: 'D'|'E'|'N'|'OFF', ot: number, leave: bool, leaveType?: string } }
//   profile: { hourlyRate?: number, annualQuota?: number }   // 옵션
//   today:   Date | undefined  // 옵션, 기본 new Date()
//
// 출력:
//   {
//     totalH,         // 정규근무 시간 합 (D/E/N × 8h, 휴가일 제외 — 반차는 4h)
//     dC, eC, nC,     // 듀티별 일수
//     offCount,       // OFF 일수
//     otH,            // 시간외 합 (cells.ot)
//     nightHours,     // 야간 시간 (N × 8)
//     leaveDays,      // 휴가 일수 (반차=0.5)
//     limitPct,       // 시간외 한도 사용률 (60h 기준)
//     remainingOtH,   // 남은 시간외 한도
//     nextN,          // { day, daysAway } | null  — today 이후 가장 가까운 N
//     hasNtoD,        // N 다음날 D 패턴 여부
//     remainingLeave, // annualQuota - leaveDays
//     otPay,          // 시간외 예상 수당 (otH × hourlyRate × 1.5)
//     nightPay,       // 야간 가산 (nightHours × hourlyRate × 0.5)
//   }
//
// 사용처: schedule-suite.js 의 calcStats 를 본 함수로 교체.
// 단협 §32 야간가산 = 통상임금 × 0.5; 시간외 = 통상임금 × 1.5.

const OT_RATE_FACTOR = 1.5;
const NIGHT_BONUS_FACTOR = 0.5;
const OT_LIMIT_HOURS = 60;
const DEFAULT_QUOTA = 21;
const DAY_HOURS = 8;
const HALF_DAY = 0.5;

function isHalfLeave(c) {
  return !!(c && c.leaveType && String(c.leaveType).indexOf('반차') >= 0);
}

export function deriveSuite(cells, profile, today) {
  const c = cells || {};
  const p = profile || {};
  const hourly = Number(p.hourlyRate) || 0;
  const quota = Number(p.annualQuota) || DEFAULT_QUOTA;
  const now = today instanceof Date ? today : new Date();

  const dayKeys = Object.keys(c).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n) && n >= 1);
  dayKeys.sort((a, b) => a - b);

  let totalH = 0;
  let otH = 0;
  let nightHours = 0;
  let leaveDays = 0;
  let dC = 0, eC = 0, nC = 0, offCount = 0;

  for (const day of dayKeys) {
    const cell = c[String(day)];
    if (!cell) continue;
    const half = isHalfLeave(cell);
    if (cell.leave) leaveDays += half ? HALF_DAY : 1;
    const worksThisDay = !cell.leave || half;
    if (worksThisDay) {
      const dutyHours = half ? DAY_HOURS / 2 : DAY_HOURS;
      if (cell.duty === 'D')      { dC++; totalH += dutyHours; }
      else if (cell.duty === 'E') { eC++; totalH += dutyHours; }
      else if (cell.duty === 'N') { nC++; totalH += dutyHours; nightHours += dutyHours; }
      else                        { offCount++; }
    } else {
      offCount++;
    }
    otH += Number(cell.ot) || 0;
  }

  const limitPct = Math.round((otH / OT_LIMIT_HOURS) * 100);
  const remainingOtH = Math.max(0, OT_LIMIT_HOURS - otH);

  const todayDay = now.getDate();
  let nextN = null;
  for (const day of dayKeys) {
    if (day < todayDay) continue;
    const cell = c[String(day)];
    if (cell && cell.duty === 'N' && !cell.leave) {
      nextN = { day, daysAway: day - todayDay };
      break;
    }
  }

  let hasNtoD = false;
  for (let i = 0; i < dayKeys.length - 1; i++) {
    const a = c[String(dayKeys[i])];
    const b = c[String(dayKeys[i + 1])];
    if (!a || !b) continue;
    if (a.duty === 'N' && b.duty === 'D' && !a.leave && !b.leave) {
      hasNtoD = true;
      break;
    }
  }

  const remainingLeave = Math.max(0, quota - leaveDays);
  const otPay = Math.round(otH * hourly * OT_RATE_FACTOR);
  const nightPay = Math.round(nightHours * hourly * NIGHT_BONUS_FACTOR);

  return {
    totalH,
    dC, eC, nC,
    offCount,
    otH: Math.round(otH * 100) / 100,
    nightHours,
    leaveDays: Math.round(leaveDays * 10) / 10,
    limitPct,
    remainingOtH,
    nextN,
    hasNtoD,
    remainingLeave: Math.round(remainingLeave * 10) / 10,
    otPay,
    nightPay,
    annualQuota: quota,
  };
}
