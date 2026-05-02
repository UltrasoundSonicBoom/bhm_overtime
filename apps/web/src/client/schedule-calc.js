// schedule-calc.js — 근무 탭 순수 계산 함수.
// 부수효과 없음(localStorage/DOM 미접근). schedule-tab.js와 단위 테스트가 import.

import {
  NIGHT_SHIFT_BONUS_PER_SHIFT,
  NIGHT_ALLOWANCE_MULTIPLIER,
  HOLIDAY_MULTIPLIER,
} from '@snuhmate/regulation-constants';

export const DUTY_CODES = ['D', 'E', 'N', 'O', 'OFF', 'AL', 'RD', '9A'];

export function normalizeDutyCode(code) {
  const raw = String(code == null ? '' : code).trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (upper === 'OFF' || raw === '휴' || raw === '휴무') return 'O';
  if (upper === '9A') return '9A';
  return ['D', 'E', 'N', 'O', 'AL', 'RD'].includes(upper) ? upper : '';
}

export const DUTY_TIMES = {
  D:  { start: '07:00', end: '15:00', overnight: false, hours: 8 },
  E:  { start: '14:00', end: '22:00', overnight: false, hours: 8 },
  N:  { start: '22:00', end: '07:00', overnight: true,  hours: 8 },
  O:  null,
  OFF: null,
  AL: null,
  RD: null,
  '9A': { start: '09:00', end: '17:00', overnight: false, hours: 8 },
};

// HPPD 임계 (병동 기준값. 후속에 settings로 빼기).
export const HPPD_THRESHOLDS = {
  dayEvening: 5,  // D + E 합 ≥ 5
  night: 2,       // N ≥ 2
};

// 단체협약 / 근로기준법 한도 (이번 작업 범위에서 enforce하는 3종).
export const VIOLATION_LIMITS = {
  consecutiveNight: 3,        // N 3일 이상 연속 → 경고
  minRestHours: 11,           // N → D 최소 휴식 11시간 (실제 휴식: 7시간 → 위반)
  monthlyNightMax: 9,         // 월 야간 9일 초과 → 시간외수당 처리 대상
};

// ── 1. 월간 듀티 카운트 ──
export function calcMonthlyDutyCounts(mineMap, holidaySet = new Set()) {
  const counts = { D: 0, E: 0, N: 0, O: 0, AL: 0, RD: 0, holidayDuty: 0 };
  if (!mineMap) return counts;

  for (const [day, code] of Object.entries(mineMap)) {
    const normalized = normalizeDutyCode(code);
    if (!normalized) continue;
    if (normalized === '9A') counts['9A'] = (counts['9A'] || 0) + 1;
    else counts[normalized]++;
    // 공휴일에 D/E/N 근무 시 휴일근무 카운트
    if (holidaySet.has(Number(day)) && ['D', 'E', 'N', '9A'].includes(normalized)) {
      counts.holidayDuty++;
    }
  }
  return counts;
}

// ── 2. 예상 야간수당 ──
// hourlyRate=0 → 0 반환 (graceful)
// 가산금: N 1회당 10,000원
// 가산임금: N 8h × hourlyRate × 0.5 (200% 중 통상임금 100%는 기본임금에 포함, 가산분만 추가)
export function calcEstimatedNightPay(nCount, hourlyRate) {
  if (!nCount || nCount <= 0) return 0;
  if (!hourlyRate || hourlyRate <= 0) return 0;
  const bonus = nCount * NIGHT_SHIFT_BONUS_PER_SHIFT;
  const nightHoursPay = nCount * 8 * hourlyRate * (NIGHT_ALLOWANCE_MULTIPLIER - 1.0);
  return Math.round(bonus + nightHoursPay);
}

// ── 3. 휴일 근무 추정 가산임금 ──
export function calcEstimatedHolidayPay(holidayDutyCount, hourlyRate) {
  if (!holidayDutyCount || holidayDutyCount <= 0) return 0;
  if (!hourlyRate || hourlyRate <= 0) return 0;
  // 휴일 8h × hourlyRate × 0.5 (150% 중 가산분 50%)
  return Math.round(holidayDutyCount * 8 * hourlyRate * (HOLIDAY_MULTIPLIER - 1.0));
}

// ── 4. 단체협약/근기법 위반 검출 ──
export function detectViolations(mineMap, year, month) {
  const violations = [];
  if (!mineMap) return violations;

  const daysInMonth = new Date(year, month, 0).getDate();
  const sortedDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const code = normalizeDutyCode(mineMap[d]);
    if (code) sortedDays.push({ day: d, code });
  }

  // (a) consecutive_night: N이 limit일 이상 연속
  let run = 0;
  let runStart = -1;
  for (const { day, code } of sortedDays) {
    if (code === 'N') {
      if (run === 0) runStart = day;
      run++;
    } else {
      if (run >= VIOLATION_LIMITS.consecutiveNight) {
        violations.push({
          type: 'consecutive_night',
          days: run,
          fromDate: _ymdLocal(year, month, runStart),
        });
      }
      run = 0;
      runStart = -1;
    }
  }
  if (run >= VIOLATION_LIMITS.consecutiveNight) {
    violations.push({
      type: 'consecutive_night',
      days: run,
      fromDate: _ymdLocal(year, month, runStart),
    });
  }

  // (b) min_rest_violation: N(d) 다음 날 D(d+1) — 휴식 7시간 (07~다음날 07)
  for (let d = 1; d < daysInMonth; d++) {
    if (normalizeDutyCode(mineMap[d]) === 'N' && normalizeDutyCode(mineMap[d + 1]) === 'D') {
      violations.push({
        type: 'min_rest_violation',
        date: _ymdLocal(year, month, d + 1),
        restHours: 7,
      });
    }
  }

  // (b-2) night_off_day_recovery: N-O-D / N-O-9A 회복 패턴 차단
  for (let d = 1; d <= daysInMonth - 2; d++) {
    const first = normalizeDutyCode(mineMap[d]);
    const second = normalizeDutyCode(mineMap[d + 1]);
    const third = normalizeDutyCode(mineMap[d + 2]);
    if (first === 'N' && second === 'O' && (third === 'D' || third === '9A')) {
      violations.push({
        type: 'night_off_day_recovery',
        fromDate: _ymdLocal(year, month, d),
        offDate: _ymdLocal(year, month, d + 1),
        returnDate: _ymdLocal(year, month, d + 2),
      });
    }
  }

  // (c) monthly_night_overflow: N count > limit
  const nCount = sortedDays.filter(s => s.code === 'N').length;
  if (nCount > VIOLATION_LIMITS.monthlyNightMax) {
    violations.push({
      type: 'monthly_night_overflow',
      count: nCount,
      limit: VIOLATION_LIMITS.monthlyNightMax,
    });
  }

  return violations;
}

// ── 5. 다음 근무 ──
export function findNextDuty(mineMap, year, month, today = new Date()) {
  if (!mineMap) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayY = today.getFullYear();
  const todayM = today.getMonth() + 1;
  const todayD = today.getDate();

  // 오늘이 이번 달이면 오늘부터, 다른 달이면 1일부터
  let startDay = (todayY === year && todayM === month) ? todayD : 1;

  for (let d = startDay; d <= daysInMonth; d++) {
    const code = normalizeDutyCode(mineMap[d]);
    if (code && code !== 'O') {
      const time = DUTY_TIMES[code];
      return {
        date: _ymdLocal(year, month, d),
        day: d,
        code,
        timeRange: time ? `${time.start} ~ ${time.overnight ? '익일 ' : ''}${time.end}` : null,
      };
    }
  }
  return null;
}

// ── 6. HPPD 충족 (mine + team 일자별 인원) ──
export function calcHppdByDay(monthData, year, month) {
  const result = {};
  if (!monthData) return result;

  const daysInMonth = new Date(year, month, 0).getDate();
  const allRows = [];
  if (monthData.mine) allRows.push(monthData.mine);
  if (monthData.team) {
    for (const teamMap of Object.values(monthData.team)) {
      allRows.push(teamMap);
    }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    let day = 0, evening = 0, night = 0;
    for (const row of allRows) {
      const code = normalizeDutyCode(row[d]);
      if (code === 'D') day++;
      else if (code === '9A') day++;
      else if (code === 'E') evening++;
      else if (code === 'N') night++;
    }
    const dayEveningOk = (day + evening) >= HPPD_THRESHOLDS.dayEvening;
    const nightOk = night >= HPPD_THRESHOLDS.night;
    const ok = dayEveningOk && nightOk;
    result[d] = { day, evening, night, ok, alert: !ok };
  }
  return result;
}

// ── 7. 듀티 → 시간외/휴가 레코드 매핑 (idempotency용 source 메타데이터 포함) ──
// 각 일자별 mine 듀티를 OVERTIME / LEAVE 레코드 입력으로 변환.
// 호출자가 isHoliday를 미리 계산해서 holidayDays Set으로 전달.
export function mineMapToRecords(mineMap, year, month, holidayDays = new Set(), opts = {}) {
  const { hourlyRate = 0, sourceMonth = null } = opts;
  const ymPrefix = sourceMonth || `${year}-${String(month).padStart(2, '0')}`;
  const overtimeRecords = [];
  const leaveRecords = [];

  if (!mineMap) return { overtimeRecords, leaveRecords };

  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const code = normalizeDutyCode(mineMap[d]);
    if (!code) continue;
    const dateStr = _ymdLocal(year, month, d);
    const isHoliday = holidayDays.has(d);

    if (code === 'N') {
      // 야간근무: 22:00~07:00 (next day 07:00). overtime API는 단일 날짜로 처리.
      overtimeRecords.push({
        date: dateStr,
        startTime: '22:00',
        endTime: '07:00',
        type: 'overtime',
        hourlyRate,
        isHoliday,
        memo: '근무표 자동입력 (N)',
        source: 'schedule',
        sourceMonth: ymPrefix,
      });
    } else if ((code === 'D' || code === 'E' || code === '9A') && isHoliday) {
      // 공휴일 D/E → 휴일근무
      const time = DUTY_TIMES[code];
      overtimeRecords.push({
        date: dateStr,
        startTime: time.start,
        endTime: time.end,
        type: 'overtime',
        hourlyRate,
        isHoliday: true,
        memo: `근무표 자동입력 (${code} 공휴일)`,
        source: 'schedule',
        sourceMonth: ymPrefix,
      });
    } else if (code === 'AL') {
      leaveRecords.push({
        type: 'annual',
        startDate: dateStr,
        endDate: dateStr,
        memo: '근무표 자동입력 (AL)',
        source: 'schedule',
        sourceMonth: ymPrefix,
      });
    } else if (code === 'RD') {
      leaveRecords.push({
        type: 'recovery_day',
        startDate: dateStr,
        endDate: dateStr,
        memo: '근무표 자동입력 (RD)',
        source: 'schedule',
        sourceMonth: ymPrefix,
      });
    }
    // D/E 평일은 정규근무 — 레코드 생성 안 함
  }

  return { overtimeRecords, leaveRecords };
}

// ── 내부 유틸 ──
function _ymdLocal(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
