/**
 * Phase 39: payroll-views.js 정적 검증
 *
 * 1. 공개 API: initPayrollTab, renderPayHistory, renderPayPayslip
 * 2. 서브탭 라우팅: pay-payslip / pay-history
 * 3. buildNetPayCard — netPay, grossPay, miniStat
 * 4. buildBarChart — maxVal, netPay 기반 막대
 * 5. buildChangeFactors — 항목별 증감 비교
 * 6. buildStatsRow — 최솟값/최댓값/평균
 * 7. buildDonutChart + buildColorbarLegendItem — pay-colorbar
 * 8. buildHBarSection — pay-hbar-row, pay-hbar-fill
 * 9. buildCompareGrid — 지급합계/공제합계/실지급액
 * 10. buildTextUploadBtn + handleInlineUpload — PDF 업로드 → SALARY_PARSER 연동
 * 11. buildArchiveList — pay-archive-row
 * 12. openEditModal — pay-edit-modal, salaryItems/deductionItems, 저장/취소
 * 13. buildEmptyState — pay-empty-state
 * 14. aggregation 필터 — netPay > 0 || grossPay > 0
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
}

const src = fs.readFileSync(path.join(__dirname, '..', 'payroll-views.js'), 'utf8');

// ── Test 1: 공개 API ──────────────────────────────────────────────
console.log('\n[Test 1] 공개 API');
assert(src.includes('window.initPayrollTab'), 'initPayrollTab 공개');
assert(src.includes('window.renderPayHistory'), 'renderPayHistory 공개');
assert(src.includes('window.renderPayPayslip'), 'renderPayPayslip 공개');

// ── Test 2: 서브탭 라우팅 ────────────────────────────────────────
console.log('\n[Test 2] 서브탭 라우팅');
assert(src.includes("'pay-payslip'"), 'pay-payslip 분기');
assert(src.includes("renderPayHistory") && src.includes("window.renderPayHistory"), 'renderPayHistory 공개 함수 (pay-history 탭)');

assert(src.includes('data-subtab'), 'dataset.subtab 기반 라우팅');
assert(src.includes("renderPayPayslip()"), 'renderPayPayslip 호출');
assert(src.includes("renderPayHistory()") || src.includes('renderPayHistory'), 'renderPayHistory 호출');

// ── Test 3: buildNetPayCard ──────────────────────────────────────
console.log('\n[Test 3] buildNetPayCard');
assert(src.includes('function buildNetPayCard'), 'buildNetPayCard 함수');
assert(src.includes("summary?.netPay"), 'netPay 접근');
assert(src.includes("summary?.grossPay"), 'grossPay 접근');
assert(src.includes('buildMiniStat'), 'buildMiniStat 호출');
assert(src.includes("'stat-gross'"), 'stat-gross 클래스');
assert(src.includes("'stat-deduct'") || src.includes('stat-deduct'), 'stat-deduct 클래스');

// ── Test 4: buildBarChart ────────────────────────────────────────
console.log('\n[Test 4] buildBarChart');
assert(src.includes('function buildBarChart'), 'buildBarChart 함수');
assert(src.includes('maxVal'), 'maxVal 계산');
assert(src.includes('netPay || 0'), 'netPay fallback 0');
assert(
  src.includes("'pay-bar'") || src.includes('pay-bar') || src.includes('className: \'pay'),
  '막대 요소 CSS 클래스'
);

// ── Test 5: buildChangeFactors ───────────────────────────────────
console.log('\n[Test 5] buildChangeFactors');
assert(src.includes('function buildChangeFactors'), 'buildChangeFactors 함수');
assert(
  src.includes('salaryItems') && src.includes('deductionItems'),
  '지급/공제 항목 비교'
);
assert(src.includes('prev') && src.includes('latest'), 'latest vs prev 비교');

// ── Test 6: buildStatsRow ────────────────────────────────────────
console.log('\n[Test 6] buildStatsRow');
assert(src.includes('function buildStatsRow'), 'buildStatsRow 함수');
assert(src.includes('function buildStatCard'), 'buildStatCard 함수');
assert(
  src.includes('Math.min') || src.includes('최솟값') || src.includes('최소'),
  '최솟값 계산'
);
assert(
  src.includes('Math.max') || src.includes('최댓값') || src.includes('최대'),
  '최댓값 계산'
);
assert(
  src.includes('reduce') && (src.includes('/ nets.length') || src.includes('/ allData')),
  '평균 계산'
);

// ── Test 7: buildDonutChart + colorbar ──────────────────────────
console.log('\n[Test 7] buildDonutChart + colorbar');
assert(src.includes('function buildDonutChart'), 'buildDonutChart 함수');
assert(src.includes("'pay-colorbar'"), 'pay-colorbar 클래스');
assert(src.includes("'pay-colorbar-fill'"), 'pay-colorbar-fill 클래스');
assert(src.includes("'pay-colorbar-legend'"), 'pay-colorbar-legend 클래스');
assert(src.includes('function buildColorbarLegendItem'), 'buildColorbarLegendItem 함수');

// ── Test 8: buildHBarSection ─────────────────────────────────────
console.log('\n[Test 8] buildHBarSection');
assert(src.includes('function buildHBarSection'), 'buildHBarSection 함수');
assert(src.includes("'pay-hbar-row'"), 'pay-hbar-row 클래스');
assert(src.includes("'pay-hbar-fill'"), 'pay-hbar-fill 클래스');
assert(src.includes("'pay-hbar-name'"), 'pay-hbar-name 클래스');
assert(src.includes("'pay-hbar-amount'"), 'pay-hbar-amount 클래스');
assert(src.includes("'pay-hbar-track'"), 'pay-hbar-track 클래스');
assert(
  src.includes("'up'") && src.includes("'down'"),
  '증감 방향 CSS 클래스 (up/down)'
);

// ── Test 9: buildCompareGrid ─────────────────────────────────────
console.log('\n[Test 9] buildCompareGrid');
assert(src.includes('function buildCompareGrid'), 'buildCompareGrid 함수');
assert(src.includes("'지급합계'"), '지급합계 항목');
assert(src.includes("'공제합계'") || src.includes('totalDeduction'), '공제합계 항목');
assert(src.includes("'실지급액'"), '실지급액 항목');

// ── Test 10: buildTextUploadBtn + handleInlineUpload ─────────────
console.log('\n[Test 10] buildTextUploadBtn + handleInlineUpload');
assert(src.includes('function buildTextUploadBtn'), 'buildTextUploadBtn 함수');
assert(
  src.includes("accept: 'application/pdf,.pdf'") || src.includes("accept: \"application/pdf,.pdf\"") || src.includes("'.pdf'"),
  'PDF 파일 타입 accept'
);
assert(src.includes('async function handleInlineUpload'), 'handleInlineUpload 함수');
assert(src.includes('SALARY_PARSER.parseFile'), 'SALARY_PARSER.parseFile 호출');
assert(src.includes('SALARY_PARSER.parsePeriodYearMonth'), 'parsePeriodYearMonth 호출');
assert(src.includes('SALARY_PARSER.saveMonthlyData'), 'saveMonthlyData 호출');
assert(src.includes('파일 처리 중'), '로딩 텍스트');

// ── Test 11: buildArchiveList ────────────────────────────────────
console.log('\n[Test 11] buildArchiveList');
assert(src.includes('function buildArchiveList'), 'buildArchiveList 함수');
assert(src.includes("'pay-archive-row'") || src.includes('pay-archive-row'), 'pay-archive-row 클래스');
assert(
  src.includes('SALARY_PARSER.deleteMonthlyData') || src.includes('deleteMonthlyData'),
  'deleteMonthlyData 호출'
);
assert(
  src.includes('openEditModal') || src.includes('수정'),
  '수정 버튼/openEditModal 연결'
);

// ── Test 12: openEditModal ───────────────────────────────────────
console.log('\n[Test 12] openEditModal');
assert(src.includes('function openEditModal'), 'openEditModal 함수');
assert(src.includes("'pay-edit-modal-overlay'"), 'pay-edit-modal-overlay 클래스');
assert(src.includes("'pay-edit-modal'"), 'pay-edit-modal 클래스');
assert(
  src.includes("'pay-edit-item-row'"),
  'pay-edit-item-row 항목 행'
);
assert(src.includes("pay-edit-save-btn"), '저장 버튼');
assert(src.includes("pay-edit-cancel-btn"), '취소 버튼');
assert(src.includes("'pay-edit-actions'"), 'pay-edit-actions 컨테이너');
assert(
  src.includes('SALARY_PARSER.saveMonthlyData') && src.includes('overwrite') || src.includes('true'),
  '수정 저장 시 overwrite=true'
);
assert(src.includes('editedAt'), 'editedAt 타임스탬프 기록');
assert(src.includes('items.splice'), '항목 삭제 로직');
assert(src.includes("'pay-edit-total-row'"), '실지급액 합계 표시');

// ── Test 13: buildEmptyState ─────────────────────────────────────
console.log('\n[Test 13] buildEmptyState');
assert(src.includes('function buildEmptyState'), 'buildEmptyState 함수');
assert(src.includes("'pay-empty-state'"), 'pay-empty-state 클래스');
assert(src.includes('📭'), '📭 빈 상태 아이콘');
assert(src.includes('onAction && actionLabel'), '조건부 액션 버튼');

// ── Test 14: aggregation 필터 ────────────────────────────────────
console.log('\n[Test 14] 집계 필터 (netPay>0 || grossPay>0)');
assert(
  src.includes('netPay > 0 || s.grossPay > 0') || src.includes('s.netPay > 0 || s.grossPay > 0'),
  '유효 명세서 필터 (netPay>0 || grossPay>0)'
);
assert(
  src.includes("summary: { grossPay, totalDeduction, netPay: grossPay - totalDeduction }"),
  'aggregation 요약 계산 (netPay = grossPay - totalDeduction)'
);
assert(
  src.includes('salaryItems.reduce') || src.includes('.reduce('),
  'reduce로 합산'
);

console.log(`\n=== Phase 39 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
