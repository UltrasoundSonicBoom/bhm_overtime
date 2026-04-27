'use strict';
// ============================================================
// union_regulation_admin.js
// 규정 상수 단일 화면 관리: regulation-constants.js ↔ nurse_regulation.json 비교
// DB 없이 동작 (DB 연결 Phase에서 Supabase 연동 예정)
// ============================================================

// ── 안전 이스케이프 (XSS 방어) ────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── regulation-constants.js 상수 목록 (브라우저용 인라인 복사) ──
// 원본: /regulation-constants.js (Node.js 환경에서는 require로 로드)
const RC = {
  ORDINARY_WAGE_HOURS:              { value: 209,         ref: '제32조',           desc: '월 소정근로시간' },
  OVERTIME_MULTIPLIER:              { value: 1.5,         ref: '제34조',           desc: '연장근로 배율' },
  NIGHT_ALLOWANCE_MULTIPLIER:       { value: 2.0,         ref: '제47조',           desc: '야간근로 배율 (22:00~06:00)' },
  EXTENDED_NIGHT_MULTIPLIER:        { value: 2.0,         ref: '제34조',           desc: '통상근무자 연장→야간 배율' },
  HOLIDAY_MULTIPLIER:               { value: 1.5,         ref: '제34조',           desc: '휴일근로 배율 (8h 이내)' },
  HOLIDAY_OVER8_MULTIPLIER:         { value: 2.0,         ref: '제34조',           desc: '휴일근로 배율 (8h 초과)' },
  DUTY_ALLOWANCE_DAILY:             { value: 50000,       ref: '제34조',           desc: '일직/숙직비 (일)' },
  MEAL_SUBSIDY:                     { value: 150000,      ref: '제43조',           desc: '급식보조비 (월)' },
  TRANSPORT_SUBSIDY:                { value: 150000,      ref: '제43조',           desc: '교통보조비 (월)' },
  EDUCATION_ALLOWANCE_MONTHLY:      { value: 40000,       ref: '제43조',           desc: '교육훈련비 (월)' },
  SPECIAL_PAY5_MONTHLY:             { value: 35000,       ref: '별표',             desc: '별정수당5 (월)' },
  REFRESH_BENEFIT_MONTHLY:          { value: 30000,       ref: '별도합의 2024.11', desc: '리프레시지원비 (월, 통상임금 산입)' },
  MILITARY_SERVICE_PAY_MONTHLY:     { value: 45000,       ref: '별표',             desc: '군복무수당 (월)' },
  MILITARY_SERVICE_MAX_MONTHS:      { value: 24,          ref: '별표',             desc: '군복무 최대 인정 개월' },
  ON_CALL_STANDBY_DAILY:            { value: 10000,       ref: '제32조',           desc: '온콜 대기수당 (일)' },
  ON_CALL_TRANSPORT:                { value: 50000,       ref: '제32조',           desc: '온콜 출근 교통비' },
  ON_CALL_COMMUTE_HOURS:            { value: 2,           ref: '제32조',           desc: '온콜 출근 인정 근무시간' },
  NIGHT_SHIFT_BONUS_PER_SHIFT:      { value: 10000,       ref: '제32조 부속합의',   desc: '야간근무 가산금 (회당)' },
  PRIME_TEAM_SUBSTITUTE_DAILY:      { value: 20000,       ref: '제32조 부속합의',   desc: '프라임팀 대체 가산 (일)' },
  PRECEPTOR_ALLOWANCE:              { value: 200000,      ref: '제63조의2',        desc: '프리셉터 교육수당 (2주당)' },
  LONG_SERVICE_PAY:                 { value: 'ADDITIVE: 0/5만/6만/8만/10만/11만/14만', ref: '제50조', desc: '장기근속수당 (ADDITIVE 구조)' },
  SENIORITY_CUT_DATE:               { value: '2016-02-29',ref: '제46조',           desc: '근속가산율 적용 기준일' },
  FAMILY_SUPPORT_SKIP_MONTHS:       { value: '[1, 9]',    ref: '별표',             desc: '가계지원비 기준 미지급월' },
  SEVERANCE_CUT_DATE_2015:          { value: '2015-06-30',ref: '제52조',           desc: '퇴직수당 적용 기준일' },
  SEVERANCE_CUT_DATE_2001:          { value: '2001-08-31',ref: '제52조',           desc: '누진배수 기준일' },
};

// ── nurse_regulation.json 비교 대상 맵핑 ──────────────────────
// BUG-N-01: night_22_to_06_and_holiday = 1.5 는 야간(2.0)과 분리 필요
const SYNC_MAP = [
  {
    rcKey: 'NIGHT_ALLOWANCE_MULTIPLIER',
    rcValue: 2.0,
    nurseKey: 'overtime.multipliers.night_22_to_06_and_holiday',
    nurseValue: null,
    bugId: 'BUG-N-01',
    note: '야간(2.0)과 휴일(1.5)이 1.5로 합산 기록 — 분리 필요',
  },
  {
    rcKey: 'REFRESH_BENEFIT_MONTHLY',
    rcValue: 30000,
    nurseKey: 'wage_structure.fixed_allowances.refresh_support_yearly ÷ 12',
    nurseValue: null,
    bugId: null,
    note: '360,000 ÷ 12 = 30,000 — 일치 예상',
  },
  {
    rcKey: 'PRIME_TEAM_SUBSTITUTE_DAILY',
    rcValue: 20000,
    nurseKey: 'shift_worker_rules.substitute_work.prime_team_allowance',
    nurseValue: null,
    bugId: null,
    note: '일치 확인 필요',
  },
  {
    rcKey: 'PRECEPTOR_ALLOWANCE',
    rcValue: 200000,
    nurseKey: 'welfare_and_training.new_hire_training.preceptor_allowance',
    nurseValue: null,
    bugId: null,
    note: '일치 확인 필요',
  },
  {
    rcKey: 'ON_CALL_STANDBY_DAILY',
    rcValue: 10000,
    nurseKey: 'overtime_and_on_call.on_call.standby_per_day',
    nurseValue: null,
    bugId: null,
    note: '일치 확인 필요',
  },
];

// ── DOM 렌더링: 상수 목록 테이블 ─────────────────────────────
function renderConstantsTable(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const tbody = document.createElement('tbody');
  for (const [key, info] of Object.entries(RC)) {
    const valStr = typeof info.value === 'number'
      ? info.value.toLocaleString('ko-KR')
      : String(info.value);

    const tr = document.createElement('tr');
    tr.innerHTML = [
      `<td class="key-cell"><code>${esc(key)}</code></td>`,
      `<td class="ref-cell">${esc(info.ref)}</td>`,
      `<td class="val-cell">${esc(valStr)}</td>`,
      `<td class="desc-cell">${esc(info.desc)}</td>`,
      `<td class="copy-cell"><button class="copy-btn" title="복사">복사</button></td>`,
    ].join('');
    tr.querySelector('.copy-btn').addEventListener('click', () => {
      copyToClipboard(`${key}: ${info.value}`);
      const btn = tr.querySelector('.copy-btn');
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '복사'; }, 1500);
    });
    tbody.appendChild(tr);
  }

  const table = document.createElement('table');
  table.className = 'reg-table';
  table.id = 'constants-table';
  table.innerHTML = `<thead><tr>
    <th>상수명</th><th>조항</th><th>현재값</th><th>설명</th><th></th>
  </tr></thead>`;
  table.appendChild(tbody);
  container.appendChild(table);
}

// ── nurse_regulation.json 로드 ───────────────────────────────
async function loadNurseRegulation() {
  const paths = [
    '../content/policies/2026/nurse_regulation.json',
    '/content/policies/2026/nurse_regulation.json',
  ];
  for (const p of paths) {
    try {
      const resp = await fetch(p);
      if (resp.ok) return resp.json();
    } catch (_) { /* try next */ }
  }
  return null;
}

// ── 동기화 패널 렌더링 ─────────────────────────────────────────
function renderSyncPanel(containerId, nurseData) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!nurseData) {
    const warn = document.createElement('p');
    warn.className = 'sync-warn';
    warn.textContent = '⚠️ nurse_regulation.json 로드 실패. 로컬 서버에서 실행하세요.';
    container.appendChild(warn);
    return;
  }

  // nurse_regulation.json에서 비교값 추출
  const whr = nurseData.working_hours_and_shift_rules || {};
  const swr = whr.shift_worker_rules || {};
  const oac = whr.overtime_and_on_call || {};
  const ws  = nurseData.wage_structure_and_allowances || {};
  const wt  = nurseData.welfare_and_training || {};

  SYNC_MAP[0].nurseValue = (oac.multipliers || {}).night_22_to_06_and_holiday;
  SYNC_MAP[1].nurseValue = Math.round(((ws.fixed_allowances || {}).refresh_support_yearly || 0) / 12);
  SYNC_MAP[2].nurseValue = (swr.substitute_work || {}).prime_team_allowance;
  SYNC_MAP[3].nurseValue = (wt.new_hire_training || {}).preceptor_allowance;
  SYNC_MAP[4].nurseValue = ((oac.on_call) || {}).standby_per_day;

  const mismatchCount = SYNC_MAP.filter(i => i.nurseValue !== i.rcValue).length;

  // 요약 배너
  const summary = document.createElement('div');
  summary.className = mismatchCount > 0 ? 'sync-summary-error' : 'sync-summary-ok';
  summary.textContent = mismatchCount > 0
    ? `🔴 불일치 ${mismatchCount}건 — nurse_regulation.json 수정 필요`
    : '✅ 모든 항목 일치';
  container.appendChild(summary);

  // 비교 테이블
  const table = document.createElement('table');
  table.className = 'reg-table sync-table';
  table.innerHTML = `<thead><tr>
    <th>regulation-constants.js</th>
    <th>RC값</th>
    <th>nurse_regulation.json 경로</th>
    <th>JSON값</th>
    <th>상태</th>
    <th>비고</th>
  </tr></thead>`;

  const tbody = document.createElement('tbody');
  for (const item of SYNC_MAP) {
    const match = item.nurseValue === item.rcValue;
    const tr = document.createElement('tr');
    if (!match) tr.className = 'row-mismatch';

    const statusText = match ? '✅ 일치' : '🔴 불일치';
    const bugText = item.bugId ? ` [${item.bugId}]` : '';
    tr.innerHTML = [
      `<td><code>${esc(item.rcKey)}</code></td>`,
      `<td class="val-cell">${esc(item.rcValue)}</td>`,
      `<td>${esc(item.nurseKey)}</td>`,
      `<td class="val-cell">${esc(item.nurseValue ?? '—')}</td>`,
      `<td>${esc(statusText + bugText)}</td>`,
      `<td class="note-cell">${esc(item.note)}</td>`,
    ].join('');
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);

  // BUG-N-01 수정 안내
  const bugNote = document.createElement('div');
  bugNote.className = 'bug-note';
  bugNote.innerHTML = [
    '<strong>BUG-N-01 수정 방법:</strong> ',
    '<code>night_22_to_06_and_holiday: 1.5</code> → ',
    '<code>night_22_to_06: 2.0</code> (제47조) + ',
    '<code>holiday_within_8h: 1.5</code> (제34조) 분리',
  ].join('');
  container.appendChild(bugNote);
}

// ── 클립보드 ──────────────────────────────────────────────────
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  // navigator.clipboard를 사용할 수 없는 환경에서는 사용자가 직접 복사할 수 있도록 안내
  window.prompt('아래 텍스트를 복사하세요 (Ctrl+C / Cmd+C)', text);
}

// ── AI 리포트 JSON ─────────────────────────────────────────────
function buildAIReport() {
  const mismatches = SYNC_MAP.filter(i => i.nurseValue !== i.rcValue);
  return JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    source: 'union_regulation_admin.html',
    constants_count: Object.keys(RC).length,
    mismatches: mismatches.map(i => ({
      rc_key: i.rcKey,
      rc_value: i.rcValue,
      nurse_path: i.nurseKey,
      nurse_value: i.nurseValue,
      bug_id: i.bugId,
      note: i.note,
    })),
  }, null, 2);
}

// ── DB 연동: regulation-rules 로드/저장 ─────────────────────────

/**
 * DB에서 regulation rules 로드 (Admin API)
 * @param {number} versionId - regulation_versions.id
 * @returns {Promise<Array|null>} rules 배열 또는 null (실패 시)
 */
async function loadRegulationRules(versionId) {
  try {
    const resp = await fetch(`/api/admin/regulation-rules?versionId=${versionId}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.results || null;
  } catch (_) {
    return null;
  }
}

/**
 * DB에 regulation rule 저장 (POST)
 * @param {Object} rule - { versionId, ruleType, ruleKey, ruleData, description }
 * @returns {Promise<Object|null>} 저장된 rule 또는 null
 */
async function saveRegulationRule(rule) {
  try {
    const resp = await fetch('/api/admin/regulation-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.result || null;
  } catch (_) {
    return null;
  }
}

/**
 * DB regulation rule 업데이트 (PUT)
 * @param {number} id - calculation_rules.id
 * @param {Object} updates - 수정할 필드
 * @returns {Promise<Object|null>}
 */
async function updateRegulationRule(id, updates) {
  try {
    const resp = await fetch(`/api/admin/regulation-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.result || null;
  } catch (_) {
    return null;
  }
}

/**
 * nurse_regulation.json을 DB에 일괄 저장
 * 현재 로드된 데이터를 규칙별로 분해하여 API에 전송
 */
async function saveAllToDb(nurseData, versionId) {
  if (!nurseData || !versionId) {
    alert('저장 실패: 데이터 또는 버전 ID가 없습니다.');
    return { success: false, count: 0 };
  }

  const ruleMappings = [
    { ruleType: 'shift_rules', ruleKey: 'standard_hours', data: nurseData.working_hours_and_shift_rules?.standard_hours, desc: '표준 근로시간' },
    { ruleType: 'shift_rules', ruleKey: 'shift_worker_rules', data: nurseData.working_hours_and_shift_rules?.shift_worker_rules, desc: '교대근무자 규칙' },
    { ruleType: 'shift_rules', ruleKey: 'overtime_and_on_call', data: nurseData.working_hours_and_shift_rules?.overtime_and_on_call, desc: '시간외/온콜' },
    { ruleType: 'wage_structure', ruleKey: 'fixed_allowances', data: nurseData.wage_structure_and_allowances?.fixed_allowances, desc: '고정 수당' },
    { ruleType: 'wage_structure', ruleKey: 'family_allowance', data: nurseData.wage_structure_and_allowances?.family_allowance, desc: '가족수당' },
    { ruleType: 'leaves', ruleKey: 'annual_leave', data: nurseData.leaves_and_holidays?.annual_leave, desc: '연차 규정' },
    { ruleType: 'welfare', ruleKey: 'new_hire_training', data: nurseData.welfare_and_training?.new_hire_training, desc: '신규채용 교육' },
  ];

  let savedCount = 0;
  for (const mapping of ruleMappings) {
    if (!mapping.data) continue;
    const result = await saveRegulationRule({
      versionId,
      ruleType: mapping.ruleType,
      ruleKey: mapping.ruleKey,
      ruleData: mapping.data,
      description: mapping.desc,
    });
    if (result) savedCount++;
  }

  return { success: savedCount > 0, count: savedCount };
}

/**
 * 활성 규정 버전 ID를 API에서 조회
 * @returns {Promise<number|null>}
 */
async function fetchActiveVersionId() {
  try {
    const resp = await fetch('/api/admin/versions');
    if (!resp.ok) return null;
    const data = await resp.json();
    const active = (data.results || []).find((v) => v.status === 'active');
    return active ? active.id : null;
  } catch (_) {
    return null;
  }
}

// ── 초기화 ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  renderConstantsTable('constants-container');

  const nurseData = await loadNurseRegulation();
  renderSyncPanel('sync-container', nurseData);

  // 활성 버전 ID를 API에서 동적으로 조회 (하드코딩 1 제거)
  const activeVersionId = await fetchActiveVersionId();

  if (activeVersionId !== null) {
    const dbRules = await loadRegulationRules(activeVersionId);
    if (dbRules && dbRules.length > 0) {
      console.log(`[DB] 버전 ${activeVersionId}: ${dbRules.length}개 regulation rules 로드됨`);
    }
  } else {
    console.warn('[DB] 활성 규정 버전을 찾을 수 없습니다. DB에 저장하려면 먼저 버전을 활성화하세요.');
  }

  const reportBtn = document.getElementById('copy-report-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      copyToClipboard(buildAIReport());
      reportBtn.textContent = '✓ 복사됨';
      setTimeout(() => { reportBtn.textContent = 'AI 리포트 JSON 복사'; }, 2000);
    });
  }

  // DB 저장 버튼
  const saveBtn = document.getElementById('save-to-db-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = '버전 확인 중...';
      try {
        const versionId = await fetchActiveVersionId();
        if (!versionId) {
          saveBtn.textContent = '활성 버전 없음 — 버전 관리에서 활성화 필요';
          saveBtn.style.background = '#c44';
          setTimeout(() => {
            saveBtn.textContent = 'DB에 저장';
            saveBtn.style.background = '#2a8c4a';
            saveBtn.disabled = false;
          }, 3000);
          return;
        }
        saveBtn.textContent = '저장 중...';
        const result = await saveAllToDb(nurseData, versionId);
        if (result.success) {
          saveBtn.textContent = `성공: ${result.count}건 저장 (v${versionId})`;
          saveBtn.style.background = '#2a8c4a';
        } else {
          saveBtn.textContent = '실패 — 서버 확인 필요';
          saveBtn.style.background = '#c44';
        }
      } catch (e) {
        saveBtn.textContent = '실패: ' + (e.message || '알 수 없는 오류');
        saveBtn.style.background = '#c44';
      }
      setTimeout(() => {
        saveBtn.textContent = 'DB에 저장';
        saveBtn.style.background = '#2a8c4a';
        saveBtn.disabled = false;
      }, 3000);
    });
  }
});
