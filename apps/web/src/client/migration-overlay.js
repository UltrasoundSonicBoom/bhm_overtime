// migration-overlay.js — 도메인 이전 카운트다운
const MIGRATION_TARGET_URL = 'https://snuhmate.com';
let migrationCountdownInterval = null;
let migrationSecondsRemaining = 3;

function updateMigrationCountdownText(message) {
  const countdownEl = document.getElementById('migrationCountdownText');
  if (countdownEl) countdownEl.innerHTML = message;
}

function stopMigrationCountdown(message) {
  if (migrationCountdownInterval) {
    clearInterval(migrationCountdownInterval);
    migrationCountdownInterval = null;
  }
  if (message) updateMigrationCountdownText(message);
}

function redirectToNewDomain() {
  window.location.href = MIGRATION_TARGET_URL;
}

function startMigrationCountdown() {
  stopMigrationCountdown();
  migrationSecondsRemaining = 3;
  updateMigrationCountdownText(`<strong>${migrationSecondsRemaining}초 뒤</strong> snuhmate.com으로 자동 이동합니다.`);

  migrationCountdownInterval = setInterval(() => {
    migrationSecondsRemaining -= 1;

    if (migrationSecondsRemaining <= 0) {
      stopMigrationCountdown('<strong>이동 중...</strong> snuhmate.com으로 연결합니다.');
      redirectToNewDomain();
      return;
    }

    updateMigrationCountdownText(`<strong>${migrationSecondsRemaining}초 뒤</strong> snuhmate.com으로 자동 이동합니다.`);
  }, 1000);
}

function downloadBackupAndStay() {
  stopMigrationCountdown('자동 이동을 멈췄습니다. 백업 파일을 저장한 뒤 원할 때 새 주소로 이동하세요.');
  downloadBackup();
}

// 도메인 이전 팝업 노출 및 닫기 로직
function closeMigrationModal() {
  stopMigrationCountdown('자동 이동을 멈췄습니다. 현재 페이지에 계속 머뭅니다.');
  document.getElementById('migrationOverlay').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const host = window.location.hostname;
  if (host.includes('vercel.app')) {
    document.getElementById('migrationOverlay').style.display = 'flex';
    startMigrationCountdown();
  }
});

// Phase 2-regression: inline onclick window 노출 (ESM 전환으로 자동 노출 사라짐)
if (typeof window !== 'undefined') {
  window.closeMigrationModal = closeMigrationModal;
  window.downloadBackupAndStay = downloadBackupAndStay;
}

// Phase 2-F: ESM marker — 파일을 ES module 로 표시
export {};
