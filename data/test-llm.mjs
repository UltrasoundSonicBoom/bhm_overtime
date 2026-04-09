import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import OpenAI from '../server/node_modules/openai/index.mjs';

const key = readFileSync('./server/.env','utf-8').match(/OPENAI_API_KEY="([^"]+)"/)?.[1];

// 1. PDF 텍스트 + 좌표 추출
const data = new Uint8Array(readFileSync('./data/2602 salary.pdf'));
const doc = await getDocument({ data, useSystemFonts: true }).promise;

const rawItems = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  content.items.forEach(item => {
    if (!item.str || !item.str.trim()) return;
    rawItems.push({
      str: item.str,
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
      w: Math.round(item.width || 0),
    });
  });
}
rawItems.sort((a, b) => b.y - a.y || a.x - b.x);

// 행 그룹핑
const rawRows = [];
let tmp = [rawItems[0]];
for (let i = 1; i < rawItems.length; i++) {
  if (Math.abs(rawItems[i].y - tmp[0].y) > 5) { rawRows.push(tmp); tmp = []; }
  tmp.push(rawItems[i]);
}
if (tmp.length) rawRows.push(tmp);

// 글자 병합
const rows = rawRows.map(row => {
  row.sort((a, b) => a.x - b.x);
  const m = [];
  let c = {...row[0]};
  for (let i = 1; i < row.length; i++) {
    const gap = row[i].x - (c.x + c.w);
    if (gap < 8) { c.str += row[i].str; c.w = (row[i].x + row[i].w) - c.x; }
    else { m.push(c); c = {...row[i]}; }
  }
  m.push(c);
  return m;
});

// 2. 구조화된 텍스트 (x좌표 포함)
let structured = '';
rows.forEach((r, i) => {
  structured += `Row${i}: ${r.map(it => `[${it.str}@x${it.x}]`).join(' ')}\n`;
});

console.log('텍스트 길이:', structured.length, '자');
console.log('');

// 3. LLM 호출
const client = new OpenAI.OpenAI({ apiKey: key });
const start = Date.now();

const resp = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  temperature: 0,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: `서울대학교병원 급여명세서 PDF 텍스트. 각 아이템은 [텍스트@x좌표] 형식.

구조:
- 이름 행들: 급여 항목명이 11열 그리드 (x좌표로 열 구분)
- 금액 행들: 같은 x좌표 위치에 해당 금액
- "지","급","역","내","공","제" 같은 단일문자 행은 세로 레이블이므로 무시
- 같은 x좌표의 이름과 금액을 페어링
- "급여총액","공제총액","실지급액"은 합계 (개별 항목 아님)
- 금액 0 항목 제외

JSON: {employeeInfo:{name,jobType,payGrade,department,hireDate}, payPeriod, salaryItems:[{name,amount}], deductionItems:[{name,amount}], grossPay, totalDeduction, netPay}` },
    { role: 'user', content: structured }
  ]
});

const elapsed = Date.now() - start;
const result = JSON.parse(resp.choices[0].message.content);
const usage = resp.usage;
const cost = (usage.prompt_tokens * 0.15 + usage.completion_tokens * 0.6) / 1000000;

console.log('=== LLM 파싱 결과 (좌표 포함) ===');
console.log(`소요: ${elapsed}ms | 토큰: ${usage.total_tokens} | 비용: $${cost.toFixed(6)}`);
console.log('');
console.log('직원정보:', JSON.stringify(result.employeeInfo));
console.log('기간:', result.payPeriod);
console.log('');

console.log(`지급항목 (${result.salaryItems.length}건):`);
let salSum = 0;
result.salaryItems.forEach(i => {
  console.log(`  ${i.name.padEnd(22)} ${String(i.amount.toLocaleString()).padStart(12)}원`);
  salSum += i.amount;
});
console.log(`  ${'─'.repeat(34)}`);
console.log(`  ${'항목 합계'.padEnd(22)} ${salSum.toLocaleString().padStart(12)}원`);
console.log(`  ${'급여총액(LLM)'.padEnd(22)} ${result.grossPay.toLocaleString().padStart(12)}원`);
console.log(`  ${salSum === result.grossPay ? '✅ 합계 일치' : '❌ 차이: ' + (salSum - result.grossPay)}`);
console.log('');

console.log(`공제항목 (${result.deductionItems.length}건):`);
let dedSum = 0;
result.deductionItems.forEach(i => {
  console.log(`  ${i.name.padEnd(22)} ${String(i.amount.toLocaleString()).padStart(12)}원`);
  dedSum += i.amount;
});
console.log(`  ${'─'.repeat(34)}`);
console.log(`  ${'항목 합계'.padEnd(22)} ${dedSum.toLocaleString().padStart(12)}원`);
console.log(`  ${'공제총액(LLM)'.padEnd(22)} ${result.totalDeduction.toLocaleString().padStart(12)}원`);
console.log(`  ${dedSum === result.totalDeduction ? '✅ 합계 일치' : '❌ 차이: ' + (dedSum - result.totalDeduction)}`);
console.log('');

console.log('총액 검증:');
console.log(`  급여총액: ${result.grossPay.toLocaleString()}원`);
console.log(`  공제총액: ${result.totalDeduction.toLocaleString()}원`);
console.log(`  실지급액: ${result.netPay.toLocaleString()}원`);
const calcNet = result.grossPay - result.totalDeduction;
console.log(`  급여-공제: ${calcNet.toLocaleString()} ${calcNet === result.netPay ? '✅ 일치' : '❌ 불일치 (차이:' + (calcNet - result.netPay) + ')'}`);
