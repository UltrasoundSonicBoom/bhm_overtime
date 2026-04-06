// ============================================================
// SNUH 급여명세서 파서 v1.0
// - Excel (.xls/.xlsx), CSV, PDF 지원
// - 기존 TypeScript payrollParser.ts를 바닐라 JS로 포팅
// - 파싱 결과를 해당 월 localStorage에 저장
// - 개인 정보 프로필 자동 반영 기능 포함
// ============================================================

const SALARY_PARSER = (() => {
  'use strict';

  // ── 지급 항목 패턴 (TypeScript 파서에서 이관) ──
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
    /대체근무 통상야근수당/, /별정수당\(약제부/, /군복무수당/, /간호간병특별수당/,
    /통상야간/, /산전후보전급여/, /육아휴직수당/, /연차수당|연차보상비/,
    /가족수당/, /연차보전수당/, /법정공휴일수당/, /자격수당/,
    /학술수당/, /학비보조/, /포상금/, /성과연봉/, /격려금/,
    /육아기근로시간단축/, /무급난임휴가/, /무급생휴공제/,
    /자기계발별정수당/, /별정수당5/
  ];

  const DEDUCTION_PATTERNS = [
    /소득세/, /주민세|지방소득세/, /농특세|농어촌특별세/,
    /소득세\(정산\)/, /주민세\(정산\)|지방소득세\(정산\)/, /농특세\(정산\)/,
    /국민건강|건강보험/, /장기요양|장기요양보험/, /국민연금|연금보험/, /고용보험/,
    /국민건강\(정산\)/, /장기요양\(정산\)/, /국민연금\(정산\)/, /고용보험\(정산\)/,
    /교원장기급여|장기저축급여/, /교원대출상환/, /사학연금부담금/, /사학연금대여상환금/, /사학연금정산금/,
    /장학지원금공제|장학회비/, /노동조합비|조합비/, /노조기금/, /후원회비|후원금/,
    /의국비|동문회비/, /주차료|주차비/, /상조회비/,
    /마을금고상환|금고상환/, /기숙사비/, /채권가압류|가압류/, /보육료/,
    /병원발전기금|발전기금/, /전공의협회비/, /전공의동창회비/, /기금출연금/,
    /식대공제|식비공제/, /대학학자금대출상환|학자금상환/, /기타공제\d?/,
    /의사협회비/, /기금협의회비/, /무급가족돌봄휴가/, /경조회비/
  ];

  const SUMMARY_PATTERNS = {
    total: /급여총액|총지급액|지급총액|총급여|급여계|지급계/,
    deduction: /공제총액|총공제액|공제계|차감총액/,
    netPay: /실지급액|차인지급액|실수령액|실급여/
  };

  // 파서가 프로필에 자동 반영할 항목 매핑 (안정적으로 변하지 않는 항목만)
  const PAYSLIP_TO_PROFILE_MAP = {
    '조정급': 'adjustPay',
    '승급조정급': 'upgradeAdjustPay',
    '승급호봉분': 'upgradeAdjustPay',
    '직책수당': 'positionPay',
    '직책급': 'positionPay',
    '업무보조비': 'workSupportPay',
    '별정수당(직무)': 'specialPay',
  };

  // ── 숫자 파싱 ──
  function parseAmount(val) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const n = parseInt(val.replace(/,/g, ''), 10);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }

  function isAmount(val) {
    if (val === null || val === undefined) return false;
    const s = String(val).trim();
    return /^[\d,]+$/.test(s) && !s.includes('.') && s.length >= 1;
  }

  function isItemName(text, patterns) {
    if (!text) return false;
    const s = String(text).trim();
    if (!s || isAmount(s)) return false;
    if (/^(지급|공제|내역|항목|금액|구분|계)$/.test(s)) return false;
    return patterns.some(p => p.test(s));
  }

  // ── 앵커 탐색 ──
  function findAnchor(data, pattern, maxRows = 25) {
    for (let r = 0; r < Math.min(maxRows, data.length); r++) {
      if (!data[r]) continue;
      for (let c = 0; c < data[r].length; c++) {
        if (data[r][c] && pattern.test(String(data[r][c]))) return { row: r, col: c };
      }
    }
    return null;
  }

  // ── 고정 블록 방식으로 항목 추출 ──
  function extractFixedBlock(data, patterns, anchor, nameRows, amtOffset, amtRows, width) {
    const items = [];
    const seen = new Set();
    for (let rOff = 0; rOff < nameRows; rOff++) {
      const nameRow = anchor.row + rOff;
      if (nameRow >= data.length || !data[nameRow]) continue;
      for (let cOff = 0; cOff < width; cOff++) {
        const col = anchor.col + cOff;
        if (col >= data[nameRow].length) continue;
        const cell = data[nameRow][col];
        if (!isItemName(cell, patterns)) continue;
        const name = String(cell).trim();
        const key = `${name}-${col}`;
        if (seen.has(key)) continue;
        seen.add(key);
        let amount = 0;
        if (rOff < amtRows) {
          const amtRow = anchor.row + amtOffset + rOff;
          if (amtRow < data.length && data[amtRow] && col < data[amtRow].length) {
            const amtCell = data[amtRow][col];
            if (isAmount(amtCell)) amount = parseAmount(String(amtCell));
          }
        }
        items.push({ name, amount });
      }
    }
    return items;
  }

  // ── 총액 추출 ──
  function extractSummary(data) {
    let grossPay = 0, totalDeduction = 0, netPay = 0;
    for (let r = data.length - 1; r >= Math.max(0, data.length - 25); r--) {
      const row = data[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim();
        const check = (pattern, current) => {
          if (current !== 0) return current;
          if (pattern.test(cell)) {
            for (let k = c + 1; k < row.length; k++) {
              if (isAmount(row[k])) return parseAmount(String(row[k]));
            }
          }
          return current;
        };
        grossPay = check(SUMMARY_PATTERNS.total, grossPay);
        totalDeduction = check(SUMMARY_PATTERNS.deduction, totalDeduction);
        netPay = check(SUMMARY_PATTERNS.netPay, netPay);
      }
      if (grossPay > 0 && totalDeduction > 0 && netPay > 0) break;
    }
    if (grossPay > 0 && totalDeduction > 0 && netPay === 0) netPay = grossPay - totalDeduction;
    return { grossPay, totalDeduction, netPay };
  }

  // ── 직원 정보 추출 ──
  function extractEmployeeInfo(data) {
    const info = {};
    const LABEL_MAP = [
      [/개인번호|사원번호/, 'employeeNumber'],
      [/성\s*명|이름/, 'name'],
      [/직\s*종|직책/, 'jobType'],
      [/소\s*속|부서/, 'department'],
      [/급여연차|호봉|직급/, 'payGrade'],
      [/입사년월|입사일/, 'hireDate'],
    ];
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const row = data[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim();
        LABEL_MAP.forEach(([regex, key]) => {
          if (regex.test(cell) && !info[key]) {
            const v1 = row[c + 1], v2 = row[c + 2];
            const v = (v1 != null && String(v1).trim()) ? v1 : v2;
            if (v != null && String(v).trim()) info[key] = String(v).trim();
          }
        });
      }
    }
    return info;
  }

  // ── 급여 기간 추출 ──
  function extractPeriod(data) {
    const meta = {};
    for (let r = 0; r < Math.min(5, data.length); r++) {
      const row = data[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim();
        if (!meta.payPeriod && cell.includes('년') && cell.includes('월분')) meta.payPeriod = cell;
        if (!meta.payDate && (cell.includes('급여지급일') || cell.includes('지급일'))) {
          const adjacent = [cell, String(row[c+1] || ''), String(row[c+2] || '')];
          for (const s of adjacent) {
            const m = s.match(/(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})/);
            if (m) { meta.payDate = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`; break; }
          }
        }
      }
    }
    return meta;
  }

  // ── 2D 배열 → ParsedData ──
  function analyzeGrid(data) {
    const employeeInfo = extractEmployeeInfo(data);
    const metadata = extractPeriod(data);

    // 지급 항목: 앵커 = "기본기준급" 또는 "기준기본급"
    const salaryAnchor = findAnchor(data, /기본기준급|기준기본급/);
    let salaryItems = [];
    if (salaryAnchor) {
      salaryItems = extractFixedBlock(data, SALARY_PATTERNS, salaryAnchor, 6, 6, 6, 28);
    }

    // 공제 항목: 앵커 = "소득세"
    const deductionAnchor = findAnchor(data, /소득세/, 30);
    let deductionItems = [];
    if (deductionAnchor) {
      deductionItems = extractFixedBlock(data, DEDUCTION_PATTERNS, deductionAnchor, 6, 6, 5, 20);
    }

    const summaryExtracted = extractSummary(data);
    const calcGross = salaryItems.reduce((s, i) => s + i.amount, 0);
    const calcDeduction = deductionItems.reduce((s, i) => s + i.amount, 0);
    const tolerance = Math.max(1, calcGross * 0.05);

    const grossPay = summaryExtracted.grossPay > 0 && Math.abs(summaryExtracted.grossPay - calcGross) < tolerance
      ? summaryExtracted.grossPay : calcGross;
    const totalDeduction = summaryExtracted.totalDeduction > 0 && Math.abs(summaryExtracted.totalDeduction - calcDeduction) < tolerance
      ? summaryExtracted.totalDeduction : calcDeduction;

    return {
      employeeInfo,
      metadata,
      salaryItems: salaryItems.filter(i => i.amount > 0),
      deductionItems: deductionItems.filter(i => i.amount > 0),
      summary: {
        grossPay,
        totalDeduction,
        netPay: grossPay - totalDeduction
      }
    };
  }

  // ── Excel/CSV 파싱 ──
  async function parseExcel(file) {
    if (typeof XLSX === 'undefined') throw new Error('xlsx.js가 로드되지 않았습니다.');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', rawNumbers: false });
    return analyzeGrid(data);
  }

  async function parseCSV(file) {
    const text = await file.text();
    const lines = text.split(/[\r\n]+/).filter(l => l.trim());
    const data = lines.map(l => l.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1')));
    return analyzeGrid(data);
  }

  // ── PDF 파싱 (pdf.js 기반) ──
  async function parsePDF(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('pdf.js가 로드되지 않았습니다.');
    }
    // pdf.js 3.x workerSrc 설정
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(it => it.str).join(' ') + '\n';
    }
    return parsePDFText(fullText);
  }

  // ── PDF 텍스트 → ParsedData ──
  // (2602 salary.pdf 구조 기준: 항목명 나열 후 금액 별도 나열)
  function parsePDFText(text) {
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
    const tokens = text.split(/\s+/);

    // 직원 정보 추출 (정규식)
    const info = {};
    const infoMatch = text.match(/개인번호\s+(\d+)/);
    if (infoMatch) info.employeeNumber = infoMatch[1];
    const nameMatch = text.match(/성\s*명\s+(\S+)/);
    if (nameMatch) info.name = nameMatch[1];
    const jobMatch = text.match(/직\s*종\s+(\S+)/);
    if (jobMatch) info.jobType = jobMatch[1];
    const gradeMatch = text.match(/(S\d+\s*-\s*\d+)/);
    if (gradeMatch) info.payGrade = gradeMatch[1].replace(/\s/g, '');
    const deptMatch = text.match(/소\s*속[\s\S]{0,20}\n\s*(\S+)/m);
    if (deptMatch) info.department = deptMatch[1];
    const hireMatch = text.match(/입사년월\s+([\d-]+)/);
    if (hireMatch) info.hireDate = hireMatch[1];

    // 기간 추출
    const periodMatch = text.match(/(\d{4})년도?\s*(\d{1,2})월분/);
    const metadata = {};
    if (periodMatch) metadata.payPeriod = `${periodMatch[1]}년 ${periodMatch[2]}월분`;
    const dateMatch = text.match(/급여지급일\s*:\s*(\d{4}-\d{2}-\d{2}|\d{4}\.\d{2}\.\d{2})/);
    if (dateMatch) metadata.payDate = dateMatch[1].replace(/\./g, '-');

    // 모든 패턴과 매칭되는 항목명 수집 (순서대로)
    const salaryItemNames = [];
    const deductionItemNames = [];
    tokens.forEach(t => {
      if (SALARY_PATTERNS.some(p => p.test(t)) && !salaryItemNames.includes(t)) {
        // 총액 레이블 제외
        if (!SUMMARY_PATTERNS.total.test(t) && !SUMMARY_PATTERNS.deduction.test(t) && !SUMMARY_PATTERNS.netPay.test(t)) {
          salaryItemNames.push(t);
        }
      }
      if (DEDUCTION_PATTERNS.some(p => p.test(t)) && !deductionItemNames.includes(t)) {
        deductionItemNames.push(t);
      }
    });

    // 금액 추출 (1000원 이상의 숫자)
    const amounts = [];
    tokens.forEach(t => {
      const cleaned = t.replace(/,/g, '');
      const n = parseInt(cleaned, 10);
      if (!isNaN(n) && n >= 10000 && /^[\d,]+$/.test(t)) amounts.push(n);
    });

    // 총액 라벨 기반 추출
    let grossPay = 0, totalDeduction = 0, netPay = 0;
    const grossMatch = text.match(/급여총액\s+([\d,]+)/);
    if (grossMatch) grossPay = parseAmount(grossMatch[1]);
    const deductMatch = text.match(/공제총액\s+([\d,]+)/);
    if (deductMatch) totalDeduction = parseAmount(deductMatch[1]);
    const netMatch = text.match(/실지급액\s+([\d,]+)/);
    if (netMatch) netPay = parseAmount(netMatch[1]);

    // 항목+금액 페어링: PDF는 텍스트 흐름이 비구조적이므로
    // "항목명 ... 숫자" 패턴으로 추출
    const salaryItems = [];
    const deductionItems = [];

    // 지급 항목 개별 추출
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

    // 공제 항목 개별 추출
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

    // 총액이 추출 안 된 경우 합산으로 대체
    if (grossPay === 0) grossPay = salaryItems.reduce((s, i) => s + i.amount, 0);
    if (totalDeduction === 0) totalDeduction = deductionItems.reduce((s, i) => s + i.amount, 0);
    if (netPay === 0) netPay = grossPay - totalDeduction;

    return { employeeInfo: info, metadata, salaryItems, deductionItems, summary: { grossPay, totalDeduction, netPay } };
  }

  // ── 메인 파싱 함수 ──
  async function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    let result;
    if (ext === 'pdf') result = await parsePDF(file);
    else if (ext === 'xlsx' || ext === 'xls') result = await parseExcel(file);
    else if (ext === 'csv') result = await parseCSV(file);
    else throw new Error('지원하지 않는 파일 형식입니다. PDF, Excel(.xls/.xlsx), CSV 파일을 사용해주세요.');
    result.sourceFile = file.name;
    return result;
  }

  // ── localStorage 월별 저장/불러오기 ──
  function storageKey(year, month) {
    return `payslip_${year}_${String(month).padStart(2, '0')}`;
  }

  function saveMonthlyData(year, month, data) {
    const key = storageKey(year, month);
    localStorage.setItem(key, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
  }

  function loadMonthlyData(year, month) {
    const key = storageKey(year, month);
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }

  function listSavedMonths() {
    const months = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('payslip_')) {
        const m = k.match(/payslip_(\d{4})_(\d{2})/);
        if (m) months.push({ year: parseInt(m[1]), month: parseInt(m[2]), key: k });
      }
    }
    return months.sort((a, b) => b.year - a.year || b.month - a.month);
  }

  // ── 기간 문자열에서 연/월 파싱 ──
  function parsePeriodYearMonth(data) {
    const period = data.metadata?.payPeriod || '';
    const m = period.match(/(\d{4})년\s*(\d{1,2})월/);
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) };
    // fallback: payDate
    const d = data.metadata?.payDate || '';
    const dm = d.match(/(\d{4})-(\d{2})/);
    if (dm) return { year: parseInt(dm[1]), month: parseInt(dm[2]) };
    return null;
  }

  // ── 프로필 자동 반영 (안정적 항목만) ──
  function applyStableItemsToProfile(data) {
    const profile = PROFILE.load() || {};
    let changed = false;
    data.salaryItems.forEach(item => {
      const profileKey = PAYSLIP_TO_PROFILE_MAP[item.name];
      if (profileKey && item.amount > 0) {
        profile[profileKey] = item.amount;
        changed = true;
      }
    });
    // 입사일도 반영
    if (data.employeeInfo?.hireDate && !profile.hireDate) {
      profile.hireDate = data.employeeInfo.hireDate;
      changed = true;
    }
    if (changed) {
      PROFILE.save(profile);
      // 폼에도 반영
      if (typeof PROFILE.applyToForm === 'function' && typeof PROFILE_FIELDS !== 'undefined') {
        PROFILE.applyToForm(profile, PROFILE_FIELDS);
      }
    }
    return changed;
  }

  // ── 앱 계산값과 비교 ──
  function compareWithApp(parsedData) {
    const profile = PROFILE.load();
    if (!profile || !profile.jobType) return null;

    const serviceYears = CALC.calcServiceYears ? CALC.calcServiceYears(profile.hireDate) : 0;
    const appWage = CALC.calcOrdinaryWage(
      profile.jobType, profile.grade, parseInt(profile.year) || 1,
      {
        hasMilitary: profile.hasMilitary,
        hasSeniority: profile.hasSeniority,
        seniorityYears: profile.hasSeniority ? serviceYears : 0,
        longServiceYears: serviceYears,
        adjustPay: parseInt(profile.adjustPay) || 0,
        upgradeAdjustPay: parseInt(profile.upgradeAdjustPay) || 0,
        specialPayAmount: parseInt(profile.specialPay) || 0,
        positionPay: parseInt(profile.positionPay) || 0,
        workSupportPay: parseInt(profile.workSupportPay) || 0,
      }
    );
    if (!appWage) return null;

    const comparison = [];
    parsedData.salaryItems.forEach(item => {
      const appVal = appWage.breakdown[item.name] ?? null;
      comparison.push({
        name: item.name,
        payslip: item.amount,
        app: appVal,
        diff: appVal !== null ? item.amount - appVal : null,
      });
    });

    // 통상임금 합계 비교
    comparison.push({
      name: '📊 통상임금 합계',
      payslip: parsedData.summary.grossPay,
      app: appWage.monthlyWage,
      diff: parsedData.summary.grossPay - appWage.monthlyWage,
      isTotal: true,
    });

    return { comparison, appWage };
  }

  return {
    parseFile,
    saveMonthlyData,
    loadMonthlyData,
    listSavedMonths,
    parsePeriodYearMonth,
    applyStableItemsToProfile,
    compareWithApp,
    parsePDFText,
  };
})();
