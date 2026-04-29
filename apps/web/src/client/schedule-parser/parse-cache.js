// parse-cache.js — 클라이언트 캐시 + 백엔드 캐시 호출.
// localStorage 기반 1차 캐시 (단말 한정).
// 백엔드(/cache/get, /cache/put) 2차 캐시 (부서·월 공유).
//
// 캐시 키:
//   sha256(file binary) — 1차 (가장 정확)
//   (dept, month, normalizedTitle) — 2차

import { sha256Hex } from './pdf-utils.js';
import { safeValidateDutyGrid } from './validate.js';

const LOCAL_KEY = 'snuhmate_parse_cache_v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일
const DAILY_VISION_LIMIT = 3;

// 백엔드 URL (헬스체크 후 동적 결정)
let _backendUrl = null;
let _backendCheckedAt = 0;
const BACKEND_CACHE_TTL = 30 * 1000; // 헬스체크 30초마다

const BACKEND_CANDIDATES = [
  'http://localhost:8001',
  // Phase 3에서 Tailscale magic DNS 추가 가능
];

/**
 * 백엔드 헬스체크 (1초 타임아웃).
 * @returns {Promise<string|null>} backend URL 또는 null
 */
export async function probeBackend() {
  const now = Date.now();
  if (_backendUrl && (now - _backendCheckedAt) < BACKEND_CACHE_TTL) {
    return _backendUrl;
  }

  for (const url of BACKEND_CANDIDATES) {
    try {
      const ctl = new AbortController();
      const tid = setTimeout(() => ctl.abort(), 1000);
      const resp = await fetch(`${url}/health`, { signal: ctl.signal });
      clearTimeout(tid);
      if (resp.ok) {
        _backendUrl = url;
        _backendCheckedAt = now;
        return url;
      }
    } catch (_e) {
      // 다음 후보로
    }
  }
  _backendUrl = null;
  _backendCheckedAt = now;
  return null;
}

/**
 * 캐시 조회 — sha256 우선, 다음 (dept, month, title).
 * @param {Object} opts
 * @param {string} opts.sha256
 * @param {string} [opts.dept]
 * @param {string} [opts.month]
 * @param {string} [opts.title]
 * @returns {Promise<DutyGrid|null>}
 */
export async function getCache({ sha256, dept, month, title }) {
  // 1차: localStorage
  const local = _getLocal(sha256);
  if (local) return local;

  // 2차: 백엔드 (있으면)
  const backend = await probeBackend();
  if (!backend) return null;

  try {
    const params = new URLSearchParams();
    params.set('hash', sha256);
    if (dept) params.set('dept', dept);
    if (month) params.set('month', month);
    if (title) params.set('title', title);
    const resp = await fetch(`${backend}/cache/get?${params.toString()}`, {
      method: 'GET',
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.hit && data?.result) {
      const validated = safeValidateDutyGrid(data.result);
      if (validated) {
        _putLocal(sha256, validated);
        return validated;
      }
    }
  } catch (e) {
    console.warn('[parse-cache] backend cache get failed', e?.message);
  }
  return null;
}

/**
 * 캐시 저장 — localStorage + 백엔드 양쪽.
 * @param {string} sha256
 * @param {DutyGrid} grid
 * @param {string} [title]
 */
export async function putCache(sha256, grid, title = '') {
  _putLocal(sha256, grid);

  const backend = await probeBackend();
  if (!backend) return;

  try {
    const fd = new FormData();
    fd.set('hash', sha256);
    fd.set('title', title);
    fd.set('grid_json', JSON.stringify(grid));
    await fetch(`${backend}/cache/put`, { method: 'POST', body: fd });
  } catch (e) {
    console.warn('[parse-cache] backend cache put failed', e?.message);
  }
}

/**
 * (dept, month) LLM 호출 카운터 — 차단 여부 + 카운터 증가.
 * @param {string} dept
 * @param {string} month
 * @returns {Promise<{ blocked: boolean, count: number, limit: number }>}
 */
export async function checkAndIncrementDeptMonthCall(dept, month) {
  const backend = await probeBackend();
  if (!backend || !dept || !month) {
    return { blocked: false, count: 0, limit: 3 };
  }

  try {
    // 1. 상태 조회
    const params = new URLSearchParams({ dept, month });
    const statusResp = await fetch(`${backend}/cache/dept-month-status?${params}`);
    if (statusResp.ok) {
      const status = await statusResp.json();
      if (status.blocked) {
        return { blocked: true, count: status.count, limit: status.limit };
      }
    }

    // 2. 증가 (차단 해제 상태에서만)
    const incrFd = new FormData();
    incrFd.set('dept', dept);
    incrFd.set('month', month);
    const incrResp = await fetch(`${backend}/cache/dept-month-increment`, {
      method: 'POST',
      body: incrFd,
    });
    if (incrResp.status === 429) {
      const data = await incrResp.json().catch(() => ({}));
      return { blocked: true, count: 3, limit: 3, message: data.detail };
    }
    if (incrResp.ok) {
      const data = await incrResp.json();
      return { blocked: false, count: data.count, limit: data.limit };
    }
  } catch (e) {
    console.warn('[parse-cache] dept-month counter check failed', e?.message);
  }
  return { blocked: false, count: 0, limit: 3 };
}

// ── Anthropic 일일 한도 (백엔드 부재 시 클라이언트 가드) ──

export function getDailyVisionCount() {
  const today = new Date().toISOString().slice(0, 10);
  const key = `snuhmate_vision_calls_${today}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

export function isDailyVisionLimitReached() {
  return getDailyVisionCount() >= DAILY_VISION_LIMIT;
}

export function incrementDailyVisionCount() {
  const today = new Date().toISOString().slice(0, 10);
  const key = `snuhmate_vision_calls_${today}`;
  const current = getDailyVisionCount();
  localStorage.setItem(key, String(current + 1));
  return current + 1;
}

// ── localStorage 로컬 캐시 ──

function _getLocal(sha256) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const entry = all[sha256];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete all[sha256];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
      return null;
    }
    return safeValidateDutyGrid(entry.grid);
  } catch (_e) {
    return null;
  }
}

function _putLocal(sha256, grid) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[sha256] = {
      grid,
      expiresAt: Date.now() + TTL_MS,
    };
    // 30개 초과 시 가장 오래된 항목 삭제
    const keys = Object.keys(all);
    if (keys.length > 30) {
      keys.sort((a, b) => (all[a].expiresAt || 0) - (all[b].expiresAt || 0));
      delete all[keys[0]];
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('[parse-cache] local put failed', e?.message);
  }
}

/**
 * 파일 + 메타데이터로 캐시 키 + 헬퍼 데이터를 한 번에 계산.
 * @param {File} file
 * @returns {Promise<{ sha256: string, fileName: string, normalizedTitle: string }>}
 */
export async function buildCacheKey(file) {
  const sha256 = await sha256Hex(file);
  const fileName = file?.name || '';
  const normalizedTitle = fileName
    .toLowerCase()
    .replace(/\.(pdf|xlsx?|csv|png|jpe?g)$/i, '')
    .replace(/[\s_\-\.]+/g, '');
  return { sha256, fileName, normalizedTitle };
}
