// Phase 4-A Task 1: work-history record schema 의 source 필드 migration
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  // file:// 등 opaque origin 에서는 jsdom localStorage SecurityError → url 명시 필수
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
});

beforeEach(() => {
  localStorage.clear();
});

describe('work-history migration: source 필드', () => {
  it('기존 record (source 없음) → load 시 source="user" 기본값', async () => {
    const oldRec = {
      id: 'a1', workplace: 'X', dept: 'A',
      from: '2020-01', to: '', role: '', desc: '',
      rotations: [], updatedAt: 'now'
    };
    localStorage.setItem('bhm_work_history_guest', JSON.stringify([oldRec]));
    await import('../../work-history.js');
    const loaded = window._loadWorkHistory();
    expect(loaded[0].source).toBe('user');
  });

  it('save 시 source 필드 보존 (auto/user 양쪽)', async () => {
    await import('../../work-history.js');
    const records = [
      { id: 'a1', workplace: 'X', dept: 'A', from: '2020-01', to: '', role: '', desc: '', rotations: [], source: 'auto', updatedAt: 'now' },
      { id: 'b1', workplace: 'X', dept: 'B', from: '2021-01', to: '', role: '', desc: '', rotations: [], source: 'user', updatedAt: 'now' },
    ];
    window._saveWorkHistory(records);
    const reloaded = window._loadWorkHistory();
    expect(reloaded[0].source).toBe('auto');
    expect(reloaded[1].source).toBe('user');
  });

  it('자동 시드 record (source="auto") 보존 — load 시 user 로 변하지 않음', async () => {
    const autoRec = {
      id: '_auto_1', workplace: 'X', dept: 'A',
      from: '2020-01', to: '', role: '', desc: '',
      rotations: [], source: 'auto', updatedAt: 'now'
    };
    localStorage.setItem('bhm_work_history_guest', JSON.stringify([autoRec]));
    await import('../../work-history.js');
    const loaded = window._loadWorkHistory();
    expect(loaded[0].source).toBe('auto');
  });
});
