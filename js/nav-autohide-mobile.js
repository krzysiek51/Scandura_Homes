// (() => {
//   const MQ_MAX = '(max-width: 1439px)'; // tylko mobile+tablet
//   const mq = window.matchMedia(MQ_MAX);

//   const bar     = document.querySelector('.header__top');
//   const spacer  = document.querySelector('.header__spacer');
//   const nav     = document.querySelector('nav#mobile-menu.header__nav');
//   const burger  = document.getElementById('burger-toggle');
//   const btnClose= nav?.querySelector('.header__nav-close');

//   if (!bar || !spacer || !nav) return;

//   const setHeaderHeight = () => {
//     if (!mq.matches) {               // na ≥1440 spacer niepotrzebny
//       document.documentElement.style.setProperty('--header-h', '0px');
//       return;
//     }
//     const h = bar.offsetHeight || 56;
//     document.documentElement.style.setProperty('--header-h', `${h}px`);
//   };

//   const onScroll = () => {
//     if (!mq.matches) return;
//     const y = window.scrollY || window.pageYOffset;
//     if (y > 2) bar.classList.add('is-scrolled');
//     else bar.classList.remove('is-scrolled');
//   };

//   const openNav = () => {
//     if (!mq.matches) return;                // overlay tylko <1440
//     nav.classList.add('is-open');
//     document.documentElement.classList.add('nav-lock');
//     document.body.classList.add('nav-lock');
//     nav.setAttribute('aria-hidden', 'false');
//     (nav.querySelector('.header__nav-link, .button--nav, .header__nav-close'))?.focus?.();
//   };

//   const closeNav = () => {
//     nav.classList.remove('is-open');
//     document.documentElement.classList.remove('nav-lock');
//     document.body.classList.remove('nav-lock');
//     nav.setAttribute('aria-hidden', 'true');
//     burger?.focus?.();
//   };

//   // Init + listeners (aktywne tylko, gdy mq.matches)
//   const enable = () => {
//     setHeaderHeight(); onScroll();
//     window.addEventListener('scroll', onScroll, { passive: true });
//     window.addEventListener('resize', setHeaderHeight, { passive: true });
//     window.addEventListener('orientationchange', setHeaderHeight, { passive: true });
//     burger?.addEventListener('click', onBurger);
//     btnClose?.addEventListener('click', onClose);
//     document.addEventListener('keydown', onEsc);
//     if (document.fonts?.ready) document.fonts.ready.then(setHeaderHeight).catch(()=>{});
//   };
//   const disable = () => {
//     document.documentElement.style.setProperty('--header-h', '0px');
//     bar.classList.remove('is-scrolled');
//     closeNav();
//     window.removeEventListener('scroll', onScroll);
//     window.removeEventListener('resize', setHeaderHeight);
//     window.removeEventListener('orientationchange', setHeaderHeight);
//     burger?.removeEventListener('click', onBurger);
//     btnClose?.removeEventListener('click', onClose);
//     document.removeEventListener('keydown', onEsc);
//   };

//   const onBurger = (e) => { e.preventDefault(); nav.classList.contains('is-open') ? closeNav() : openNav(); };
//   const onClose  = (e) => { e.preventDefault(); closeNav(); };
//   const onEsc    = (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) closeNav(); };

//   const sync = () => { mq.matches ? enable() : disable(); };
//   mq.addEventListener?.('change', sync);

//   // start
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(sync));
//   } else {
//     requestAnimationFrame(sync);
//   }
// })();
