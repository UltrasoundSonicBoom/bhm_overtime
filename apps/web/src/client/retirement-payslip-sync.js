function toNumber(value) {
  var n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function ymKey(year, month) {
  return String(year) + '-' + String(month).padStart(2, '0');
}

function formatYm(year, month) {
  return String(year) + '년 ' + String(month).padStart(2, '0') + '월';
}

export function collectPayslipMonthlyGrosses(salaryParser) {
  if (!salaryParser || typeof salaryParser.listSavedMonths !== 'function' || typeof salaryParser.loadMonthlyData !== 'function') {
    return [];
  }

  var months = salaryParser.listSavedMonths() || [];
  var byMonth = new Map();

  months.forEach(function(m) {
    if (!m || !m.year || !m.month) return;
    var data = salaryParser.loadMonthlyData(m.year, m.month, m.type);
    var grossPay = toNumber(data && data.summary && data.summary.grossPay);
    if (grossPay <= 0) return;

    var key = ymKey(m.year, m.month);
    var item = byMonth.get(key);
    if (!item) {
      item = { year: m.year, month: m.month, grossPay: 0, types: [] };
      byMonth.set(key, item);
    }
    item.grossPay += grossPay;
    item.types.push(m.type || '급여');
  });

  return Array.from(byMonth.values()).sort(function(a, b) {
    return b.year - a.year || b.month - a.month;
  });
}

export function getRetirementPayslipWageSource(salaryParser, maxMonths) {
  var monthLimit = maxMonths || 3;
  var monthlyGrosses = collectPayslipMonthlyGrosses(salaryParser);
  var recent = monthlyGrosses.slice(0, monthLimit);
  if (recent.length === 0) return null;

  var total = recent.reduce(function(sum, item) { return sum + item.grossPay; }, 0);
  var monthlyWage = Math.round(total / recent.length);
  var periodLabel = recent.map(function(item) {
    return formatYm(item.year, item.month);
  }).join(', ');

  return {
    source: 'payslip',
    monthlyWage: monthlyWage,
    monthsUsed: recent.length,
    periodLabel: periodLabel,
    monthlyGrosses: recent,
    label: recent.length >= monthLimit
      ? '✓ 명세서 평균 (최근 3개월)'
      : '✓ 명세서 반영 (최근 ' + recent.length + '개월, 3개월 미만)',
  };
}

export function shouldAutoRefreshRetirementCalc(options) {
  var opts = options || {};
  if (opts.activeTab && opts.activeTab !== 'calc') return false;
  return !!opts.canCalculate && (!!opts.force || !!opts.hasVisibleResult);
}
