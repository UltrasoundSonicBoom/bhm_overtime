/**
 * Phase 31: D6 규정 변경 Agent 파이프라인 검증
 *
 * 1. regulation-change-pipeline.ts 스크립트 구조
 * 2. POST /admin/regulation-diff 엔드포인트
 * 3. FAQ 초안 생성 (OpenAI)
 * 4. review queue draft 등록
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
}

const pipelineScript = fs.readFileSync(
  path.join(__dirname, '..', 'server', 'scripts', 'regulation-change-pipeline.ts'), 'utf8');
const adminOps = fs.readFileSync(
  path.join(__dirname, '..', 'server', 'src', 'routes', 'adminOps.ts'), 'utf8');

// ── Test 1: 스크립트 기본 구조 ─────────────────────────────────────────
console.log('\n[Test 1] regulation-change-pipeline.ts 기본 구조');
assert(pipelineScript.includes('--input='), '--input 플래그 지원');
assert(pipelineScript.includes('--apply'), '--apply 플래그 지원 (dry-run 기본)');
assert(pipelineScript.includes('--faq'), '--faq 플래그 지원 (FAQ 생성 옵션)');
assert(pipelineScript.includes('dry-run'), 'dry-run 모드');

// ── Test 2: diff 계산 ─────────────────────────────────────────────────
console.log('\n[Test 2] diff 계산 로직');
assert(pipelineScript.includes("type: 'added'"), 'added 타입 처리');
assert(pipelineScript.includes("type: 'removed'"), 'removed 타입 처리');
assert(pipelineScript.includes("type: 'changed'"), 'changed 타입 처리');
assert(pipelineScript.includes('JSON.stringify'), '값 비교에 JSON.stringify 사용');
assert(pipelineScript.includes('currentMap'), '현행 버전과 비교');

// ── Test 3: DB 연동 ──────────────────────────────────────────────────
console.log('\n[Test 3] DB 연동');
assert(pipelineScript.includes('ruleVersions') || pipelineScript.includes('rule_versions'), 'rule_versions 조회');
assert(pipelineScript.includes('isActive') || pipelineScript.includes('is_active'), '활성 버전 필터');
assert(pipelineScript.includes('rule_entries'), 'rule_entries 조회');
assert(pipelineScript.includes('DATABASE_URL'), 'DATABASE_URL 환경변수');

// ── Test 4: review queue draft 등록 ──────────────────────────────────
console.log('\n[Test 4] review queue draft 등록');
assert(pipelineScript.includes('content_entries'), 'content_entries 테이블에 등록');
assert(pipelineScript.includes("'draft'"), 'draft 상태로 등록');
assert(pipelineScript.includes('regulation_change_draft'), '메타데이터 타입 표시');
assert(pipelineScript.includes('ON CONFLICT DO NOTHING'), '중복 실행 안전');

// ── Test 5: FAQ 생성 ─────────────────────────────────────────────────
console.log('\n[Test 5] FAQ 초안 생성');
assert(pipelineScript.includes('generateFaqDraft'), 'generateFaqDraft 함수 존재');
assert(pipelineScript.includes('gpt-4o-mini'), 'gpt-4o-mini 모델 사용');
assert(pipelineScript.includes("'faq'"), 'FAQ content_type 사용');
assert(pipelineScript.includes('ai_faq_draft'), 'AI 생성 메타데이터 표시');
assert(pipelineScript.includes('OPENAI_API_KEY'), 'OpenAI API Key 환경변수 확인');

// ── Test 6: 서버 API 엔드포인트 ─────────────────────────────────────
console.log('\n[Test 6] POST /admin/regulation-diff 엔드포인트');
assert(adminOps.includes("adminOpsRoutes.post('/regulation-diff'"), 'regulation-diff POST 라우트');
assert(adminOps.includes('newJson') && adminOps.includes('newVersion'), 'newJson, newVersion 파라미터');
assert(adminOps.includes('createDrafts'), 'createDrafts 옵션');
assert(adminOps.includes('baseVersion'), '응답에 기준 버전 포함');
assert(adminOps.includes('regulation_diff.drafts_created'), '감사 로그 기록');

// ── Test 7: diff 결과 구조 ───────────────────────────────────────────
console.log('\n[Test 7] diff 결과 구조');
assert(adminOps.includes("summary: {"), '요약 정보 포함');
assert(adminOps.includes("added:") && adminOps.includes("changed:") && adminOps.includes("removed:"),
  'added/changed/removed 카운트');
assert(adminOps.includes('flattenForDiff'), 'flat-key 변환 함수');

// ── Test 8: 파일 존재 ────────────────────────────────────────────────
console.log('\n[Test 8] 파일 존재 확인');
assert(fs.existsSync(path.join(__dirname, '..', 'server', 'scripts', 'regulation-change-pipeline.ts')),
  'regulation-change-pipeline.ts 파일 존재');

console.log(`\n=== Phase 31 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
