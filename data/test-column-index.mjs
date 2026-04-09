/**
 * 열 인덱스 기반 파싱 테스트
 * x좌표 매칭 대신 배열 순서(몇 번째 아이템인지)로 이름↔금액 매칭
 */
import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDF_PATH = './data/2602 salary.pdf';

// ── PDF 텍스트 추출 (기존 salary-parser.js와 동일) ──
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

  // 행 그룹핑 (ROW_TOL=5)
  const rawRows = [];
  let tmp = [rawItems[0]];
  for (let i = 1; i < rawItems.length; i++) {
    if (Math.abs(rawItems[i].y - tmp[0].y) > 5) { rawRows.push(tmp); tmp = []; }
    tmp.push(rawItems[i]);
  }
  if (tmp.length) rawRows.push(tmp);

  // 글자 병합 (WORD_GAP=8)
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

// ── 가비지 행 판별 ──
function isGarbageRow(row) {
  if (row.length === 0) return true;
  const totalLen = row.reduce((s, it) => s + it.str.replace(/\s/g, '').length, 0);
  return totalLen <= 3;
}

// ── 금액 행 판별 ──
function isAmountRow(row) {
  if (row.length === 0) return false;
  const nums = row.filter(it => /^[\d,.]+$/.test(it.str));
  return nums.length >= 1 && nums.length >= row.length * 0.4;
}

// ── 숫자 파싱 ──
function parseAmt(s) {
  if (typeof s !== 'string') return 0;
  return parseInt(s.replace(/[,.\s]/g, ''), 10) || 0;
}

// ── 합계 라벨 (이것만 제외하면 나머지는 모두 급여/공제 항목) ──
const SUMMARY_RE = /급여총액|공제총액|실지급액|총지급액|총공제액|차인지급액/;

// ── 비항목 라벨 (근무시간 통계 등) ──
const STATS_RE = /총근로시간|시간외근무시간|야간근무시간|통상근로시간|휴일근무시간|야간근로시간|주휴시간|통상야근시간|유급휴일|무급생휴일|무급생휴공제|지급연차|사용연차|발생연차|근로일수|대체근무가산횟수|야간근무가산횟수|명절근무시간|대체근무통상야근시간|법정공휴일/;

// ── 열 인덱스 기반 매칭 ──
function extractByColumnIndex(nameRows, amtRows) {
  const items = [];
  const seen = new Set();

  const limit = Math.min(nameRows.length, amtRows.length);
  for (let r = 0; r < limit; r++) {
    const names = nameRows[r]; // x순 정렬됨
    const amts = amtRows[r];   // x순 정렬됨

    // 금액 아이템만 순서대로 추출
    const numericAmts = amts
      .filter(it => /^[\d,]+$/.test(it.str) && it.str.replace(/,/g, '').length >= 3)
      .map(it => parseAmt(it.str));

    // 이름행에서 유효한 항목만 (합계·통계 제외)
    let amtIdx = 0;
    names.forEach(nameItem => {
      const name = nameItem.str.trim();
      if (SUMMARY_RE.test(name)) return; // 합계 라벨 스킵
      if (STATS_RE.test(name)) return;   // 통계 라벨 스킵
      if (seen.has(name)) return;
      if (name.length <= 1) return; // 단일 문자 스킵 ("내","역" 등)

      seen.add(name);

      if (amtIdx < numericAmts.length && numericAmts[amtIdx] > 0) {
        items.push({ name, amount: numericAmts[amtIdx] });
      }
      amtIdx++;
    });
  }
  return items;
}

// ── 메인 ──
async function main() {
  console.log('=== 열 인덱스 기반 파싱 테스트 ===\n');

  const rows = await extractRows(PDF_PATH);
  console.log(`총 ${rows.length}행 추출\n`);

  // 행 목록 출력
  rows.forEach((r, i) => {
    const tag = isGarbageRow(r) ? ' [GARBAGE]' : isAmountRow(r) ? ' [AMT]' : ' [NAME]';
    console.log(`  [${String(i).padStart(2)}]${tag} ${r.map(it => it.str).join(' | ')}`);
  });
  console.log('');

  // 앵커 찾기
  const salaryAnchor = rows.findIndex(r => r.some(it => /기준기본급|기본기준급/.test(it.str)));
  const deductionAnchor = rows.findIndex(r => r.some(it => /^소득세$/.test(it.str)));
  console.log(`앵커: 지급=${salaryAnchor}, 공제=${deductionAnchor}\n`);

  // 지급 섹션: salaryAnchor ~ deductionAnchor
  const salaryRange = rows.slice(salaryAnchor, deductionAnchor > 0 ? deductionAnchor : rows.length);
  const salNameRows = [];
  const salAmtRows = [];
  salaryRange.forEach(r => {
    if (isGarbageRow(r)) return;
    if (isAmountRow(r)) salAmtRows.push(r);
    else salNameRows.push(r);
  });

  // 이름행이 금액행보다 많으면 작은 행 병합
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

  console.log(`지급 섹션: 이름행 ${salNameRows.length}, 금액행 ${salAmtRows.length}`);

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

  console.log(`공제 섹션: 이름행 ${dedNameRows.length}, 금액행 ${dedAmtRows.length}`);

  const deductionItems = extractByColumnIndex(dedNameRows, dedAmtRows);

  // 총액 추출 (행 단위 regex)
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

  // 총액이 같은 행에 없는 경우: 가장 큰 금액 = 급여총액으로 추정
  if (!grossPay) {
    const allSalAmts = salAmtRows.flat()
      .filter(it => /^[\d,]+$/.test(it.str))
      .map(it => parseAmt(it.str))
      .sort((a, b) => b - a);
    if (allSalAmts.length > 0) grossPay = allSalAmts[0];
  }
  if (!totalDeduction) {
    const allDedAmts = dedAmtRows.flat()
      .filter(it => /^[\d,]+$/.test(it.str))
      .map(it => parseAmt(it.str))
      .sort((a, b) => b - a);
    if (allDedAmts.length > 0) totalDeduction = allDedAmts[0];
  }
  if (!netPay) netPay = grossPay - totalDeduction;

  // ── 결과 출력 ──
  console.log('\n=== 결과 ===\n');

  console.log(`지급항목 (${salaryItems.length}건):`);
  let salSum = 0;
  salaryItems.forEach(i => {
    console.log(`  ${i.name.padEnd(24)} ${i.amount.toLocaleString().padStart(12)}원`);
    salSum += i.amount;
  });
  console.log(`  ${'─'.repeat(36)}`);
  console.log(`  ${'항목 합계'.padEnd(24)} ${salSum.toLocaleString().padStart(12)}원`);
  console.log(`  ${'급여총액 (추출)'.padEnd(24)} ${grossPay.toLocaleString().padStart(12)}원`);
  console.log(`  ${Math.abs(salSum - grossPay) <= 50000 ? '✅ 차이: ' + (salSum - grossPay).toLocaleString() + '원' : '❌ 불일치: ' + (salSum - grossPay).toLocaleString() + '원'}`);
  console.log('');

  console.log(`공제항목 (${deductionItems.length}건):`);
  let dedSum = 0;
  deductionItems.forEach(i => {
    console.log(`  ${i.name.padEnd(24)} ${i.amount.toLocaleString().padStart(12)}원`);
    dedSum += i.amount;
  });
  console.log(`  ${'─'.repeat(36)}`);
  console.log(`  ${'항목 합계'.padEnd(24)} ${dedSum.toLocaleString().padStart(12)}원`);
  console.log(`  ${'공제총액 (추출)'.padEnd(24)} ${totalDeduction.toLocaleString().padStart(12)}원`);
  console.log(`  ${Math.abs(dedSum - totalDeduction) <= 50000 ? '✅ 차이: ' + (dedSum - totalDeduction).toLocaleString() + '원' : '❌ 불일치: ' + (dedSum - totalDeduction).toLocaleString() + '원'}`);
  console.log('');

  console.log('총액:');
  console.log(`  급여총액: ${grossPay.toLocaleString()}원`);
  console.log(`  공제총액: ${totalDeduction.toLocaleString()}원`);
  console.log(`  실지급액: ${netPay.toLocaleString()}원`);
  console.log(`  급여-공제: ${(grossPay - totalDeduction).toLocaleString()} ${grossPay - totalDeduction === netPay ? '✅ 일치' : '❌'}`);
}

main().catch(console.error);
