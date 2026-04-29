// pdf-utils.js — PDF → 이미지 base64 변환.
// salary-parser.js의 pdf.js 로딩 패턴 재사용 (window.loadPDFJS lazy loader).
//
// 사용처: PDF 근무표를 Vision LLM에 보내기 전 이미지로 렌더링.
// Phase 2는 첫 페이지 1장만 (멀티페이지는 Phase 3).

/**
 * PDF 파일의 첫 페이지를 base64 PNG로 렌더링.
 * @param {File|ArrayBuffer} fileOrBuffer
 * @param {Object} [opts]
 * @param {number} [opts.scale=2] — 렌더 배율 (Vision LLM 정확도 위해 기본 2x)
 * @returns {Promise<{ base64: string, width: number, height: number, pageCount: number }>}
 */
export async function pdfToBase64Image(fileOrBuffer, opts = {}) {
  const scale = opts.scale ?? 2;

  // pdf.js 동적 로드 (utils-lazy.js의 패턴 재사용)
  if (typeof window.loadPDFJS === 'function') {
    await window.loadPDFJS();
  }
  if (typeof window.pdfjsLib === 'undefined') {
    throw new Error('pdf.js 라이브러리를 로드할 수 없습니다.');
  }
  if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // PDF 로드
  const buf = fileOrBuffer instanceof ArrayBuffer
    ? fileOrBuffer
    : await fileOrBuffer.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const pageCount = pdf.numPages;

  if (pageCount === 0) {
    throw new Error('PDF에 페이지가 없습니다.');
  }

  // 첫 페이지 렌더링
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context를 얻을 수 없습니다.');

  await page.render({ canvasContext: ctx, viewport }).promise;

  // PNG base64
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

  return {
    base64,
    width: viewport.width,
    height: viewport.height,
    pageCount,
  };
}

/**
 * 이미지 파일(File) → base64.
 * @param {File} file
 * @returns {Promise<{ base64: string, mimeType: string, width: number, height: number }>}
 */
export async function imageToBase64(file) {
  if (!file) throw new Error('file is required');

  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  // chunked conversion (대용량 이미지 메모리 안전)
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);

  // 이미지 크기 추출 (선택 — Vision API는 필수 아님)
  let width = 0, height = 0;
  try {
    const dims = await _getImageDimensions(file);
    width = dims.width;
    height = dims.height;
  } catch (_e) { /* skip */ }

  return {
    base64,
    mimeType: file.type || 'image/png',
    width,
    height,
  };
}

function _getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * 파일 SHA-256 해시 (캐시 키 생성용).
 * @param {File|ArrayBuffer} fileOrBuffer
 * @returns {Promise<string>} hex string
 */
export async function sha256Hex(fileOrBuffer) {
  const buf = fileOrBuffer instanceof ArrayBuffer
    ? fileOrBuffer
    : await fileOrBuffer.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(hashBuf);
  let hex = '';
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
}
