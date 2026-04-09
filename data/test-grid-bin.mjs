/**
 * 열 그리드 빈(bin) 매핑 테스트
 * 이름행 x좌표로 열 경계를 정의 → 금액이 어느 열에 속하는지 매핑
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
const STATS_RE = /총근로시간|시간외근무시간|야간근무시간|통상근로시간|휴일근무시간|야간근로시간|주휴시간|통상야근시간|유급휴일|무급생휴일|무급생휴공제|지급연차|사용연차|발생연차|근로일수|대체근무가산횟수|야간근무가산횟수|명절근무시간|대체근무통상야근시간|법정공휴일|지급연차갯수|시간외근무시간야간근무가산횟수|대체근무가산횟수/;

// ── 열 그리드 빈 매핑 ──
// 이름행의 x좌표로 열 경계를 정의하고, 금액을 해당 열에 매핑
function buildColumnBins(nameRow) {
  // 각 이름 아이템의 x 중심점을 기준으로 열 경계 설정
  const bins = nameRow.map((item, i) => {
    const xCenter = item.x + item.w / 2;
    // 열 경계: 이전 열의 끝과 다음 열의 시작 사이 중간점
    const xStart = i === 0 ? 0 : (nameRow[i - 1].x + nameRow[i - 1].w + item.x) / 2;
    const xEnd = i === nameRow.length - 1 ? 9999 : (item.x + item.w + nameRow[i + 1].x) / 2;
    return { col: i, name: item.str.trim(), xStart, xEnd, xCenter };
  });
  return bins;
}

function findColumnForAmount(bins, amtItem) {
  const amtCenter = amtItem.x + amtItem.w / 2;
  for (const bin of bins) {
    if (amtCenter >= bin.xStart && amtCenter < bin.xEnd) {
      return bin;
    }
  }
  // fallback: 가장 가까운 열
  let best = null, bestDist = Infinity;
  for (const bin of bins) {
    const dist = Math.abs(amtCenter - bin.xCenter);
    if (dist < bestDist) { bestDist = dist; best = bin; }
  }
  return best;
}

function extractByGridBin(nameRows, amtRows) {
  const items = [];
  const seen = new Set();

  const limit = Math.min(nameRows.length, amtRows.length);
  for (let r = 0; r < limit; r++) {
    const names = nameRows[r];
    const amts = amtRows[r];

    // 이름행으로 열 그리드 정의
    const bins = buildColumnBins(names);

    // 금액행에서 숫자 아이템을 열에 매핑
    const colAmounts = new Map(); // col -> amount
    amts.forEach(amtItem => {
      if (!/^[\d,.]+$/.test(amtItem.str)) return; // "내","역" 등 제외
      const bin = findColumnForAmount(bins, amtItem);
      if (bin) {
        colAmounts.set(bin.col, parseAmt(amtItem.str));
      }
    });

    // 각 열의 이름 ↔ 금액 매칭
    bins.forEach(bin => {
      const name = bin.name;
      if (SUMMARY_RE.test(name)) return;
      if (STATS_RE.test(name)) return;
      if (seen.has(name)) return;
      if (name.length <= 1) return;
      seen.add(name);

      const amount = colAmounts.get(bin.col) || 0;
      items.push({ name, amount, col: bin.col, row: r });
    });
  }
  return items;
}

async function main() {
  console.log('=== 열 그리드 빈(bin) 매핑 테스트 ===\n');

  const rows = await extractRows(PDF_PATH);

  const salaryAnchor = rows.findIndex(r => r.some(it => /기준기본급|기본기준급/.test(it.str)));
  const deductionAnchor = rows.findIndex(r => r.some(it => /^소득세$/.test(it.str)));

  // ── 지급 섹션 ──
  const salaryRange = rows.slice(salaryAnchor, deductionAnchor > 0 ? deductionAnchor : rows.length);
  const salNameRows = [];
  const salAmtRows = [];
  salaryRange.forEach(r => {
    if (isGarbageRow(r)) return;
    if (isAmountRow(r)) salAmtRows.push(r);
    else salNameRows.push(r);
  });

  // 소규모 이름행 병합
  if (salNameRows.length > salAmtRows.length) {
    const merged = [];
    for (let i = 0; i < salNameRows.length; i++) {
      if (salNameRows[i].length <= 2 && merged.length > 0) {
        merged[merged.length - 1] = merged[merged.length - 1].concat(salNameRows[i]);
        merged[merged.length - 1].sort((a, b) => a.x - b.x);
      } else {
        merged.push([...salNameRows[i]]);
      }
    }
    salNameRows.length = 0;
    merged.forEach(r => salNameRows.push(r));
  }

  console.log(`지급: 이름행 ${salNameRows.length}, 금액행 ${salAmtRows.length}`);
  salNameRows.forEach((r, i) => {
    console.log(`  이름[${i}] (${r.length}개): ${r.map(it => it.str).join(' | ')}`);
  });
  salAmtRows.forEach((r, i) => {
    console.log(`  금액[${i}] (${r.length}개): ${r.map(it => it.str).join(' | ')}`);
  });
  console.log('');

  const salaryItems = extractByGridBin(salNameRows, salAmtRows);

  // ── 공제 섹션 ──
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
        merged[merged.length - 1].sort((a, b) => a.x - b.x);
      } else {
        merged.push([...dedNameRows[i]]);
      }
    }
    dedNameRows.length = 0;
    merged.forEach(r => dedNameRows.push(r));
  }

  console.log(`공제: 이름행 ${dedNameRows.length}, 금액행 ${dedAmtRows.length}`);
  console.log('');

  const deductionItems = extractByGridBin(dedNameRows, dedAmtRows);

  // ── 총액: 급여총액/공제총액/실지급액은 그리드 마지막 열에 있음 ──
  // 이름행에서 "급여총액", "공제총액", "실지급액" 위치를 찾고 같은 열의 금액 추출
  let grossPay = 0, totalDeduction = 0, netPay = 0;

  for (let r = 0; r < Math.min(salNameRows.length, salAmtRows.length); r++) {
    const bins = buildColumnBins(salNameRows[r]);
    const amts = salAmtRows[r];

    bins.forEach(bin => {
      if (/급여총액/.test(bin.name)) {
        amts.forEach(amtItem => {
          if (!/^[\d,]+$/.test(amtItem.str)) return;
          const matched = findColumnForAmount(bins, amtItem);
          if (matched && matched.col === bin.col) {
            grossPay = parseAmt(amtItem.str);
          }
        });
      }
      if (/공제총액/.test(bin.name)) {
        amts.forEach(amtItem => {
          if (!/^[\d,]+$/.test(amtItem.str)) return;
          const matched = findColumnForAmount(bins, amtItem);
          if (matched && matched.col === bin.col) {
            totalDeduction = parseAmt(amtItem.str);
          }
        });
      }
      if (/실지급액/.test(bin.name)) {
        amts.forEach(amtItem => {
          if (!/^[\d,]+$/.test(amtItem.str)) return;
          const matched = findColumnForAmount(bins, amtItem);
          if (matched && matched.col === bin.col) {
            netPay = parseAmt(amtItem.str);
          }
        });
      }
    });
  }

  // ── 결과 ──
  console.log('=== 결과 ===\n');

  const salNonZero = salaryItems.filter(i => i.amount > 0);
  console.log(`지급항목 (${salNonZero.length}건):`);
  let salSum = 0;
  salNonZero.forEach(i => {
    console.log(`  ${i.name.padEnd(24)} ${i.amount.toLocaleString().padStart(12)}원  (행${i.row} 열${i.col})`);
    salSum += i.amount;
  });
  console.log(`  ${'─'.repeat(48)}`);
  console.log(`  ${'항목 합계'.padEnd(24)} ${salSum.toLocaleString().padStart(12)}원`);
  console.log(`  ${'급여총액 (추출)'.padEnd(24)} ${grossPay.toLocaleString().padStart(12)}원`);
  const salDiff = salSum - grossPay;
  console.log(`  ${Math.abs(salDiff) <= 50000 ? '✅' : '❌'} 차이: ${salDiff.toLocaleString()}원`);

  console.log('');
  const dedNonZero = deductionItems.filter(i => i.amount > 0);
  console.log(`공제항목 (${dedNonZero.length}건):`);
  let dedSum = 0;
  dedNonZero.forEach(i => {
    console.log(`  ${i.name.padEnd(24)} ${i.amount.toLocaleString().padStart(12)}원  (행${i.row} 열${i.col})`);
    dedSum += i.amount;
  });
  console.log(`  ${'─'.repeat(48)}`);
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
