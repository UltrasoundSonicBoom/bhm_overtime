import * as pdfjsLib from '../../node_modules/pdfjs-dist/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs';

const state = {
  documents: [],
  activeId: null,
  thumbnailTasks: new Map(),
};

const els = {
  generatedAt: document.getElementById('generatedAt'),
  docGrid: document.getElementById('docGrid'),
  pdfMeta: document.getElementById('pdfMeta'),
  pdfPages: document.getElementById('pdfPages'),
  htmlPreview: document.getElementById('htmlPreview'),
  structuredPreview: document.getElementById('structuredPreview'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtNumber(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function fmtCurrency(value) {
  return `${fmtNumber(value)}원`;
}

function fmtCompactCurrency(value) {
  return value == null || value === '' || Number(value) === 0 ? '' : fmtNumber(value);
}

function summarizeCount(doc) {
  return [
    { label: '지급', value: `${doc.earnings.length}건` },
    { label: '공제', value: `${doc.deductions.length}건` },
    { label: '근무', value: `${doc.workRecords.length}건` },
    { label: '상세', value: `${doc.detailLines.length}건` },
  ];
}

function renderDocGrid() {
  els.docGrid.innerHTML = state.documents.map((doc) => {
    const summary = summarizeCount(doc);
    return `
      <article class="doc-card${doc.id === state.activeId ? ' is-active' : ''}" data-doc-id="${escapeHtml(doc.id)}">
        <div class="thumb" id="thumb-${escapeHtml(doc.id)}"><div class="loading">PDF 썸네일 렌더링 중...</div></div>
        <h2>${escapeHtml(doc.label)}</h2>
        <div class="sub">${escapeHtml(doc.metadata.payPeriod || '')}${doc.metadata.payslipType ? ` · ${escapeHtml(doc.metadata.payslipType)}` : ''}</div>
        <div class="mini-stats">
          <div class="mini-stat">
            <strong>실수령</strong>
            <span>${fmtCurrency(doc.summary.netPay)}</span>
          </div>
          <div class="mini-stat">
            <strong>총지급</strong>
            <span>${fmtCurrency(doc.summary.grossPay)}</span>
          </div>
          ${summary.slice(0, 2).map((item) => `
            <div class="mini-stat">
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(item.value)}</span>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  }).join('');

  els.docGrid.querySelectorAll('.doc-card').forEach((card) => {
    card.addEventListener('click', () => {
      const { docId } = card.dataset;
      setActiveDocument(docId);
    });
  });

  state.documents.forEach((doc) => renderThumbnail(doc).catch((error) => {
    const mount = document.getElementById(`thumb-${doc.id}`);
    if (mount) mount.innerHTML = `<div class="loading">썸네일 실패: ${escapeHtml(error.message)}</div>`;
  }));
}

async function renderThumbnail(doc) {
  if (state.thumbnailTasks.has(doc.id)) return state.thumbnailTasks.get(doc.id);
  const task = (async () => {
    const mount = document.getElementById(`thumb-${doc.id}`);
    if (!mount) return;
    const pdf = await pdfjsLib.getDocument(doc.pdfPath).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.34 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    mount.innerHTML = '';
    mount.appendChild(canvas);
  })();
  state.thumbnailTasks.set(doc.id, task);
  return task;
}

function renderItemTable(items, valueLabel = '금액', unitMode = false) {
  if (!items.length) return '<div class="empty">항목이 없습니다.</div>';
  const heading = unitMode ? '값' : valueLabel;
  return `
    <table>
      <thead>
        <tr>
          <th>항목</th>
          <th>${heading}</th>
          <th>단위</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => `
          <tr>
            <td>${escapeHtml(item.originalName || item.name || '')}</td>
            <td class="num">${unitMode ? escapeHtml(String(item.value)) : fmtCurrency(item.value)}</td>
            <td>${escapeHtml(item.unit || '')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderDetailLines(lines) {
  if (!lines.length) return '<div class="empty">상세 계산 항목이 없습니다.</div>';
  return `
    <table>
      <thead>
        <tr>
          <th>구분</th>
          <th>항목</th>
          <th>금액</th>
        </tr>
      </thead>
      <tbody>
        ${lines.map((line) => `
          <tr>
            <td>${escapeHtml(line.section)}</td>
            <td>${escapeHtml(line.itemName)}</td>
            <td class="num">${fmtCurrency(line.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderRawRows(doc, blockType) {
  const block = (doc.rawBlocks || []).find((item) => item.type === blockType);
  if (!block?.rows?.length) return '<div class="empty">원문 행이 없습니다.</div>';
  return `
    <div class="source-rows">
      ${block.rows.map((row) => `<div class="source-row">${escapeHtml(row)}</div>`).join('')}
    </div>
  `;
}

function renderMatrixTable(matrix, valueMode = 'currency') {
  if (!matrix?.headerMatrix?.length) return '<div class="empty">매트릭스 데이터가 없습니다.</div>';
  return `
    <table>
      <thead>
        <tr>
          ${matrix.headerMatrix[0].map((_, colIndex) => `<th>열 ${colIndex + 1}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${matrix.headerMatrix.map((row, rowIndex) => `
          <tr>
            ${row.map((header, colIndex) => {
              const value = matrix.valueMatrix?.[rowIndex]?.[colIndex];
              const raw = matrix.rawHeaderMatrix?.[rowIndex]?.[colIndex];
              const source = matrix.sourceMatrix?.[rowIndex]?.[colIndex];
              const renderedValue = value == null
                ? ''
                : valueMode === 'raw'
                  ? escapeHtml(String(value))
                  : fmtCurrency(Number(String(value).replace(/,/g, '')));
              return `
                <td>
                  <div style="font-weight:700; margin-bottom:4px;">${escapeHtml(header || '-')}</div>
                  ${raw && raw !== header ? `<div style="font-size:11px; color:#6b7280; margin-bottom:4px;">raw: ${escapeHtml(raw)}</div>` : ''}
                  ${renderedValue ? `<div style="font-variant-numeric:tabular-nums; color:#111827;">${renderedValue}</div>` : '<div style="color:#c0c7d1;">-</div>'}
                  ${source ? `<div style="font-size:11px; color:#94a3b8; margin-top:4px;">p${source.page} r${source.rowId}</div>` : ''}
                </td>
              `;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function cellDisplayName(name) {
  return escapeHtml(String(name || ''));
}

function renderSectionSide(label) {
  return `
    <div class="stack">
      ${label.split('').map((char) => `<span>${escapeHtml(char)}</span>`).join('')}
    </div>
  `;
}

function renderGridSection(matrix, sideLabel) {
  if (!matrix?.headerMatrix?.length) return '<div class="empty">그리드 데이터가 없습니다.</div>';
  const rowCount = matrix.headerMatrix.length;
  return `
    <table class="sheet-grid-table">
      <colgroup>
        <col style="width:54px;">
        ${matrix.headerMatrix[0].map(() => '<col>').join('')}
      </colgroup>
      <tbody>
        ${matrix.headerMatrix.map((row, rowIndex) => `
          <tr>
            ${rowIndex === 0 ? `<td class="section-side" rowspan="${rowCount * 2}">${renderSectionSide(sideLabel)}</td>` : ''}
            ${row.map((header) => `
              <td class="grid-name-cell">${header ? cellDisplayName(header) : ''}</td>
            `).join('')}
          </tr>
          <tr>
            ${row.map((_, colIndex) => {
              const rawValue = matrix.valueMatrix?.[rowIndex]?.[colIndex];
              const displayValue = fmtCompactCurrency(rawValue);
              return `<td class="grid-value-cell${displayValue ? '' : ' is-empty'}">${escapeHtml(displayValue || '')}</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderInfoTable(doc) {
  const employee = doc.employeeInfo || {};
  const metadata = doc.metadata || {};
  const siteCode = employee.payGrade?.split('-')?.[0] ? `S${employee.payGrade.split('-')[0].replace(/\D/g, '')}` : 'S101';
  const pairs = [
    ['개인번호', employee.employeeNumber || ''],
    ['성명', employee.name || ''],
    ['직종', employee.jobType || ''],
    ['급여연차', employee.payGrade || ''],
    ['소속', employee.department || ''],
    ['입사년월', employee.hireDate || ''],
  ];
  return {
    siteCode: siteCode || 'S101',
    payDate: metadata.payDate || '',
    payPeriod: metadata.payPeriod || '',
    html: `
      <table class="sheet-info-table">
        <tbody>
          <tr>
            ${pairs.map(([label, value]) => `
              <th>${escapeHtml(label)}</th>
              <td>${escapeHtml(value)}</td>
            `).join('')}
          </tr>
        </tbody>
      </table>
    `,
  };
}

function renderDetailSheet(doc) {
  const lines = doc.detailLines || [];
  if (!lines.length) return '';
  return `
    <div class="a4-sheet" style="aspect-ratio: 210 / 297;">
      <div class="page2-box">
        <div class="page2-head">2페이지 상세 계산 내역</div>
        <table class="page2-table">
          <thead>
            <tr>
              <th style="width:72px;">구분</th>
              <th>항목</th>
              <th style="width:120px;">금액</th>
            </tr>
          </thead>
          <tbody>
            ${lines.map((line) => `
              <tr>
                <td>${escapeHtml(line.section)}</td>
                <td>${escapeHtml(line.itemName)}</td>
                <td class="num">${fmtCurrency(line.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderHtmlPreview(doc) {
  const info = renderInfoTable(doc);
  const payPeriodTitle = String(info.payPeriod || '').replace('년 ', '년도 ').replace('월분', '월분');
  const titleText = payPeriodTitle ? `${payPeriodTitle} 급여명세서` : '급여명세서';

  els.htmlPreview.innerHTML = `
    <div class="payslip">
      <div class="a4-sheet">
        <div class="sheet-title-row">
          <div class="sheet-chip">${escapeHtml(info.siteCode)}</div>
          <div class="sheet-heading">${escapeHtml(titleText)}</div>
          <div class="sheet-date-box">
            <strong>급여지급일 :</strong>
            <span>${escapeHtml(info.payDate)}</span>
          </div>
        </div>
        ${info.html}
        ${renderGridSection(doc.documentModel?.tables?.earnings, '지급내역')}
        ${renderGridSection(doc.documentModel?.tables?.deductions, '공제내역')}
      </div>
      ${renderDetailSheet(doc)}
    </div>
  `;
}

function renderStructuredPreview(doc) {
  const summaryTags = [
    { label: `지급 ${doc.earnings.length}건`, kind: 'ok' },
    { label: `공제 ${doc.deductions.length}건`, kind: 'warn' },
    { label: `근무 ${doc.workRecords.length}건`, kind: '' },
    { label: `상세 ${doc.detailLines.length}건`, kind: '' },
    { label: `unknown ${doc.unknownItems.length}건`, kind: doc.unknownItems.length ? 'warn' : 'ok' },
  ];

  els.structuredPreview.innerHTML = `
    <div class="stats-list">
      <div class="stat-card"><strong>총지급</strong><span>${fmtCurrency(doc.summary.grossPay)}</span></div>
      <div class="stat-card"><strong>총공제</strong><span>${fmtCurrency(doc.summary.totalDeduction)}</span></div>
      <div class="stat-card"><strong>실수령</strong><span>${fmtCurrency(doc.summary.netPay)}</span></div>
    </div>

    <div style="margin:14px 0 10px;">
      ${summaryTags.map((tag) => `<span class="tag ${tag.kind}">${escapeHtml(tag.label)}</span>`).join('')}
    </div>

    <div class="table-stack">
      <div>
        <h4 style="margin:0 0 8px;">상위 지급 항목</h4>
        ${renderItemTable([...doc.earnings].sort((a, b) => b.value - a.value).slice(0, 8))}
      </div>
      <div>
        <h4 style="margin:0 0 8px;">상위 공제 항목</h4>
        ${renderItemTable([...doc.deductions].sort((a, b) => b.value - a.value).slice(0, 8))}
      </div>
      <div>
        <h4 style="margin:0 0 8px;">근무기록 전체</h4>
        ${renderItemTable(doc.workRecords, '값', true)}
      </div>
      <div>
        <h4 style="margin:0 0 8px;">상세 계산 내역</h4>
        ${renderDetailLines(doc.detailLines)}
      </div>
      <div>
        <h4 style="margin:0 0 8px;">블록 통계</h4>
        <div class="structured-list">
          <div class="stat-card"><strong>method</strong><span style="font-size:14px">${escapeHtml(doc.parseInfo.method || '')}</span></div>
          <div class="stat-card"><strong>strategy</strong><span style="font-size:14px">${escapeHtml(doc.parseInfo.strategy || '')}</span></div>
          <div class="stat-card"><strong>page / row / detail row</strong><span style="font-size:14px">${escapeHtml(`${doc.parseInfo.blockStats?.pages || 0} / ${doc.parseInfo.blockStats?.rows || 0} / ${doc.parseInfo.blockStats?.detailRows || 0}`)}</span></div>
          <div class="stat-card"><strong>block count</strong><span style="font-size:14px">${escapeHtml(String(doc.documentModel?.blocks?.length || 0))}</span></div>
        </div>
      </div>
    </div>
  `;
}

async function renderPdfPages(doc) {
  els.pdfMeta.textContent = `${doc.fileName} · ${doc.metadata.payPeriod || '-'} · ${doc.metadata.payslipType || '-'}`;
  els.pdfPages.innerHTML = '<div class="empty">PDF 렌더링 중...</div>';
  const pdf = await pdfjsLib.getDocument(doc.pdfPath).promise;
  els.pdfPages.innerHTML = '';

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;

    const shell = document.createElement('div');
    shell.className = 'pdf-page';
    const label = document.createElement('div');
    label.className = 'muted';
    label.style.marginBottom = '8px';
    label.textContent = `${pageNumber}페이지`;
    shell.appendChild(label);
    shell.appendChild(canvas);
    els.pdfPages.appendChild(shell);
  }
}

async function setActiveDocument(docId) {
  state.activeId = docId;
  renderDocGrid();
  const doc = state.documents.find((item) => item.id === docId);
  if (!doc) return;
  renderHtmlPreview(doc);
  renderStructuredPreview(doc);
  await renderPdfPages(doc);
}

async function init() {
  const response = await fetch('./preview-data.json');
  const payload = await response.json();
  state.documents = payload.documents || [];
  els.generatedAt.textContent = `${payload.totalDocuments || 0}개 문서 · 생성 ${new Date(payload.generatedAt).toLocaleString('ko-KR')}`;
  renderDocGrid();
  if (state.documents.length) await setActiveDocument(state.documents[0].id);
}

init().catch((error) => {
  console.error(error);
  els.generatedAt.textContent = `로드 실패: ${error.message}`;
});
