// js/callback.js
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.js-callback-link');
  const section = document.getElementById('callbackSection');
  const input = document.getElementById('callbackPhone');

  if (!section || !input || !links.length) return;

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();

      section.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      setTimeout(() => input.focus(), 600);
    });
  });
});
