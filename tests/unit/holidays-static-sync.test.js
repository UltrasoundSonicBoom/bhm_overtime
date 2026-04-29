// tests/unit/holidays-static-sync.test.js
// JSON (apps/web/public/data/holidays/{year}.json) ↔ HOLIDAYS.staticData[year] 동기화 검증
// JSON 은 외부 도구(GitHub Actions, 검증 스크립트)의 source of truth.
// staticData 는 런타임 폴백 — 두 곳이 어긋나면 사용자 화면이 코드와 다르게 보임.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOLIDAYS } from '@snuhmate/calculators/holidays';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../apps/web/public/data/holidays');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
}

function normalize(items) {
  return items
    .map(h => `${h.date}|${h.name}`)
    .sort();
}

describe('holidays JSON ↔ staticData 동기화', () => {
  for (const year of [2025, 2026, 2027, 2028]) {
    it(`${year}: JSON 과 staticData 가 같은 항목 (date+name) 을 가진다`, () => {
      const json = loadJson(`${year}.json`);
      const fromJson = normalize(json.holidays);
      const fromStatic = normalize(HOLIDAYS.staticData[year]);
      expect(fromJson).toEqual(fromStatic);
    });

    it(`${year}: 5월 1일 근로자의 날 포함 (단협 제32조(6))`, () => {
      const json = loadJson(`${year}.json`);
      const has = json.holidays.some(h => h.date === `${year}0501` && h.name === '근로자의 날');
      expect(has).toBe(true);
      const hasStatic = HOLIDAYS.staticData[year].some(h => h.date === `${year}0501` && h.name === '근로자의 날');
      expect(hasStatic).toBe(true);
    });
  }

  it('hospital.json ↔ HOLIDAYS.hospitalHolidays 가 같은 항목을 가진다', () => {
    const hospital = loadJson('hospital.json');
    const fromJson = hospital.annual
      .map(h => `${h.month}/${h.day}|${h.name}|${h.halfDay ? 'half' : 'full'}`)
      .sort();
    const fromCode = HOLIDAYS.hospitalHolidays
      .map(h => `${h.month}/${h.day}|${h.name}|${h.halfDay ? 'half' : 'full'}`)
      .sort();
    expect(fromJson).toEqual(fromCode);
  });

  it('hospitalHolidays: 근로자의 날(5/1), 조합설립일(8/1 반일), 개원기념일(10/15) 포함', () => {
    const names = HOLIDAYS.hospitalHolidays.map(h => h.name);
    expect(names).toContain('근로자의 날');
    expect(names).toContain('조합설립일');
    expect(names).toContain('개원기념일');

    const union = HOLIDAYS.hospitalHolidays.find(h => h.name === '조합설립일');
    expect(union.halfDay).toBe(true);
    expect(union.halfDayHours).toBe('09:00–13:00');
  });

  it('_mergeHospitalHolidays: halfDay 메타데이터를 결과에 보존한다', () => {
    const merged = HOLIDAYS._mergeHospitalHolidays(2026, []);
    const union = merged.find(h => h.name === '조합설립일');
    expect(union).toBeDefined();
    expect(union.halfDay).toBe(true);
    expect(union.halfDayHours).toBe('09:00–13:00');
    expect(union.halfDayPeriod).toBe('오전');
  });
});
