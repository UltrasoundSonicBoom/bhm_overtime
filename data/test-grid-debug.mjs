/**
 * 그리드 빈 매핑 디버그: 각 행별 열 매핑 상세 출력
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

async function main() {
  const rows = await extractRows(PDF_PATH);
  const salaryAnchor = rows.findIndex(r => r.some(it => /기준기본급/.test(it.str)));
  const deductionAnchor = rows.findIndex(r => r.some(it => /^소득세$/.test(it.str)));

  // ── 지급 섹션 이름행/금액행 분리 ──
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

  console.log('=== 지급 섹션: 행별 x좌표 상세 ===\n');
  for (let r = 0; r < salNameRows.length; r++) {
    console.log(`  이름[${r}]:`);
    salNameRows[r].forEach((it, i) => {
      console.log(`    열${i}: x=${Math.round(it.x)}~${Math.round(it.x + it.w)} (center=${Math.round(it.x + it.w/2)}) "${it.str}"`);
    });
    if (r < salAmtRows.length) {
      console.log(`  금액[${r}]:`);
      salAmtRows[r].forEach((it, i) => {
        console.log(`    [${i}]: x=${Math.round(it.x)}~${Math.round(it.x + it.w)} (center=${Math.round(it.x + it.w/2)}) "${it.str}"`);
      });

      // 열 매핑 결과
      const bins = salNameRows[r].map((item, i) => {
        const xStart = i === 0 ? 0 : (salNameRows[r][i-1].x + salNameRows[r][i-1].w + item.x) / 2;
        const xEnd = i === salNameRows[r].length - 1 ? 9999 : (item.x + item.w + salNameRows[r][i+1].x) / 2;
        return { col: i, name: item.str.trim(), xStart: Math.round(xStart), xEnd: Math.round(xEnd), xCenter: Math.round(item.x + item.w/2) };
      });
      console.log(`  매핑 결과:`);
      salAmtRows[r].filter(it => /^[\d,.]+$/.test(it.str)).forEach(amtItem => {
        const amtCenter = amtItem.x + amtItem.w / 2;
        let matched = null;
        for (const bin of bins) {
          if (amtCenter >= bin.xStart && amtCenter < bin.xEnd) { matched = bin; break; }
        }
        if (!matched) {
          let bestDist = Infinity;
          for (const bin of bins) {
            const dist = Math.abs(amtCenter - bin.xCenter);
            if (dist < bestDist) { bestDist = dist; matched = bin; }
          }
        }
        console.log(`    ${amtItem.str} (x=${Math.round(amtItem.x)}~${Math.round(amtItem.x+amtItem.w)}, center=${Math.round(amtCenter)}) → 열${matched.col} "${matched.name}" (bin ${matched.xStart}~${matched.xEnd})`);
      });
    }
    console.log('');
  }

  // ── 공제 섹션 ──
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

  console.log('=== 공제 섹션: 행별 x좌표 상세 ===\n');
  for (let r = 0; r < dedNameRows.length; r++) {
    console.log(`  이름[${r}]:`);
    dedNameRows[r].forEach((it, i) => {
      console.log(`    열${i}: x=${Math.round(it.x)}~${Math.round(it.x + it.w)} (center=${Math.round(it.x + it.w/2)}) "${it.str}"`);
    });
    if (r < dedAmtRows.length) {
      console.log(`  금액[${r}]:`);
      dedAmtRows[r].forEach((it, i) => {
        console.log(`    [${i}]: x=${Math.round(it.x)}~${Math.round(it.x + it.w)} (center=${Math.round(it.x + it.w/2)}) "${it.str}"`);
      });

      const bins = dedNameRows[r].map((item, i) => {
        const xStart = i === 0 ? 0 : (dedNameRows[r][i-1].x + dedNameRows[r][i-1].w + item.x) / 2;
        const xEnd = i === dedNameRows[r].length - 1 ? 9999 : (item.x + item.w + dedNameRows[r][i+1].x) / 2;
        return { col: i, name: item.str.trim(), xStart: Math.round(xStart), xEnd: Math.round(xEnd), xCenter: Math.round(item.x + item.w/2) };
      });
      console.log(`  매핑 결과:`);
      dedAmtRows[r].filter(it => /^[\d,.]+$/.test(it.str)).forEach(amtItem => {
        const amtCenter = amtItem.x + amtItem.w / 2;
        let matched = null;
        for (const bin of bins) {
          if (amtCenter >= bin.xStart && amtCenter < bin.xEnd) { matched = bin; break; }
        }
        if (!matched) {
          let bestDist = Infinity;
          for (const bin of bins) {
            const dist = Math.abs(amtCenter - bin.xCenter);
            if (dist < bestDist) { bestDist = dist; matched = bin; }
          }
        }
        console.log(`    ${amtItem.str} (center=${Math.round(amtCenter)}) → 열${matched.col} "${matched.name}" (bin ${matched.xStart}~${matched.xEnd})`);
      });
    }
    console.log('');
  }
}

main().catch(console.error);
