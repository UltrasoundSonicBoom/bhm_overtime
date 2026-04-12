/**
 * Phase 5 TDD 테스트: 데드코드 정리 검증
 * 실행: node tests/phase5-cleanup.js
 *
 * ARCH-02: data/PayrollEngine.js → data/archive/ 아카이브
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

console.log('\n=== Phase 5 데드코드 정리 검증 ===\n');

// T5-01: 원본 파일이 data/ 루트에 없어야 함
assert(!fs.existsSync(path.join(ROOT, 'data', 'PayrollEngine.js')),
  'T5-01: data/PayrollEngine.js 원본 위치에 없음');

// T5-02: 아카이브 디렉토리에 존재
assert(fs.existsSync(path.join(ROOT, 'data', 'archive', 'PayrollEngine.legacy.js')),
  'T5-02: data/archive/PayrollEngine.legacy.js 아카이브 존재');

// T5-03: 아카이브 파일에 레거시 주석 포함
const archivePath = path.join(ROOT, 'data', 'archive', 'PayrollEngine.legacy.js');
if (fs.existsSync(archivePath)) {
  const content = fs.readFileSync(archivePath, 'utf8');
  assert(content.includes('ARCH-02') || content.includes('아카이브') || content.includes('archive') || content.includes('legacy'),
    'T5-03: 아카이브 파일에 레거시 표시 주석 포함');
}

// T5-04: 실행 파일들이 PayrollEngine을 import/require 하지 않음
const execFiles = ['app.js', 'payroll.js', 'calculators.js', 'data.js', 'index.html'];
execFiles.forEach(file => {
  const filePath = path.join(ROOT, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasImport = content.includes('PayrollEngine') && !content.includes('// PayrollEngine');
    assert(!hasImport, `T5-04: ${file}에서 PayrollEngine import 없음`);
  }
});

console.log(`\n결과: ${passed} PASS / ${failed} FAIL\n`);

if (failed > 0) {
  console.log('→ Phase 5 미완료.\n');
  process.exit(1);
} else {
  console.log('→ Phase 5 완료! Phase 0-5 모두 완료.\n');
  process.exit(0);
}
