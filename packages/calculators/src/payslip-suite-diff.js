// payslip-suite-diff.js — 명세서 vs Suite 시간외 차이 비교 (순수함수).
//
// 입력:
//   parsed: { extHours, nightHours, holidayHours, otAmount, payMonth: 'YYYY-MM' }
//   suiteOtHours: 통합 캘린더에서 도출한 해당 월 시간외 합 (deriveSuite.otH)
//
// 출력:
//   { match: bool, diff: number, parsedTotal: number, missing: string[] }
//
// suite 가 명세서보다 적으면 "사용자가 캘린더 입력 누락" 가능성 → missing에 사유 기록.
// 차이가 0.25h(15분) 미만이면 일치로 간주.

const TOLERANCE_HOURS = 0.25;

export function comparePayslipToSuite(parsed, suiteOtHours) {
  const p = parsed || {};
  const ext = Number(p.extHours) || 0;
  const night = Number(p.nightHours) || 0;
  const holiday = Number(p.holidayHours) || 0;
  const parsedTotal = ext + night + holiday;
  const suite = Number(suiteOtHours) || 0;

  const diff = parsedTotal - suite;
  const match = Math.abs(diff) < TOLERANCE_HOURS;

  const missing = [];
  if (!match && diff > 0) {
    // 명세서에 더 많음 → 캘린더 누락
    if (ext > 0) missing.push(`연장근무 ${ext}h`);
    if (night > 0) missing.push(`야간근무 ${night}h`);
    if (holiday > 0) missing.push(`휴일근무 ${holiday}h`);
  }

  return {
    match,
    diff: Math.round(diff * 100) / 100,
    parsedTotal: Math.round(parsedTotal * 100) / 100,
    suiteTotal: Math.round(suite * 100) / 100,
    missing,
    payMonth: p.payMonth,
  };
}
