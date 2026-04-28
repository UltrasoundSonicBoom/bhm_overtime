// firebase/drive-pdf.js — Phase 9 Google Drive PDF 업로드
//
// 명세서 PDF 원본을 사용자의 Google Drive 에 보관.
// 파일 경로: snuhmate/{YYYY}/{YYYY-MM}_payslip_{type}.pdf
//
// 전제: 사용자가 Google 로 로그인 (Firebase Auth).
//   → auth-service.js 의 onAuthChanged 에서 access_token 획득 가능.
//
// OAuth scope: https://www.googleapis.com/auth/drive.file
//   (앱이 생성한 파일에만 접근 — 전체 Drive 접근 아님)
//
// API: Drive REST v3 (multipart upload)
// 폴더 구조: snuhmate/{YYYY}/ — 없으면 자동 생성 (idempotent)
//
// driveFileId: 업로드 완료 후 Firestore payslip doc 에 저장 (plaintext — 식별성 없음)

const DRIVE_API = 'https://www.googleapis.com/drive';
const FOLDER_NAME_ROOT = 'snuhmate';

async function _getAccessToken() {
  if (typeof window === 'undefined') return null;
  // Firebase Auth GoogleAuthProvider 로 로그인 시 credential 에서 토큰 획득
  // auth-service.js 의 onAuthChanged 에서 window.__googleAccessToken 설정 (Phase 5 이후)
  return window.__googleAccessToken || null;
}

async function _apiFetch(url, options, token) {
  const headers = { Authorization: `Bearer ${token}`, ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Drive API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function _findOrCreateFolder(token, name, parentId) {
  // 동일 이름 폴더 존재 여부 확인
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    + (parentId ? ` and '${parentId}' in parents` : '');
  const search = await _apiFetch(
    `${DRIVE_API}/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { method: 'GET' },
    token
  );
  if (search.files && search.files.length > 0) return search.files[0].id;

  // 없으면 생성
  const meta = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) meta.parents = [parentId];
  const created = await _apiFetch(
    `${DRIVE_API}/v3/files?fields=id`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meta),
    },
    token
  );
  return created.id;
}

// pdfBlob: Blob | ArrayBuffer | Uint8Array
export async function uploadPayslipPdf(pdfBlob, payMonth, payslipType) {
  const token = await _getAccessToken();
  if (!token) throw new Error('Google access token 없음 — Google 로그인 필요');

  const year = (payMonth || '').slice(0, 4) || String(new Date().getFullYear());
  const safeType = (payslipType || '급여').replace(/[^가-힣a-zA-Z0-9_\-]/g, '');

  // snuhmate/ 루트 폴더
  const rootId = await _findOrCreateFolder(token, FOLDER_NAME_ROOT, null);
  // snuhmate/{YYYY}/ 연도 폴더
  const yearId = await _findOrCreateFolder(token, year, rootId);

  const fileName = `${payMonth}_payslip_${safeType}.pdf`;

  // Multipart upload (metadata + file body)
  const boundary = '---snuhmate_boundary_' + Date.now();
  const metaPart = JSON.stringify({ name: fileName, parents: [yearId] });

  // Build multipart body as Blob
  const bodyParts = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaPart}\r\n`,
    `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
  ];
  const bodyBlob = new Blob([
    bodyParts[0],
    bodyParts[1],
    pdfBlob instanceof Blob ? pdfBlob : new Blob([pdfBlob], { type: 'application/pdf' }),
    `\r\n--${boundary}--`,
  ], { type: `multipart/related; boundary="${boundary}"` });

  const uploaded = await _apiFetch(
    `${DRIVE_API}/upload/v3/files?uploadType=multipart&fields=id,name,webViewLink`,
    { method: 'POST', body: bodyBlob },
    token
  );

  return { driveFileId: uploaded.id, fileName: uploaded.name, webViewLink: uploaded.webViewLink };
}

// 파일 ID 로 Drive webViewLink 조회
export async function getDriveFileLink(driveFileId) {
  const token = await _getAccessToken();
  if (!token || !driveFileId) return null;
  try {
    const res = await _apiFetch(
      `${DRIVE_API}/v3/files/${driveFileId}?fields=webViewLink`,
      { method: 'GET' },
      token
    );
    return res.webViewLink || null;
  } catch { return null; }
}

// 내보내기 — 테스트 주입용 (드라이브 API 를 mock 으로 대체)
export { _findOrCreateFolder, _apiFetch };
