const PAYROLL_LABEL_UTILS = (() => {
  'use strict';

  function normalizeParen(ch) {
    if (ch === '（') return '(';
    if (ch === '）') return ')';
    return ch;
  }

  function compactLabelKo(text) {
    return String(text || '')
      .trim()
      .replace(/[（）]/g, normalizeParen)
      .replace(/\s+/g, '')
      .replace(/\n+/g, '');
  }

  function buildLookup(aliasMap) {
    return function lookup(label) {
      return aliasMap ? aliasMap[compactLabelKo(label)] || null : null;
    };
  }

  return {
    compactLabelKo,
    buildLookup,
  };
})();

if (typeof window !== 'undefined') {
  window.PAYROLL_LABEL_UTILS = PAYROLL_LABEL_UTILS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PAYROLL_LABEL_UTILS;
}
