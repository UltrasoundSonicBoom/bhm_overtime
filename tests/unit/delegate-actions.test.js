// shared-utils.js 의 delegateActions 헬퍼 단위 테스트
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Element = dom.window.Element;
  global.Event = dom.window.Event;
});

function makeButton(id, action) {
  const btn = document.createElement('button');
  btn.id = id;
  if (action) btn.setAttribute('data-action', action);
  btn.textContent = 'x';
  document.body.appendChild(btn);
  return btn;
}

beforeEach(() => {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
});

describe('delegateActions', () => {
  it('data-action 클릭 → handlers[action] 호출 + el 인자 전달', async () => {
    const { delegateActions } = await import('../../shared-utils.js');
    let called = null;
    makeButton('b1', 'saveProfile');
    delegateActions(document.body, {
      saveProfile: (el) => { called = el.id; },
    });
    document.getElementById('b1').click();
    expect(called).toBe('b1');
  });

  it('data-action 없으면 무시 (handler 호출 0)', async () => {
    const { delegateActions } = await import('../../shared-utils.js');
    let called = false;
    makeButton('b2');
    delegateActions(document.body, {
      saveProfile: () => { called = true; },
    });
    document.getElementById('b2').click();
    expect(called).toBe(false);
  });

  it('미등록 action 클릭 → console.warn 1회', async () => {
    const { delegateActions } = await import('../../shared-utils.js');
    makeButton('b3', 'unknownAction');
    let warned = false;
    const origWarn = console.warn;
    console.warn = () => { warned = true; };
    delegateActions(document.body, { saveProfile: () => {} });
    document.getElementById('b3').click();
    console.warn = origWarn;
    expect(warned).toBe(true);
  });

  it('자식 요소 클릭 → closest("[data-action]") 으로 부모 매칭', async () => {
    const { delegateActions } = await import('../../shared-utils.js');
    let called = null;
    const btn = makeButton('b4', 'saveProfile');
    const span = document.createElement('span');
    span.id = 'inner';
    span.textContent = 'save';
    btn.textContent = '';
    btn.appendChild(span);
    delegateActions(document.body, {
      saveProfile: (el) => { called = el.id; },
    });
    document.getElementById('inner').click();
    expect(called).toBe('b4');
  });
});

describe('registerActions (전역 handlers 동적 추가)', () => {
  it('두 번 호출하면 handlers 합쳐짐', async () => {
    const { registerActions } = await import('../../shared-utils.js');
    let savedA = false, savedB = false;
    registerActions({ actionA: () => { savedA = true; } });
    registerActions({ actionB: () => { savedB = true; } });
    makeButton('ba', 'actionA');
    makeButton('bb', 'actionB');
    document.getElementById('ba').click();
    document.getElementById('bb').click();
    expect(savedA).toBe(true);
    expect(savedB).toBe(true);
  });
});
