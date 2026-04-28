// payslip-tab.js — 급여명세서 렌더링 + 관리
// Phase 5: cross-module 명시 named import
import { CALC } from '@snuhmate/calculators';
import { DATA } from '@snuhmate/data';
import { PROFILE } from '@snuhmate/profile/profile';
import { SALARY_PARSER } from './salary-parser.js';

function renderPayslip(data, ym, profileUpdated, stableRes) {
  const resultEl = document.getElementById('payslipResult');
  const fmt = n => n != null && n !== 0 ? n.toLocaleString() + '원' : '-';
  const info = data.employeeInfo;
  const meta = data.metadata;
  const typeLabel = ym.type && ym.type !== '급여' ? ` (${ym.type})` : '';

  let html = `
    <div style="margin-bottom:12px; padding:10px 12px; background:var(--bg-hover); border-radius:8px; font-size:var(--text-body-normal); color:var(--text-muted);">
      <strong style="color:var(--text-primary);">${ym.year}년 ${ym.month}월 급여명세서${typeLabel}</strong>
      ${info.name ? `· ${info.name}` : ''}
      ${info.jobType ? `· ${info.jobType}` : ''}
      ${info.payGrade ? `· ${info.payGrade}` : ''}
      ${meta.payDate ? `<br>지급일: ${meta.payDate}` : ''}
    </div>`;

  if (profileUpdated && stableRes && stableRes.applied && stableRes.applied.length > 0) {
    const warnings = stableRes.applied.filter(a => a.note && a.note.startsWith('⚠️'));
    const normals = stableRes.applied.filter(a => !a.note || !a.note.startsWith('⚠️'));
    if (normals.length > 0) {
      const details = normals.map(a => `${a.name}${a.note ? ` (${a.note})` : ''}`).join(', ');
      html += `<div class="warning-box" style="border-color:var(--accent-emerald); margin-bottom:8px;">✅ 자동 반영: ${details}</div>`;
    }
    warnings.forEach(w => {
      html += `<div class="warning-box" style="border-color:var(--accent-amber); margin-bottom:8px;">${w.note}</div>`;
    });
  } else if (profileUpdated) {
    html += `<div class="warning-box" style="border-color:var(--accent-emerald); margin-bottom:8px;">✅ 조정급 등 변경되지 않는 항목을 내 정보에 자동 반영했습니다.</div>`;
  }

  // 파싱 신뢰도 경고
  if (data._parseInfo) {
    const pi = data._parseInfo;
    if (pi.confidence < 70) {
      html += `<div class="warning-box" style="border-color:var(--accent-amber); margin-bottom:8px;">⚠️ 파싱 정확도가 낮습니다 (${pi.confidence}/100). 항목과 금액을 직접 확인해주세요.${pi.method === 'textFallback' ? ' (텍스트 폴백 모드)' : ''}</div>`;
    }
    if (Math.abs(pi.grossDiff || 0) > 1 || Math.abs(pi.deductionDiff || 0) > 1) {
      const details = [];
      if (Math.abs(pi.grossDiff || 0) > 1) details.push('지급 ' + (pi.grossDiff > 0 ? '+' : '') + pi.grossDiff.toLocaleString() + '원');
      if (Math.abs(pi.deductionDiff || 0) > 1) details.push('공제 ' + (pi.deductionDiff > 0 ? '+' : '') + pi.deductionDiff.toLocaleString() + '원');
      html += `<div class="warning-box" style="border-color:var(--accent-rose); margin-bottom:8px;">❌ 항목 합산과 총액이 불일치합니다 (${details.join(', ')})</div>`;
    }
  }

  // 지급 내역 테이블
  html += `<p style="font-size:var(--text-body-normal); color:var(--accent-indigo); font-weight:600; margin:12px 0 6px;">▸ 지급 내역</p>`;
  html += `<div style="display:flex; flex-direction:column; gap:4px;">`;
  data.salaryItems.forEach(item => {
    html += `<div class="result-row"><span class="key">${item.name}</span><span class="val">${fmt(item.amount)}</span></div>`;
  });
  html += `</div>`;

  // 공제 내역
  if (data.deductionItems.length > 0) {
    html += `<p style="font-size:var(--text-body-normal); color:var(--accent-rose); font-weight:600; margin:12px 0 6px;">▸ 공제 내역</p>`;
    html += `<div style="display:flex; flex-direction:column; gap:4px;">`;
    data.deductionItems.forEach(item => {
      html += `<div class="result-row"><span class="key">${item.name}</span><span class="val" style="color:var(--accent-rose);">${fmt(item.amount)}</span></div>`;
    });
    html += `</div>`;
  }

  // 근무 현황 (workStats)
  const ws = (data.workStats || []);
  if (ws.length > 0) {
    const fmtStat = (name, value) => {
      if (/횟수/.test(name)) return value + '회';
      if (/연차|휴일|근로일수/.test(name)) return value + '일';
      return value + 'h';
    };
    const nonZero = ws.filter(i => i.value !== 0);
    html += `<p style="font-size:var(--text-body-normal); color:var(--accent-amber); font-weight:600; margin:12px 0 6px;">▸ 근무 현황</p>`;
    html += `<div style="display:flex; flex-direction:column; gap:4px;">`;
    ws.forEach(item => {
      const dim = item.value === 0 ? ' style="opacity:0.45;"' : '';
      html += `<div class="result-row"${dim}><span class="key">${item.name}</span><span class="val">${fmtStat(item.name, item.value)}</span></div>`;
    });
    html += `</div>`;
  }

  // 합계
  html += `
    <div class="result-box" style="margin-top:12px;">
      <div class="result-row"><span class="key">급여총액</span><span class="val green">${fmt(data.summary.grossPay)}</span></div>
      <div class="result-row"><span class="key">공제총액</span><span class="val" style="color:var(--accent-rose);">${fmt(data.summary.totalDeduction)}</span></div>
      <div class="result-row" style="border-top:1px solid var(--border-glass); padding-top:8px; margin-top:4px;">
        <span class="key" style="font-weight:700;">실지급액</span>
        <span class="val" style="font-size:var(--text-body-large); font-weight:700;">${fmt(data.summary.netPay)}</span>
      </div>
    </div>
    <button class="btn btn-secondary btn-full" style="margin-top:12px;" data-action="showVerifyInQna">✅ 앱 계산값과 비교하기</button>
  `;
  resultEl.innerHTML = html;
}

function showVerifyInQna() {
  switchPayrollSubTab('salary-qna');
  const verifyCard = document.getElementById('verifyCard');
  if (verifyCard) verifyCard.style.display = '';
}

function renderVerification(data) {
  const verifyEl = document.getElementById('verifyResult');
  if (!verifyEl) return;
  // 검증 데이터가 있으면 카드 표시
  const verifyCard = document.getElementById('verifyCard');
  if (verifyCard) verifyCard.style.display = '';
  const comparison = SALARY_PARSER.compareWithApp(data);

  if (!comparison) {
    verifyEl.innerHTML = `<div class="warning-box">⚠️ 비교하려면 먼저 <strong>개인정보 탭</strong>에서 내 정보를 저장해주세요.</div>`;
    return;
  }

  const fmt = n => n != null ? n.toLocaleString() + '원' : '-';
  let html = `<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:var(--text-body-normal);">
    <thead>
      <tr style="background:var(--bg-hover); color:var(--text-muted);">
        <th style="padding:8px 6px; text-align:left;">항목</th>
        <th style="padding:8px 6px; text-align:right;">명세서</th>
        <th style="padding:8px 6px; text-align:right;">앱 계산</th>
        <th style="padding:8px 6px; text-align:right;">차이</th>
      </tr>
    </thead><tbody>`;

  comparison.comparison.forEach(row => {
    const diff = row.diff;
    const diffStr = diff !== null ? (diff === 0 ? '✅ 일치' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`) : '-';
    const diffColor = diff === null ? 'var(--text-muted)' : diff === 0 ? 'var(--accent-emerald)' : 'var(--accent-amber)';
    const rowStyle = row.isTotal ? 'border-top:2px solid var(--border-glass); font-weight:700;' : '';
    html += `<tr style="${rowStyle}">
      <td style="padding:7px 6px; color:var(--text-primary);">${row.name}</td>
      <td style="padding:7px 6px; text-align:right; color:var(--text-primary);">${fmt(row.payslip)}</td>
      <td style="padding:7px 6px; text-align:right; color:var(--text-muted);">${fmt(row.app)}</td>
      <td style="padding:7px 6px; text-align:right; color:${diffColor}; font-weight:600;">${diffStr}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;

  // 차이 있는 항목 안내
  const mismatches = comparison.comparison.filter(r => r.diff !== null && r.diff !== 0 && !r.isTotal);
  if (mismatches.length > 0) {
    html += `<div class="warning-box" style="margin-top:12px;">
      ⚠️ <strong>차이가 발생한 항목 ${mismatches.length}개:</strong><br>
      ${mismatches.map(r => `${r.name}: ${(r.diff > 0 ? '+' : '')}${r.diff.toLocaleString()}원`).join('<br>')}
      <br><br>💡 <strong>개인정보</strong> 탭에서 조정급·직책급 등을 실제 명세서 금액으로 수정하면 오차가 줄어듭니다.
    </div>`;
  }
  verifyEl.innerHTML = html;
}

// renderSavedMonths — legacy 호환
function renderSavedMonths() { renderPayslipMgmt(); }

// ── 급여명세서 조회 뷰: 통계 + 월별 카드 ──
function renderPayslipMgmt() {
  const statsEl = document.getElementById('payslipStats');
  const listEl = document.getElementById('payslipMgmtView');
  if (!statsEl || !listEl) return;

  const months = SALARY_PARSER.listSavedMonths(); // newest first

  // ── 데이터 없음 ──
  if (months.length === 0) {
    statsEl.textContent = '';
    listEl.textContent = '';
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'text-align:center; padding:32px 16px;';
    const icon = document.createElement('p');
    icon.style.cssText = 'font-size:1.5rem; margin-bottom:8px;';
    icon.textContent = '📭';
    card.appendChild(icon);
    const p1 = document.createElement('p');
    p1.style.cssText = 'color:var(--text-muted); font-size:var(--text-body-normal);';
    p1.textContent = '저장된 급여명세서가 없습니다.';
    card.appendChild(p1);
    const p2 = document.createElement('p');
    p2.style.cssText = 'color:var(--text-muted); font-size:var(--text-body-small); margin-top:4px;';
    p2.textContent = 'info 탭에서 급여명세서를 등록해주세요.';
    card.appendChild(p2);
    const goBtn = document.createElement('button');
    goBtn.className = 'btn btn-primary';
    goBtn.style.cssText = 'margin-top:12px;';
    goBtn.textContent = '👤 info 탭으로 이동';
    goBtn.addEventListener('click', () => switchTab('profile'));
    card.appendChild(goBtn);
    listEl.appendChild(card);
    return;
  }

  // ── 모든 월 데이터 로드 ──
  const allData = months.map(m => {
    const d = SALARY_PARSER.loadMonthlyData(m.year, m.month, m.type);
    return { year: m.year, month: m.month, type: m.type || '급여', data: d };
  }).filter(m => m.data);

  const fmt = n => n != null && n !== 0 ? n.toLocaleString() + '원' : '-';
  const fmtSign = n => {
    if (n == null || n === 0) return '-';
    const prefix = n > 0 ? '+' : '';
    return prefix + n.toLocaleString() + '원';
  };

  // ── 통계 카드 렌더 ──
  renderPayslipStats(statsEl, allData, fmt, fmtSign);

  // ── 월별 카드 목록 (접이식) ──
  listEl.textContent = '';
  allData.forEach(({ year, month, type, data }, idx) => {
    const cardId = `payslipCard_${year}_${month}_${type}`;
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '12px';

    // 카드 헤더 (항상 보임 — 월, 실지급액 요약)
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; cursor:pointer; padding:4px 0;';
    header.addEventListener('click', () => {
      const body = document.getElementById(cardId);
      if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
      const icon = header.querySelector('.toggle-icon');
      if (icon) icon.textContent = body.style.display === 'none' ? '▸' : '▾';
    });

    const left = document.createElement('div');
    left.style.cssText = 'display:flex; align-items:center; gap:8px;';
    const toggle = document.createElement('span');
    toggle.className = 'toggle-icon';
    toggle.style.cssText = 'font-size:var(--text-body-normal); color:var(--text-muted);';
    toggle.textContent = '▸';
    left.appendChild(toggle);
    const monthLabel = document.createElement('span');
    monthLabel.style.cssText = 'font-weight:700; font-size:var(--text-body-large);';
    const typeLabel = type !== '급여' ? ` (${type})` : '';
    monthLabel.textContent = `${year}년 ${month}월${typeLabel}`;
    left.appendChild(monthLabel);
    header.appendChild(left);

    const right = document.createElement('div');
    right.style.cssText = 'text-align:right; display:flex; flex-direction:column; gap:2px;';
    // 지급 합계
    const grossRow = document.createElement('div');
    grossRow.style.cssText = 'font-size:var(--text-body-small); color:var(--text-muted);';
    const grossLabel = document.createTextNode('지급 ');
    const grossVal = document.createElement('b');
    grossVal.style.color = 'var(--accent-indigo)';
    grossVal.textContent = fmt(data.summary?.grossPay || 0);
    grossRow.appendChild(grossLabel);
    grossRow.appendChild(grossVal);
    right.appendChild(grossRow);
    // 공제 합계
    const dedRow = document.createElement('div');
    dedRow.style.cssText = 'font-size:var(--text-body-small); color:var(--text-muted);';
    const dedLabel = document.createTextNode('공제 ');
    const dedVal = document.createElement('b');
    dedVal.style.color = 'var(--accent-rose)';
    dedVal.textContent = '-' + fmt(data.summary?.totalDeduction || 0);
    dedRow.appendChild(dedLabel);
    dedRow.appendChild(dedVal);
    right.appendChild(dedRow);
    // 실지급액
    const netRow2 = document.createElement('div');
    netRow2.style.cssText = 'font-weight:700; font-size:var(--text-body-large); color:var(--text-primary); border-top:1px solid var(--border-glass); padding-top:2px; margin-top:1px;';
    netRow2.textContent = fmt(data.summary?.netPay || 0);
    right.appendChild(netRow2);
    header.appendChild(right);
    card.appendChild(header);

    // 카드 바디 (접이식 — 첫 번째만 펼침)
    const body = document.createElement('div');
    body.id = cardId;
    body.style.display = 'none';
    body.style.cssText += ';margin-top:12px; border-top:1px solid var(--border-glass); padding-top:12px;';

    // 지급 내역
    if (data.salaryItems && data.salaryItems.length > 0) {
      const salLabel = document.createElement('p');
      salLabel.style.cssText = 'font-size:var(--text-body-normal); color:var(--accent-indigo); font-weight:600; margin:0 0 6px;';
      salLabel.textContent = '▸ 지급 내역';
      body.appendChild(salLabel);
      data.salaryItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'result-row';
        const k = document.createElement('span');
        k.className = 'key';
        k.textContent = item.name;
        const v = document.createElement('span');
        v.className = 'val';
        v.textContent = fmt(item.amount);
        row.appendChild(k);
        row.appendChild(v);
        body.appendChild(row);
      });
      const totalRow = document.createElement('div');
      totalRow.className = 'result-row';
      totalRow.style.cssText = 'border-top:1px solid var(--border); margin-top:6px; padding-top:6px; font-weight:700;';
      const tk = document.createElement('span');
      tk.className = 'key';
      tk.textContent = '급여총액';
      const tv = document.createElement('span');
      tv.className = 'val';
      tv.style.color = 'var(--accent-indigo)';
      tv.textContent = fmt(data.summary?.grossPay || 0);
      totalRow.appendChild(tk);
      totalRow.appendChild(tv);
      body.appendChild(totalRow);
    }

    // 공제 내역
    if (data.deductionItems && data.deductionItems.length > 0) {
      const dedLabel = document.createElement('p');
      dedLabel.style.cssText = 'font-size:var(--text-body-normal); color:var(--accent-rose); font-weight:600; margin:12px 0 6px;';
      dedLabel.textContent = '▸ 공제 내역';
      body.appendChild(dedLabel);
      data.deductionItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'result-row';
        const k = document.createElement('span');
        k.className = 'key';
        k.textContent = item.name;
        const v = document.createElement('span');
        v.className = 'val';
        v.style.color = 'var(--accent-rose)';
        v.textContent = fmt(item.amount);
        row.appendChild(k);
        row.appendChild(v);
        body.appendChild(row);
      });
      const dedTotal = document.createElement('div');
      dedTotal.className = 'result-row';
      dedTotal.style.cssText = 'border-top:1px solid var(--border); margin-top:6px; padding-top:6px; font-weight:700;';
      const dk = document.createElement('span');
      dk.className = 'key';
      dk.textContent = '공제총액';
      const dv = document.createElement('span');
      dv.className = 'val';
      dv.style.color = 'var(--accent-rose)';
      dv.textContent = fmt(data.summary?.totalDeduction || 0);
      dedTotal.appendChild(dk);
      dedTotal.appendChild(dv);
      body.appendChild(dedTotal);
    }

    // ── 실지급액 요약 ──
    if (data.summary?.netPay) {
      const netRow = document.createElement('div');
      netRow.className = 'result-row';
      netRow.style.cssText = 'border-top:2px solid var(--border); margin-top:10px; padding-top:10px; font-weight:700; font-size:var(--text-body-large);';
      const nk = document.createElement('span');
      nk.className = 'key';
      nk.textContent = '실지급액';
      const nv = document.createElement('span');
      nv.className = 'val';
      nv.style.color = 'var(--text-primary)';
      nv.textContent = fmt(data.summary.netPay);
      netRow.appendChild(nk);
      netRow.appendChild(nv);
      body.appendChild(netRow);
    }

    // ── 통상임금 검증 섹션 ──
    renderPayslipVerification(body, data);

    // ── 수당 분석 (리버스엔지니어링) 섹션 ──
    renderOvertimeAnalysis(body, data);

    // 삭제 버튼
    const delWrap = document.createElement('div');
    delWrap.style.cssText = 'margin-top:12px; text-align:right;';
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-outline';
    delBtn.style.cssText = 'font-size:var(--text-body-small); padding:4px 10px; color:var(--accent-rose); border-color:var(--accent-rose);';
    delBtn.textContent = '🗑 삭제';
    delBtn.addEventListener('click', () => deletePayslipMonth(year, month, type));
    delWrap.appendChild(delBtn);
    body.appendChild(delWrap);

    card.appendChild(body);
    listEl.appendChild(card);
  });
}

// ── 통계 카드 ──
function renderPayslipStats(el, allData, fmt, fmtSign) {
  el.textContent = '';
  if (allData.length === 0) return;

  const card = document.createElement('div');
  card.className = 'card';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.style.fontSize = 'var(--text-body-large)';
  const titleIcon = document.createElement('span');
  titleIcon.className = 'icon';
  titleIcon.style.color = 'var(--accent-violet)';
  titleIcon.textContent = '📊';
  title.appendChild(titleIcon);
  title.appendChild(document.createTextNode(' 급여 통계'));
  card.appendChild(title);

  const nets = allData.map(d => d.data.summary?.netPay || 0);
  const grosses = allData.map(d => d.data.summary?.grossPay || 0);
  const deductions = allData.map(d => d.data.summary?.totalDeduction || 0);
  const latestNet = nets[0];
  const avgNet = Math.round(nets.reduce((a, b) => a + b, 0) / nets.length);
  const maxNet = Math.max(...nets);
  const minNet = Math.min(...nets);
  const avgGross = Math.round(grosses.reduce((a, b) => a + b, 0) / grosses.length);
  const avgDed = Math.round(deductions.reduce((a, b) => a + b, 0) / deductions.length);

  // 전월 대비
  const prevNet = nets.length > 1 ? nets[1] : null;
  const diff = prevNet != null ? latestNet - prevNet : null;

  // 기간 표시
  const oldest = allData[allData.length - 1];
  const newest = allData[0];
  const periodText = allData.length === 1
    ? `${newest.year}년 ${newest.month}월`
    : `${oldest.year}년 ${oldest.month}월 ~ ${newest.year}년 ${newest.month}월 (${allData.length}개월)`;
  const periodEl = document.createElement('p');
  periodEl.style.cssText = 'font-size:var(--text-body-small); color:var(--text-muted); margin-bottom:12px;';
  periodEl.textContent = periodText;
  card.appendChild(periodEl);

  // 주요 지표 그리드
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;';

  const addStat = (label, value, color, sub) => {
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-hover); border-radius:10px; padding:12px;';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:var(--text-body-small); color:var(--text-muted); margin-bottom:4px;';
    lbl.textContent = label;
    box.appendChild(lbl);
    const val = document.createElement('div');
    val.style.cssText = `font-weight:700; font-size:var(--text-body-large); color:${color || 'var(--text-primary)'};`;
    val.textContent = value;
    box.appendChild(val);
    if (sub) {
      const s = document.createElement('div');
      s.style.cssText = 'font-size:var(--text-body-small); color:var(--text-muted); margin-top:2px;';
      s.textContent = sub;
      box.appendChild(s);
    }
    grid.appendChild(box);
  };

  addStat('최근 실지급액', fmt(latestNet), 'var(--text-primary)',
    diff != null ? `전월 대비 ${fmtSign(diff)}` : null);
  addStat('평균 실지급액', fmt(avgNet), 'var(--accent-indigo)');
  addStat('평균 급여총액', fmt(avgGross), 'var(--accent-emerald)');
  addStat('평균 공제총액', fmt(avgDed), 'var(--accent-rose)');

  if (allData.length > 1) {
    addStat('최고 실지급액', fmt(maxNet), 'var(--accent-amber)',
      `${allData.find((_, i) => nets[i] === maxNet).year}년 ${allData.find((_, i) => nets[i] === maxNet).month}월`);
    addStat('최저 실지급액', fmt(minNet), 'var(--text-muted)',
      `${allData.find((_, i) => nets[i] === minNet).year}년 ${allData.find((_, i) => nets[i] === minNet).month}월`);
  }
  card.appendChild(grid);

  // 월별 실지급액 추이 (바 차트 — 최근 12개월)
  if (allData.length > 1) {
    const chartLabel = document.createElement('p');
    chartLabel.style.cssText = 'font-size:var(--text-body-normal); font-weight:600; margin:8px 0 8px; color:var(--text-primary);';
    chartLabel.textContent = '▸ 월별 실지급액 추이';
    card.appendChild(chartLabel);

    const chartData = allData.slice(0, 12).reverse(); // oldest first for chart
    const chartMax = Math.max(...chartData.map(d => d.data.summary?.netPay || 0));

    const chart = document.createElement('div');
    chart.style.cssText = 'display:flex; align-items:flex-end; gap:4px; height:120px; padding:0 4px;';

    chartData.forEach(d => {
      const net = d.data.summary?.netPay || 0;
      const pct = chartMax > 0 ? (net / chartMax * 100) : 0;

      const col = document.createElement('div');
      col.style.cssText = 'flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; min-width:0;';

      const bar = document.createElement('div');
      bar.style.cssText = `width:100%; max-width:32px; height:${Math.max(4, pct)}%; background:var(--accent-indigo); border-radius:4px 4px 0 0; transition:height 0.3s; min-height:4px;`;
      bar.title = `${d.year}년 ${d.month}월: ${fmt(net)}`;
      col.appendChild(bar);

      const label = document.createElement('div');
      label.style.cssText = 'font-size:0.6rem; color:var(--text-muted); white-space:nowrap;';
      label.textContent = `${d.month}월`;
      col.appendChild(label);

      chart.appendChild(col);
    });
    card.appendChild(chart);

    // 공제율 표시
    const dedRate = avgGross > 0 ? ((avgDed / avgGross) * 100).toFixed(1) : 0;
    const rateRow = document.createElement('div');
    rateRow.style.cssText = 'margin-top:12px; padding:8px 12px; background:var(--bg-hover); border-radius:8px; font-size:var(--text-body-normal); color:var(--text-muted);';
    rateRow.textContent = `평균 공제율: ${dedRate}% (급여총액 대비 공제총액)`;
    card.appendChild(rateRow);
  }

  el.appendChild(card);
}

// ── 통상임금 검증 섹션 ──
function renderPayslipVerification(container, data) {
  const profile = PROFILE.load();
  if (!profile || !profile.jobType || !profile.grade) return;
  if (!data.salaryItems || data.salaryItems.length === 0) return;

  const serviceYears = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
  const appWage = CALC.calcOrdinaryWage(
    profile.jobType, profile.grade, parseInt(profile.year) || 1,
    {
      hasMilitary: profile.hasMilitary,
      hasSeniority: profile.hasSeniority,
      seniorityYears: profile.hasSeniority ? serviceYears : 0,
      longServiceYears: serviceYears,
      adjustPay: parseInt(profile.adjustPay) || 0,
      upgradeAdjustPay: parseInt(profile.upgradeAdjustPay) || 0,
      specialPayAmount: parseInt(profile.specialPay) || 0,
      positionPay: parseInt(profile.positionPay) || 0,
      workSupportPay: parseInt(profile.workSupportPay) || 0,
      weeklyHours: parseInt(profile.weeklyHours) || 209,
    }
  );
  if (!appWage) return;

  const fmt = n => n != null ? n.toLocaleString() + '원' : '-';

  // 명세서 항목을 이름→금액 맵으로
  const payslipMap = {};
  data.salaryItems.forEach(item => { payslipMap[item.name] = item.amount; });

  // 비교 대상: breakdown 항목 중 0이 아닌 것 + 명세서에만 있는 것
  const rows = [];
  let hasAlert = false;

  Object.entries(appWage.breakdown).forEach(([name, appVal]) => {
    const payVal = payslipMap[name] ?? null;
    const diff = payVal !== null ? payVal - appVal : null;
    const alert = diff !== null && Math.abs(diff) >= 10;
    if (alert) hasAlert = true;
    rows.push({ name, app: appVal, payslip: payVal, diff, alert });
  });

  // 통상임금 합계: 명세서 항목 중 통상임금(breakdown)에 해당하는 것만 합산
  const ordinaryNames = new Set(Object.keys(appWage.breakdown));
  let payslipOrdinarySum = 0;
  data.salaryItems.forEach(item => {
    if (ordinaryNames.has(item.name)) payslipOrdinarySum += item.amount;
  });
  const totalDiff = payslipOrdinarySum - appWage.monthlyWage;
  const totalAlert = Math.abs(totalDiff) >= 10;
  if (totalAlert) hasAlert = true;

  // 섹션 헤더
  const section = document.createElement('div');
  section.style.cssText = 'margin-top:16px; border-top:1px solid var(--border-glass); padding-top:12px;';

  const label = document.createElement('p');
  label.style.cssText = 'font-size:var(--text-body-normal); color:var(--accent-violet); font-weight:600; margin:0 0 8px; cursor:pointer;';
  label.textContent = hasAlert
    ? '⚠️ 통상임금 검증 (차이 발견)'
    : '✅ 통상임금 검증';
  label.style.color = 'var(--accent-emerald)';

  const detail = document.createElement('div');
  detail.style.display = 'none';
  label.addEventListener('click', () => {
    detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
  });
  section.appendChild(label);

  // 테이블 헤더
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:4px; font-size:0.7rem; color:var(--text-muted); padding:4px 0; border-bottom:1px solid var(--border-glass);';
  ['항목', '앱 계산', '명세서', '차이'].forEach(t => {
    const c = document.createElement('span');
    c.textContent = t;
    if (t !== '항목') c.style.textAlign = 'right';
    hdr.appendChild(c);
  });
  detail.appendChild(hdr);

  rows.forEach(r => {
    if (r.app === 0 && r.payslip === null) return; // 둘다 없으면 스킵
    const row = document.createElement('div');
    row.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:4px; font-size:var(--text-body-small); padding:3px 0;';
    if (r.alert) row.style.background = 'rgba(255,180,50,0.1)';

    const c1 = document.createElement('span');
    c1.textContent = r.name;
    c1.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    const c2 = document.createElement('span');
    c2.style.textAlign = 'right';
    c2.textContent = r.app > 0 ? r.app.toLocaleString() : '-';
    const c3 = document.createElement('span');
    c3.style.textAlign = 'right';
    c3.textContent = r.payslip !== null ? r.payslip.toLocaleString() : '-';
    const c4 = document.createElement('span');
    c4.style.textAlign = 'right';
    if (r.diff !== null && Math.abs(r.diff) >= 10) {
      c4.textContent = (r.diff > 0 ? '+' : '') + r.diff.toLocaleString();
      c4.style.color = 'var(--accent-rose)';
      c4.style.fontWeight = '600';
    } else if (r.diff !== null) {
      c4.textContent = '일치';
      c4.style.color = 'var(--accent-emerald)';
    } else {
      c4.textContent = '-';
    }

    row.appendChild(c1);
    row.appendChild(c2);
    row.appendChild(c3);
    row.appendChild(c4);
    detail.appendChild(row);
  });

  // 합계 행
  const totalRow = document.createElement('div');
  totalRow.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:4px; font-size:var(--text-body-small); padding:6px 0; border-top:1px solid var(--border); margin-top:4px; font-weight:700;';
  if (totalAlert) totalRow.style.background = 'rgba(255,180,50,0.15)';
  const t1 = document.createElement('span'); t1.textContent = '통상임금 합계';
  const t2 = document.createElement('span'); t2.style.textAlign = 'right'; t2.textContent = appWage.monthlyWage.toLocaleString();
  const t3 = document.createElement('span'); t3.style.textAlign = 'right'; t3.textContent = payslipOrdinarySum.toLocaleString();
  const t4 = document.createElement('span'); t4.style.textAlign = 'right';
  if (totalAlert) {
    t4.textContent = (totalDiff > 0 ? '+' : '') + totalDiff.toLocaleString();
    t4.style.color = 'var(--accent-rose)';
  } else {
    t4.textContent = '일치';
    t4.style.color = 'var(--accent-emerald)';
  }
  totalRow.appendChild(t1); totalRow.appendChild(t2); totalRow.appendChild(t3); totalRow.appendChild(t4);
  detail.appendChild(totalRow);

  // 시급 정보
  const rateInfo = document.createElement('div');
  rateInfo.style.cssText = 'margin-top:8px; font-size:var(--text-body-small); color:var(--text-muted); padding:6px 8px; background:var(--bg-hover); border-radius:6px;';
  rateInfo.textContent = `앱 기준 시급: ${fmt(appWage.hourlyRate)} (÷${parseInt(profile.weeklyHours) || 209}시간)`;
  detail.appendChild(rateInfo);

  section.appendChild(detail);
  container.appendChild(section);
}

// ── 수당 분석 (리버스엔지니어링) 섹션 ──
function renderOvertimeAnalysis(container, data) {
  const profile = PROFILE.load();
  if (!profile || !profile.jobType || !profile.grade) return;
  if (!data.salaryItems || data.salaryItems.length === 0) return;

  const serviceYears = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
  const appWage = CALC.calcOrdinaryWage(
    profile.jobType, profile.grade, parseInt(profile.year) || 1,
    {
      hasMilitary: profile.hasMilitary,
      hasSeniority: profile.hasSeniority,
      seniorityYears: profile.hasSeniority ? serviceYears : 0,
      longServiceYears: serviceYears,
      adjustPay: parseInt(profile.adjustPay) || 0,
      upgradeAdjustPay: parseInt(profile.upgradeAdjustPay) || 0,
      specialPayAmount: parseInt(profile.specialPay) || 0,
      positionPay: parseInt(profile.positionPay) || 0,
      workSupportPay: parseInt(profile.workSupportPay) || 0,
      weeklyHours: parseInt(profile.weeklyHours) || 209,
    }
  );
  if (!appWage || !appWage.hourlyRate) return;

  const hourlyRate = appWage.hourlyRate;
  const rates = DATA.allowances.overtimeRates;

  // 명세서에서 수당 항목 찾기
  const payslipMap = {};
  data.salaryItems.forEach(item => { payslipMap[item.name] = item.amount; });

  // 역산 대상 매핑: { 명세서항목명: { rate, label } }
  const overtimeItems = [
    { names: ['시간외수당', '시간외근무수당', '연장근무수당', '연장수당'], rate: rates.extended, label: '연장근무', unit: '시간' },
    { names: ['야간수당', '야간근무수당'], rate: rates.night, label: '야간근무', unit: '시간' },
    { names: ['휴일수당', '휴일근무수당'], rate: rates.holiday, label: '휴일근무', unit: '시간' },
    { names: ['야간근무가산금', '야간가산금'], rate: null, label: '야간근무가산', unit: '회', perUnit: DATA.allowances.nightShiftBonus },
    { names: ['당직비', '일직비', '숙직비'], rate: null, label: '당직', unit: '일', perUnit: DATA.allowances.dutyAllowance },
  ];

  const results = [];
  overtimeItems.forEach(ot => {
    for (const name of ot.names) {
      if (payslipMap[name] && payslipMap[name] > 0) {
        const amount = payslipMap[name];
        let estimated;
        if (ot.perUnit) {
          estimated = amount / ot.perUnit;
        } else {
          estimated = amount / (hourlyRate * ot.rate);
        }
        // 15분 단위 반올림 (0.25 단위)
        const rounded = Math.round(estimated * 4) / 4;
        results.push({
          label: ot.label,
          name: name,
          amount: amount,
          estimated: rounded,
          unit: ot.unit,
          rate: ot.rate,
          perUnit: ot.perUnit,
        });
        break; // 첫 매칭만
      }
    }
  });

  if (results.length === 0) return;

  const fmt = n => n > 0 ? n.toLocaleString() + '원' : '-';

  const section = document.createElement('div');
  section.style.cssText = 'margin-top:16px; border-top:1px solid var(--border-glass); padding-top:12px;';

  const label = document.createElement('p');
  label.style.cssText = 'font-size:var(--text-body-normal); color:var(--accent-indigo); font-weight:600; margin:0 0 8px; cursor:pointer;';
  label.textContent = '🔍 수당 분석 (역산)';
  const detail = document.createElement('div');
  detail.style.display = 'none';
  label.addEventListener('click', () => {
    detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
  });
  section.appendChild(label);

  // 시급 기준 안내
  const rateNote = document.createElement('div');
  rateNote.style.cssText = 'font-size:0.7rem; color:var(--text-muted); margin-bottom:8px; padding:4px 8px; background:var(--bg-hover); border-radius:6px;';
  rateNote.textContent = `기준 시급: ${fmt(hourlyRate)} | 연장/야간/휴일: ×${rates.extended} | 야간가산금: ${DATA.allowances.nightShiftBonus.toLocaleString()}원/회 | 당직비: ${DATA.allowances.dutyAllowance.toLocaleString()}원/일`;
  detail.appendChild(rateNote);

  results.forEach(r => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px; margin-bottom:6px; background:var(--bg-hover); border-radius:8px;';

    const left = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:var(--text-body-normal); font-weight:600; color:var(--text-primary);';
    nameEl.textContent = r.label;
    left.appendChild(nameEl);
    const subEl = document.createElement('div');
    subEl.style.cssText = 'font-size:0.7rem; color:var(--text-muted);';
    if (r.perUnit) {
      subEl.textContent = `${r.name} ${fmt(r.amount)} ÷ ${r.perUnit.toLocaleString()}원`;
    } else {
      subEl.textContent = `${r.name} ${fmt(r.amount)} ÷ (${hourlyRate.toLocaleString()} × ${r.rate})`;
    }
    left.appendChild(subEl);
    row.appendChild(left);

    const right = document.createElement('div');
    right.style.cssText = 'text-align:right;';
    const estEl = document.createElement('div');
    estEl.style.cssText = 'font-size:var(--text-body-large); font-weight:700; color:var(--accent-indigo);';
    estEl.textContent = `≈ ${r.estimated}${r.unit}`;
    right.appendChild(estEl);
    row.appendChild(right);

    detail.appendChild(row);
  });

  // 총 시간외 합산
  const timeResults = results.filter(r => r.unit === '시간');
  if (timeResults.length > 0) {
    const totalHours = timeResults.reduce((s, r) => s + r.estimated, 0);
    const totalPay = timeResults.reduce((s, r) => s + r.amount, 0);
    const summaryEl = document.createElement('div');
    summaryEl.style.cssText = 'margin-top:8px; padding:8px 10px; background:var(--accent-indigo); color:white; border-radius:8px; display:flex; justify-content:space-between; font-size:var(--text-body-normal);';
    const sl = document.createElement('span');
    sl.style.fontWeight = '600';
    sl.textContent = `총 시간외 근무: ≈ ${totalHours}시간`;
    const sr = document.createElement('span');
    sr.textContent = `수당 합계: ${fmt(totalPay)}`;
    summaryEl.appendChild(sl);
    summaryEl.appendChild(sr);
    detail.appendChild(summaryEl);
  }

  section.appendChild(detail);
  container.appendChild(section);
}

function deletePayslipMonth(year, month, type) {
  const typeLabel = type && type !== '급여' ? ` (${type})` : '';
  if (!confirm(`${year}년 ${month}월${typeLabel} 급여명세서를 삭제하시겠습니까?`)) return;
  const settings = (() => { try { return JSON.parse(localStorage.getItem('snuhmate_settings') || '{}'); } catch(e) { return {}; } })();
  const uid = settings.googleSub || 'guest';
  const base = `payslip_${uid}_${year}_${String(month).padStart(2, '0')}`;
  const key = (type && type !== '급여') ? `${base}_${type}` : base;
  localStorage.removeItem(key);
  renderPayslipMgmt();
}

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)

// Phase 2-regression: inline onclick window 노출 (Phase 3-F 검토 후 제거 예정)


// Phase 3-E: payslip-tab 1 onclick → data-action 위임
import { registerActions as _payslip_registerActions } from '@snuhmate/shared-utils';
_payslip_registerActions({
  showVerifyInQna: () => showVerifyInQna(),
});


// Phase 3-regression: cross-module bare 호출 → window 호환층 복원
if (typeof window !== 'undefined') {
  window.renderPayslip = renderPayslip;
  window.renderPayslipMgmt = renderPayslipMgmt;
  window.renderVerification = renderVerification;
  window.renderSavedMonths = renderSavedMonths;
}
export {};