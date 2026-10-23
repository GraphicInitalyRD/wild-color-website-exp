/* ==========================================================================
   WILD COLOR – Script principale
   - Apertura/chiusura del menu a panino
   - Sottomenu a fisarmonica
   - Anno corrente nel footer
   ========================================================================== */
(function () {
  'use strict';

  var body   = document.body;
  var toggle = document.querySelector('.menu-toggle');
  var menu   = document.getElementById('site-menu');

  /* ---- Menu a panino ---------------------------------------------------- */
  function openMenu() {
    menu.hidden = false;
    // un frame di attesa per far partire la transizione
    requestAnimationFrame(function () { menu.classList.add('is-open'); });
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    body.classList.add('menu-open');
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    body.classList.remove('menu-open');
    setTimeout(function () {
      if (!menu.classList.contains('is-open')) menu.hidden = true;
    }, 300);
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
    });

    // Esc chiude il menu
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        toggle.focus();
      }
    });

    // un link vero (non "#") chiude il menu
    menu.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (link && link.getAttribute('href') !== '#') closeMenu();
    });
  }

  /* ---- Sottomenu a fisarmonica ----------------------------------------- */
  document.querySelectorAll('.menu__toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';

      // chiude le voci "sorelle" dello stesso livello
      var parentList = btn.closest('ul');
      parentList.querySelectorAll(':scope > li > .menu__toggle').forEach(function (other) {
        if (other !== btn) collapse(other);
      });

      expanded ? collapse(btn) : btn.setAttribute('aria-expanded', 'true');
    });
  });

  // chiude una voce e tutte le sue sottovoci
  function collapse(btn) {
    btn.setAttribute('aria-expanded', 'false');
    var sub = btn.nextElementSibling;
    if (sub) sub.querySelectorAll('.menu__toggle').forEach(function (b) {
      b.setAttribute('aria-expanded', 'false');
    });
  }

  /* ---- Anno nel footer -------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
