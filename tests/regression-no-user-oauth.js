/**
 * Regression test: user-facing 번들에 Supabase 직접 사용 금지
 *
 * 실행: node tests/regression-no-user-oauth.js
 *
 * 배경:
 *   2026-04-02 ~ 2026-04-19 사이 redirect_uri_mismatch + Unacceptable audience 도돌이표.
 *   결정 (2026-04-19): 일반 사용자 페이지에서 Supabase 통합 완전 제거.
 *   - 데이터: Google Drive 단독 저장
 *   - 텔레메트리: Sentry 로 전환
 *   - 어드민 페이지 (admin/, nurse_admin/) 는 Supabase 계속 사용 (별도 시스템)
 *
 * 규칙:
 *   아래 user-facing 파일에 다음 패턴이 있으면 FAIL:
 *   - supabase.auth.signInWithOAuth (
 *   - supabase.auth.signInWithIdToken (
 *   - SupabaseUserSync
 *   - SupabaseTelemetry (호환 shim 외에 직접 호출)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const USER_FACING_SCRIPTS = [
  'googleAuth.js',
  'syncManager.js',
  'shared-layout.js',
  'settings-ui.js',
  'app.js',
  'googleDriveStore.js',
  'googleCalendarSync.js',
];

const FORBIDDEN_PATTERNS = [
  { pattern: /\.auth\.signInWithOAuth\s*\(/, name: 'auth.signInWithOAuth(' },
  { pattern: /\.auth\.signInWithIdToken\s*\(/, name: 'auth.signInWithIdToken(' },
  { pattern: /SupabaseUserSync/, name: 'SupabaseUserSync' },
];

let passed = 0;
let failed = 0;
const violations = [];

for (const file of USER_FACING_SCRIPTS) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`  ℹ SKIP: ${file} (파일 없음)`);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  let fileFailed = false;
  for (const { pattern, name } of FORBIDDEN_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      const lineNum = content.slice(0, match.index).split('\n').length;
      violations.push({ file, lineNum, snippet: name });
      fileFailed = true;
    }
  }
  if (fileFailed) {
    failed++;
    console.log(`  ❌ FAIL: ${file}`);
  } else {
    passed++;
    console.log(`  ✅ PASS: ${file}`);
  }
}

// supabaseClient.js 자체가 재생성되지 않았는지도 확인
const supabaseClientPath = path.join(ROOT, 'supabaseClient.js');
if (fs.existsSync(supabaseClientPath)) {
  failed++;
  violations.push({ file: 'supabaseClient.js', lineNum: 0, snippet: 'file exists' });
  console.log(`  ❌ FAIL: supabaseClient.js (파일 존재 — 2026-04-19 결정으로 삭제 필요)`);
} else {
  passed++;
  console.log(`  ✅ PASS: supabaseClient.js (삭제됨)`);
}

console.log('');
console.log(`결과: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('');
  console.error('🚨 REGRESSION 발견: user-facing 코드에 Supabase 직접 사용이 추가됨.');
  console.error('2026-04-19 결정: 일반 사용자 페이지는 Drive 단독 + Sentry 텔레메트리 사용.');
  console.error('');
  console.error('위반 목록:');
  violations.forEach(v => {
    console.error(`  - ${v.file}:${v.lineNum}  ${v.snippet}`);
  });
  console.error('');
  console.error('어드민 페이지 (admin/, nurse_admin/) 는 이 규칙에서 제외되며 Supabase 계속 사용.');
  process.exit(1);
}

console.log('✅ 도돌이표 재발 없음 (Supabase 통합 user-facing에서 깨끗이 제거됨).');
process.exit(0);
