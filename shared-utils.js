// shared-utils.js — 여러 파일에서 공유되는 유틸리티
// 가장 먼저 로드되어야 하는 공용 헬퍼만. 도메인 로직 금지.

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 호환층 (IIFE 모듈이 window.escapeHtml 참조)
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}

// ── Phase 3: data-action 부모 위임 헬퍼 ──────────────────
//
// 사용:
//   delegateActions(document.body, {
//     saveProfile: (el, e) => saveProfile(),
//     payrollOtStep: (el, e) => PAYROLL._otStep(el.dataset.payrollId, ...),
//   });
//
// el = closest('[data-action]') 결과 element, e = MouseEvent
// 미등록 action 은 console.warn (마이그레이션 누락 자동 검출)

export function delegateActions(root, handlers) {
  if (typeof root === 'undefined' || !root) return;
  root.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const action = el.dataset.action;
    if (!action) return;
    const handler = handlers[action];
    if (handler) {
      handler(el, e);
    } else {
      // eslint-disable-next-line no-console
      console.warn('[delegateActions] 미등록 action: "' + action + '"');
    }
  });
}

// data-input-action 위임 — input/change 이벤트 (oninput 대체)
export function delegateInput(root, handlers) {
  if (!root) return;
  root.addEventListener('input', (e) => {
    const el = e.target.closest && e.target.closest('[data-input-action]');
    if (!el || !root.contains(el)) return;
    const action = el.dataset.inputAction;
    const handler = handlers[action];
    if (handler) handler(el, e);
    else console.warn('[delegateInput] 미등록 action: "' + action + '"');
  });
}

// 전역 handlers 동적 추가 패턴 — 모듈별 등록 표준
// 첫 호출 시 document.body 에 단일 listener 등록, 이후는 handlers 객체에 합치기
let _globalHandlers = null;
let _globalInputHandlers = null;

export function registerActions(newHandlers) {
  if (!_globalHandlers) {
    _globalHandlers = {};
    if (typeof document !== 'undefined' && document.body) {
      delegateActions(document.body, _globalHandlers);
    }
  }
  Object.assign(_globalHandlers, newHandlers);
}

export function registerInputActions(newHandlers) {
  if (!_globalInputHandlers) {
    _globalInputHandlers = {};
    if (typeof document !== 'undefined' && document.body) {
      delegateInput(document.body, _globalInputHandlers);
    }
  }
  Object.assign(_globalInputHandlers, newHandlers);
}

// 호환층 (IIFE 잔존 — Phase 3 종료 후 제거 가능)
if (typeof window !== 'undefined') {
  window.delegateActions = delegateActions;
  window.delegateInput = delegateInput;
  window.registerActions = registerActions;
  window.registerInputActions = registerInputActions;
}
