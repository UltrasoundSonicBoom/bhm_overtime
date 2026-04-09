import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(readFileSync('./data/2602 salary.pdf'));
const doc = await getDocument({ data, useSystemFonts: true }).promise;
const rawItems = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  content.items.forEach(item => {
    if (!item.str || !item.str.trim()) return;
    const y = (p-1)*vp.height + (vp.height - item.transform[5]);
    rawItems.push({ str: item.str.trim(), x: item.transform[4], y, w: item.width || 0 });
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

// Find rows in x=440~640 range with text items
console.log('=== 병합 전 raw 아이템: 법정공휴일수당 영역 ===\n');
for (let ri = 0; ri < rawRows.length; ri++) {
  const row = rawRows[ri];
  row.sort((a, b) => a.x - b.x);
  const hasTarget = row.some(it => /법정|자기계발|별정|육아기/.test(it.str));
  if (!hasTarget) continue;
  console.log(`rawRow[${ri}] (${row.length}개 아이템):`);
  row.forEach((it, i) => {
    const gap = i > 0 ? (it.x - (row[i-1].x + row[i-1].w)).toFixed(1) : '-';
    console.log(`  [${i}] x=${it.x.toFixed(1)}~${(it.x+it.w).toFixed(1)} w=${it.w.toFixed(1)} gap=${gap} "${it.str}"`);
  });
  console.log('');
}
