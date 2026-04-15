/**
 * Phase 30: Phase 0 블로커 해결 검증
 *
 * 1. P0 JWT 서명 검증 (jose 사용)
 * 2. P2 HNSW 인덱스 Drizzle migration 추가
 * 3. D5 yearly_archives 테이블 + archive-year.ts 스크립트
 * 4. E2 AI 이력서 엔드포인트 + user_resume_usage 테이블
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

// ── 파일 로드 ──────────────────────────────────────────────────────────────
const authTs = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'middleware', 'auth.ts'), 'utf8');
const schemaTs = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'db', 'schema.ts'), 'utf8');
const archiveScript = fs.readFileSync(path.join(__dirname, '..', 'server', 'scripts', 'archive-year.ts'), 'utf8');
const resumeTs = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'resume.ts'), 'utf8');
const migration5 = fs.readFileSync(path.join(__dirname, '..', 'server', 'drizzle', '0005_yearly_archives_resume_hnsw.sql'), 'utf8');
const serverIndex = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'index.ts'), 'utf8');

// ── Test 1: P0 JWT 서명 검증 ──────────────────────────────────────────────
console.log('\n[Test 1] P0 JWT 서명 검증 (jose 기반)');
assert(authTs.includes("from 'jose'"), 'jose 라이브러리 import');
assert(authTs.includes('jwtVerify'), 'jwtVerify 사용');
assert(authTs.includes('SUPABASE_JWT_SECRET'), 'SUPABASE_JWT_SECRET 환경변수 참조');
assert(authTs.includes("algorithms: ['HS256']"), "HS256 알고리즘 지정");
assert(authTs.includes('verifyJwt'), 'verifyJwt 헬퍼 함수 존재');
assert(authTs.includes('개발 환경'), '시크릿 없을 때 개발모드 fallback 존재');

// ── Test 2: JWT - 서명 실패 시 null 반환 ──────────────────────────────────
console.log('\n[Test 2] JWT 검증 실패 처리');
assert(authTs.includes('return null'), '검증 실패 시 null 반환');
assert(authTs.includes('c.set(\'userId\', null)'), '인증 실패 시 userId null 설정');
// optionalAuth는 실패해도 계속 진행 (optional)
assert(authTs.includes('await next()'), 'optionalAuth: 실패 후에도 next() 호출');

// ── Test 3: P2 HNSW Drizzle migration ──────────────────────────────────
console.log('\n[Test 3] P2 HNSW 인덱스 migration 0005');
assert(migration5.includes('USING hnsw'), 'HNSW 인덱스 타입 사용');
assert(migration5.includes('regulation_documents'), 'regulation_documents 테이블 인덱스');
assert(migration5.includes('faq_entries'), 'faq_entries 테이블 인덱스');
assert(migration5.includes('vector_cosine_ops'), 'cosine 유사도 연산자 지정');
assert(migration5.includes('IF NOT EXISTS'), '중복 실행 안전 (IF NOT EXISTS)');

// ── Test 4: D5 yearly_archives 스키마 ──────────────────────────────────
console.log('\n[Test 4] D5 yearly_archives 테이블 스키마');
assert(schemaTs.includes('yearly_archives'), 'yearly_archives 테이블 정의');
assert(schemaTs.includes('userId') && schemaTs.includes('year') && schemaTs.includes('summaryJson'),
  'user_id, year, summary_json 필드 존재');
assert(schemaTs.includes('ruleVersion'), 'rule_version 필드 존재');
assert(schemaTs.includes('archivedAt'), 'archived_at 필드 존재');
assert(migration5.includes('yearly_archives'), 'migration에 yearly_archives 포함');

// ── Test 5: archive-year.ts 스크립트 ──────────────────────────────────
console.log('\n[Test 5] archive-year.ts 스크립트 구조');
assert(archiveScript.includes('--apply'), '--apply 플래그 지원');
assert(archiveScript.includes('--year='), '--year 파라미터 지원');
assert(archiveScript.includes('dry-run'), 'dry-run 모드 지원');
assert(archiveScript.includes('yearlyArchives'), 'yearlyArchives 테이블 참조');
assert(archiveScript.includes('upsert') || archiveScript.includes('ON CONFLICT') || archiveScript.includes('existing.length'),
  'upsert 처리 (중복 실행 안전)');
assert(archiveScript.includes('summaryJson'), 'summaryJson 포함');
assert(archiveScript.includes('ruleVersion'), 'ruleVersion 기록');

// ── Test 6: E2 user_resume_usage 스키마 ──────────────────────────────────
console.log('\n[Test 6] E2 user_resume_usage 테이블 스키마');
assert(schemaTs.includes('user_resume_usage'), 'user_resume_usage 테이블 정의');
assert(schemaTs.includes('resumeGeneratedAt'), 'resume_generated_at 필드 존재');
assert(migration5.includes('user_resume_usage'), 'migration에 user_resume_usage 포함');
assert(migration5.includes('UNIQUE'), 'user_id UNIQUE 제약 조건');

// ── Test 7: E2 /api/resume 엔드포인트 ──────────────────────────────────
console.log('\n[Test 7] E2 /api/resume 엔드포인트');
assert(resumeTs.includes("resumeRoutes.post('/'"), 'POST / 라우트 정의');
assert(resumeTs.includes('workHistory'), 'workHistory 파라미터 수신');
assert(resumeTs.includes('isSameYearMonth'), '월 1회 제한 로직 존재');
assert(resumeTs.includes('gpt-4o-mini'), 'gpt-4o-mini 모델 사용');
assert(resumeTs.includes('limitExceeded'), '한도 초과 시 응답 필드');
assert(resumeTs.includes('fallback'), '폴백 응답 지원');
assert(resumeTs.includes('ON CONFLICT'), 'usage upsert (중복 실행 안전)');
assert(serverIndex.includes("route('/resume'"), '서버 index에 /resume 라우트 등록');

// ── Test 8: resume 엔드포인트 — 인증 요구 ────────────────────────────────
console.log('\n[Test 8] resume 엔드포인트 인증 처리');
assert(resumeTs.includes('optionalAuth'), 'optionalAuth 미들웨어 사용');
assert(resumeTs.includes("'로그인 후 이용 가능합니다'") || resumeTs.includes('401'),
  '로그인 없으면 401 반환');

// ── Test 9: 관련 파일 존재 확인 ────────────────────────────────────────
console.log('\n[Test 9] 파일 존재 확인');
assert(fs.existsSync(path.join(__dirname, '..', 'server', 'scripts', 'archive-year.ts')),
  'archive-year.ts 파일 존재');
assert(fs.existsSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'resume.ts')),
  'resume.ts 파일 존재');
assert(fs.existsSync(path.join(__dirname, '..', 'server', 'drizzle', '0005_yearly_archives_resume_hnsw.sql')),
  '0005 migration 파일 존재');

const journal = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'server', 'drizzle', 'meta', '_journal.json'), 'utf8'));
const entry5 = journal.entries.find(e => e.idx === 5);
assert(entry5 && entry5.tag === '0005_yearly_archives_resume_hnsw', '_journal.json에 0005 항목 등록');

// ── 결과 출력 ──────────────────────────────────────────────────────────────
console.log(`\n=== Phase 30 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
