// nav.js — shared side menu + scroll reveal, loaded on every page

(function () {
  const toggle = document.getElementById('navToggle');
  const close = document.getElementById('navClose');
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('navOverlay');

  function openMenu() {
    menu.classList.add('active');
    overlay.classList.add('active');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    menu.classList.remove('active');
    overlay.classList.remove('active');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle) toggle.addEventListener('click', openMenu);
  if (close) close.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // mark active nav link based on current path (no .html extensions)
  const rawPath = location.pathname.replace(/index\.html$/, '').replace(/\.html$/, '');
  const current = rawPath === '' ? '/' : rawPath.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === current) link.classList.add('active');
  });

  // scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }
})();
