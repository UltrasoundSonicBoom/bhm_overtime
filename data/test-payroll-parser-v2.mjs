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
    for (const [name, expected] of Object.entries(fixture.earnings)) {
      assert.equal(earnings[name], expected, `${fixture.id} earning ${name}`);
    }

    const deductions = toMap(result.deductions || result.deductionItems, 'originalName', 'value');
    for (const [name, expected] of Object.entries(fixture.deductions)) {
      assert.equal(deductions[name], expected, `${fixture.id} deduction ${name}`);
    }

    const settlements = toMap(result.settlementItems || result.settlementAdjustmentItems, 'originalName', 'value');
    for (const [name, expected] of Object.entries(fixture.settlementItems || {})) {
      assert.equal(settlements[name], expected, `${fixture.id} settlement ${name}`);
    }

    const workRecords = toMap(result.workRecords, 'originalName', 'value');
    for (const [name, expected] of Object.entries(fixture.workRecords)) {
      assert.equal(workRecords[name], expected, `${fixture.id} workRecord ${name}`);
    }

    const detailMap = toMap(result.detailLines, 'itemName', 'amount');
    for (const line of fixture.detailLines) {
      assert.equal(detailMap[line.itemName], line.amount, `${fixture.id} detail ${line.itemName}`);
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
