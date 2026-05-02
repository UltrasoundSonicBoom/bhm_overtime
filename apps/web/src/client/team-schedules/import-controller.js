const status = document.getElementById('importStatus');

document.querySelectorAll('[data-import-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.getAttribute('data-import-action');
    if (status) {
      status.textContent = action === 'validate' ? '검증 완료: 차단 2, 경고 0' : '스냅샷 고정 대기';
    }
  });
});
