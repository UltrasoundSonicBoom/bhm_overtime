/**
 * 열 인덱스 기반 파싱 v2: 0/0.0/0.00도 포함하여 11열 매칭
 */
import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDF_PATH = './data/2602 salary.pdf';

async function extractRows(path) {
  const data = new Uint8Array(readFileSync(path));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  const rawItems = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const offset = (p - 1) * vp.height;
    content.items.forEach(item => {
      if (!item.str || !item.str.trim()) return;
      rawItems.push({
        str: item.str.trim(),
        x: item.transform[4],
        y: offset + (vp.height - item.transform[5]),
        w: item.width || 0,
      });
    });
  }
  rawItems.sort((a, b) => a.y - b.y || a.x - b.x);

  const rawRows = [];
  let tmp = [rawItems[0]];
  for (let i = 1; i < rawItems.length; i++) {
    if (Math.abs(rawItems[i].y - tmp[0].y) > 5) { rawRows.push(tmp); tmp = []; }
    tmp.push(rawItems[i]);
  }
  if (tmp.length) rawRows.push(tmp);

  const rows = rawRows.map(row => {
    row.sort((a, b) => a.x - b.x);
    const m = [];
    let c = { ...row[0] };
    for (let i = 1; i < row.length; i++) {
      const gap = row[i].x - (c.x + c.w);
      if (gap < 8) { c.str += row[i].str; c.w = (row[i].x + row[i].w) - c.x; }
      else { m.push(c); c = { ...row[i] }; }
    }
    m.push(c);
    return m;
  });

  return rows;
}

function isGarbageRow(row) {
  if (row.length === 0) return true;
  const totalLen = row.reduce((s, it) => s + it.str.replace(/\s/g, '').length, 0);
  return totalLen <= 3;
}

// 핵심 변경: 0, 0.0, 0.00도 숫자로 인정
function isAmountRow(row) {
  if (row.length === 0) return false;
  const nums = row.filter(it => /^[\d,.]+$/.test(it.str));
  return nums.length >= 1 && nums.length >= row.length * 0.4;
}

function parseAmt(s) {
  if (typeof s !== 'string') return 0;
  return parseInt(s.replace(/[,.\s]/g, ''), 10) || 0;
}

const SUMMARY_RE = /급여총액|공제총액|실지급액|총지급액|총공제액|차인지급액/;
const STATS_RE = /총근로시간|시간외근무시간|야간근무시간|통상근로시간|휴일근무시간|야간근로시간|주휴시간|통상야근시간|유급휴일|무급생휴일|무급생휴공제|지급연차|사용연차|발생연차|근로일수|대체근무가산횟수|야간근무가산횟수|명절근무시간|대체근무통상야근시간|법정공휴일|지급연차갯수|야간근무가산횟수/;

// ── 핵심: 0값 포함 열 인덱스 매칭 ──
function extractByColumnIndex(nameRows, amtRows) {
  const items = [];
  const seen = new Set();

  const limit = Math.min(nameRows.length, amtRows.length);
  for (let r = 0; r < limit; r++) {
    const names = nameRows[r];
    const amts = amtRows[r];

    // 핵심 변경: 0, 0.0, 0.00 포함 — 모든 숫자 아이템 유지
    const numericAmts = amts
      .filter(it => /^[\d,.]+$/.test(it.str))
      .map(it => parseAmt(it.str));

    console.log(`    nameRow[${r}]: ${names.length}개 이름, amtRow[${r}]: ${numericAmts.length}개 금액`);

    // 이름 개수와 금액 개수가 같은지 확인
    if (names.length !== numericAmts.length) {
      console.log(`    ⚠️  개수 불일치! 이름=${names.length} vs 금액=${numericAmts.length}`);
    }

    let amtIdx = 0;
    names.forEach(nameItem => {
      const name = nameItem.str.trim();
      if (SUMMARY_RE.test(name)) { amtIdx++; return; }
      if (STATS_RE.test(name)) { amtIdx++; return; }
      if (seen.has(name)) return;
      if (name.length <= 1) return;

      seen.add(name);

      if (amtIdx < numericAmts.length) {
        const amt = numericAmts[amtIdx];
        // 0원 항목도 일단 매칭은 하되, 나중에 표시/계산에서 제외
        items.push({ name, amount: amt });
      }
      amtIdx++;
    });
  }
  return items;
}

async function main() {
  console.log('=== 열 인덱스 v2: 0값 포함 테스트 ===\n');

  const rows = await extractRows(PDF_PATH);

  // 먼저 각 행의 아이템 수와 내용을 상세히 출력
  console.log('--- 지급 섹션 상세 (행 2~18) ---\n');
  for (let i = 2; i <= 18; i++) {
    const r = rows[i];
    const tag = isGarbageRow(r) ? 'GARBAGE' : isAmountRow(r) ? 'AMT' : 'NAME';
    const numCount = r.filter(it => /^[\d,.]+$/.test(it.str)).length;
    console.log(`  [${i}] [${tag}] (${r.length}개, 숫자${numCount}개) ${r.map(it => it.str).join(' | ')}`);
  }

  console.log('\n--- 공제 섹션 상세 (행 19~33) ---\n');
  for (let i = 19; i <= 33; i++) {
    const r = rows[i];
    const tag = isGarbageRow(r) ? 'GARBAGE' : isAmountRow(r) ? 'AMT' : 'NAME';
    const numCount = r.filter(it => /^[\d,.]+$/.test(it.str)).length;
    console.log(`  [${i}] [${tag}] (${r.length}개, 숫자${numCount}개) ${r.map(it => it.str).join(' | ')}`);
  }

  // 앵커
  const salaryAnchor = rows.findIndex(r => r.some(it => /기준기본급|기본기준급/.test(it.str)));
  const deductionAnchor = rows.findIndex(r => r.some(it => /^소득세$/.test(it.str)));
  console.log(`\n앵커: 지급=${salaryAnchor}, 공제=${deductionAnchor}\n`);

  // 지급 섹션
  const salaryRange = rows.slice(salaryAnchor, deductionAnchor > 0 ? deductionAnchor : rows.length);
  const salNameRows = [];
  const salAmtRows = [];
  salaryRange.forEach(r => {
    if (isGarbageRow(r)) return;
    if (isAmountRow(r)) salAmtRows.push(r);
    else salNameRows.push(r);
  });

  // 이름행 병합
  if (salNameRows.length > salAmtRows.length) {
    const merged = [];
    for (let i = 0; i < salNameRows.length; i++) {
      if (salNameRows[i].length <= 2 && merged.length > 0) {
        merged[merged.length - 1] = merged[merged.length - 1].concat(salNameRows[i]);
      } else {
        merged.push([...salNameRows[i]]);
      }
    }
    salNameRows.length = 0;
    merged.forEach(r => salNameRows.push(r));
  }

  console.log(`지급: 이름행 ${salNameRows.length}, 금액행 ${salAmtRows.length}`);
  console.log('  이름행 아이템 수:', salNameRows.map(r => r.length).join(', '));
  console.log('  금액행 숫자 수:', salAmtRows.map(r => r.filter(it => /^[\d,.]+$/.test(it.str)).length).join(', '));
  console.log('');

  const salaryItems = extractByColumnIndex(salNameRows, salAmtRows);

  // 공제 섹션
  let deductionEnd = rows.length;
  let foundAmt = false, nonAmtCnt = 0;
  for (let i = deductionAnchor; i < rows.length; i++) {
    if (!isGarbageRow(rows[i]) && isAmountRow(rows[i])) { foundAmt = true; nonAmtCnt = 0; }
    else if (foundAmt && !isGarbageRow(rows[i])) { nonAmtCnt++; if (nonAmtCnt >= 2) { deductionEnd = i - 1; break; } }
  }

  const dedRange = rows.slice(deductionAnchor, deductionEnd);
  const dedNameRows = [];
  const dedAmtRows = [];
  dedRange.forEach(r => {
    if (isGarbageRow(r)) return;
    if (isAmountRow(r)) dedAmtRows.push(r);
    else dedNameRows.push(r);
  });

  if (dedNameRows.length > dedAmtRows.length) {
    const merged = [];
    for (let i = 0; i < dedNameRows.length; i++) {
      if (dedNameRows[i].length <= 2 && merged.length > 0) {
        merged[merged.length - 1] = merged[merged.length - 1].concat(dedNameRows[i]);
      } else {
        merged.push([...dedNameRows[i]]);
      }
    }
    dedNameRows.length = 0;
    merged.forEach(r => dedNameRows.push(r));
  }

  console.log(`\n공제: 이름행 ${dedNameRows.length}, 금액행 ${dedAmtRows.length}`);
  console.log('  이름행 아이템 수:', dedNameRows.map(r => r.length).join(', '));
  console.log('  금액행 숫자 수:', dedAmtRows.map(r => r.filter(it => /^[\d,.]+$/.test(it.str)).length).join(', '));
  console.log('');

  const deductionItems = extractByColumnIndex(dedNameRows, dedAmtRows);

  // 총액 추출
  let grossPay = 0, totalDeduction = 0, netPay = 0;
  rows.forEach(r => {
    const text = r.map(it => it.str).join(' ');
    const gm = text.match(/급여총액\s+([\d,]+)/);
    if (gm && !grossPay) grossPay = parseAmt(gm[1]);
    const dm = text.match(/공제총액\s+([\d,]+)/);
    if (dm && !totalDeduction) totalDeduction = parseAmt(dm[1]);
    const nm = text.match(/실지급액\s+([\d,]+)/);
    if (nm && !netPay) netPay = parseAmt(nm[1]);
  });

  // 결과
  console.log('\n=== 결과 ===\n');

  console.log(`지급항목 (${salaryItems.length}건, 0원 제외 ${salaryItems.filter(i => i.amount > 0).length}건):`);
  let salSum = 0;
  salaryItems.forEach(i => {
    const mark = i.amount === 0 ? ' [0]' : '';
    console.log(`  ${i.name.padEnd(24)} ${i.amount.toLocaleString().padStart(12)}원${mark}`);
    salSum += i.amount;
  });
  console.log(`  ${'─'.repeat(40)}`);
  console.log(`  ${'항목 합계'.padEnd(24)} ${salSum.toLocaleString().padStart(12)}원`);
  console.log(`  ${'급여총액 (추출)'.padEnd(24)} ${grossPay.toLocaleString().padStart(12)}원`);
  const salDiff = salSum - grossPay;
  console.log(`  ${Math.abs(salDiff) <= 50000 ? '✅' : '❌'} 차이: ${salDiff.toLocaleString()}원`);

  console.log('');
  console.log(`공제항목 (${deductionItems.length}건, 0원 제외 ${deductionItems.filter(i => i.amount > 0).length}건):`);
  let dedSum = 0;
  deductionItems.forEach(i => {
    const mark = i.amount === 0 ? ' [0]' : '';
    console.log(`  ${i.name.padEnd(24)} ${i.amount.toLocaleString().padStart(12)}원${mark}`);
    dedSum += i.amount;
  });
  console.log(`  ${'─'.repeat(40)}`);
  console.log(`  ${'항목 합계'.padEnd(24)} ${dedSum.toLocaleString().padStart(12)}원`);
  console.log(`  ${'공제총액 (추출)'.padEnd(24)} ${totalDeduction.toLocaleString().padStart(12)}원`);
  const dedDiff = dedSum - totalDeduction;
  console.log(`  ${Math.abs(dedDiff) <= 50000 ? '✅' : '❌'} 차이: ${dedDiff.toLocaleString()}원`);

  console.log('\n총액:');
  console.log(`  급여총액: ${grossPay.toLocaleString()}원`);
  console.log(`  공제총액: ${totalDeduction.toLocaleString()}원`);
  console.log(`  실지급액: ${netPay.toLocaleString()}원`);
  if (!netPay) netPay = grossPay - totalDeduction;
  console.log(`  급여-공제: ${(grossPay - totalDeduction).toLocaleString()} ${grossPay - totalDeduction === netPay ? '✅ 일치' : '❌'}`);
}

main().catch(console.error);
