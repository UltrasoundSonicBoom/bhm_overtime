// Phase 9 — drive-pdf.js 검증
//
// Drive REST API 를 fetch mock 으로 대체
//   - _findOrCreateFolder: name='snuhmate' → 폴더 생성/조회
//   - uploadPayslipPdf: multipart upload → driveFileId 반환
//   - window.__googleAccessToken 없으면 throw

import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.fetch = vi.fn();
  global.Blob = dom.window.Blob;
});

beforeEach(() => {
  vi.clearAllMocks();
  delete window.__googleAccessToken;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function _mockDriveResponses(responses) {
  let callIdx = 0;
  global.fetch = vi.fn(async (url, opts) => {
    const r = responses[callIdx++] || responses[responses.length - 1];
    return {
      ok: r.ok !== false,
      status: r.status || 200,
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    };
  });
}

describe('uploadPayslipPdf', () => {
  it('access token 없으면 throw', async () => {
    const { uploadPayslipPdf } = await import('../../../apps/web/src/firebase/drive-pdf.js');
    await expect(uploadPayslipPdf(new Blob(['pdf']), '2026-04', '급여'))
      .rejects.toThrow('Google access token 없음');
  });

  it('정상 업로드 → driveFileId 반환', async () => {
    window.__googleAccessToken = 'mock-token-123';
    _mockDriveResponses([
      // 1. snuhmate 폴더 검색 (없음)
      { body: { files: [] } },
      // 2. snuhmate 폴더 생성
      { body: { id: 'folder-root-id' } },
      // 3. 2026 폴더 검색 (없음)
      { body: { files: [] } },
      // 4. 2026 폴더 생성
      { body: { id: 'folder-year-id' } },
      // 5. multipart upload
      { body: { id: 'file-id-abc', name: '2026-04_payslip_급여.pdf', webViewLink: 'https://drive.google.com/file/abc' } },
    ]);
    const { uploadPayslipPdf } = await import('../../../apps/web/src/firebase/drive-pdf.js');
    const result = await uploadPayslipPdf(new Blob(['%PDF']), '2026-04', '급여');
    expect(result.driveFileId).toBe('file-id-abc');
    expect(result.fileName).toBe('2026-04_payslip_급여.pdf');
  });

  it('기존 폴더 재사용 (idempotent)', async () => {
    window.__googleAccessToken = 'mock-token-123';
    _mockDriveResponses([
      // snuhmate 폴더 존재
      { body: { files: [{ id: 'existing-root', name: 'snuhmate' }] } },
      // 2026 폴더 존재
      { body: { files: [{ id: 'existing-year', name: '2026' }] } },
      // upload
      { body: { id: 'file-id-xyz', name: '2026-04_payslip_급여.pdf' } },
    ]);
    const { uploadPayslipPdf } = await import('../../../apps/web/src/firebase/drive-pdf.js');
    const result = await uploadPayslipPdf(new Blob(['%PDF']), '2026-04', '급여');
    expect(result.driveFileId).toBe('file-id-xyz');
    // 폴더 생성 API (POST files) 가 호출되지 않아야 함
    const calls = fetch.mock.calls;
    const postCalls = calls.filter(c => c[1]?.method === 'POST' && !c[0].includes('upload'));
    expect(postCalls).toHaveLength(0);
  });

  it('Drive API 오류 → throw', async () => {
    window.__googleAccessToken = 'mock-token-123';
    global.fetch = vi.fn(async () => ({
      ok: false, status: 403,
      json: async () => ({}),
      text: async () => 'Forbidden',
    }));
    const { uploadPayslipPdf } = await import('../../../apps/web/src/firebase/drive-pdf.js');
    await expect(uploadPayslipPdf(new Blob(['pdf']), '2026-04', '급여'))
      .rejects.toThrow('403');
  });
});

describe('writePayslip with driveFileId', () => {
  it('driveFileId 포함 write → 평문으로 Firestore 저장', async () => {
    const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
    global.window = dom.window;
    if (!dom.window.crypto?.subtle) {
      const nodeCrypto = await import('node:crypto');
      Object.defineProperty(global.window, 'crypto', { value: nodeCrypto.webcrypto, configurable: true });
    }

    const store = {};
    const mockDb = {
      _store: store,
      _writeDoc: (path, data, merge) => { store[path] = merge ? { ...(store[path] || {}), ...data } : data; },
      _readDoc: (path) => store[path] || null,
    };

    const { writePayslip, readPayslip } = await import('../../../apps/web/src/firebase/sync/payslip-sync.js');
    const data = { workStats: [{ name: '시간외', value: 10 }], hourlyRate: 15000 };
    await writePayslip(mockDb, 'uid1', '2026-04', data, 'drive-file-abc');

    const doc = store['users/uid1/payslips/2026-04'];
    expect(doc.driveFileId).toBe('drive-file-abc');  // 평문
    expect(typeof doc.parsedFields).toBe('object');   // 암호화

    const restored = await readPayslip(mockDb, 'uid1', '2026-04');
    expect(restored.hourlyRate).toBe(15000);
  });
});
