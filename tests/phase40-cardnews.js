/**
 * Phase 40: cardnews.js 정적 검증
 *
 * 1. 상수 + 설정: DAILY_KEYWORD, MAX_CUSTOM_KEYWORDS, STORAGE_KEYS
 * 2. 유틸리티: escapeHtml, stripHtml, truncateText, relativeTime, sortByFreshness
 * 3. 키워드 관리: loadStoredKeywords, persistState, addCustomKeyword, removeCustomKeyword
 * 4. 수집 엔진: fetchGoogleNews(Batch), fetchOpenAlex(Batch), selectTopSources
 * 5. 중복 방지 + requestId: collectAll, collectDailyAutoItems
 * 6. 렌더링: renderCatTabs, renderFeed, createFeedItem, setLoading
 * 7. 설정 패널: openSettings, initSettings, syncSettingsUI, renderCustomChips
 * 8. 상세 뷰: openDetail, closeDetail, buildRelatedEl, fetchSummary (summaryCache)
 * 9. 자동 갱신: shouldAutoRefresh (cadence 기반)
 * 10. 진입점: init() 호출 + state 구조
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

const src = fs.readFileSync(path.join(__dirname, '..', 'cardnews.js'), 'utf8');

// ── Test 1: 상수 + 설정 ──────────────────────────────────────────
console.log('\n[Test 1] 상수 + STORAGE_KEYS');
assert(src.includes("const DAILY_KEYWORD = '의료AI'"), 'DAILY_KEYWORD = 의료AI');
assert(src.includes('const MAX_CUSTOM_KEYWORDS = 3'), 'MAX_CUSTOM_KEYWORDS = 3');
assert(src.includes('const MAX_KEYWORDS = DEFAULT_KEYWORDS.length + MAX_CUSTOM_KEYWORDS'), 'MAX_KEYWORDS 계산');
assert(src.includes("const STORAGE_KEYS ="), 'STORAGE_KEYS 상수');
assert(src.includes("keywords: 'cardnews.keywords'"), 'keywords 스토리지 키');
assert(src.includes("items: 'cardnews.items'"), 'items 스토리지 키');
assert(src.includes("lastCollectedAt: 'cardnews.lastCollectedAt'"), 'lastCollectedAt 스토리지 키');
assert(src.includes("settings: 'cardnews.settings'"), 'settings 스토리지 키');

// ── Test 2: 유틸리티 ─────────────────────────────────────────────
console.log('\n[Test 2] 유틸리티 함수');
assert(src.includes('function escapeHtml'), 'escapeHtml 함수');
assert(src.includes("replace(/&/g, '&amp;')"), 'escapeHtml: & 이스케이프');
assert(src.includes('function stripHtml'), 'stripHtml 함수');
assert(src.includes('/<[^>]+>/g'), 'stripHtml: 태그 제거 regex');
assert(src.includes('function truncateText'), 'truncateText 함수');
assert(src.includes("'…'") || src.includes("'\\u2026'") || src.includes('…'), 'truncateText: 말줄임표');
assert(src.includes('function relativeTime'), 'relativeTime 함수');
assert(src.includes('function sortByFreshness'), 'sortByFreshness 함수');
assert(src.includes('function uniqueBy'), 'uniqueBy 함수');

// ── Test 3: 키워드 관리 ──────────────────────────────────────────
console.log('\n[Test 3] 키워드 관리');
assert(src.includes('function loadStoredKeywords'), 'loadStoredKeywords 함수');
assert(src.includes('function persistState'), 'persistState 함수');
assert(src.includes('localStorage.setItem(STORAGE_KEYS.keywords'), 'keywords localStorage 저장');
assert(src.includes('function addCustomKeyword'), 'addCustomKeyword 함수');
assert(src.includes('function removeCustomKeyword'), 'removeCustomKeyword 함수');
assert(src.includes('function hasKeyword'), 'hasKeyword 함수');
assert(src.includes('function normalizeKeywords'), 'normalizeKeywords 함수');
assert(src.includes('slice(0, MAX_KEYWORDS)'), 'MAX_KEYWORDS 슬라이스 제한');

// ── Test 4: 수집 엔진 ────────────────────────────────────────────
console.log('\n[Test 4] 수집 엔진');
assert(src.includes('async function fetchGoogleNewsBatch'), 'fetchGoogleNewsBatch 함수');
assert(src.includes('async function fetchGoogleNews'), 'fetchGoogleNews 함수');
assert(src.includes('async function fetchOpenAlexBatch'), 'fetchOpenAlexBatch 함수');
assert(src.includes('async function fetchOpenAlex'), 'fetchOpenAlex 함수');
assert(src.includes('function selectTopSources'), 'selectTopSources 함수');
assert(src.includes('async function collectItemsForKeyword'), 'collectItemsForKeyword 함수');
assert(src.includes('function fetchJsonWithTimeout'), 'fetchJsonWithTimeout 함수');
assert(src.includes('sourceLimitPerCategory') || src.includes('slice(0, '), '소스 수 제한 로직');

// ── Test 5: 중복 방지 + requestId ───────────────────────────────
console.log('\n[Test 5] 중복 방지 + requestId');
assert(src.includes('async function collectAll'), 'collectAll 함수');
assert(src.includes('state.requestId++'), 'requestId 증가');
assert(src.includes('var rid = state.requestId'), 'rid 스냅샷');
assert(src.includes('rid !== state.requestId'), 'stale 요청 취소 체크');
assert(src.includes('async function collectDailyAutoItems'), 'collectDailyAutoItems 함수');
assert(src.includes("keywordKey(it.keyword) === keywordKey(DAILY_KEYWORD)"), 'DAILY_KEYWORD 항목 유지');

// ── Test 6: 렌더링 ───────────────────────────────────────────────
console.log('\n[Test 6] 렌더링');
assert(src.includes('function renderCatTabs'), 'renderCatTabs 함수');
assert(src.includes('function renderFeed'), 'renderFeed 함수');
assert(src.includes('function createFeedItem'), 'createFeedItem 함수');
assert(src.includes('function setLoading'), 'setLoading 함수');
assert(src.includes('function getActiveTabKeyword'), 'getActiveTabKeyword 함수');
assert(src.includes("relativeTime(item.publishedAt)"), 'publishedAt 표시');
assert(src.includes('openDetail(item)') || src.includes('openDetail'), 'createFeedItem → openDetail 연결');

// ── Test 7: 설정 패널 ────────────────────────────────────────────
console.log('\n[Test 7] 설정 패널');
assert(src.includes('function openSettings'), 'openSettings 함수');
assert(src.includes('function closeSettings'), 'closeSettings 함수');
assert(src.includes('function initSettings'), 'initSettings 함수');
assert(src.includes('function syncSettingsUI'), 'syncSettingsUI 함수');
assert(src.includes('function renderCustomChips'), 'renderCustomChips 함수');
assert(src.includes('function getCustomKeywords'), 'getCustomKeywords 함수');

// ── Test 8: 상세 뷰 + fetchSummary ──────────────────────────────
console.log('\n[Test 8] 상세 뷰 + fetchSummary');
assert(src.includes('function openDetail'), 'openDetail 함수');
assert(src.includes('function closeDetail'), 'closeDetail 함수');
assert(src.includes('function buildRelatedEl'), 'buildRelatedEl 함수');
assert(src.includes('async function fetchSummary'), 'fetchSummary 함수');
assert(src.includes("var SUMMARY_CACHE_KEY = 'cardnews.summaryCache'"), 'SUMMARY_CACHE_KEY');
assert(src.includes('function loadSummaryCache'), 'loadSummaryCache 함수');
assert(src.includes('function saveSummaryCache'), 'saveSummaryCache 함수');
assert(
  src.includes("'cdBack'") || src.includes("getElementById('cdBack')"),
  'cdBack 뒤로가기 버튼'
);

// ── Test 9: 자동 갱신 shouldAutoRefresh ─────────────────────────
console.log('\n[Test 9] 자동 갱신 shouldAutoRefresh');
assert(src.includes('function shouldAutoRefresh'), 'shouldAutoRefresh 함수');
assert(
  src.includes('cadenceHours') || src.includes('cadence'),
  'cadenceHours 기반 갱신 주기 체크'
);
assert(
  src.includes('lastCollectedAt') && src.includes('Date.now()'),
  'lastCollectedAt vs Date.now() 비교'
);

// ── Test 10: init() + state 구조 ────────────────────────────────
console.log('\n[Test 10] init() + state 구조');
assert(src.includes('function init()'), 'init 함수');
assert(src.includes('init();'), 'init() 자동 호출');
assert(src.includes('const state = {'), 'state 객체');
assert(src.includes('keywords: []'), 'state.keywords');
assert(src.includes('items: []'), 'state.items');
assert(src.includes('loading: false'), 'state.loading');
assert(src.includes('requestId: 0'), 'state.requestId');
assert(src.includes('loadStoredKeywords()'), 'init → loadStoredKeywords');
assert(src.includes('loadSettings()'), 'init → loadSettings');
assert(src.includes('shouldAutoRefresh()'), 'init → shouldAutoRefresh 체크');

console.log(`\n=== Phase 40 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
