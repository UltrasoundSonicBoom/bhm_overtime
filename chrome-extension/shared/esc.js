// chrome-extension/shared/esc.js
'use strict';
// 사용자 데이터를 innerHTML에 삽입할 때 반드시 esc() 사용
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
