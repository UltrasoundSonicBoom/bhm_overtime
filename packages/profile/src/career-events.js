// career-events.js — 커리어 타임라인 통합 이벤트 모델
// 단일 키(`snuhmate_career_events`)로 근무처 + 자동승격 + 장기근속 + 연차·휴가 + 공로연수·정년 통합.
// 기존 `snuhmate_work_history` 는 신규 키 비어있을 때 1회 마이그레이션 후 그대로 보존(역방향 read 호환).
import { PROFILE } from './profile.js';
import { CALC } from '@snuhmate/calculators';
import { LEAVE } from './leave.js';

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
// 운영기능직 — A·C grade (간호직 외, 시설/이송 분야 분기)
const PROMO_OPERATION = [
  { from: 'A1', to: 'A2', years: 4, monthly: 200000 },
  { from: 'A2', to: 'A3', years: 7, monthly: 300000 },
  { from: 'A3', to: 'C1', years: 7, monthly: 350000 },
];
// 환경유지지원직 — SA·SC grade (별표 별도)
const PROMO_SUPPORT = [
  { from: 'SA1', to: 'SA2', years: 4, monthly: 180000 },
  { from: 'SA2', to: 'SA3', years: 7, monthly: 260000 },
  { from: 'SA3', to: 'SC1', years: 7, monthly: 310000 },
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
  if (jobType === '환경유지지원직') return PROMO_SUPPORT;
  if (jobType === '운영기능직') return PROMO_OPERATION;
  return PROMO_GENERAL; // 간호직·의료기술직·일반직 모두 J 패턴 사용
}

// 현재 직급 내 연차별 호봉 상승 이벤트 (미래분만)
// grade/year는 profile 에서 읽어, 현재 호봉 기준으로 다음 호봉부터 8년차까지 생성.
function _gradeHoshongEvents(profile) {
  const grade = profile.grade;
  const currentYear = Math.max(1, Math.min(8, profile.year || 1));
  if (!grade) return [];
  // 자동승격 경로가 있는 중간 등급(J1, J2, J3, A1~A3, SA1~SA3)은
  // PROMO_* 이벤트가 이미 생성되므로 호봉 이벤트 중복 생성 불필요.
  const allPromoSequences = [...PROMO_GENERAL, ...PROMO_OPERATION, ...PROMO_SUPPORT];
  if (allPromoSequences.some((step) => step.from === grade)) return [];
  const jobType = profile.jobType || '간호직';
  const now = new Date();
  const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const events = [];
  for (let yr = currentYear + 1; yr <= 8; yr++) {
    const wagePrev = CALC.calcOrdinaryWage(jobType, grade, yr - 1, {});
    const wageNext = CALC.calcOrdinaryWage(jobType, grade, yr, {});
    if (!wagePrev || !wageNext) continue;
    const dBase = (wageNext.breakdown?.['기준기본급'] || 0) - (wagePrev.breakdown?.['기준기본급'] || 0);
    if (dBase <= 0) continue;
    const yearsFromNow = yr - currentYear;
    events.push({
      id: _genId('seed_'),
      category: 'promotion',
      title: `${grade} ${yr}년차 호봉 상승`,
      sub: `${grade}등급 ${yr - 1}→${yr}년차 · 기준기본급 월 +₩${Math.round(dBase).toLocaleString()} (제20조)`,
      dateFrom: _addYears(nowYM, yearsFromNow),
      amount: `+₩${Math.round(dBase).toLocaleString()} /월`,
      badge: { text: `${yr}년차`, tone: 'indigo' },
      autoSeed: true,
    });
  }
  return events;
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
    let computedTotal = null;
    if (wagePrev && wageNext) {
      const dBase = (wageNext.breakdown['기준기본급'] || 0) - (wagePrev.breakdown['기준기본급'] || 0);
      const dAbil = (wageNext.breakdown['능력급'] || 0) - (wagePrev.breakdown['능력급'] || 0);
      const dBonus = (wageNext.breakdown['상여금'] || 0) - (wagePrev.breakdown['상여금'] || 0);
      // 차액 합계가 0 이면 (등급 매핑 누락 등 — 예: 환경유지지원직 SA grade 미정의) detailTokens 미생성.
      if (dBase || dAbil || dBonus) {
        computedTotal = dBase + dAbil + dBonus;
        detailTokens = [
          { text: '기준기본급 ' }, { bold: _fmtSign(dBase) }, { text: '/월 · 능력급 ' },
          { bold: _fmtSign(dAbil) }, { text: '/월 · 상여금 ' }, { bold: _fmtSign(dBonus) }, { text: '/월' },
        ];
      }
    }
    events.push({
      id: _genId('seed_'), category: 'promotion',
      title: `${step.from} → ${step.to} 자동승격`,
      sub: `${step.from}등급 자동승격 연수 ${step.years}년 도달 (제20조)`,
      dateFrom: cursorYM,
      // detailTokens 가 산출됐으면 headline amount 도 breakdown 합계로 일치시킴 (사용자 신뢰성)
      amount: computedTotal != null
        ? `+₩${computedTotal.toLocaleString()} /월`
        : `+₩${step.monthly.toLocaleString()} /월`,
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
function _normLegacyYM(str) {
  if (!str) return '';
  // PROFILE.parseDate 로 정규화 시도 (2자리 연도, YYYY-MM 등 모두 처리)
  const parsed = PROFILE.parseDate(String(str).trim());
  if (parsed) return parsed.slice(0, 7); // YYYY-MM
  // parseDate 도 실패하면: 점/슬래시를 대시로 교체 후 YYYY-MM 매칭
  const norm = String(str).trim().replace(/[./\s]/g, '-');
  const m = norm.match(/^(\d{1,4})-(\d{1,2})(?:-\d+)?$/);
  if (!m) return '';
  let y = m[1];
  if (y.length <= 2) { const yi = parseInt(y, 10); y = String(yi <= 30 ? 2000 + yi : 1900 + yi); }
  return `${y}-${m[2].padStart(2, '0')}`;
}

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
      dateFrom: _normLegacyYM(wh.from),
      dateTo: _normLegacyYM(wh.to),
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
    // Defense-in-depth: dynamic 이벤트 (computeDynamicLeaveEvents 결과) 는 매 렌더 재계산 — persist 금지.
    const persistable = (Array.isArray(events) ? events : []).filter((e) => !e?.dynamic);
    localStorage.setItem(_key(), JSON.stringify(persistable));
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('careerEventsChanged')); } catch {}
      // auto-sync HANDLERS 에 등록됐으므로 recordLocalEdit 가 단일 채널로 debounced write-through 수행.
      // 별도 직접 import 호출은 중복 → 제거.
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

/**
 * 저장된 급여명세서에서 직급 전환(승진)을 역산하여 커리어 이벤트로 변환.
 * window.SALARY_PARSER 가 초기화된 후 호출 가능.
 * 같은 등급 간 호봉 변화(J3-4→J3-5)는 무시하고, 등급 자체가 바뀌는 전환만 감지.
 * 반환 이벤트는 autoSeed:true + source:'payslip-inferred' — regenerateSeed 에서 합산.
 */
export function inferPromotionsFromPayslips() {
  if (typeof window === 'undefined' || !window.SALARY_PARSER) return [];
  let months;
  try { months = window.SALARY_PARSER.listSavedMonths(); } catch { return []; }
  if (!months || months.length === 0) return [];

  // '급여' 타입만, 시간순 오름차순
  const paid = months
    .filter((m) => m.type === '급여')
    .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));
  if (paid.length === 0) return [];

  // 각 월의 payGrade 파싱
  const history = [];
  for (const m of paid) {
    let data;
    try { data = window.SALARY_PARSER.loadMonthlyData(m.year, m.month, m.type); } catch { continue; }
    if (!data) continue;
    const pg = data.employeeInfo?.payGrade;
    if (!pg) continue;
    const gm = String(pg).match(/([A-Za-z]+\d*)\s*[-—]\s*(\d+)/);
    if (!gm) continue;
    history.push({
      ym: `${m.year}-${String(m.month).padStart(2, '0')}`,
      grade: gm[1].toUpperCase(),
      step: parseInt(gm[2], 10) || null,
    });
  }
  if (history.length < 2) return [];

  // 등급 전환(자동승격/심사승진) + 호봉 변동(재급연수) 감지
  const events = [];
  const seenPromo = new Set();
  const seenHobon = new Set();
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];

    if (prev.grade !== curr.grade) {
      const transKey = `${prev.grade}→${curr.grade}`;
      if (seenPromo.has(transKey)) continue;
      seenPromo.add(transKey);
      events.push({
        id: _genId('pay_'),
        category: 'promotion',
        title: `${prev.grade} → ${curr.grade} 자격등급 전환`,
        sub: `급여명세서에서 감지 · ${curr.ym} 기준 (수동 날짜 수정 가능)`,
        dateFrom: curr.ym,
        badge: { text: curr.grade, tone: 'green' },
        autoSeed: true,
        source: 'payslip-inferred',
      });
      continue;
    }

    if (prev.step != null && curr.step != null && prev.step !== curr.step) {
      const hobonKey = `${curr.grade}-${prev.step}->${curr.step}@${curr.ym}`;
      if (seenHobon.has(hobonKey)) continue;
      seenHobon.add(hobonKey);
      events.push({
        id: _genId('pay_'),
        category: 'hobon-change',
        title: `${curr.grade}·${curr.step}년차 (호봉 ${prev.step}→${curr.step})`,
        sub: `급여명세서 호봉 변동 감지 · ${curr.ym} (제20조 재급연수)`,
        dateFrom: curr.ym,
        tone: 'subtle',
        autoSeed: true,
        source: 'payslip-inferred',
      });
    }
  }
  return events;
}

// 시드 재생성 (사용자가 입사일·직종 변경 후 자동 갱신 원할 때)
export function regenerateSeed() {
  const profile = PROFILE.load();
  if (!profile) return [];

  // 규정 기반 시드
  const newSeed = generateSeedEvents(profile);

  // 명세서 기반 실제 승진 이력 — 규정 추정보다 우선
  const payslipInferred = inferPromotionsFromPayslips();
  // 명세서로 확인된 전환 키 집합 (from→to) — 규정 추정 이벤트 중복 제거용
  const inferredTransitions = new Set(
    payslipInferred.map((e) => {
      const m = e.title?.match(/(\S+)\s*→\s*(\S+)/);
      return m ? `${m[1]}→${m[2]}` : '';
    }).filter(Boolean)
  );
  // 규정 추정 자동승격 이벤트 중 명세서가 이미 커버하는 전환은 제거
  const filteredSeed = newSeed.filter((e) => {
    if (!e.autoSeed || e.category !== 'promotion') return true;
    const m = e.title?.match(/(\S+)\s*→\s*(\S+)/);
    return !m || !inferredTransitions.has(`${m[1]}→${m[2]}`);
  });

  const allSeed = [...filteredSeed, ...payslipInferred];

  // 새 시드의 workplace 키 집합 (category|dateFrom|title) — 중복 방어용
  const seedWpKeys = new Set(
    allSeed.filter((e) => e.category === 'workplace').map((e) => `${e.dateFrom || ''}|${e.title || ''}`)
  );
  // 사용자 추가 이벤트 보존 (autoSeed=true 제거) + 시드와 겹치는 마이그레이션 workplace 제거
  const userEvents = loadEvents().filter((e) => {
    if (e.autoSeed) return false;
    if (e.category === 'workplace' && e.legacyOrigin === 'work_history') {
      return !seedWpKeys.has(`${e.dateFrom || ''}|${e.title || ''}`);
    }
    return true;
  });
  const merged = [...allSeed, ...userEvents];
  saveEvents(merged);
  return merged;
}

// 동적 leave 이벤트 — LEAVE 모듈 실데이터 (calcQuotaSummary 의 올해 사용량/잔여) 를
// 매 렌더 시 새로 계산해 leave 카테고리 이벤트로 wrapping. 정적 시드와 별개.
//
// `dateFrom` 은 sort 안정성을 위해 `${year}-12` 로 고정 (해당 연도의 마지막 카드로
// 위치 — 미래 마일스톤보다 앞, 다음해 카드보다 뒤).
// `dyn-leave-` prefix 는 동적 ID 예약 — 사용자 입력 이벤트 ID 와 충돌 안 함.
export function computeDynamicLeaveEvents(profile, now = new Date()) {
  if (!profile?.hireDate) return [];
  const year = now.getFullYear();
  const parsed = PROFILE.parseDate(profile.hireDate);
  const annual = parsed ? CALC.calcAnnualLeave(new Date(parsed), now) : null;
  // totalLeave 가 0/null/undefined 면 동적 이벤트 미생성 (잘못된 "잔여 15일" 회귀 차단).
  const totalAnnual = annual?.totalLeave;
  if (!totalAnnual || totalAnnual <= 0) return [];

  let summary = [];
  try { summary = LEAVE.calcQuotaSummary(year, totalAnnual) || []; } catch {}
  const annualEntry = summary.find((q) => q.id === 'annual' || q.label === '연차');
  if (!annualEntry) return [];

  // 잔여 음수 (= 사용량이 quota 초과) 처리: 0 으로 클램프 + "초과" 배지
  const used = Math.max(0, annualEntry.used || 0);
  const remainingRaw = (annualEntry.remaining != null) ? annualEntry.remaining : (totalAnnual - used);
  const remaining = Math.max(0, remainingRaw);
  const overshoot = remainingRaw < 0 ? Math.abs(remainingRaw) : 0;
  const titleSuffix = overshoot > 0 ? ` · 한도 초과 ${overshoot}일` : '';

  return [{
    id: `dyn-leave-${year}`, category: 'leave',
    title: `${year}년 연차 사용 ${used}일 / 잔여 ${remaining}일${titleSuffix}`,
    sub: `${year}년 발생 ${totalAnnual}일 — 사용 ${used}일 (제36조)`,
    dateFrom: `${year}-12`,
    badge: { text: overshoot > 0 ? '초과' : '올해', tone: overshoot > 0 ? 'amber' : 'rose' },
    dynamic: true,
  }];
}

export const CAREER = {
  loadEvents, saveEvents, addEvent, updateEvent, deleteEvent,
  generateSeedEvents, regenerateSeed, inferPromotionsFromPayslips, computeDynamicLeaveEvents,
};

if (typeof window !== 'undefined') {
  window.CAREER = CAREER;
  // 급여명세서 업로드로 직급·호봉 변경 시 → 커리어 시드 재생성
  // 기존 사용자 이벤트는 보존, autoSeed 이벤트만 새 grade/year 기반으로 교체됨.
  window.addEventListener('careerProfileChanged', () => {
    try { regenerateSeed(); } catch {}
  });
}
