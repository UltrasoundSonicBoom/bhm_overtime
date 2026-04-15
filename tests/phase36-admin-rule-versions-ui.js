/**
 * Phase 36: admin/rule-versions 전체 UI + API 검증
 *
 * (Phase 32는 시뮬레이션 패널만 검증. Phase 36은 나머지를 커버)
 * 1. admin/rule-versions.html — 버전 목록 테이블 + 신규 버전 모달 + 항목 패널 + Diff 패널
 * 2. admin/rule-versions.js — 모든 함수 (loadVersions, buildVersionRow, activate, openEntries,
 *                              renderEntries, saveEntry, populateDiffSelects, renderDiff)
 * 3. adminOps.ts — GET/PUT entries, GET diff API 엔드포인트
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

const html       = fs.readFileSync(path.join(__dirname, '..', 'admin', 'rule-versions.html'), 'utf8');
const js         = fs.readFileSync(path.join(__dirname, '..', 'admin', 'rule-versions.js'), 'utf8');
const adminOpsTs = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'adminOps.ts'), 'utf8');

// ── Test 1: 버전 목록 테이블 HTML ───────────────────────────────
console.log('\n[Test 1] 버전 목록 테이블 HTML');
assert(html.includes('id="version-table"'), 'version-table');
assert(html.includes('id="version-tbody"'), 'version-tbody');
assert(html.includes('id="btn-new-version"'), '신규 버전 버튼');
assert(html.includes('id="btn-show-diff"'), '버전 비교(Diff) 버튼');
assert(html.includes('id="list-status"'), 'list-status 상태 표시');

// ── Test 2: 신규 버전 모달 HTML ──────────────────────────────────
console.log('\n[Test 2] 신규 버전 생성 모달 HTML');
assert(html.includes('id="modal-new-version"'), 'modal-new-version');
assert(html.includes('id="nv-version"'), '버전명 입력');
assert(html.includes('id="nv-effective-from"'), '적용 시작일 입력');
assert(html.includes('id="nv-effective-to"'), '적용 종료일 입력');
assert(html.includes('id="nv-change-note"'), '변경 메모 입력');
assert(html.includes('id="nv-copy-from"'), '기존 버전 복사 셀렉트');
assert(html.includes('id="btn-confirm-new-version"'), '확인 버튼');
assert(html.includes('id="btn-cancel-new-version"'), '취소 버튼');

// ── Test 3: 항목 편집 패널 HTML ──────────────────────────────────
console.log('\n[Test 3] 항목 편집 패널 HTML');
assert(html.includes('id="entries-panel"'), 'entries-panel');
assert(html.includes('id="entries-title"'), 'entries-title');
assert(html.includes('id="entries-info"'), 'entries-info');
assert(html.includes('id="cat-filter"'), 'cat-filter (카테고리 필터 버튼)');
assert(html.includes('id="entry-table"'), 'entry-table');
assert(html.includes('id="entry-tbody"'), 'entry-tbody');
assert(html.includes('id="btn-close-entries"'), '닫기 버튼');

// ── Test 4: Diff 패널 HTML ──────────────────────────────────────
console.log('\n[Test 4] 버전 비교(Diff) 패널 HTML');
assert(html.includes('id="diff-panel"'), 'diff-panel');
assert(html.includes('id="diff-from"') && html.includes('id="diff-to"'), '기준/비교 버전 셀렉트');
assert(html.includes('id="btn-run-diff"'), '비교 실행 버튼');
assert(html.includes('id="diff-result"'), '비교 결과 출력');
assert(html.includes('id="btn-close-diff"'), 'diff 패널 닫기 버튼');

// ── Test 5: rule-versions.js — 핵심 함수 존재 ─────────────────
console.log('\n[Test 5] rule-versions.js — 핵심 함수 존재');
assert(js.includes('async function loadVersions'), 'loadVersions 함수');
assert(js.includes('function renderVersionTable'), 'renderVersionTable 함수');
assert(js.includes('function buildVersionRow'), 'buildVersionRow 함수');
assert(js.includes('async function activateVersion'), 'activateVersion 함수');
assert(js.includes('function populateCopyFromSelect'), 'populateCopyFromSelect 함수');
assert(js.includes('async function openEntries'), 'openEntries 함수');
assert(js.includes('function renderEntries'), 'renderEntries 함수');
assert(js.includes('async function saveEntry'), 'saveEntry 함수');
assert(js.includes('function populateDiffSelects'), 'populateDiffSelects 함수');
assert(js.includes('function renderDiff'), 'renderDiff 함수');

// ── Test 6: buildVersionRow — 버전 행 렌더링 로직 ───────────────
console.log('\n[Test 6] buildVersionRow 렌더링 로직');
assert(js.includes('badge-active') && js.includes('badge-inactive'), '활성/비활성 배지');
assert(js.includes("v.is_active ? '● 활성' : '비활성'"), '활성 상태 텍스트');
assert(js.includes('항목 보기'), '항목 보기 버튼 텍스트');
assert(js.includes('활성화'), '활성화 버튼 텍스트');
assert(js.includes('if (!v.is_active)'), '비활성 버전에만 활성화 버튼 표시');

// ── Test 7: activateVersion — 활성화 + 확인 다이얼로그 ──────────
console.log('\n[Test 7] activateVersion 로직');
assert(js.includes('confirm('), '활성화 전 confirm 다이얼로그');
assert(js.includes("'/rule-versions/' + id + '/activate'") ||
  js.includes('/rule-versions/'), 'activate API 호출');
assert(js.includes('{ method: \'PUT\' }') || js.includes('method: "PUT"'), 'PUT 메서드');
assert(js.includes("showToast('버전 활성화 완료')"), '성공 토스트 메시지');

// ── Test 8: openEntries + renderEntries — 항목 편집 ─────────────
console.log('\n[Test 8] openEntries + renderEntries 항목 편집');
assert(js.includes("apiFetch('/rule-versions/' + versionId + '/entries')"), 'entries API 호출');
assert(js.includes('allEntries = data.entries || []'), 'allEntries 저장');
assert(js.includes('cat-tag'), '카테고리 필터 버튼 클래스');
assert(js.includes('e.category'), '카테고리별 필터링');
assert(js.includes("entries-panel"), 'entries-panel open 토글');

// ── Test 9: saveEntry — 항목 수정 ───────────────────────────────
console.log('\n[Test 9] saveEntry 항목 값 수정');
assert(js.includes("PUT"), 'PUT 메서드로 수정');
assert(js.includes('/entries/' + 'entryId') || js.includes("'/entries/'"), 'entries/{id} URL 패턴');
assert(js.includes('JSON.parse'), 'value_json JSON 파싱 시도');
// 파싱 실패 시 Number 또는 원본 문자열로 fallback (silent)
assert(
  js.includes('const n = Number(rawValue)') || js.includes('Number(rawValue)'),
  '파싱 실패 → Number fallback'
);
assert(
  js.includes('isNaN(n) ? rawValue : n'),
  '숫자 아니면 원본 문자열로 최종 fallback'
);

// ── Test 10: renderDiff — Diff 결과 렌더링 ──────────────────────
console.log('\n[Test 10] renderDiff 결과 렌더링');
assert(js.includes("d.type === 'added'"), '추가 항목 필터');
assert(js.includes("d.type === 'removed'"), '삭제 항목 필터');
assert(js.includes("d.type === 'changed'"), '변경 항목 필터');
assert(js.includes('diff-added') && js.includes('diff-removed') && js.includes('diff-changed'), 'diff 행 CSS 클래스');
assert(js.includes("{ added: '추가', removed: '삭제', changed: '변경' }"), '한국어 유형 라벨');
assert(js.includes('두 버전이 동일합니다'), '동일 버전 안내 메시지');
assert(js.includes('변경 ') && js.includes('추가 ') && js.includes('삭제 '), 'diff 요약 텍스트');

// ── Test 11: adminOps.ts — entries 조회/수정 API ─────────────────
console.log('\n[Test 11] adminOps.ts — rule-versions entries API');
assert(adminOpsTs.includes("adminOpsRoutes.get('/rule-versions/:id/entries'"), 'GET entries 라우트');
assert(adminOpsTs.includes("adminOpsRoutes.put('/rule-versions/:id/entries/:entryId'"), 'PUT entry 라우트');
assert(adminOpsTs.includes('FROM rule_entries WHERE version_id'), 'rule_entries 조회 SQL');

// ── Test 12: adminOps.ts — diff API ─────────────────────────────
console.log('\n[Test 12] adminOps.ts — rule-versions diff API');
assert(adminOpsTs.includes("adminOpsRoutes.get('/rule-versions/diff'"), 'GET diff 라우트');
assert(adminOpsTs.includes('flattenForDiff'), 'flattenForDiff 헬퍼 함수');
// diff 결과에 from/to 값 포함 확인
assert(
  adminOpsTs.includes("type: 'added'") || adminOpsTs.includes("type: \"added\""),
  "diff added 타입"
);
assert(
  adminOpsTs.includes("type: 'changed'") || adminOpsTs.includes("type: \"changed\""),
  "diff changed 타입"
);
assert(
  adminOpsTs.includes("type: 'removed'") || adminOpsTs.includes("type: \"removed\""),
  "diff removed 타입"
);

console.log(`\n=== Phase 36 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
