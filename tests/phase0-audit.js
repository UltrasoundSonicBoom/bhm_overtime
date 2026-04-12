/**
 * Phase 0 TDD 테스트: 규정 원문 전수 감사 검증
 * 실행: node tests/phase0-audit.js
 *
 * RED 단계: 감사 보고서가 없으면 FAIL
 * GREEN 단계: Phase 0 완료 후 PASS
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

console.log('\n=== Phase 0 감사 보고서 검증 ===\n');

// T0-1: 감사 보고서 파일 존재
const auditPath = path.join(ROOT, 'docs', 'regulation-audit-2026.md');
const auditExists = fs.existsSync(auditPath);
assert(auditExists, '감사 보고서 파일 존재 (docs/regulation-audit-2026.md)');

if (auditExists) {
  const audit = fs.readFileSync(auditPath, 'utf8');

  // T0-2: 알려진 11개 주요 이슈 기록
  const requiredIssues = ['BUG-01', 'BUG-02', 'BUG-03', 'BUG-04', 'ARCH-01', 'ARCH-02', 'ARCH-03', 'DISPLAY-01', 'DISPLAY-02', 'DISPLAY-03', 'DISPLAY-04'];
  requiredIssues.forEach(id => {
    assert(audit.includes(id), `이슈 ${id} 감사 보고서에 포함`);
  });

  // T0-3: 조항 번호 10개 이상 참조
  const refMatches = audit.match(/제\d+조/g) || [];
  assert(refMatches.length >= 10, `조항 번호 10개 이상 참조 (현재: ${refMatches.length}개)`);

  // T0-4: 파일:위치 정보 포함
  assert(audit.includes('calculators.js') || audit.includes('data.js'), '파일:위치 정보 포함');

  // T0-5: 현재값 vs 올바른값 섹션 존재
  assert(audit.includes('현재') && audit.includes('수정'), '현재값/수정방법 섹션 포함');

  // T0-6: 전수 감사 체크리스트 (통상임금 항목 14개 이상 검증)
  assert(audit.includes('통상임금'), '통상임금 구성 항목 감사 포함');

  // T0-7: nurse_regulation.json 불일치 항목 포함
  assert(audit.includes('nurse_regulation') || audit.includes('BUG-N-01'), '백엔드 시스템(nurse_regulation.json) 불일치 감사 포함');

  // T0-8: 심각도 분류 존재
  assert(audit.includes('🔴') || audit.includes('Critical') || audit.includes('버그'), '심각도 분류 포함');

  // T0-9: 추가 발견 이슈 섹션 또는 "추가 이슈 없음" 확인
  assert(audit.includes('추가') || audit.includes('Additional'), '추가 발견 이슈 섹션 포함');

  // T0-10: 요약 섹션 존재
  assert(audit.includes('요약') || audit.includes('Summary') || audit.includes('전체'), '요약/전체 섹션 포함');
}

console.log(`\n결과: ${passed} PASS / ${failed} FAIL\n`);

if (failed > 0) {
  console.log('→ Phase 0 미완료. 감사 보고서 생성 후 재실행하세요.\n');
  process.exit(1);
} else {
  console.log('→ Phase 0 완료! Phase 1로 진행하세요.\n');
  process.exit(0);
}
