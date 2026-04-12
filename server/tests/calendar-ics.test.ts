import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIcsCalendar } from '../src/services/calendar-ics'

test('buildIcsCalendar emits all-day and timed events', () => {
  const ics = buildIcsCalendar({
    calendarName: '101 병동',
    events: [
      {
        uid: 'shift-1',
        summary: 'D 근무',
        start: '2026-05-01T07:00:00.000Z',
        end: '2026-05-01T15:00:00.000Z',
      },
      {
        uid: 'leave-1',
        summary: '연차',
        start: '2026-05-02',
        end: '2026-05-03',
        allDay: true,
      },
    ],
  })

  assert.match(ics, /BEGIN:VCALENDAR/)
  assert.match(ics, /SUMMARY:D 근무/)
  assert.match(ics, /DTSTART;VALUE=DATE:20260502/)
  assert.match(ics, /END:VCALENDAR/)
})
