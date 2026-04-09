/**
 * PDF 파싱 비교 테스트: regex vs LLM (gpt-4o-mini)
 */
import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import OpenAI from '/Users/momo/Documents/GitHub/bhm_overtime/server/node_modules/openai/index.mjs';

const PDF_PATH = '/Users/momo/Documents/GitHub/bhm_overtime/data/2602 salary.pdf';
const API_KEY = readFileSync('/Users/momo/Documents/GitHub/bhm_overtime/server/.env', 'utf-8')
  .match(/OPENAI_API_KEY="([^"]+)"/)?.[1];

// ── 1. PDF 텍스트 추출 (pdf.js, 좌표 포함) ──
async function extractPdfText(path) {
  const data = new Uint8Array(readFileSync(path));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  const rawItems = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    content.items.forEach(item => {
      if (!item.str || item.str.trim() === '') return;
      rawItems.push({
        str: item.str,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        w: Math.round(item.width || 0),
      });
    });
  }

  // Y좌표 내림차순 (PDF는 아래→위), 같은 y면 x 오름차순
  rawItems.sort((a, b) => b.y - a.y || a.x - b.x);

  // 행 그룹핑 (ROW_TOL=5)
  const rawRows = [];
  let tmpRow = [rawItems[0]];
  for (let i = 1; i < rawItems.length; i++) {
    if (Math.abs(rawItems[i].y - tmpRow[0].y) > 5) {
      rawRows.push(tmpRow);
      tmpRow = [];
    }
    tmpRow.push(rawItems[i]);
  }
  if (tmpRow.length > 0) rawRows.push(tmpRow);

  // 글자 병합 (WORD_GAP=8)
  const WORD_GAP = 8;
  const rows = rawRows.map(row => {
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

  // 전체 텍스트 (행 단위)
  const fullText = rows.map(r => r.map(it => it.str).join(' | ')).join('\n');

  return { rows, fullText, rawItemCount: rawItems.length };
}

// ── 2. LLM 파싱 ──
async function parseLLM(text) {
  const openai = new OpenAI({ apiKey: API_KEY });

  const start = Date.now();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `서울대학교병원 급여명세서 텍스트를 파싱합니다.

규칙:
1. 지급내역(salaryItems)과 공제내역(deductionItems)을 분리
2. 금액은 정수(원 단위), 0원 항목은 제외
3. 급여총액/공제총액/실지급액은 합계이며 개별 항목이 아닙니다
4. 항목명은 원문 그대로 보존
5. 근무시간 관련 항목(총근로시간, 시간외근무시간 등)은 workStats에 별도 추출

JSON 형식:
{
  "employeeInfo": { "employeeNumber": "", "name": "", "jobType": "", "payGrade": "", "department": "", "hireDate": "" },
  "payPeriod": "",
  "salaryItems": [{ "name": "", "amount": 0 }],
  "deductionItems": [{ "name": "", "amount": 0 }],
  "grossPay": 0,
  "totalDeduction": 0,
  "netPay": 0,
  "workStats": {}
}`
      },
      { role: 'user', content: text }
    ]
  });

  const elapsed = Date.now() - start;
  const result = JSON.parse(response.choices[0].message.content);
  const usage = response.usage;

  return { result, elapsed, usage };
}

// ── 실행 ──
async function main() {
  console.log('=== PDF 파싱 비교 테스트 ===\n');

  // Step 1: PDF 텍스트 추출
  console.log('1. PDF 텍스트 추출 중...');
  const { rows, fullText, rawItemCount } = await extractPdfText(PDF_PATH);
  console.log(`   raw items: ${rawItemCount}, 행: ${rows.length}`);
  console.log(`   텍스트 길이: ${fullText.length}자\n`);

  // 행 목록 출력 (디버그)
  console.log('--- 행 목록 ---');
  rows.forEach((r, i) => {
    console.log(`  [${i}] ${r.map(it => it.str).join(' | ')}`);
  });
  console.log('');

  // Step 2: LLM 파싱
  console.log('2. LLM (gpt-4o-mini) 파싱 중...');
  const { result: llm, elapsed, usage } = await parseLLM(fullText);

  console.log(`   소요: ${elapsed}ms`);
  console.log(`   토큰: input=${usage.prompt_tokens}, output=${usage.completion_tokens}, total=${usage.total_tokens}`);
  const cost = (usage.prompt_tokens * 0.15 + usage.completion_tokens * 0.6) / 1_000_000;
  console.log(`   비용: $${cost.toFixed(6)}\n`);

  // Step 3: 결과 출력
  console.log('=== LLM 파싱 결과 ===\n');

  console.log('직원정보:', JSON.stringify(llm.employeeInfo, null, 2));
  console.log('급여기간:', llm.payPeriod);
  console.log('');

  console.log(`지급항목 (${llm.salaryItems.length}건):`);
  let salarySum = 0;
  llm.salaryItems.forEach(item => {
    console.log(`  ${item.name.padEnd(20)} ${item.amount.toLocaleString().padStart(12)}원`);
    salarySum += item.amount;
  });
  console.log(`  ${'────────────────────'.padEnd(20)} ${'─'.repeat(12)}`);
  console.log(`  ${'항목 합계'.padEnd(20)} ${salarySum.toLocaleString().padStart(12)}원`);
  console.log(`  ${'급여총액 (LLM)'.padEnd(20)} ${llm.grossPay.toLocaleString().padStart(12)}원`);
  console.log('');

  console.log(`공제항목 (${llm.deductionItems.length}건):`);
  let dedSum = 0;
  llm.deductionItems.forEach(item => {
    console.log(`  ${item.name.padEnd(20)} ${item.amount.toLocaleString().padStart(12)}원`);
    dedSum += item.amount;
  });
  console.log(`  ${'────────────────────'.padEnd(20)} ${'─'.repeat(12)}`);
  console.log(`  ${'항목 합계'.padEnd(20)} ${dedSum.toLocaleString().padStart(12)}원`);
  console.log(`  ${'공제총액 (LLM)'.padEnd(20)} ${llm.totalDeduction.toLocaleString().padStart(12)}원`);
  console.log('');

  console.log('총액:');
  console.log(`  급여총액:  ${llm.grossPay.toLocaleString()}원`);
  console.log(`  공제총액:  ${llm.totalDeduction.toLocaleString()}원`);
  console.log(`  실지급액:  ${llm.netPay.toLocaleString()}원`);
  console.log(`  차액검증:  ${llm.grossPay} - ${llm.totalDeduction} = ${llm.grossPay - llm.totalDeduction} (실지급액=${llm.netPay}, ${llm.grossPay - llm.totalDeduction === llm.netPay ? '✅ 일치' : '❌ 불일치'})`);

  // 항목합 검증
  console.log(`  지급합검증: 항목합=${salarySum} vs 총액=${llm.grossPay} ${salarySum === llm.grossPay ? '✅' : '❌ 차이=' + (salarySum - llm.grossPay)}`);
  console.log(`  공제합검증: 항목합=${dedSum} vs 총액=${llm.totalDeduction} ${dedSum === llm.totalDeduction ? '✅' : '❌ 차이=' + (dedSum - llm.totalDeduction)}`);

  if (llm.workStats && Object.keys(llm.workStats).length > 0) {
    console.log('\n근무시간 통계:', JSON.stringify(llm.workStats, null, 2));
  }

  console.log('\n=== 비교 요약 ===');
  console.log('현재 regex 파서 (콘솔 로그 기준): 지급 17건, 공제 19건, 총액 불일치');
  console.log(`LLM 파서: 지급 ${llm.salaryItems.length}건, 공제 ${llm.deductionItems.length}건, 총액 ${llm.grossPay - llm.totalDeduction === llm.netPay ? '✅ 일치' : '❌ 불일치'}`);
  console.log(`LLM 비용: $${cost.toFixed(6)} (${elapsed}ms)`);
}

main().catch(console.error);
