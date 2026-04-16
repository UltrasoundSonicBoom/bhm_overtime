import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const parserModule = await import('../salary-parser.js');
const parser = parserModule.default || parserModule.SALARY_PARSER || parserModule;
const fixtures = JSON.parse(
  fs.readFileSync(new URL('./payroll-parser-fixtures.json', import.meta.url), 'utf8')
);

assert.equal(typeof parser.__debug?.parsePdfBytes, 'function', 'expected __debug.parsePdfBytes export');
assert.equal(typeof parser.__debug?.extractMetaFromRowsV2, 'function', 'expected __debug.extractMetaFromRowsV2 export');
assert.equal(typeof parser.__debug?.lookupVariableKeyByLabel, 'function', 'expected __debug.lookupVariableKeyByLabel export');
assert.equal(parser.__debug.lookupVariableKeyByLabel('급식 보조비'), 'meal_subsidy', 'alias lookup matches spaced meal subsidy');
assert.equal(parser.__debug.lookupVariableKeyByLabel('급 식 보 조 비'), 'meal_subsidy', 'alias lookup matches fragmented meal subsidy');
assert.equal(parser.__debug.lookupVariableKeyByLabel('별정수당 (직무)'), 'special_duty_pay', 'alias lookup matches spaced paren label');
assert.equal(parser.__debug.lookupVariableKeyByLabel('소 득 세 ( 정 산 )'), 'income_tax_settlement', 'alias lookup matches fragmented settlement label');

const browserStyleRows = [
  { id: 0, page: 1, text: '2 0 2 5년 도 1 2월 분 급 여 명 세 서', items: [] },
  { id: 1, page: 1, text: '급 여 지 급 일 : 2 0 2 5-1 2-1 7', items: [] },
  { id: 2, page: 1, text: '개 인 번 호 2 0 8 4 2 성 명 김 계 환 직 종 보 건 직 급 여 연 차 S 1 - 0 2 소 속 핵 의 학 과 입 사 년 월 2 0 0 6-0 7-0 5', items: [] },
  { id: 3, page: 1, text: '기 준 기 본 급', items: [] },
  { id: 4, page: 1, text: '소 득 세', items: [] },
  { id: 5, page: 2, text: '구 분 항 목 계 산 방 법 지 급 액', items: [] },
];

const browserBlocks = parser.__debug.detectBlocksV2(browserStyleRows);
assert.equal(browserBlocks.earningsStart, 3, 'browser-style earnings block detection');
assert.equal(browserBlocks.deductionsStart, 4, 'browser-style deductions block detection');
assert.equal(browserBlocks.detailStart, 5, 'browser-style detail block detection');

const browserMeta = parser.__debug.extractMetaFromRowsV2(browserStyleRows);
assert.equal(browserMeta.metadata.payPeriod, '2025년 12월분', 'browser-style payPeriod extraction');
assert.equal(browserMeta.metadata.payDate, '2025-12-17', 'browser-style payDate extraction');
assert.equal(browserMeta.metadata.payslipType, '급여', 'browser-style payslipType extraction');
assert.equal(browserMeta.employeeInfo.employeeNumber, '20842', 'browser-style employeeNumber extraction');
assert.equal(browserMeta.employeeInfo.name, '김계환', 'browser-style name extraction');
assert.equal(browserMeta.employeeInfo.jobType, '보건직', 'browser-style jobType extraction');
assert.equal(browserMeta.employeeInfo.department, '핵의학과', 'browser-style department extraction');
assert.equal(browserMeta.employeeInfo.hireDate, '2006-07-05', 'browser-style hireDate extraction');
assert.equal(browserMeta.employeeInfo.payGrade, 'S1-02', 'browser-style payGrade extraction');

const browserSpacedNumericMatrix = parser.__debug.buildMatrixV2(
  [
    {
      id: 0,
      page: 1,
      text: '기 준 기 본 급 급 식 보 조 비',
      items: [
        { text: '기 준 기 본 급', x0: 0, x1: 40, y0: 0, y1: 10 },
        { text: '급 식 보 조 비', x0: 100, x1: 140, y0: 0, y1: 10 },
      ],
    },
    {
      id: 1,
      page: 1,
      text: '2,9 0 7,5 0 0 1 5 0,0 0 0',
      items: [
        { text: '2,9 0 7,5 0 0', x0: 0, x1: 40, y0: 10, y1: 20 },
        { text: '1 5 0,0 0 0', x0: 100, x1: 140, y0: 10, y1: 20 },
      ],
    },
  ],
  [['기준기본급', '급식보조비']]
);
assert.equal(browserSpacedNumericMatrix.rowModel.headerRows.length, 1, 'spaced numeric browser row keeps one header row');
assert.equal(browserSpacedNumericMatrix.rowModel.valueRows.length, 1, 'spaced numeric browser row becomes value row');
assert.equal(browserSpacedNumericMatrix.valueMatrix[0][0], '2,9 0 7,5 0 0', 'spaced numeric browser amount maps to first column');
assert.equal(browserSpacedNumericMatrix.valueMatrix[0][1], '1 5 0,0 0 0', 'spaced numeric browser amount maps to second column');

const spacedDetailLines = parser.__debug.extractDetailLinesV2([
  {
    id: 0,
    page: 2,
    text: '구 분 항 목 계 산 방 법 지 급 액',
    items: [
      { text: '구 분', x0: 0, x1: 20, y0: 0, y1: 10 },
      { text: '항 목', x0: 30, x1: 50, y0: 0, y1: 10 },
      { text: '계 산 방 법', x0: 60, x1: 120, y0: 0, y1: 10 },
      { text: '지 급 액', x0: 130, x1: 170, y0: 0, y1: 10 },
    ],
  },
  {
    id: 1,
    page: 2,
    text: '지 급 연 차 수 당 (6,6 6 3,9 8 0 / 2 6.1 2 5 X 1 2.2 5) 3,1 2 4,7 4 0',
    items: [
      { text: '지 급', x0: 0, x1: 20, y0: 10, y1: 20 },
      { text: '연 차 수 당 (6,6 6 3,9 8 0 / 2 6.1 2 5 X 1 2.2 5)', x0: 30, x1: 240, y0: 10, y1: 20 },
      { text: '3,1 2 4,7 4 0', x0: 250, x1: 300, y0: 10, y1: 20 },
    ],
  },
]);
assert.equal(spacedDetailLines.length, 1, 'spaced browser detail row is extracted');
assert.equal(spacedDetailLines[0].section, '지급', 'spaced browser detail row keeps section');
assert.equal(spacedDetailLines[0].itemName, '연차수당', 'spaced browser detail row keeps item name');
assert.equal(spacedDetailLines[0].amount, 3124740, 'spaced browser detail row keeps amount');

function toMap(items, key = 'originalName', value = 'value') {
  return Object.fromEntries((items || []).map(item => [item[key] || item.name, item[value] ?? item.amount]));
}

let failed = 0;
for (const fixture of fixtures) {
  const bytes = new Uint8Array(fs.readFileSync(fixture.filePath));
  const result = await parser.__debug.parsePdfBytes(bytes, { pdfjsLib: { getDocument } });

  try {
    assert.equal(result.metadata.payPeriod, fixture.metadata.payPeriod, `${fixture.id} payPeriod`);
    assert.equal(result.metadata.payslipType, fixture.metadata.payslipType, `${fixture.id} payslipType`);
    assert.equal(result.summary.grossPay, fixture.summary.grossPay, `${fixture.id} grossPay`);
    assert.equal(result.summary.totalDeduction, fixture.summary.totalDeduction, `${fixture.id} totalDeduction`);
    assert.equal(result.summary.netPay, fixture.summary.netPay, `${fixture.id} netPay`);

    const earnings = toMap(result.earnings || result.salaryItems, 'originalName', 'value');
    assert.deepEqual(
      Object.keys(earnings).sort(),
      Object.keys(fixture.earnings).sort(),
      `${fixture.id} earnings keys`
    );
    for (const [name, expected] of Object.entries(fixture.earnings)) {
      assert.equal(earnings[name], expected, `${fixture.id} earning ${name}`);
    }

    const deductions = toMap(result.deductions || result.deductionItems, 'originalName', 'value');
    assert.deepEqual(
      Object.keys(deductions).sort(),
      Object.keys(fixture.deductions).sort(),
      `${fixture.id} deductions keys`
    );
    for (const [name, expected] of Object.entries(fixture.deductions)) {
      assert.equal(deductions[name], expected, `${fixture.id} deduction ${name}`);
    }

    const settlements = toMap(result.settlementItems || result.settlementAdjustmentItems, 'originalName', 'value');
    assert.deepEqual(
      Object.keys(settlements).sort(),
      Object.keys(fixture.settlementItems || {}).sort(),
      `${fixture.id} settlement keys`
    );
    for (const [name, expected] of Object.entries(fixture.settlementItems || {})) {
      assert.equal(settlements[name], expected, `${fixture.id} settlement ${name}`);
    }

    const workRecords = toMap(result.workRecords, 'originalName', 'value');
    for (const [name, expected] of Object.entries(fixture.workRecords)) {
      assert.equal(workRecords[name], expected, `${fixture.id} workRecord ${name}`);
    }

    const detailMap = new Map((result.detailLines || []).map(line => [line.itemName, line]));
    for (const line of fixture.detailLines) {
      const actual = detailMap.get(line.itemName);
      assert.equal(actual?.amount, line.amount, `${fixture.id} detail ${line.itemName}`);
      if (line.formulaText) {
        assert.equal(actual?.formulaText, line.formulaText, `${fixture.id} detail formula ${line.itemName}`);
      }
    }

    assert.ok(result.documentModel?.tables?.earnings?.headerMatrix?.length, `${fixture.id} earnings matrix exists`);
    assert.ok(result.documentModel?.tables?.deductions?.headerMatrix?.length, `${fixture.id} deductions matrix exists`);
    assert.ok(Array.isArray(result.documentModel?.blocks), `${fixture.id} document blocks exist`);

    assert.ok(Array.isArray(result.rawBlocks), `${fixture.id} rawBlocks exists`);
    console.log(`PASS ${fixture.id}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${fixture.id}: ${error.message}`);
  }
}

if (failed > 0) {
  console.error(`V2 parser regression failed: ${failed} fixture(s)`);
  process.exit(1);
}

console.log('All V2 parser fixtures passed');
