// chrome-extension/shared/leave-calc.js
'use strict';
function calcLeaveDays(startStr, endStr, calendarDays) {
  const start = new Date(startStr + 'T00:00:00');
  const end   = new Date(endStr   + 'T00:00:00');
  let days = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (calendarDays || (dow !== 0 && dow !== 6)) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
if (typeof module !== 'undefined') module.exports = { calcLeaveDays };
