// tests/unit/ical-parser.test.js — iCal 파서 단위 테스트
import { describe, it, expect } from 'vitest';
import { parseIcsText } from '../../apps/web/src/client/schedule-parser/ical-parser.js';

const ICS_BASIC = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
UID:1@test
DTSTART;VALUE=DATE:20260401
SUMMARY:데이
END:VEVENT
BEGIN:VEVENT
UID:2@test
DTSTART;VALUE=DATE:20260402
SUMMARY:이브닝
END:VEVENT
BEGIN:VEVENT
UID:3@test
DTSTART;VALUE=DATE:20260403
SUMMARY:나이트
END:VEVENT
BEGIN:VEVENT
UID:4@test
DTSTART;VALUE=DATE:20260404
SUMMARY:연차
END:VEVENT
END:VCALENDAR`;

describe('parseIcsText — 기본', () => {
  it('SUMMARY → 듀티 코드 매핑', () => {
    const result = parseIcsText(ICS_BASIC);
    expect(result.month).toBe('2026-04');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].days['1']).toBe('D');
    expect(result.rows[0].days['2']).toBe('E');
    expect(result.rows[0].days['3']).toBe('N');
    expect(result.rows[0].days['4']).toBe('AL');
    expect(result.confidence).toBe(1.0);
  });

  it('영어 SUMMARY ("Day", "Evening", ...)', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:e1@test
DTSTART;VALUE=DATE:20260401
SUMMARY:Day shift
END:VEVENT
BEGIN:VEVENT
UID:e2@test
DTSTART;VALUE=DATE:20260402
SUMMARY:Night
END:VEVENT
END:VCALENDAR`;
    const result = parseIcsText(ics);
    expect(result.rows[0].days['1']).toBe('D');
    expect(result.rows[0].days['2']).toBe('N');
  });

  it('알 수 없는 SUMMARY → 빈 셀 + notes', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:x1@test
DTSTART;VALUE=DATE:20260401
SUMMARY:생일파티
END:VEVENT
BEGIN:VEVENT
UID:x2@test
DTSTART;VALUE=DATE:20260402
SUMMARY:데이
END:VEVENT
END:VCALENDAR`;
    const result = parseIcsText(ics);
    expect(result.rows[0].days['1']).toBeUndefined();  // 매핑 실패
    expect(result.rows[0].days['2']).toBe('D');
    expect(result.notes).toContain('생일파티');
  });

  it('monthHint 적용 시 그 월만 필터', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:m1@test
DTSTART;VALUE=DATE:20260301
SUMMARY:데이
END:VEVENT
BEGIN:VEVENT
UID:m2@test
DTSTART;VALUE=DATE:20260401
SUMMARY:나이트
END:VEVENT
END:VCALENDAR`;
    const result = parseIcsText(ics, { monthHint: '2026-04' });
    expect(result.month).toBe('2026-04');
    expect(result.rows[0].days['1']).toBe('N');
  });
});

describe('parseIcsText — 엣지 케이스', () => {
  it('빈 텍스트 → empty', () => {
    const result = parseIcsText('');
    expect(result.confidence).toBe(0);
    expect(result.notes).toBe('empty_ics');
  });

  it('VEVENT 없음', () => {
    const result = parseIcsText('BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR');
    expect(result.notes).toBe('no_events');
  });

  it('잘못된 ICS 텍스트', () => {
    const result = parseIcsText('not ical content at all');
    expect(result.confidence).toBe(0);
    expect(result.notes).toContain('parse_error');
  });
});

describe('parseIcsText — 본인 이름', () => {
  it('profileName 사용', () => {
    const result = parseIcsText(ICS_BASIC, { profileName: '김민지' });
    expect(result.rows[0].name).toBe('김민지');
  });

  it('profileName 없으면 "내"', () => {
    const result = parseIcsText(ICS_BASIC);
    expect(result.rows[0].name).toBe('내');
  });
});
