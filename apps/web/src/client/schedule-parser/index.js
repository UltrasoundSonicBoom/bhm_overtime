// schedule-parser/index.js — 진입점.
//
// parseScheduleFile(file, opts):
//   1. sha256 + 정규화된 제목 추출
//   2. 캐시 조회 (hit이면 즉시 반환, LLM 호출 0)
//   3. 입력 유형 분기:
//      - .xlsx/.xls → SheetJS (결정론)
//      - .csv       → PapaParse (결정론)
//      - .pdf       → PDF.js → 이미지 → Vision LLM
//      - .png/.jpg  → 직접 Vision LLM
//   4. (dept, month) 카운터 검사 — Vision 경로만, 4회 이상 차단
//   5. 결과 검증 + 캐시 저장 + 반환
//
// 결과: { grid, fromCache, provider, error?, blocked? }

import { parseExcelFile } from './excel-parser.js';
import { parseCsvFile } from './csv-parser.js';
import { parseIcsFile, parseIcsText, fetchAndParseIcsUrl } from './ical-parser.js';
import { pdfToBase64Image, imageToBase64 } from './pdf-utils.js';
import { routeVision } from './ai-providers/vision-router.js';
import {
  buildCacheKey,
  getCache,
  putCache,
  checkAndIncrementDeptMonthCall,
} from './parse-cache.js';
import { safeValidateDutyGrid, accuracyTier } from './validate.js';

/**
 * @typedef {Object} ParseResult
 * @property {Object|null} grid       - 검증된 DutyGrid 또는 null
 * @property {boolean} fromCache      - 캐시 hit 여부
 * @property {string} provider        - 'cache' | 'excel' | 'csv' | 'lm-studio' | 'anthropic' | 'none'
 * @property {string} [error]         - 에러 메시지
 * @property {boolean} [blocked]      - (dept, month) 차단 여부
 * @property {string} [tier]          - 'auto' | 'review-required' | 'manual-fallback'
 * @property {string} sha256
 */

/**
 * 메인 진입점.
 * @param {File} file
 * @param {Object} [opts]
 * @param {string} [opts.profileName]  — 본인 이름 힌트
 * @param {string} [opts.deptHint]
 * @param {string} [opts.monthHint]
 * @returns {Promise<ParseResult>}
 */
export async function parseScheduleFile(file, opts = {}) {
  if (!file) {
    return { grid: null, fromCache: false, provider: 'none', error: 'file required', sha256: '' };
  }

  // 1. 캐시 키 + 메타 추출
  const cacheKey = await buildCacheKey(file);
  const sha256 = cacheKey.sha256;

  // 2. 캐시 조회
  const cached = await getCache({
    sha256,
    dept: opts.deptHint || null,
    month: opts.monthHint || null,
    title: cacheKey.fileName,
  });
  if (cached) {
    return {
      grid: cached,
      fromCache: true,
      provider: 'cache',
      tier: accuracyTier(cached.confidence),
      sha256,
    };
  }

  // 3. 입력 유형 분기
  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  let grid = null;
  let provider = 'none';
  let errorMsg = '';

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileType.includes('spreadsheet')) {
    const raw = await parseExcelFile(file);
    grid = safeValidateDutyGrid(raw);
    provider = 'excel';
  } else if (fileName.endsWith('.csv') || fileType.includes('csv')) {
    const raw = await parseCsvFile(file);
    grid = safeValidateDutyGrid(raw);
    provider = 'csv';
  } else if (fileName.endsWith('.ics') || fileType.includes('calendar')) {
    const raw = await parseIcsFile(file, {
      profileName: opts.profileName,
      deptHint: opts.deptHint,
      monthHint: opts.monthHint,
    });
    grid = safeValidateDutyGrid(raw);
    provider = 'ical';
  } else if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
    // PDF → 이미지 → Vision
    const result = await _parseWithVision(file, opts, true);
    if (result.blocked) return { ...result, sha256 };
    grid = result.grid;
    provider = result.provider;
    errorMsg = result.error || '';
  } else if (fileType.startsWith('image/') || /\.(png|jpe?g)$/.test(fileName)) {
    const result = await _parseWithVision(file, opts, false);
    if (result.blocked) return { ...result, sha256 };
    grid = result.grid;
    provider = result.provider;
    errorMsg = result.error || '';
  } else {
    return {
      grid: null, fromCache: false, provider: 'none', sha256,
      error: `지원하지 않는 파일 형식: ${file.name}`,
    };
  }

  // 4. 결과 캐시 저장 (Vision 결과 포함)
  if (grid) {
    await putCache(sha256, grid, cacheKey.normalizedTitle);
  }

  return {
    grid,
    fromCache: false,
    provider,
    tier: grid ? accuracyTier(grid.confidence) : undefined,
    error: errorMsg || undefined,
    sha256,
  };
}

/**
 * Vision LLM 경로 — PDF 또는 이미지.
 */
async function _parseWithVision(file, opts, isPdf) {
  let imageData;
  if (isPdf) {
    try {
      imageData = await pdfToBase64Image(file, { scale: 2 });
      imageData.mimeType = 'image/png';
    } catch (e) {
      return { grid: null, provider: 'none', error: `PDF 변환 실패: ${e?.message}` };
    }
  } else {
    imageData = await imageToBase64(file);
  }

  // (dept, month) 카운터 검사 — Vision 호출 직전
  if (opts.deptHint && opts.monthHint) {
    const status = await checkAndIncrementDeptMonthCall(opts.deptHint, opts.monthHint);
    if (status.blocked) {
      return {
        grid: null,
        provider: 'none',
        blocked: true,
        error: status.message || `이 부서·월(${opts.deptHint} ${opts.monthHint})은 이미 ${status.limit}회 파싱되었습니다. 기존 결과를 사용하세요.`,
      };
    }
  }

  const result = await routeVision({
    imageBase64: imageData.base64,
    mimeType: imageData.mimeType,
    hints: {
      profileName: opts.profileName,
      deptHint: opts.deptHint,
      monthHint: opts.monthHint,
    },
    opts: {
      anthropicKey: opts.anthropicKey,
    },
  });

  if (!result.grid) {
    return { grid: null, provider: result.provider, error: result.error };
  }

  const validated = safeValidateDutyGrid(result.grid);
  if (!validated) {
    return {
      grid: null,
      provider: result.provider,
      error: 'Vision 응답이 스키마 검증 실패. 수동 입력으로 진행하세요.',
    };
  }

  return { grid: validated, provider: result.provider };
}

/**
 * iCal URL → DutyGrid (CORS 허용 도메인만 동작).
 * @param {string} url
 * @param {Object} opts
 * @returns {Promise<ParseResult>}
 */
export async function parseScheduleUrl(url, opts = {}) {
  const result = await fetchAndParseIcsUrl(url, {
    profileName: opts.profileName,
    deptHint: opts.deptHint,
    monthHint: opts.monthHint,
  });
  if (result.error || !result.grid) {
    return {
      grid: null, fromCache: false, provider: 'none', sha256: '',
      error: result.error || 'URL 파싱 실패',
    };
  }
  const validated = safeValidateDutyGrid(result.grid);
  return {
    grid: validated,
    fromCache: false,
    provider: 'ical-url',
    tier: validated ? accuracyTier(validated.confidence) : undefined,
    sha256: '',
  };
}

// 통계용 export
export { accuracyTier } from './validate.js';
export { isDailyVisionLimitReached, getDailyVisionCount } from './parse-cache.js';
