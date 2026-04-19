/**
 * Regression test: user-facing 번들에 signInWithOAuth 호출 금지
 *
 * 실행: node tests/regression-no-user-oauth.js
 *
 * 배경:
 *   2026-04-02 ~ 2026-04-19 사이 redirect_uri_mismatch 에러로 3번 도돌이표.
 *   원인 패턴: user-facing 코드 경로에 supabase.auth.signInWithOAuth 가 추가됨
 *   → storagerelay 기반 GIS token client 와 충돌.
 *   FedCM + signInWithIdToken 이 user-facing 의 유일한 허용 경로.
 *   어드민 페이지 (admin/, nurse_admin/) 는 이 규칙에서 제외.
 *
 * 규칙:
 *   아래 파일 중 어느 것도 `supabase.auth.signInWithOAuth(` 를 포함하면 안 됨.
 *   포함 시 FAIL → 같은 종류의 도돌이표 재발 차단.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const USER_FACING_SCRIPTS = [
  'googleAuth.js',
  'supabaseClient.js',
  'syncManager.js',
  'shared-layout.js',
  'settings-ui.js',
  'app.js',
  'googleDriveStore.js',
  'googleCalendarSync.js',
];

const FORBIDDEN_PATTERN = /\.auth\.signInWithOAuth\s*\(/;

let passed = 0;
let failed = 0;
const violations = [];

for (const file of USER_FACING_SCRIPTS) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    // 파일이 없으면 이 테스트 대상에서 제외 (아직 생성 안 된 파일일 수도)
    console.log(`  ℹ SKIP: ${file} (파일 없음)`);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const match = content.match(FORBIDDEN_PATTERN);
  if (match) {
    const lineNum = content.slice(0, match.index).split('\n').length;
    violations.push({ file, lineNum, snippet: match[0] });
    failed++;
    console.log(`  ❌ FAIL: ${file}:${lineNum} 에 signInWithOAuth 호출 발견`);
  } else {
    passed++;
    console.log(`  ✅ PASS: ${file} (signInWithOAuth 호출 없음)`);
  }
}

console.log('');
console.log(`결과: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('');
  console.error('🚨 REGRESSION 발견: user-facing 번들에 signInWithOAuth 가 추가됨.');
  console.error('이 호출은 redirect 기반 OAuth 플로우를 트리거하여 GIS token client 와 충돌.');
  console.error('FedCM + signInWithIdToken 을 사용하세요 (googleAuth.js:_triggerFedCM 참고).');
  console.error('');
  console.error('위반 목록:');
  violations.forEach(v => {
    console.error(`  - ${v.file}:${v.lineNum}  ${v.snippet}`);
  });
  console.error('');
  console.error('어드민 페이지 (admin/, nurse_admin/) 는 이 규칙에서 제외되며 별도로 관리.');
  process.exit(1);
}

console.log('✅ 도돌이표 재발 없음.');
process.exit(0);
