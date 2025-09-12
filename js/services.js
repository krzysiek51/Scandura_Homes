// prościutki akordeon FAQ — jeden otwarty na raz
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('.faq-item__toggle');
  if (!toggle) return;

  const item = toggle.closest('.faq-item');
  const content = item.querySelector('.faq-item__content');
  const open = toggle.getAttribute('aria-expanded') === 'true';

  // zamknij wszystkie
  document.querySelectorAll('.faq-item__toggle[aria-expanded="true"]').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    const it = btn.closest('.faq-item');
    const ct = it && it.querySelector('.faq-item__content');
    if (ct) ct.hidden = true;
    const ic = it && it.querySelector('.faq-item__icon');
    if (ic) ic.textContent = '+';
  });

  // przestaw kliknięty
  toggle.setAttribute('aria-expanded', String(!open));
  if (content) content.hidden = open;
  const icon = item.querySelector('.faq-item__icon');
  if (icon) icon.textContent = open ? '+' : '–';
});
