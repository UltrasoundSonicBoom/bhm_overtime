// ============================================================
// SNUH 급여명세서 파서 v1.0
// - Excel (.xls/.xlsx), CSV, PDF 지원
// - 기존 TypeScript payrollParser.ts를 바닐라 JS로 포팅
// - 파싱 결과를 해당 월 localStorage에 저장
// - 개인 정보 프로필 자동 반영 기능 포함
// ============================================================

// Phase 5: cross-module 명시 named import (PROFILE_FIELDS bare 참조 회귀 종결)
import { PROFILE, PROFILE_FIELDS } from './profile.js';
import { CALC } from './calculators.js';
import { DATA } from './data.js';
import { _loadWorkHistory, _saveWorkHistory, renderWorkHistory, _showWorkHistoryUpdateBanner } from './work-history.js';

export const SALARY_PARSER = (() => {
  'use strict';

  // ── DEBUG 플래그 — localStorage.bhm_debug_parser = '1' 설정 시 trace 활성화 ──
  const DEBUG = (function () {
    try { return localStorage.getItem('snuhmate_debug_parser') === '1'; }
    catch (e) { return false; }
  })();
  function debug() {
    if (DEBUG) console.log.apply(console, arguments);
  }

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
    /대체근무 통상야근수당/, /별정수당\(약제부\)/, /군복무수당/, /간호간병특별수당/,
    /통상야간/, /산전후보전급여/, /육아휴직수당/, /연차수당|연차보상비/,
    /가족수당/, /연차보전수당/, /법정공휴일수당/, /자격수당/,
    /학술수당/, /학비보조/, /포상금/, /성과연봉/, /격려금/,
    /육아기근로시간단축/, /무급난임휴가/, /무급생휴공제/,
    /무급가족돌봄휴가/, /자기계발별정수당/, /별정수당5/
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

  // ── PDF 글로벌 그리드용 필터 ──
  const GRID_SUMMARY_RE = /급여총액|공제총액|실지급액|총지급액|총공제액|차인지급액|지급계|공제계/;
  const GRID_STATS_NAMES = new Set([
    '총근로시간', '시간외근무시간', '야간근무시간', '통상근로시간',
    '휴일근무시간', '야간근로시간', '주휴시간', '통상야근시간',
    '유급휴일', '무급생휴일', '지급연차', '사용연차', '발생연차',
    '근로일수', '대체근무가산횟수', '야간근무가산횟수', '명절근무시간',
    '대체근무통상야근시간', '법정공휴일', '지급연차갯수',
    '시간외근무시간야간근무가산횟수', '대체근무가산횟수',
  ]);

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

  // 근무시간 통계용 소수점 파싱 (시간외=4.50, 발생연차=15 등)
  function parseStatValue(val) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const n = parseFloat(val.replace(/,/g, ''));
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }

  function isAmount(val) {
    if (val === null || val === undefined) return false;
    const s = String(val).trim();
    return /^-?[\d,]+$/.test(s) && !s.includes('.') && s.length >= 1;
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
            // 라벨 다음 셀부터 최대 5칸까지 훑어서 첫 비어있지 않은 값 사용
            // (SNUH 급여명세서 CSV는 라벨~값 사이에 빈 셀 2~3개 있음: 예 "소 속" @ c → "핵의학과" @ c+3)
            for (let k = 1; k <= 5 && (c + k) < row.length; k++) {
              const v = row[c + k];
              if (v != null && String(v).trim()) {
                const s = String(v).trim();
                // 다른 라벨을 값으로 집지 않도록 가드
                if (LABEL_MAP.some(([re]) => re.test(s))) break;
                info[key] = s;
                break;
              }
            }
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
        if (!meta.payslipType && cell.includes('급여명세서')) {
          const tm = cell.match(/급여명세서\s*\(([^)]+)\)/);
          meta.payslipType = tm ? tm[1] : '급여';
        }
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
      salaryItems: salaryItems.filter(i => i.amount !== 0),
      deductionItems: deductionItems.filter(i => i.amount !== 0),
      summary: {
        grossPay,
        totalDeduction,
        netPay: grossPay - totalDeduction
      }
    };
  }

  // ── Excel/CSV 파싱 ──
  async function parseExcel(file) {
    if (typeof window.loadXLSX === 'function') await window.loadXLSX();
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

  // ── PDF 파싱 (pdf.js 기반, 좌표→행 그룹핑→x좌표 직접 매칭) ──
  async function parsePDF(file) {
    if (typeof window.loadPDFJS === 'function') await window.loadPDFJS();
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('pdf.js가 로드되지 않았습니다.');
    }
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

    // 모든 페이지에서 텍스트 아이템 + 좌표 수집
    const rawItems = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      const pageOffset = (i - 1) * viewport.height;
      content.items.forEach(item => {
        if (!item.str || !item.str.trim()) return;
        const tx = item.transform;
        rawItems.push({
          str: item.str.trim(),
          x: tx[4],
          y: pageOffset + (viewport.height - tx[5]),
          w: item.width || (Math.abs(tx[0]) * item.str.length * 0.6)
        });
      });
    }
    if (rawItems.length === 0) throw new Error('PDF에서 텍스트를 추출할 수 없습니다.');

    // ── 행 그룹핑 (y값 기준, 허용 오차 5pt) ──
    rawItems.sort((a, b) => a.y - b.y || a.x - b.x);
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

    // ── 인접 글자 병합: 같은 행에서 x좌표가 가까운 글자들을 단어로 합침 ──
    // (PDF가 글자 단위로 텍스트를 쪼개는 경우 대응)
    const CHAR_GAP = 3; // 글자 간격 허용치 (pt)
    const WORD_GAP = 8; // 단어/셀 간격 (이 이상이면 별도 아이템)
    let rows = rawRows.map(row => {
      row.sort((a, b) => a.x - b.x);
      const merged = [];
      let cur = { str: row[0].str, x: row[0].x, y: row[0].y, w: row[0].w };
      for (let i = 1; i < row.length; i++) {
        const gap = row[i].x - (cur.x + cur.w);
        if (gap < WORD_GAP) {
          // 가까운 글자 — 병합 (간격이 작으면 붙이고, 약간 크면 공백)
          cur.str += (gap > CHAR_GAP ? '' : '') + row[i].str;
          cur.w = (row[i].x + row[i].w) - cur.x;
        } else {
          // 먼 글자 — 별도 아이템 (다른 셀)
          merged.push(cur);
          cur = { str: row[i].str, x: row[i].x, y: row[i].y, w: row[i].w };
        }
      }
      merged.push(cur);
      return merged;
    });

    debug('[PayslipParser] PDF 행 그룹핑: ' + rows.length + '행 (병합 후)');
    rows.forEach((r, i) => {
      debug('  [' + i + '] ' + r.map(it => it.str).join(' | '));
    });

    // ── 전체 텍스트 (행 순서대로) — 개인정보/기간 추출용 ──
    let fullText = '';
    rows.forEach(r => { fullText += r.map(it => it.str).join(' ') + '\n'; });

    // ── 개인정보 추출 ──
    // 1차: 행 단위 라벨-값 스캔 (CSV 로직과 일관, 여러 토큰 건너뛰기 대응)
    const employeeInfo = {};
    const LABEL_MAP = [
      [/개인번호|사원번호/, 'employeeNumber'],
      [/^성\s*명$|^이름$/, 'name'],
      [/^직\s*종$|^직책$/, 'jobType'],
      [/^소\s*속$|^부서$/, 'department'],
      [/급여연차|^호봉$/, 'payGrade'],
      [/입사년월|입사일/, 'hireDate'],
    ];
    rows.forEach(row => {
      row.forEach((cell, c) => {
        const s = (cell.str || '').trim();
        if (!s) return;
        LABEL_MAP.forEach(([re, key]) => {
          if (!employeeInfo[key] && re.test(s)) {
            for (let k = 1; k <= 6 && (c + k) < row.length; k++) {
              const v = (row[c + k].str || '').trim();
              if (!v) continue;
              // 다음 라벨을 값으로 오인하지 않도록
              if (LABEL_MAP.some(([r2]) => r2.test(v))) break;
              employeeInfo[key] = v;
              break;
            }
          }
        });
      });
    });
    // 2차 fallback: fullText 정규식 (이미 채워진 키는 유지)
    const infoPatterns = [
      [/개인번호\s+(\d+)/, 'employeeNumber'],
      [/성\s*명\s+(\S+)/, 'name'],
      [/직\s*종\s+(\S+)/, 'jobType'],
      [/소\s*속\s+(\S+)/, 'department'],
      [/입사(?:년월|일)\s+([\d][\d./-]+[\d])/, 'hireDate'],
    ];
    infoPatterns.forEach(([re, key]) => {
      if (employeeInfo[key]) return;
      const m = fullText.match(re);
      if (m) employeeInfo[key] = m[1];
    });
    // 호봉 별도 (S1-03 형태)
    const gradeMatch = fullText.match(/((?:[SMJK]\d+|[가-힣]+\d*)\s*-\s*\d+)/);
    if (gradeMatch) employeeInfo.payGrade = gradeMatch[1].replace(/\s/g, '');

    // ── 기간 추출 ──
    const metadata = {};
    const periodPatterns = [
      /(\d{4})년도?\s*(\d{1,2})월\s*분/,
      /(\d{4})년\s*(\d{1,2})월\s*급여/,
      /(\d{4})년\s*(\d{1,2})월/,
    ];
    for (const pat of periodPatterns) {
      const m = fullText.match(pat);
      if (m) { metadata.payPeriod = m[1] + '년 ' + m[2] + '월분'; break; }
    }
    const datePatterns = [
      /급여지급일\s*:?\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/,
      /지급일\s*:?\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/,
    ];
    for (const pat of datePatterns) {
      const m = fullText.match(pat);
      if (m) { metadata.payDate = m[1].replace(/\./g, '-'); break; }
    }

    // 명세서 유형 감지 (소급분, 연차수당 등)
    const typeMatch = fullText.match(/급여명세서\s*\(([^)]+)\)/);
    metadata.payslipType = typeMatch ? typeMatch[1] : '급여';

    // ── 글로벌 그리드 빈(bin) 매핑: 항목 추출 ──
    // SNUH 급여명세서 = 11열 × 6행 고정 그리드
    // 첫 이름행(항상 11열)의 x좌표로 열 경계를 정의하고,
    // 모든 이름/금액을 글로벌 그리드에 매핑하여 같은 열끼리 매칭

    function findAnchorRow(pattern) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].some(it => pattern.test(it.str))) return i;
      }
      return -1;
    }

    function isGarbageRow(row) {
      if (row.length === 0) return true;
      const totalLen = row.reduce((s, it) => s + it.str.replace(/\s/g, '').length, 0);
      if (totalLen <= 3) return true;
      if (row.length === 1 && /^[사-힣+()]{1,5}\)?$/.test(row[0].str.trim())) return true;
      return false;
    }

    function isAmountRow(row) {
      if (row.length === 0) return false;
      const numItems = row.filter(it => /^-?[\d,.]+$/.test(it.str) && it.str.replace(/[-,.]/g, '').length >= 1);
      return numItems.length >= 1 && numItems.length >= row.length * 0.4;
    }

    // 첫 이름행에서 글로벌 열 경계 정의
    function buildGlobalGrid(firstNameRow) {
      return firstNameRow.map((item, i, arr) => ({
        col: i,
        xStart: i === 0 ? 0 : (arr[i - 1].x + arr[i - 1].w + item.x) / 2,
        xEnd: i === arr.length - 1 ? 9999 : (item.x + item.w + arr[i + 1].x) / 2,
        xCenter: item.x + item.w / 2,
      }));
    }

    // x좌표가 어느 글로벌 열에 속하는지 탐색
    function findGlobalCol(grid, x) {
      for (const bin of grid) {
        if (x >= bin.xStart && x < bin.xEnd) return bin.col;
      }
      let best = 0, bestDist = Infinity;
      for (const bin of grid) {
        const dist = Math.abs(x - bin.xCenter);
        if (dist < bestDist) { bestDist = dist; best = bin.col; }
      }
      return best;
    }

    // 이름행/금액행을 글로벌 그리드로 매칭
    function extractByGlobalGrid(grid, nameRows, amtRows) {
      const items = [];
      const seen = new Set();
      const limit = Math.min(nameRows.length, amtRows.length);

      for (let r = 0; r < limit; r++) {
        const names = nameRows[r];
        const amts = amtRows[r];

        // 이름 → 글로벌 열 매핑 (단일문자 건너뛰기)
        const nameByCol = new Map();
        names.forEach(it => {
          const name = it.str.trim();
          if (name.length <= 1) return;
          const col = findGlobalCol(grid, it.x + it.w / 2);
          nameByCol.set(col, name);
        });

        // 금액 → 글로벌 열 매핑
        const amtByCol = new Map();
        amts.forEach(it => {
          if (!/^-?[\d,.]+$/.test(it.str)) return;
          const col = findGlobalCol(grid, it.x + it.w / 2);
          amtByCol.set(col, parseAmount(it.str));
        });

        // 같은 열의 이름 ↔ 금액 매칭
        for (const [col, name] of nameByCol) {
          if (GRID_SUMMARY_RE.test(name)) continue;
          if (GRID_STATS_NAMES.has(name)) continue;
          if (seen.has(name)) continue;
          seen.add(name);
          const amount = amtByCol.get(col) || 0;
          items.push({ name, amount, col, row: r });
        }
      }
      return items;
    }

    // 근무시간 통계 항목 추출 — 공제 섹션 col7-10에서 GRID_STATS_NAMES 이름만 수집
    function extractWorkStats(grid, nameRows, amtRows) {
      const items = [];
      const seen = new Set();
      const limit = Math.min(nameRows.length, amtRows.length);
      for (let r = 0; r < limit; r++) {
        const names = nameRows[r];
        const amts = amtRows[r];

        // 근무통계 항목명만 → 글로벌 열 매핑
        const nameByCol = new Map();
        names.forEach(it => {
          const name = it.str.trim();
          if (!GRID_STATS_NAMES.has(name)) return;
          const col = findGlobalCol(grid, it.x + it.w / 2);
          nameByCol.set(col, name);
        });

        // 수치 → 글로벌 열 매핑 (소수점 포함 허용: 0.00, 4.50 등)
        const valByCol = new Map();
        amts.forEach(it => {
          if (!/^-?[\d,.]+$/.test(it.str)) return;
          const col = findGlobalCol(grid, it.x + it.w / 2);
          valByCol.set(col, parseStatValue(it.str));
        });

        for (const [col, name] of nameByCol) {
          if (seen.has(name)) continue;
          seen.add(name);
          const value = valByCol.has(col) ? valByCol.get(col) : 0;
          items.push({ name, value, col, row: r });
        }
      }
      return items;
    }

    // 이름행/금액행 분리 + 소규모 행 병합
    function separateAndMerge(startRow, endRow) {
      const nameRows = [];
      const amtRows = [];
      for (let i = startRow; i < endRow && i < rows.length; i++) {
        if (isGarbageRow(rows[i])) continue;
        if (isAmountRow(rows[i])) amtRows.push(rows[i]);
        else nameRows.push(rows[i]);
      }
      if (nameRows.length > amtRows.length && nameRows.length > 0) {
        const merged = [];
        for (let i = 0; i < nameRows.length; i++) {
          if (nameRows[i].length <= 2 && merged.length > 0) {
            merged[merged.length - 1] = merged[merged.length - 1].concat(nameRows[i]);
            merged[merged.length - 1].sort((a, b) => a.x - b.x);
          } else {
            merged.push([...nameRows[i]]);
          }
        }
        nameRows.length = 0;
        merged.forEach(r => nameRows.push(r));
      }
      return { nameRows, amtRows };
    }

    // ── SNUH 고정 그리드: PDF 폰트 인코딩 문제로 이름행 누락 시 보완 ──
    // 실측 열 중심값 (pdfminer 3개 PDF 분석 기반, 단위: pt)
    const SNUH_COL_CENTERS = [95, 157, 219, 281, 343, 412, 474, 536, 598, 660, 725];
    function findNearestSNUHCol(x) {
      let best = 0, bestD = Infinity;
      SNUH_COL_CENTERS.forEach((c, i) => { const d = Math.abs(x - c); if (d < bestD) { bestD = d; best = i; } });
      return best;
    }
    // 6행×11열 고정 맵 — null은 알 수 없는 위치 또는 총액(행3-5 col10)
    const SNUH_GRID_MAP = [
      ['기준기본급',null,null,null,null,'급식보조비',null,null,null,null,null],        // row0
      ['근속가산기본급','명절지원비',null,null,null,'교통보조비',null,null,null,null,null], // row1
      ['능력급',null,null,null,'경력인정수당',null,null,null,null,null,'가족수당'],      // row2 (이름행 누락多)
      ['상여금',null,null,null,null,null,null,null,null,null,null],                    // row3
      [null,null,null,null,null,'업무보조비',null,null,'무급가족돌봄휴가',null,null],   // row4 (이름행 누락多)
      ['진료기여수당',null,null,null,null,null,null,'명절수당',null,null,null],          // row5
    ];

    // 고정 그리드로 급여 항목 추출 (이름행 없이 x좌표만으로)
    function extractBySNUHFixedGrid(startRow, endRow) {
      const allAmtRows = [];
      for (let i = startRow; i < endRow && i < rows.length; i++) {
        if (!isGarbageRow(rows[i]) && isAmountRow(rows[i])) allAmtRows.push(rows[i]);
      }
      allAmtRows.sort((a, b) => (a[0]?.y || 0) - (b[0]?.y || 0));
      const items = [], seen = new Set();
      allAmtRows.forEach((amtRow, gridRowIdx) => {
        if (gridRowIdx >= SNUH_GRID_MAP.length) return;
        const rowMap = SNUH_GRID_MAP[gridRowIdx];
        amtRow.forEach(it => {
          if (!/^-?[\d,.]+$/.test(it.str)) return;
          const col = findNearestSNUHCol(it.x + it.w / 2);
          const name = rowMap[col];
          if (!name || GRID_STATS_NAMES.has(name) || seen.has(name)) return;
          const amount = parseAmount(it.str);
          if (amount === 0) return;
          items.push({ name, amount, col, row: gridRowIdx });
          seen.add(name);
        });
      });
      return items;
    }

    const salaryAnchorRow = findAnchorRow(/기본기준급|기준기본급/);
    const deductionAnchorRow = findAnchorRow(/^소득세$/);

    debug('[PayslipParser] 앵커 행: 지급=' + salaryAnchorRow + ', 공제=' + deductionAnchorRow);

    // 글로벌 그리드: 지급 첫 이름행(항상 11열)으로 정의
    const globalGrid = salaryAnchorRow >= 0 ? buildGlobalGrid(rows[salaryAnchorRow]) : null;

    // ── 2-pass: 글로벌 그리드 기반으로 rawRows 재병합 ──
    // 1-pass에서 gap < WORD_GAP이면 무조건 병합했지만,
    // 다른 글로벌 열에 속하는 아이템은 gap이 작아도 분리해야 함
    // (예: 법정공휴일수당, 자기계발별정수당, 육아기근로시간단축 — gap 6.2~6.6pt)
    if (globalGrid) {
      rows = rawRows.map(row => {
        row.sort((a, b) => a.x - b.x);
        const merged = [];
        let cur = { str: row[0].str, x: row[0].x, y: row[0].y, w: row[0].w };
        for (let i = 1; i < row.length; i++) {
          const gap = row[i].x - (cur.x + cur.w);
          const curCol = findGlobalCol(globalGrid, cur.x + cur.w / 2);
          const nextCol = findGlobalCol(globalGrid, row[i].x + row[i].w / 2);
          // 누적된 cur이 단어 수준(≥15pt)이면 같은 열일 때만 병합
          // (개별 글자 w가 작아도, 이미 단어가 된 cur과 다른 열 글자는 분리)
          const curIsWord = cur.w > 15;
          if (gap < WORD_GAP && (!curIsWord || curCol === nextCol)) {
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
      // 2.5-pass: 단독 "-" + 숫자 병합 (PDF가 마이너스 부호를 별도 텍스트로 렌더링하는 경우)
      rows = rows.map(row => {
        const merged = [];
        for (let i = 0; i < row.length; i++) {
          if (row[i].str === '-' && i + 1 < row.length && /^[\d,]+$/.test(row[i + 1].str)) {
            merged.push({ str: '-' + row[i + 1].str, x: row[i].x, y: row[i].y, w: (row[i + 1].x + row[i + 1].w) - row[i].x });
            i++; // skip next
          } else {
            merged.push(row[i]);
          }
        }
        return merged;
      });
      debug('[PayslipParser] 2-pass 그리드 기반 재병합 완료: ' + rows.length + '행');

      // ── 3-pass: 패턴 기반 연결 항목명 분리 ──
      // 2-pass 후에도 여러 급여/공제 항목명이 하나로 붙어있으면
      // 알려진 패턴으로 분리하여 각각 올바른 x좌표 → 글로벌 열 매핑 복원
      const allKnownPatterns = SALARY_PATTERNS.concat(DEDUCTION_PATTERNS);
      // 패턴에서 실제 매칭용 문자열 추출 (긴 것 우선)
      const knownNames = allKnownPatterns
        .map(p => p.source.replace(/\\\(/g, '(').replace(/\\\)/g, ')'))
        .join('|').split('|')
        .filter(s => s.length >= 2 && !/[.*+?^${}[\]\\|]/.test(s)) // 순수 문자열만 (괄호는 허용)
        .sort((a, b) => b.length - a.length);
      // 괄호를 regex 이스케이프하여 리터럴 매칭
      const escaped = knownNames.map(s => s.replace(/[()]/g, c => '\\' + c));
      const splitItemRe = new RegExp('(' + escaped.join('|') + ')', 'g');

      let splitCount = 0;
      rows = rows.map(row => {
        const newRow = [];
        for (const item of row) {
          const name = item.str.trim();
          // 숫자만 있는 아이템은 건너뜀
          if (/^[\d,.]+$/.test(name)) { newRow.push(item); continue; }
          // 패턴 매칭으로 여러 항목명이 붙어있는지 확인
          const matches = name.match(splitItemRe);
          if (matches && matches.length > 1 && matches.join('') === name) {
            // 붙어있는 항목명을 분리 — 각각 x좌표를 균등 분배
            const unitW = item.w / matches.length;
            matches.forEach((m, idx) => {
              newRow.push({
                str: m,
                x: item.x + unitW * idx,
                y: item.y,
                w: unitW
              });
            });
            splitCount++;
            debug('[PayslipParser] 3-pass 분리: "' + name + '" → ' + JSON.stringify(matches));
          } else {
            newRow.push(item);
          }
        }
        return newRow;
      });
      if (splitCount > 0) {
        debug('[PayslipParser] 3-pass 패턴 기반 분리: ' + splitCount + '건 분리됨');
      }
    }

    let salaryItems = [];
    let salNameRows = [], salAmtRows = [];
    if (salaryAnchorRow >= 0 && globalGrid) {
      const salaryEnd = deductionAnchorRow >= 0 ? deductionAnchorRow : rows.length;
      const separated = separateAndMerge(salaryAnchorRow, salaryEnd);
      salNameRows = separated.nameRows;
      salAmtRows = separated.amtRows;
      debug('[PayslipParser] 지급 분리: 이름행 ' + salNameRows.length + ', 금액행 ' + salAmtRows.length);
      salaryItems = extractByGlobalGrid(globalGrid, salNameRows, salAmtRows);
      console.table(salaryItems.map(i => ({ 이름: i.name, 금액: i.amount, 열: i.col, 행: i.row })));
    }

    let deductionItems = [];
    let workStats = [];
    if (deductionAnchorRow >= 0 && globalGrid) {
      let deductionEnd = rows.length;
      let nonAmtCount = 0, foundFirstAmt = false;
      for (let i = deductionAnchorRow; i < rows.length; i++) {
        if (!isGarbageRow(rows[i]) && isAmountRow(rows[i])) { foundFirstAmt = true; nonAmtCount = 0; }
        else if (foundFirstAmt && !isGarbageRow(rows[i])) { nonAmtCount++; if (nonAmtCount >= 2) { deductionEnd = i - 1; break; } }
      }
      const separated = separateAndMerge(deductionAnchorRow, deductionEnd);
      debug('[PayslipParser] 공제 분리: 이름행 ' + separated.nameRows.length + ', 금액행 ' + separated.amtRows.length);
      deductionItems = extractByGlobalGrid(globalGrid, separated.nameRows, separated.amtRows);
      console.table(deductionItems.map(i => ({ 이름: i.name, 금액: i.amount, 열: i.col, 행: i.row })));
      // 근무시간 통계: 공제 섹션 col7-10에서 GRID_STATS_NAMES 항목 추출
      workStats = extractWorkStats(globalGrid, separated.nameRows, separated.amtRows);
      if (workStats.length > 0) {
        debug('[PayslipParser] 근무통계 추출: ' + workStats.length + '건');
        console.table(workStats.map(i => ({ 항목: i.name, 값: i.value, 열: i.col, 행: i.row })));
      }
    }

    // 0원 항목 제거 (음수는 유지: 무급가족돌봄휴가 등)
    salaryItems = salaryItems.filter(i => i.amount !== 0);
    deductionItems = deductionItems.filter(i => i.amount !== 0);

    // ── SNUH 고정 그리드 이름 보정 ──
    // amtRow[4]: 업무보조비(col5), 무급가족돌봄휴가(col8)는 이름행과 열이 어긋남
    // amtRow[5]: 진료기여수당(col0), 명절수당(col7)는 이름행과 열이 어긋남
    // → globalGrid가 잘못된 이름(같은 열의 다른 행 항목명)을 배정한 경우 SNUH_GRID_MAP으로 보정
    if (salAmtRows.length >= SNUH_GRID_MAP.length) {
      for (const r of [4, 5]) {
        if (r >= salAmtRows.length) continue;
        const rowMap = SNUH_GRID_MAP[r];
        const amtByCol = new Map();
        salAmtRows[r].forEach(it => {
          if (!/^-?[\d,.]+$/.test(it.str)) return;
          amtByCol.set(findNearestSNUHCol(it.x + it.w / 2), parseAmount(it.str));
        });
        for (let c = 0; c < rowMap.length; c++) {
          const canonicalName = rowMap[c];
          if (!canonicalName || GRID_STATS_NAMES.has(canonicalName) || GRID_SUMMARY_RE.test(canonicalName)) continue;
          const amount = amtByCol.get(c);
          if (!amount) continue;
          const idx = salaryItems.findIndex(i => i.row === r && i.col === c);
          if (idx >= 0 && salaryItems[idx].name !== canonicalName) {
            debug('[PayslipParser] SNUH이름보정: "' + salaryItems[idx].name + '" → "' + canonicalName + '" (행' + r + ',열' + c + ')');
            salaryItems[idx] = { name: canonicalName, amount, col: c, row: r };
          }
        }
      }
    }

    // ── 총액 추출: 글로벌 그리드로 급여총액/공제총액/실지급액 정확 매핑 ──
    let grossPay = 0, totalDeduction = 0, netPay = 0;

    if (globalGrid && salNameRows.length > 0 && salAmtRows.length > 0) {
      const summaryTargets = [
        { re: /급여총액/, set: v => { if (!grossPay) grossPay = v; } },
        { re: /공제총액/, set: v => { if (!totalDeduction) totalDeduction = v; } },
        { re: /실지급액/, set: v => { if (!netPay) netPay = v; } },
      ];
      for (let r = 0; r < Math.min(salNameRows.length, salAmtRows.length); r++) {
        salNameRows[r].forEach(nameItem => {
          const nameCol = findGlobalCol(globalGrid, nameItem.x + nameItem.w / 2);
          summaryTargets.forEach(target => {
            if (!target.re.test(nameItem.str)) return;
            salAmtRows[r].forEach(amtItem => {
              if (!/^-?[\d,]+$/.test(amtItem.str)) return;
              const amtCol = findGlobalCol(globalGrid, amtItem.x + amtItem.w / 2);
              if (amtCol === nameCol) target.set(parseAmount(amtItem.str));
            });
          });
        });
      }
    }

    // fallback: 항목 합산
    if (grossPay === 0) grossPay = salaryItems.reduce((s, i) => s + i.amount, 0);
    if (totalDeduction === 0) totalDeduction = deductionItems.reduce((s, i) => s + i.amount, 0);
    if (netPay === 0) netPay = grossPay - totalDeduction;

    // 총액 검증
    const calcGross = salaryItems.reduce((s, i) => s + i.amount, 0);
    const calcDed = deductionItems.reduce((s, i) => s + i.amount, 0);
    debug('[PayslipParser] 글로벌 그리드 매칭: 지급 ' + salaryItems.length + '건, 공제 ' + deductionItems.length + '건');
    debug('[PayslipParser] 총액 검증: 지급 ' + calcGross + '=' + grossPay + (Math.abs(calcGross - grossPay) <= 1 ? ' ✅' : ' ❌ 차이=' + (calcGross - grossPay)));
    debug('[PayslipParser] 총액 검증: 공제 ' + calcDed + '=' + totalDeduction + (Math.abs(calcDed - totalDeduction) <= 1 ? ' ✅' : ' ❌ 차이=' + (calcDed - totalDeduction)));
    debug('[PayslipParser] 총액: 급여=' + grossPay + ', 공제=' + totalDeduction + ', 실지급=' + netPay);

    // ── 신뢰도 점수 계산 ──
    function calcConfidence(opts) {
      let score = 0;
      if (opts.salaryAnchor) score += 20;
      if (opts.deductionAnchor) score += 10;
      if (opts.gridBuilt) score += 20;
      if (opts.salaryCount > 0) score += 15;
      if (opts.deductionCount > 0) score += 15;
      if (opts.grossMatch) score += 10;
      if (opts.deductionMatch) score += 10;
      return Math.min(score, 100);
    }

    const grossMatch = grossPay > 0 && Math.abs(calcGross - grossPay) <= 1;
    const dedMatch = totalDeduction > 0 && Math.abs(calcDed - totalDeduction) <= 1;
    const confidence = calcConfidence({
      salaryAnchor: salaryAnchorRow >= 0,
      deductionAnchor: deductionAnchorRow >= 0,
      gridBuilt: !!globalGrid,
      salaryCount: salaryItems.length,
      deductionCount: deductionItems.length,
      grossMatch,
      deductionMatch: dedMatch,
    });

    const buildParseInfo = (method, conf) => ({
      method,
      confidence: conf,
      gridCols: globalGrid ? globalGrid.length : 0,
      anchorFound: { salary: salaryAnchorRow >= 0, deduction: deductionAnchorRow >= 0 },
      grossDiff: calcGross - grossPay,
      deductionDiff: calcDed - totalDeduction,
    });

    debug('[PayslipParser] 신뢰도: ' + confidence + '/100 (method=globalGrid)');

    // ── fallback: 글로벌 그리드 매칭 실패 시 parsePDFText 시도 ──
    if (salaryItems.length === 0 && deductionItems.length === 0) {
      console.warn('[PayslipParser] 글로벌 그리드 매칭 실패 → parsePDFText fallback');
      const fallback = parsePDFText(fullText);
      fallback.employeeInfo = Object.keys(employeeInfo).length > 0 ? employeeInfo : fallback.employeeInfo;
      fallback.metadata = Object.keys(metadata).length > 0 ? metadata : fallback.metadata;
      fallback._parseInfo = buildParseInfo('textFallback', Math.min(confidence, 40));
      return fallback;
    }

    // 총액 불일치 시 parsePDFText fallback
    if (grossPay > 0 && Math.abs(calcGross - grossPay) > 50000) {
      console.warn('[PayslipParser] 총액 불일치(차이 ' + (calcGross - grossPay) + ') → parsePDFText fallback');
      const fallback = parsePDFText(fullText);
      const fbGross = fallback.salaryItems.reduce((s, i) => s + i.amount, 0);
      if (Math.abs(fbGross - grossPay) < Math.abs(calcGross - grossPay)) {
        fallback.employeeInfo = Object.keys(employeeInfo).length > 0 ? employeeInfo : fallback.employeeInfo;
        fallback.metadata = Object.keys(metadata).length > 0 ? metadata : fallback.metadata;
        fallback._parseInfo = buildParseInfo('textFallback', Math.min(confidence, 50));
        return fallback;
      }
    }

    return {
      employeeInfo,
      metadata,
      salaryItems,
      deductionItems,
      workStats,
      summary: { grossPay, totalDeduction, netPay },
      _parseInfo: buildParseInfo('globalGrid', confidence),
    };
  }

  // ── PDF 텍스트 → ParsedData ──
  // 토큰 순차 스캔: "항목명 → 바로 다음 숫자 토큰" 을 페어링
  function parsePDFText(text) {
    // 직원 정보 추출
    const info = {};
    const infoMatch = text.match(/개인번호\s+(\d+)/);
    if (infoMatch) info.employeeNumber = infoMatch[1];
    const nameMatch = text.match(/성\s*명\s+(\S+)/);
    if (nameMatch) info.name = nameMatch[1];
    const jobMatch = text.match(/직\s*종\s+(\S+)/);
    if (jobMatch) info.jobType = jobMatch[1];
    const gradeMatch = text.match(/((?:[SMJK]\d+|[가-힣]+\d*)\s*-\s*\d+)/);
    if (gradeMatch) info.payGrade = gradeMatch[1].replace(/\s/g, '');
    const deptMatch = text.match(/소\s*속\s+(\S+)/);
    if (deptMatch) info.department = deptMatch[1];
    const hireMatch = text.match(/입사(?:년월|일)\s+([\d][\d./-]+[\d])/);
    if (hireMatch) info.hireDate = hireMatch[1];

    // 기간 추출 (다양한 형식 지원)
    const metadata = {};
    const periodPatterns = [
      /(\d{4})년도?\s*(\d{1,2})월\s*분/,
      /(\d{4})년\s*(\d{1,2})월\s*급여/,
      /(\d{4})[-./](\d{1,2})\s*월?\s*분?\s*급여/,
      /급여\s*기간\s*:?\s*(\d{4})[-./\s]*(\d{1,2})/,
      /(\d{4})년\s*(\d{1,2})월/,
    ];
    for (const pat of periodPatterns) {
      const m = text.match(pat);
      if (m) {
        metadata.payPeriod = `${m[1]}년 ${m[2]}월분`;
        break;
      }
    }
    const datePatterns = [
      /급여지급일\s*:?\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/,
      /지급일\s*:?\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/,
      /지급\s*일자?\s*:?\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/,
    ];
    for (const pat of datePatterns) {
      const m = text.match(pat);
      if (m) {
        metadata.payDate = m[1].replace(/\./g, '-');
        break;
      }
    }

    // 총액 추출
    let grossPay = 0, totalDeduction = 0, netPay = 0;
    const grossM = text.match(/급여총액\s+([\d,]+)/);
    if (grossM) grossPay = parseAmount(grossM[1]);
    const deductM = text.match(/공제총액\s+([\d,]+)/);
    if (deductM) totalDeduction = parseAmount(deductM[1]);
    const netM = text.match(/실지급액\s+([\d,]+)/);
    if (netM) netPay = parseAmount(netM[1]);

    // ── 토큰 순차 스캔 ──
    const allPatterns = SALARY_PATTERNS.concat(DEDUCTION_PATTERNS);
    const summaryRe = new RegExp(
      SUMMARY_PATTERNS.total.source + '|' +
      SUMMARY_PATTERNS.deduction.source + '|' +
      SUMMARY_PATTERNS.netPay.source
    );

    // 토큰화: 괄호 포함 항목명을 하나로 유지
    const tokens = text.match(/\S+(?:\([^)]*\))?/g) || [];

    function isAmt(t) { return /^-?[\d,]+$/.test(t) && t.replace(/[-,]/g, '').length >= 4; }
    function matchP(t, pats) { return pats.some(function(p) { return p.test(t); }); }

    const salaryItems = [];
    const deductionItems = [];
    const seen = new Set();
    var idx = 0;

    while (idx < tokens.length) {
      var tok = tokens[idx];

      // 총액 레이블 건너뛰기
      if (summaryRe.test(tok)) { idx++; continue; }

      // 괄호 합성 토큰 시도 (예: "진료기여수당" + "(협진)")
      var mName = null, isSal = false, isDed = false;
      var combo = (idx + 1 < tokens.length && tokens[idx + 1].charAt(0) === '(')
        ? tok + tokens[idx + 1] : null;

      if (combo && matchP(combo, allPatterns)) {
        mName = combo; isSal = matchP(combo, SALARY_PATTERNS); isDed = matchP(combo, DEDUCTION_PATTERNS);
        idx++;
      } else if (matchP(tok, allPatterns) && !isAmt(tok)) {
        mName = tok; isSal = matchP(tok, SALARY_PATTERNS); isDed = matchP(tok, DEDUCTION_PATTERNS);
      }

      if (mName && !seen.has(mName)) {
        seen.add(mName);
        var amt = 0;
        for (var j = idx + 1; j <= Math.min(idx + 2, tokens.length - 1); j++) {
          if (isAmt(tokens[j])) { amt = parseAmount(tokens[j]); idx = j; break; }
          if (matchP(tokens[j], allPatterns)) break;
        }
        if (amt !== 0) {
          if (isSal) salaryItems.push({ name: mName, amount: amt });
          else if (isDed) deductionItems.push({ name: mName, amount: amt });
        }
      }
      idx++;
    }

    if (grossPay === 0) grossPay = salaryItems.reduce(function(s, i) { return s + i.amount; }, 0);
    if (totalDeduction === 0) totalDeduction = deductionItems.reduce(function(s, i) { return s + i.amount; }, 0);
    if (netPay === 0) netPay = grossPay - totalDeduction;

    return { employeeInfo: info, metadata, salaryItems, deductionItems, workStats: [], summary: { grossPay, totalDeduction, netPay } };
  }

  // ── 이미지 OCR 파싱 (Tesseract.js — lazy load) ──
  async function _loadTesseract() {
    if (typeof Tesseract !== 'undefined') return;
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('OCR 라이브러리 로드 실패. 네트워크를 확인해주세요.')); };
      document.head.appendChild(s);
    });
  }

  async function parseImage(file, onProgress) {
    await _loadTesseract();
    const imageUrl = URL.createObjectURL(file);
    try {
      const result = await Tesseract.recognize(imageUrl, 'kor+eng', {
        logger: m => {
          if (onProgress && m.status === 'recognizing text') {
            onProgress(Math.round(m.progress * 100));
          }
        }
      });
      const text = result.data.text;
      if (!text || text.trim().length < 20) {
        throw new Error('이미지에서 텍스트를 인식하지 못했습니다. 더 선명한 사진을 사용해주세요.');
      }
      return parsePDFText(text);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  // ── 메인 파싱 함수 ──
  const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'heic', 'heif'];

  async function parseFile(file, onProgress) {
    const ext = file.name.split('.').pop().toLowerCase();
    let result;
    if (ext === 'pdf') result = await parsePDF(file);
    else if (ext === 'xlsx' || ext === 'xls') result = await parseExcel(file);
    else if (ext === 'csv') result = await parseCSV(file);
    else if (IMAGE_EXTS.includes(ext)) result = await parseImage(file, onProgress);
    else throw new Error('지원하지 않는 파일 형식입니다. PDF, Excel, CSV, 또는 이미지 파일을 사용해주세요.');
    result.sourceFile = file.name;
    return result;
  }

  // ── localStorage 월별 저장/불러오기 ──
  function _payslipUid() {
    var settings = {};
    try { settings = JSON.parse(localStorage.getItem('snuhmate_settings') || '{}'); } catch (e) {}
    return settings.googleSub || 'guest';
  }

  function storageKey(year, month, type) {
    var uid = _payslipUid();
    var base = 'payslip_' + uid + '_' + year + '_' + String(month).padStart(2, '0');
    return (type && type !== '급여') ? base + '_' + type : base;
  }

  function saveMonthlyData(year, month, data, type, overwrite = false) {
    const key = storageKey(year, month, type);

    // 같은 월·같은 타입 데이터가 이미 있으면 항목 병합 (덮어쓰기 방지)
    // overwrite=true (수동 편집 저장) 이면 병합 없이 전체 교체
    const existing = overwrite ? null : loadMonthlyData(year, month, type);
    const merged = existing ? mergePayslipData(existing, data) : data;

    localStorage.setItem(key, JSON.stringify({ ...merged, savedAt: new Date().toISOString() }));

    // 사번 자동 채움: 프로필에 사번이 비어 있고 payslip에서 추출된 사번이 있으면 저장
    var empNum = merged && merged.employeeInfo && merged.employeeInfo.employeeNumber;
    if (empNum) {
      var current = PROFILE.load() || {};
      if (!current.employeeNumber) {
        PROFILE.save({ ...current, employeeNumber: String(empNum).trim() });
      }
    }

    // 급여 유형 저장 완료 시 ImprovementAgent 자동 실행
    if (!type || type === '급여') {
      if (typeof PayrollImprovementAgent !== 'undefined') {
        setTimeout(() => PayrollImprovementAgent.runOnActualUpload(year, month), 0);
      }
    }
  }

  // 같은 월 두 번째 PDF 업로드 시 항목 병합
  // next 항목이 prev 동명 항목을 덮어쓰고, prev 전용 항목도 보존
  // summary는 병합 결과로 재계산
  function mergePayslipData(prev, next) {
    const salaryMap = {};
    (prev.salaryItems || []).forEach(i => { salaryMap[i.name] = { ...i }; });
    (next.salaryItems || []).forEach(i => { salaryMap[i.name] = { ...i }; });

    const dedMap = {};
    (prev.deductionItems || []).forEach(i => { dedMap[i.name] = { ...i }; });
    (next.deductionItems || []).forEach(i => { dedMap[i.name] = { ...i }; });

    // 근무통계: next가 더 최신이므로 next 우선 (없으면 prev 유지)
    const statsMap = {};
    (prev.workStats || []).forEach(i => { statsMap[i.name] = { ...i }; });
    (next.workStats || []).forEach(i => { statsMap[i.name] = { ...i }; });

    const salaryItems = Object.values(salaryMap);
    const deductionItems = Object.values(dedMap);
    const workStats = Object.values(statsMap);
    const grossPay = salaryItems.reduce((s, i) => s + (i.amount || 0), 0);
    const totalDeduction = deductionItems.reduce((s, i) => s + (i.amount || 0), 0);

    // employeeInfo: 2회차 PDF가 일부 필드를 놓쳐도 1회차 값이 살아남도록 필드별 fallback
    const prevInfo = prev.employeeInfo || {};
    const nextInfo = next.employeeInfo || {};
    const employeeInfo = { ...prevInfo };
    Object.keys(nextInfo).forEach(k => {
      if (nextInfo[k]) employeeInfo[k] = nextInfo[k];
    });

    return {
      ...prev,
      ...next,
      employeeInfo,
      salaryItems,
      deductionItems,
      workStats,
      summary: { grossPay, totalDeduction, netPay: grossPay - totalDeduction },
      mergedAt: new Date().toISOString(),
    };
  }

  function loadMonthlyData(year, month, type) {
    const key = storageKey(year, month, type);
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }

  function listSavedMonths() {
    var uid = _payslipUid();
    var prefix = 'payslip_' + uid + '_';
    var months = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      var rest = k.slice(prefix.length);
      var m = rest.match(/^(\d{4})_(\d{2})(?:_(.+))?$/);
      if (m) months.push({ year: parseInt(m[1]), month: parseInt(m[2]), type: m[3] || '급여', key: k });
    }
    return months.sort(function(a, b) {
      return b.year - a.year || b.month - a.month ||
        (a.type === '급여' ? -1 : b.type === '급여' ? 1 : 0);
    });
  }

  // 편집 저장 전용: merge 없이 전체 교체
  function replaceMonthlyData(year, month, data, type) {
    const key = storageKey(year, month, type);
    localStorage.setItem(key, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
  }

  function deleteMonthlyData(year, month, type) {
    const key = storageKey(year, month, type);
    localStorage.removeItem(key);
  }

  // ── 기간 문자열에서 연/월 파싱 ──
  function parsePeriodYearMonth(data) {
    const period = data.metadata?.payPeriod || '';
    const m = period.match(/(\d{4})년\s*(\d{1,2})월/);
    const type = data.metadata?.payslipType || '급여';
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]), type };
    // fallback: payDate
    const d = data.metadata?.payDate || '';
    const dm = d.match(/(\d{4})-(\d{2})/);
    if (dm) return { year: parseInt(dm[1]), month: parseInt(dm[2]), type };
    return null;
  }

  // ── 프로필 자동 반영 (안정적 항목만 + 가족수당) ──
  function applyStableItemsToProfile(data) {
    const profile = PROFILE.load() || {};
    let changed = false;
    const applied = [];

    data.salaryItems.forEach(item => {
      const profileKey = PAYSLIP_TO_PROFILE_MAP[item.name];
      if (profileKey && item.amount > 0) {
        const oldVal = profile[profileKey] || 0;
        profile[profileKey] = item.amount;
        changed = true;
        if (oldVal !== item.amount) {
          applied.push({ name: item.name, amount: item.amount, note: oldVal ? `${oldVal.toLocaleString()}→${item.amount.toLocaleString()}` : '자동입력' });
        }
      }
    });

    // 직원 정보 반영 (입사일/부서/직종/사번/직급/호봉) — 명세서가 source of truth.
    // 명세서 값이 있으면 항상 최신화 (부서 이동, 승급 등 반영). 이름/사번은 신규 생성 시만 — 오탈자 보호.
    const ei = data.employeeInfo || {};
    if (ei.hireDate && profile.hireDate !== ei.hireDate) { profile.hireDate = ei.hireDate; changed = true; applied.push({ name: '입사일', amount: 0, note: ei.hireDate }); }
    if (ei.department && profile.department !== ei.department) { profile.department = ei.department; changed = true; applied.push({ name: '부서', amount: 0, note: ei.department }); }
    if (ei.jobType) {
      // 명세서의 raw jobType (예: '간호', '보건') 을 앱 내부 표준 ('간호직', '보건직') 으로 매핑
      const jobTypeMap = { '간호': '간호직', '보건': '보건직', '약무': '약무직', '의료기사': '의료기사직', '의사': '의사직', '사무': '사무직', '기능': '기능직', '시설': '시설직', '환경미화': '환경미화직', '지원': '지원직' };
      let mappedJobType = ei.jobType;
      for (const [keyword, jt] of Object.entries(jobTypeMap)) {
        if (ei.jobType.includes(keyword)) { mappedJobType = jt; break; }
      }
      if (profile.jobType !== mappedJobType) { profile.jobType = mappedJobType; changed = true; applied.push({ name: '직종', amount: 0, note: mappedJobType }); }
    }
    if (ei.employeeNumber && !profile.employeeNumber) { profile.employeeNumber = String(ei.employeeNumber).trim(); changed = true; }
    if (ei.name && !profile.name) { profile.name = ei.name; changed = true; }

    // payGrade → grade/year 파싱 (예: "J3-5" → grade='J3', year=5)
    if (ei.payGrade) {
      const gm = String(ei.payGrade).match(/([A-Za-z]+\d*)\s*-\s*(\d+)/);
      if (gm) {
        const newGrade = gm[1].toUpperCase();
        const newYear = parseInt(gm[2], 10) || 1;
        if (profile.grade !== newGrade) { profile.grade = newGrade; changed = true; applied.push({ name: '직급', amount: 0, note: newGrade }); }
        if (profile.year !== newYear) { profile.year = newYear; changed = true; applied.push({ name: '호봉', amount: 0, note: String(newYear) }); }
      }
    }

    // 가족수당 관련 항목 자동 반영
    const payslipMap = {};
    data.salaryItems.forEach(item => { payslipMap[item.name] = item.amount; });

    // 6세이하자녀수당: 직접 금액 반영
    const under6Names = ['6세이하자녀수당', '6세이하 자녀수당', '영유아보육수당'];
    for (const name of under6Names) {
      if (payslipMap[name] && payslipMap[name] > 0) {
        profile.childrenUnder6Pay = payslipMap[name];
        changed = true;
        applied.push({ name, amount: payslipMap[name] });
        break;
      }
    }

    // 가족수당 총액에서 가족 수/자녀 수 역산
    const familyPayNames = ['가족수당'];
    for (const name of familyPayNames) {
      if (payslipMap[name] && payslipMap[name] > 0) {
        const totalFamilyPay = payslipMap[name];
        const estimated = estimateFamilyFromPay(totalFamilyPay);
        if (estimated) {
          profile.numFamily = estimated.numFamily;
          profile.numChildren = estimated.numChildren;
          changed = true;
          applied.push({ name, amount: totalFamilyPay, note: `가족${estimated.numFamily}·자녀${estimated.numChildren} 추정` });
        } else {
          // 역산 실패해도 금액은 저장 → 급여 예상에서 활용
          profile.familyAllowancePay = totalFamilyPay;
          changed = true;
          applied.push({ name, amount: totalFamilyPay, note: '⚠️ 가족수/자녀수 자동추정 실패 — 내 정보에서 직접 입력해주세요' });
        }
        break;
      }
    }

    if (changed) {
      PROFILE.save(profile);
      PROFILE.applyToForm(profile, PROFILE_FIELDS);
      // 가족수당 필드도 직접 세팅 (PROFILE_FIELDS에 없을 수 있으므로)
      const directSets = [
        ['pfFamily', profile.numFamily],
        ['pfChildren', profile.numChildren],
        ['pfChildrenUnder6Pay', profile.childrenUnder6Pay],
      ];
      directSets.forEach(([id, val]) => {
        if (val != null) {
          const el = document.getElementById(id);
          if (el) el.value = val;
        }
      });
      if (typeof toggleChildFields === 'function') toggleChildFields();
    }

    // Phase 4-A: 명세서 시계열 → 근무이력 자동 시드 (mode='replace' 만 자동 쓰기)
    // Phase 5: window 가드 제거 — named import 으로 보장
    try {
      const existing = _loadWorkHistory();
      const result = rebuildWorkHistoryFromPayslips({
        profile, existing, hospital: profile.hospital || '서울대학교병원',
      });
      if (result.mode === 'replace') {
        _saveWorkHistory(result.records);
        renderWorkHistory();
      } else if (result.mode === 'banner') {
        _showWorkHistoryUpdateBanner(result.segments);
      }
    } catch (e) {
      console.warn('[Phase 4-A] rebuild work history failed:', e);
    }

    return { changed, applied };
  }

  // 가족수당 총액에서 가족 수/자녀 수 역산
  function estimateFamilyFromPay(totalPay) {
    if (!totalPay || totalPay <= 0) return null;
    const fa = DATA ? DATA.familyAllowance : null;
    if (!fa) return null;

    // 경우의 수를 brute-force로 탐색 (가족 0~5, 자녀 0~5)
    let bestMatch = null;
    let bestDiff = Infinity;
    for (let fam = 0; fam <= 5; fam++) {
      for (let ch = 0; ch <= 5; ch++) {
        let calc = 0;
        if (fam >= 1) calc += fa.spouse;
        if (fam >= 2) calc += fa.generalFamily * (fam - 1);
        for (let i = 1; i <= ch; i++) {
          if (i === 1) calc += fa.child1;
          else if (i === 2) calc += fa.child2;
          else calc += fa.child3Plus;
        }
        const diff = Math.abs(calc - totalPay);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMatch = { numFamily: fam, numChildren: ch, calc };
        }
      }
    }
    // 1000원 이내 오차면 매칭 성공
    if (bestMatch && bestDiff <= 1000) return bestMatch;
    return null;
  }

  // ── 앱 계산값과 비교 ──
  function compareWithApp(parsedData) {
    const profile = PROFILE.load();
    if (!profile || !profile.jobType) return null;

    // Plan F Bug #4: CALC.calcServiceYears 미존재 → PROFILE.calcServiceYears 로 정정
    const serviceYears = PROFILE.calcServiceYears
      ? PROFILE.calcServiceYears(profile.hireDate)
      : 0;
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

    // 통상임금 합계 비교: 명세서 항목 중 통상임금(breakdown)에 해당하는 것만 합산
    const ordinaryNames = new Set(Object.keys(appWage.breakdown));
    let payslipOrdinarySum = 0;
    parsedData.salaryItems.forEach(item => {
      if (ordinaryNames.has(item.name)) payslipOrdinarySum += item.amount;
    });
    comparison.push({
      name: '📊 통상임금 합계',
      payslip: payslipOrdinarySum,
      app: appWage.monthlyWage,
      diff: payslipOrdinarySum - appWage.monthlyWage,
      isTotal: true,
    });

    return { comparison, appWage };
  }

  // ── Phase 4-A: 명세서 시계열 → 근무이력 자동 시드 ──────────────────────
  //
  // 부서명 정규화 (variants 통합) — segment 키 비교 시 사용
  const DEPT_ALIAS = {
    '간호본부': '간호본부', '간호부': '간호본부',
  };
  function normalizeDept(dept) {
    if (!dept) return '';
    const trimmed = String(dept).trim().normalize('NFKC');
    return DEPT_ALIAS[trimmed] || trimmed;
  }

  // type 화이트리스트: 일반 월급만 segment 입력. 보너스/성과급/세금 제외.
  const PAYSLIP_TYPE_WHITELIST = new Set(['급여']);

  // 명세서 시간순 정렬 → dept run-length encoding → segment 분할
  function _buildSegmentsFromPayslips(profile) {
    profile = profile || {};
    const inv = listSavedMonths();
    const now = new Date();
    const curYM = now.getFullYear() * 100 + (now.getMonth() + 1);
    const payslips = inv
      .map(m => Object.assign({}, m, { data: loadMonthlyData(m.year, m.month, m.type) }))
      .filter(m => m.data && m.data.employeeInfo && m.data.employeeInfo.department)
      .filter(m => PAYSLIP_TYPE_WHITELIST.has(m.type))
      .filter(m => (m.year * 100 + m.month) <= curYM)
      .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));

    const segments = [];
    let cur = null;
    for (const p of payslips) {
      const dept = p.data.employeeInfo.department;
      const deptKey = normalizeDept(dept);
      const fromYMD = p.year + '-' + String(p.month).padStart(2, '0') + '-01';
      if (!cur || cur.deptKey !== deptKey) {
        if (cur) segments.push(cur);
        cur = {
          deptKey, dept, from: fromYMD, to: '',
          jobType: p.data.employeeInfo.jobType || '',
          payslips: [p],
        };
      } else {
        cur.payslips.push(p);
      }
    }
    if (cur) segments.push(cur);

    // 입사일 우선
    if (profile.hireDate && segments.length > 0 && profile.hireDate < segments[0].from) {
      segments[0].from = profile.hireDate;
    }

    // segment.to 계산: 다음 segment.from 의 전월 말일
    for (let i = 0; i < segments.length - 1; i++) {
      const next = segments[i + 1];
      const parts = next.from.split('-').map(Number);
      const prevMonth = new Date(parts[0], parts[1] - 1, 0);   // day=0 → 전월 말일
      segments[i].to = prevMonth.getFullYear() + '-'
        + String(prevMonth.getMonth() + 1).padStart(2, '0') + '-'
        + String(prevMonth.getDate()).padStart(2, '0');
    }

    return segments;
  }

  // 보호 정책:
  //   existing 에 source='user' record ≥ 1 → mode='banner' (데이터 보존, 알림만)
  //   모두 'auto' 또는 빈 list → mode='replace' (자동 덮어쓰기 OK)
  //   명세서 0개 → mode='empty'
  function rebuildWorkHistoryFromPayslips(opts) {
    opts = opts || {};
    const profile = opts.profile || {};
    const existing = opts.existing || [];
    const hospital = opts.hospital || '서울대학교병원';

    const segments = _buildSegmentsFromPayslips(profile);

    if (segments.length === 0) {
      return { mode: 'empty', segments: [], existing };
    }

    const hasUserRecord = existing.some(r => (r.source || 'user') === 'user');
    if (hasUserRecord) {
      return { mode: 'banner', segments, existing };
    }

    const records = segments.map((s, i) => ({
      id: Date.now().toString(36) + '_' + i + '_auto',
      workplace: hospital,
      dept: s.dept,
      from: s.from,
      to: s.to,
      role: s.jobType || '',
      desc: '명세서 자동',
      rotations: [],
      source: 'auto',
      updatedAt: new Date().toISOString(),
    }));
    return { mode: 'replace', records, segments, existing };
  }

  return {
    parseFile,
    saveMonthlyData,
    replaceMonthlyData,
    loadMonthlyData,
    deleteMonthlyData,
    listSavedMonths,
    parsePeriodYearMonth,
    applyStableItemsToProfile,
    compareWithApp,
    parsePDFText,
    parseImage,
    // Phase 4-A
    normalizeDept,
    _buildSegmentsFromPayslips,
    rebuildWorkHistoryFromPayslips,
  };
})();

// Phase 5: window.SALARY_PARSER 호환층 (Phase 3-F KEEP) — HTML inline / data-action 위임 호환
if (typeof window !== 'undefined') {
  window.SALARY_PARSER = SALARY_PARSER;
}
