'use strict';
// ============================================================
// review-queue.js
// 검토 큐 UI: approval_tasks 목록 표시 + 승인/반려 처리
// ============================================================

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Load pending approval tasks from API
 */
async function loadApprovals(status) {
  const param = status ? `?status=${status}` : '';
  try {
    const resp = await fetch(`/api/admin/approvals${param}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.results || [];
  } catch (_) {
    return [];
  }
}

/**
 * Load content entry details
 */
async function loadContentEntry(entryId) {
  try {
    const resp = await fetch(`/api/admin/content/${entryId}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.result || null;
  } catch (_) {
    return null;
  }
}

/**
 * POST decision (approved / rejected) to approval task
 */
async function postDecision(taskId, decision, note) {
  try {
    const resp = await fetch(`/api/admin/approvals/${taskId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note: note || '' }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { success: false, error: err.error || `HTTP ${resp.status}` };
    }
    const data = await resp.json();
    return { success: true, result: data.result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Create safe DOM elements for an approval card
 */
function renderApprovalCard(task) {
  const card = document.createElement('div');
  card.className = 'approval-card';
  card.id = `approval-${task.id}`;

  const statusClass = task.status === 'pending' ? 'status-pending'
    : task.status === 'approved' ? 'status-approved'
    : 'status-rejected';

  // Header
  const header = document.createElement('div');
  header.className = 'approval-card-header';

  const headerLeft = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'approval-card-title';
  title.textContent = `검토 #${task.id} \u2014 콘텐츠 #${task.entry_id}`;
  headerLeft.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'approval-meta';
  meta.textContent = `요청: ${formatDate(task.created_at)}`;
  if (task.requested_by) {
    meta.textContent += ` | 요청자: ${String(task.requested_by).slice(0, 8)}...`;
  }
  headerLeft.appendChild(meta);
  header.appendChild(headerLeft);

  const statusBadge = document.createElement('span');
  statusBadge.className = `approval-status ${statusClass}`;
  statusBadge.textContent = task.status;
  header.appendChild(statusBadge);
  card.appendChild(header);

  // Content preview
  const preview = document.createElement('div');
  preview.className = 'content-preview';
  preview.id = `preview-${task.id}`;
  preview.textContent = '콘텐츠 미리보기 로드 중...';
  card.appendChild(preview);

  // Decision panel
  const panel = document.createElement('div');
  panel.className = 'decision-panel';
  panel.id = `decision-${task.id}`;

  if (task.status === 'pending') {
    const noteField = document.createElement('textarea');
    noteField.className = 'decision-note-field';
    noteField.id = `note-${task.id}`;
    noteField.placeholder = '승인/반려 사유를 입력하세요 (선택)';
    panel.appendChild(noteField);

    const actions = document.createElement('div');
    actions.className = 'decision-actions';

    const approveBtn = document.createElement('button');
    approveBtn.className = 'btn btn-approve';
    approveBtn.dataset.taskId = task.id;
    approveBtn.dataset.decision = 'approved';
    approveBtn.textContent = '승인';
    actions.appendChild(approveBtn);

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'btn btn-reject';
    rejectBtn.dataset.taskId = task.id;
    rejectBtn.dataset.decision = 'rejected';
    rejectBtn.textContent = '반려';
    actions.appendChild(rejectBtn);

    panel.appendChild(actions);

    const resultMsg = document.createElement('div');
    resultMsg.className = 'result-msg';
    resultMsg.id = `result-${task.id}`;
    panel.appendChild(resultMsg);
  } else {
    const decisionMeta = document.createElement('div');
    decisionMeta.className = 'approval-meta';
    decisionMeta.textContent = `결정: ${task.status}`;
    if (task.decided_at) {
      decisionMeta.textContent += ` (${formatDate(task.decided_at)})`;
    }
    if (task.decision_note) {
      const noteText = document.createElement('div');
      noteText.textContent = `사유: ${task.decision_note}`;
      decisionMeta.appendChild(noteText);
    }
    panel.appendChild(decisionMeta);
  }

  card.appendChild(panel);
  return card;
}

/**
 * Handle decision button clicks
 */
async function handleDecision(event) {
  const btn = event.target.closest('[data-task-id][data-decision]');
  if (!btn) return;

  const taskId = btn.dataset.taskId;
  const decision = btn.dataset.decision;
  const noteEl = document.getElementById(`note-${taskId}`);
  const note = noteEl ? noteEl.value.trim() : '';
  const resultEl = document.getElementById(`result-${taskId}`);

  // Disable buttons
  const panel = document.getElementById(`decision-${taskId}`);
  if (panel) {
    panel.querySelectorAll('button').forEach(b => { b.disabled = true; });
  }

  const res = await postDecision(taskId, decision, note);

  if (resultEl) {
    if (res.success) {
      resultEl.className = 'result-msg result-success';
      resultEl.textContent = decision === 'approved'
        ? '승인 완료 -- 콘텐츠가 게시되었습니다.'
        : '반려 완료 -- 콘텐츠가 초안으로 되돌아갔습니다.';
    } else {
      resultEl.className = 'result-msg result-error';
      resultEl.textContent = `실패: ${res.error}`;
      if (panel) {
        panel.querySelectorAll('button').forEach(b => { b.disabled = false; });
      }
    }
  }
}

/**
 * Render content preview for an approval card
 */
async function loadPreview(task) {
  const previewEl = document.getElementById(`preview-${task.id}`);
  if (!previewEl) return;

  const entry = await loadContentEntry(task.entry_id);
  if (!entry) {
    previewEl.textContent = '콘텐츠를 불러올 수 없습니다.';
    return;
  }

  const e = entry.entry;
  const rev = entry.revisions?.[0];

  previewEl.textContent = '';
  const titleLine = document.createElement('strong');
  titleLine.textContent = e.title || '제목 없음';
  previewEl.appendChild(titleLine);

  const typeLine = document.createTextNode(
    ` (${e.content_type || ''}, 상태: ${e.status || ''})`
  );
  previewEl.appendChild(typeLine);

  if (rev && rev.body) {
    previewEl.appendChild(document.createElement('br'));
    previewEl.appendChild(document.createElement('br'));
    const bodyText = document.createTextNode(rev.body.slice(0, 500));
    previewEl.appendChild(bodyText);
  }
}

/**
 * Main initialization
 */
document.addEventListener('DOMContentLoaded', async () => {
  const listEl = document.getElementById('approval-list');
  const emptyEl = document.getElementById('empty-msg');
  const countEl = document.getElementById('pending-count');

  const pendingTasks = await loadApprovals('pending');

  if (countEl) {
    countEl.textContent = `${pendingTasks.length}건 대기`;
  }

  if (pendingTasks.length === 0) {
    if (emptyEl) emptyEl.textContent = '현재 검토 대기 중인 항목이 없습니다.';
    return;
  }

  if (emptyEl) emptyEl.remove();

  for (const task of pendingTasks) {
    const card = renderApprovalCard(task);
    listEl.appendChild(card);
    loadPreview(task);
  }

  listEl.addEventListener('click', handleDecision);
});
