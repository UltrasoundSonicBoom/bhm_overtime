/**
 * 2-pass 그리드 기반 재병합 테스트
 * pass1: WORD_GAP=8 병합 → 그리드 빌드
 * pass2: 그리드 기반 재병합 (다른 열이면 gap < WORD_GAP이어도 분리)
 */
import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDF_PATH = './data/2602 salary.pdf';
const CHAR_GAP = 3;
const WORD_GAP = 8;

async function main() {
  const data = new Uint8Array(readFileSync(PDF_PATH));
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

  // ── Pass 1: WORD_GAP=8 병합 (그리드 빌드용) ──
  const rows1 = rawRows.map(row => {
    row.sort((a, b) => a.x - b.x);
    const merged = [];
    let cur = { ...row[0] };
    for (let i = 1; i < row.length; i++) {
      const gap = row[i].x - (cur.x + cur.w);
      if (gap < WORD_GAP) {
        cur.str += row[i].str;
        cur.w = (row[i].x + row[i].w) - cur.x;
      } else {
        merged.push(cur);
        cur = { ...row[i] };
      }
    }
    merged.push(cur);
    return merged;
  });

  // 앵커: 기준기본급 행
  const anchorIdx = rows1.findIndex(r => r.some(it => /기준기본급/.test(it.str)));
  if (anchorIdx < 0) { console.error('앵커 못 찾음'); return; }

  // 글로벌 그리드 빌드
  const firstRow = rows1[anchorIdx];
  const grid = firstRow.map((item, i, arr) => ({
    col: i,
    xStart: i === 0 ? 0 : (arr[i - 1].x + arr[i - 1].w + item.x) / 2,
    xEnd: i === arr.length - 1 ? 9999 : (item.x + item.w + arr[i + 1].x) / 2,
    xCenter: item.x + item.w / 2,
  }));

  function findCol(x) {
    for (const bin of grid) if (x >= bin.xStart && x < bin.xEnd) return bin.col;
    let best = 0, bestD = Infinity;
    for (const bin of grid) { const d = Math.abs(x - bin.xCenter); if (d < bestD) { bestD = d; best = bin.col; } }
    return best;
  }

  console.log('=== 글로벌 그리드 (11열) ===');
  grid.forEach(b => console.log(`  열${b.col}: ${Math.round(b.xStart)}~${Math.round(b.xEnd)} (center=${Math.round(b.xCenter)}) "${firstRow[b.col].str}"`));

  // ── Pass 2: 그리드 기반 재병합 ──
  const rows2 = rawRows.map(row => {
    row.sort((a, b) => a.x - b.x);
    const merged = [];
    let cur = { str: row[0].str, x: row[0].x, y: row[0].y, w: row[0].w };
    for (let i = 1; i < row.length; i++) {
      const gap = row[i].x - (cur.x + cur.w);
      const curCol = findCol(cur.x + cur.w / 2);
      const nextCol = findCol(row[i].x + row[i].w / 2);
      const bothWords = cur.w > 15 && row[i].w > 15;
      if (gap < WORD_GAP && (!bothWords || curCol === nextCol)) {
        cur.str += (gap > CHAR_GAP ? '' : '') + row[i].str;
        cur.w = (row[i].x + row[i].w) - cur.x;
      } else {
        merged.push(cur);
        cur = { str: row[i].str, x: row[i].x, y: row[i].y, w: row[i].w };
      }
    }
    merged.push(cur);
    return merged;
  });

  // Raw gap 진단
  console.log('\n=== Raw gaps: 법정공휴일 Row 25 ===');
  for (let ri = 0; ri < rawRows.length; ri++) {
    const has = rows1[ri].some(it => /법정|공휴일/.test(it.str));
    if (!has) continue;
    const row = rawRows[ri];
    console.log(`rawRow[${ri}] (${row.length}개):`);
    row.forEach((it, i) => {
      const gap = i > 0 ? (it.x - (row[i-1].x + row[i-1].w)).toFixed(1) : '-';
      const col = findCol(it.x + it.w / 2);
      console.log(`  [${i}] x=${it.x.toFixed(1)}~${(it.x+it.w).toFixed(1)} w=${it.w.toFixed(1)} gap=${gap} col=${col} "${it.str}"`);
    });
  }

  // 문제 행 비교: 법정공휴일수당 영역
  console.log('\n=== Pass 1 vs Pass 2: 법정공휴일수당 영역 ===\n');
  for (let ri = 0; ri < rows1.length; ri++) {
    const has = rows1[ri].some(it => /법정공휴일|자기계발|육아기/.test(it.str));
    if (!has) continue;
    console.log(`Row ${ri} — Pass 1 (${rows1[ri].length}개):`)
    rows1[ri].forEach((it, i) => console.log(`  [${i}] "${it.str}"`));
    console.log(`Row ${ri} — Pass 2 (${rows2[ri].length}개):`)
    rows2[ri].forEach((it, i) => console.log(`  [${i}] "${it.str}"`));
    console.log('');
  }
}

main().catch(console.error);
