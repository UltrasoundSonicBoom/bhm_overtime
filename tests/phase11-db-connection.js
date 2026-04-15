/**
 * Phase 11 TDD 테스트: DB Connection & /api/data/bundle parity check
 * 실행: node tests/phase11-db-connection.js [--api http://localhost:3001]
 *
 * Part A: DATA_STATIC 구조 검증 (오프라인)
 * Part B: /api/data/bundle 응답 검증 (서버 필요, --api 플래그)
 *
 * RED 단계: API 연결 전 Part A만 PASS, Part B는 SKIP 또는 FAIL
 * GREEN 단계: 전체 PASS
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

function skip(message) {
  console.log(`  SKIP: ${message}`);
  skipped++;
}

// ── CLI 인자 파싱 ──
const args = process.argv.slice(2);
const apiIdx = args.indexOf('--api');
const API_BASE = apiIdx >= 0 && args[apiIdx + 1] ? args[apiIdx + 1] : null;

// ══════════════════════════════════════════════
// Part A: DATA_STATIC 구조 검증 (오프라인)
// ══════════════════════════════════════════════

console.log('\n=== Phase 11 Part A: DATA_STATIC 구조 검증 ===\n');

// data.js를 텍스트로 읽어서 DATA_STATIC 존재 확인
const dataJsPath = path.join(ROOT, 'data.js');
const dataJsExists = fs.existsSync(dataJsPath);
assert(dataJsExists, 'data.js 파일 존재');

if (!dataJsExists) {
  console.log(`\n결과: ${passed} PASS / ${failed} FAIL / ${skipped} SKIP`);
  process.exit(1);
}

const dataJsContent = fs.readFileSync(dataJsPath, 'utf8');

// T11-A1: DATA_STATIC 선언 존재
assert(dataJsContent.includes('const DATA_STATIC'), 'DATA_STATIC 선언 존재');

// T11-A2: loadDataFromAPI 함수 존재
assert(dataJsContent.includes('async function loadDataFromAPI'), 'loadDataFromAPI 함수 존재');

// T11-A3: loadDataFromAPI 호출부 존재
assert(dataJsContent.includes('loadDataFromAPI()'), 'loadDataFromAPI() 호출 존재');

// T11-A4: fetch URL이 /api/data/bundle (동적 구성 또는 하드코딩 허용)
assert(
  dataJsContent.includes("fetch('/api/data/bundle')") ||
  (dataJsContent.includes("'/data/bundle'") && dataJsContent.includes("_apiBase")),
  "fetch URL = '/api/data/bundle'"
);

// T11-A5: DATA_STATIC fallback merge 패턴
assert(
  dataJsContent.includes('{ ...DATA_STATIC, ...'),
  'DATA = { ...DATA_STATIC, ...apiData } merge 패턴 존재'
);

// T11-A6: localStorage 캐시 키 존재
assert(dataJsContent.includes('data_bundle_cache_'), 'localStorage 캐시 키 존재');

// T11-A7: 에러 시 fallback 유지 (skip 상태 기록)
assert(
  dataJsContent.includes("state: 'skip'"),
  'API 실패 시 skip 상태 기록'
);

// T11-A8: Content-Type 검증 로직
assert(
  dataJsContent.includes('application/json'),
  'Content-Type application/json 검증 로직 존재'
);

// T11-A9: DATA_STATIC 필수 최상위 키 확인
const requiredStaticKeys = [
  'jobTypes', 'payTables', 'allowances', 'longServicePay',
  'familyAllowance', 'seniorityRates', 'annualLeave',
  'leaveQuotas', 'ceremonies', 'faq'
];
for (const key of requiredStaticKeys) {
  assert(
    dataJsContent.includes(`${key}:`),
    `DATA_STATIC에 '${key}' 키 존재`
  );
}

// T11-A10: payTables에 3개 보수표 존재
const payTableNames = ['일반직', '운영기능직', '환경유지지원직'];
for (const name of payTableNames) {
  assert(
    dataJsContent.includes(name),
    `payTables에 '${name}' 보수표 존재`
  );
}

// T11-A11: jobTypes에 10개 직종 존재
const jobTypeNames = [
  '사무직', '보건직', '간호직', '의사직', '약무직',
  '의료기사직', '기능직', '시설직', '환경미화직', '지원직'
];
for (const name of jobTypeNames) {
  assert(
    dataJsContent.includes(`'${name}'`),
    `jobTypes에 '${name}' 존재`
  );
}

// ══════════════════════════════════════════════
// Part B: /api/data/bundle 응답 검증 (서버 필요)
// ══════════════════════════════════════════════

console.log('\n=== Phase 11 Part B: /api/data/bundle API 검증 ===\n');

async function runPartB() {
  if (!API_BASE) {
    skip('API_BASE 미지정 (--api http://localhost:3001 으로 실행)');
    skip('Part B 전체 스킵');
    return;
  }

  const bundleUrl = `${API_BASE}/api/data/bundle`;

  // T11-B1: /api/data/bundle 응답 200
  let response, apiData, elapsed;
  try {
    const start = Date.now();
    response = await fetch(bundleUrl);
    elapsed = Date.now() - start;
    assert(response.status === 200, `/api/data/bundle 응답 200 (실제: ${response.status})`);
  } catch (e) {
    assert(false, `/api/data/bundle 접속 가능 (에러: ${e.message})`);
    skip('Part B 나머지 스킵 (서버 접속 불가)');
    return;
  }

  // T11-B2: Content-Type 헤더
  const contentType = response.headers.get('content-type') || '';
  assert(contentType.includes('application/json'), `Content-Type: application/json (실제: ${contentType})`);

  // T11-B3: 응답 시간 < 3초
  assert(elapsed < 3000, `응답 시간 < 3초 (실제: ${elapsed}ms)`);

  // T11-B4: JSON 파싱
  try {
    apiData = await response.json();
    assert(typeof apiData === 'object' && apiData !== null, 'JSON 파싱 성공');
  } catch (e) {
    assert(false, `JSON 파싱 실패: ${e.message}`);
    skip('Part B 나머지 스킵 (JSON 파싱 실패)');
    return;
  }

  // T11-B5: 최상위 키 완전성
  const expectedTopKeys = [
    'jobTypes', 'payTables', 'allowances', 'faq',
    'leaveQuotas', 'ceremonies'
  ];
  for (const key of expectedTopKeys) {
    assert(key in apiData, `API 응답에 '${key}' 키 존재`);
  }

  // T11-B6: payTables 구조 검증
  if (apiData.payTables && typeof apiData.payTables === 'object') {
    const ptKeys = Object.keys(apiData.payTables);
    assert(ptKeys.length >= 3, `payTables 보수표 3개 이상 (실제: ${ptKeys.length}개)`);

    for (const ptName of ptKeys) {
      const pt = apiData.payTables[ptName];
      assert(
        Array.isArray(pt.grades) && pt.grades.length > 0,
        `payTables.${ptName}.grades 배열 존재 (${pt.grades?.length || 0}개)`
      );
      assert(
        pt.basePay && typeof pt.basePay === 'object',
        `payTables.${ptName}.basePay 객체 존재`
      );
      assert(
        pt.abilityPay && typeof pt.abilityPay === 'object',
        `payTables.${ptName}.abilityPay 객체 존재`
      );
    }
  } else {
    assert(false, 'payTables 객체 존재');
  }

  // T11-B7: faq 배열 검증
  if (Array.isArray(apiData.faq)) {
    assert(apiData.faq.length > 0, `faq 배열 비어있지 않음 (${apiData.faq.length}개)`);
    if (apiData.faq.length > 0) {
      const sample = apiData.faq[0];
      assert('q' in sample && 'a' in sample, 'faq[0]에 q, a 키 존재');
      assert('category' in sample, 'faq[0]에 category 키 존재');
    }
  } else {
    assert(false, 'faq가 배열임');
  }

  // T11-B8: jobTypes 검증
  if (apiData.jobTypes && typeof apiData.jobTypes === 'object') {
    const jtKeys = Object.keys(apiData.jobTypes);
    assert(jtKeys.length >= 10, `jobTypes 10개 이상 (실제: ${jtKeys.length}개)`);
  } else {
    assert(false, 'jobTypes 객체 존재');
  }

  // T11-B9: allowances 검증
  if (apiData.allowances && typeof apiData.allowances === 'object') {
    assert(
      Object.keys(apiData.allowances).length > 0,
      `allowances 비어있지 않음 (${Object.keys(apiData.allowances).length}개)`
    );
  } else {
    assert(false, 'allowances 객체 존재');
  }

  // T11-B10: leaveQuotas 구조 검증
  if (apiData.leaveQuotas && typeof apiData.leaveQuotas === 'object') {
    assert('types' in apiData.leaveQuotas, 'leaveQuotas.types 존재');
    if (Array.isArray(apiData.leaveQuotas.types)) {
      assert(
        apiData.leaveQuotas.types.length > 0,
        `leaveQuotas.types 비어있지 않음 (${apiData.leaveQuotas.types.length}개)`
      );
    }
    assert('year' in apiData.leaveQuotas, 'leaveQuotas.year 존재');
  } else {
    assert(false, 'leaveQuotas 객체 존재');
  }

  // T11-B11: ceremonies 배열 검증
  if (Array.isArray(apiData.ceremonies)) {
    assert(
      apiData.ceremonies.length > 0,
      `ceremonies 비어있지 않음 (${apiData.ceremonies.length}개)`
    );
    if (apiData.ceremonies.length > 0) {
      assert('type' in apiData.ceremonies[0], 'ceremonies[0]에 type 키 존재');
    }
  } else {
    assert(false, 'ceremonies가 배열임');
  }

  // T11-B12: Parity check - DATA_STATIC 키 수와 API 응답 비교
  console.log('\n  --- Parity Summary ---');
  const parityChecks = {
    'payTables 보수표 수': {
      static: payTableNames.length,
      api: apiData.payTables ? Object.keys(apiData.payTables).length : 0,
    },
    'jobTypes 직종 수': {
      static: jobTypeNames.length,
      api: apiData.jobTypes ? Object.keys(apiData.jobTypes).length : 0,
    },
    'faq 항목 수': {
      static: '(data.js 내부)',
      api: Array.isArray(apiData.faq) ? apiData.faq.length : 0,
    },
  };
  for (const [label, counts] of Object.entries(parityChecks)) {
    console.log(`  ${label}: static=${counts.static}, api=${counts.api}`);
  }
}

// ── 실행 ──

async function main() {
  await runPartB();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Phase 11 결과: ${passed} PASS / ${failed} FAIL / ${skipped} SKIP`);
  console.log('='.repeat(50));

  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error('테스트 실행 오류:', e);
  process.exit(1);
});
