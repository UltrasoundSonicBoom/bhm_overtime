/**
 * 글로벌 그리드 빈 매핑 테스트
 * 첫 번째 이름행(11열 풀그리드)으로 고정 열 경계를 정의
 * 모든 행의 이름/금액을 이 글로벌 그리드에 매핑
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
      rawItems.push({ str: item.str.trim(), x: item.transform[4], y: offset + (vp.height - item.transform[5]), w: item.width || 0 });
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
  return rawRows.map(row => {
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
}

function isGarbageRow(row) {
  if (row.length === 0) return true;
  return row.reduce((s, it) => s + it.str.replace(/\s/g, '').length, 0) <= 3;
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

// 합계 라벨만 제외 (개별 항목이 아닌 것)
const SUMMARY_RE = /급여총액|공제총액|실지급액|총지급액|총공제액|차인지급액/;

// 근무시간 통계: 정확한 이름만 매칭 (부분 매칭 금지)
const STATS_NAMES = new Set([
  '총근로시간', '시간외근무시간', '야간근무시간', '통상근로시간',
  '휴일근무시간', '야간근로시간', '주휴시간', '통상야근시간',
  '유급휴일', '무급생휴일', '지급연차', '사용연차', '발생연차',
  '근로일수', '대체근무가산횟수', '야간근무가산횟수', '명절근무시간',
  '대체근무통상야근시간', '법정공휴일', '지급연차갯수', '무급생휴공제',
  '시간외근무시간야간근무가산횟수', '대체근무가산횟수', '휴일근무시간',
  '발생연차', '사용연차', '무급생휴일', '통상야근시간', '명절근무시간',
]);

// ── 글로벌 그리드: 첫 이름행(11열)에서 열 경계 정의 ──
function buildGlobalGrid(firstNameRow) {
  const bins = [];
  for (let i = 0; i < firstNameRow.length; i++) {
    const item = firstNameRow[i];
    const xStart = i === 0 ? 0 :
      (firstNameRow[i - 1].x + firstNameRow[i - 1].w + item.x) / 2;
    const xEnd = i === firstNameRow.length - 1 ? 9999 :
      (item.x + item.w + firstNameRow[i + 1].x) / 2;
    bins.push({
      col: i,
      xStart,
      xEnd,
      xCenter: item.x + item.w / 2,
    });
  }
  return bins;
}

function findGlobalCol(grid, x) {
  for (const bin of grid) {
    if (x >= bin.xStart && x < bin.xEnd) return bin.col;
  }
  // fallback: closest
  let best = 0, bestDist = Infinity;
  for (const bin of grid) {
    const dist = Math.abs(x - bin.xCenter);
    if (dist < bestDist) { bestDist = dist; best = bin.col; }
  }
  return best;
}

function extractByGlobalGrid(grid, nameRows, amtRows) {
  const items = [];
  const seen = new Set();
  const limit = Math.min(nameRows.length, amtRows.length);

  for (let r = 0; r < limit; r++) {
    const names = nameRows[r];
    const amts = amtRows[r];

    // 이름 → 글로벌 열 매핑 (단일문자 건너뛰기, 긴 이름이 덮어쓰기)
    const nameByCol = new Map();
    names.forEach(it => {
      const name = it.str.trim();
      if (name.length <= 1) return; // "제","내","역" 등 세로 레이블 무시
      const col = findGlobalCol(grid, it.x + it.w / 2);
      nameByCol.set(col, name); // 덮어쓰기 허용
    });

    // 금액 → 글로벌 열 매핑
    const amtByCol = new Map();
    amts.forEach(it => {
      if (!/^[\d,.]+$/.test(it.str)) return;
      const col = findGlobalCol(grid, it.x + it.w / 2);
      amtByCol.set(col, parseAmt(it.str));
    });

    // 매칭
    for (const [col, name] of nameByCol) {
      if (SUMMARY_RE.test(name)) continue;
      if (STATS_NAMES.has(name)) continue;
      if (seen.has(name)) continue;
      if (name.length <= 1) continue;
      seen.add(name);

      const amount = amtByCol.get(col) || 0;
      items.push({ name, amount, col, row: r });
    }
  }
  return items;
}

async function main() {
  console.log('=== 글로벌 그리드 빈 매핑 테스트 ===\n');

  const rows = await extractRows(PDF_PATH);
  const salaryAnchor = rows.findIndex(r => r.some(it => /기준기본급|기본기준급/.test(it.str)));
  const deductionAnchor = rows.findIndex(r => r.some(it => /^소득세$/.test(it.str)));

  // 글로벌 그리드: 첫 이름행(항상 11열)으로 정의
  const globalGrid = buildGlobalGrid(rows[salaryAnchor]);
  console.log('글로벌 그리드 (11열):');
  globalGrid.forEach(b => {
    const name = rows[salaryAnchor][b.col]?.str || '?';
    console.log(`  열${b.col}: ${Math.round(b.xStart)}~${Math.round(b.xEnd)} "${name}"`);
  });
  console.log('');

  // ── 지급 섹션 ──
  const salaryRange = rows.slice(salaryAnchor, deductionAnchor);
  const salNameRows = [], salAmtRows = [];
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

  console.log(`지급: 이름행 ${salNameRows.length}, 금액행 ${salAmtRows.length}\n`);

  // 디버그: 각 행의 글로벌 열 매핑
  for (let r = 0; r < Math.min(salNameRows.length, salAmtRows.length); r++) {
    console.log(`  행${r} 이름→열: ${salNameRows[r].map(it => {
      const col = findGlobalCol(globalGrid, it.x + it.w/2);
      return `[${col}]${it.str}`;
    }).join(' | ')}`);
    const numAmts = salAmtRows[r].filter(it => /^[\d,.]+$/.test(it.str));
    console.log(`  행${r} 금액→열: ${numAmts.map(it => {
      const col = findGlobalCol(globalGrid, it.x + it.w/2);
      return `[${col}]${it.str}`;
    }).join(' | ')}`);
    console.log('');
  }

  const salaryItems = extractByGlobalGrid(globalGrid, salNameRows, salAmtRows);

  // ── 공제 섹션 ──
  // 공제도 동일한 글로벌 그리드 사용 (같은 11열 구조)
  console.log('공제도 동일 글로벌 그리드 사용\n');

  let deductionEnd = rows.length;
  let foundAmt = false, nonAmtCnt = 0;
  for (let i = deductionAnchor; i < rows.length; i++) {
    if (!isGarbageRow(rows[i]) && isAmountRow(rows[i])) { foundAmt = true; nonAmtCnt = 0; }
    else if (foundAmt && !isGarbageRow(rows[i])) { nonAmtCnt++; if (nonAmtCnt >= 2) { deductionEnd = i - 1; break; } }
  }

  const dedRange = rows.slice(deductionAnchor, deductionEnd);
  const dedNameRows = [], dedAmtRows = [];
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

  console.log(`공제: 이름행 ${dedNameRows.length}, 금액행 ${dedAmtRows.length}\n`);

  // 디버그: 공제 행별 글로벌 열 매핑
  for (let r = 0; r < Math.min(dedNameRows.length, dedAmtRows.length); r++) {
    console.log(`  공제 행${r} 이름→열: ${dedNameRows[r].map(it => {
      const col = findGlobalCol(globalGrid, it.x + it.w/2);
      return `[${col}]${it.str}`;
    }).join(' | ')}`);
    const numAmts = dedAmtRows[r].filter(it => /^[\d,.]+$/.test(it.str));
    console.log(`  공제 행${r} 금액→열: ${numAmts.map(it => {
      const col = findGlobalCol(globalGrid, it.x + it.w/2);
      return `[${col}]${it.str}`;
    }).join(' | ')}`);
    console.log('');
  }

  const deductionItems = extractByGlobalGrid(globalGrid, dedNameRows, dedAmtRows);

  // ── 총액 추출: 글로벌 그리드로 정확한 열 매핑 ──
  let grossPay = 0, totalDeduction = 0, netPay = 0;

  for (let r = 0; r < Math.min(salNameRows.length, salAmtRows.length); r++) {
    salNameRows[r].forEach(nameItem => {
      const col = findGlobalCol(globalGrid, nameItem.x + nameItem.w / 2);
      if (/급여총액/.test(nameItem.str)) {
        salAmtRows[r].forEach(amtItem => {
          if (!/^[\d,]+$/.test(amtItem.str)) return;
          const amtCol = findGlobalCol(globalGrid, amtItem.x + amtItem.w / 2);
          if (amtCol === col) grossPay = parseAmt(amtItem.str);
        });
      }
      if (/공제총액/.test(nameItem.str)) {
        salAmtRows[r].forEach(amtItem => {
          if (!/^[\d,]+$/.test(amtItem.str)) return;
          const amtCol = findGlobalCol(globalGrid, amtItem.x + amtItem.w / 2);
          if (amtCol === col) totalDeduction = parseAmt(amtItem.str);
        });
      }
      if (/실지급액/.test(nameItem.str)) {
        salAmtRows[r].forEach(amtItem => {
          if (!/^[\d,]+$/.test(amtItem.str)) return;
          const amtCol = findGlobalCol(globalGrid, amtItem.x + amtItem.w / 2);
          if (amtCol === col) netPay = parseAmt(amtItem.str);
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
    console.log(`  ${i.name.padEnd(28)} ${i.amount.toLocaleString().padStart(12)}원  (행${i.row} 열${i.col})`);
    salSum += i.amount;
  });
  console.log(`  ${'─'.repeat(52)}`);
  console.log(`  ${'항목 합계'.padEnd(28)} ${salSum.toLocaleString().padStart(12)}원`);
  console.log(`  ${'급여총액 (추출)'.padEnd(28)} ${grossPay.toLocaleString().padStart(12)}원`);
  const salDiff = salSum - grossPay;
  console.log(`  ${Math.abs(salDiff) <= 1 ? '✅ 완벽 일치!' : Math.abs(salDiff) <= 50000 ? '✅ 근사 일치' : '❌ 불일치'} 차이: ${salDiff.toLocaleString()}원`);

  console.log('');
  const dedNonZero = deductionItems.filter(i => i.amount > 0);
  console.log(`공제항목 (${dedNonZero.length}건):`);
  let dedSum = 0;
  dedNonZero.forEach(i => {
    console.log(`  ${i.name.padEnd(28)} ${i.amount.toLocaleString().padStart(12)}원  (행${i.row} 열${i.col})`);
    dedSum += i.amount;
  });
  console.log(`  ${'─'.repeat(52)}`);
  console.log(`  ${'항목 합계'.padEnd(28)} ${dedSum.toLocaleString().padStart(12)}원`);
  console.log(`  ${'공제총액 (추출)'.padEnd(28)} ${totalDeduction.toLocaleString().padStart(12)}원`);
  const dedDiff = dedSum - totalDeduction;
  console.log(`  ${Math.abs(dedDiff) <= 1 ? '✅ 완벽 일치!' : Math.abs(dedDiff) <= 50000 ? '✅ 근사 일치' : '❌ 불일치'} 차이: ${dedDiff.toLocaleString()}원`);

  console.log('\n총액:');
  console.log(`  급여총액: ${grossPay.toLocaleString()}원`);
  console.log(`  공제총액: ${totalDeduction.toLocaleString()}원`);
  console.log(`  실지급액: ${netPay.toLocaleString()}원`);
  if (!netPay) netPay = grossPay - totalDeduction;
  console.log(`  급여-공제: ${(grossPay - totalDeduction).toLocaleString()} ${grossPay - totalDeduction === netPay ? '✅ 일치' : '❌'}`);
}

main().catch(console.error);
