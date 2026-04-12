/**
 * Phase 4 TDD 테스트: 표시 일관성 검증
 * 실행: node tests/phase4-display.js
 *
 * DISPLAY-01: app.js 가계지원비 미지급월 텍스트
 * DISPLAY-02: data.js FAQ 가계지원비 미지급월
 * DISPLAY-03: data.js FAQ 시간외수당 ref 조항
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n=== Phase 4 표시 일관성 검증 ===\n');

const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const dataJs = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');

// ── DISPLAY-01: app.js 가계지원비 미지급월 ────────────────
console.log('[ DISPLAY-01: app.js 미지급월 표시 ]');

// "1·2·9월" 패턴 없어야 함 (2월 오류 포함)
assert(!appJs.includes('1·2·9월'), 'DISPLAY-01: "1·2·9월" 오류 텍스트 제거됨');

// 올바른 표시 방식 포함
assert(
  appJs.includes('1·9월') || appJs.includes('1월, 9월') || appJs.includes('1월·9월'),
  'DISPLAY-01: "1·9월" 또는 "1월, 9월" 올바른 텍스트 사용'
);

// ── DISPLAY-02: data.js FAQ 가계지원비 ────────────────────
console.log('\n[ DISPLAY-02: data.js FAQ 가계지원비 ]');

// "미지급월: 1월, 9월" 또는 유사한 올바른 표현 포함
assert(
  (dataJs.includes('미지급월') && (dataJs.includes('1월') && dataJs.includes('9월'))) ||
  dataJs.includes('1·9월'),
  'DISPLAY-02: FAQ 가계지원비 미지급월 올바른 표현 (1월, 9월)'
);

// 기존 오류 표현 "1월, 2월, 9월" 또는 "1·2·9월" 없어야 함 (FAQ 섹션에서)
// data.js에서 '2월' 미지급월로 표시하지 않아야 함
const faqSection = dataJs.match(/id.*?가계지원비[\s\S]*?(?=\},\s*\{|$)/)?.[0] || '';
const hasWrong2month = /미지급.*?2월|2월.*?미지급/.test(faqSection);
assert(!hasWrong2month, 'DISPLAY-02: FAQ에서 2월 미지급 오류 표현 없음');

// ── DISPLAY-03: data.js FAQ 시간외수당 ref ───────────────
console.log('\n[ DISPLAY-03: FAQ 시간외수당 조항 번호 ]');

// 시간외수당 FAQ의 ref에 제34조 포함
// data.js에서 overtime 관련 FAQ의 ref 필드
const overtimeFaqRef = dataJs.match(/(?:시간외수당|연장근무|overtime)[\s\S]{0,500}?ref\s*:\s*['"]([^'"]+)['"]/);
if (overtimeFaqRef) {
  const ref = overtimeFaqRef[1];
  assert(ref.includes('제34조'), `DISPLAY-03: 시간외수당 FAQ ref에 제34조 포함 (현재: ${ref})`);
} else {
  // ref 필드 직접 검색
  const hasRef34 = dataJs.includes("'제34조, 제47조'") || dataJs.includes('"제34조, 제47조"') ||
                   dataJs.includes("'제34조'") && dataJs.includes("'제47조'");
  assert(hasRef34, 'DISPLAY-03: 시간외수당 FAQ ref "제34조, 제47조" 통일');
}

// ── 최종 ──────────────────────────────────────────────
console.log(`\n결과: ${passed} PASS / ${failed} FAIL\n`);

if (failed > 0) {
  console.log('→ Phase 4 미완료. 표시 텍스트 수정 후 재실행하세요.\n');
  process.exit(1);
} else {
  console.log('→ Phase 4 완료! Phase 5로 진행하세요.\n');
  process.exit(0);
}
