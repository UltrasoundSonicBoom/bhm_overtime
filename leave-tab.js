// ============================================
// leave-tab.js — 휴가 탭 UI 렌더링
// ============================================

// ═══════════ 📅 휴가 관리 ═══════════


let lvSelectedDate = null;
let lvHolidayMap = {};
let lvTotalAnnual = 0;
let lvCurrentYear = new Date().getFullYear();
let lvCurrentMonth = new Date().getMonth() + 1;
let lvInitialized = false;

// 월 이동
function lvNavMonth(delta) {
  lvCurrentMonth += delta;
  if (lvCurrentMonth > 12) { lvCurrentMonth = 1; lvCurrentYear++; }
  if (lvCurrentMonth < 1) { lvCurrentMonth = 12; lvCurrentYear--; }
  refreshLvCalendar();
}

function lvGoToday() {
  const now = new Date();
  lvCurrentYear = now.getFullYear();
  lvCurrentMonth = now.getMonth() + 1;
  refreshLvCalendar();
}

function initLeaveTab() {
  const now = new Date();
  lvCurrentYear = now.getFullYear();
  lvCurrentMonth = now.getMonth() + 1;

  // 프로필에서 연차 자동 산정
  const profile = PROFILE.load();
  if (profile && profile.hireDate) {
    const parsed = PROFILE.parseDate(profile.hireDate);
    if (parsed) {
      const result = CALC.calcAnnualLeave(new Date(parsed));
      if (result) lvTotalAnnual = result.totalLeave;
    }
  }

  // 유형 select 동적 생성
  populateLvTypeSelect();

  // 날짜 변경 이벤트 (최초 1회만)
  if (!lvInitialized) {
    document.getElementById('lvStartDate').addEventListener('change', previewLvCalc);
    document.getElementById('lvEndDate').addEventListener('change', previewLvCalc);
    lvInitialized = true;
  }

  // 기존 기록 마이그레이션 (유형 규정 변경 감지 → 재계산)
  LEAVE.migrateRecords();

  refreshLvCalendar();
}

// ── 대시보드 렌더링 ──
function renderLvDashboard(year) {
  const container = document.getElementById('lvDashboard');
  if (!container) return;

  const records = LEAVE.getYearRecords(year);
  const usage = {};
  records.forEach(r => {
    if (!usage[r.type]) usage[r.type] = 0;
    usage[r.type] += (r.days || 0);
  });

  // 시간차 시간 합산
  let timeLeaveHours = 0;
  records.forEach(r => { if (r.type === 'time_leave') timeLeaveHours += (r.hours || 0); });

  const annualUsed = (usage['annual'] || 0) + (usage['time_leave'] || 0);
  const eduTraining = usage['edu_training'] || 0;
  const eduMandatory = usage['edu_mandatory'] || 0;
  const checkup = usage['checkup'] || 0;
  const blood = usage['blood_donation'] || 0;

  const items = [
    { label: '연차', used: annualUsed, total: lvTotalAnnual || '?', key: true },
    { label: '시간차', used: timeLeaveHours, total: null, suffix: 'h', show: timeLeaveHours > 0, annualDays: Math.round(timeLeaveHours / 8 * 10) / 10 },
    { label: '교육연수', used: eduTraining, total: 3 },
    { label: '필수교육', used: eduMandatory, total: 3 },
    { label: '검진휴가', used: checkup, total: 1 },
    { label: '헌혈휴가', used: blood, total: 1 },
  ];

  let html = '';
  items.forEach(item => {
    if (item.show === false) return;
    if (item.suffix) {
      const annualNote = item.annualDays ? ` (=${item.annualDays}일)` : '';
      html += `<div class="lv-dash-item">${item.label} <span class="lv-dash-value">${item.used}${item.suffix}${annualNote}</span></div>`;
      return;
    }
    const remain = typeof item.total === 'number' ? item.total - item.used : null;
    let cls = 'lv-dash-value';
    if (remain !== null && remain <= 0) cls += ' over';
    else if (remain !== null && remain <= Math.ceil((typeof item.total === 'number' ? item.total : 0) * 0.2)) cls += ' warning';
    html += `<div class="lv-dash-item">${item.label}(<span class="${cls}">${item.used}/${item.total}</span>)</div>`;
  });

  container.innerHTML = html;
}

// 카테고리별 아이콘 매핑
const LV_CAT_ICONS = {
  legal: '🏖️', health: '🏥', education: '📚',
  family: '👪', ceremony: '🎗️', maternity: '🤱',
  special: '🔷', other: '⬜'
};

// 카테고리별 색상 (캘린더 뷰와 동일)
const LV_CAT_COLORS = {
  legal:     { bg: 'rgba(16,185,129,0.15)',  accent: 'rgba(16,185,129,0.25)',  header: 'rgba(16,185,129,0.10)' },
  health:    { bg: 'rgba(244,63,94,0.12)',    accent: 'rgba(244,63,94,0.22)',   header: 'rgba(244,63,94,0.08)' },
  education: { bg: 'rgba(139,92,246,0.12)',   accent: 'rgba(139,92,246,0.22)',  header: 'rgba(139,92,246,0.08)' },
  family:    { bg: 'rgba(99,102,241,0.12)',   accent: 'rgba(99,102,241,0.22)',  header: 'rgba(99,102,241,0.08)' },
  ceremony:  { bg: 'rgba(245,158,11,0.12)',   accent: 'rgba(245,158,11,0.22)',  header: 'rgba(245,158,11,0.08)' },
  maternity: { bg: 'rgba(6,182,212,0.12)',    accent: 'rgba(6,182,212,0.22)',   header: 'rgba(6,182,212,0.08)' },
  special:   { bg: 'rgba(99,102,241,0.12)',   accent: 'rgba(99,102,241,0.22)',  header: 'rgba(99,102,241,0.08)' },
};
const LV_CAT_DEFAULT_COLOR = { bg: 'rgba(99,102,241,0.10)', accent: 'rgba(99,102,241,0.20)', header: 'rgba(99,102,241,0.06)' };

// 유형 select 동적 생성 (성별 필터 + optgroup)
function populateLvTypeSelect() {
  const container = document.getElementById('lvTypeSelectContainer');
  if (!container) return;
  container.innerHTML = '';

  const profile = PROFILE.load();
  const gender = profile ? profile.gender : '';
  const groups = LEAVE.getGroupedTypes(gender);

  // 현재 선택된 유형
  const lvTypeInput = document.getElementById('lvType');
  const selectedType = lvTypeInput ? lvTypeInput.value : '';

  // 기본적으로 토글이 펼쳐진 그룹들
  const defaultOpenGroups = ['legal', 'education', 'health', 'family'];

  // 사용 현황 데이터 가져오기
  const year = typeof lvCurrentYear !== 'undefined' ? lvCurrentYear : new Date().getFullYear();
  const records = LEAVE.getYearRecords(year);
  const usage = {};
  let timeLeaveHours = 0;
  records.forEach(r => {
    if (!usage[r.type]) usage[r.type] = 0;
    usage[r.type] += (r.days || 0);
    if (r.type === 'time_leave') timeLeaveHours += (r.hours || 0);
  });

  groups.forEach(group => {
    const colors = LV_CAT_COLORS[group.id] || LV_CAT_DEFAULT_COLOR;

    const groupDiv = document.createElement('div');
    groupDiv.style.marginBottom = '6px';
    groupDiv.style.background = 'var(--bg-card)';
    groupDiv.style.borderRadius = 'var(--radius-sm)';
    groupDiv.style.overflow = 'hidden';
    groupDiv.style.border = '1px solid var(--border-glass)';
    groupDiv.style.flexShrink = '0';

    // 제목 (토글 버튼)
    const titleDiv = document.createElement('div');
    titleDiv.style.fontSize = 'var(--text-body-normal)';
    titleDiv.style.fontWeight = '700';
    titleDiv.style.color = 'var(--text-primary)';
    titleDiv.style.padding = '10px 14px';
    titleDiv.style.cursor = 'pointer';
    titleDiv.style.display = 'flex';
    titleDiv.style.alignItems = 'center';
    titleDiv.style.justifyContent = 'space-between';
    titleDiv.style.background = colors.header;

    const isOpenByDefault = defaultOpenGroups.includes(group.id);

    titleDiv.innerHTML = `<span>${group.label}</span><span class="toggle-icon" style="color:var(--text-muted); transition:transform 0.2s;">${isOpenByDefault ? '▲' : '▼'}</span>`;
    groupDiv.appendChild(titleDiv);

    const itemsContainer = document.createElement('div');
    itemsContainer.style.padding = '8px 12px';
    itemsContainer.style.borderTop = '1px solid var(--border-glass)';
    itemsContainer.style.display = isOpenByDefault ? 'block' : 'none';

    // 2컬럼 레이아웃 적용
    if (group.id !== 'other') {
      itemsContainer.style.display = isOpenByDefault ? 'grid' : 'none';
      if (itemsContainer.style.display === 'grid') {
        itemsContainer.style.gridTemplateColumns = '1fr 1fr';
        itemsContainer.style.gap = '6px';
      }
    }

    titleDiv.onclick = () => {
      const icon = titleDiv.querySelector('.toggle-icon');
      if (itemsContainer.style.display === 'none') {
        if (group.id !== 'other') {
          itemsContainer.style.display = 'grid';
          itemsContainer.style.gridTemplateColumns = '1fr 1fr';
          itemsContainer.style.gap = '6px';
        } else {
          itemsContainer.style.display = 'block';
        }
        icon.textContent = '▲';
      } else {
        itemsContainer.style.display = 'none';
        icon.textContent = '▼';
      }
    };

    group.items.forEach(t => {
      let label = t.label;
      if (t.isTimeBased && t.id !== 'time_leave') label += ' (시간단위)';

      const usedRaw = usage[t.id] || 0;
      const usedDays = Math.round(usedRaw * 10) / 10;
      let statusHtml = '';

      if (t.id === 'annual' || t.usesAnnual) {
        const annualData = LEAVE.calcAnnualSummary(year, typeof lvTotalAnnual !== 'undefined' ? lvTotalAnnual : 15);
        if (t.id === 'time_leave') {
          statusHtml = `<span style="color: var(--accent-emerald); font-size: var(--text-body-normal); font-weight: 700; margin-left: auto;">${timeLeaveHours}h 사용</span>`;
        } else {
          statusHtml = `<span style="color: var(--accent-emerald); font-size: var(--text-body-normal); font-weight: 700; margin-left: auto;">${annualData.usedAnnual}/${annualData.totalAnnual}</span>`;
        }
      } else if (t.quota !== null) {
        statusHtml = `<span style="color: var(--accent-emerald); font-size: var(--text-body-normal); font-weight: 700; margin-left: auto;">${usedDays}/${t.quota}</span>`;
      } else {
        statusHtml = `<span style="color: var(--accent-emerald); font-size: var(--text-body-normal); font-weight: 700; margin-left: auto;">${usedDays}일 사용</span>`;
      }

      const isSelected = t.id === selectedType;

      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.width = '100%';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'space-between';
      btn.style.marginBottom = group.id !== 'other' ? '0' : '4px';
      btn.style.padding = '10px 12px';
      btn.style.background = isSelected ? colors.accent : colors.bg;
      btn.style.border = isSelected ? '2px solid var(--accent-emerald)' : '1px solid var(--border-glass)';
      btn.style.borderRadius = 'var(--radius-sm)';
      btn.style.color = 'var(--text-primary)';
      btn.style.fontSize = 'var(--text-body-normal)';
      btn.style.fontWeight = '600';
      btn.onclick = () => selectLvType(t.id, t.label);
      btn.innerHTML = `<span>${isSelected ? '✓ ' : ''}${label}</span>${statusHtml}`;

      const baseBg = colors.bg;
      const hoverBg = colors.accent;
      if (!isSelected) {
        btn.onmouseover = () => btn.style.background = hoverBg;
        btn.onmouseout = () => btn.style.background = baseBg;
      }

      itemsContainer.appendChild(btn);
    });

    groupDiv.appendChild(itemsContainer);
    container.appendChild(groupDiv);
  });
}

function openLvTypeBottomSheet() {
  document.getElementById('lvTypeSelectOverlay').classList.add('show');
  document.getElementById('lvTypeSelectSheet').classList.add('show');
}

function closeLvTypeBottomSheet() {
  document.getElementById('lvTypeSelectOverlay').classList.remove('show');
  document.getElementById('lvTypeSelectSheet').classList.remove('show');
}

function selectLvType(id, label) {
  const lvTypeInput = document.getElementById('lvType');
  const btnText = document.getElementById('lvTypeBtnText');
  if (lvTypeInput && btnText) {
    lvTypeInput.value = id;
    btnText.textContent = label;
    onLvTypeChange();
  }
  closeLvTypeBottomSheet();
  populateLvTypeSelect(); // 선택 상태 갱신
}

function updateLvTypeBtnText(id) {
  const typeInfo = LEAVE.getTypeById(id);
  if (!typeInfo) return;

  let label = typeInfo.label; // 아이콘, [무급] 태그 제거
  if (typeInfo.isTimeBased && id !== 'time_leave') label += ' (시간단위)'; // (시간단위) 제거
  const btnText = document.getElementById('lvTypeBtnText');
  if (btnText) btnText.textContent = label;
}

// recordsByDay 빌더 - 주말/공휴일 제외 (병가는 역일 기준이므로 포함)
function buildLvRecordsByDay(year, month, monthRecords, holidayMap) {
  const recordsByDay = {};
  monthRecords.forEach(r => {
    const useCalendarDays = (r.type === 'sick'); // 병가만 역일 기준
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getMonth() + 1 === month && cur.getFullYear() === year) {
        const d = cur.getDate();
        const dow = cur.getDay();
        const isWeekend = (dow === 0 || dow === 6);
        const isHoliday = !!(holidayMap && holidayMap[d]);
        // 병가가 아닌 경우 주말·공휴일은 연차 소진 없으므로 표시 제외
        if (!useCalendarDays && (isWeekend || isHoliday)) {
          cur.setDate(cur.getDate() + 1);
          continue;
        }
        if (!recordsByDay[d]) recordsByDay[d] = [];
        recordsByDay[d].push(r);
      }
      cur.setDate(cur.getDate() + 1);
    }
  });
  return recordsByDay;
}

async function refreshLvCalendar() {
  const year = lvCurrentYear;
  const month = lvCurrentMonth;

  // 1. 빠른 렌더링 (공휴일 미적용, 주말만 제외)
  const monthRecords = LEAVE.getMonthRecords(year, month);
  const recordsByDayFast = buildLvRecordsByDay(year, month, monthRecords, lvHolidayMap);

  renderLvCalendar(year, month, recordsByDayFast);
  renderLvRecordList(year);
  renderLvStats(year);
  renderLvQuotaTable(year);
  resetLvPanel();

  // 2. 공휴일 데이터 백그라운드 로드
  let workInfo;
  try { workInfo = await HOLIDAYS.calcWorkDays(year, month); }
  catch { workInfo = { holidays: [], anniversaries: [] }; }

  lvHolidayMap = {};
  (workInfo.holidays || []).forEach(h => { lvHolidayMap[h.day] = h.name; });

  // 3. 공휴일 포함해서 재빌드 후 재렌더링
  const recordsByDay = buildLvRecordsByDay(year, month, monthRecords, lvHolidayMap);
  renderLvCalendar(year, month, recordsByDay);
}

function renderLvCalendar(year, month, recordsByDay) {
  const container = document.getElementById('lvCalendar');
  if (!container) return;

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const today = new Date();
  const isCurrentMonth = (today.getFullYear() === year && (today.getMonth() + 1) === month);
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const dowLabels = ['일', '월', '화', '수', '목', '금', '토'];
  let html = '<div class="ot-cal"><div class="ot-cal-header" style="background:rgba(16,185,129,0.08); color:var(--accent-emerald)">'
    + '<button class="cal-nav-btn" onclick="lvNavMonth(-1)">◀</button>'
    + '<span class="cal-nav-title" onclick="lvGoToday()">' + year + '년 ' + month + '월</span>'
    + '<button class="cal-nav-btn" onclick="lvNavMonth(1)">▶</button>'
    + '</div>';
  html += '<div class="ot-cal-grid">';

  dowLabels.forEach((d, i) => {
    const cls = i === 0 ? 'sun' : (i === 6 ? 'sat' : '');
    html += `<div class="ot-cal-dow ${cls}">${d}</div>`;
  });

  for (let i = 0; i < firstDow; i++) html += '<div class="ot-cal-day empty"></div>';

  let hasHolidayInMonth = false;
  const presentCategories = new Set();

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const isWknd = (dow === 0 || dow === 6);
    const isHoliday = !!lvHolidayMap[d];
    const isToday = (d === todayDay);
    const isSelected = lvSelectedDate && lvSelectedDate.day === d;
    const dayRecords = recordsByDay[d] || [];

    let cls = 'ot-cal-day';
    if (isHoliday) {
      cls += ' holiday';
      hasHolidayInMonth = true;
    } else if (isWknd) {
      cls += ' weekend';
    }
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';

    // 휴가 유형 텍스트 표시 (점 대신 유형명) + 공휴일 이름
    let dotsHtml = '<div style="display:flex; flex-direction:column; gap:1px; margin-top:1px;">';
    if (isHoliday) {
      const hName = lvHolidayMap[d];
      const hShort = hName.length > 3 ? hName.substring(0, 3) : hName;
      dotsHtml += `<span class="cal-badge" style="background:rgba(244,63,94,0.15); color:var(--accent-rose); font-weight:600;">${hShort}</span>`;
    }
    const uniqueTypes = [...new Set(dayRecords.map(r => r.type))];
    uniqueTypes.forEach(t => {
      const typeInfo = LEAVE.getTypeById(t);
      if (typeInfo && typeInfo.category) presentCategories.add(typeInfo.category);
      const label = typeInfo ? typeInfo.label : t;
      // 3글자까지만 표시 (모바일 공간 절약)
      const shortLabel = label.length > 3 ? label.substring(0, 3) : label;
      const catColors = {
        legal: 'rgba(16,185,129,0.15)',
        health: 'rgba(244,63,94,0.12)',
        education: 'rgba(139,92,246,0.12)',
        family: 'rgba(99,102,241,0.12)',
        ceremony: 'rgba(245,158,11,0.12)',
        maternity: 'rgba(6,182,212,0.12)',
        special: 'rgba(99,102,241,0.12)',
      };
      const bg = catColors[typeInfo?.category] || 'rgba(99,102,241,0.1)';
      dotsHtml += `<span class="cal-badge" style="background:${bg}; color:#1a1a1a;">${shortLabel}</span>`;
    });
    dotsHtml += '</div>';

    html += `<div class="${cls}" data-day="${d}" onclick="onLvDateClick(${year},${month},${d})">${d}${dotsHtml}</div>`;
  }

  html += '</div>';

  let legendHtml = '';

  if (hasHolidayInMonth) {
    legendHtml += `<span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--accent-rose);"></span> <span style="font-size:12px; color:var(--text-secondary);">공휴일</span></span>`;
  }

  const catNames = {
    legal: '법정',
    health: '건강',
    education: '교육',
    family: '가족',
    ceremony: '청원',
    maternity: '출산',
    special: '특별'
  };
  const catColors = {
    legal: 'rgba(16,185,129,0.15)',
    health: 'rgba(244,63,94,0.12)',
    education: 'rgba(139,92,246,0.12)',
    family: 'rgba(99,102,241,0.12)',
    ceremony: 'rgba(245,158,11,0.12)',
    maternity: 'rgba(6,182,212,0.12)',
    special: 'rgba(99,102,241,0.12)',
  };

  ['legal', 'health', 'education', 'family', 'ceremony', 'maternity', 'special'].forEach(cat => {
    if (presentCategories.has(cat)) {
      legendHtml += `<span><span class="cal-badge" style="background:${catColors[cat]}; color:#1a1a1a; padding:2px 6px;">${catNames[cat]}</span></span>`;
    }
  });

  if (legendHtml !== '') {
    html += `<div class="ot-cal-legend" style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:flex-start; padding:10px 12px 16px;">
      ${legendHtml}
    </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

function onLvDateClick(year, month, day) {
  lvSelectedDate = { year, month, day };
  document.querySelectorAll('#lvCalendar .ot-cal-day').forEach(el => el.classList.remove('selected'));
  const targetCell = document.querySelector(`#lvCalendar .ot-cal-day[data-day="${day}"]`);
  if (targetCell) targetCell.classList.add('selected');

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // 기존 기록이 있으면 자동으로 수정 모드로 열기
  const existing = LEAVE.getDateRecords(dateStr);
  if (existing.length > 0) {
    editLvRecord(existing[0].id);
    return;
  }

  // 새 기록 입력 모드
  const dow = new Date(year, month - 1, day).getDay();
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];

  let dateLabel = `${month}월 ${day}일 (${dowNames[dow]})`;
  if (lvHolidayMap[day]) dateLabel += ` 🔴 ${lvHolidayMap[day]}`;

  document.getElementById('lvPanelDate').textContent = dateLabel;
  document.getElementById('lvStartDate').value = dateStr;
  document.getElementById('lvEndDate').value = dateStr;
  document.getElementById('lvEditId').value = '';
  document.getElementById('lvDeleteBtn').style.display = 'none';
  document.getElementById('lvSaveBtn').textContent = '저장';
  document.getElementById('lvMemo').value = '';
  document.getElementById('lvType').value = 'annual';
  updateLvTypeBtnText('annual');

  onLvTypeChange();
  previewLvCalc();

  // 바텀시트 열기
  openLvBottomSheet();
}

// ── 휴가 바텀시트 컨트롤 ──
function openLvBottomSheet() {
  const overlay = document.getElementById('lvInputOverlay');
  const sheet = document.getElementById('lvInputSheet');
  if (overlay && sheet) {
    overlay.classList.add('show');
    sheet.classList.add('show');
  }
}

function closeLvBottomSheet() {
  const overlay = document.getElementById('lvInputOverlay');
  const sheet = document.getElementById('lvInputSheet');
  if (overlay && sheet) {
    overlay.classList.remove('show');
    sheet.classList.remove('show');
  }
}

function resetLvPanel() {
  lvSelectedDate = null;
  document.querySelectorAll('#lvCalendar .ot-cal-day').forEach(el => el.classList.remove('selected'));
  document.getElementById('lvPanelDate').textContent = '날짜를 선택하세요';
  document.getElementById('lvEditId').value = '';
  document.getElementById('lvDeleteBtn').style.display = 'none';
  document.getElementById('lvSaveBtn').textContent = '저장';
  document.getElementById('lvMemo').value = '';
  document.getElementById('lvPreview').innerHTML = '';

  // 오늘 날짜 기본 설정
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  document.getElementById('lvStartDate').value = todayStr;
  document.getElementById('lvEndDate').value = todayStr;
  document.getElementById('lvType').value = 'annual';
  updateLvTypeBtnText('annual');
  onLvTypeChange();

  // 바텀시트 닫기
  closeLvBottomSheet();
}

// 하위 호환
function closeLvPanel() { resetLvPanel(); }

function onLvTypeChange() {
  const type = document.getElementById('lvType').value;
  const typeInfo = LEAVE.getTypeById(type);

  // 청원/경조 상세정보 표시
  const ceremonyPanel = document.getElementById('lvCeremonyInfo');
  if (typeInfo && typeInfo.ceremonyDays !== undefined) {
    document.getElementById('lvCeremonyDays').innerHTML = `<strong>휴가일수:</strong> ${typeInfo.ceremonyDays}일`;
    document.getElementById('lvCeremonyPay').innerHTML = typeInfo.ceremonyPay > 0
      ? `<strong>경조비:</strong> ₩${typeInfo.ceremonyPay.toLocaleString()}`
      : `<strong>경조비:</strong> 없음`;
    document.getElementById('lvCeremonyDocs').innerHTML = typeInfo.docs
      ? `<strong>구비서류:</strong> ${typeInfo.docs}`
      : '';
    document.getElementById('lvCeremonyExtra').innerHTML = typeInfo.extra
      ? `💡 ${typeInfo.extra}`
      : '';
    ceremonyPanel.style.display = 'block';
  } else {
    ceremonyPanel.style.display = 'none';
  }

  // 한도 현황 뱃지
  const quotaBadge = document.getElementById('lvQuotaBadge');
  const year = lvCurrentYear;
  if (typeInfo && typeInfo.quota !== null && !typeInfo.usesAnnual) {
    let effectiveQuota = typeInfo.quota;
    // 가족돌봄(유급): 자녀 2명 이상 → 3일 (제42조, 2021.11 단협)
    if (typeInfo.id === 'family_care_paid') {
      const _pf = typeof PROFILE !== 'undefined' ? PROFILE.load() : null;
      if (_pf && (parseInt(_pf.numChildren) || 0) >= 2) effectiveQuota = 3;
    }
    const records = LEAVE.getYearRecords(year);
    const usedRaw = records.filter(r => r.type === type).reduce((sum, r) => sum + (r.days || 0), 0);
    const used = Math.round(usedRaw * 10) / 10;
    const remain = Math.round((effectiveQuota - usedRaw) * 10) / 10;
    const color = remain <= 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)';
    const refNote = typeInfo.ref ? `<br><span style="color:var(--text-muted); font-size:var(--text-body-normal);">📖 ${typeInfo.ref}</span>` : '';
    quotaBadge.innerHTML = `<div style="padding:6px 10px; border-radius:6px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); font-size:var(--text-body-normal);">
      📊 <strong>${typeInfo.label}</strong> 한도: ${effectiveQuota}일 | 사용: ${used}일 | <span style="color:${color}; font-weight:700;">잔여: ${remain}일</span>
      ${remain <= 0 ? '<br><span style="color:var(--accent-rose)">⚠️ 한도 초과!</span>' : ''}${refNote}
    </div>`;
    quotaBadge.style.display = 'block';
  } else if (typeInfo && typeInfo.usesAnnual) {
    if (lvTotalAnnual > 0) {
      const summary = LEAVE.calcAnnualSummary(year, lvTotalAnnual);
      quotaBadge.innerHTML = `<div style="padding:6px 10px; border-radius:6px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); font-size:var(--text-body-normal);">
        📅 연차 한도: ${lvTotalAnnual}일 | 사용: ${summary.usedAnnual}일 | <span style="color:var(--accent-emerald); font-weight:700;">잔여: ${summary.remainingAnnual}일</span>
      </div>`;
    } else {
      quotaBadge.innerHTML = `<div style="padding:6px 10px; border-radius:6px; background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.2); font-size:var(--text-body-normal); color:var(--text-primary); font-weight:600;">
        ⚠️ 프로필에서 입사일을 설정하면 연차 한도가 자동 계산됩니다.
      </div>`;
    }
    quotaBadge.style.display = 'block';
  } else {
    quotaBadge.style.display = 'none';
  }

  // 시간차 선택 시 시간 입력 표시 및 날짜 필드 숨김
  const timeArea = document.getElementById('lvTimeInputArea');
  const dateArea = document.getElementById('lvDateFields');
  if (typeInfo && typeInfo.isTimeBased) {
    timeArea.style.display = 'block';
    if (dateArea) dateArea.style.display = 'none';
    calcLvTimeHours();
  } else {
    timeArea.style.display = 'none';
    if (dateArea) dateArea.style.display = '';
    document.getElementById('lvTimeCalcResult').textContent = '';
  }

  previewLvCalc();
}

// 시간차 시간 계산
function calcLvTimeHours() {
  const startTime = document.getElementById('lvStartTime').value;
  const endTime = document.getElementById('lvEndTime').value;
  if (!startTime || !endTime) return;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let hours = (eh + em / 60) - (sh + sm / 60);
  if (hours < 0) hours += 24;
  // 점심시간 1시간 제외 (4시간 이상일 때)
  if (hours >= 4) hours -= 1;
  hours = Math.max(0, hours);

  const days = Math.round(hours / 8 * 10) / 10;
  const resultEl = document.getElementById('lvTimeCalcResult');
  resultEl.innerHTML = `${hours.toFixed(1)}시간 = <strong>${days.toFixed(1)}일</strong> 차감 (8시간 = 1일)`;

  previewLvCalc();
}

// 시간차 타입일 때 시간/일수 반환
function getLvTimeInfo() {
  const type = document.getElementById('lvType').value;
  const typeInfo = LEAVE.getTypeById(type);
  if (!typeInfo || !typeInfo.isTimeBased) return null;

  const startTime = document.getElementById('lvStartTime').value;
  const endTime = document.getElementById('lvEndTime').value;
  if (!startTime || !endTime) return null;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let hours = (eh + em / 60) - (sh + sm / 60);
  if (hours < 0) hours += 24;
  if (hours >= 4) hours -= 1;
  hours = Math.max(0, hours);
  const days = Math.round(hours / 8 * 10) / 10;

  return { hours: Math.round(hours * 10) / 10, days, startTime, endTime };
}

function previewLvCalc() {
  const preview = document.getElementById('lvPreview');
  const type = document.getElementById('lvType').value;
  const typeInfo = LEAVE.getTypeById(type);
  if (!typeInfo) { preview.innerHTML = ''; return; }

  const startStr = document.getElementById('lvStartDate').value;
  const endStr = document.getElementById('lvEndDate').value;
  if (!startStr || !endStr) { preview.innerHTML = ''; return; }

  let days;
  const timeInfo = getLvTimeInfo();
  if (timeInfo !== null) {
    days = timeInfo.days;
  } else if (typeInfo.ceremonyDays) {
    days = typeInfo.ceremonyDays;
  } else {
    days = LEAVE._calcBusinessDays(startStr, endStr, { calendarDays: type === 'sick' });
  }

  // 소수점 1자리로 반올림
  const daysRound = Math.round(days * 10) / 10;
  let html = `<div class="preview-row"><span>일수</span><span class="val">${daysRound}일</span></div>`;

  if (typeInfo.usesAnnual) {
    if (lvTotalAnnual > 0) {
      const summary = LEAVE.calcAnnualSummary(parseInt(startStr.split('-')[0]), lvTotalAnnual);
      const remain = summary.remainingAnnual;
      const newRemain = Math.round((remain - daysRound) * 10) / 10;
      html += `<div class="preview-row"><span>연차 차감</span><span class="val" style="color:var(--accent-amber)">-${daysRound}일</span></div>`;
      html += `<div class="preview-row"><span>잔여 연차</span><span class="val">${remain}일 → ${newRemain}일</span></div>`;
    } else {
      html += `<div class="preview-row"><span>연차 차감</span><span class="val" style="color:var(--accent-amber)">-${daysRound}일</span></div>`;
      html += `<div class="preview-row"><span>잔여 연차</span><span class="val" style="color:var(--text-muted)">프로필 입사일 설정 필요</span></div>`;
    }
  }

  // 급여 공제 미리보기
  if (typeInfo.deductType === 'basePay' || typeInfo.deductType === 'ordinary') {
    const profile = PROFILE.load();
    const wage = profile ? PROFILE.calcWage(profile) : null;
    let deduction = 0;
    let basisLabel = '';
    let dailyAmount = 0;

    if (typeInfo.deductType === 'basePay') {
      // 생리휴가: 기본급 월액 / 30 × 일수
      const monthlyBasePay = wage && wage.breakdown ? (wage.breakdown['기준기본급'] || 0) : 0;
      dailyAmount = Math.round(monthlyBasePay / 30);
      deduction = dailyAmount * days;
      basisLabel = `기본급 일액 ${CALC.formatCurrency(dailyAmount)} (보수규정 제7조)`;
    } else {
      // 무급: 통상임금 월액 / 30 × 일수
      const monthlyWage = wage ? wage.monthlyWage : 0;
      dailyAmount = Math.round(monthlyWage / 30);
      deduction = dailyAmount * days;
      basisLabel = `통상임금 일액 ${CALC.formatCurrency(dailyAmount)} (보수규정 제7조②)`;
    }

    if (deduction > 0) {
      html += `<div class="preview-row"><span>급여 차감</span><span class="val" style="color:var(--accent-rose)">-₩${Math.round(deduction).toLocaleString()}</span></div>`;
      html += `<div class="preview-row"><span>공제기준</span><span class="val" style="font-size:var(--text-label-small); color:var(--text-muted)">${basisLabel}</span></div>`;
    } else {
      html += `<div class="preview-row"><span>급여 차감</span><span class="val" style="color:var(--accent-amber)">⚠️ 프로필 저장 후 자동 계산</span></div>`;
    }
  } else {
    html += `<div class="preview-row"><span>급여 차감</span><span class="val" style="color:var(--accent-emerald)">₩0 (유급)</span></div>`;
  }

  preview.innerHTML = html;
}

function saveLvRecord() {
  const type = document.getElementById('lvType').value;
  const startDate = document.getElementById('lvStartDate').value;
  const endDate = document.getElementById('lvEndDate').value;
  const memo = document.getElementById('lvMemo').value;
  const editId = document.getElementById('lvEditId').value;

  if (!startDate || !endDate) { alert('시작일/종료일을 선택하세요.'); return; }
  if (new Date(endDate) < new Date(startDate)) { alert('종료일이 시작일보다 이전입니다.'); return; }

  // 새 기록 추가 시 날짜 중복 검사 (수정 모드 제외)
  if (!editId) {
    const year = startDate.split('-')[0];
    const yearRecords = LEAVE.getYearRecords(parseInt(year));
    const overlap = yearRecords.find(r => {
      return new Date(r.startDate) <= new Date(endDate) && new Date(r.endDate) >= new Date(startDate);
    });
    if (overlap) {
      const typeInfo2 = LEAVE.getTypeById(overlap.type);
      alert(`해당 기간에 이미 저장된 휴가가 있습니다.\n(${typeInfo2 ? typeInfo2.label : overlap.type}: ${overlap.startDate} ~ ${overlap.endDate})\n\n날짜를 클릭하면 기존 기록을 수정할 수 있습니다.`);
      return;
    }
  }

  const typeInfo = LEAVE.getTypeById(type);
  const profile = PROFILE.load();
  const wage = profile ? PROFILE.calcWage(profile) : null;
  const hourlyRate = wage ? wage.hourlyRate : 0;
  const monthlyBasePay = wage && wage.breakdown ? (wage.breakdown['기준기본급'] || 0) : 0;

  let days;
  let hours = null;
  let startTimeVal = null;
  let endTimeVal = null;
  const timeInfo = getLvTimeInfo();
  if (timeInfo !== null) {
    days = timeInfo.days;
    hours = timeInfo.hours;
    startTimeVal = timeInfo.startTime;
    endTimeVal = timeInfo.endTime;
  } else if (typeInfo && typeInfo.ceremonyDays) {
    days = typeInfo.ceremonyDays;
  } else {
    days = LEAVE._calcBusinessDays(startDate, endDate, { calendarDays: type === 'sick' });
  }

  const record = { type, startDate, endDate, days, memo, hourlyRate, monthlyBasePay };
  if (hours !== null) {
    record.hours = hours;
    record.startTime = startTimeVal;
    record.endTime = endTimeVal;
  }

  if (editId) {
    LEAVE.updateRecord(editId, record);
  } else {
    LEAVE.addRecord(record);
  }

  refreshLvCalendar();
  closeLvBottomSheet();
}

function editLvRecord(id) {
  const all = LEAVE._loadAll();
  let record = null;
  for (const records of Object.values(all)) {
    record = records.find(r => r.id === id);
    if (record) break;
  }
  if (!record) return;

  document.getElementById('lvType').value = record.type;
  updateLvTypeBtnText(record.type);
  document.getElementById('lvStartDate').value = record.startDate;
  document.getElementById('lvEndDate').value = record.endDate;
  document.getElementById('lvMemo').value = record.memo || '';
  document.getElementById('lvEditId').value = id;
  document.getElementById('lvDeleteBtn').style.display = 'block';
  document.getElementById('lvSaveBtn').textContent = '수정';

  // 시간차 편집 시 시간 복원
  if (record.type === 'time_leave' && record.startTime && record.endTime) {
    document.getElementById('lvStartTime').value = record.startTime;
    document.getElementById('lvEndTime').value = record.endTime;
  }

  const [y, m, d] = record.startDate.split('-').map(Number);
  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dow = new Date(y, m - 1, d).getDay();
  document.getElementById('lvPanelDate').textContent = `${m}월 ${d}일 (${dowNames[dow]})`;

  onLvTypeChange();
  previewLvCalc();

  // 바텀시트 열기
  openLvBottomSheet();
}

function deleteLvRecord() {
  const id = document.getElementById('lvEditId').value;
  if (!id) return;
  // confirm 없이 즉시 삭제 (confirm이 환경에 따라 블록될 수 있음 — 초과근무 삭제와 동일 패턴)
  LEAVE.deleteRecord(id);
  closeLvBottomSheet();
  refreshLvCalendar();
}

function renderLvStats(year) {
  const summary = LEAVE.calcAnnualSummary(year, lvTotalAnnual);
  const el = document.getElementById('lvRecordCount');
  if (el) el.textContent = summary.recordCount + '건';
}

function renderLvQuotaTable(year) {
  const container = document.getElementById('lvQuotaTable');
  if (!container) return;

  const quotas = LEAVE.calcQuotaSummary(year, lvTotalAnnual);
  if (quotas.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:12px;">프로필 저장 후 확인 가능</p>';
    return;
  }

  // 컴팩트 2열 그리드 (미니 프로그레스 바 포함)
  let html = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">';
  quotas.forEach(q => {
    let pct = 0;
    let remainText = '-';
    let quotaText = '-';

    if (q.quota !== null) {
      pct = q.quota > 0 ? Math.min(100, Math.round((q.used / q.quota) * 100)) : 0;
      remainText = `${q.remaining}일`;
      quotaText = `${q.quota}일`;
    } else {
      pct = 100; // 한도 없는 경우 막대를 꽉 채우거나 마음대로
      remainText = `제한없음`;
    }

    const barColor = q.overQuota ? 'var(--accent-rose)' : 'var(--accent-emerald)';
    const remainColor = q.overQuota ? 'var(--accent-rose)' : (q.quota !== null ? 'var(--accent-emerald)' : 'var(--text-muted)');

    html += `<div style="padding:8px 10px; border-radius:8px; background:var(--bg-glass); border:1px solid var(--border-glass);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-weight:600; font-size:var(--text-body-large);">${q.label}</span>
        <span style="font-size:var(--text-body-normal); font-weight:700; color:${remainColor};">${remainText}</span>
      </div>
      <div class="lv-progress-bar" style="margin-bottom:3px; display:${q.quota !== null ? 'block' : 'none'};">
        <div class="lv-progress-fill" style="width:${pct}%; height:100%; background:${barColor}"></div>
      </div>
      <div style="font-size:var(--text-body-normal); color:var(--text-muted);">${q.used}${q.quota !== null ? '/' + quotaText : '일'} 사용 ${q.overQuota ? '⚠️' : ''}</div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderLvRecordList(year) {
  const container = document.getElementById('lvRecordList');
  if (!container) return;

  // 연도 표시 업데이트
  const yearEl = document.getElementById('lvRecordYear');
  if (yearEl) yearEl.textContent = year;

  const records = LEAVE.getYearRecords(year);
  if (records.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:24px;">캘린더에서 날짜를 클릭하여 휴가를 등록하세요.</p>';
    const extra = document.getElementById('lvQuotaExtra');
    if (extra) extra.innerHTML = '';
    return;
  }

  const sorted = [...records].sort((a, b) => a.startDate.localeCompare(b.startDate));

  // ── 통계 계산 ──
  let totalDays = 0, paidDays = 0, unpaidDays = 0, totalDeduction = 0;
  const byCategory = {};
  const byMonth = {};

  sorted.forEach(r => {
    const days = r.days || 0;
    totalDays += days;
    if (r.isPaid) paidDays += days; else unpaidDays += days;
    if (r.salaryImpact) totalDeduction += Math.abs(r.salaryImpact);

    const typeInfo = LEAVE.getTypeById(r.type);
    const cat = typeInfo ? typeInfo.label : r.type;
    byCategory[cat] = (byCategory[cat] || 0) + days;

    const m = parseInt(r.startDate.split('-')[1]);
    byMonth[m] = (byMonth[m] || 0) + days;
  });

  let html = '';

  // ── 요약 카드 ──
  const round1 = v => Math.round(v);
  html += `<div class="lv-stats-grid">
    <div class="lv-stat-card">
      <div class="lv-stat-num">${round1(totalDays)}</div>
      <div class="lv-stat-label">총 사용일</div>
    </div>
    <div class="lv-stat-card">
      <div class="lv-stat-num" style="color:var(--accent-emerald)">${round1(paidDays)}</div>
      <div class="lv-stat-label">유급</div>
    </div>
    <div class="lv-stat-card">
      <div class="lv-stat-num" style="color:var(--accent-rose)">${round1(unpaidDays)}</div>
      <div class="lv-stat-label">무급</div>
    </div>
    <div class="lv-stat-card">
      <div class="lv-stat-num" style="color:var(--accent-rose)">${totalDeduction > 0 ? '-₩' + totalDeduction.toLocaleString() : '₩0'}</div>
      <div class="lv-stat-label">급여 차감</div>
    </div>
  </div>`;

  container.innerHTML = html;

  // ── 월별사용 + 상세기록 → lvQuotaExtra로 이동 ──
  const extraContainer = document.getElementById('lvQuotaExtra');
  if (!extraContainer) return;
  let extraHtml = '';

  // ── 월별 바 차트 (반기 2줄) ──
  const maxMonthDays = Math.max(...Object.values(byMonth), 1);
  extraHtml += '<div style="margin:12px 0 8px; font-size:var(--text-body-normal); font-weight:600; color:var(--text-muted);">월별 사용</div>';
  extraHtml += '<div class="lv-month-bars">';
  for (let m = 1; m <= 12; m++) {
    const d = byMonth[m] || 0;
    const pct = Math.round((d / maxMonthDays) * 100);
    const isCurrentMonth = (m === lvCurrentMonth && year === lvCurrentYear);
    const valInside = pct >= 25 && d > 0;
    extraHtml += `<div class="lv-month-bar${isCurrentMonth ? ' current' : ''}">
      ${d > 0 && !valInside ? `<span class="lv-month-bar-val above">${round1(d)}</span>` : ''}
      <div class="lv-month-bar-fill" style="height:${Math.max(pct, d > 0 ? 10 : 0)}%">
        ${valInside ? `<span class="lv-month-bar-val">${round1(d)}</span>` : ''}
      </div>
      <span class="lv-month-bar-label">${m}월</span>
    </div>`;
  }
  extraHtml += '</div>';

  // ── 상세 기록 (유형별 그룹, 접이식) ──
  // 유형별로 그룹핑
  const grouped = {};
  sorted.forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  extraHtml += `<div style="margin-top:12px;">
    <div class="collapsible-header" onclick="toggleCollapsible('lvRecordDetail')">
      <span style="display:flex; align-items:center; gap:8px;"><span class="toggle-icon">▸</span> 상세 기록 (${sorted.length}건)</span>
    </div>
    <div class="collapsible-body" id="lvRecordDetail" style="display:none; max-height:400px; overflow-y:auto;">
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">`;

  Object.entries(grouped).forEach(([type, records]) => {
    const typeInfo = LEAVE.getTypeById(type);
    const label = typeInfo ? typeInfo.label : type;
    const isPaid = records[0].isPaid;
    const totalDaysGroup = records.reduce((s, r) => s + (r.days || 0), 0);
    const totalHoursGroup = type === 'time_leave' ? records.reduce((s, r) => s + (r.hours || 0), 0) : 0;
    const totalImpact = records.reduce((s, r) => s + (r.salaryImpact ? Math.abs(r.salaryImpact) : 0), 0);

    // 시간차: 총 시간 + 연차 환산일 표시
    const daysDisplay = type === 'time_leave'
      ? `${totalHoursGroup}h = 연차 ${Math.round(totalDaysGroup * 10) / 10}일`
      : `${Math.round(totalDaysGroup)}일`;

    extraHtml += `<div class="lv-record-item" style="flex-direction:column; align-items:stretch; gap:4px; cursor:default; padding:6px 10px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="lv-record-type ${isPaid ? 'paid' : 'unpaid'}">${label}</span>
        <span style="font-size:var(--text-body-normal); font-weight:700; color:${totalImpact ? 'var(--accent-rose)' : 'var(--accent-emerald)'}">
          ${totalImpact ? '-₩' + totalImpact.toLocaleString() : '유급'} · ${daysDisplay}
        </span>
      </div>
      <div style="display:flex; flex-direction:column; gap:1px; padding-left:4px; max-height:calc(var(--text-body-normal, 14px) * 4.8); overflow-y:auto;">`;

    records.forEach(r => {
      const dateDisplay = r.startDate === r.endDate
        ? r.startDate.substring(5)
        : r.startDate.substring(5) + ' ~ ' + r.endDate.substring(5);
      let detail = `${dateDisplay} ${Math.round(r.days || 0)}일`;
      if (r.type === 'time_leave' && r.hours) {
        const tlDays = Math.round((r.hours / 8) * 10) / 10;
        detail = `${dateDisplay} ${r.startTime || ''}~${r.endTime || ''} (${r.hours}h = ${tlDays}일)`;
      }
      extraHtml += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:var(--text-body-normal); color:var(--text-secondary); cursor:pointer; padding:1px 0;" onclick="editLvRecord('${r.id}')">
        <span>${detail}${r.memo ? ' <span style="color:var(--text-muted)">' + escapeHtml(r.memo) + '</span>' : ''}</span>
      </div>`;
    });

    extraHtml += `</div></div>`;
  });

  extraHtml += '</div></div></div>';

  extraContainer.innerHTML = extraHtml;
}

function exportLvData() {
  const json = LEAVE.exportData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leave_records_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  const _msg = document.getElementById('lvExportMsg'); if (_msg) _msg.textContent = '✅ 내보내기 완료';
}

function importLvData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = LEAVE.importData(e.target.result);
    const _msg = document.getElementById('lvExportMsg'); if (_msg) _msg.textContent = result.message;
    if (result.success) refreshLvCalendar();
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ============================================
// 📋 역계산 검증 (verifyPayslip)
// ============================================

/**
 * 명세서 파싱 결과와 CALC 계산값을 비교하여 불일치 항목을 화면에 표시
 * @param {object} parsedData - 파싱된 명세서 { items:[{name,amount}], totalGross }
 * @param {object} calcResult - CALC 계산 결과 { items:[{name,amount}], totalGross }
 */
function renderPayslipVerifyResult(parsedData, calcResult) {
  const container = document.getElementById('payslip-verify-result');
  if (!container) return;

  const result = CALC.verifyPayslip(parsedData, calcResult, { tolerance: 0.01, absThreshold: 500 });

  const summaryEl = document.createElement('div');
  summaryEl.className = result.matched ? 'verify-summary-ok' : 'verify-summary-error';
  summaryEl.textContent = result.matched
    ? '✅ 명세서와 계산값 일치 (오차 1% 이내)'
    : `🔴 불일치 ${result.discrepancies.length}건 발견`;
  container.replaceChildren(summaryEl);

  if (result.discrepancies.length === 0) return;

  const table = document.createElement('table');
  table.className = 'verify-table';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  ['항목', '명세서', '계산값', '오차율', '상태'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const d of result.discrepancies) {
    const tr = document.createElement('tr');
    tr.className = 'verify-row-mismatch';
    const pctStr = d.diffPct < 1 ? (d.diffPct * 100).toFixed(1) + '%' : '항목없음';
    const expStr = d.expected !== null ? d.expected.toLocaleString('ko-KR') + '원' : '(없음)';
    const actStr = d.actual !== null ? d.actual.toLocaleString('ko-KR') + '원' : '(없음)';
    [d.item, actStr, expStr, pctStr, '🔴 불일치'].forEach(text => {
      const td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}

// ============================================
// 🎓 튜토리얼 → tutorial.html 로 분리됨
// ============================================
function startTutorial() {
  window.location.href = './tutorial.html';
}


