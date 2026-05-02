document.querySelectorAll('[data-team-schedule-route="rules"] code').forEach((code) => {
  code.addEventListener('click', () => {
    code.setAttribute('data-selected', 'true');
  });
});
