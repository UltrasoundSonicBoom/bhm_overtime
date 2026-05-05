// Server OCR client for the local/backend Surya worker path.
//
// The browser uploads files only. Heavy parsing runs on the Snuhmate backend
// proxy (`/ocr/parse`), which forwards to the GPU worker.

let cachedBackend = null;
let checkedAt = 0;
const CACHE_TTL_MS = 30 * 1000;

function unique(values) {
  return [...new Set(values.filter(Boolean).map(v => String(v).replace(/\/$/, '')))];
}

function backendCandidates() {
  const viteEnv = import.meta.env || {};
  const envUrl = viteEnv.PUBLIC_SNUHMATE_BACKEND_URL || viteEnv.PUBLIC_SNUHMATE_OCR_BACKEND_URL;
  const configUrl = window.SNUHMATE_CONFIG?.backendUrl || window.SNUHMATE_CONFIG?.ocrBackendUrl;
  const candidates = [configUrl, envUrl];
  if (window.location.protocol !== 'file:') {
    candidates.push(window.location.origin);
  }
  if (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname) || window.location.protocol === 'file:') {
    candidates.push('http://127.0.0.1:8051', 'http://localhost:8001', 'http://127.0.0.1:8001');
  }
  return unique(candidates);
}

export async function probeOcrBackend() {
  const now = Date.now();
  if (cachedBackend && (now - checkedAt) < CACHE_TTL_MS) return cachedBackend;

  for (const base of backendCandidates()) {
    try {
      const ctl = new AbortController();
      const tid = setTimeout(() => ctl.abort(), 1200);
      const resp = await fetch(`${base}/ocr/health`, { signal: ctl.signal });
      clearTimeout(tid);
      if (resp.ok) {
        cachedBackend = base;
        checkedAt = now;
        return cachedBackend;
      }
    } catch (_e) {
      // Try the next candidate.
    }
  }

  cachedBackend = null;
  checkedAt = now;
  return null;
}

export async function parseWithServerOcr(file, { docType = 'auto', uid = '', departmentId = '' } = {}) {
  const backend = await probeOcrBackend();
  if (!backend) return null;

  const fd = new FormData();
  fd.set('file', file);
  fd.set('doc_type', docType);
  fd.set('uid', uid || window.__firebaseUid || 'anonymous');
  if (departmentId) fd.set('department_id', departmentId);

  const resp = await fetch(`${backend}/ocr/parse`, { method: 'POST', body: fd });
  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.json())?.detail || ''; } catch (_e) {}
    throw new Error(detail || `OCR server returned ${resp.status}`);
  }
  return resp.json();
}

function payrollPeriodLabel(payPeriod) {
  const match = String(payPeriod || '').match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return '';
  return `${match[1]}년 ${parseInt(match[2], 10)}월분`;
}

export function toClientPayslip(ocrEnvelope) {
  const result = ocrEnvelope?.result || {};
  const statement = result.statement || result;
  if (!statement || !statement.totals) return null;

  const employee = statement.employee || result.employee || {};
  const metadata = statement.metadata || {};
  const totals = statement.totals || result.totals || {};
  const supplemental = statement.supplemental || result.supplemental || {};

  const mapMoneyItem = item => ({
    name: item.normalized_label || item.label || item.name || '',
    amount: Number(item.amount || 0),
    source: item.source || statement.source_format || result.source_format || 'server-ocr',
  });

  return {
    employeeInfo: {
      employeeNumber: employee.personal_number || employee.employeeNumber || '',
      name: employee.name || '',
      jobType: employee.job_category || employee.jobType || '',
      payGrade: employee.pay_step || employee.payGrade || '',
      department: employee.department || '',
      hireDate: employee.hire_date || employee.hireDate || '',
    },
    metadata: {
      payPeriod: payrollPeriodLabel(metadata.pay_period) || metadata.title || '',
      payDate: metadata.pay_date || '',
      payslipType: metadata.statement_kind === 'regular' ? '급여' : (metadata.statement_kind || '급여'),
    },
    salaryItems: (statement.earnings || []).map(mapMoneyItem).filter(item => item.name && item.amount !== 0),
    deductionItems: (statement.deductions || []).map(mapMoneyItem).filter(item => item.name && item.amount !== 0),
    workStats: (supplemental.work_metrics || []).map(item => ({
      name: item.normalized_label || item.label || item.name || '',
      value: Number(item.amount ?? item.raw_value ?? 0) || 0,
    })).filter(item => item.name),
    summary: {
      grossPay: Number(totals.gross_pay || totals.grossPay || 0),
      totalDeduction: Number(totals.deduction_total || totals.totalDeduction || 0),
      netPay: Number(totals.net_pay || totals.netPay || 0),
    },
    supplemental,
    _serverOcr: {
      jobId: result.job_id,
      statementId: result.statement_id,
      sourceFormat: statement.source_format || result.source_format,
      quality: statement.quality || result.quality,
      validation: statement.validation || result.validation,
    },
    _parseInfo: {
      method: 'server-surya',
      confidence: Math.round(((statement.quality || result.quality || {}).score ?? 1) * 100),
      sourceFormat: statement.source_format || result.source_format,
    },
  };
}

function inferScheduleMonth(title, fallback) {
  const text = `${title || ''} ${fallback || ''}`;
  const match = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/) || text.match(/(\d{4})[-.](\d{1,2})/);
  if (!match) return fallback || null;
  return `${match[1]}-${String(parseInt(match[2], 10)).padStart(2, '0')}`;
}

function mapDutyForClient(code) {
  const raw = String(code || '').trim();
  if (!raw) return '';
  if (raw === '/' || /^off$/i.test(raw)) return 'OFF';
  if (/^N/i.test(raw)) return 'N';
  if (/^E/i.test(raw)) return 'E';
  if (/^(D|Do|9r|7r|10|11|12|15|P-D|P-9|P-7)/i.test(raw)) return 'D';
  if (/연|휴|생|보|교|T/.test(raw)) return 'AL';
  return '';
}

export function toClientDutyGrid(ocrEnvelope, opts = {}) {
  const result = ocrEnvelope?.result || {};
  const schedule = result.schedule || {};
  const employees = schedule.employees || [];
  if (!employees.length) return null;

  const rows = employees.map(emp => {
    const days = {};
    for (let day = 1; day <= 31; day++) {
      days[String(day)] = mapDutyForClient((emp.days || {})[String(day)] ?? (emp.days || {})[day]);
    }
    return {
      name: emp.name || emp.display_name || '',
      days,
      sourceRole: emp.role || '',
      sourceGroup: emp.group_display || emp.group || '',
    };
  }).filter(row => row.name);

  const quality = schedule.quality || result.quality || {};
  const invalidRows = Number(quality.invalid_employee_rows || 0);
  const unknownCount = (quality.unknown_codes || []).length;
  const confidence = rows.length ? Math.max(0, 1 - ((invalidRows + unknownCount) / rows.length)) : 0;

  return {
    month: inferScheduleMonth(schedule.title, opts.monthHint),
    dept: opts.deptHint || schedule.department_id || null,
    rows,
    confidence,
    notes: invalidRows || unknownCount
      ? `서버 OCR 검증 필요: invalid ${invalidRows}, unknown ${unknownCount}`
      : '',
    parser_version: 'server-surya-v1',
    source: result.source_format || schedule.source_format || 'server-surya',
    _serverOcr: {
      jobId: result.job_id,
      artifacts: result.artifacts,
      quality,
      validation: result.validation || schedule.validation_summary,
    },
  };
}
