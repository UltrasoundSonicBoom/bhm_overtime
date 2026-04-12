/**
 * Phase 29: C2 -- Google Calendar Integration
 *
 * Tests:
 * 1. googleCalendarSync.js exists with required API
 * 2. index.html has Calendar UI section
 * 3. Calendar toggle exists
 * 4. Uses dedicated calendar (not primary)
 * 5. Only syncs leave records (not overtime)
 * 6. Google login gating
 * 7. Privacy settings supported
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

console.log('Phase 29: C2 -- Google Calendar Integration\n');

// --- Test 1: googleCalendarSync.js exists ---
console.log('[Test 1] googleCalendarSync.js');
const calPath = path.join(__dirname, '..', 'googleCalendarSync.js');
assert(fs.existsSync(calPath), 'googleCalendarSync.js exists');
const calJs = fs.readFileSync(calPath, 'utf8');
assert(calJs.includes('GoogleCalendarSync'), 'Exposes GoogleCalendarSync namespace');
assert(calJs.includes('createOrUpdateEvent'), 'Has createOrUpdateEvent method');
assert(calJs.includes('deleteEvent'), 'Has deleteEvent method');
assert(calJs.includes('ensureDedicatedCalendar'), 'Has ensureDedicatedCalendar method');
assert(calJs.includes('resyncAll'), 'Has resyncAll method');
assert(calJs.includes('disconnect'), 'Has disconnect method');

// --- Test 2: Calendar API usage ---
console.log('\n[Test 2] Calendar API usage');
assert(calJs.includes('googleapis.com/calendar'), 'Uses Google Calendar API');
assert(calJs.includes('Authorization'), 'Sends Authorization header');
assert(calJs.includes('Bearer'), 'Uses Bearer token');

// --- Test 3: Dedicated calendar ---
console.log('\n[Test 3] Dedicated calendar');
assert(calJs.includes('SNUH Mate'), 'Uses SNUH Mate dedicated calendar name');
assert(calJs.includes('calendars'), 'Creates/uses calendars endpoint');
assert(calJs.includes('calendarId') || calJs.includes('_calendarId'), 'Tracks calendar ID');

// --- Test 4: index.html Calendar UI ---
console.log('\n[Test 4] index.html Calendar UI');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert(indexHtml.includes('googleCalendarSection'), 'Google Calendar section exists');
assert(indexHtml.includes('calendarToggle'), 'Calendar toggle exists');
assert(indexHtml.includes('onCalendarToggle'), 'Calendar toggle handler exists');

// --- Test 5: Leave-only sync (no overtime) ---
console.log('\n[Test 5] Leave-only sync');
assert(calJs.includes('LEAVE') || calJs.includes('leave'), 'References leave module');
assert(calJs.includes('bhmLeaveId') || calJs.includes('leaveId'), 'Tracks leave record IDs');
assert(calJs.includes('startDate'), 'Uses startDate from records');
assert(calJs.includes('endDate'), 'Uses endDate from records');

// --- Test 6: Google login gating ---
console.log('\n[Test 6] Google login gating');
assert(calJs.includes('GoogleAuth'), 'References Google Auth');
assert(calJs.includes('isSignedIn') || calJs.includes('getAccessToken'), 'Checks sign-in state');
assert(calJs.includes('calendarEnabled'), 'Checks calendar enabled setting');

// --- Test 7: Privacy settings ---
console.log('\n[Test 7] Privacy settings');
assert(calJs.includes('visibility') || calJs.includes('private'), 'Event visibility set');
assert(calJs.includes('privacyMode') || calJs.includes('genericTitle'), 'Privacy mode supported');

// --- Test 8: Error handling ---
console.log('\n[Test 8] Error handling');
assert(calJs.includes('.catch') || calJs.includes('catch'), 'Has error catch blocks');
assert(calJs.includes('console.warn'), 'Logs warnings');

// --- Test 9: Event types ---
console.log('\n[Test 9] Event types');
assert(calJs.includes('all-day') || calJs.includes('date:'), 'Supports all-day events');
assert(calJs.includes('dateTime') || calJs.includes('time_leave'), 'Supports timed events');

// --- Test 10: Script loaded in index.html ---
console.log('\n[Test 10] Script inclusion');
assert(indexHtml.includes('googleCalendarSync.js'), 'googleCalendarSync.js loaded in index.html');

// --- Test 11: Resync capability ---
console.log('\n[Test 11] Resync capability');
assert(calJs.includes('resyncMonth'), 'Supports monthly resync');
assert(calJs.includes('resyncAll'), 'Supports full resync');

// --- Test 12: Token refresh ---
console.log('\n[Test 12] Token refresh');
assert(calJs.includes('refreshToken') || calJs.includes('_withToken'), 'Supports token refresh');

console.log(`\n--- Phase 29 Results: ${passed} PASS / ${failed} FAIL ---`);
process.exit(failed > 0 ? 1 : 0);
