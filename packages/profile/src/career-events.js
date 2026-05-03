// career-events.js — 커리어 타임라인 통합 이벤트 모델
// 단일 키(`snuhmate_career_events`)로 근무처 + 자동승격 + 장기근속 + 연차·휴가 + 공로연수·정년 통합.
// 기존 `snuhmate_work_history` 는 신규 키 비어있을 때 1회 마이그레이션 후 그대로 보존(역방향 read 호환).
import { PROFILE } from './profile.js';
import { CALC } from '@snuhmate/calculators';

const STORAGE_KEY_BASE = 'snuhmate_career_events';
const LEGACY_WH_BASE = 'snuhmate_work_history';

function _key() {
  return (typeof window !== 'undefined' && window.getUserStorageKey)
    ? window.getUserStorageKey(STORAGE_KEY_BASE)
    : STORAGE_KEY_BASE + '_guest';
}
function _legacyKey() {
  return (typeof window !== 'undefined' && window.getUserStorageKey)
    ? window.getUserStorageKey(LEGACY_WH_BASE)
    : LEGACY_WH_BASE + '_guest';
}
function _genId(prefix) {
  return (prefix || 'ce_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function _fmtSign(n) {
  const v = Math.round(n || 0);
  if (v === 0) return '₩0';
  return `${v > 0 ? '+' : '−'}₩${Math.abs(v).toLocaleString()}`;
}

// 단협 자동승격 연수 (data/index.js DATA.payTables.general.promotionRules 와 정합)
// 일반직: J1 4년 → J2 / J2 7년 → J3 / J3 8년 → S1 (시니어 진입)
const PROMO_GENERAL = [
  { from: 'J1', to: 'J2', years: 4, monthly: 280500 },
  { from: 'J2', to: 'J3', years: 7, monthly: 459300 },
  { from: 'J3', to: 'S1', years: 8, monthly: 437500 },
];
// 운영기능직 / 환경유지지원직: A·SA 동일 패턴 (4·7·7년)
const PROMO_FACILITY = [
  { from: 'A1', to: 'A2', years: 4, monthly: 200000 },
  { from: 'A2', to: 'A3', years: 7, monthly: 300000 },
  { from: 'A3', to: 'C1', years: 7, monthly: 350000 },
];

const TENURE_MILESTONES = [
  { years: 5,  title: '근속 5년 · 장기근속수당',
    sub: '5~9년 구간 (제50조) + 자기계발 휴직 자격 (5년+, 제26조 7항)',
    amount: '+₩50,000 /월', tone: 'amber' },
  { years: 10, title: '근속 10년 · 포상금',
    sub: '10년 포상금 1회 + 장기근속수당 인상 + 장기재직휴가 5일 (별도합의 2023.11 / 2024.11)',
    amount: '₩100,000 1회 + ₩60,000 /월 + 휴가 5일', tone: 'emerald' },
  { years: 15, title: '근속 15년',
    sub: '장기근속수당 15~19년 구간 진입',
    amount: '+₩20,000 /월 (₩60→₩80k)', tone: 'amber' },
  { years: 20, title: '근속 20년 · 포상금',
    sub: '포상금 + 장기근속수당 ₩100,000/월 + 장기재직휴가 7일 추가 (총 12일)',
    amount: '₩100,000 1회 + ₩100,000 /월 + 휴가 +7일', tone: 'emerald' },
  { years: 25, title: '근속 25년',
    sub: '+₩30,000 가산 (25년 이상 구간)',
    amount: '+₩30,000 /월 (₩100→₩130k)', tone: 'amber' },
  { years: 30, title: '근속 30년 · 포상금',
    sub: '30년 포상금 + 복지 근속포인트 30만P 한도 도달 (제58조)',
    amount: '₩100,000 1회 + 근속포인트 30만P', tone: 'emerald' },
];

function _addYears(ymStr, years) {
  // ymStr "YYYY-MM" → "YYYY+years-MM"
  if (!ymStr) return '';
  const [y, m] = ymStr.split('-').map(Number);
  return `${y + years}-${String(m).padStart(2, '0')}`;
}

function _hireYM(profile) {
  if (!profile?.hireDate) return null;
  const parsed = PROFILE.parseDate(profile.hireDate);
  if (!parsed) return null;
  const d = new Date(parsed);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function _resolvePromoSequence(jobType) {
  if (jobType === '운영기능직' || jobType === '환경유지지원직') return PROMO_FACILITY;
  return PROMO_GENERAL; // 간호직·의료기술직·일반직 모두 J 패턴 사용
}

function _retirementYM(hireYM) {
  // 만 60세 12월 말일 — 단순화: 입사일 기반 추정 불가 (생년월일 필요).
  // 일반적 가정: 입사 시점 만 25세 → 정년 = 입사 + 35년 12월
  // 사용자가 수정할 수 있으므로 기본값으로 둔다.
  if (!hireYM) return '';
  const [y] = hireYM.split('-').map(Number);
  return `${y + 40}-12`;
}

// 입사일·직종·등급 기반 기본 이벤트 시드 생성
export function generateSeedEvents(profile) {
  const hireYM = _hireYM(profile);
  if (!hireYM) return [];

  const jobType = profile.jobType || '간호직';
  const promo = _resolvePromoSequence(jobType);
  const events = [];

  // 0. 입사
  events.push({
    id: _genId('seed_'), category: 'promotion',
    title: `입사 · ${promo[0].from} 자격등급`,
    sub: `${jobType} 신규 발령${profile.employeeNumber ? ` · 사번 ${profile.employeeNumber}` : ''}`,
    dateFrom: hireYM,
    badge: { text: '시작', tone: 'indigo' },
    fixed: true, autoSeed: true,
  });

  // 1. 자동승격 체인 — 항목별 차액을 calcOrdinaryWage 로 정확히 계산
  let cursorYM = hireYM;
  let prevGrade = promo[0].from;
  promo.forEach((step) => {
    cursorYM = _addYears(cursorYM, step.years);
    // 동일 호봉(year=1) 가정으로 grade 만 바꿔 차액 산출
    const wagePrev = CALC.calcOrdinaryWage(jobType, prevGrade, 1, {});
    const wageNext = CALC.calcOrdinaryWage(jobType, step.to, 1, {});
    let detailTokens = null;
    if (wagePrev && wageNext) {
      const dBase = (wageNext.breakdown['기준기본급'] || 0) - (wagePrev.breakdown['기준기본급'] || 0);
      const dAbil = (wageNext.breakdown['능력급'] || 0) - (wagePrev.breakdown['능력급'] || 0);
      const dBonus = (wageNext.breakdown['상여금'] || 0) - (wagePrev.breakdown['상여금'] || 0);
      detailTokens = [
        { text: '기준기본급 ' }, { bold: _fmtSign(dBase) }, { text: '/월 · 능력급 ' },
        { bold: _fmtSign(dAbil) }, { text: '/월 · 상여금 ' }, { bold: _fmtSign(dBonus) }, { text: '/월' },
      ];
    }
    events.push({
      id: _genId('seed_'), category: 'promotion',
      title: `${step.from} → ${step.to} 자동승격`,
      sub: `${step.from}등급 자동승격 연수 ${step.years}년 도달 (제20조)`,
      dateFrom: cursorYM,
      amount: `+₩${step.monthly.toLocaleString()} /월`,
      detailTokens,
      badge: { text: `${step.years}년 만에`, tone: 'indigo' },
      autoSeed: true,
    });
    prevGrade = step.to;
  });

  // 2. 장기근속 마일스톤
  TENURE_MILESTONES.forEach((m) => {
    events.push({
      id: _genId('seed_'), category: 'tenure',
      title: m.title, sub: m.sub,
      dateFrom: _addYears(hireYM, m.years),
      amount: m.amount,
      badge: { text: `${m.years}년${m.years % 10 === 0 ? ' 🏆' : ''}`, tone: m.tone },
      autoSeed: true,
    });
  });

  // 3. 공로연수 + 정년 (생년월일 모르면 입사+39년 12월 가정 — 사용자 수정 가능)
  const retirement = _retirementYM(hireYM);
  if (retirement) {
    const [ry] = retirement.split('-').map(Number);
    events.push({
      id: _genId('seed_'), category: 'promotion',
      title: '공로연수 시작점 (선택)',
      sub: '정년 직전 1년 — ① 공로연수 1년 60% 보수 ② 정상근무 100% 보수. 퇴직금은 동일 (제52조 평균임금 보호)',
      dateFrom: `${ry - 1}-12`,
      badge: { text: '선택', tone: 'rose' },
      fixed: true, autoSeed: true,
    });
    events.push({
      id: _genId('seed_'), category: 'promotion',
      title: '정년 퇴직',
      sub: `만 60세 12월 말일 (제24조) · 근속 ${ry - parseInt(hireYM.slice(0, 4), 10)}년`,
      dateFrom: retirement,
      badge: { text: '완료', tone: 'indigo' },
      fixed: true, autoSeed: true,
    });
  }

  // 4. 첫 근무처 (부서 정보 있을 때만)
  if (profile.department) {
    events.push({
      id: _genId('seed_'), category: 'workplace',
      title: profile.department,
      sub: `${jobType} · 신규 발령`,
      dateFrom: hireYM, dateTo: '',
      autoSeed: true,
    });
  }

  // 5. 연차·휴가 마일스톤 (제36조)
  // 입사 후 1년: 월 1일 누적 → 1년차에 15일 발생 → 3년차부터 2년마다 +1 → 22년차에 25일 한도
  events.push({
    id: _genId('seed_'), category: 'leave',
    title: '연차 사용 시작',
    sub: '입사 후 1년간: 월 1일씩 부여 (제36조 5항)',
    dateFrom: hireYM,
    badge: { text: '월 1일', tone: 'rose' },
    autoSeed: true,
  });
  events.push({
    id: _genId('seed_'), category: 'leave',
    title: '연차 15일 발생',
    sub: '근속 1년 + 8할 출근 → 15일 (제36조 1항)',
    dateFrom: _addYears(hireYM, 1),
    badge: { text: '15일', tone: 'rose' },
    autoSeed: true,
  });
  events.push({
    id: _genId('seed_'), category: 'leave',
    title: '연차 17일',
    sub: '근속 3년차 — 2년마다 +1일 가산 시작',
    dateFrom: _addYears(hireYM, 3),
    badge: { text: '17일', tone: 'rose' },
    autoSeed: true,
  });
  events.push({
    id: _genId('seed_'), category: 'leave',
    title: '연차 20일',
    sub: '근속 9년차',
    dateFrom: _addYears(hireYM, 9),
    badge: { text: '20일', tone: 'rose' },
    autoSeed: true,
  });
  events.push({
    id: _genId('seed_'), category: 'leave',
    title: '연차 25일 도달 (한도)',
    sub: '근속 22년차 — 한도 25일 (제36조 1항)',
    dateFrom: _addYears(hireYM, 21),
    badge: { text: '25일 한도', tone: 'amber' },
    autoSeed: true,
  });
  // 장기재직휴가 (별도합의 2024.11): 10년 5일 / 20년 7일 (각 1회)
  events.push({
    id: _genId('seed_'), category: 'leave',
    title: '장기재직휴가 5일 (1회)',
    sub: '재직 10~19년: 5일 (별도합의 2024.11)',
    dateFrom: _addYears(hireYM, 10),
    badge: { text: '+5일', tone: 'rose' },
    autoSeed: true,
  });
  events.push({
    id: _genId('seed_'), category: 'leave',
    title: '장기재직휴가 7일 (1회)',
    sub: '재직 20년+: 7일 (별도합의 2024.11)',
    dateFrom: _addYears(hireYM, 20),
    badge: { text: '+7일', tone: 'rose' },
    autoSeed: true,
  });

  return events;
}

// ── 마이그레이션: 기존 work_history → 신규 career_events 의 workplace 항목 변환 ──
function _migrateLegacyWorkHistory() {
  try {
    const legacyRaw = localStorage.getItem(_legacyKey());
    if (!legacyRaw) return [];
    const list = JSON.parse(legacyRaw) || [];
    return list.map((wh) => ({
      id: _genId('mig_'),
      category: 'workplace',
      title: wh.dept || wh.workplace || '근무처',
      sub: [wh.workplace, wh.role, wh.desc].filter(Boolean).join(' · '),
      dateFrom: (wh.from || '').slice(0, 7),
      dateTo: (wh.to || '').slice(0, 7),
      legacyOrigin: 'work_history',
    })).filter((ev) => ev.dateFrom);
  } catch { return []; }
}

export function loadEvents() {
  try {
    const raw = localStorage.getItem(_key());
    const stored = raw ? JSON.parse(raw) : null;
    if (Array.isArray(stored) && stored.length) return stored;
    // 비어있으면: legacy work_history 마이그레이션 + 프로필 기반 시드 생성
    const profile = PROFILE.load();
    const seeded = generateSeedEvents(profile || {});
    const migrated = _migrateLegacyWorkHistory();
    // 마이그레이션된 workplace 가 있으면 시드의 자동 생성 workplace 는 제거 (중복 방지)
    const merged = migrated.length
      ? [...seeded.filter((e) => e.category !== 'workplace' || !e.autoSeed), ...migrated]
      : seeded;
    if (merged.length) saveEvents(merged);
    return merged;
  } catch { return []; }
}

export function saveEvents(events) {
  try {
    localStorage.setItem(_key(), JSON.stringify(events));
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('careerEventsChanged')); } catch {}
      if (window.recordLocalEdit) window.recordLocalEdit(STORAGE_KEY_BASE);
    }
  } catch (e) {
    console.warn('[career-events] save 실패', e?.message);
  }
}

export function addEvent(event) {
  const list = loadEvents();
  const newEv = { id: _genId('user_'), ...event };
  list.push(newEv);
  saveEvents(list);
  return newEv;
}

export function updateEvent(id, patch) {
  const list = loadEvents();
  const i = list.findIndex((e) => e.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  saveEvents(list);
  return list[i];
}

export function deleteEvent(id) {
  const list = loadEvents();
  const ev = list.find((e) => e.id === id);
  if (ev?.fixed) return false; // 단협 보호 이벤트는 삭제 차단
  const next = list.filter((e) => e.id !== id);
  if (next.length === list.length) return false;
  saveEvents(next);
  return true;
}

// 시드 재생성 (사용자가 입사일·직종 변경 후 자동 갱신 원할 때)
export function regenerateSeed() {
  const profile = PROFILE.load();
  if (!profile) return [];
  const newSeed = generateSeedEvents(profile);
  // 사용자 추가 이벤트는 보존
  const userEvents = loadEvents().filter((e) => !e.autoSeed);
  const merged = [...newSeed, ...userEvents];
  saveEvents(merged);
  return merged;
}

export const CAREER = {
  loadEvents, saveEvents, addEvent, updateEvent, deleteEvent,
  generateSeedEvents, regenerateSeed,
};

if (typeof window !== 'undefined') {
  window.CAREER = CAREER;
}
