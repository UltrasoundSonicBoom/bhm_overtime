export interface EmployeeInfo {
  name?: string;
  employeeNumber?: string;
  department?: string;
  jobType?: string;
  payGrade?: string;
  hireDate?: string;
}

export interface PayrollItem {
  name: string;
  amount: string; // Formatted string, e.g., "1,234,500"
  numericAmount: number;
  position?: { row: number; col: number }; // Optional: for debugging or advanced logic
}

export interface PayrollSummary {
  grossPay: number;
  totalDeduction: number;
  netPay: number;
  calculatedGrossPay?: number; // From sum of items
  calculatedTotalDeduction?: number; // From sum of items
  calculatedNetPay?: number; // From sum of items
}

export interface PaymentDetails {
  period?: string;
  payDate?: string;
  salaryItems: PayrollItem[];
  deductionItems: PayrollItem[];
  summary: PayrollSummary;
}

export interface PayrollData {
  employeeInfo: EmployeeInfo;
  paymentDetails: PaymentDetails;
}

export interface ParsedInternalData {
  employeeInfo: EmployeeInfo;
  salaryItems: PayrollItem[];
  deductionItems: PayrollItem[];
  summary: PayrollSummary;
  metadata: {
    payPeriod?: string;
    payDate?: string;
  };
}

export interface FormattedPayrollResult {
  success: boolean;
  data?: PayrollData;
  error?: string;
}

// For data structure returned by XLSX.utils.sheet_to_json({header: 1})
export type ExcelRowData = (string | number | Date | null)[];
export type ExcelSheetData = ExcelRowData[];