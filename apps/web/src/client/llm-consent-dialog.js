// llm-consent-dialog.js — LLM 텔레메트리 명시적 옵트인 다이얼로그
//
// 정책: 사용자가 LLM 보조 파싱을 처음 사용하기 전에 1회 표시.
// 옵트인 시 라벨/구조/수정이력만 익명 수집. 금액/이름 미수집.
// 옵트아웃해도 LLM 파싱 자체는 사용 가능 (텔레메트리만 미발화).

const CONSENT_KEY = 'snuhmate_llm_consent_v1';     // 'opted-in' | 'opted-out'
const ANON_ID_KEY = 'snuhmate_anon_id';             // 옵트인 시 1회 생성

const CONSENT_VALUES = ['opted-in', 'opted-out'];

export function getConsent() {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return CONSENT_VALUES.includes(v) ? v : null; // null = 미응답 (다이얼로그 필요)
  } catch { return null; }
}

export function isOptedIn() {
  return getConsent() === 'opted-in';
}

// anonId: 사용자별 1회 생성 (uid 와 분리). 옵트아웃 시 미생성.
export function getOrCreateAnonId() {
  if (!isOptedIn()) return null;
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      // crypto.randomUUID 사용 가능하면 사용, 아니면 Date+random fallback
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch { return null; }
}

function _setConsent(value) {
  if (!CONSENT_VALUES.includes(value)) return;
  try {
    localStorage.setItem(CONSENT_KEY, value);
    if (value === 'opted-out') {
      // 옵트아웃 시 anonId 도 정리 (이미 발화한 텔레메트리는 서버 측에 남지만 신규 발화 0)
      localStorage.removeItem(ANON_ID_KEY);
    }
  } catch {}
}

// 다이얼로그 1회 표시. resolve 값: 'opted-in' | 'opted-out' (이미 응답한 사용자는 즉시 해당 값 반환)
export async function ensureConsent() {
  const existing = getConsent();
  if (existing) return existing;
  return _showDialog();
}

// 강제 재표시 (설정에서 변경하기 위해)
export function resetConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(ANON_ID_KEY);
  } catch {}
}

function _showDialog() {
  return new Promise((resolve) => {
    if (document.getElementById('snuhmate-llm-consent-dialog')) {
      resolve(getConsent() || 'opted-out');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'snuhmate-llm-consent-dialog';
    overlay.className = 'fixed inset-0 z-[9300] bg-black/60 flex items-end justify-center';

    const panel = document.createElement('div');
    panel.className = [
      'bg-[var(--bg-card)]',
      'border-t border-[var(--border-glass)]',
      'rounded-t-[20px]',
      'px-5 pt-6 pb-8',
      'w-full max-w-[600px]',
      'max-h-[90vh] overflow-y-auto',
    ].join(' ');

    const icon = document.createElement('div');
    icon.className = 'text-2xl text-center mb-3';
    icon.textContent = '🤖';

    const title = document.createElement('h2');
    title.className = 'text-[length:var(--text-title-large)] font-bold text-[var(--text-primary)] text-center m-0 mb-3';
    title.textContent = 'LLM 보조 파싱 사용';

    const desc = document.createElement('p');
    desc.className = 'text-sm text-[var(--text-secondary)] text-center mt-0 mb-4 leading-relaxed';
    desc.textContent = '복잡한 양식(사진/스캔/비표준 PDF)을 자동 인식하기 위해 로컬 LLM 게이트웨이를 사용합니다.';

    // 핵심 카피
    const noticeBox = document.createElement('div');
    noticeBox.className = 'mb-4 p-3 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-glass)]';

    const noticeTitle = document.createElement('div');
    noticeTitle.className = 'text-xs font-semibold text-[var(--text-primary)] mb-2';
    noticeTitle.textContent = '파싱 능력 개선을 위해 다음만 익명으로 수집합니다:';

    const noticeList = document.createElement('ul');
    noticeList.className = 'text-xs text-[var(--text-muted)] m-0 pl-4 list-disc space-y-1 mb-2';
    for (const item of [
      '항목 라벨 (예: "야간수당", "직책수당")',
      '표 구조 패턴 (행/열 인덱스)',
      '내가 수정한 라벨 매핑 (예: "추가야근" → "야간근로수당")',
    ]) {
      const li = document.createElement('li');
      li.textContent = item;
      noticeList.appendChild(li);
    }

    const banLine = document.createElement('div');
    banLine.className = 'text-xs font-semibold text-[var(--accent-rose,#dc2626)]';
    banLine.textContent = '※ 금액·이름·사번은 절대 수집하지 않습니다.';

    noticeBox.appendChild(noticeTitle);
    noticeBox.appendChild(noticeList);
    noticeBox.appendChild(banLine);

    const settingsHint = document.createElement('p');
    settingsHint.className = 'text-xs text-[var(--text-muted)] text-center mt-0 mb-5';
    settingsHint.textContent = '동의 여부는 설정 탭에서 언제든 변경 가능합니다.';

    const actions = document.createElement('div');
    actions.className = 'grid grid-cols-2 gap-2.5';

    const declineBtn = document.createElement('button');
    declineBtn.type = 'button';
    declineBtn.className = 'btn btn-secondary btn-full';
    declineBtn.textContent = '거부';

    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'btn btn-primary btn-full';
    acceptBtn.textContent = '동의하고 사용';

    function close(value) {
      _setConsent(value);
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    }
    const onKey = (e) => { if (e.key === 'Escape') close('opted-out'); };
    document.addEventListener('keydown', onKey);

    declineBtn.addEventListener('click', () => close('opted-out'));
    acceptBtn.addEventListener('click', () => close('opted-in'));

    actions.appendChild(declineBtn);
    actions.appendChild(acceptBtn);

    panel.appendChild(icon);
    panel.appendChild(title);
    panel.appendChild(desc);
    panel.appendChild(noticeBox);
    panel.appendChild(settingsHint);
    panel.appendChild(actions);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  });
}
