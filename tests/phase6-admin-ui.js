'use strict';
// Phase 6: Union Regulation Admin UI 테스트
// RED → GREEN: admin/union_regulation_admin.html 구현 전 실패 예상

const fs = require('fs');
const path = require('path');

let pass = 0;
let fail = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    pass++;
  } else {
    console.log(`  ❌ FAIL: ${msg}`);
    fail++;
  }
}

// ── 파일 존재 확인 ────────────────────────────────────────────
console.log('\n[1] 파일 존재 확인');
assert(fs.existsSync('admin/union_regulation_admin.html'), 'admin/union_regulation_admin.html 존재');
assert(fs.existsSync('admin/union_regulation_admin.js'), 'admin/union_regulation_admin.js 존재');

const htmlPath = 'admin/union_regulation_admin.html';
const jsPath = 'admin/union_regulation_admin.js';
const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8') : '';

// ── HTML 구조 ─────────────────────────────────────────────────
console.log('\n[2] HTML 구조 확인');
assert(html.includes('<!DOCTYPE html'), 'DOCTYPE html 선언');
assert(html.includes('union_regulation_admin.js') || html.includes('union_regulation_admin'), 'JS 스크립트 참조');

// ── regulation-constants.js 핵심 상수 렌더링 대상 포함 ────────
console.log('\n[3] regulation-constants.js 상수 렌더링 확인');
assert(html.includes('NIGHT_ALLOWANCE_MULTIPLIER') || js.includes('NIGHT_ALLOWANCE_MULTIPLIER'),
  'NIGHT_ALLOWANCE_MULTIPLIER 상수 참조');
assert(html.includes('LONG_SERVICE_PAY') || js.includes('LONG_SERVICE_PAY'),
  'LONG_SERVICE_PAY 상수 참조');
assert(html.includes('ORDINARY_WAGE_HOURS') || js.includes('ORDINARY_WAGE_HOURS'),
  'ORDINARY_WAGE_HOURS 상수 참조');
assert(html.includes('REFRESH_BENEFIT_MONTHLY') || js.includes('REFRESH_BENEFIT_MONTHLY'),
  'REFRESH_BENEFIT_MONTHLY 상수 참조');
assert(html.includes('OVERTIME_MULTIPLIER') || js.includes('OVERTIME_MULTIPLIER'),
  'OVERTIME_MULTIPLIER 상수 참조');

// ── nurse_regulation.json 동기화 패널 ─────────────────────────
console.log('\n[4] nurse_regulation.json 동기화 패널 확인');
assert(html.includes('nurse_regulation') || js.includes('nurse_regulation'),
  'nurse_regulation.json 참조');
assert(html.includes('syncStatus') || js.includes('syncStatus') ||
       html.includes('sync') || js.includes('불일치') || js.includes('mismatch'),
  '동기화 상태 표시 로직');
assert(html.includes('BUG-N-01') || js.includes('BUG-N-01') ||
       js.includes('night_22_to_06') || html.includes('night_22_to_06'),
  'BUG-N-01 (야간배율 불일치) 참조');

// ── 편집/클립보드 기능 ─────────────────────────────────────────
console.log('\n[5] 편집 및 클립보드 기능 확인');
assert(js.includes('clipboard') || js.includes('Clipboard') || js.includes('copy') || html.includes('clipboard'),
  '클립보드 복사 기능');
assert(html.includes('<table') || html.includes('table') || js.includes('table') || js.includes('innerHTML'),
  '상수 목록 테이블 렌더링');

// ── 결과 ──────────────────────────────────────────────────────
console.log(`\n결과: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('\n→ Phase 6 완료!');
} else {
  console.log('\n→ Phase 6 미완료. 구현 후 재실행하세요.');
  process.exit(1);
}
