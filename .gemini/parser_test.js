const fs = require('fs');
// Load pdfjs-dist from the local project if available, or just mock it for a quick test
// Wait, we didn't install it in the workspace. Let's do it quickly or just rely on the pdftotext output we have.
// Actually, earlier we already got the pdftotext output!
const text = `2026년도 02월분 급여명세서
개인번호 20842 성 명 김계환 직 종 보건직 급여연차 S1 - 03 소 속 핵의학과 입사년월 2006-07-05
지급내역
기준기본급 3,085,900 정근수당 150,000 연구보조비 근속가산기본급 226,570 명절지원비
의학연구비 능력급 1,731,660 의업수당 301,700 진료기여수당(협진) 성과급 급식보조비 157,400 시간외수당
교통보조비 35,000 휴일수당 직책수당 진료기여수당 조정급 상여금 1,075,700 진료비보조 기타수당
장기근속수당 80,000 별정수당5 150,000 가계지원비 934,970 자기계발별정수당 150,000 가족수당 40,000
급여총액 7,968,900 공제총액 3,169,950 실지급액 4,798,950
공제내역
소득세 731,310 국민건강 288,580 고용보험 73,130 주민세 73,130 장기요양 38,360
국민연금 406,000 교원장기급여 433,570 사학연금부담금 343,160 노동조합비 66,000 식대공제 60,000`;

const SALARY_PATTERNS = [
  /기준기본급|기본기준급|기본급/, /근속가산기본급|근속가산/,
  /능력급/, /상여금|정기상여/, /특별상여금/, /가계지원비/,
  /정근수당|근무수당/, /명절지원비|명절휴가비|명절수당/, /의업수당|의료수당/,
  /진료수당/, /임상연구비|연구활동비/, /연구실습비/,
  /연구보조비/, /의학연구비/, /진료비보조/,
  /교통보조비|교통비/, /급식보조비|식대보조비|중식보조비|식비/, /업무보조비/,
  /진료기여수당\(협진\)/, /진료기여수당\(토요진료\)/, /진료기여수당/, /보직교수기여수당/,
  /성과급|인센티브/, /기타수당|제수당/, /조정급|조정수당/, /직책수당|직무수당|보직수당/,
  /선택진료수당/, /별정수당\(직무\)/, /승급호봉분/,
  /연구장려수당|연구수당/, /경력인정수당/, /장기근속수당/, /진료지원수당/,
  /의학연구지원금/, /원외근무수당/, /시간외수당|시간외근무수당/,
  /자기계발별정수당/, /별정수당5/, /가족수당/
];

const DEDUCTION_PATTERNS = [
  /소득세/, /국민건강/, /고용보험/, /주민세/, /장기요양/, /국민연금/, /교원장기급여/,
  /사학연금부담금/, /노동조합비/, /식대공제/
];

function parseAmount(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseInt(val.replace(/,/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function parsePDFText(text) {
  const info = {};
  const infoMatch = text.match(/개인번호\s+(\d+)/);
  if (infoMatch) info.employeeNumber = infoMatch[1];
  const nameMatch = text.match(/성\s*명\s+(\S+)/);
  if (nameMatch) info.name = nameMatch[1];
  const gradeMatch = text.match(/(S\d+\s*-\s*\d+)/);
  if (gradeMatch) info.payGrade = gradeMatch[1].replace(/\s/g, '');

  let grossPay = 0, totalDeduction = 0, netPay = 0;
  const grossMatch = text.match(/급여총액\s+([\d,]+)/);
  if (grossMatch) grossPay = parseAmount(grossMatch[1]);
  const deductMatch = text.match(/공제총액\s+([\d,]+)/);
  if (deductMatch) totalDeduction = parseAmount(deductMatch[1]);
  const netMatch = text.match(/실지급액\s+([\d,]+)/);
  if (netMatch) netPay = parseAmount(netMatch[1]);

  const salaryItems = [];
  SALARY_PATTERNS.forEach(pattern => {
    const m = text.match(new RegExp(pattern.source + '[^\\d]{0,30}([\\d,]{5,})'));
    if (m) {
      const name = m[0].match(new RegExp(pattern.source))?.[0];
      const amount = parseAmount(m[1]);
      if (name && amount > 0 && !salaryItems.find(i => i.name === name)) {
        salaryItems.push({ name, amount });
      }
    }
  });

  const deductionItems = [];
  DEDUCTION_PATTERNS.forEach(pattern => {
    const m = text.match(new RegExp(pattern.source + '[^\\d]{0,30}([\\d,]{5,})'));
    if (m) {
      const name = m[0].match(new RegExp(pattern.source))?.[0];
      const amount = parseAmount(m[1]);
      if (name && amount > 0 && !deductionItems.find(i => i.name === name)) {
        deductionItems.push({ name, amount });
      }
    }
  });

  return { employeeInfo: info, salaryItems, deductionItems, summary: { grossPay, totalDeduction, netPay } };
}

console.log(JSON.stringify(parsePDFText(text), null, 2));
