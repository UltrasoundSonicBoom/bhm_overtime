/**
 * Phase 38: 급여명세서 파서 (salary-parser.js) + G5 권한 다이얼로그 검증
 *
 * 1. SALARY_PARSER 공개 API 존재 확인
 * 2. 지급/공제 패턴 배열 (SNUH 명세서 항목 커버리지)
 * 3. 핵심 파싱 함수 (extractSummary, extractEmployeeInfo, extractPeriod, analyzeGrid)
 * 4. 파일 형식별 파서 (parseExcel/CSV/PDF/Image + parseFile 라우터)
 * 5. localStorage 연동 (save/load/delete/list)
 * 6. 앱 데이터와 비교 (compareWithApp, applyStableItemsToProfile)
 * 7. G5: Google 권한 설명 다이얼로그 (index.html)
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

const parserSrc = fs.readFileSync(path.join(__dirname, '..', 'salary-parser.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── Test 1: 공개 API 존재 ────────────────────────────────────────
console.log('\n[Test 1] SALARY_PARSER 공개 API');
assert(parserSrc.includes('const SALARY_PARSER = ('), 'SALARY_PARSER IIFE');
assert(parserSrc.includes('parseFile,'), 'parseFile 공개');
assert(parserSrc.includes('saveMonthlyData,'), 'saveMonthlyData 공개');
assert(parserSrc.includes('replaceMonthlyData,'), 'replaceMonthlyData 공개');
assert(parserSrc.includes('loadMonthlyData,'), 'loadMonthlyData 공개');
assert(parserSrc.includes('deleteMonthlyData,'), 'deleteMonthlyData 공개');
assert(parserSrc.includes('listSavedMonths,'), 'listSavedMonths 공개');
assert(parserSrc.includes('parsePeriodYearMonth,'), 'parsePeriodYearMonth 공개');
assert(parserSrc.includes('applyStableItemsToProfile,'), 'applyStableItemsToProfile 공개');
assert(parserSrc.includes('compareWithApp,'), 'compareWithApp 공개');
assert(parserSrc.includes('parsePDFText,'), 'parsePDFText 공개');
assert(parserSrc.includes('parseImage,'), 'parseImage 공개');

// ── Test 2: 지급 항목 패턴 ───────────────────────────────────────
console.log('\n[Test 2] 지급 항목 패턴 (SALARY_PATTERNS)');
assert(parserSrc.includes('SALARY_PATTERNS'), 'SALARY_PATTERNS 상수');
assert(parserSrc.includes('/시간외수당|시간외근무수당/'), '시간외수당 패턴');
assert(parserSrc.includes('/야간근무가산|야간수당/'), '야간수당 패턴');
assert(parserSrc.includes('/기본기준급|기준기본급|기본급/'), '기본급 패턴');
assert(parserSrc.includes('/장기근속수당/'), '장기근속수당 패턴');
assert(parserSrc.includes('/당직비|숙직비/'), '당직비 패턴');
assert(parserSrc.includes('/군복무수당/'), '군복무수당 패턴');

// ── Test 3: 공제 항목 패턴 ───────────────────────────────────────
console.log('\n[Test 3] 공제 항목 패턴 (DEDUCTION_PATTERNS)');
assert(parserSrc.includes('DEDUCTION_PATTERNS'), 'DEDUCTION_PATTERNS 상수');
assert(parserSrc.includes('/소득세/'), '소득세 패턴');
assert(parserSrc.includes('/국민건강|건강보험/'), '건강보험 패턴');
assert(parserSrc.includes('/국민연금|연금보험/'), '국민연금 패턴');
assert(parserSrc.includes('/고용보험/'), '고용보험 패턴');
assert(parserSrc.includes('/노동조합비|조합비/'), '노동조합비 패턴');

// ── Test 4: 요약 패턴 + 숫자 파싱 ───────────────────────────────
console.log('\n[Test 4] 요약 패턴 + parseAmount');
assert(parserSrc.includes('SUMMARY_PATTERNS'), 'SUMMARY_PATTERNS 상수');
assert(parserSrc.includes('/급여총액|총지급액|지급총액|총급여|급여계|지급계/'), '총지급액 패턴');
assert(parserSrc.includes('/공제총액|총공제액|공제계|차감총액/'), '공제총액 패턴');
assert(parserSrc.includes('/실지급액|차인지급액|실수령액|실급여/'), '실지급액 패턴');
assert(parserSrc.includes('function parseAmount'), 'parseAmount 함수');
assert(
  parserSrc.includes(".replace(/,/g, '')") || parserSrc.includes('replace(/,/g'),
  'parseAmount: 쉼표 제거'
);

// ── Test 5: extractSummary / extractEmployeeInfo / extractPeriod ─
console.log('\n[Test 5] 핵심 파싱 함수');
assert(parserSrc.includes('function extractSummary'), 'extractSummary 함수');
assert(parserSrc.includes('grossPay'), 'extractSummary: grossPay');
assert(parserSrc.includes('totalDeduction'), 'extractSummary: totalDeduction');
assert(parserSrc.includes('netPay'), 'extractSummary: netPay');
assert(parserSrc.includes('function extractEmployeeInfo'), 'extractEmployeeInfo 함수');
assert(parserSrc.includes("'employeeNumber'"), 'extractEmployeeInfo: 사원번호');
assert(parserSrc.includes("'jobType'"), 'extractEmployeeInfo: 직종');
assert(parserSrc.includes('function extractPeriod'), 'extractPeriod 함수');
assert(parserSrc.includes("'년' && cell.includes('월분')") || parserSrc.includes("cell.includes('년') && cell.includes('월분')"),
  'extractPeriod: 년월분 파싱');

// ── Test 6: analyzeGrid + 파일 형식별 파서 ─────────────────────
console.log('\n[Test 6] analyzeGrid + 파일 형식 파서');
assert(parserSrc.includes('function analyzeGrid'), 'analyzeGrid 함수');
assert(parserSrc.includes('async function parseExcel'), 'parseExcel 함수');
assert(parserSrc.includes('async function parseCSV'), 'parseCSV 함수');
assert(parserSrc.includes('async function parsePDF'), 'parsePDF 함수');
assert(parserSrc.includes('XLSX') || parserSrc.includes('xlsx'), 'Excel: XLSX 라이브러리');
assert(parserSrc.includes('pdfjsLib'), 'PDF: pdf.js 라이브러리');
assert(parserSrc.includes('.xls') || parserSrc.includes('.xlsx') || parserSrc.includes("=== 'xls'") || parserSrc.includes("=== 'xlsx'"), 'Excel 확장자 체크');
assert(parserSrc.includes('.pdf') || parserSrc.includes("=== 'pdf'"), 'PDF 확장자 체크');

// ── Test 7: parseFile 라우터 ─────────────────────────────────────
console.log('\n[Test 7] parseFile 라우터');
assert(parserSrc.includes('async function parseFile'), 'parseFile 함수');
assert(parserSrc.includes("file.name.toLowerCase()") || parserSrc.includes("file.name.split('.')"), '파일명 확인');
assert(parserSrc.includes("endsWith('.pdf')") || parserSrc.includes("'.pdf'") || parserSrc.includes("=== 'pdf'"), 'PDF 분기');
assert(parserSrc.includes("endsWith('.csv')") || parserSrc.includes("'.csv'") || parserSrc.includes("=== 'csv'"), 'CSV 분기');
assert(
  parserSrc.includes("endsWith('.xls')") || parserSrc.includes("endsWith('.xlsx')") || parserSrc.includes("'.xls'") || parserSrc.includes("=== 'xls'"),
  'Excel 분기'
);

// ── Test 8: localStorage 연동 ────────────────────────────────────
console.log('\n[Test 8] localStorage 연동');
assert(parserSrc.includes('function saveMonthlyData'), 'saveMonthlyData 함수');
assert(parserSrc.includes('function loadMonthlyData'), 'loadMonthlyData 함수');
assert(parserSrc.includes('function deleteMonthlyData'), 'deleteMonthlyData 함수');
assert(parserSrc.includes('function listSavedMonths'), 'listSavedMonths 함수');
assert(parserSrc.includes('localStorage.setItem') || parserSrc.includes('localStorage.getItem'), 'localStorage 사용');
assert(parserSrc.includes('PAYSLIP_KEY') || parserSrc.includes('payslip_'), '명세서 저장 키 패턴');

// ── Test 9: 프로필 자동 반영 + compareWithApp ────────────────────
console.log('\n[Test 9] 프로필 자동 반영 + 앱 비교');
assert(parserSrc.includes('PAYSLIP_TO_PROFILE_MAP'), 'PAYSLIP_TO_PROFILE_MAP 매핑 테이블');
assert(parserSrc.includes("'조정급': 'adjustPay'"), '조정급 → adjustPay 매핑');
assert(parserSrc.includes("'직책수당': 'positionPay'"), '직책수당 → positionPay 매핑');
assert(parserSrc.includes('function applyStableItemsToProfile'), 'applyStableItemsToProfile 함수');
assert(parserSrc.includes('function compareWithApp'), 'compareWithApp 함수');
assert(parserSrc.includes('통상임금 합계'), 'compareWithApp: 통상임금 합계 비교');

// ── Test 10: G5 Google 권한 설명 다이얼로그 ─────────────────────
console.log('\n[Test 10] G5 Google 권한 설명 다이얼로그');
assert(indexHtml.includes('id="googlePermissionDialog"'), '#googlePermissionDialog dialog 요소');
assert(indexHtml.includes('Google 연결 시 이런 권한을 요청해요'), '다이얼로그 제목');
assert(indexHtml.includes('Google Drive 앱 폴더'), 'Drive 권한 설명');
assert(indexHtml.includes('Google Calendar'), 'Calendar 권한 설명');
assert(indexHtml.includes('로그인 없이도 모든 기능을 사용할 수 있어요'), '선택적 연결 안내');
assert(indexHtml.includes('id="googlePermDialogConfirm"'), '연결하기 버튼');
assert(indexHtml.includes('id="googlePermDialogCancel"'), '나중에 버튼');
assert(indexHtml.includes('window.GoogleAuth.signIn()') || indexHtml.includes('GoogleAuth.signIn'), '확인 → GoogleAuth.signIn() 호출');

// G5 다이얼로그가 Google 버튼 클릭 전에 표시되어야 함
assert(indexHtml.includes("getElementById('googlePermissionDialog')"), '다이얼로그 제어 JS');
assert(indexHtml.includes('dlg.showModal') || indexHtml.includes('.showModal()') || indexHtml.includes('classList'), '다이얼로그 표시 방식');

console.log(`\n=== Phase 38 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
