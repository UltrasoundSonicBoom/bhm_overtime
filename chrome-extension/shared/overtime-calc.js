// chrome-extension/shared/overtime-calc.js
'use strict';
function toMin(t) { const [h,m] = t.split(':').map(Number); return h*60+m; }
function overlap(s1,e1,s2,e2) { return Math.max(0, Math.min(e1,e2)-Math.max(s1,s2)); }
function nightHours(s, e) {
  const n1 = overlap(s, e, 1320, 1440);
  const eAdj = e <= s ? e + 1440 : e;
  const n2 = overlap(s, eAdj, 1440, 1800);
  return (n1 + n2) / 60;
}
function calcTimeBreakdown(dateStr, startTime, endTime, type, isHoliday) {
  const s = toMin(startTime);
  let   e = toMin(endTime);
  if (e <= s) e += 1440;
  const totalH = (e - s) / 60;
  const nightH = nightHours(s, e);
  const dayH   = totalH - nightH;
  if (isHoliday) return {
    extended: 0, night: 0,
    holiday:      parseFloat(dayH.toFixed(2)),
    holidayNight: parseFloat(nightH.toFixed(2)),
  };
  // Extended: time from 18:00 to 22:00 (night start)
  const extMinStart = Math.max(s, 1080);  // 18:00
  const extMinEnd   = Math.min(e, 1320);  // 22:00
  const extMin = Math.max(0, extMinEnd - extMinStart);
  const extH = extMin / 60;
  return {
    extended:     parseFloat(extH.toFixed(2)),
    night:        parseFloat(nightH.toFixed(2)),
    holiday: 0, holidayNight: 0,
  };
}
if (typeof module !== 'undefined') module.exports = { calcTimeBreakdown };
