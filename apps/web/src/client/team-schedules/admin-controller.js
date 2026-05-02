const actions = document.querySelectorAll('[data-admin-action]');

actions.forEach((button) => {
  button.addEventListener('click', () => {
    button.textContent = '처리 중';
    button.setAttribute('aria-live', 'polite');
    window.setTimeout(() => {
      button.textContent = '검토 기록됨';
    }, 120);
  });
});
