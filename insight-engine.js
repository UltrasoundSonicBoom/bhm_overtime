'use strict';
// ============================================================
// insight-engine.js
// 다중 명세서 집계 및 이상 탐지 엔진
// 사용: INSIGHT.generateAIReport(payslips)
// ============================================================

const INSIGHT = {

  /**
   * 다중 명세서에서 AI 리포트 JSON을 생성한다
   * @param {Array<{month:string, items:[{name,amount}], totalGross:number}>} payslips
   * @returns {{ period, summary, anomalies, trend }}
   */
  generateAIReport(payslips) {
    if (!payslips || payslips.length === 0) {
      return { period: '', summary: { avgGross: 0, anomalyCount: 0 }, anomalies: [], trend: [] };
    }

    const sorted = [...payslips].sort((a, b) => a.month.localeCompare(b.month));
    const months = sorted.map(p => p.month);
    const period = months.length >= 2
      ? `${months[0]} ~ ${months[months.length - 1]}`
      : months[0];

    const trend = sorted.map(p => ({ month: p.month, totalGross: p.totalGross }));
    const anomalies = [
      ...this._detectMissingAllowance(sorted),
      ...this._detectLongServiceAnomaly(sorted),
      ...this._detectOvertimeSurge(sorted),
    ];

    const avgGross = sorted.length > 0
      ? Math.floor(sorted.reduce((s, p) => s + p.totalGross, 0) / sorted.length)
      : 0;

    return {
      period,
      summary: { avgGross, anomalyCount: anomalies.length },
      anomalies,
      trend,
    };
  },

  /**
   * 규칙 1: 수당 소멸 탐지 — 이전 달에 존재하던 항목이 이후 달에 사라짐
   */
  _detectMissingAllowance(sorted) {
    const anomalies = [];
    if (sorted.length < 2) return anomalies;
    const firstItems = new Set(sorted[0].items.map(i => i.name));
    for (let i = 1; i < sorted.length; i++) {
      const curItems = new Set(sorted[i].items.map(x => x.name));
      for (const name of firstItems) {
        if (!curItems.has(name)) {
          anomalies.push({
            month: sorted[i].month,
            item: name,
            type: 'missing_allowance',
            note: '이전 달 존재하던 항목 소멸',
          });
        }
      }
    }
    return anomalies;
  },

  /**
   * 규칙 2: 장기근속 계단 이상 — 전달 대비 10,000원 이상 감소
   */
  _detectLongServiceAnomaly(sorted) {
    const anomalies = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].items.find(x => x.name.includes('장기근속'));
      const cur  = sorted[i].items.find(x => x.name.includes('장기근속'));
      if (prev && cur && prev.amount - cur.amount >= 10000) {
        anomalies.push({
          month: sorted[i].month,
          item: '장기근속수당',
          type: 'long_service_decrease',
          expected: prev.amount,
          actual: cur.amount,
          note: `장기근속수당 감소: ${prev.amount.toLocaleString()} → ${cur.amount.toLocaleString()}원`,
        });
      }
    }
    return anomalies;
  },

  /**
   * 규칙 3: 시간외 급증 탐지 — 전달 대비 200,000원 이상 급증 또는 새로 등장
   */
  _detectOvertimeSurge(sorted) {
    const anomalies = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].items.find(x => x.name.includes('시간외'));
      const cur  = sorted[i].items.find(x => x.name.includes('시간외'));
      if (cur) {
        const prevAmount = prev ? prev.amount : 0;
        if (cur.amount - prevAmount > 200000) {
          anomalies.push({
            month: sorted[i].month,
            item: '시간외수당',
            type: 'overtime_surge',
            expected: prevAmount,
            actual: cur.amount,
            note: `시간외수당 급증: ${prevAmount.toLocaleString()} → ${cur.amount.toLocaleString()}원`,
          });
        }
      }
    }
    return anomalies;
  },

  /**
   * AI 가독 JSON 문자열 반환 (클립보드/LLM 전달용)
   */
  toJSON(payslips) {
    return JSON.stringify(this.generateAIReport(payslips), null, 2);
  },
};

// Node.js 환경에서 require 지원
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { INSIGHT };
}

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)
export {};
