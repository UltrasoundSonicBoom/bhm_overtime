// sw.js — Service Worker (offline-first + 안전 갱신)
//
// 안전 원칙 (사용자가 옛 UI 에 갇히는 사고 방지):
//   1) skipWaiting + clients.claim → 새 SW 즉시 활성화
//   2) HTML 은 network-first → 배포 즉시 반영 (사용자가 옛 화면 안 봄)
//   3) /assets/[hash].* 는 cache-first → hash 가 변경 감지하니 immutable 안전
//   4) /data/*.json 은 stale-while-revalidate → 즉시 표시 + 백그라운드 갱신
//   5) 버전 변경 시 옛 캐시 자동 삭제
//   6) 외부 도메인 (gtag/sentry/cdn) 은 캐시 없이 통과
//
// 디버깅:
//   Chrome DevTools → Application → Service Workers
//   "Update on reload" 체크 시 매 새로고침마다 SW 강제 갱신

'use strict';

// 캐시 버전 — 변경 시 옛 캐시 자동 삭제 + 새 SW 즉시 활성화
// 단협 갱신·중대 변경 시 bump (코드 hash 는 자동이라 bump 불필요)
const CACHE_VERSION = '2026-04-27-v4'; // bump: 데이터 lifecycle 정책 (save 빈값 보호 + USER_DATA_PATTERNS 보강 + PII selective wipe)
const CACHE_RUNTIME = `snuhmate-runtime-${CACHE_VERSION}`;
const CACHE_PRECACHE = `snuhmate-precache-${CACHE_VERSION}`;

// 오프라인 fallback 용 최소 자산 (HTML — 빌드 시 hash 안 붙음)
const PRECACHE_URLS = [
  '/index.html',
  '/regulation.html',
  '/retirement.html',
  '/manifest.json',
];

// ── install ──────────────────────────────────────
// PRECACHE_URLS 미리 받아두기. 실패해도 SW 자체는 계속 설치 (개별 요청은 fetch 핸들러 처리).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_PRECACHE)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())  // 새 SW 즉시 waiting → activate 로
  );
});

// ── activate ─────────────────────────────────────
// 옛 버전 캐시 정리 + 즉시 클라이언트 제어
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((k) => k.startsWith('snuhmate-') && !k.includes(CACHE_VERSION))
        .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── fetch 라우팅 ───────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 외부 도메인 (gtag, sentry, cdnjs 등) → 통과
  if (url.origin !== self.location.origin) return;

  // /assets/[hash].* — cache-first (hash 가 immutable 보장)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // /data/*.json — stale-while-revalidate (즉시 + 백그라운드 갱신)
  if (url.pathname.startsWith('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // HTML — network-first (배포 즉시 반영, 실패 시 캐시 폴백)
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(req));
    return;
  }

  // 그 외 (이미지, manifest 등) — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});

// ── 전략 ──────────────────────────────────────────

// cache-first: 캐시 hit 즉시 반환, miss 시 네트워크 + 캐시
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_RUNTIME);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    // 오프라인이고 캐시도 없을 때 — 504 같은 placeholder
    return new Response('', { status: 504, statusText: 'offline + no cache' });
  }
}

// network-first: 네트워크 우선, 실패 시 캐시 폴백
async function networkFirst(req) {
  const cache = await caches.open(CACHE_RUNTIME);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req) || await caches.match(req);
    if (cached) return cached;
    throw e;
  }
}

// stale-while-revalidate: 캐시 즉시 반환 + 백그라운드 갱신
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_RUNTIME);
  const cached = await cache.match(req);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);  // 오프라인이면 캐시 그대로
  return cached || network;
}

// ── 메시지 (선택) — 페이지에서 SW 강제 업데이트 트리거 ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
