// dashboard.js — boot intro + skills animation + contact form status

(function () {
  /* ---------- boot sequence ---------- */
  const boot = document.getElementById('bootScreen');
  if (boot) {
    const alreadyBooted = sessionStorage.getItem('kyroBooted');
    if (alreadyBooted) {
      boot.remove();
    } else {
      const totalDelay = 2600;
      setTimeout(() => {
        boot.classList.add('hide');
        sessionStorage.setItem('kyroBooted', '1');
        setTimeout(() => boot.remove(), 650);
      }, totalDelay);

      boot.addEventListener('click', () => {
        boot.classList.add('hide');
        sessionStorage.setItem('kyroBooted', '1');
        setTimeout(() => boot.remove(), 650);
      });
    }
  }

  /* ---------- animated skill bars ---------- */
  const skillRows = document.querySelectorAll('.skill-row');
  if ('IntersectionObserver' in window && skillRows.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const row = entry.target;
          const target = parseInt(row.dataset.value, 10) || 0;
          const fill = row.querySelector('.skill-fill');
          const val = row.querySelector('.skill-val');
          fill.style.width = target + '%';

          let current = 0;
          const duration = 900;
          const start = performance.now();
          function tick(now) {
            const p = Math.min((now - start) / duration, 1);
            current = Math.round(target * p);
            val.textContent = current + '%';
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          io.unobserve(row);
        });
      },
      { threshold: 0.4 }
    );
    skillRows.forEach((row) => io.observe(row));
  } else {
    skillRows.forEach((row) => {
      const target = parseInt(row.dataset.value, 10) || 0;
      row.querySelector('.skill-fill').style.width = target + '%';
      row.querySelector('.skill-val').textContent = target + '%';
    });
  }

  /* ---------- contact form ---------- */
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      status.classList.remove('err');
      status.textContent = 'mengirim pesan...';
      btn.disabled = true;

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        if (res.ok) {
          status.textContent = 'pesan terkirim. terima kasih sudah menghubungi.';
          form.reset();
        } else {
          throw new Error('request failed');
        }
      } catch (err) {
        status.classList.add('err');
        status.textContent = 'gagal mengirim. coba lagi atau email langsung ke yasiraja743@gmail.com';
      } finally {
        btn.disabled = false;
      }
    });
  }
})();
