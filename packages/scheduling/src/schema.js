export const DUTY_CODES = Object.freeze(['D', 'E', 'N', 'OFF', '9A']);

export const DEFAULT_SHIFT_TEMPLATES = Object.freeze({
  D: Object.freeze({ code: 'D', label: 'Day', startsAt: '07:00', endsAt: '15:00', countsAsWork: true }),
  E: Object.freeze({ code: 'E', label: 'Evening', startsAt: '15:00', endsAt: '23:00', countsAsWork: true }),
  N: Object.freeze({ code: 'N', label: 'Night', startsAt: '23:00', endsAt: '07:00', countsAsWork: true, night: true }),
  OFF: Object.freeze({ code: 'OFF', label: 'Off', countsAsWork: false }),
  '9A': Object.freeze({ code: '9A', label: '9A', startsAt: '09:00', endsAt: '17:00', countsAsWork: true }),
});

const DUTY_ALIASES = Object.freeze({
  O: 'OFF',
  OFF: 'OFF',
  '휴': 'OFF',
  '휴무': 'OFF',
});

export function normalizeDutyCode(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const upper = raw.toUpperCase();
  return DUTY_ALIASES[raw] ?? DUTY_ALIASES[upper] ?? upper;
}

export function normalizeDayKey(day) {
  const parsed = Number.parseInt(String(day), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
    throw new TypeError(`Invalid schedule day: ${day}`);
  }
  return String(parsed).padStart(2, '0');
}

export function toIsoDate(period, day) {
  return `${period}-${normalizeDayKey(day)}`;
}

export function isValidDutyCode(dutyCode) {
  return DUTY_CODES.includes(normalizeDutyCode(dutyCode));
}

export function clonePlain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }

  return Object.freeze(value);
}
