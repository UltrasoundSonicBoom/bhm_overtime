/**
 * Phase 35: Track D — 규정 버전 관리 시스템 검증
 *
 * D1: rule_versions + rule_entries Drizzle 스키마
 * D2: migrate-rules-from-json.ts 마이그레이션 스크립트
 * D3: calculators.js ruleSet 파라미터 주입 방식
 * D4 API: /admin/rule-versions CRUD + activate + simulate (Phase 32에서 simulate 별도 검증)
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

const schemaTs      = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'db', 'schema.ts'), 'utf8');
const migrateTs     = fs.readFileSync(path.join(__dirname, '..', 'server', 'scripts', 'migrate-rules-from-json.ts'), 'utf8');
const calcJs        = fs.readFileSync(path.join(__dirname, '..', 'calculators.js'), 'utf8');
const adminOpsTs    = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'adminOps.ts'), 'utf8');

// ── Test 1: D1 rule_versions 스키마 ─────────────────────────────
console.log('\n[Test 1] D1 rule_versions 테이블 스키마');
assert(schemaTs.includes("'rule_versions'"), 'rule_versions 테이블 정의');
assert(schemaTs.includes("version: text('version').notNull().unique()"), 'version 컬럼 (unique)');
assert(schemaTs.includes("effectiveFrom: date('effective_from').notNull()"), 'effective_from 컬럼');
assert(schemaTs.includes("effectiveTo: date('effective_to')"), 'effective_to 컬럼 (null 허용)');
assert(schemaTs.includes("isActive: boolean('is_active').notNull().default(false)"), 'is_active 컬럼');
assert(schemaTs.includes("changeNote: text('change_note')"), 'change_note 컬럼');
assert(schemaTs.includes("'rule_versions_active_idx'"), 'is_active 인덱스');
assert(schemaTs.includes("'rule_versions_effective_idx'"), 'effective_from 인덱스');

// ── Test 2: D1 rule_entries 스키마 ──────────────────────────────
console.log('\n[Test 2] D1 rule_entries 테이블 스키마');
assert(schemaTs.includes("'rule_entries'"), 'rule_entries 테이블 정의');
assert(schemaTs.includes("versionId: integer('version_id')"), 'version_id FK 컬럼');
assert(schemaTs.includes("references(() => ruleVersions.id, { onDelete: 'cascade' })"), 'CASCADE 삭제');
assert(schemaTs.includes("category: text('category').notNull()"), 'category 컬럼');
assert(schemaTs.includes("key: text('key').notNull()"), 'key 컬럼 (dot-path)');
assert(schemaTs.includes("valueJson: jsonb('value_json').notNull()"), 'value_json JSONB 컬럼');
assert(schemaTs.includes("'rule_entries_version_key_idx'"), '버전+키 unique 인덱스');
assert(schemaTs.includes("uniqueIndex('rule_entries_version_key_idx')"), 'uniqueIndex 사용');

// ── Test 3: D2 마이그레이션 스크립트 — 기본 구조 ─────────────────
console.log('\n[Test 3] D2 migrate-rules-from-json.ts — 기본 구조');
assert(migrateTs.includes("'2026.1.0'") || migrateTs.includes('"2026.1.0"'), 'VERSION 상수 (2026.1.0)');
assert(migrateTs.includes('--apply'), '--apply 플래그 dry-run 분기');
assert(migrateTs.includes('function flatten'), 'flatten 함수 (dot-path 변환)');
assert(migrateTs.includes('function buildEntries'), 'buildEntries 함수');
assert(migrateTs.includes("hospital_rule_master_2026.json"), '소스 JSON 파일 참조');
assert(migrateTs.includes("ruleVersions"), 'ruleVersions import');
assert(migrateTs.includes("ruleEntries"), 'ruleEntries import');

// ── Test 4: D2 마이그레이션 스크립트 — dry-run 로직 ─────────────
console.log('\n[Test 4] D2 migrate-rules-from-json.ts — dry-run + upsert');
assert(migrateTs.includes('if (!APPLY)'), 'dry-run 종료 분기');
assert(migrateTs.includes('upsert') || migrateTs.includes('onConflict') || migrateTs.includes('ON CONFLICT'),
  'upsert 처리 (중복 실행 안전)');
assert(migrateTs.includes('DATABASE_URL'), 'DATABASE_URL 환경변수 체크');
assert(migrateTs.includes("Array.isArray"), '배열 전체를 jsonb로 저장 (인덱스 폭발 방지)');

// ── Test 5: D3 계산엔진 ruleSet 주입 — _getRuleValue ─────────────
console.log('\n[Test 5] D3 calculators.js — _getRuleValue 헬퍼');
assert(calcJs.includes('_getRuleValue(ruleSet, category, dotPath)'), '_getRuleValue 함수 시그니처');
assert(calcJs.includes("dotPath.split('.')"), 'dot-path 분리');
assert(calcJs.includes('if (!ruleSet || !ruleSet[category]) return undefined'), 'ruleSet null 처리');

// ── Test 6: D3 계산엔진 ruleSet 주입 — calcOrdinaryWage ─────────
console.log('\n[Test 6] D3 calculators.js — calcOrdinaryWage ruleSet 주입');
assert(calcJs.includes('calcOrdinaryWage(jobType, grade, year, extras = {}, ruleSet = null)'),
  'calcOrdinaryWage ruleSet 파라미터');
assert(calcJs.includes("_getRuleValue(ruleSet, 'wage_tables_2025'") ||
  calcJs.includes('_getRuleValue(ruleSet,'), 'wage_tables_2025 카테고리 조회');
assert(calcJs.includes("_getRuleValue(ruleSet, 'wage_structure_and_allowances'") ||
  calcJs.includes("_getRuleValue(ruleSet, 'wage_structure"), '고정수당 카테고리 조회');
assert(calcJs.includes('?? table.basePay') || calcJs.includes('?? DATA'), 'DATA fallback 유지');
assert(calcJs.includes('rsGrade?.base_salary_by_year?.[yearIdx]') ||
  calcJs.includes('rsGrade?.base_salary_by_year'), 'ruleSet 주입 보수표 조회');

// ── Test 7: D2 admin API — 버전 목록 + 생성 ─────────────────────
console.log('\n[Test 7] 규정 버전 관리 API — GET/POST /admin/rule-versions');
assert(adminOpsTs.includes("adminOpsRoutes.get('/rule-versions'"), 'GET /rule-versions 라우트');
assert(adminOpsTs.includes("adminOpsRoutes.post('/rule-versions'"), 'POST /rule-versions 라우트');
assert(adminOpsTs.includes('FROM rule_versions'), 'rule_versions 조회 SQL');
assert(adminOpsTs.includes('insert into rule_versions'), 'rule_versions 삽입 SQL');

// ── Test 8: D2 admin API — 활성화 + diff ────────────────────────
console.log('\n[Test 8] 규정 버전 관리 API — activate + diff');
assert(adminOpsTs.includes("adminOpsRoutes.put('/rule-versions/:id/activate'"), 'PUT /activate 라우트');
assert(adminOpsTs.includes('update rule_versions set is_active = false'), '기존 active 해제');
assert(adminOpsTs.includes('update rule_versions set is_active = true'), '신규 버전 활성화');
assert(
  adminOpsTs.includes("regulation-diff") || adminOpsTs.includes('regulation_diff'),
  'regulation_diff 라우트 (D6 파이프라인)'
);
assert(adminOpsTs.includes('flattenForDiff') || adminOpsTs.includes('diff.length'),
  'diff 계산 로직 존재');
assert(
  adminOpsTs.includes("added: diff.filter") || adminOpsTs.includes("diff.filter((d) => d.type === 'added')"),
  'added/changed/removed 카운트 응답'
);

// ── Test 9: hospital_rule_master_2026.json 소스 파일 존재 ────────
console.log('\n[Test 9] 소스 데이터 파일 존재 여부');
const masterJsonPath = path.join(__dirname, '..', 'data', 'hospital_rule_master_2026.json');
assert(fs.existsSync(masterJsonPath), 'hospital_rule_master_2026.json 파일 존재');
if (fs.existsSync(masterJsonPath)) {
  const masterJson = JSON.parse(fs.readFileSync(masterJsonPath, 'utf8'));
  const topKeys = Object.keys(masterJson).filter(k => k !== '_meta');
  assert(topKeys.length >= 5, `최상위 카테고리 5개 이상 (발견: ${topKeys.length}개)`);
  assert(topKeys.includes('wage_tables_2025') || topKeys.some(k => k.startsWith('wage')), 'wage_tables 카테고리 포함');
}

// ── Test 10: D3 ruleSet fallback 동작 (정적 검증) ───────────────
console.log('\n[Test 10] D3 ruleSet=null fallback 검증 (정적 분석)');
// ruleSet이 null일 때 기존 DATA를 사용하는 패턴 확인
assert(calcJs.includes('?? table.basePay') || calcJs.includes('|| table.basePay') ||
  calcJs.includes('?? DATA'), 'ruleSet null → DATA 값으로 fallback');
// calcOvertimePay도 ruleSet 지원하는지 확인
assert(
  calcJs.includes('calcOvertimePay') && (calcJs.includes('ruleSet') || calcJs.includes('ruleSet = null')),
  'calcOvertimePay에서도 ruleSet 참조'
);

console.log(`\n=== Phase 35 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
