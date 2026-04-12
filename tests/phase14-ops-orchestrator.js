/**
 * Phase 14 TDD: Ops Orchestrator Live Activation
 * 실행: node tests/phase14-ops-orchestrator.js [--api http://localhost:3001]
 *
 * Part A: Review Queue UI 검증 (오프라인)
 * Part B: 상태 전환 로직 검증 (오프라인)
 * Part C: Ops 프롬프트/계약 검증 (오프라인)
 * Part D: API 통합 검증 (서버 필요)
 *
 * RED 단계: Part A/C FAIL
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
// Part A: Review Queue UI 검증
// ══════════════════════════════════════════════

console.log('\n=== Phase 14 Part A: Review Queue UI 검증 ===\n');

// T14-A1: review-queue.html 존재
const reviewHtmlPath = path.join(ROOT, 'admin', 'review-queue.html');
const reviewHtmlExists = fs.existsSync(reviewHtmlPath);
assert(reviewHtmlExists, 'review-queue.html 존재');

if (reviewHtmlExists) {
  const content = fs.readFileSync(reviewHtmlPath, 'utf8');

  // T14-A2: approval 목록 로드 로직
  assert(
    content.includes('approvals') || content.includes('approval') || content.includes('pending'),
    'approval 목록 로드 관련 요소 존재'
  );

  // T14-A3: 승인 버튼 존재
  assert(
    content.includes('승인') || content.includes('approve') || content.includes('approved'),
    '승인 버튼/액션 존재'
  );

  // T14-A4: 반려 버튼 존재
  assert(
    content.includes('반려') || content.includes('reject') || content.includes('rejected'),
    '반려 버튼/액션 존재'
  );

  // T14-A5: 반려 사유 입력 필드
  assert(
    content.includes('note') || content.includes('reason') || content.includes('사유') || content.includes('textarea') || content.includes('decision-note'),
    '반려 사유 입력 필드 존재'
  );
}

// T14-A6: review-queue.js 존재
const reviewJsPath = path.join(ROOT, 'admin', 'review-queue.js');
const reviewJsExists = fs.existsSync(reviewJsPath);
assert(reviewJsExists, 'review-queue.js 존재');

if (reviewJsExists) {
  const content = fs.readFileSync(reviewJsPath, 'utf8');

  // T14-A7: API 호출 로직
  assert(
    content.includes('/api/admin/approvals') || content.includes('approval'),
    'approvals API 호출 로직 존재'
  );

  // T14-A8: decision POST 로직
  assert(
    content.includes('decision') && (content.includes('POST') || content.includes('post')),
    'decision POST 로직 존재'
  );
}

// T14-A9: admin/index.html에서 review-queue 링크
const adminIndexPath = path.join(ROOT, 'admin', 'index.html');
if (fs.existsSync(adminIndexPath)) {
  const content = fs.readFileSync(adminIndexPath, 'utf8');
  assert(
    content.includes('review-queue') || content.includes('review_queue'),
    'admin/index.html에 review-queue 링크 존재'
  );
} else {
  assert(false, 'admin/index.html 미존재');
}

// ══════════════════════════════════════════════
// Part B: 상태 전환 로직 검증
// ══════════════════════════════════════════════

console.log('\n=== Phase 14 Part B: 상태 전환 로직 검증 ===\n');

const adminOpsServicePath = path.join(ROOT, 'server', 'src', 'services', 'admin-ops.ts');
if (fs.existsSync(adminOpsServicePath)) {
  const content = fs.readFileSync(adminOpsServicePath, 'utf8');

  // T14-B1: draft -> review 허용
  assert(
    content.includes("draft") && content.includes("review"),
    'draft -> review 전환 정의'
  );

  // T14-B2: review -> published 허용
  assert(
    content.includes("review") && content.includes("published"),
    'review -> published 전환 정의'
  );

  // T14-B3: draft -> published 직접 전환 불가 확인
  // allowedTransitions.draft 배열에 'published'가 없어야 함
  const draftTransitions = content.match(/draft:\s*\[([^\]]+)\]/);
  if (draftTransitions) {
    const allowed = draftTransitions[1];
    assert(
      !allowed.includes("'published'") && !allowed.includes('"published"'),
      'draft -> published 직접 전환 차단 (auto-publish 불가)'
    );
  } else {
    assert(false, 'draft 전환 규칙 파싱 실패');
  }

  // T14-B4: published -> review 재검토 가능
  const publishedTransitions = content.match(/published:\s*\[([^\]]+)\]/);
  if (publishedTransitions) {
    const allowed = publishedTransitions[1];
    assert(
      allowed.includes('review'),
      'published -> review 재검토 가능'
    );
  } else {
    assert(false, 'published 전환 규칙 파싱 실패');
  }

  // T14-B5: 승인 시 published 전환 로직
  assert(
    content.includes('approved') && content.includes('published'),
    '승인 시 published 전환 로직 존재'
  );

  // T14-B6: 반려 시 draft 복귀 로직
  assert(
    content.includes('rejected') || content.includes("entryStatus: 'draft'"),
    '반려 시 draft 복귀 로직 존재'
  );
} else {
  for (let i = 0; i < 6; i++) {
    assert(false, `admin-ops.ts 미존재 - B${i+1} 스킵`);
  }
}

// ══════════════════════════════════════════════
// Part C: Ops 프롬프트/계약 검증
// ══════════════════════════════════════════════

console.log('\n=== Phase 14 Part C: Ops 프롬프트 검증 ===\n');

// T14-C1: ops/prompts/ 에 운영 프롬프트 존재
const opsPromptsDir = path.join(ROOT, 'ops', 'prompts');
const opsPromptsExists = fs.existsSync(opsPromptsDir);
assert(opsPromptsExists, 'ops/prompts/ 디렉토리 존재');

if (opsPromptsExists) {
  const promptFiles = fs.readdirSync(opsPromptsDir).filter(f => !f.startsWith('.'));
  assert(
    promptFiles.length > 0,
    `ops/prompts/ 에 프롬프트 파일 존재 (${promptFiles.length}개)`
  );

  // T14-C2: API 계약 문서 존재
  const hasContract = promptFiles.some(f =>
    f.includes('contract') || f.includes('api') || f.includes('guide')
  );
  assert(
    hasContract,
    'ops/prompts/ 에 API 계약/가이드 파일 존재'
  );
}

// T14-C3: ops-orchestrator 에이전트 정의에 API 참조
const opsOrcPath = path.join(ROOT, '.claude', 'agents', 'ops-orchestrator.md');
if (fs.existsSync(opsOrcPath)) {
  const content = fs.readFileSync(opsOrcPath, 'utf8');
  assert(
    content.includes('/api/admin') || content.includes('admin'),
    'ops-orchestrator에 admin API 참조'
  );
} else {
  assert(false, 'ops-orchestrator.md 미존재');
}

// ══════════════════════════════════════════════
// Part D: API 통합 검증 (서버 필요)
// ══════════════════════════════════════════════

console.log('\n=== Phase 14 Part D: API 통합 검증 ===\n');

async function runPartD() {
  if (!API_BASE) {
    skip('API_BASE 미지정');
    skip('Part D 전체 스킵');
    return;
  }

  // T14-D1: GET /api/admin/approvals 엔드포인트 존재
  try {
    const res = await fetch(`${API_BASE}/api/admin/approvals?status=pending`);
    assert(
      [200, 401, 403].includes(res.status),
      `GET /approvals 엔드포인트 존재 (status: ${res.status})`
    );
  } catch (e) {
    assert(false, `API 접속 실패: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════
// Part E: 기존 admin 회귀 검증
// ══════════════════════════════════════════════

console.log('\n=== Phase 14 Part E: 기존 admin 회귀 검증 ===\n');

// T14-E1: admin/index.html 존재 및 정상
if (fs.existsSync(adminIndexPath)) {
  const content = fs.readFileSync(adminIndexPath, 'utf8');
  assert(content.includes('<!DOCTYPE html>'), 'admin/index.html 정상 HTML');
  assert(content.includes('규정'), 'admin/index.html 규정 관련 콘텐츠 유지');
}

// T14-E2: union_regulation_admin.html 존재
const uniRegPath = path.join(ROOT, 'admin', 'union_regulation_admin.html');
assert(fs.existsSync(uniRegPath), 'union_regulation_admin.html 존재');

// T14-E3: adminOps.ts 기존 엔드포인트 유지
const adminOpsPath = path.join(ROOT, 'server', 'src', 'routes', 'adminOps.ts');
if (fs.existsSync(adminOpsPath)) {
  const content = fs.readFileSync(adminOpsPath, 'utf8');
  assert(content.includes("get('/versions'"), 'GET /versions 엔드포인트 유지');
  assert(content.includes("get('/faqs'"), 'GET /faqs 엔드포인트 유지');
  assert(content.includes("get('/content'"), 'GET /content 엔드포인트 유지');
  assert(content.includes("get('/approvals'"), 'GET /approvals 엔드포인트 유지');
  assert(content.includes("get('/audit-logs'"), 'GET /audit-logs 엔드포인트 유지');
}

// ── 실행 ──
async function main() {
  await runPartD();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Phase 14 결과: ${passed} PASS / ${failed} FAIL / ${skipped} SKIP`);
  console.log('='.repeat(50));

  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error('테스트 실행 오류:', e);
  process.exit(1);
});
