import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

const mockAnonymize = vi.fn();
const mockGetConsent = vi.fn();
const mockProbeBackend = vi.fn();

vi.mock('../../../apps/web/src/client/schedule-parser/anonymize.js', () => ({
  anonymize: mockAnonymize,
  getCorpusConsent: mockGetConsent,
}));

vi.mock('../../../apps/web/src/client/schedule-parser/parse-cache.js', () => ({
  probeBackend: mockProbeBackend,
}));

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.FormData = dom.window.FormData;
});

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  global.fetch = vi.fn();
  mockGetConsent.mockReturnValue({ granted: true });
  mockAnonymize.mockReturnValue({
    deptCategory: 'ICU',
    confidence: 0.8,
    rows: [{ days: { 1: 'D' } }],
  });
});

describe('corpus-sync backend-only policy', () => {
  it('백엔드만 호출하고 Firestore 결과는 항상 false', async () => {
    mockProbeBackend.mockResolvedValue('http://localhost:8001');
    global.fetch.mockResolvedValue({ ok: true });

    const { submitToCorpus } = await import('../../../apps/web/src/firebase/sync/corpus-sync.js');
    const result = await submitToCorpus({ grid: { rows: [{ name: 'A' }] } });

    expect(result.submitted).toBe(true);
    expect(result.backend).toBe(true);
    expect(result.firestore).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8001/corpus/submit',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('백엔드가 없으면 all_destinations_failed 반환', async () => {
    mockProbeBackend.mockResolvedValue(null);

    const { submitToCorpus } = await import('../../../apps/web/src/firebase/sync/corpus-sync.js');
    const result = await submitToCorpus({ grid: { rows: [{ name: 'A' }] } });

    expect(result).toEqual({
      submitted: false,
      reason: 'all_destinations_failed',
      firestore: false,
      backend: false,
    });
  });

  it('동의가 없으면 백엔드를 호출하지 않음', async () => {
    mockGetConsent.mockReturnValue({ granted: false });

    const { submitToCorpus } = await import('../../../apps/web/src/firebase/sync/corpus-sync.js');
    const result = await submitToCorpus({ grid: { rows: [{ name: 'A' }] } });

    expect(result).toEqual({ submitted: false, reason: 'no_consent' });
    expect(mockProbeBackend).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
