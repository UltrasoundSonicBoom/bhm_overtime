type CalendarEvent = {
  uid: string
  summary: string
  description?: string | null
  start: string
  end: string
  allDay?: boolean
  location?: string | null
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const min = String(date.getUTCMinutes()).padStart(2, '0')
  const sec = String(date.getUTCSeconds()).padStart(2, '0')
  return `${yyyy}${mm}${dd}T${hh}${min}${sec}Z`
}

function formatDate(value: string): string {
  return value.replace(/-/g, '')
}

function foldIcsLine(line: string): string {
  if (line.length <= 74) {
    return line
  }

  const parts: string[] = []
  let cursor = line
  while (cursor.length > 74) {
    parts.push(cursor.slice(0, 74))
    cursor = ` ${cursor.slice(74)}`
  }
  parts.push(cursor)
  return parts.join('\r\n')
}

export function buildIcsCalendar(input: {
  calendarName: string
  events: CalendarEvent[]
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SNUH Mate//Schedule Export//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(input.calendarName)}`,
  ]

  for (const event of input.events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${escapeIcsText(event.uid)}`)
    lines.push(`DTSTAMP:${formatDateTime(new Date().toISOString())}`)
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDate(event.start)}`)
      lines.push(`DTEND;VALUE=DATE:${formatDate(event.end)}`)
    } else {
      lines.push(`DTSTART:${formatDateTime(event.start)}`)
      lines.push(`DTEND:${formatDateTime(event.end)}`)
    }
    lines.push(`SUMMARY:${escapeIcsText(event.summary)}`)
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`)
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.map(foldIcsLine).join('\r\n')
}
