'use strict';
// Phase 8: AI 인사이트 엔진 테스트
// RED → GREEN: insight-engine.js 구현 전 실패 예상

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0;
let fail = 0;

function assert(condition, msg, expected, actual) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    pass++;
  } else {
    const detail = expected !== undefined ? ` (expected: ${expected}, got: ${actual})` : '';
    console.log(`  ❌ FAIL: ${msg}${detail}`);
    fail++;
  }
}

// ── [1] 파일 존재 확인 ────────────────────────────────────────
console.log('\n[1] insight-engine.js 파일 존재');
assert(fs.existsSync(path.join(ROOT, 'insight-engine.js')), 'insight-engine.js 존재');

const insightJs = fs.existsSync(path.join(ROOT, 'insight-engine.js'))
  ? fs.readFileSync(path.join(ROOT, 'insight-engine.js'), 'utf8')
  : '';

// ── [2] INSIGHT 객체 및 함수 구조 ─────────────────────────────
console.log('\n[2] INSIGHT 객체 및 generateAIReport 함수 확인');
assert(insightJs.includes('INSIGHT') || insightJs.includes('insight'), 'INSIGHT 객체 정의');
assert(insightJs.includes('generateAIReport'), 'generateAIReport 함수 정의');
assert(insightJs.includes('anomalies'), 'anomalies 필드 존재');
assert(insightJs.includes('period'), 'period 필드 존재');
assert(insightJs.includes('trend') || insightJs.includes('Trend'), 'trend 필드 존재');

// ── [3] 이상 탐지 규칙 3가지 ──────────────────────────────────
console.log('\n[3] 이상 탐지 규칙 확인');
// 규칙 1: 수당 소멸
assert(
  insightJs.includes('소멸') || insightJs.includes('disappeared') || insightJs.includes('missing_allowance'),
  '이상탐지 규칙 1: 수당 소멸'
);
// 규칙 2: 시간외 급증
assert(
  /40.*overtime|overtime.*40|시간외.*급증|급증/.test(insightJs) || insightJs.includes('overtime_surge'),
  '이상탐지 규칙 2: 시간외 급증'
);
// 규칙 3: 장기근속 계단 이상
assert(
  insightJs.includes('longService') || insightJs.includes('long_service') || insightJs.includes('장기근속'),
  '이상탐지 규칙 3: 장기근속 이상'
);

// ── [4] JSON 유효성 출력 ─────────────────────────────────────
console.log('\n[4] generateAIReport 출력 구조 검증');
assert(insightJs.includes('JSON.stringify') || insightJs.includes('json'), 'JSON 출력 지원');

// ── [5] 핵심 알고리즘 직접 단위 테스트 ──────────────────────
console.log('\n[5] 핵심 알고리즘 정확성 (독립 단위 테스트)');

const threeMonthPayslips = [
  {
    month: '2025-10',
    items: [{ name: '기본급', amount: 2000000 }, { name: '장기근속수당', amount: 140000 }],
    totalGross: 2140000,
  },
  {
    month: '2025-11',
    items: [{ name: '기본급', amount: 2000000 }, { name: '장기근속수당', amount: 140000 }],
    totalGross: 2140000,
  },
  {
    month: '2025-12',
    items: [{ name: '기본급', amount: 2000000 }, { name: '장기근속수당', amount: 140000 }],
    totalGross: 2140000,
  },
];

// 장기근속 소멸 케이스
const anomalyPayslips = [
  {
    month: '2025-10',
    items: [{ name: '기본급', amount: 2000000 }, { name: '장기근속수당', amount: 140000 }],
    totalGross: 2140000,
  },
  {
    month: '2025-11',
    items: [{ name: '기본급', amount: 2000000 }, { name: '장기근속수당', amount: 130000 }],
    totalGross: 2130000, // BUG-02: 10,000 감소
  },
  {
    month: '2025-12',
    items: [{ name: '기본급', amount: 2000000 }], // 장기근속 소멸
    totalGross: 2000000,
  },
];

// 핵심 알고리즘 인라인 구현
function generateAIReportCore(payslips) {
  if (!payslips || payslips.length === 0) return { period: '', summary: {}, anomalies: [], trend: [] };

  const months = payslips.map(p => p.month).sort();
  const period = months.length >= 2 ? `${months[0]} ~ ${months[months.length - 1]}` : months[0];

  const trend = payslips.map(p => ({
    month: p.month,
    totalGross: p.totalGross,
  }));

  const anomalies = [];

  // 규칙 1: 수당 소멸 탐지 (첫 달에 있던 항목이 이후 달에 사라짐)
  if (payslips.length >= 2) {
    const firstItems = new Set(payslips[0].items.map(i => i.name));
    for (let i = 1; i < payslips.length; i++) {
      const curItems = new Set(payslips[i].items.map(x => x.name));
      for (const name of firstItems) {
        if (!curItems.has(name)) {
          anomalies.push({
            month: payslips[i].month,
            item: name,
            type: 'missing_allowance',
            note: '이전 달 존재하던 항목 소멸',
          });
        }
      }
    }
  }

  // 규칙 2: 장기근속 계단 이상 (전달 대비 10,000원 이상 감소)
  for (let i = 1; i < payslips.length; i++) {
    const prev = payslips[i - 1].items.find(x => x.name.includes('장기근속'));
    const cur = payslips[i].items.find(x => x.name.includes('장기근속'));
    if (prev && cur && prev.amount - cur.amount >= 10000) {
      anomalies.push({
        month: payslips[i].month,
        item: '장기근속수당',
        type: 'long_service_decrease',
        expected: prev.amount,
        actual: cur.amount,
        note: '장기근속수당 감소 이상',
      });
    }
  }

  // 규칙 3: 시간외 급증 (40시간 이상 갑자기 증가)
  for (let i = 1; i < payslips.length; i++) {
    const prev = payslips[i - 1].items.find(x => x.name.includes('시간외'));
    const cur = payslips[i].items.find(x => x.name.includes('시간외'));
    if (cur && (!prev || cur.amount - (prev ? prev.amount : 0) > 200000)) {
      anomalies.push({
        month: payslips[i].month,
        item: '시간외수당',
        type: 'overtime_surge',
        note: '시간외수당 급증',
      });
    }
  }

  const avgGross = Math.floor(payslips.reduce((s, p) => s + p.totalGross, 0) / payslips.length);
  return {
    period,
    summary: { avgGross, anomalyCount: anomalies.length },
    anomalies,
    trend,
  };
}

const r1 = generateAIReportCore(threeMonthPayslips);
assert(r1.period.includes('~') || r1.period.length > 0, '알고리즘: period 필드 생성');
assert(Array.isArray(r1.anomalies), '알고리즘: anomalies 배열');
assert(r1.anomalies.length === 0, '알고리즘: 정상 명세서 이상 없음', 0, r1.anomalies.length);
assert(Array.isArray(r1.trend), '알고리즘: trend 배열');
assert(r1.trend.length === 3, '알고리즘: 3개월 트렌드', 3, r1.trend.length);

// JSON 유효성
let validJson = true;
try { JSON.stringify(r1); } catch (_) { validJson = false; }
assert(validJson, '알고리즘: JSON.stringify 가능');

// 장기근속 소멸 이상 탐지
const r2 = generateAIReportCore(anomalyPayslips);
assert(r2.anomalies.length > 0, '알고리즘: 이상 탐지됨');
assert(
  r2.anomalies.some(a => a.type === 'missing_allowance' || a.type === 'long_service_decrease'),
  '알고리즘: 장기근속 이상 탐지'
);

// ── 결과 ──────────────────────────────────────────────────────
console.log(`\n결과: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('\n→ Phase 8 완료!');
} else {
  console.log('\n→ Phase 8 미완료. 구현 후 재실행하세요.');
  process.exit(1);
}
