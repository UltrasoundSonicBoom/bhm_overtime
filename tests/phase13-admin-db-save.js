/**
 * Phase 13 TDD: Admin DB Save for Regulation Constants
 * 실행: node tests/phase13-admin-db-save.js [--api http://localhost:3001]
 *
 * Part A: union_regulation_admin.js DB 로드/저장 로직 검증 (오프라인)
 * Part B: adminOps.ts API 엔드포인트 검증 (오프라인)
 * Part C: API 통합 검증 (서버 필요)
 * Part D: 회귀 — 기존 기능 유지 확인
 *
 * RED 단계: Part A/B 일부 FAIL
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

const args = process.argv.slice(2);
const apiIdx = args.indexOf('--api');
const API_BASE = apiIdx >= 0 && args[apiIdx + 1] ? args[apiIdx + 1] : null;

// ══════════════════════════════════════════════
// Part A: union_regulation_admin.js DB 로직 검증
// ═════��═════════════════════════��══════════════

console.log('\n=== Phase 13 Part A: Admin UI DB 로직 검증 ===\n');

const adminJsPath = path.join(ROOT, 'admin', 'union_regulation_admin.js');
const adminJsExists = fs.existsSync(adminJsPath);
assert(adminJsExists, 'union_regulation_admin.js 존재');

if (adminJsExists) {
  const content = fs.readFileSync(adminJsPath, 'utf8');

  // T13-A1: DB에서 regulation rules를 로드하는 함수 존재
  assert(
    content.includes('regulation-rules') || content.includes('regulationRules') || content.includes('loadFromDB') || content.includes('loadRegulationRules'),
    'DB regulation rules 로드 로직 존재'
  );

  // T13-A2: DB에 저장하는 로직 존재
  assert(
    (content.includes('POST') || content.includes('PUT')) && content.includes('/api/admin'),
    'DB 저장 API 호출 로직 존재'
  );

  // T13-A3: DB 저장 버튼 또는 저장 트리거 존재
  assert(
    content.includes('save') || content.includes('Save') || content.includes('저장'),
    'DB 저장 트리거(버튼/함수) 존재'
  );

  // T13-A4: 저장 성공/실패 피드백
  assert(
    content.includes('success') || content.includes('성공') || content.includes('fail') || content.includes('실패') || content.includes('alert') || content.includes('toast'),
    '저장 결과 피드백 로직 존재'
  );

  // T13-A5: JSON fallback 유지
  assert(
    content.includes('nurse_regulation.json') || content.includes('loadNurseRegulation'),
    'nurse_regulation.json fallback 유지'
  );

  // T13-A6: 기존 클립보드 기능 유지
  assert(
    content.includes('clipboard') || content.includes('copyToClipboard'),
    '클립보드 기능 유지'
  );

  // T13-A7: 기존 비교 테이블 렌더링 유지
  assert(
    content.includes('renderSyncPanel') || content.includes('sync-container') || content.includes('SYNC_MAP'),
    '비교 테이블 렌더링 유지'
  );

  // T13-A8: AI 리포트 기능 유지
  assert(
    content.includes('buildAIReport') || content.includes('copy-report-btn'),
    'AI 리포트 기능 유지'
  );
}

// ══════════════��═══════════════════════════════
// Part B: adminOps.ts API 엔드포인트 검증
// ═══════════��═════════════════════════════���════

console.log('\n=== Phase 13 Part B: adminOps.ts API 검증 ===\n');

const adminOpsPath = path.join(ROOT, 'server', 'src', 'routes', 'adminOps.ts');
const adminOpsExists = fs.existsSync(adminOpsPath);
assert(adminOpsExists, 'adminOps.ts 존재');

if (adminOpsExists) {
  const content = fs.readFileSync(adminOpsPath, 'utf8');

  // T13-B1: GET regulation-rules 엔드포인트 (Phase 12에서 추가됨)
  assert(
    content.includes("get('/regulation-rules'") || content.includes("get('/regulation-rules',"),
    'GET /regulation-rules 엔드포인트 존재'
  );

  // T13-B2: POST regulation-rules 엔드포인트
  assert(
    content.includes("post('/regulation-rules'") || content.includes("post('/regulation-rules',"),
    'POST /regulation-rules 엔드포인트 존재'
  );

  // T13-B3: PUT regulation-rules/:id 엔드포인트
  assert(
    content.includes("put('/regulation-rules/:id'") || content.includes("put('/regulation-rules/:id',") ||
    content.includes("patch('/regulation-rules/:id'") || content.includes("patch('/regulation-rules/:id',"),
    'PUT/PATCH /regulation-rules/:id 엔드포인트 존재'
  );

  // T13-B4: 저장 시 audit_log 생���
  assert(
    content.includes('regulation_rule') && content.includes('writeAuditLog'),
    '규정 rule 변경 시 audit_log 생성'
  );

  // T13-B5: calculation_rules 테이블 참조
  assert(
    content.includes('calculation_rules'),
    'calculation_rules 테이블 참조'
  );
}

// ══════════════════════════════════════════════
// Part C: API 통합 검증 (서버 필요)
// ══════��══════════════════════��════════════════

console.log('\n=== Phase 13 Part C: API 통합 검증 ===\n');

async function runPartC() {
  if (!API_BASE) {
    skip('API_BASE 미지정');
    skip('Part C 전체 스킵');
    return;
  }

  // T13-C1: POST /api/admin/regulation-rules 존재
  try {
    const res = await fetch(`${API_BASE}/api/admin/regulation-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        versionId: 1,
        ruleType: 'test',
        ruleKey: 'test_key',
        ruleData: { test: true },
        description: 'test rule',
      }),
    });
    assert(
      [200, 201, 401, 403].includes(res.status),
      `POST /regulation-rules 엔드포인트 존재 (status: ${res.status})`
    );
  } catch (e) {
    assert(false, `POST API 접속 실패: ${e.message}`);
  }
}

// ═══��════════════════════════════���═════════════
// Part D: union_regulation_admin.html 구조 검증
// ══════════════════════════════════════════════

console.log('\n=== Phase 13 Part D: Admin HTML 구조 검증 ===\n');

const adminHtmlPath = path.join(ROOT, 'admin', 'union_regulation_admin.html');
const adminHtmlExists = fs.existsSync(adminHtmlPath);
assert(adminHtmlExists, 'union_regulation_admin.html 존재');

if (adminHtmlExists) {
  const content = fs.readFileSync(adminHtmlPath, 'utf8');

  // T13-D1: DB 저장 버튼 존재
  assert(
    content.includes('save-to-db') || content.includes('db-save') || content.includes('저장'),
    'DB 저장 버튼 요소 존재'
  );

  // T13-D2: 기존 AI 리포트 버튼 유지
  assert(
    content.includes('copy-report-btn'),
    'AI 리포트 버튼 유지'
  );

  // T13-D3: 기존 constants-container 유지
  assert(
    content.includes('constants-container'),
    'constants-container 유지'
  );

  // T13-D4: 기존 sync-container 유지
  assert(
    content.includes('sync-container'),
    'sync-container 유지'
  );
}

// ── 실행 ──
async function main() {
  await runPartC();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Phase 13 결과: ${passed} PASS / ${failed} FAIL / ${skipped} SKIP`);
  console.log('='.repeat(50));

  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error('테스트 실행 오류:', e);
  process.exit(1);
});
