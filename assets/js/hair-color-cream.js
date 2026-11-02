/* ==========================================================================
   WILD COLOR – Hair Color Cream: finestra informativa delle 5 famiglie
   Stesso comportamento della finestra d'ingrandimento della Color Chart:
   - clic su un pulsante famiglia: si apre la scheda di quella famiglia
   - frecce (o tasti ← →, o swipe sul telefono): famiglia precedente/successiva
   - X, tasto Esc o clic fuori dalla scheda: chiude
   Il contenuto di ogni famiglia è nella pagina (.fam-box__panel[data-family]).
   data-theme="dark" sul pulsante = scheda con fondo nero (le altre sono bianche).
   ========================================================================== */
(function () {
  'use strict';

  var buttons = Array.prototype.slice.call(document.querySelectorAll('.hc-family'));
  var box = document.getElementById('fam-box');
  if (!buttons.length || !box) return;

  var card     = box.querySelector('.fam-box__card');
  var nameEl   = box.querySelector('.fam-box__name');
  var body     = box.querySelector('.fam-box__body');
  var panels   = Array.prototype.slice.call(box.querySelectorAll('.fam-box__panel'));
  var btnClose = box.querySelector('.fam-box__close');
  var btnPrev  = box.querySelector('.fam-box__nav--prev');
  var btnNext  = box.querySelector('.fam-box__nav--next');

  var current = -1;

  function show(i) {
    current = (i + buttons.length) % buttons.length;
    var b = buttons[current];
    nameEl.textContent = b.getAttribute('data-title');
    card.classList.toggle('is-dark', b.getAttribute('data-theme') === 'dark');   // scheda nera (Direct Color)
    panels.forEach(function (p) {
      p.hidden = p.getAttribute('data-family') !== b.getAttribute('data-family');
    });
    buttons.forEach(function (el) { el.setAttribute('aria-expanded', el === b ? 'true' : 'false'); });
    body.scrollTop = 0;
  }

  function open(i) {
    show(i);
    box.hidden = false;
    requestAnimationFrame(function () { box.classList.add('is-open'); });
    document.body.classList.add('menu-open');          // blocca lo scroll della pagina
    btnClose.focus();
  }

  function close() {
    var opener = buttons[current];
    box.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    buttons.forEach(function (el) { el.setAttribute('aria-expanded', 'false'); });
    setTimeout(function () { box.hidden = true; }, 250);
    if (opener) opener.focus();
  }

  buttons.forEach(function (el, i) {
    el.addEventListener('click', function () { open(i); });
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', function () { show(current - 1); });
  btnNext.addEventListener('click', function () { show(current + 1); });

  // clic sullo sfondo scuro (fuori dalla scheda)
  box.addEventListener('click', function (e) { if (!card.contains(e.target)) close(); });

  // tastiera
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'Tab') {                          // il focus resta nella finestra
      var f = [btnClose, btnPrev, btnNext];
      var k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  // swipe sul telefono
  var x0 = null;
  card.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
