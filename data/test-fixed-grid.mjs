/**
 * SNUH 고정 그리드 파서 테스트
 * salary-parser.js의 parsePDF 로직을 Node.js로 포팅하여 전 픽스처 검증
 */
import { readFileSync } from 'fs';
import { getDocument } from '../node_modules/pdfjs-dist/legacy/build/pdf.mjs';

// ── 상수 (salary-parser.js에서 이관) ──
const GRID_STATS_NAMES = new Set([
  '총근로시간','시간외근무시간','야간근무시간','통상근로시간',
  '휴일근무시간','야간근로시간','주휴시간','통상야근시간',
  '유급휴일','무급생휴일','지급연차','사용연차','발생연차',
  '근로일수','대체근무가산횟수','야간근무가산횟수','명절근무시간',
  '대체근무통상야근시간','법정공휴일','지급연차갯수',
]);
const GRID_SUMMARY_RE = /급여총액|공제총액|실지급액|총지급액|총공제액|차인지급액|지급계|공제계/;

const SALARY_PATTERNS = [
  /기본기준급|기준기본급|기본급/, /근속가산기본급|근속가산/,
  /능력급/, /상여금|정기상여/, /특별상여금/, /가계지원비/,
  /정근수당|근무수당/, /명절지원비|명절휴가비|명절수당/, /의업수당|의료수당/,
  /진료수당/, /임상연구비|연구활동비/, /연구실습비/,
  /연구보조비/, /의학연구비/, /진료비보조/,
  /교통보조비|교통비/, /급식보조비|식대보조비|중식보조비|식비/, /업무보조비/,
  /진료기여수당\(협진\)/, /진료기여수당\(토요진료\)/, /진료기여수당/, /보직교수기여수당/,
  /성과급|인센티브/, /기타수당|제수당/, /조정급|조정수당/, /직책수당|직무수당|보직수당/,
  /선택진료수당/, /별정수당\(직무\)/, /승급호봉분/,
  /연구장려수당|연구수당/, /경력인정수당/, /장기근속수당/, /진료지원수당/,
  /의학연구지원금/, /원외근무수당/,
  /시간외수당|시간외근무수당/, /야간근무가산|야간수당/, /야간근무가산금/,
  /당직비|숙직비/, /기타지급\d?/, /대체근무가산금/, /휴일수당|휴일근무수당/, /주치의수당/,
  /대체근무 통상야근수당/, /별정수당\(약제부\)/, /군복무수당/, /간호간병특별수당/,
  /통상야간/, /산전후보전급여/, /육아휴직수당/, /연차수당|연차보상비/,
  /가족수당/, /연차보전수당/, /법정공휴일수당/, /자격수당/,
  /학술수당/, /학비보조/, /포상금/, /성과연봉/, /격려금/,
  /육아기근로시간단축/, /무급난임휴가/, /무급생휴공제/,
  /무급가족돌봄휴가/, /자기계발별정수당/, /별정수당5/
];
const DEDUCTION_PATTERNS = [
  /소득세/, /주민세|지방소득세/, /농특세|농어촌특별세/,
  /국민건강|건강보험/, /장기요양|장기요양보험/, /국민연금|연금보험/, /고용보험/,
  /교원장기급여|장기저축급여/, /사학연금부담금/, /사학연금대여상환금/,
  /장학지원금공제|장학회비/, /노동조합비|조합비/, /후원회비|후원금/,
  /주차료|주차비/, /상조회비/, /마을금고상환|금고상환/, /기숙사비/,
  /병원발전기금|발전기금/, /식대공제|식비공제/, /기타공제\d?/,
  /의사협회비/, /무급가족돌봄휴가/, /경조회비/,
  /소득세\(정산\)/, /주민세\(정산\)/, /국민건강\(정산\)/, /장기요양\(정산\)/,
  /국민연금\(정산\)/, /고용보험\(정산\)/,
];

// ── SNUH 고정 그리드 ──
const SNUH_COL_CENTERS = [95, 157, 219, 281, 343, 412, 474, 536, 598, 660, 725];
function findNearestSNUHCol(x) {
  let best = 0, bestD = Infinity;
  SNUH_COL_CENTERS.forEach((c, i) => { const d = Math.abs(x - c); if (d < bestD) { bestD = d; best = i; } });
  return best;
}
const SNUH_GRID_MAP = [
  ['기준기본급',null,null,null,null,'급식보조비',null,null,null,null,null],
  ['근속가산기본급','명절지원비',null,null,null,'교통보조비',null,null,null,null,null],
  ['능력급',null,null,null,'경력인정수당',null,null,null,null,null,'가족수당'],
  ['상여금',null,null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,'업무보조비',null,null,'무급가족돌봄휴가',null,null],
  ['진료기여수당',null,null,null,null,null,null,'명절수당',null,null,null],
];

function parseAmount(v) {
  const n = parseInt(String(v).replace(/,/g, ''), 10);
  return isNaN(n) ? 0 : n;
}
function isAmountRow(row) {
  const nums = row.filter(it => /^-?[\d,.]+$/.test(it.str) && it.str.replace(/[-,.]/g, '').length >= 1);
  return nums.length >= 1 && nums.length >= row.length * 0.4;
}
function isGarbageRow(row) {
  if (!row.length) return true;
  return row.reduce((s, it) => s + it.str.replace(/\s/g, '').length, 0) <= 3;
}

// ── PDF 텍스트 추출 ──
async function extractRows(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const rawItems = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const offset = (p - 1) * vp.height;
    content.items.forEach(it => {
      if (!it.str || !it.str.trim()) return;
      rawItems.push({ str: it.str.trim(), x: it.transform[4], y: offset + (vp.height - it.transform[5]), w: it.width || 0 });
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
  // 1-pass: 인접 글자 병합
  return rawRows.map(row => {
    row.sort((a, b) => a.x - b.x);
    const m = []; let c = { ...row[0] };
    for (let i = 1; i < row.length; i++) {
      const g = row[i].x - (c.x + c.w);
      if (g < 8) { c.str += row[i].str; c.w = (row[i].x + row[i].w) - c.x; }
      else { m.push(c); c = { ...row[i] }; }
    }
    m.push(c); return m;
  });
}

// ── globalGrid 빌드 + 열 탐색 ──
function buildGlobalGrid(firstNameRow) {
  return firstNameRow.map((item, i, arr) => ({
    col: i,
    xStart: i === 0 ? 0 : (arr[i-1].x + arr[i-1].w + item.x) / 2,
    xEnd: i === arr.length-1 ? 9999 : (item.x + item.w + arr[i+1].x) / 2,
    xCenter: item.x + item.w / 2,
  }));
}
function findGlobalCol(grid, x) {
  for (const b of grid) if (x >= b.xStart && x < b.xEnd) return b.col;
  let best = 0, bestD = Infinity;
  grid.forEach(b => { const d = Math.abs(x - b.xCenter); if (d < bestD) { bestD = d; best = b.col; } });
  return best;
}

// ── 고정 그리드 추출 ──
function extractBySNUHFixedGrid(rows, startRow, endRow) {
  const allAmtRows = [];
  for (let i = startRow; i < endRow && i < rows.length; i++) {
    if (!isGarbageRow(rows[i]) && isAmountRow(rows[i])) allAmtRows.push(rows[i]);
  }
  allAmtRows.sort((a, b) => (a[0]?.y || 0) - (b[0]?.y || 0));
  const items = [], seen = new Set();
  allAmtRows.forEach((amtRow, ri) => {
    if (ri >= SNUH_GRID_MAP.length) return;
    const rowMap = SNUH_GRID_MAP[ri];
    amtRow.forEach(it => {
      if (!/^-?[\d,.]+$/.test(it.str)) return;
      const col = findNearestSNUHCol(it.x + it.w / 2);
      const name = rowMap[col];
      if (!name || GRID_STATS_NAMES.has(name) || seen.has(name)) return;
      const amount = parseAmount(it.str);
      if (amount === 0) return;
      items.push({ name, amount }); seen.add(name);
    });
  });
  return items;
}

// ── globalGrid 기반 추출 ──
function extractByGlobalGrid(grid, nameRows, amtRows) {
  const items = [], seen = new Set();
  const limit = Math.min(nameRows.length, amtRows.length);
  for (let r = 0; r < limit; r++) {
    const nameByCol = new Map();
    nameRows[r].forEach(it => {
      const name = it.str.trim();
      if (name.length <= 1) return;
      nameByCol.set(findGlobalCol(grid, it.x + it.w / 2), name);
    });
    const amtByCol = new Map();
    amtRows[r].forEach(it => {
      if (!/^-?[\d,.]+$/.test(it.str)) return;
      amtByCol.set(findGlobalCol(grid, it.x + it.w / 2), parseAmount(it.str));
    });
    for (const [col, name] of nameByCol) {
      if (GRID_SUMMARY_RE.test(name) || GRID_STATS_NAMES.has(name) || seen.has(name)) continue;
      seen.add(name);
      const amount = amtByCol.get(col) || 0;
      items.push({ name, amount });
    }
  }
  return items;
}

function separateAndMerge(rows, startRow, endRow) {
  const nameRows = [], amtRows = [];
  for (let i = startRow; i < endRow && i < rows.length; i++) {
    if (isGarbageRow(rows[i])) continue;
    if (isAmountRow(rows[i])) amtRows.push(rows[i]);
    else nameRows.push(rows[i]);
  }
  return { nameRows, amtRows };
}

// ── 총액 추출 ──
function extractSummary(rows, salNameRows, salAmtRows, grid) {
  let grossPay = 0, totalDeduction = 0, netPay = 0;
  if (!grid || !salNameRows.length || !salAmtRows.length) return { grossPay, totalDeduction, netPay };
  const targets = [
    { re: /급여총액/, set: v => { if (!grossPay) grossPay = v; } },
    { re: /공제총액/, set: v => { if (!totalDeduction) totalDeduction = v; } },
    { re: /실지급액/, set: v => { if (!netPay) netPay = v; } },
  ];
  const limit = Math.min(salNameRows.length, salAmtRows.length);
  for (let r = 0; r < limit; r++) {
    salNameRows[r].forEach(nit => {
      const nc = findGlobalCol(grid, nit.x + nit.w / 2);
      targets.forEach(t => {
        if (!t.re.test(nit.str)) return;
        salAmtRows[r].forEach(ait => {
          if (!/^-?[\d,]+$/.test(ait.str)) return;
          if (findGlobalCol(grid, ait.x + ait.w / 2) === nc) t.set(parseAmount(ait.str));
        });
      });
    });
  }
  return { grossPay, totalDeduction, netPay };
}

// ── 공제 추출 (globalGrid) ──
function extractDeductions(rows, deductionAnchorRow, globalGrid) {
  if (deductionAnchorRow < 0 || !globalGrid) return [];
  let endRow = rows.length;
  let nonAmtCount = 0, foundFirstAmt = false;
  for (let i = deductionAnchorRow; i < rows.length; i++) {
    if (!isGarbageRow(rows[i]) && isAmountRow(rows[i])) { foundFirstAmt = true; nonAmtCount = 0; }
    else if (foundFirstAmt && !isGarbageRow(rows[i])) { nonAmtCount++; if (nonAmtCount >= 2) { endRow = i - 1; break; } }
  }
  const { nameRows, amtRows } = separateAndMerge(rows, deductionAnchorRow, endRow);
  return extractByGlobalGrid(globalGrid, nameRows, amtRows).filter(i => i.amount !== 0);
}

// ── 메타데이터/직원정보 추출 ──
function extractMeta(rows) {
  const fullText = rows.map(r => r.map(it => it.str).join(' ')).join('\n');
  const metadata = {}, employeeInfo = {};
  const pm = [/(\d{4})년도?\s*(\d{1,2})월\s*분/, /(\d{4})년\s*(\d{1,2})월\s*급여/];
  for (const p of pm) { const m = fullText.match(p); if (m) { metadata.payPeriod = m[1]+'년 '+m[2]+'월분'; break; } }
  const dm = fullText.match(/(?:급여지급일|지급일)\s*:?\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/);
  if (dm) metadata.payDate = dm[1].replace(/\./g, '-');
  const tm = fullText.match(/급여명세서\s*\(([^)]+)\)/);
  metadata.payslipType = tm ? tm[1] : '급여';
  const infoPats = [[/개인번호\s+(\d+)/, 'employeeNumber'],[/성\s*명\s+(\S+)/,'name'],[/직\s*종\s+(\S+)/,'jobType'],[/소\s*속\s+(\S+)/,'department']];
  infoPats.forEach(([re, key]) => { const m = fullText.match(re); if (m) employeeInfo[key] = m[1]; });
  return { metadata, employeeInfo };
}

// ── 메인 파싱 함수 ──
async function parsePDF(pdfPath) {
  const rows = await extractRows(pdfPath);
  const { metadata, employeeInfo } = extractMeta(rows);

  const salaryAnchorRow = rows.findIndex(r => r.some(it => /기본기준급|기준기본급/.test(it.str)));
  const deductionAnchorRow = rows.findIndex(r => r.some(it => /^소득세$/.test(it.str)));

  const globalGrid = salaryAnchorRow >= 0 ? buildGlobalGrid(rows[salaryAnchorRow]) : null;
  const salaryEnd = deductionAnchorRow >= 0 ? deductionAnchorRow : rows.length;

  let salaryItems = [];
  let salNameRows = [], salAmtRows = [];
  if (salaryAnchorRow >= 0 && globalGrid) {
    const s = separateAndMerge(rows, salaryAnchorRow, salaryEnd);
    salNameRows = s.nameRows; salAmtRows = s.amtRows;
    salaryItems = extractByGlobalGrid(globalGrid, salNameRows, salAmtRows).filter(i => i.amount !== 0);
  }

  const { grossPay: summaryGross, totalDeduction: summaryDed, netPay: summaryNet } =
    extractSummary(rows, salNameRows, salAmtRows, globalGrid);

  let grossPay = summaryGross;
  let calcGross = salaryItems.reduce((s, i) => s + i.amount, 0);

  // ── 고정 그리드 fallback ──
  if (grossPay > 0 && Math.abs(calcGross - grossPay) > 50000) {
    const fixedItems = extractBySNUHFixedGrid(rows, salaryAnchorRow, salaryEnd);
    const fixedGross = fixedItems.reduce((s, i) => s + i.amount, 0);
    if (Math.abs(fixedGross - grossPay) < Math.abs(calcGross - grossPay)) {
      salaryItems = fixedItems.filter(i => i.amount !== 0);
      calcGross = fixedGross;
    }
  }
  if (grossPay === 0) grossPay = calcGross;

  const deductionItems = extractDeductions(rows, deductionAnchorRow, globalGrid);
  let totalDeduction = summaryDed || deductionItems.reduce((s, i) => s + i.amount, 0);
  let netPay = summaryNet || grossPay - totalDeduction;

  return { employeeInfo, metadata, salaryItems, deductionItems, summary: { grossPay, totalDeduction, netPay } };
}

// ── 픽스처 ──
const FIXTURES = [
  {
    id: '2512_급여', file: '2512 일반직 급여.pdf',
    salaryItems: { '기준기본급':2907500,'근속가산기본급':214080,'능력급':1075700,'상여금':157400,'진료기여수당':934970,'급식보조비':150000,'교통보조비':150000,'경력인정수당':301700,'업무보조비':80000,'무급가족돌봄휴가':-214630 },
    deductionItems: { '소득세':335690,'주민세':33560,'국민건강':236800,'장기요양':30660,'국민연금':60000,'병원발전기금':67110,'소득세(정산)':433570,'사학연금부담금':619220,'장기요양(정산)':342940 },
    summary: { grossPay:5756720, totalDeduction:2219550, netPay:3537170 },
  },
  {
    id: '2512_소급', file: '2512 일반직 소급.pdf',
    salaryItems: { '기준기본급':1774000,'근속가산기본급':124280,'경력인정수당':316610,'시간외수당':12860,'무급가족돌봄휴가':-44970 },
    deductionItems: { '소득세':344130,'주민세':34410,'사학연금부담금':28360 },
    summary: { grossPay:2182780, totalDeduction:406900, netPay:1775880 },
  },
  {
    id: '2601_급여', file: '2601 일반직 급여.pdf',
    salaryItems: { '기준기본급':3085900,'근속가산기본급':226570,'능력급':1075700,'상여금':157400,'급식보조비':150000,'교통보조비':150000,'경력인정수당':301700,'가족수당':35000,'업무보조비':80000,'무급가족돌봄휴가':-222130,'명절수당':40000 },
    deductionItems: { '소득세':474260,'주민세':47420,'국민건강':236800,'장기요양':30660,'국민연금':60000,'병원발전기금':69960,'주차료':24000,'사학연금부담금':619220,'장기요양(정산)':343160,'식대공제':51000 },
    summary: { grossPay:5080140, totalDeduction:2390050, netPay:2690090 },
  },
  {
    id: '2601_연차수당', file: '2601 일반직연차수당.pdf',
    salaryItems: { '연차수당':3124740 },
    deductionItems: { '소득세':298850,'주민세':29880 },
    summary: { grossPay:3124740, totalDeduction:328730, netPay:2796010 },
  },
  {
    id: '2602_급여', file: '2602 salary.pdf',
    salaryItems: {
      '기준기본급':3085900,'근속가산기본급':226570,'명절지원비':1731660,
      '급식보조비':150000,'교통보조비':150000,
      '능력급':1075700,'경력인정수당':301700,'가족수당':35000,
      '상여금':157400,'업무보조비':80000,
      '진료기여수당':934970,'명절수당':40000,
    },
    summary: { grossPay:7968900 },
  },
];

// ── 검증 ──
async function runTests() {
  let passed = 0, failed = 0;
  for (const fix of FIXTURES) {
    const path = `./data/${fix.file}`;
    process.stdout.write(`\n[${fix.id}] ${fix.file}... `);
    let result;
    try {
      result = await parsePDF(path);
    } catch (e) {
      console.log(`\n  ❌ PARSE ERROR: ${e.message}`);
      failed++; continue;
    }
    const failures = [];
    const salMap = Object.fromEntries((result.salaryItems || []).map(i => [i.name, i.amount]));
    for (const [name, amt] of Object.entries(fix.salaryItems || {})) {
      if (salMap[name] === undefined) failures.push(`지급 누락: "${name}" (기대 ${amt.toLocaleString()})`);
      else if (Math.abs(salMap[name] - amt) > 1) failures.push(`지급 불일치: "${name}" = ${salMap[name]} (기대 ${amt})`);
    }
    if (fix.deductionItems) {
      const dedMap = Object.fromEntries((result.deductionItems || []).map(i => [i.name, i.amount]));
      for (const [name, amt] of Object.entries(fix.deductionItems)) {
        if (dedMap[name] === undefined) failures.push(`공제 누락: "${name}" (기대 ${amt.toLocaleString()})`);
        else if (Math.abs(dedMap[name] - amt) > 1) failures.push(`공제 불일치: "${name}" = ${dedMap[name]} (기대 ${amt})`);
      }
    }
    if (fix.summary) {
      const s = result.summary;
      if (fix.summary.grossPay && Math.abs(s.grossPay - fix.summary.grossPay) > 1)
        failures.push(`총지급 불일치: ${s.grossPay} (기대 ${fix.summary.grossPay})`);
      if (fix.summary.totalDeduction && Math.abs(s.totalDeduction - fix.summary.totalDeduction) > 1)
        failures.push(`총공제 불일치: ${s.totalDeduction} (기대 ${fix.summary.totalDeduction})`);
      if (fix.summary.netPay && Math.abs(s.netPay - fix.summary.netPay) > 1)
        failures.push(`실지급 불일치: ${s.netPay} (기대 ${fix.summary.netPay})`);
    }
    if (failures.length === 0) {
      console.log(`✅ PASS`);
      console.log(`  지급 ${result.salaryItems.length}건 합계=${result.summary.grossPay.toLocaleString()}, 공제 ${result.deductionItems.length}건`);
      passed++;
    } else {
      console.log(`❌ FAIL (${failures.length}건)`);
      failures.forEach(f => console.log(`  - ${f}`));
      console.log(`  파싱된 지급: ${JSON.stringify(salMap)}`);
      failed++;
    }
  }
  console.log(`\n══ 결과: ${passed}/${passed+failed} 통과 ══\n`);
}

runTests().catch(e => { console.error(e); process.exit(1); });
