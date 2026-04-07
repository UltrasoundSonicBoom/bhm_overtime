
import type { ExcelSheetData, ParsedInternalData, PayrollItem, EmployeeInfo, PayrollSummary, FormattedPayrollResult } from '../types';

declare var XLSX: any; // XLSX is expected to be loaded from CDN

// PayrollParser is designed for extensibility and accuracy:
// 1. Pattern Updates: New salary/deduction items can be added by updating `salaryPatterns` and `deductionPatterns`.
// 2. Layout Change Response: 
//    - It first tries a "fixed-block" extraction using flexible anchors for known layouts. (PRIMARY STRATEGY)
//    - If that fails, it uses "dynamic start point detection" (`extractItemsDynamically`) for item/amount blocks. (SECONDARY - CURRENTLY COMMENTED OUT FOR FOCUSED TESTING)
//    - A final `fallbackItemExtraction` provides a last resort. (TERTIARY - CURRENTLY COMMENTED OUT FOR FOCUSED TESTING)
// 3. Verification System: Summary totals are extracted and also calculated from items, then reconciled for accuracy.
export class PayrollParser {
  private salaryPatterns: RegExp[];
  private deductionPatterns: RegExp[];
  private amountPattern: RegExp;
  private summaryPatterns: { total: RegExp; deduction: RegExp; netPay: RegExp };

  // Define offsets and dimensions for fixed blocks relative to anchors
  // For Salary block (anchor: "기본기준급")
  private SALARY_ANCHOR_TEXT = /기본기준급/;
  private SALARY_NAME_ROW_COUNT = 6; // e.g., rows 5-10
  private SALARY_AMOUNT_ROW_OFFSET = 6; // Amounts start 6 rows after name anchor row (e.g., if names start row 5, amounts start row 11)
  private SALARY_AMOUNT_ROW_COUNT = 6; // e.g., rows 11-16 for amounts
  private SALARY_COL_COUNT = 28; // Approx C to AD (cols 2 to 29 inclusive -> 28 columns wide starting from anchor col)

  // For Deduction block (anchor: "소득세")
  private DEDUCTION_ANCHOR_TEXT = /소득세/;
  private DEDUCTION_NAME_ROW_COUNT = 6; // e.g., rows 18-23
  private DEDUCTION_AMOUNT_ROW_OFFSET = 6; // Amounts start 6 rows after name anchor row (e.g., if names start row 18, amounts start row 24)
  private DEDUCTION_AMOUNT_ROW_COUNT = 5; // Deductions have 5 rows of amounts in example (e.g., rows 24-28)
  private DEDUCTION_COL_COUNT = 20; // Approx C to V (cols 2 to 21 inclusive -> 20 columns wide starting from anchor col)


  constructor() {
    // Comprehensive patterns for salary items. Add new regex here for new item types.
    this.salaryPatterns = [
      // 기본급여 관련
      /기본기준급|기본급|기준급/, /근속가산기본급|근속가산/, /능력급/, /상여금|정기상여/, /특별상여금/, /가계지원비/,
      // 수당 관련
      /정근수당|근무수당/, /명절지원비|명절휴가비|명절수당/, /의업수당|의료수당/, /진료수당/, /임상연구비|연구활동비/, /연구실습비/,
      // 보조/지원 관련
      /연구보조비/, /의학연구비/, /진료비보조/, /교통보조비|교통비/, /급식보조비|식대보조비|중식보조비|식비/, /업무보조비/,
      // 기여수당 관련
      /진료기여수당\(협진\)/, /진료기여수당\(토요진료\)/, /진료기여수당/, /보직교수기여수당/,
      // 기타수당 관련
      /성과급|인센티브/, /기타수당|제수당/, /조정급|조정수당/, /직책수당|직무수당|보직수당/, /선택진료수당/, /별정수당\(직무\)/, /승급호봉분/,
      /연구장려수당|연구수당/, /경력인정수당/, /장기근속수당/, /진료지원수당/, /의학연구지원금/, /원외근무수당/,
      /시간외수당|시간외근무수당/, /야간근무가산|야간수당/, /야간근무가산금/, /당직비|숙직비/, /기타지급\d?/, /대체근무가산금/, /휴일수당|휴일근무수당/, /주치의수당/, /대체근무 통상야근수당/,
      /별정수당\(약제부\+\w*\)/, /별정수당\(약제\)/, /군복무수당/, /간호간병특별수당/, /통상야간/, /산전후보전급여/, /육아휴직수당/, /연차수당|연차보상비/,
      /가족수당/, /연차보전수당/, /법정공휴일수당/, /자격수당/, /학술수당/, /학비보조/, /포상금/, /성과연봉/, /격려금/, /기술수당/,
      /육아기근로시간단축/, /무급난임휴가/, /무급생휴공제/
    ];

    // Comprehensive patterns for deduction items. Add new regex here for new item types.
    this.deductionPatterns = [
      // 세금 관련
      /소득세/, /주민세|지방소득세/, /농특세|농어촌특별세/, /소득세\(정산\)/, /주민세\(정산\)|지방소득세\(정산\)/, /농특세\(정산\)/,
      // 4대보험 관련
      /국민건강|건강보험료?/, /장기요양|장기요양보험료?/, /국민연금|연금보험료?/, /고용보험|고용보험료?/,
      /국민건강\(정산\)|건강보험료?\(정산\)/, /장기요양\(정산\)|장기요양보험료?\(정산\)/, /국민연금\(정산\)|연금보험료?\(정산\)/, /고용보험\(정산\)|고용보험료?\(정산\)/,
      // 교원/연금 관련
      /교원장기급여|장기저축급여/, /교원대출상환/, /사학연금부담금|사학연금개인부담금/, /사학연금대여상환금/, /사학연금정산금/,
      // 기타 공제
      /장학지원금공제|장학회비/, /노동조합비|조합비/, /노조기금/, /후원회비|후원금/, /의국비|동문회비/, /주차료|주차비/, /상조회비/,
      /마을금고상환|금고상환/, /기숙사비/, /채권가압류|가압류/, /보육료/, /병원발전기금|발전기금/, /전공의협회비/,
      /전공의동창회비/, /기금출연금/, /식대공제|식비공제/, /대학학자금대출상환|학자금상환/, /기타공제\d?/,
      /전공의협의회비/, /의사협회비/, /기금협의회비/, /무급생휴공제/, /경조회비/, /대출금상환/, /사우회비/, /소모임회비/,
      /무급가족돌봄휴가/, /총근로시간/, /시간외근무시간/, /야간근무가산횟수/, /무급생휴일/, /통상근로시간/, /휴일근무시간/, /대체근무가산횟수/,
      /지급연차갯수/, /야간근로시간/, /야간근무시간/, /대체근무통상야근시간/, /사용연차/, /주휴시간/, /통상야근시간/, /발생연차/,
      /유급휴일/, /명절근무시간/, /법정공휴일근무시간/
    ];
    
    this.amountPattern = /^[\d,]+$/; // Matches numbers with commas, no decimals for typical payroll amounts
    
    // Patterns for summary labels
    this.summaryPatterns = {
      total: /급여총액|총지급액|지급총액|총급여|급여계|지급계|합계/,
      deduction: /공제총액|총공제액|공제계|차감총액/,
      netPay: /실지급액|차인지급액|실수령액|실급여/
    };
  }

  private parseAmount(amountStr: string | number | null): number {
    if (typeof amountStr === 'number') return amountStr;
    if (typeof amountStr === 'string') {
        const cleanedStr = amountStr.replace(/,/g, '');
        const num = parseInt(cleanedStr, 10);
        return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  public async parseFile(file: File): Promise<ParsedInternalData> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      return this.parseCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      return this.parseExcel(file);
    } else {
      throw new Error('지원하지 않는 파일 형식입니다. CSV 또는 XLSX 파일을 사용해주세요.');
    }
  }

  private async parseExcel(file: File): Promise<ParsedInternalData> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data: ExcelSheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', rawNumbers: false });
    
    return this.analyzeExcelStructure(data);
  }

  private async parseCSV(file: File): Promise<ParsedInternalData> {
    const text = await file.text();
    const lines = text.split(/[\r\n]+/).filter(line => line.trim() !== '');
    const cleanedLines: ExcelSheetData = lines
      .map(line => line.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1')));
    return this.analyzeExcelStructure(cleanedLines);
  }
  
  private analyzeExcelStructure(data: ExcelSheetData): ParsedInternalData {
    const result: ParsedInternalData = {
      employeeInfo: {},
      salaryItems: [],
      deductionItems: [],
      summary: { grossPay: 0, totalDeduction: 0, netPay: 0 },
      metadata: {}
    };

    result.employeeInfo = this.extractEmployeeInfoFromExcel(data);
    result.salaryItems = this.extractSalaryItemsFromExcel(data);
    result.deductionItems = this.extractDeductionItemsFromExcel(data);
    
    const extractedSummary = this.extractSummaryFromExcel(data);
    const calculatedSummary = this.calculateSummary(result.salaryItems, result.deductionItems);
    // Use a tolerance for comparing extracted vs calculated summary to account for minor discrepancies or rounding.
    // Allow extracted if it's non-zero and reasonably close to calculated. Otherwise, prefer calculated.
    const tolerance = Math.max(1, calculatedSummary.grossPay * 0.05); // 5% tolerance or at least 1 unit

    result.summary.grossPay = (extractedSummary.grossPay !== 0 && Math.abs(extractedSummary.grossPay - calculatedSummary.grossPay) < tolerance) 
                               ? extractedSummary.grossPay 
                               : calculatedSummary.grossPay;
    result.summary.totalDeduction = (extractedSummary.totalDeduction !== 0 && Math.abs(extractedSummary.totalDeduction - calculatedSummary.totalDeduction) < tolerance) 
                                     ? extractedSummary.totalDeduction 
                                     : calculatedSummary.totalDeduction;
    // Net pay should always be derived from the chosen gross and deduction
    result.summary.netPay = result.summary.grossPay - result.summary.totalDeduction;

    result.summary.calculatedGrossPay = calculatedSummary.grossPay;
    result.summary.calculatedTotalDeduction = calculatedSummary.totalDeduction;
    result.summary.calculatedNetPay = calculatedSummary.netPay;
    result.metadata = this.extractMetadataFromExcel(data);

    return result;
  }

  private extractEmployeeInfoFromExcel(data: ExcelSheetData): EmployeeInfo {
    const info: EmployeeInfo = {};
    const labelsAndProps: [RegExp, keyof EmployeeInfo, (val: string | number | Date | null) => string][] = [
        [/개인번호|사원번호/, 'employeeNumber', val => String(val ?? '').trim()],
        [/성\s*명|이름/, 'name', val => String(val ?? '').trim()],
        [/직\s*종|직책/, 'jobType', val => String(val ?? '').trim()],
        [/소\s*속|부서/, 'department', val => String(val ?? '').trim()],
        [/급여연차|호봉|직급/, 'payGrade', val => String(val ?? '').trim()],
        [/입사년월|입사일/, 'hireDate', val => {
            if (val instanceof Date) {
              // Format date as YYYY-MM-DD
              const year = val.getFullYear();
              const month = (val.getMonth() + 1).toString().padStart(2, '0');
              const day = val.getDate().toString().padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
            if (val === null || typeof val === 'undefined') return '';
            // Handle numeric date from Excel (days since 1900 or 1904)
            if (typeof val === 'number') {
                try {
                    // XLSX.SSF.parse_date_code is not available on the global XLSX object from CDN directly
                    // We might need a different way or assume cellDates:true worked if it's a Date object
                    // For now, if it's a number, convert to string. If cellDates:true works, it will be Date.
                     const date = XLSX.SSF.parse_date_code(val); // This might fail if SSF is not on XLSX from CDN
                     if (date && date.y && date.m && date.d) { // Check for valid date parts
                        const year = date.y;
                        const month = (date.m).toString().padStart(2, '0');
                        const day = date.d.toString().padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                } catch (e) { /* ignore if not a valid Excel date number or SSF is not available */ }
            }
            return String(val).trim();
        }],
    ];

    for (let i = 0; i < Math.min(10, data.length); i++) { // Search in first 10 rows
      const row = data[i];
      if (!row) continue;
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim();
        labelsAndProps.forEach(([regex, key, formatter]) => {
            if (regex.test(cell) && !info[key]) { // Take the first match only
                // Check cell j+1 first, then j+2 for the value
                const valueCell1 = row[j+1];
                if (j + 1 < row.length && valueCell1 != null && String(valueCell1).trim() !== '') {
                    info[key] = formatter(valueCell1);
                } else {
                    const valueCell2 = row[j+2]; 
                    if (j + 2 < row.length && valueCell2 != null && String(valueCell2).trim() !== ''){
                         info[key] = formatter(valueCell2);
                    }
                }
            }
        });
      }
    }
    return info;
  }

  private extractMetadataFromExcel(data: ExcelSheetData): { payPeriod?: string; payDate?: string } {
    const metadata: { payPeriod?: string; payDate?: string } = {};
    for (let i = 0; i < Math.min(5, data.length); i++) { // Search in first 5 rows
      const row = data[i];
      if (!row) continue;
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim();
        
        if (!metadata.payPeriod && cell && (cell.includes('년') || cell.includes('연도')) && cell.includes('월분')) {
          metadata.payPeriod = cell;
        }
        if (!metadata.payDate && (cell.includes('급여지급일') || cell.includes('지급일'))) {
           // Try to extract from the same cell or adjacent cells
           const potentialDateCells = [cell, String(row[j+1] || ''), String(row[j+2] || '')];
           for (const pCell of potentialDateCells) {
               const cleanedCell = pCell.replace(/(급여)?지급일\s*:\s*/i, '').trim();
               // Regex for YYYY.MM.DD or YYYY-MM-DD or YYYY/MM/DD
               if (/\d{4}[-./\s]+\d{1,2}[-./\s]+\d{1,2}/.test(cleanedCell)) { 
                   // Normalize to YYYY-MM-DD
                   const dateMatch = cleanedCell.match(/(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})/);
                   if (dateMatch) {
                       metadata.payDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
                       break;
                   }
               }
           }
        }
      }
    }
    return metadata;
  }

  private isItemName(text: string | number | null | Date, patterns: RegExp[]): boolean {
    if (text instanceof Date) return false;
    if (text === null || typeof text === 'undefined') return false;
    const trimmedText = String(text).trim();
    if (trimmedText === '' || this.isAmount(trimmedText)) return false; 
    // Exclude common section headers that are not specific items
    if (/^지급$|^공제$|^내역$|^항목$|^금액$|^구분$|^계$/.test(trimmedText)) return false; 
    return patterns.some(pattern => pattern.test(trimmedText));
  }

  private isSalaryItem(text: string | number | null | Date): boolean {
    return this.isItemName(text, this.salaryPatterns);
  }

  private isDeductionItem(text: string | number | null | Date): boolean {
    return this.isItemName(text, this.deductionPatterns);
  }
  
  private isAmount(value: string | number | null | Date): boolean {
    if (value instanceof Date) return false;
    if (value === null || typeof value === 'undefined') return false;
    const cleaned = String(value).trim();
    // Allows only digits and commas, and must not contain a decimal point.
    return this.amountPattern.test(cleaned) && !cleaned.includes('.') && cleaned.length >= 1;
  }
  
  private findCellPosition(data: ExcelSheetData, searchText: RegExp, searchRowsMax: number = 25): {row: number, col: number} | null {
    for (let r = 0; r < Math.min(searchRowsMax, data.length); r++) {
        if (!data[r]) continue;
        for (let c = 0; c < data[r].length; c++) {
            if (data[r][c] && searchText.test(String(data[r][c]))) {
                return {row: r, col: c};
            }
        }
    }
    return null;
  }

  // Strategy 1: Extracts items based on fixed row/column blocks, relative to a found anchor.
  private extractFixedBlockItems(
    data: ExcelSheetData,
    itemTypeCheck: (text: string | number | null | Date) => boolean,
    anchor: {row: number, col: number}, // Position of the anchor item (e.g., "기본기준급")
    nameRowCount: number, // Number of rows in the name block
    amountRowOffset: number, // Offset from anchor's row to the start of amount block
    amountRowCountInBlock: number, // Number of rows in the amount block (used to check if rOffset is within this)
    scanWidth: number // Number of columns to scan starting from anchor's column
  ): PayrollItem[] {
      const items: PayrollItem[] = [];
      const nameBlockStartRow = anchor.row;
      const amountBlockStartRow = anchor.row + amountRowOffset;
      const scanStartCol = anchor.col;

      for (let rOffset = 0; rOffset < nameRowCount; rOffset++) {
          const currentItemNameRow = nameBlockStartRow + rOffset;
          if (currentItemNameRow >= data.length || !data[currentItemNameRow]) continue;

          for (let cOffset = 0; cOffset < scanWidth; cOffset++) {
              const currentCol = scanStartCol + cOffset;
              // Ensure not reading past the end of the current row for item names
              if (currentCol >= data[currentItemNameRow].length) continue; 

              const itemNameCell = data[currentItemNameRow][currentCol];

              if (itemTypeCheck(itemNameCell)) {
                  const itemName = String(itemNameCell).trim();
                  let amountStr = "0";
                  let numericAmount = 0;

                  // Check if this relative row offset for names is within the expected number of amount rows
                  // This ensures we only look for amounts if the current name's row has a corresponding amount row
                  if (rOffset < amountRowCountInBlock) { 
                      const correspondingAmountValueRow = amountBlockStartRow + rOffset;
                      if (correspondingAmountValueRow < data.length &&
                          data[correspondingAmountValueRow] &&
                          currentCol < data[correspondingAmountValueRow].length) { // Ensure not reading past end of amount row
                          
                          const amountCell = data[correspondingAmountValueRow][currentCol];
                          if (this.isAmount(amountCell)) {
                              amountStr = String(amountCell).trim();
                              numericAmount = this.parseAmount(amountStr);
                          }
                      }
                  }
                  
                  // Add item if name is valid. This includes items with 0 amount if their corresponding amount cell was empty or invalid.
                  items.push({
                      name: itemName,
                      amount: amountStr, // Store the string representation (or "0")
                      numericAmount: numericAmount,
                      position: { row: currentItemNameRow, col: currentCol }
                  });
              }
          }
      }
      
      const uniqueNames = new Set<string>();
      return items.filter(item => {
          // Uniqueness based on name AND original column position
          const uniqueKey = `${item.name}-${item.position?.col}`; 
          if (uniqueNames.has(uniqueKey)) return false;
          uniqueNames.add(uniqueKey);
          return true;
      });
  }
  
  // Strategy 2: Dynamically extracts items by finding blocks of names and amounts.
  private extractItemsDynamically(
    /* ... (code remains commented out as per user request) ... */
  ): PayrollItem[] {
    // ... (logic for dynamic extraction - currently commented out) ...
    return []; 
  }

  private extractSalaryItemsFromExcel(data: ExcelSheetData): PayrollItem[] {
    const salaryAnchor = this.findCellPosition(data, this.SALARY_ANCHOR_TEXT, 10); 
    if (salaryAnchor) { 
        const fixedItems = this.extractFixedBlockItems(
            data, 
            this.isSalaryItem.bind(this), 
            salaryAnchor, 
            this.SALARY_NAME_ROW_COUNT,
            this.SALARY_AMOUNT_ROW_OFFSET,
            this.SALARY_AMOUNT_ROW_COUNT, // This is amountRowCountInBlock for the method
            this.SALARY_COL_COUNT // This is scanWidth
        );
        if (fixedItems.length > 0) return fixedItems;
    }

    let items: PayrollItem[] = [];
    // Fallback to Strategy 2 (TEMPORARILY COMMENTED OUT)
    // const hints: (string | RegExp)[] = [this.SALARY_ANCHOR_TEXT, /지급내역|급여내역|지급항목/, /지\s*급\s*항\s*목/i];
    // items = this.extractItemsDynamically(data, this.isSalaryItem.bind(this), hints, this.SALARY_NAME_ROW_COUNT);
    
    // Fallback to Strategy 3 (TEMPORARILY COMMENTED OUT)
    // if (items.length === 0) {
    //     items = this.fallbackItemExtraction(data, this.isSalaryItem.bind(this));
    // }
    return items;
  }

  private extractDeductionItemsFromExcel(data: ExcelSheetData): PayrollItem[] {
    const deductionAnchor = this.findCellPosition(data, this.DEDUCTION_ANCHOR_TEXT, 30); 
    if (deductionAnchor) { 
        const fixedItems = this.extractFixedBlockItems(
            data, 
            this.isDeductionItem.bind(this), 
            deductionAnchor,
            this.DEDUCTION_NAME_ROW_COUNT,
            this.DEDUCTION_AMOUNT_ROW_OFFSET,
            this.DEDUCTION_AMOUNT_ROW_COUNT, // This is amountRowCountInBlock
            this.DEDUCTION_COL_COUNT // This is scanWidth
        );
        if (fixedItems.length > 0) return fixedItems;
    }
    
    let items: PayrollItem[] = [];
    // Fallback to Strategy 2 (TEMPORARILY COMMENTED OUT)
    // const hints: (string | RegExp)[] = [this.DEDUCTION_ANCHOR_TEXT, /공제내역|공제항목|차감항목/, /공\s*제\s*항\s*목/i];
    // items = this.extractItemsDynamically(data, this.isDeductionItem.bind(this), hints, this.DEDUCTION_NAME_ROW_COUNT);

    // Fallback to Strategy 3 (TEMPORARILY COMMENTED OUT)
    // if (items.length === 0) {
    //     items = this.fallbackItemExtraction(data, this.isDeductionItem.bind(this));
    // }
    return items;
  }

  // Strategy 3: Fallback item extraction - broadly searches for items and amounts and pairs them by proximity.
  private fallbackItemExtraction(
    /* ... (code remains commented out as per user request) ... */
  ): PayrollItem[] {
    // ... (logic for fallback extraction - currently commented out) ...
    return [];
  }

  private extractSummaryFromExcel(data: ExcelSheetData): PayrollSummary {
    const summary: PayrollSummary = { grossPay: 0, totalDeduction: 0, netPay: 0 };
    let foundGross = false, foundDeduction = false, foundNet = false;

    // Standard search: Look for labels and find amounts in the same row, typically to the right.
    // Search from bottom up, in last 20 rows or so.
    const startSearchRowStd = Math.max(0, data.length - 20);
    for (let r = data.length - 1; r >= startSearchRowStd; r--) {
        const row = data[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
            const cellText = String(row[c] || '').trim();
            if (!cellText) continue;

            const checkAndAssignStd = (pattern: RegExp, key: keyof PayrollSummary, foundFlag: boolean): boolean => {
                if (!foundFlag && pattern.test(cellText)) {
                    // Search for amount in the same row, to the right of the label
                    for (let k = c + 1; k < row.length; k++) { 
                        if (this.isAmount(row[k])) {
                            summary[key] = this.parseAmount(String(row[k]));
                            return true; // Found for this key
                        }
                    }
                }
                return foundFlag; // Return original status if not found or pattern didn't match
            };
            
            foundGross = checkAndAssignStd(this.summaryPatterns.total, 'grossPay', foundGross);
            foundDeduction = checkAndAssignStd(this.summaryPatterns.deduction, 'totalDeduction', foundDeduction);
            foundNet = checkAndAssignStd(this.summaryPatterns.netPay, 'netPay', foundNet);
        }
        if (foundGross && foundDeduction && foundNet && summary.grossPay > 0) break; // Optimization: stop if all found
    }

    // Specific check for Excel image layout (label in one col, value in another, often further right)
    // Example: 급여총액 at AD8 (col 29, row 7), value at AE14 (col 30, row 13)
    // These indices are absolute based on the example image. This is fragile if table shifts.
    const specificLayoutChecks = [
        { labelPattern: this.summaryPatterns.total, key: 'grossPay' as keyof PayrollSummary, labelCol: 29, valueCol: 30, labelRowOffset: 7, valueRowOffset: 13, currentFound: foundGross },
        { labelPattern: this.summaryPatterns.deduction, key: 'totalDeduction' as keyof PayrollSummary, labelCol: 29, valueCol: 30, labelRowOffset: 8, valueRowOffset: 14, currentFound: foundDeduction },
        { labelPattern: this.summaryPatterns.netPay, key: 'netPay' as keyof PayrollSummary, labelCol: 29, valueCol: 30, labelRowOffset: 9, valueRowOffset: 15, currentFound: foundNet }
    ];

    for (const check of specificLayoutChecks) {
        if (!check.currentFound || summary[check.key] === 0) { 
            const labelRowIdx = check.labelRowOffset; 
            const valueRowIdx = check.valueRowOffset;

            if (data[labelRowIdx]?.[check.labelCol] && check.labelPattern.test(String(data[labelRowIdx][check.labelCol])) &&
                data[valueRowIdx]?.[check.valueCol] && this.isAmount(data[valueRowIdx][check.valueCol])) {
                summary[check.key] = this.parseAmount(String(data[valueRowIdx][check.valueCol]));
                if (check.key === 'grossPay') foundGross = true;
                if (check.key === 'totalDeduction') foundDeduction = true;
                if (check.key === 'netPay') foundNet = true;
            }
        }
    }
    
    // If two are found, calculate the third, but only if the third wasn't reliably found itself.
    if (foundGross && foundDeduction && (!foundNet || summary.netPay === 0) && summary.grossPay > 0 && summary.totalDeduction >= 0) { // Allow totalDeduction to be 0
        summary.netPay = summary.grossPay - summary.totalDeduction;
    } else if (foundGross && foundNet && (!foundDeduction || summary.totalDeduction === 0) && summary.grossPay > 0 && summary.netPay >= 0) { // Allow netPay to be 0
        summary.totalDeduction = summary.grossPay - summary.netPay;
    }


    return summary;
  }

  private calculateSummary(salaryItems: PayrollItem[], deductionItems: PayrollItem[]): PayrollSummary {
    const grossPay = salaryItems.reduce((sum, item) => sum + item.numericAmount, 0);
    const totalDeduction = deductionItems.reduce((sum, item) => sum + item.numericAmount, 0);
    const netPay = grossPay - totalDeduction;
    return { grossPay, totalDeduction, netPay };
  }

  public formatResult(parsedData: ParsedInternalData): FormattedPayrollResult {
    const summary = parsedData.summary;
    const formattedSummary: PayrollSummary = {
        grossPay: summary.grossPay || 0,
        totalDeduction: summary.totalDeduction || 0,
        netPay: summary.netPay || 0,
        calculatedGrossPay: summary.calculatedGrossPay || 0,
        calculatedTotalDeduction: summary.calculatedTotalDeduction || 0,
        calculatedNetPay: summary.calculatedNetPay || 0,
    };

    return {
      success: true,
      data: {
        employeeInfo: parsedData.employeeInfo,
        paymentDetails: {
          period: parsedData.metadata.payPeriod || 'N/A',
          payDate: parsedData.metadata.payDate || 'N/A',
          salaryItems: parsedData.salaryItems,
          deductionItems: parsedData.deductionItems,
          summary: formattedSummary
        }
      }
    };
  }
}
