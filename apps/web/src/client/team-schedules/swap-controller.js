document.querySelectorAll('[data-swap-action]').forEach((button) => {
  button.addEventListener('click', () => {
    button.textContent = '요청 흐름 확인됨';
  });
});
